// PDF -> positioned, font-aware lines in reading order.
// Works with any pdf.js build (browser global or Node legacy build): pass the library in.

const BOLD_RE = /bold|black|heavy|semibold|demi/i;
const ITALIC_RE = /italic|oblique/i;

function fontInfo(page, fontName, styles) {
  let name = '';
  try {
    const f = page.commonObjs.get(fontName);
    name = (f && (f.name || f.loadedName)) || '';
  } catch { /* font not resolved yet */ }
  if (!name && styles && styles[fontName]) name = styles[fontName].fontFamily || '';
  name = name.replace(/^[A-Z]{6}\+/, '');
  return { font: name, bold: BOLD_RE.test(name), italic: ITALIC_RE.test(name) };
}

// Merge text items that sit on the same baseline and are close horizontally.
function buildLines(items, pageW) {
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  const mid = pageW / 2;
  for (const it of items) {
    const tol = Math.max(1.5, it.size * 0.35);
    let best = null;
    for (let i = lines.length - 1; i >= 0 && i >= lines.length - 40; i--) {
      const l = lines[i];
      if (Math.abs(l.y - it.y) > tol) continue;
      const gap = it.x - (l.x + l.w);
      // never join two columns: a gap that sits on the page's centre line is the gutter
      if (l.x + l.w < mid + 2 && it.x > mid - 2 && gap > it.size * 0.6) continue;
      if (gap > -it.size && gap < Math.max(it.size * 1.6, 6)) { best = l; break; }
    }
    if (best) {
      const gap = it.x - (best.x + best.w);
      best.text += (gap > it.size * 0.15 && !/\s$/.test(best.text) && !/^\s/.test(it.str) ? ' ' : '') + it.str;
      best.w = Math.max(best.w, it.x + it.w - best.x);
      best.parts.push(it);
      if (it.size > best.size) best.size = it.size;
    } else {
      lines.push({ text: it.str, x: it.x, y: it.y, w: it.w, size: it.size, parts: [it] });
    }
  }
  for (const l of lines) {
    // dominant font = the one covering most characters
    const tally = {};
    for (const p of l.parts) tally[p.font] = (tally[p.font] || 0) + p.str.length;
    const dom = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
    const p0 = l.parts.find(p => p.font === dom);
    l.font = dom; l.bold = p0.bold; l.italic = p0.italic;
    // a bold run at the start ("Multiattack. The ...") matters for stat blocks
    const lead = [];
    for (const p of l.parts) { if (p.bold !== l.parts[0].bold) break; lead.push(p.str); }
    l.leadBold = l.parts[0].bold && !l.bold ? lead.join('').trim() : '';
    l.text = l.text.replace(/\s+/g, ' ').trim();
    delete l.parts;
  }
  return lines.filter(l => l.text);
}

// Order lines: full-width lines split the page into bands; inside a band, columns left to right.
function readingOrder(lines, pageW) {
  const mid = pageW / 2;
  for (const l of lines) {
    const end = l.x + l.w;
    if (l.w > pageW * 0.55 || (l.x < mid - 10 && end > mid + 10)) l.col = -1;
    else l.col = l.x + l.w / 2 < mid ? 0 : 1;
  }
  const out = [];
  let band = [];
  const flush = () => {
    band.sort((a, b) => a.col - b.col || b.y - a.y);
    out.push(...band); band = [];
  };
  const sorted = [...lines].sort((a, b) => b.y - a.y);
  for (const l of sorted) {
    if (l.col === -1) { flush(); out.push(l); } else band.push(l);
  }
  flush();
  return out;
}

export async function extractPdf(pdfjsLib, data, { onPage, maxPages = 400 } = {}) {
  const doc = await pdfjsLib.getDocument({ data, isEvalSupported: false, useSystemFonts: false, verbosity: 0 }).promise;
  const pages = [];
  const n = Math.min(doc.numPages, maxPages);
  let meta = {};
  try { meta = (await doc.getMetadata()).info || {}; } catch { /* no metadata */ }
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    let images = 0, imageArea = 0;
    try {
      const ops = await page.getOperatorList(); // also resolves fonts into commonObjs
      const O = pdfjsLib.OPS;
      let ctm = [1, 0, 0, 1, 0, 0]; const stack = [];
      for (let k = 0; k < ops.fnArray.length; k++) {
        const fn = ops.fnArray[k];
        if (fn === O.save) stack.push(ctm);
        else if (fn === O.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
        else if (fn === O.transform) {
          const [a, b, c, d, e, f] = ops.argsArray[k];
          ctm = [ctm[0] * a + ctm[2] * b, ctm[1] * a + ctm[3] * b, ctm[0] * c + ctm[2] * d, ctm[1] * c + ctm[3] * d, ctm[0] * e + ctm[2] * f + ctm[4], ctm[1] * e + ctm[3] * f + ctm[5]];
        } else if (fn === O.paintImageXObject || fn === O.paintJpegXObject || fn === O.paintInlineImageXObject) {
          images++;
          imageArea += Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]);
        }
      }
    } catch { /* operator list unavailable: fonts fall back to style names */ }
    const tc = await page.getTextContent();
    const items = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const size = Math.hypot(it.transform[2], it.transform[3]) || it.height || 10;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, size, ...fontInfo(page, it.fontName, tc.styles) });
    }
    const lines = readingOrder(buildLines(items, vp.width), vp.width).map(l => ({ ...l, page: i }));
    pages.push({ n: i, width: vp.width, height: vp.height, lines, images, imageCover: imageArea / (vp.width * vp.height) });
    page.cleanup();
    if (onPage) onPage(i, doc.numPages);
  }
  const numPages = doc.numPages;
  await doc.destroy();
  return { numPages, meta: { title: meta.Title || '', author: meta.Author || '', creator: meta.Creator || '' }, pages };
}
