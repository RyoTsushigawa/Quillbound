// The interface modules index.html loads from src/ui/ (the hero creator, Homebrew …), in page order, so checks that run
// index.html's main script can load them into the same context first: loadUi(html, ctx).
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const uiScripts = html => [...html.matchAll(/<script src="(src\/ui\/[\w-]+\.js)"><\/script>/g)].map(m => m[1]);
const loadUi = (html, ctx) => { for (const f of uiScripts(html)) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); };
module.exports = { uiScripts, loadUi };
