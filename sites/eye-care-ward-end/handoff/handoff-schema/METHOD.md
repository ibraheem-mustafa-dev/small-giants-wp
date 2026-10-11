# Method: inventorying a `.dc.html` draft from its source

This is how `animations.json` and `surfaces.json` are produced from the files alone, quickly and exactly. It works because a Design Component has no hidden layer. Every pixel comes from four places you can read:

1. inline `style` on template elements;
2. `style-*` pseudo rules on the same elements;
3. values computed in the logic class and inserted through `{{ }}` holes;
4. JS that touches the DOM after render: refs, `data-*` hooks, structural queries, document listeners, and external scripts loaded in `<helmet>`.

There are no stylesheets with selectors to resolve (the only `<style>` is in `<helmet>`), no build step and no imports. If all four sources are covered and every occurrence is reconciled against a count, nothing can be missed.

The runtime trace is optional. It only confirms what the source already says.

## 0. Pin the revision

- SHA-256 every file you read: drafts, `support.js`, external scripts.
- `support.js` has no version string, so its hash *is* the runtime version.
- Put the hashes in the output files and in MANIFEST.md. A record is only valid for the revision whose hashes it carries.

## 1. Find the inputs

- **Drafts:** every `.dc.html` the handoff ships, plus every `dc-import name="X"` → `X.dc.html` they mount, recursively.
- **External scripts:** every `<script src>` in each `<helmet>` and every `x-import from=`. Read those that manipulate the DOM. `indus-logo.js` animates; `image-slot.js` only renders.
- **Assets the code inlines:** SVGs fetched and injected. Their element ids are animation targets.

## 2. Decode the template exactly as the runtime does

Never hand-count elements. Reuse the runtime's own encoder so ids match the rendered DOM:

```js
const sup = await readFile('support.js');
const enc = sup.slice(sup.indexOf('// src/encode.ts'), sup.indexOf('// src/compile.ts'));
const { encodeCase } = new Function(enc + ';return {encodeCase};')();
const src = await readFile('Draft.dc.html');
const open = src.match(/<x-dc(?:\s[^>]*)?>/);
const tplSrc = src.slice(open.index + open[0].length, src.lastIndexOf('</x-dc>'));
const t = document.createElement('template');
t.innerHTML = encodeCase(tplSrc);              // camelCase attrs → sc-camel-*, helmet → sc-helmet, table/select → sc-raw-*
let n = 0;
(function stamp(x) { if (x.nodeType === 1) x.setAttribute('data-dc-tpl', String(n++)); for (const c of x.childNodes) stamp(c); })(t.content);
```

- The result is the same pre-order numbering the runtime puts on every rendered element. Query it like the DOM: `querySelectorAll('[data-mag]')`, `('sc-if')`, `('[ref]')`.
- Every element inside an `sc-for` shares one id. Code-created nodes have none; record their nearest stamped ancestor.
- If the comment markers in `support.js` move in a future runtime, find `encodeCase` by name instead. Stop if it no longer exists.

## 3. Evaluate the logic class without rendering

The class is plain script. Run it with stubs to read its data and its responsive values:

```js
const js = src.slice(src.indexOf('data-dc-script') ... )   // text of <script type="text/x-dc" data-dc-script>
class DCLogic { constructor(p) { this.props = p || {}; this.state = {}; } setState(u) { Object.assign(this.state, typeof u === 'function' ? u(this.state) : u); } }
const React = { createElement: (...a) => ({ $el: a[0] }) };
const C = new Function('DCLogic', 'React', js + ';return Component;')(DCLogic, React);
const c = new C({});
c.pages;                     // routes and content blocks
for (const w of [375, 800, 1400]) { c.state = { ...c.state, w }; const v = c.renderVals(); /* v.R, v.items, flags */ }
```

- Getters (`pages`, menus, sections) give the full content model.
- Calling `renderVals()` with `state.w` at each breakpoint gives every value that varies by screen size: grid tracks, paddings and the `sc-if` breakpoint flags. Behaviour gated on screen size is resolved this way, with no browser.
- Stub `window`, `matchMedia` and `Date` if `renderVals()` reads them. Set the state keys a surface needs (e.g. `active`, `mobileOpen`, `step`) to read that state's values.
- If `renderVals()` needs real DOM or layout, it will throw. Record what it needed and resolve it by reading the code.

## 4. Count every occurrence (the reconciliation base)

Count these per file before writing any record. Each must end up mapped to at least one record id:

| What | How to count |
|---|---|
| Web Animations | `/\.animate\(/g` in logic and external scripts (each call site; a shared helper like `fx()` is one site used by several records) |
| CSS transitions | `transition:` declarations in the template (`/transition\s*:/g` on the template part). Count the logic separately: a `cssText` string can hold one too. |
| Pseudo rules | `/\sstyle-[a-z-]+=/g` in the template. Each `style-*` attribute is one rule. |
| CSS keyframes / animation | `@keyframes`, `animation:` (check for `animation:none`) |
| Media rules | `@media` in helmet `<style>` |
| JS style writers | `.style.X =`, `.style.cssText`, `setProperty(`, `textContent =`, `scrollTo(`, `updatePlaybackRate(`, `document.body.style` |
| Triggers | `addEventListener(`, `IntersectionObserver`, `ResizeObserver`, `MutationObserver`, `setInterval`, `setTimeout`, `requestAnimationFrame`, `matchMedia` |
| Hooks | `ref=` attributes, `data-*` attributes, `querySelector(All)` strings |
| Surfaces | `pages` keys (routes), every `sc-if` (classified in §7) |

## 5. Write one record per effect

For every `.animate(` site, `transition`, pseudo rule, keyframe, media rule and JS writer:

1. **Source.** File, line (resolve from a unique code snippet, never by hand) and enclosing function: the nearest preceding method or arrow-field definition at class indentation.
2. **Target.** Resolve how the code finds the element:
   - `ref="{{ setX }}"` → the stamped element carrying that ref;
   - `data-*` hook → `querySelectorAll` on the stamped template;
   - an id inside an inlined SVG → the asset's id, plus the stamped container;
   - a structural or computed-style rule (e.g. "every div whose display is grid inside a non-hero section") → write the rule verbatim in `selection_rule`. Resolve candidates by checking which stamped elements get `display:grid` or `flex-wrap:wrap` from their inline style at each breakpoint's `R` values (§3).
3. **Trigger.** Follow the callers to the user action:
   - `componentDidMount` / ref callback → mount;
   - `componentDidUpdate` comparing a state key → that state (and what sets it);
   - template `onX="{{ h }}"` → the event;
   - `document.addEventListener` → that event plus its `closest()` filter;
   - observers → their options;
   - timers → their interval.
4. **Values.** Copy keyframes and options literally. Write a formula when values are computed from pointer or scroll. For transitions, parse the shorthand per property:
   - **from** is the inline value;
   - **to** is the `style-hover` / `style-focus` value on the same element;
   - **state-bound** if the inline value contains `{{ }}`: trace the hole to `renderVals()`;
   - **JS-smoothed** if a JS writer targets the same element;
   - **parent-driven** if the value reads a CSS custom property set by an ancestor's hover.
5. **Reduced motion.** Read the guard on that code path: an early `return` under `this.rm`, a `!this.rm` condition, `matchMedia('(prefers-reduced-motion: reduce)')`, or a CSS `@media (prefers-reduced-motion)` rule. No guard means `unchanged`.
6. **Status.**
   - **dead-code:** the ref is never bound, the flag is hard-coded off, the block type is used by no page, the value is returned but not in the template, or the helper is never called.
   - **no-op:** runs but changes nothing visible.

## 6. Pitfalls that cause wrong records

- `componentDidUpdate` receives **only `prevProps`**. Code written as `(pp, ps)` sees `ps` undefined; such paths never ran. Flag them and don't record them as working.
- Helmet `<script>`s run once while the browser parses the raw template, before boot. Custom elements upgrade inside `<x-dc>` too.
- `style-*` rules are `!important`. They beat inline and JS-set values while active.
- `setState` updates `this.state` synchronously. Timers and intervals read the new state straight away.
- The `select`, `table`, `tr`, `td` family is renamed `sc-raw-*` in the encoded template. Map them back when describing elements.
- Line numbers are file lines, not lines within the logic script.
- `React.createElement` output in `renderVals()` (icons) has no `data-dc-tpl`. It is content, not effects, unless something animates it.
- Rendered text holes are wrapped in `<span class="sc-interp">`. Never match records to measured text.

## 7. Surfaces

- **Routes** are the keys of the router's page map. Unknown hashes fall back to home.
- **Classify every `sc-if` by what its value depends on.** Look up the hole in `renderVals()`:
  - **interactive state** (menu, drawer, accordion, form step, validation, result): one surface or state each;
  - **breakpoint** (derived from `state.w`): a state on its parent surface;
  - **route** (`isHome`, current-section flags);
  - **input state** (a checked chip);
  - **content variant** (a block has an eyebrow).

  List all of them so the total reconciles.
- **For each state**, give the state keys and a programmatic way to reach it: `setState({...})` on the live logic instance (see READING-DC-FILES §1 for how to get it) and the user action.
- **Time-dependent content.** Mark anything reading `Date`, `Math.random`, `localStorage`, intervals or timeouts.

## 8. Reconcile and validate

- Every counted occurrence maps to record ids, and every record's snippet is found exactly once (shared helpers excepted). Put the counts and id lists in `counts`.
- Validate both files against the schemas. Fix the records, never the schema, unless the schema genuinely lacks a category; then version it.
- Put anything you could not resolve from the code in `unresolved`, with the reason and the record ids.

## 9. Optional: runtime trace

A trace confirms call sites and targets. Use a same-origin harness iframe and patch `Element.prototype.animate` before boot: the same-origin `about:blank` window is reused, so a patch made before setting `src` survives. Then:

- diff the `style` attribute with a MutationObserver (CSS property setters are not patchable in current Chrome);
- listen for `transitionrun`;
- drive states through the logic instance.

It cannot produce real `:hover`/`:focus` or emulate `prefers-reduced-motion`, and it only sees the viewport it runs at. Those records stay source-derived, which is fine: the source is authoritative.

## 10. What not to do

- Don't change the draft while inventorying. Report bugs (unguarded motion, dead paths, effects that look unintended) in `unresolved` and ask before fixing.
- After any fix, regenerate both files and MANIFEST.md.
- Don't rely on screenshots or measured layout for anything the code states.
