# Reading and running a `.dc.html` draft

Written against the `support.js` in this bundle (SHA-256 in `MANIFEST.md`). Section 7 says which parts are fixed and which are per-project choices.

## 1. File architecture

```
<!doctype html><html><head>
  <script src="./support.js"></script>          runtime
</head><body>
<x-dc>                                          template (everything up to the LAST </x-dc>)
  <helmet> <title>, Google Fonts <link>, <script src="store.js">, <style> resets </helmet>
  ...markup with {{ }} holes, sc-if, sc-for, dc-import...
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{...}'>   logic class (optional data-props JSON)
class Component extends DCLogic { ... }
</script>
</body></html>
```

- `type="text/x-dc"` stops the browser running the logic; the runtime evaluates it.
- `data-props` (optional) is JSON: `$preview` `{width,height}` for sized fragments, plus one entry per prop (`editor`, `default`, `tsType`, …). Defaults are passed to the root as props. The eleven pages have none. `SiteHeader` declares `$preview` and a `current` enum (`home, shop, gifts, sub, help, contact, account`); `SiteFooter` only `$preview`; `ProductCard` declares `$preview`, `product` (object) and `size` (`sm` | `md`).
- The DC's **name** is the file basename without `.dc.html`, URL-decoded: `Home`, `Product`, `SignIn`, `Account`, `SiteHeader`, `ProductCard`.

### Boot sequence (support.js)

1. Injects `x-dc{display:none!important}` and base placeholder CSS.
2. Loads React 18.3.1 and ReactDOM UMD from unpkg (with SRI) unless `window.React`/`window.ReactDOM` already exist. **No network → nothing renders.** The drafts also need Google Fonts from the network.
3. On DOMContentLoaded: reads `x-dc.innerHTML` from the live DOM and the logic script's text, compiles both, replaces `<x-dc>` with `<div id="dc-root">`, and renders with `ReactDOM.createRoot`. With no `$preview` (every page here), it adds `html,body{height:100%;margin:0}#dc-root,#dc-root>.sc-host{height:100%}`.
4. Unless `window.__resources` is set (bundled export), it **re-fetches its own URL** and recompiles from the raw text between `<x-dc>` and the last `</x-dc>`, because the HTML parser alters some markup. This needs HTTP(S); `file://` fails.
5. `<dc-import name="X">` fetches `./X.dc.html` (URL-encoded) and compiles it the same way. Here that is `SiteHeader`, `SiteFooter` and `ProductCard`.

Consequences:

- Before boot, the browser parses the raw template as **live DOM**. `<script>` tags inside `<helmet>` run then, and the runtime appends them to `<head>` again later (once per `src`). Helmet scripts must therefore be idempotent. The only one here is `store.js`, which starts with `if (window.MM) return;`, builds `window.MM` and dispatches `mm:ready`; it never touches the DOM, so it cannot cause the removeChild crash described in CLAUDE.md. Custom elements inside the raw template would also upgrade and run `connectedCallback` there; this project has none.
- Because `store.js` can run before or after a DC mounts, every logic class does `if (window.MM) go(); else window.addEventListener('mm:ready', go, { once: true })`.
- The logic is evaluated with `new Function('DCLogic','StreamableLogic','React', src)`. It is classic script: no `import`, no TypeScript.

### Runtime globals

| Global | What it exposes |
|---|---|
| `__dcTemplateSource(name)` | Raw template string (registry `html`) exactly as written. |
| `__dcAnnotatedTemplate(name)` | Compiled template as HTML: every element stamped `data-dc-tpl="N"` (pre-order index), camelCase attributes encoded as `sc-camel-*` (`onClick` → `sc-camel-on-click`, `viewBox` → `sc-camel-view-box`), `<helmet>` → `<sc-helmet>`, and `select/table/tbody/thead/tfoot/tr/td/th/caption` → `sc-raw-*` (Shop's sort `<select>` is `sc-raw-select`). |
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
const H = dcLogic('SiteHeader');
H.setState({ basket: true });                 // open the basket drawer
dcLogic('Product').setState({ sub: true });   // switch the buy box to Subscribe & save
```

Use this to reach closed states (drawers, accordions, form steps, results) without simulating pointer input. Basket contents are not logic state: change them through `window.MM.cart` (`add`, `setQty`, `remove`, `clear`, `setGift`), which writes localStorage and fires `mm:cart`, and every subscribed DC re-renders.

## 2. Rendered DOM shape

- Each DC renders as `<div class="sc-host" data-sc-name="Name">…</div>`. The root sits at `#dc-root > div.sc-host`. These wrappers are runtime-only. Don't port them, and allow for them in `>` selectors. The `SiteHeader` host receives the `style="position:sticky;top:-32px;z-index:50;display:block"` from its `dc-import` (only position/size/z-index/transform keys pass through).
- **Every template element carries `data-dc-tpl="N"`** in the rendered DOM. This is the reliable link from a rendered node back to its source element in `__dcAnnotatedTemplate`. Elements repeated by `sc-for` share one N.
- Each text hole renders as `<span class="sc-interp">value</span>`. Text measured in the DOM therefore has extra spans that aren't in the source.
- Pseudo-state attributes become generated classes `scp0`, `scp1`, … in one runtime `<style>`. These are the only classes on the page.
- Nodes **without** `data-dc-tpl` were created by code: `React.createElement` output from the logic, which here is the Home trust bar (`trust()`: four icon items, static grid on desktop, a `[data-marquee]` row below 1024px) and the footer tagline (`tagline()`, also `[data-marquee]`).

## 3. Template language

**Holes `{{ expr }}`.** The resolver (`resolve()`) accepts:
- dotted paths `a.b.c`, numeric segments `a.0`, bracket lookups `a[b]` (where `b` is itself resolved);
- literals `true false null undefined`, numbers, `'strings'`;
- prefix `!`, and top-level `===`, `!==`, `==`, `!=`, with parentheses.

Nothing else is supported: no `+`, `&&`, `?:` or calls. Authoring guidance allows paths only, and these drafts use paths only (`{{ L.heroPad }}`, `{{ o.bg }}`, `{{ act.shop }}`).

- A whole-attribute hole (`x="{{ p }}"`) passes the raw value: a function, number, object or ref. `ProductCard` receives a whole product object this way (`product="{{ p }}"`).
- A mixed attribute (`x="a {{ p }} b"`) becomes a string, with `undefined` → `""`.
- In text: a React element or array is inserted as-is; `null` and booleans render nothing; `undefined` renders nothing and logs a warning; anything else is stringified inside a span.

**Attributes.**
- `style="…"` is converted to a React style object. Kebab-case becomes camelCase and `--custom-props` are kept. Holes inside style are resolved first (`padding:{{ L.pad }}`, `transform:{{ navX }}`).
- `class` → `className`, `for` → `htmlFor`.
- `on*` attributes map to React events. The full list is in `EVENT_MAP` in support.js: click, change, input, submit, key*, mouse*, pointer*, touch*, drag*, focus, blur, animation*, transition*. Any other `onxyz` becomes `onXyz`. These drafts use `onClick`, `onChange`, `onSubmit`, `onScroll`, `onPointerDown/Move/Up/Cancel`, `onClickCapture`, `onDragStart`, `onMouseEnter/Leave`, `onTouchStart/End/Cancel`, `onFocus`/`onBlur` (React focus events bubble, so a section or footer can track focus inside it).
- `value`/`checked` that resolve to `undefined` become `""`/`false`, so inputs are always controlled. Inputs written with no `value` (Contact fields, Checkout mobile, card and password fields) are uncontrolled and their contents are never read. Forms that validate in the logic set `noValidate="{{ true }}"` (SignIn, Account); Checkout and Contact rely on browser `required` / `minLength`.
- Any other attribute passes through as a React prop. That includes `ref`: `ref="{{ rootRef }}"` here is a `React.createRef()` object (not a callback); the logic reads `.current`.

**`style-<pseudo>="decls"`.** Any suffix is accepted. It becomes the rule `.scpN:<pseudo>{decls !important}`, so `style-hover`, `style-focus`, `style-active`, `style-focus-visible`, `style-focus-within`, … all work. `style-before`/`style-after` become `::before`/`::after`, without `!important`. Because of `!important`, hover rules **beat inline styles and styles set from JS** while active. This project uses only `style-hover` and `style-active`; focus styling comes from the helmet rule `:focus-visible{outline:3px solid #3A2A22;outline-offset:3px}`.

**`<sc-if value="{{ x }}">`.** Renders its children when `x` is truthy. There is no else; the drafts use a second `sc-if` on a complementary flag (`isD` / `notD`, `hasItems` / `isEmpty`, `sent` / `notSent`, `hasNote` / `noNote`). No wrapper element is rendered.

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
- Here: every page except Checkout mounts `SiteHeader` (with `current="home|shop|gifts|contact|help|account|"`, Product passes `{{ navKey }}`: `sub` with `?sub=1`, else `shop` or `gifts`) and `SiteFooter`; Shop, Gifts and Product mount `ProductCard` inside an `sc-for` with `product` and `size`.

**`<x-import component|component-from-global-scope="…" from="./file.js">`.** Mounts an external React component or custom element. This project doesn't use it.

**`<helmet>`.**
- `<script>` is appended to `<head>` once per `src`/text (`store.js` is listed by every page and by `SiteHeader`; it loads once).
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
- **`componentDidUpdate` receives only `prevProps`. There is no `prevState` argument.** The two drafts that use it, `Home` (cookie wobble) and `SiteHeader` (body scroll lock), declare `componentDidUpdate()` and keep their own snapshot in `this._prev`, which is correct. No draft uses `(pp, ps)`.
- **`renderVals()`** runs on every render. Its result is merged over props: `vals = {...props, ...renderVals()}`. It must return everything the template reads, including handlers and refs. Errors are caught and shown as a red banner.
- **Everything else is a per-project choice by the author:**
  - `bpOf()` and `state.bp` (`'m'` < 768, `'t'` < 1024, `'d'`), updated on `resize`;
  - the `L` object of responsive values built with `v(mobile, tablet, desktop)` in each page's `renderVals()` (SiteHeader and SiteFooter return flat values instead);
  - `motion()` (scroll reveal; Home also twinkle and float), `drag(ref)` and `step()` (Home carousels), `trust()` and `tagline()` (marquee rows);
  - `state.tick`, bumped by `MM.on(cb)` subscriptions so the template re-reads localStorage;
  - `rootRef`, `cookieRef`, `giftRef`, `trackRef`, `addRef`, `badgeRef` and the `data-*` hook names.

### This draft's data model

- No page map: each page is a file. Shared data lives in `store.js` as `window.MM`:
  - `sizes` (8 / 20 / 40 with price, per-cookie text, tag), `builder` (`bases`, `chips`, 11 `flavours` with dot colour), `subscribe` (`freqs`, `off: 0.1`, `perks`);
  - `products` (5: `zookies`, `trial`, `giftbox`, `care40`, `giftcard`; each with `kind` `zookies|simple|card`, `cats` for Shop filters, `occ` for the gift finder, `gallery`, `badge`, `cta`);
  - `reviews` (6), `occasions` (4), `methods` (`t48`, `t24`), `FREE` = 35;
  - `cart` over localStorage `mm_cart_v2` / `mm_gift_v2`, `delivery(method, subtotal)`, `bakes(n)` (each bake `{ date, dow, day, mon, orderBy, arrive, iso }`), `placeOrder(o)` → `mm_order_v2` (and `mm_orders_v1` when signed in; `o.createAccount` registers first), `order()`, `openBasket()` (event `mm:open-basket`), `on(cb)` (events `mm:cart` + `storage`), `product(id)`, `qs(k)`;
  - `account` over `mm_account_v1` / `mm_orders_v1`: `get()`, `signedIn()`, `update(p)`, `register(p)`, `signIn(email)` (seeds a demo account and two demo orders the first time), `signOut()`, `setSub(id, p)`, `orders()`, `order(no)`; date helpers `fmtIso(iso)`, `addWeeksIso(iso, w)`, `bakeOn(iso)`. Every account write fires `mm:cart`, so the header and pages re-render.
- `renderVals()` maps lists to template rows with computed styles (`pill(on)` → `{bg, shadow, tf}`, `card(on)`), and handlers.
- Dead code you shouldn't port:
  - `MM.flavours` (5 legacy flavours; the builder uses `MM.builder.flavours`), `MM.qs()` (never called) and `MM.eta()` (called only to fill SiteHeader's unused `eta`);
  - `gift.from`, `gift.hide`, `gift.wrap` (never written by the UI; `gift.to` is written at checkout);
  - SiteHeader's `bake`, `eta` and `act.story`;
  - SiteFooter's `notM`, `wordSize`, `stroke`, `wordM` (returned, never rendered);
  - the `@keyframes mmMarquee` copies in the Product, Shop, Gifts, Basket, Confirmation, Contact and Help helmets (no element of theirs uses them).

## 5. Tying elements to code and styles

Everything that can affect an element:

1. **Inline `style`** in the template, including the holes resolved from `renderVals()`.
2. **`style-*` pseudo rules** on the same element.
3. **Holes** in text and attributes. Trace the name into `renderVals()` (or `trust()` / `tagline()`).
4. **Event attributes**, whose handlers are in the logic class.
5. **`ref="{{ xRef }}"`**, through which the logic stores the element and later animates it or writes styles. Refs here:
   - `rootRef` (Home, Shop, Product, Gifts, Contact): scope for `[data-reveal]`, `[data-twinkle]`, `[data-float]` queries;
   - `cookieRef` (Home): cookie wobble;
   - `giftRef`, `trackRef` (Home): drag-to-scroll, arrows, dots, autoplay;
   - `addRef` (Product): IntersectionObserver that shows the mobile sticky bar;
   - `badgeRef` (Confirmation): ✓ pop;
   - `navRef` (SiteHeader): the nav drawer `<aside>`, scope for the entrance stagger.
   SignIn and Account have no refs.
6. **`data-*` hooks queried by code:**
   - `data-reveal` (scroll reveal; on Home also the stagger group);
   - `data-twinkle`, `data-float` (Home hero loops);
   - `data-dstagger` (SiteHeader: nav drawer items animated by `navIn()` when `nav` turns true);
   - `data-marquee` (code-created; targeted by the `@media (prefers-reduced-motion:reduce)` rule in the Home and SiteFooter helmets).
7. **Structural queries:**
   - `e.target.parentElement.children` filtered by `data-reveal` (Home stagger index);
   - `t.children[0].getBoundingClientRect().width` + gap (carousel step width);
   - `document.querySelector(location.hash)` (Help deep links);
   - `document.body.style.overflow` (SiteHeader scroll lock);
   - `e.currentTarget.contains(e.relatedTarget)` (Home reviews and SiteFooter: focus left the region);
   - `e.target.matches(':focus-visible')` (SiteFooter: keyboard focus only);
   - `document.title` (Product) and `window.scrollTo({ top: 0 })` (Account, opening an order).
8. **Inside external scripts:** none. `store.js` holds data and localStorage only.

That covers this draft. Item 6's `data-marquee` shows why reading the template alone isn't enough: those targets are created by code.

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

Then exercise each state: scroll each page fully, hover cards and buttons, drag the Home carousels, call `setState` for both drawers (the nav drawer stagger runs on each open), every accordion, the builder options, the Checkout gift fork and account checkbox, the Contact topics, every SignIn `mode` and every Account `tab` (plus `orderNo`, `confirm`, `editing`), and visit every page and `?id=` variant signed in and signed out. `transition` declarations are static: collect them from inline styles and `style-*` rules in the annotated template. (The inventory in this bundle was produced from source only; no trace was run.)

**Determinism for headless runs.** Stub `Date` (Home greeting buckets by hour; `MM.bakes()` computes the next Monday bake) and `Math.random` (`placeOrder()` order number `MM-####`). Disable the Home 6s review interval or drive it with `setState({ rev })`. Clear `localStorage` keys `mm_cart_v2`, `mm_gift_v2`, `mm_order_v2`, `mm_seeded_v2`, `mm_account_v1` and `mm_orders_v1` (the demo account's orders and subscription dates are computed from today): Basket and Checkout call `MM.cart.seed()`, which adds two demo lines once per browser, and Confirmation falls back to a demo order `MM-1042` when none is stored. ProductCard's "Added ✓" resets after 1600ms; Account's "Saved ✓" messages after 2400ms; Contact's reveal starts 80ms after mount and the others 60ms after `mm:ready`.

## 6. What the code doesn't state

The code doesn't state final layout values from `min()`/`vw`/`fr` grid tracks at a given width, the font metrics, or how the native `<select>`, date and checkbox controls render. Measure those from the rendered page. Everything else is in the template or the logic.

## 7. Stability across projects and runtime versions

- **Defined by the runtime, same in every project using this runtime:** the file structure, the boot sequence, the template syntax (§3), the logic API (§4), `data-dc-tpl`, the `sc-host` wrappers, and the `scpN` pseudo classes.
- **Not versioned.** `support.js` is a generated build with no version string, and the bridge globals are internal. Record the `support.js` SHA-256 with every handoff and compare against it.
- **Per project, chosen by whoever wrote the draft:** hook names (`data-reveal` here vs anything else), animation technique (`element.animate()`, CSS keyframes, transitions), the `bp`/`L`/`v()` conventions, the `window.MM` store, and file splits. Discover them per project with the §5 method rather than a fixed hook list.
