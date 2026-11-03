// Accessibility rules that can be checked from the source: see the Accessibility section of RULES.md.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),html=read('index.html');
assert(html.includes('src/ui/a11y.js'),'the focus and reading support is loaded');
assert(html.indexOf('src/ui/a11y.js')>html.lastIndexOf('function render()'),'after the app, so it can wrap render');
assert(html.includes('<html lang="en">')&&html.includes('skip-link'),'language and skip link');
assert(html.includes('id="toast" role="status"'),'messages are read out from a region that stays in the page');
assert.equal((html.match(/<main[ >]/g)||[]).length,1,'one main landmark in the shell');
assert(!read('src/ui/session-overview.js').includes('<main'),'no main inside main');
for(const f of ['theme.css','clarity.css','campaign-ui.css','combat.css','session-overview.css','player.css','clean.css'])
  assert(!/font-size:s*(.[0-6]d*rem|.7[0-4]d*rem|(?:[0-9]|1[01])(?:.d+)?px)/.test(read(f)),f+' has no text under 12px');
assert(!/font-size:s*(.[0-6]d*rem|.7[0-4]d*rem|(?:[0-9]|1[01])(?:.d+)?px)/.test(html.slice(0,html.indexOf('</style>'))),'nor the page styles');
console.log('PASS: one main landmark, a skip link, read-out messages, focus support loaded and no text under 12px.');
