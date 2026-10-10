# Reading and running a `.dc.html` draft

Written against the `support.js` in this bundle (SHA-256 in `MANIFEST.md`). Section 7 says which parts are fixed and which are per-project choices.

## 1. File architecture

```
<!doctype html><html><head>
  <script src="./support.js"></script>          runtime
</head><body>
<x-dc>                                          template (everything up to the LAST </x-dc>)
  <helmet> fonts, <style> resets, <script src> </helmet>
  ...markup with {{ }} holes, sc-if, sc-for, dc-import...
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{...}'>   logic class (optional data-props JSON)
class Component extends DCLogic { ... }
</script>
</body></html>
```

- `type="text/x-dc"` stops the browser running the logic; the runtime evaluates it.
- `data-props` (optional) is JSON: `$preview` `{width,height}` for sized fragments, plus one entry per prop (`editor`, `default`, `tsType`, …). Defaults are passed to the root as props. None of the three DCs here has `data-props`.
- The DC's **name** is the file basename without `.dc.html`, URL-decoded: `Indus Foods Website v2`, `TradeApplication`, `EnquiryForm`.

### Boot sequence (support.js)

1. Injects `x-dc{display:none!important}` and base placeholder CSS.
2. Loads React 18.3.1 and ReactDOM UMD from unpkg (with SRI) unless `window.React`/`window.ReactDOM` already exist. **No network → nothing renders.**
3. On DOMContentLoaded: reads `x-dc.innerHTML` from the live DOM and the logic script's text, compiles both, replaces `<x-dc>` with `<div id="dc-root">`, and renders with `ReactDOM.createRoot`. With no `$preview`, it adds `html,body{height:100%;margin:0}`.
4. Unless `window.__resources` is set (bundled export), it **re-fetches its own URL** and recompiles from the raw text between `<x-dc>` and the last `</x-dc>`, because the HTML parser alters some markup. This needs HTTP(S); `file://` fails.
5. `<dc-import name="X">` fetches `./X.dc.html` (URL-encoded) and compiles it the same way.

Consequences:

- Before boot, the browser parses the raw template as **live DOM**. `<script>` tags inside `<helmet>` run then, and the runtime appends them to `<head>` again later. Helmet scripts must therefore be idempotent; both scripts here check `customElements.get` first. Custom elements inside the raw template also upgrade and run `connectedCallback` there. That is what caused the removeChild crash (see REVIEW-ANSWERS.md, Q2).
- The logic is evaluated with `new Function('DCLogic','StreamableLogic','React', src)`. It is classic script: no `import`, no TypeScript.

### Runtime globals

| Global | What it exposes |
|---|---|
| `__dcTemplateSource(name)` | Raw template string (registry `html`) exactly as written. |
| `__dcAnnotatedTemplate(name)` | Compiled template as HTML: every element stamped `data-dc-tpl="N"` (pre-order index), camelCase attributes encoded as `sc-camel-*` (`onClick` → `sc-camel-on-click`), `<helmet>` → `<sc-helmet>`, and `select/table/tbody/thead/tfoot/tr/td/th/caption` → `sc-raw-*`. |
| `__dcRegistry` | Object keyed by DC name: `{html, tpl, Logic, propsMeta, preview, propOverrides, logicError, ver, subs, fetched, htmlStreaming, jsStreaming}`. `tpl` is the compiled render function; `Logic` is the class, **not** the live instance. |
| `__dcRootName()`, `getDC(name)`, `DCLogic` | Root name; React component for a DC; base class. |
| `__dcUpdate`, `__dcSetProps`, `__dcBoot`, `__dcStreaming` | Editor-host bridges used for streaming and tweaks. You don't need them. |

These are undocumented bridges for the editor, not a public API. Pin your tooling to the `support.js` hash.

**The live logic instance** sits on the React component, not on the registry:

```js
function dcLogic(name) {
  const host = document.querySelector(`[data-sc-name="${CSS.escape(name)}"]`);
  const k = Object.keys(host).find((k) => k.startsWith('__reactFiber$'));
  let f = host[k];
  while (f && !(f.stateNode && f.stateNode.logic)) f = f.return;
  return f && f.stateNode.logic;
}
const L = dcLogic('Indus Foods Website v2');
L.state;                         // read state
L.setState({ w: 1400, active: 2 });   // e.g. force desktop + open the Sectors mega menu
```

Use this to reach closed states (menus, drawer, FAQ items, form steps) without simulating pointer input.

## 2. Rendered DOM shape

- Each DC renders as `<div class="sc-host" data-sc-name="Name">…</div>`. The root sits at `#dc-root > div.sc-host`. These wrappers are runtime-only. Don't port them, and allow for them in `>` selectors.
- **Every template element carries `data-dc-tpl="N"`** in the rendered DOM. This is the reliable link from a rendered node back to its source element in `__dcAnnotatedTemplate`. Elements repeated by `sc-for` share one N.
- Each text hole renders as `<span class="sc-interp">value</span>`. Text measured in the DOM therefore has extra spans that aren't in the source.
- Pseudo-state attributes become generated classes `scp0`, `scp1`, … in one runtime `<style>`. These are the only classes on the page.
- Nodes **without** `data-dc-tpl` were created by code: `React.createElement` output from the logic (icons: `arrow()`, `caret()`, `icon()`, `whyIcon()`, `glyph()`), DOM built imperatively (ripple and shine spans, the scatter layer), SVG inlined by `indus-logo.js` and `setHeroSvgEl`, and `image-slot` shadow DOM.

## 3. Template language

**Holes `{{ expr }}`.** The resolver (`resolve()`) accepts:
- dotted paths `a.b.c`, numeric segments `a.0`, bracket lookups `a[b]` (where `b` is itself resolved);
- literals `true false null undefined`, numbers, `'strings'`;
- prefix `!`, and top-level `===`, `!==`, `==`, `!=`, with parentheses.

Nothing else is supported: no `+`, `&&`, `?:` or calls. Authoring guidance allows paths only, so expect paths.

- A whole-attribute hole (`x="{{ p }}"`) passes the raw value: a function, number, object or ref.
- A mixed attribute (`x="a {{ p }} b"`) becomes a string, with `undefined` → `""`.
- In text: a React element or array is inserted as-is; `null` and booleans render nothing; `undefined` renders nothing and logs a warning; anything else is stringified inside a span.

**Attributes.**
- `style="…"` is converted to a React style object. Kebab-case becomes camelCase and `--custom-props` are kept. Holes inside style are resolved first.
- `class` → `className`, `for` → `htmlFor`.
- `on*` attributes map to React events. The full list is in `EVENT_MAP` in support.js: click, change, input, submit, key*, mouse*, pointer*, touch*, drag*, focus, blur, animation*, transition*. Any other `onxyz` becomes `onXyz`.
- `value`/`checked` that resolve to `undefined` become `""`/`false`, so inputs are always controlled.
- Any other attribute passes through as a React prop. That includes `ref`: `ref="{{ setXEl }}"` is a React callback ref, called with the element on mount and `null` on unmount.

**`style-<pseudo>="decls"`.** Any suffix is accepted. It becomes the rule `.scpN:<pseudo>{decls !important}`, so `style-hover`, `style-focus`, `style-active`, `style-focus-visible`, `style-focus-within`, … all work. `style-before`/`style-after` become `::before`/`::after`, without `!important`. Because of `!important`, hover rules **beat inline styles and styles set from JS** while active. This project uses only `style-hover` and `style-focus`.

**`<sc-if value="{{ x }}">`.** Renders its children when `x` is truthy. There is no else; the draft uses a second `sc-if` on a complementary flag. No wrapper element is rendered.

**`<sc-for list="{{ arr }}" as="item">`.** Renders its children once per item. `item` (default name `item`) and `$index` are in scope, along with every outer value. No wrapper element. A non-array renders nothing and logs a warning.

**`hint-*` attributes.** These matter only while a file streams into the editor and have no effect after load.
- `hint-placeholder-count`: how many placeholder rows an `sc-for` shows.
- `hint-placeholder-val`: the value an `sc-if` assumes.
- `hint-size="w,h"`: placeholder size and min-size for `dc-import`/`x-import`.

Ignore all three when rebuilding.

**`<dc-import name="X" …>`.** Mounts sibling `X.dc.html`.
- Attributes become props (kebab → camel), and `dc-props="{{ obj }}"` spreads an object.
- Only `position, left, right, top, bottom, inset, width, height, z-index, transform` from `style` reach the host div.
- Children are passed as `props.children`.
- The child's template sees `{...props, ...renderVals()}`.
- Here, `/apply` mounts `TradeApplication` and `/contact` mounts `EnquiryForm`, with no props.

**`<x-import component|component-from-global-scope="…" from="./file.js">`.** Mounts an external React component or custom element. This project doesn't use it.

**`<helmet>`.**
- `<script>` is appended to `<head>` once per `src`/text.
- `<link>` and `<meta>` are added once.
- `<style>` and other tags are kept in sync by position.
- `<meta name="design_doc_mode" content="canvas">` switches the editor to canvas mode (not used here).

**Other attributes you'll see.** `data-screen-label` exists only so editor comments can name screens. `data-dc-tpl` is added by the runtime and is never in the source.

## 4. The logic class

```js
class Component extends DCLogic {
  state = { … };
  componentDidMount() {}
  componentDidUpdate(prevProps) {}
  componentWillUnmount() {}
  renderVals() { return { …values the template reads… }; }
}
```

- **Fixed by the runtime.** The class name `Component` and base `DCLogic`; `this.props`, `this.state`, `setState(update, cb)`, `forceUpdate()`; `componentDidMount`, `componentDidUpdate`, `componentWillUnmount`; `renderVals()`.
- **Not supported.** `render()`, `getDerivedStateFromProps`, `shouldComponentUpdate`, hooks.
- **`setState`** merges shallowly into `this.state` **synchronously**, then schedules a React re-render. Unlike React, `this.state` is up to date immediately after the call.
- **`componentDidUpdate` receives only `prevProps`. There is no `prevState` argument.** The three DCs here were written as `(pp, ps)`. In v2, that made the whole method a silent no-op; in the forms it threw on every update. All three now keep their own snapshot in `this._ps` (fixed today).
- **`renderVals()`** runs on every render. Its result is merged over props: `vals = {...props, ...renderVals()}`. It must return everything the template reads, including handlers and refs. Errors are caught and shown as a red banner.
- **Everything else is a per-project choice by the author:**
  - the `R` object (responsive values keyed off `state.w`);
  - the getters `pages`, `_menus`, `sectors`, `brandLogos`, `blogPosts`, `slots`;
  - `homeVals()`, `bindMotion()`, `setupReveal()`, `animateEntrance()`, `applyStock()`;
  - `setXEl` ref setters and `data-*` hook names.

  Getters are plain JS; `pages` caches itself in `this._pages`.

### This draft's data model

- `pages[key]` = `{ section, crumb, hero: {eyebrow, title, intro, ctas, img, anim}, blocks: [{type, …}] }`. There are 29 keys, including `post-post-1` … `post-post-6`.
- `renderVals()` maps each block to template flags (`isCards`, `isSplit`, …).
- Dead code you shouldn't port:
  - the `formOld` block on Contact (filtered out);
  - the `quotes` and `timeline` block flags (no page uses them);
  - `footerGroups` and `accreds` (returned but never rendered);
  - `scatter()`, `buildScatter()` and `buildFood()` (food layer, hard-coded `density = 'Off'`);
  - the `missing` state and the `data-reveal` attribute on sections (nothing queries it in v2).

## 5. Tying elements to code and styles

Everything that can affect an element:

1. **Inline `style`** in the template, including the holes resolved from `renderVals()`.
2. **`style-*` pseudo rules** on the same element.
3. **Holes** in text and attributes. Trace the name into `renderVals()` / `homeVals()`.
4. **Event attributes**, whose handlers are in the logic class.
5. **`ref="{{ setXEl }}"`**, through which the logic stores the element and later animates it or writes styles. Refs here:
   - `setProgEl`, `setHeaderEl`, `setPanelEl`, `setMobEl`, `setMainEl`;
   - `setMarqueeEl` (starts the marquee), `setFloatEl`, `setFloatEl2` (start the float loops);
   - `setTCard`, `setPulseEl`;
   - `setHeroSvgEl` (fetches and animates the About hero SVG).
6. **`data-*` hooks queried by code:**
   - `data-mag`, `data-tilt`, `data-label` (bindMotion, magnet);
   - `data-anim` (mega menu stagger), `data-manim` (drawer stagger);
   - `data-hero-img` (parallax);
   - `data-draw`, `data-draw-y` (line draw);
   - `data-pin`, `data-pin-track`, `data-pin-bar`, `data-pin-count`, `data-pin-card`, `data-pin-year` (hscroll);
   - `data-src` (hero SVG URL);
   - `data-rv-done` (written by code).
7. **Structural queries:**
   - `main.querySelector('section')` = hero;
   - the children of the `h1`'s parent (entrance stagger);
   - `section h2, h2 + p`;
   - **every `div` inside a non-hero section whose computed `display` is `grid` or `flex` with `flex-wrap: wrap`** (its visible children get the item reveal);
   - the parent of each `image-slot` (image reveal);
   - `document.querySelectorAll('image-slot')` (applyStock photo fill).
8. **Inside external scripts:** `indus-logo.js` animates SVG groups by id (`sunrays_spin`, `sunrays_expand`, `Mountain_Block`, `snow`, `darkpath`, `logo_text`). `setHeroSvgEl` uses `sunrays_spin`, `sunrays_expand`, `Mountain Block`, `snow`, `background`, `path5`, `goldpath_glow`, `goldpath_highlight`, `darkpath`.

That covers this draft. Item 7 shows why reading the selectors alone isn't reliable: targets depend on computed style and on what's rendered.

**Reliable way to capture every animation target:** instrument at runtime, before `support.js` runs, and map each target back with `data-dc-tpl`:

```js
const log = [];
const orig = Element.prototype.animate;
Element.prototype.animate = function (kf, opt) {
  const host = this.closest('[data-dc-tpl]');
  log.push({ tpl: this.getAttribute('data-dc-tpl'), nearestTpl: host && host.getAttribute('data-dc-tpl'),
             tag: this.tagName, id: this.id, kf, opt, stack: new Error().stack });
  return orig.call(this, kf, opt);
};
new MutationObserver((ms) => ms.forEach((m) => log.push({ styleWrite: m.target, tpl: m.target.getAttribute && m.target.getAttribute('data-dc-tpl') })))
  .observe(document, { subtree: true, attributes: true, attributeFilter: ['style'] });
```

Then exercise each state: scroll the full page, hover every `[data-mag]`/`[data-tilt]`, call `setState` for every menu, the drawer, FAQ and form steps, and visit every route. `transition` declarations are static: collect them from inline styles and `style-*` rules in the annotated template.

**Determinism for headless runs.** Stub `Date` (opening hours use Europe/London time) and `Math.random` (float-loop durations and the trade-application reference `IND-######`). Disable the 6.5s testimonial interval or advance it with `setState({tIdx})`. Clear `localStorage['indus-trade-application']`, because TradeApplication restores a saved draft from it. Stock photos are applied at 0, 400, 1200 and 2500ms and on DOM mutations, so wait about 3s before measuring images.

## 6. What the code doesn't state

The code doesn't state final layout values from `clamp()`/`vw`/grid tracks at a given width, the font metrics, or how the image-slot shadow DOM looks. Measure those from the rendered page. Everything else is in the template or the logic.

## 7. Stability across projects and runtime versions

- **Defined by the runtime, same in every project using this runtime:** the file structure, the boot sequence, the template syntax (§3), the logic API (§4), `data-dc-tpl`, the `sc-host` wrappers, and the `scpN` pseudo classes.
- **Not versioned.** `support.js` is a generated build with no version string, and the bridge globals are internal. Record the `support.js` SHA-256 with every handoff and compare against it.
- **Per project, chosen by whoever wrote the draft:** hook names (`data-mag` vs anything else), animation technique (`element.animate()`, CSS keyframes, transitions), the `R`/`pages` conventions, and file splits. The differences you saw across three projects are expected. Discover them per project with the §5 method rather than a fixed hook list.
