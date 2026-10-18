import { createRequire } from 'module';
const require = createRequire('C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/package.json');
const pw = require('playwright');
import path from 'path';
import { pathToFileURL } from 'url';
// Usage: node run-parent.mjs [page]   default render-parent-fixture.html (written by render-parent-fixture.php).
// Reads, in Chromium, Firefox and WebKit, the engaged Indus card (Follow pointer 8deg at a corner, hover scale 1.04, 6px
// lift): the parent's computed perspective, the card's own transform and which element carries the perspective. These are
// computed values: the Playwright Windows WebKit build computes a parent perspective but does not draw it (FR-38A-41).
// Exit 1 when a check fails; the control is the self-mode card, which must keep its own perspective.
const arg = process.argv[2] || 'render-parent-fixture.html';
const url = /^(https?|file):/.test(arg) ? arg : pathToFileURL(path.resolve(import.meta.dirname, arg)).href;
let failed = 0;
const check = (browser, label, ok, detail) => {
  if (!ok) failed++;
  console.log(`${browser} ${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' :: ' + detail}`);
};
for (const name of ['chromium', 'firefox', 'webkit']) {
  const b = await pw[name].launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 500 } });
  await p.goto(url);
  const r = await p.evaluate(() => {
    const cs = (el) => getComputedStyle(el);
    const read = (id, gridId) => {
      const card = document.getElementById(id);
      const grid = document.getElementById(gridId);
      return {
        parentPerspective: cs(grid).perspective,
        cardPerspectiveProp: cs(card).getPropertyValue('--sgs-persp-self').trim(),
        transform: cs(card).transform,
        scale: cs(card).scale,
        translate: cs(card).translate,
        styleAttr: card.getAttribute('style'),
      };
    };
    const keys = ['m11','m12','m13','m14','m21','m22','m23','m24','m31','m32','m33','m34','m41','m42','m43','m44'];
    const expected = new DOMMatrix('rotateX(8deg) rotateY(8deg)');
    const equal = (a) => keys.every((k) => Math.abs(new DOMMatrix(a)[k] - expected[k]) < 1e-5);
    const parent = read('parent-mode', 'grid-parent');
    const self = read('self-mode', 'grid-self');
    return { parent, self, expected: expected.toString(), parentEq: equal(parent.transform), selfEq: equal(self.transform) };
  });
  check(name, 'parent grid computes perspective 1100px', r.parent.parentPerspective === '1100px', r.parent.parentPerspective);
  check(name, 'the card omits its own perspective (--sgs-persp-self none)', r.parent.cardPerspectiveProp === 'none', r.parent.cardPerspectiveProp);
  check(name, 'the card transform is rotateX(8deg) rotateY(8deg) with no perspective term', r.parentEq, r.parent.transform + ' vs ' + r.expected);
  check(name, 'hover scale 1.04 and the 6px lift are still present', r.parent.scale === '1.04' && /-6px/.test(r.parent.translate), r.parent.scale + ' / ' + r.parent.translate);
  check(name, 'no style attribute on the card', r.parent.styleAttr === null, String(r.parent.styleAttr));
  check(name, 'control: a self-perspective card keeps its own perspective(1100px) and its grid has none', r.self.parentPerspective === 'none' && r.self.cardPerspectiveProp === '1100px' && !r.selfEq, JSON.stringify(r.self));
  await b.close();
}
process.exit(failed ? 1 : 0);
