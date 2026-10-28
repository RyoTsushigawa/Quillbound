// Compares versions of the same book by their text, so the app can say
// "same content, different layout" (Color vs Print Friendly) or "different edition" (Condensed).
import { extractPdf } from './pdftext.js';
import { textFingerprint, similarity, textQuality } from './reader.js';

export async function compareBookVersions(pdfjsLib, files, { pages = 8 } = {}) {
  const prints = [];
  for (const f of files) {
    try {
      const doc = await extractPdf(pdfjsLib, await f.read(), { maxPages: pages });
      prints.push({ f, fp: textFingerprint(doc, pages), pages: doc.numPages, garbled: Math.round(textQuality(doc).garbled * 100) });
    } catch (e) { prints.push({ f, error: e.message }); }
  }
  const base = prints.find(p => p.f.path === files[0].path && !p.error) || prints.find(p => !p.error);
  return prints.map(p => {
    if (p.error) return { path: p.f.path, verdict: 'unreadable', note: p.error };
    if (p === base) return { path: p.f.path, verdict: 'reference', pages: p.pages, garbled: p.garbled, comparedPages: Math.min(pages,p.pages), note: pages < p.pages ? 'Compared opening pages only; review later content before treating editions as interchangeable.' : 'Compared all pages.' };
    const overlap = similarity(base.fp, p.fp) * Math.min(base.fp.size,p.fp.size);
    const sim = overlap / Math.max(1,base.fp.size + p.fp.size - overlap);
    const verdict = sim >= 0.98 && base.pages === p.pages ? 'same text' : sim >= 0.35 ? 'revised text' : 'different text';
    return { path: p.f.path, verdict, similarity: Math.round(sim * 100), pages: p.pages, pageDiff: p.pages - base.pages, garbled: p.garbled, comparedPages: Math.min(pages,p.pages), note: pages < p.pages ? 'Compared opening pages only; review later content before treating editions as interchangeable.' : 'Compared all pages.' };
  });
}
