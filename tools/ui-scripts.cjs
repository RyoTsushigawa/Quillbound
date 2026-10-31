// The interface modules index.html loads from src/ui/ (the hero creator, Homebrew …), plus scripts it marks data-ui,
// in page order, so checks that run index.html's main script can load them into the same context first: loadUi(html, ctx).
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const uiScripts = html => [...html.matchAll(/<script src="(src\/[\w/-]+\.js)(?:\?[^"\s]*)?"( data-ui)?><\/script>/g)].filter(m => m[2] || m[1].startsWith('src/ui/')).map(m => m[1]);
const loadUi = (html, ctx) => { for (const f of uiScripts(html)) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); };
module.exports = { uiScripts, loadUi };
