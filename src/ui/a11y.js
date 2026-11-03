/* Keyboard and screen-reader support for the whole app. render() rebuilds the page, so without this a
   keyboard user would fall back to the top of the page after every action, and page changes would go unheard. */
(function () {
  const TITLES = { home: 'Home', desk: 'Session', campaigns: 'Campaigns', combat: 'Combat', heroes: 'My heroes', create: 'Create a hero', import: 'Import adventure', homebrew: 'Homebrew' };
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex="0"]';
  const shown = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const view = () => document.getElementById('view');
  const stops = () => [...view().querySelectorAll(FOCUSABLE)].filter(shown);
  // The same control after a redraw has the same tag, the same data and the same words.
  const mark = e => e.id ? '#' + e.id : e.tagName + JSON.stringify(e.dataset) + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40);

  function remember() {
    const e = document.activeElement;
    if (!e || !view()?.contains(e) || e === view()) return null;
    return { mark: mark(e), at: stops().indexOf(e), panel: !!e.closest('.lt-panel'), start: e.selectionStart, end: e.selectionEnd };
  }
  function restore(was) {
    if (!was || (document.activeElement && document.activeElement !== document.body)) return;
    const list = stops();
    const same = list.filter(e => mark(e) === was.mark);
    // A finished roll has no button to return to: go on to the next thing to press in the combat panel.
    const next = same.sort((a, b) => Math.abs(list.indexOf(a) - was.at) - Math.abs(list.indexOf(b) - was.at))[0]
      || (was.panel && (document.querySelector('.lt-panel .btn.primary:not([disabled])') || document.querySelector('.lt-panel ' + FOCUSABLE)))
      || list[Math.min(Math.max(was.at, 0), list.length - 1)] || document.getElementById('page-title');
    next?.focus({ preventScroll: true });
    if (same.length && was.start != null && next.setSelectionRange) try { next.setSelectionRange(was.start, was.end); } catch { /* not a text field */ }
  }

  // A hidden status line, kept in the page so that what it says gets read out.
  function say(text) {
    let live = document.getElementById('qb-live');
    if (!live) { live = document.createElement('div'); live.id = 'qb-live'; live.className = 'sr-only'; live.setAttribute('role', 'status'); document.body.append(live); }
    live.textContent = text;
  }

  // Tab lists: one stop in the Tab order, arrow keys between the tabs.
  function tabLists() {
    for (const list of document.querySelectorAll('[role=tablist]')) {
      const tabs = [...list.querySelectorAll('button')];
      if (!tabs.length || (!list.dataset.qbTabs && tabs.some(t => t.hasAttribute('tabindex')))) continue; // this one looks after itself
      list.dataset.qbTabs = '1';
      const on = tabs.find(t => t.getAttribute('aria-selected') === 'true' && !t.disabled) || tabs.find(t => !t.disabled);
      tabs.forEach(t => { t.setAttribute('role', 'tab'); t.tabIndex = t === on ? 0 : -1; });
    }
  }
  document.addEventListener('keydown', e => {
    const tab = e.target.closest?.('[data-qb-tabs] [role=tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = [...tab.closest('[data-qb-tabs]').querySelectorAll('[role=tab]:not([disabled])')], i = tabs.indexOf(tab);
    const next = tabs[e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    e.preventDefault(); next.focus(); next.click();
  });

  function titlePage() {
    const name = TITLES[S.tab] || 'Quillbound', h1 = document.createElement('h1');
    h1.id = 'page-title'; h1.className = 'sr-only'; h1.tabIndex = -1; h1.textContent = name;
    view().prepend(h1); document.title = name + ' · Quillbound';
  }

  if (typeof render !== 'function') return; // a test that loads this file alone
  let page = null, rollSaid = '';
  const draw = render;
  render = function () {
    const was = remember(), tab = page;
    draw(); titlePage(); tabLists();
    page = S.tab;
    if (tab !== null && tab !== page) { window.scrollTo(0, 0); document.getElementById('page-title').focus({ preventScroll: true }); } else restore(was);
    const roll = document.querySelector('.lt-panel .lt-result')?.innerText.replace(/\s+/g, ' ').slice(0, 240) || '';
    if (roll && roll !== rollSaid) say(roll);
    rollSaid = roll;
  };
  titlePage(); tabLists(); page = S.tab;
})();
