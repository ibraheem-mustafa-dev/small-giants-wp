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
- `data-props` (optional) is JSON: `$preview` `{width,height}` for sized fragments, plus one entry per prop (`editor`, `default`, `tsType`, …). Defaults are passed to the root as props. Here, `Eye Care Birmingham` has `data-props="{}"` (its last tweakable props were removed), `Frame Card` declares `$preview` 280×420 and one prop `p` (`editor: null`, type `FrameCardProduct`), and `WP Build Gap Map` has none.
- The DC's **name** is the file basename without `.dc.html`, URL-decoded: `Eye Care Birmingham`, `Frame Card`, `WP Build Gap Map`.

### Boot sequence (support.js)

1. Injects `x-dc{display:none!important}` and base placeholder CSS.
2. Loads React 18.3.1 and ReactDOM UMD from unpkg (with SRI) unless `window.React`/`window.ReactDOM` already exist. **No network → nothing renders.**
3. On DOMContentLoaded: reads `x-dc.innerHTML` from the live DOM and the logic script's text, compiles both, replaces `<x-dc>` with `<div id="dc-root">`, and renders with `ReactDOM.createRoot`. With no `$preview`, it adds `html,body{height:100%;margin:0}`.
4. Unless `window.__resources` is set (bundled export), it **re-fetches its own URL** and recompiles from the raw text between `<x-dc>` and the last `</x-dc>`, because the HTML parser alters some markup. This needs HTTP(S); `file://` fails.
5. `<dc-import name="X">` fetches `./X.dc.html` (URL-encoded, so `Frame%20Card.dc.html`) and compiles it the same way.

Consequences:

- Before boot, the browser parses the raw template as **live DOM**. `<script>` tags inside `<helmet>` run then, and the runtime appends them to `<head>` again later. Helmet scripts must therefore be idempotent. Custom elements inside the raw template also upgrade and run `connectedCallback` there; a custom element that fills itself in at that point crashes the first render with a `removeChild` error (CLAUDE.md, runtime traps). These drafts load no external script and use no custom element, so neither trap applies.
- The logic is evaluated with `new Function('DCLogic','StreamableLogic','React', src)`. It is classic script: no `import`, no TypeScript. Top-level declarations before the class are allowed: `WP Build Gap Map` defines `LEVELS`, `AREAS`, `R()` and `ROWS` that way.

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
const L = dcLogic('Eye Care Birmingham');
L.state;                                         // read state
L.setState({ w: 1400, mega: 'brands' });          // e.g. force desktop + open the Brands mega menu
L.setState({ page: 'product', curId: 10 });       // a product with no reviews (Google strip)
```

Use this to reach closed states (menus, drawers, accordions, lens steps, checkout modes) without simulating pointer input. Every state's call is listed in `surfaces.json`.

## 2. Rendered DOM shape

- Each DC renders as `<div class="sc-host" data-sc-name="Name">…</div>`. The root sits at `#dc-root > div.sc-host`; each Frame Card adds its own `sc-host` inside the grid cell. These wrappers are runtime-only. Don't port them, and allow for them in `>` selectors.
- **Every template element carries `data-dc-tpl="N"`** in the rendered DOM. This is the reliable link from a rendered node back to its source element in `__dcAnnotatedTemplate`. Elements repeated by `sc-for` share one N. Numbering is per DC: Frame Card's ids start at 0 again.
- Each text hole renders as `<span class="sc-interp">value</span>`. Text measured in the DOM therefore has extra spans that aren't in the source.
- Pseudo-state attributes become generated classes `scp0`, `scp1`, … in one runtime `<style>`. Besides these, the storefront's source carries its own `class` attributes: the `sgs-*` section names (e.g. `sgs-header`, `sgs-bag-drawer`), which nothing styles and which name the WordPress parts, and `rev-rail`, which the helmet styles (scrollbar) and the logic queries.
- Nodes **without** `data-dc-tpl` were created by code. In these drafts the logic creates no DOM (`React.createRef` only, no `createElement` content), so there are none.

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
- `style="…"` is converted to a React style object. Kebab-case becomes camelCase and `--custom-props` are kept (the root sets `--acc`, `--accInk`, `--accSoft` this way). Holes inside style are resolved first.
- `class` → `className`, `for` → `htmlFor`.
- `on*` attributes map to React events. The full list is in `EVENT_MAP` in support.js: click, change, input, submit, key*, mouse*, pointer*, touch*, drag*, focus, blur, animation*, transition*. Any other `onxyz` becomes `onXyz`. This project uses `onClick`, `onChange`, `onSubmit`, `onMouseEnter`, `onMouseLeave` and `onFocus`.
- `value`/`checked` that resolve to `undefined` become `""`/`false`, so inputs are always controlled. The account and checkout forms use `defaultValue` instead (uncontrolled; submit handlers read them with `FormData`).
- Any other attribute passes through as a React prop. That includes `ref` and `key`: `ref="{{ rootRef }}"` passes a `React.createRef()` object; `key="{{ toastKey }}"` (toast), `key="{{ bagCount }}"` (bag badge), `key="{{ galleryKey }}"` (main photo), `key="{{ lensTotalKey }}"` and the literal keys `q0`–`q3` (lens steps) remount the element when the value changes, which replays its CSS animation.

**`style-<pseudo>="decls"`.** Any suffix is accepted. It becomes the rule `.scpN:<pseudo>{decls !important}`, so `style-hover`, `style-focus`, `style-active`, `style-focus-visible`, `style-focus-within`, … all work. `style-before`/`style-after` become `::before`/`::after`, without `!important`. Because of `!important`, hover rules **beat inline styles and styles set from JS** while active. This project uses only `style-hover` (87 in the storefront, 4 in Frame Card); focus styling is one `<helmet>` rule.

**`<sc-if value="{{ x }}">`.** Renders its children when `x` is truthy. There is no else; the draft uses a second `sc-if` on a complementary flag (`hasImg`/`noImg`, `navFull`/`navCompact`, `hasPdpReviews`/`noPdpReviews`). No wrapper element is rendered.

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
- Here, the storefront mounts `Frame Card` five times (best sellers, shop grid, more from brand, similar, account wishlist), each inside an `sc-for`, passing one prop `p`: a decorated product from `deco()` with its handlers (`open`, `toggleFav`, `goBrand`, colour `pick`s) already bound. Frame Card has no logic class; it reads `p.*` straight from props.

**`<x-import component|component-from-global-scope="…" from="./file.js">`.** Mounts an external React component or custom element. This project doesn't use it.

**`<helmet>`.**
- `<script>` is appended to `<head>` once per `src`/text. The storefront's helmet loads no script; it holds only the inert JSON manifest (`<script type="application/json" data-sgs-manifest>`).
- `<link>` and `<meta>` are added once (Google Fonts preconnect and stylesheet).
- `<style>` and other tags are kept in sync by position.
- `<meta name="design_doc_mode" content="canvas">` switches the editor to canvas mode (not used here).

**Other attributes you'll see.** `data-screen-label` exists only so editor comments can name screens (Home, Shop, Product, Lenses, About, Help, Contact, Checkout, Order confirmed, Sign in, My account). `data-dc-tpl` is added by the runtime and is never in the source.

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
- **`componentDidUpdate` receives only `prevProps`. There is no `prevState` argument.** Code written as `(pp, ps)` sees `ps` undefined and its update path never runs. The storefront declares `componentDidUpdate()` with no parameters and compares nothing (it calls `measure()`, `reveals()` and `lockScroll()` on every update; `lockScroll()` keeps its own `this._locked` snapshot), so it is not affected.
- **`renderVals()`** runs on every render. Its result is merged over props: `vals = {...props, ...renderVals()}`. It must return everything the template reads, including handlers and refs. Errors are caught and shown as a red banner.
- **Everything else is a per-project choice by the author:**
  - responsive values computed inline in `renderVals()` from `state.w` (`mobile`, `tablet`, `desktop`, `belowDesktop`, `gridWide`, `drawerFilters`, `navFull`/`navCompact`, and named values such as `secPad`, `prodCols`, `heroH`); there is no `R` object;
  - static data on the class (`Component.PRODUCTS`, `COLS`, `BRANDS`, …) rather than getters;
  - `measure()`, `reveals()`, `show()`, `bare()`, `showAll()`, `parallax()`, `lockScroll()`, `openMega()`, `toggleMega()`, `closeMega()`, `go()`, `toast()`, `lensLine()`, `lensPrice()`, `addToBag()`, `blurb()`, `gbp()`;
  - `rmQ` / `get rm()` (the prefers-reduced-motion query, read by the reveal, parallax and review rail);
  - refs `rootRef`, `heroRef` and the `data-reveal` hook.

### This draft's data model

- Routing: `state.page` ∈ `home, shop, product, lenses, about, help, contact, checkout, done, signin, account`, one `sc-if` per page (`isHome` … `isDone`, `isSignin`, `isAccount`). `go(page, extra)` sets it, closes the menu, bag, filter drawer and mega menu, and scrolls to the top. `account` renders the sign-in page while `state.user` is null. No URL or hash is involved.
- Accounts: `user` (`null` or `{first, last, email, mobile, isNew}`), `auth` (`view` ∈ `signin, forgot, sent, reset`, `email`, `note`, `mismatch`, `returnTo`), `acct` (`tab` ∈ `orders, subs, addr, wish, details`, `orderId`, `editAddr`, `saved`), `addr` (`delivery`, `billing`), `subs`, `subConfirm`, `placed` (orders placed this session), `lastOrder`, plus `co.account` / `co.email` at checkout. Demo data: `ORDERS` (3), `SUBS` (2), `DEMO_USER`, `DEMO_ADDR`. Sign in accepts anything and loads the demo data; register starts empty.
- Catalogue: `PRODUCTS` (16 frames: `id, brand, name, code, price, rrp, img, shape, colour, gender, pol, rating, revs, eye, bridge, temple, mat, hinge, nose, ftype, lensCat, cols, alt`), `COLS` (12 colours), `BRANDS` (40 as `[name, count, isTop]`), `STYLE_LIST`, `MATERIALS`, `FTYPES`, `HINGES`, `NOSES`, `SHAPES` (6 tiles), `IMG` (Unsplash URLs).
- Content: `TICKER` (4), `REASONS` (4), `REVIEWS` (13 verbatim Google reviews), `PDP_REVIEWS` (3 placeholders), `FAQS` (8), `ACC` (taupe only).
- `deco(p)` turns a product into the card/PDP view model (labels, savings, swatches, handlers). `renderVals()` derives filters and results, the lens flow (`useOptions`, `thickOptions`, `finishOptions`, `rxModes`, `runningLines`) and the bag (`bagItems`, subtotal, shipping).
- Dead code you shouldn't port: `colourTiles[].filterHint` / `cur.colsKeys` (read but never set; overwritten by the loop after it). The preview frame, the `hashchange` listener, `rmFlag` with its `[data-rm]` rule, the `slideUp` keyframe and `image-slot.js` have been removed from the draft.

## 5. Tying elements to code and styles

Everything that can affect an element:

1. **Inline `style`** in the template, including the holes resolved from `renderVals()`.
2. **`style-*` pseudo rules** on the same element.
3. **Holes** in text and attributes. Trace the name into `renderVals()` (or `deco()` for `p.*` / `cur.*`).
4. **Event attributes**, whose handlers are in the logic class.
5. **`ref="{{ … }}"`**, through which the logic stores the element and later writes styles. Refs here:
   - `rootRef` (root div: width measurement, `data-reveal` queries);
   - `heroRef` (hero image wrapper: parallax).
6. **`data-*` hooks queried by code:**
   - `data-reveal` (scroll reveal targets, 21 elements);
   - `data-rv` (written by code: `pending`, then `shown`).
7. **Structural queries:**
   - `root.querySelectorAll('[data-reveal]:not([data-rv])')` (new reveal targets after each render);
   - the `data-reveal` children of each target's parent (stagger index);
   - `document.querySelector('.rev-rail')` (review arrows);
   - `e.target.closest('.sgs-header')` in the document `pointerdown` listener (outside click closes the mega menu);
   - `document.documentElement.style.overflow` (page scroll lock behind overlays).
8. **Inside external scripts:** none; no external script is loaded.

That covers these drafts. Item 7 shows why reading the selectors alone isn't enough: the stagger index depends on which siblings are rendered.

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

These drafts make no `.animate()` calls, so in practice the MutationObserver (reveal and parallax style writes) and `animationstart`/`transitionrun` listeners do the work. Exercise each state: scroll every page, hover the cards and buttons, call `setState` for the mega menu, mobile menu, bag, filter drawer, accordions, tabs, size guide, lens steps, checkout modes, sign-in views and account tabs, and visit every page. `transition` and `animation` declarations are static: collect them from inline styles and `style-*` rules in the annotated template.

**Determinism for headless runs.** No draft reads `Math.random` or `localStorage`, and nothing depends on the current date except reveal timing (`show()` uses `Date.now()`); account dates are fixed values formatted with `Date`. Stub or wait out the timers: the width poll (`setInterval` 120ms × 40, then 800ms), the 150ms mega-menu open delay and the 3300ms toast timeout. Emulating `prefers-reduced-motion: reduce` turns off the reveal tween, the parallax and smooth review scrolling. The stock line is derived from `id % 4`, not live data. Photos load from images.unsplash.com, so wait for them before measuring.

## 6. What the code doesn't state

The code doesn't state final layout values from `clamp()`/`vw`/grid tracks at a given width, or the font metrics. Measure those from the rendered page. Everything else is in the template or the logic.

## 7. Stability across projects and runtime versions

- **Defined by the runtime, same in every project using this runtime:** the file structure, the boot sequence, the template syntax (§3), the logic API (§4), `data-dc-tpl`, the `sc-host` wrappers, and the `scpN` pseudo classes.
- **Not versioned.** `support.js` is a generated build with no version string, and the bridge globals are internal. Record the `support.js` SHA-256 with every handoff and compare against it.
- **Per project, chosen by whoever wrote the draft:** hook names (`data-reveal` here), animation technique (CSS keyframes and transitions plus a setTimeout tween here; other projects use `element.animate()`), how routes and responsive values are organised, and file splits. Discover them per project with the §5 method rather than a fixed hook list.
