// Node adapter: loads the same pdf.js version the browser uses (legacy build for Node).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
