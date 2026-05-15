import { mathjax } from '@mathjax/src/mjs/mathjax.js';
import { TeX } from '@mathjax/src/mjs/input/tex.js';
import { CHTML } from '@mathjax/src/mjs/output/chtml.js';
import { RegisterHTMLHandler } from '@mathjax/src/mjs/handlers/html.js';
import { jsdomAdaptor } from '@mathjax/src/mjs/adaptors/jsdomAdaptor.js';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <div id="preview">
    <span class="math-inline">\\(E = mc^2\\)</span>
    <div class="math-display">\\[a^2 + b^2 = c^2\\]</div>
  </div>
</body>
</html>
`);

RegisterHTMLHandler(jsdomAdaptor(JSDOM));

const tex = new TeX({
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
});

const chtml = new CHTML();

const document = mathjax.document(dom.window.document, {
    InputJax: tex,
    OutputJax: chtml
});

const container = dom.window.document.getElementById('preview');

document.findMath({elements: [container]});
console.log('Math items found:', document.math.length);
for (const item of document.math) {
    console.log('Math:', item.math);
}
