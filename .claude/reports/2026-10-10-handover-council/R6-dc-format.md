# R6: the `.dc.html` format, and whether to read the draft's source

Read-only research, 2026-10-10. Every claim cites a file and location; **INFERRED** marks a conclusion that was not
directly proven by a read or a run. Abbreviations: **Indus** = `.claude/Indus-Foods-Claude-Design-Files/design_handoff_indus_foods_website/Indus Foods Website v2.dc.html`;
**EC** = `sites/eye-care-ward-end/design_handoff_ward_end_eye_care_v2/Eye Care Birmingham.dc.html`; **MM** = `sites/mamas-munches-redesign/`;
**rt** = the runtime `support.js` in the Indus folder (unless named otherwise).

## Plain English first

**Problem.** The cloning route (Spec 47) reads only what the draft draws in a browser. The draft's code holds more:
page copy for every route, the full form schemas, hover rules, every breakpoint value, and the exact animation timings.
Because the route ignores that code, it reconstructs it the hard way: it curve-fits `clamp()` from samples, sweeps 16px
steps to find breakpoints, polls poses every frame to guess an entrance, and still misses easing, blur, clip-path and
anything off-screen.

**Effect.** Gaps you have already seen: the marquee proposed as plain text, six Instagram columns becoming two, entrance
easing and blur never written, testimonials 2 to 4 and form steps 2 to 5 never measured, and opening hours that change
with the clock.

**Solution (proposal, Bean decides).** Keep **measuring values** (R-47-4's real lesson still holds; see §3). Add three
cheaper, safer kinds of reading, all inside the real browser: (1) **declared values** from the browser's own style
records (`repeat(6, minmax(0,1fr))`, not `193px 193px …`); (2) **recorded animation calls** (intercept the draft's
own `element.animate()` and `IntersectionObserver` as they run, so timings and easing come out exact); (3) **the logic
class run as data** (call its `pages`, `_menus` and `schema` getters, and `renderVals()` at each width and state, to
list content, states and breakpoints). Never regex the file for values. §5 has the detail and the risks.

---

## 1. Format anatomy

### 1.1 Document skeleton

Every file has the same shell (Indus lines 1–25, 956–958; `EnquiryForm.dc.html` lines 1–15, 80–81; MM `Home.dc.html` lines 1–16):

```html
<!DOCTYPE html><html><head>…<script src="./support.js"></script></head>
<body>
<x-dc>
  <helmet> fonts <link>, a <style> block, extra <script src> (image-slot.js, indus-logo.js, store.js) </helmet>
  <div …root template…> … </div>
</x-dc>
<script type="text/x-dc" data-dc-script [data-props="{…}"]>
class Component extends DCLogic { … }
</script>
</body></html>
```

- `<helmet>` is rewritten to `<sc-helmet>` and compiled into `<head>` (rt `encodeCase`, around line 377; `walk` dispatches
  `sc-helmet` to `host.helmet`, line 494).
- `data-props` on the logic script declares editor props and a preview size: EnquiryForm
  `{"$preview":{"width":"1100px","height":"900px"}}` (line 81); EC declares typed, enumerated props (`accent`
  taupe/sage/navy, `reduceMotion` boolean; EC line 2231). These are the component's public inputs.
- EC additionally carries a non-runtime `<script type="application/json" data-sgs-manifest>` (EC lines 37–714:
  breakpoints, pages, overlays, repeated groups, behavioural rules). It exists only in the EC v2 and "SGS Gap Handoff"
  exports; Indus and MM have none (grep of all three folders). It is an SGS authoring request, not part of the format
  (also `.claude/reports/2026-10-09-route-accuracy-council/COUNCIL.md` §4).

### 1.2 Imports

- `<dc-import name="TradeApplication" hint-size="100%,900px"></dc-import>` (Indus line 614; `EnquiryForm` line 618).
  The runtime fetches `./<name>.dc.html` from the same folder (rt line 1576, `COMPONENT_DIR = "."` line 1552), or a
  bundled blob when exported as one page (rt `bundledBlob`, line 1580).
- Props pass as attributes: MM `<dc-import name="SiteHeader" current="home" …>` (MM `Home.dc.html` line 20); EC passes
  `p="{{ p }}"` into `Frame Card` (EC line 915). Only position/size keys of an import's `style` reach the host
  (rt `HOST_STYLE_PROPS`, `hostPositionStyle`, around lines 445–470).
- `<x-import from="…">` loads an external module (rt `walkXImport`); none of the three drafts uses it (grep).

### 1.3 Template language

| Construct | Example | Runtime behaviour |
|---|---|---|
| `{{ path }}` hole | `padding:{{ L.pad }}` (EnquiryForm line 18) | `compileAttr`: a whole-value hole returns the raw value; a mixed string splices (rt `compileAttr`, ~line 402). Text holes become `<span class="sc-interp">` (rt ~line 543). |
| `<sc-if value hint-placeholder-val>` | `<sc-if value="{{ isM }}" hint-placeholder-val="{{ false }}">` (Indus line 32) | Renders children when truthy; the hint is used only while streaming (rt `walkIf`, ~line 583). |
| `<sc-for list as hint-placeholder-count>` | `<sc-for list="{{ topics }}" as="tp" hint-placeholder-count="6">` (EnquiryForm line 25) | Maps the list, exposing `as` and `$index` (rt `walkFor`, ~line 547). |
| `sc-else` | none | Not in the template walker; it appears only in the newer runtime's deck regex (MM `support.js` line 487). No draft uses it. |
| `ref="{{ setCard }}"` | EnquiryForm line 17 | Passes a DOM element to a logic method (used for animation and measurement). |
| Events | `onClick="{{ tp.onClick }}"`, `onSubmit`, `onFocus`, `onMouseEnter` | Camel-case attributes are encoded `sc-camel-*` and decoded to React props (rt `EVENT_MAP`, `encodeCamelAttrs`). |
| `hint-size` | `hint-size="100%,760px"` | Placeholder box while an import streams in. |

Counts (grep, this session):

| File | `sc-if` | `sc-for` | `style-hover` | `style-focus` | `style-active` | holes `{{` | `style="` | style attrs with a hole | `@media` | `@keyframes` | `.animate(` | `clamp(` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Indus | 79 | 41 | 74 | 3 | 0 | 671 | 489 | 119 | 0 | 0 | 29 | 28 |
| TradeApplication | 25 | 8 | 8 | 3 | 0 | 171 | 80 | 25 | 0 | 0 | 3 | 2 |
| EnquiryForm | 6 | 3 | 3 | 2 | 0 | 70 | 36 | 11 | 0 | 0 | 2 | 3 |
| EC | 95 | 39 | 64 | 0 | 0 | — | — | — | 1 | 9 | — | 9 |
| MM `Home` | 4 | 11 | 18 | 0 | 3 | — | — | — | 1 | 1 | 4 | — |

### 1.4 State attributes (`style-<pseudo>`)

- Any attribute named `style-<x>` becomes a generated class `scpN` with a rule `.scpN:<x>{…}` (or `::before`/`::after`),
  written into one `<style>` element in `<head>`, every declaration made `!important` (rt `collectProps` ~line 427,
  `createPseudoSheet` line 1497, `importantify` line 1472). So `style-hover`, `style-focus`, `style-active` all work, and
  `style-focus-visible`, `style-before` and so on would too.
- **The value is used raw, at compile time** (`host.pseudoClass(key.slice(6), value)` is called with the attribute text,
  not through `compileAttr`). Five Indus hovers contain holes, e.g. `style-hover="…;color:{{ card.textColor }}"` and
  `style-hover="color:{{ hero.fg }}"` (grep of Indus). The hole is therefore never filled. **INFERRED**: the browser drops
  that declaration as invalid, so the designer's hover colour never painted; a source parser would report a hover the
  draft does not have.
- Not all hover lives in `style-hover`: Indus has 4 `onMouseEnter` handlers (Indus lines 41, 51, 277, 766; e.g. `btnEnter`
  sets inline `transform`/`boxShadow`, Indus line 1342), and pointer effects bound document-wide on `[data-mag]` and
  `[data-tilt]` (Indus `bindMotion`, lines 1222–1251).

### 1.5 `data-*` hooks

`data-*` pass through to the DOM (rt `collectProps`). They are free-form, per designer:

- Indus: `data-mag` ×16 (magnetic pull + shine + ripple, `bindMotion`), `data-tilt` ×3 (3D tilt up to 16deg), `data-label`
  (magnetic label shift, `magnet`, line 1329), `data-anim` (mega-panel stagger, `animatePanel` line 1188), `data-manim`
  (drawer stagger, line 1195), `data-draw`/`data-draw-y` (line-draw reveal), `data-pin*` (pinned horizontal scroll,
  `updatePins` line 1012), `data-hero-img`, `data-rv-done` (written by the reveal code).
- EC: `data-reveal="1"` ×21, `data-rm="{{ rmFlag }}"` (reduced-motion kill switch, EC lines 30, 717), `data-screen-label`.
- MM: `data-reveal` ×27 (`Home`), `data-float`, `data-twinkle` (MM `Home.dc.html` lines 274–275), `data-screen-label`.

Same mechanism, different vocabulary per designer: a hook's meaning lives only in that draft's logic class.

### 1.6 The logic class

`class Component extends DCLogic` inside `<script type="text/x-dc" data-dc-script>`. The runtime evaluates it with
`new Function("DCLogic","StreamableLogic","React", src)` (rt `evalDcLogic`, ~line 772). It is a React-like class:

- `state = {…}` fields. Indus: `{ page, w, active, mobileOpen, acc, faqOpen, sent, blogCat, tIdx, missing }` (Indus
  line 959). TradeApplication: `{ ckOpen, step, v, errs, done, ref, w, saved }` (line 156).
- Lifecycle: `componentDidMount` (listeners, hash routing, reveal, entrance, a 6.5s testimonial interval; Indus
  lines 961–979), `componentDidUpdate` (route-change animation, testimonial slide, panel/drawer stagger; lines 990–1006),
  `componentWillUnmount`.
- **`renderVals()`** returns the flat object the template renders against (rt `StreamableLogic.renderVals`, ~line 768;
  Indus line 1931; EnquiryForm `renderVals`).
- Data getters: Indus `get pages()` (line 1403, about 300 lines of page copy and typed block lists), `get _menus()`
  (line 1354), `get sectors()` (1345), `get brandLogos()` (1388), `get blogPosts()` (1700), `get slots()` (opening hours,
  1046). TradeApplication `get schema()` (line 175): five steps, every field with type, options, `req`, `show` conditions
  and validation regexes. MM `SiteFooter` `renderVals` holds the six Instagram posts and every per-width value (lines 97–118).
- Ref setters (`setCard`, `setMarqueeEl`, `setFloatEl`, `setPulseEl`) start animations as elements mount.

### 1.7 Animation: three authoring styles

| Draft | How motion is coded | Evidence |
|---|---|---|
| Indus | **Web Animations only** (`el.animate()`, 29 calls), no CSS keyframes. Reveal targets are chosen at run time by `getComputedStyle` (any grid, or wrapping flex, with 2+ visible children) | `setupReveal` lines 1147–1182; `animateEntrance` 1265–1277; marquee `setMarqueeEl` 1212 |
| EC | **CSS `@keyframes`** (9: `rise`, `fade`, `slideL`, `zoomIn`, `marquee`, `pop`, `toast`, `kenburns`…) used inline (`animation:rise .5s both` ×36), **plus a JS timer loop** for `data-reveal` that writes inline opacity/transform every 16ms | EC lines 20–28; `show()`/`reveals()` EC lines 2368–2420 |
| MM | **Mixed**: `data-reveal` via IntersectionObserver + `animate()` (32px, 800ms, `cubic-bezier(.2,.7,.2,1)`), one CSS marquee keyframe, `data-float`/`data-twinkle` loops | MM `Home.dc.html` lines 274–280; `SiteFooter.dc.html` `mmMarquee` |

Indus exact values from source: hero children `translateY(28px)` + `blur(8px)` + opacity, 900ms, delay `80 + i*110`,
easing `cubic-bezier(.16,.84,.32,1)`, `fill:'backwards'` (line 1270); scroll reveal IO `threshold:0.12`,
`rootMargin:'0px 0px -4% 0px'` (line 1181); items `translateY(40px) scale(.96)`, 800ms, `(i % 8)*80` delay (lines
1166, 1179); images `clip-path: inset(10% … round 24px)`, 1000ms (line 1178).

**Source disagrees with itself in EC.** The manifest rule says `data-reveal` "fade and rise 18px" (EC line 433) and the
CSS keyframe `rise` is 18px (line 20), but the code that runs animates **26px**, 460ms, cubic ease-out, 70ms stagger
capped at 7 (EC `show()` and `reveals()`, lines 2368–2416).

### 1.8 Responsive values

- **No breakpoints in CSS.** Indus, TradeApplication and EnquiryForm have 0 `@media` (grep); EC and MM have one each, and
  those are reduced-motion or tiny helpers (EC line 29).
- Breakpoints are **JS ternaries on a width in state**: Indus `bp = w < 768 ? 'm' : w < 1024 ? 't' : 'd'` and a 60-key `R`
  object (`px`, `secPad`, `heroCols`, `sectorCols`, `footCols`…; lines 1931–1979), plus off-grid steps (`navPad: w < 1200`,
  line 1937; header CTA at ≥1260 per README). MM `v(a,b,c)` helper (`SiteFooter.dc.html` line 99). EC measures its own
  root with a `ResizeObserver`, not the window (EC `measure`, lines 2348–2361), and adds five extra breakpoints (1060,
  1160, 1280, 1100, 620; EC manifest lines 49–75).
- Fluid sizes are literal `clamp()`/`vw`/`min()` in style attributes or `renderVals`: `clamp(22px,2.2vw,26px)`
  (EnquiryForm line 22), MM `wordSize: 'min(15.5vw, 206px)'` (`SiteFooter.dc.html` line 114).
- Both value kinds land as **inline styles**, so the browser's computed style shows only the result at one width.

### 1.9 How the runtime builds the DOM, and the stamps

1. Loads React 18.3.1 UMD from unpkg.com (rt lines 1073–1077) and boots on DOMContentLoaded (rt line 1834).
2. `compileTemplate` (rt ~line 462) parses the encoded template into a `<template>`, then **stamps `data-dc-tpl="<n>"` on
   every element in document order, counter reset per template** (`let tplN = 0`), and keeps the annotated HTML as
   `render.__annotated`.
3. `walk` turns each node into a builder (`sc-for`, `sc-if`, `x-import`, `sc-helmet`, `dc-import`, element). Elements carry
   their `data-dc-tpl` into the rendered DOM (rt `walkElement`, ~line 721–729); `sc-if`/`sc-for` render no element of
   their own (they are fragments), so those tags never reach the page (also D1058 in `.claude/archive/decisions.md` line 2923).
4. Each render calls `logic.renderVals()` and merges it over props (rt ~line 1015).

**Page bridge** (rt lines 1802–1830, assigned to `window`):
- `__dcAnnotatedTemplate(name)`: the encoded, stamped template source (`sc-camel-*` attributes, `<sc-raw-*>`,
  `<sc-helmet>`), so a rendered `data-dc-tpl` maps back to its source node. Holes are still holes.
- `__dcTemplateSource(name)`: the original decoded source.
- `__dcRegistry`: registry entries (`html`, `tpl`, `Logic`, streaming flags; rt `createRegistry`, ~line 1522). **So the
  logic class itself is reachable in the page**, and `new Logic(props)` plus a chosen `state` and `renderVals()` would
  evaluate data at any width or state without layout (**INFERRED** from the code; not run).
- `getDC(name)`, `__dcSetProps(name, overrides)`, `__dcRootName()`, `__dcBoot()`.

### 1.10 Is the format the same across designers?

- **Two runtime builds.** Indus (and the older Indus mega-menu folders) share md5 `450f2a92…`; EC (all three folders) and MM
  share `951ae391…` (md5sum, this session). The diff is a deck/slide mode (`deck-stage`, `data-om-slide-id`; MM
  `support.js` lines 486–549); the template language, stamping and bridge are the same.
- **Same grammar, different conventions.** All three use `sc-if`/`sc-for`/holes/`style-hover`/a logic class with JS
  breakpoints. What differs is everything a parser would key on: hook names (`data-mag` vs `data-reveal` vs `data-float`),
  animation style (WAAPI vs CSS keyframes vs timer loop), routing (Indus one file + hash routes + `pages` getter; EC one file
  + in-memory routes + manifest; MM one file per page linked as `Product.dc.html?id=trial`, MM `Home.dc.html` line 33),
  breakpoint source (window vs own root width).

---

## 2. What is readable from source, and what only after render

Reliability: **High** = a parser gets the exact authored value; **Exec** = needs the logic class run (JS executed, no
layout); **Render** = needs layout or real interaction.

| Information | Where it lives in source | Static parse | What needs rendering | Same across the 3 drafts? |
|---|---|---|---|---|
| Copy text, static | Template text nodes | High | Nothing | Yes |
| Copy text, data-driven | Logic getters (Indus `pages` line 1403, `_menus` 1354, `blogPosts` 1700; MM `posts` in `renderVals`) | Exec (the getters build objects with helpers `cta()`, `brandPage()`; Indus lines 1405–1419) | Nothing beyond running the class | Yes in kind; data location differs |
| Per-page block list | Indus: `pages[key].blocks` typed list (`split`×12, `cards`×8, `rows`×8, `stats`, `hscroll`, `faq`, `form`, `wizard`, `enquiry`…); EC: manifest `pages` (line 77); MM: one file per page | Exec (Indus), High but SGS-only (EC manifest), High (MM, one file each) | Nothing | **No**: three different shapes |
| Base styles | Inline `style=""`; 119 of 489 Indus style attrs contain a hole | High for literal declarations; Exec for holes | Inherited values, UA defaults (a value the draft never states), `currentColor`, `em`/`%` resolution | Yes |
| Hover/focus/active | `style-hover/-focus/-active` (static text, compile-time) | High for the literal ones; **wrong** for the 5 Indus hovers with holes (never painted, §1.4) | JS hovers: `onMouseEnter` handlers, `data-mag`, `data-tilt` (pointer-position maths) | Grammar yes; JS hovers per draft |
| Responsive variants | Ternaries in `renderVals` (Indus `R`, MM `v()`), EC extra breakpoints | Exec: call `renderVals` with `state.w` set to each width; the breakpoints are the ternary thresholds | `vw`/`clamp()` resolution, EC's root-width (ResizeObserver) measurement | Mechanism yes; thresholds differ |
| Conditional / off-screen content (menus, drawer, tabs, form steps, testimonials 2–4, "message sent" state) | `sc-if` branches (79 Indus), state fields, getters (TradeApplication `schema` five steps) | Exec gives every branch's data and every state flag; the template lists every conditional | The branch's layout and computed style need the state actually set (click, or `setState`) | Yes |
| Time-based values (opening hours, "Open now") | Indus `slots` (line 1046), `hoursNow` (1048), `hoursRows` (1059) | Exec: the full schedule is a literal table | The rendered label depends on the clock (Playwright `page.clock` can freeze it) | Indus only |
| Animation definitions | WAAPI keyframes/options in methods (Indus), CSS `@keyframes` + inline `animation:` (EC), mixed (MM) | High for CSS keyframes; WAAPI literals are readable but **targets** are often chosen at run time (Indus `setupReveal` picks grids by `getComputedStyle`, line 1157) and delays are expressions (`80 + i*110`) | Which elements animate, in what order, and the actual delays | **No**: three styles |
| Animation triggers | IO options (Indus line 1181, EC line 2405, MM line 277); `componentDidMount`/`componentDidUpdate` | Readable as literals; meaning (load vs scroll vs route change vs state change) needs reading code | Whether an element is above the fold at load | No |
| Interaction effects (magnetic, tilt, ripple, shine, marquee slow-down) | Hook attrs + document listeners (Indus `bindMotion`) | Hook presence High; behaviour is code (constants such as `*10`, `*8`, 750ms are literals) | Pointer simulation for values | Per draft |
| Form schemas | TradeApplication `get schema()` (line 175: types, options, `req`, `show`, `rx`); EnquiryForm arrays `T`, `F` in `renderVals` | Exec (conditions depend on `state.v`) | Nothing for the schema; layout of each step needs it shown | Yes in kind |
| Menus/nav | Indus `_menus` (labels, hrefs, panel kind, feature cards) | Exec | Panel geometry, open-state styles | Data location differs |
| Links | `href` literals and holes; hash routes (Indus), `.dc.html?id=` links (MM) | High (literal), Exec (holes) | Nothing | Routing differs |
| Images/media | `<image-slot id placeholder>`; Indus swaps in Unsplash URLs at run time by id hash (`applyStock`, lines 1279–1292) | Slot ids High; **final src only after render** (Indus) | Real src, intrinsic sizes | Indus-specific swap |
| Fonts | `<helmet>` Google Fonts link + `font-family` declarations | High | Which face actually loaded | Yes |

---

## 3. Why R-47-4 exists, and whether its reasons apply

### 3.1 Where it came from

- R-47-4 first appears in Spec 47 v0.2 (commit `081e01af7`, 2026-10-03) as "Every written value comes from a computed
  style read in a real browser. Draft source text is never parsed for values." The spec's §0 gives the reasons
  (`.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` §0): layout files were typed by **agents copying selected numbers
  from the draft**; the commonest miss was **a value the draft never states** (a plain heading has no margin and normal
  weight by browser default, an SGS heading has 8px and bold); and **over 95% of styling is inline and some values are
  computed per width at run time**. The commit body counts 107 of 146 Eye Care fix lines as a layout-file change for a
  setting that already existed.
- Commit `b21b04878` (2026-10-10) widened it: draft code may supply **identity and structure** (`data-dc-tpl` stamps,
  import hosts, `sc-for` loop membership) through `window.__dcAnnotatedTemplate`, never values. That came from the
  route-accuracy council (`.claude/reports/2026-10-09-route-accuracy-council/COUNCIL.md`, commit `71bad78e5`), whose
  draft-source analyst concluded "most of what it declares is already readable from the rendered draft", with three new
  things: source-line identity, loop membership, and shared bindings (`{{ secPad }}` on 7 sections) (COUNCIL.md §1–4).

### 3.2 What failed when source was parsed before (the old converter, Spec 31, now deleted)

The old converter (deleted in `8054eb954`, with the orchestrator and recogniser in `be964271b`) parsed draft markup with
BeautifulSoup. Its `.dc.html` failures, from `.claude/archive/decisions.md`:

1. **Holes shipped as content.** On the first real Eye Care page, **93 unresolved `{{ }}` placeholders were visible to a
   visitor**, ticker and static headings were absent, and "42/74 complete" was hollow (D1114, around line 450).
2. **Loop items are templates.** A `sc-for` item in the source parse is `"{{ r.no }} {{ r.title }} {{ r.body }}"`, which can
   never match the rendered words (D1061, around line 2800).
3. **The raw template was scored as the draft.** The run folder had no `support.js`, so parity compared against the
   un-rendered template (176 unfilled holes, 43 `sc-for`, 127 `sc-if`) and reported content 37% / CSS 4% where the
   truth was structure 2% (D1116 line 362, D1114).
4. **JS-computed responsive values are not in CSS.** "A ResizeObserver-driven width → boolean → inline-style-string chain,
   not CSS `@media`" (D1058, line 2923).
5. **Two DOMs could not be joined.** `sc-for`/`sc-if` tags do not survive rendering (0 in the rendered DOM vs 39/87 in
   source), so a source-parse identity could not be attached to a measurement (D1058; D1061 built a fragile structural
   correlator).
6. **A bolted-on JS-content resolver** (render in Playwright, splice back into the source) covered about 1 of 22 repeated
   groups and its own headline claim was false (D1111, D1112 line 525).

Memory lessons record the same: "source markup misstates classes, buttons and colours" and "the hosted draft can differ
from its own source file" (EC source says `<img src=ec-logo.png>`, the hosted page draws an inline SVG)
(`memory/draft-input-traps.md`).

### 3.3 Does that failure apply to reading the template and the logic class now?

| Old failure | Applies to a static regex/HTML parse today? | Applies to an in-browser read (bridge, declared CSSOM, run logic, recorded calls)? |
|---|---|---|
| 1 Holes as content | Yes | No: run `renderVals`, or read the rendered DOM |
| 2 Loop items as templates | Yes | No: `__dcAnnotatedTemplate` + rendered `data-dc-tpl` joins source node to every copy (COUNCIL.md lines 899–904: 508 of 516 rendered tags match the bridge source) |
| 3 Wrong file scored | Yes (the folder is not the hosted bundle; COUNCIL.md says "the bundle is the authority") | No, if read from the served page |
| 4 JS-computed responsive values | Yes | No: `renderVals` at each width gives them exactly |
| 5 Two DOMs | Yes | No: the bridge was built for exactly this ("so it can map a rendered node … back to the source node", rt line 1812) |
| 6 Splice-back resolver | Yes | Not needed |
| "A value the draft never states" (UA defaults, inheritance) | **Yes** | **Yes**: source cannot state what it omits; only computed style has it |
| Source disagreeing with what runs (EC 18px vs 26px; Indus hovers with holes) | **Yes** | Partly: recorded calls and computed style see what runs; a getter read does not |

So **R-47-4's core reason still holds for values that land on elements**: the browser's computed value is the only one that
includes defaults, inheritance and per-width resolution, and source text can be wrong about what paints. Its reasons do
**not** cover intent that computed style destroys (fluid rules, track counts, easing, keyframes, triggers), nor data that is
never on screen at once (other pages, steps, slides, branches). Those are exactly the gaps listed in §4 and in the stage 5
findings (`.claude/plans/2026-10-04-spec47-full-coverage.md` around lines 776–800).

A memory lesson already points this way: "when a measured draft value looks arbitrary (a width, a gap, a count), decode the
template and read the rule that produced it before building a control … A drawn size is an output, the rule is the design"
(`memory/the-draft-bundle-decodes-to-its-real-source.md`; EC thumbnails were `repeat(4,1fr)`, measured "about 82px").

---

## 4. Animation tooling today

### 4.1 What the framework can express (Spec 38, `.claude/specs/38-SGS-MOTION-SYSTEM.md`)

- **Tier V entrance** (`sgsAnimation`, §4.3a): runs as `element.animate()` from
  `plugins/sgs-blocks/assets/js/animation-observer.js`. Effects (`EFFECTS`, between the `sgs-entrance-effects` markers):
  `fade-up/down/left/right` (30px), `fade-in`, `slide-*` (100px), `scale-in` (0.9), `scale-out` (1.1), `rotate-in` (-10deg),
  `flip-in`, `blur-in` (`blur(8px)`, no travel), `bounce-in`, `reveal-up` (`inset(100% 0 0 0)`).
- Settings: duration and easing (tokens or custom, raw easing string allowed), `sgsAnimationDistance` (directional effects
  only), `sgsAnimationDelay`, `sgsAnimationStagger`, `sgsAnimationStaggerChildren`, `sgsAnimationStaggerMax` (default 7),
  `sgsAnimationStart` (`''` scroll or `'load'`), `sgsAnimationTrigger` (% above the bottom edge, default 6), and
  `supports.sgs.animationItems` for repeated items (§4.3a). Site tokens `settings.custom.entrance` (distance, duration,
  easing; EC's 18px / 600ms / `cubic-bezier(0.2,0.7,0.2,1)`).
- **Tier G fx** (`fx`, `fxTrigger`, `fxStart`, `fxEnd`, `fxScrub`, `fxStagger`, `fxDuration`, `fxEase`, magnet
  `fxMagnetAxis/Radius/Strength`…), with a `data-sgs-fx-*` draft grammar (§11.2–11.3). **"No route reads `data-sgs-fx-*`
  from a draft today"** (§4.7, §11.3), and §11.4 says "motion intent cannot be reliably inferred from scraped JS — an
  inferred effect is a guess, and guesses are banned."
- Hover: per-block hover settings (transform parts, durations, easing; e.g. commit `6a92d88f3`), calibrated through
  `scripts/computed-route/lib/calibrate-markers.mjs` (transition duration and easing markers, lines 152–179).

### 4.2 What the route does with draft motion

- `scripts/computed-route/lib/fill-entrance.mjs`: polls each target's own opacity/transform/translate/scale/rotate every
  frame from `addInitScript` for 4.5s at **one width** (1440), and writes `opacity`, `transform`/`translate`,
  `animation-duration`, `animation-delay` through the resolver (`entranceValues`). Times are rounded to 50ms
  (`STEP_MS`, `JITTER_MS`).
- `scripts/computed-route/lib/entrance.mjs`: sets `sgsAnimationStart: 'load'` when the draft shows a block at rest that live
  holds hidden (README line 85).
- Walker: `scripts/parity/lib/entrances.mjs` samples first-screen poses for 1600ms; `collect.mjs` reads CSS `animation-*`
  and `transition` computed values, infinite-animation `loops` via `getAnimations()`, and `collectRunning` reads each
  running animation's duration and easing about 60ms after a state action (`collect.mjs`, lines 255–320).
- `.claude/rules/motion-qa.md` covers **live canary probes** of Tier G effects (morph, motion-path, scrub/scramble), not
  draft-to-SGS mapping.

### 4.3 Mapping the Indus hero ("translateY 28px + blur 8px, 900ms, `cubic-bezier(.16,.84,.32,1)`, stagger 110ms") today

| Part | Captured by `fill-entrance.mjs`? | Expressible in SGS? |
|---|---|---|
| translateY 28px + opacity 0 | Yes (pose) | Yes: `fade-up` + `sgsAnimationDistance` 28 (custom) |
| blur 8px | **No** (`filter` is not in `poseOf`) | **Only as `blur-in`, which has no travel**; no effect combines travel and blur |
| 900ms | Yes, rounded to 50ms | Yes (custom duration) |
| easing `cubic-bezier(.16,.84,.32,1)` | **No** (pose polling cannot see a curve; WAAPI easing is not in computed `animation-timing-function`) | Yes (raw easing string) |
| delay `80 + i*110` | As per-element delays rounded to 50ms (100, 200, 300…), not as a stagger | Yes: `sgsAnimationDelay` 80 + `sgsAnimationStaggerChildren` 110 on the parent |
| trigger: on load **and on every route change** | Load only | Load yes; route change has no meaning on WordPress (separate pages) |
| card reveal `translateY(40px) scale(.96)` | travel yes, scale partly | **No combined effect** (`scale-in` is 0.9 with no travel) |
| image `clip-path: inset(10% … round 24px)` | **No** (clip-path not in pose) | `reveal-up` only (`inset(100% 0 0 0)`), a different shape |
| IO threshold 0.12, rootMargin −4% | No | Yes, roughly: `sgsAnimationTrigger` 4 (threshold is fixed at 1%) |

### 4.4 What is missing

1. **No mapping guide.** Nothing documents "draft motion → SGS setting": which effect to pick for a combination, how a
   stagger expression becomes `StaggerChildren`, what to do with blur + travel, clip-path variants, scale + travel, loops,
   marquee speed and hover slow-down, magnetic/tilt (`fxMagnet*` exists; tilt does not, **INFERRED** from the fx roster in
   §11.3), counters, pinned horizontal scroll, line-draw. Spec 38 is a 1,987-line framework spec, not a mapping table.
2. **Doc drift.** Spec 38 §4.7 and §11.3 say `lib/entrance.mjs` writes "duration, delay and distance"; in the code
   `entrance.mjs` writes only `sgsAnimationStart`, and `fill-entrance.mjs` writes the rest (README lines 77, 85).
3. **Capture gaps** in `fill-entrance.mjs`: no easing, no `filter`, no `clip-path`, one width, 50ms rounding, no notion of
   stagger, no trigger (scroll vs load vs state change), and EC's timer-loop reveal looks the same as a WAAPI one.
4. **Effect gaps** in `EFFECTS`: no combined travel + blur, travel + scale, or inset clip-path with radius. These are real
   framework gaps the drafts use (Indus hero, cards, images).
5. **No marquee rule** in the skeleton writer (plan stage 5 finding, line 787), though the marquee is a literal
   `@keyframes`/`animate()` with a duration in every draft (`mmMarquee 32s linear infinite`; Indus `setMarqueeEl` 38s).

---

## 5. Verdict: a proposed hybrid, for Bean to decide

### 5.1 Recommendation

Keep R-47-4 for **element values** and add three **in-browser, non-text** readings. Each reads what the draft's own runtime
produces, so the old converter's failures (§3.2) do not come back.

| # | Read | How | Fixes | Keeps measuring |
|---|---|---|---|---|
| A | **Declared values** | CDP `matched.inlineStyle` for **all** properties (today only 8, `scripts/parity/lib/devtools.mjs::DECLARED_PROPS`), plus the runtime's `scpN` pseudo sheet | Fluid rules (`clamp`, `vw`, `min()`), `repeat(6, minmax(0,1fr))` track counts, "declared nothing" vs default (council pattern 1), hover rules | Computed value stays the written value; declared is the **intent check** that picks a fluid/track setting over a px one |
| B | **Recorded motion** | `addInitScript` wraps `Element.prototype.animate` and `IntersectionObserver` and logs target (`data-dc-tpl` key), keyframes, options (duration, delay, easing, fill, iterations) and IO options, plus `getAnimations()` timing for CSS animations | Exact easing, blur, clip-path, scale, stagger (delays per index), trigger (inside an IO callback, at load, or after a state action), marquee speed, loops | Pose polling stays as the fallback for timer-loop reveals (EC `show()`), and as the check that a recorded call actually moved something |
| C | **Logic as data** | In the page, call `__dcRegistry[root].Logic`'s getters (`pages`, `_menus`, `schema`, `slots`) and `renderVals()` with `state.w` at 375/768/1440 and each state flag | Per-page block lists and copy for every route (Indus: 23 hash routes plus `post-*` articles, per its README), all form steps, all testimonials, opening hours without the clock, every breakpoint threshold (so the 16px sweep becomes a check), every `sc-if` state to walk | Each state found is then **rendered and measured**; the logic only says what exists and where to look |

What not to do: no regex or HTML parse of the `.dc.html` file for values (§3.2 failures 1–6); no reliance on the EC manifest
or `behaviouralRules` (SGS-only, and wrong on 18px vs 26px); no reading of hover colours from `style-hover` text (holes
never paint).

### 5.2 What each part buys against Bean's list

- **Off-screen and time-based content**: C lists it; render + measure each listed state; `page.clock` freezes hours.
- **Heavy Playwright reliance**: unchanged in kind (A, B and C all run in the browser), lighter in volume: C replaces the
  16px breakpoint sweep and the fluid curve-fit with direct reads (**INFERRED** saving; not timed).
- **Walker gaps**: C gives the full state list to diff against each config's `states` (COUNCIL.md §2 made the same point).
- **Better per-page skeleton**: C's typed block list (`split`, `cards`, `stats`, `faq`, `form`…) and B's marquee/loop record
  are strong hints for `skeleton.mjs`; still a hint, since the list shape differs per designer (§1.10).
- **Scanner false positives** (**INFERRED** to mean the walker/sweep's open rows): A's declared-nothing test and B's
  "this element animates" record remove phase and default-paint noise; loop membership from the bridge is already allowed.
- **Agents seeing exact code for a framework gap**: give the agent the bridge's source node (`__dcTemplateSource`, rt line
  1819) for the row's `data-dc-tpl`, plus B's recorded call. This is reading for diagnosis, not for writing, so it fits
  R-47-4 as written.

### 5.3 Risks

1. **R-47-4 change.** A and B read values that are not "computed style". They are read in a real browser from what ran, so
   the rule's intent holds, but the wording needs amending (as the council asked for identity, COUNCIL.md line 994).
2. **Designer variance.** Hook names, animation style and routing differ per draft (§1.7, §1.10). B is generic (it records
   whatever calls run); C's getter names are not (Indus `pages`, MM one file per page, EC manifest). C should enumerate
   the logic's own getters and `renderVals` keys, never expect names.
3. **Running logic out of context.** Getters may touch `window`, `document`, `localStorage` (TradeApplication
   `componentDidMount`, line 159) or throw (Indus v2 home "throws a React error at runtime", plan line 769). Run only in the
   draft's own page, wrapped in try/catch, and treat a throw as "no data", not a failure.
4. **Recorded is not painted.** A WAAPI call can target an element that is hidden, replaced on re-render, or overridden;
   the EC 18px/26px case shows code paths disagree. Every recorded value is confirmed by a pose sample before it is
   written (B's own fallback).
5. **Two runtime builds today, more tomorrow.** The bridge names (`__dcAnnotatedTemplate`, `__dcRegistry`) are internal to
   Claude Design's runtime. Pin a check that fails loudly when they vanish, as D1058 did for `mobilePreview`.
6. **Framework gaps stay gaps.** Exact capture of blur + travel or clip-path radius still lands as UNMAPPED until
   `EFFECTS` grows; B makes the gap visible and exact, it does not close it.

### 5.4 Smallest first step (about 10 minutes, read-only)

Run one Playwright probe on the served Indus draft that installs the `Element.prototype.animate` and `IntersectionObserver`
wrappers, loads the home page, scrolls once, and prints the recorded calls keyed by `data-dc-tpl`. If it returns the hero's
900ms / `cubic-bezier(.16,.84,.32,1)` / `blur(8px)` / 80 + 110i delays, B is proven; then try C by calling
`__dcRegistry` from the same page.

---

## Sources read

- Runtime: `support.js` (Indus folder) functions `encodeCase`, `compileAttr`, `collectProps`, `compileTemplate`, `walk`,
  `walkFor`, `walkIf`, `walkComponent`, `evalDcLogic`, `createPseudoSheet`, `importantify`, `ensureFetched`,
  `annotatedTemplate`, the `window` API block; diff against `sites/mamas-munches-redesign/support.js`.
- Drafts: Indus (lines 1–40, 600–625, 957–1006, 1046–1063, 1147–1292, 1329–1365, 1403–1425, 1931–1990); `EnquiryForm.dc.html`
  (whole, 129 lines); `TradeApplication.dc.html` (lines 155–200); EC (lines 20–30, 37–75, 405–445, 717, 905–1540 greps,
  2231–2420); MM `Home.dc.html` (lines 1–40, 257–280), `SiteFooter.dc.html` (lines 97–118); Indus `README.md`.
- History: `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` §0, §1, §3.3, §3.4, §6, §7; commits `081e01af7`, `b21b04878`,
  `71bad78e5`, `8054eb954`, `be964271b`; `.claude/reports/2026-10-09-route-accuracy-council/COUNCIL.md` (§1–5, lines
  487–494, 633–656, 751–754, 899–994); `.claude/archive/decisions.md` D1057, D1058, D1061, D1111–D1116; memory
  `draft-input-traps.md`, `the-draft-bundle-decodes-to-its-real-source.md`, `cloning-pipeline-and-schema-default-traps.md`.
- Motion: `.claude/specs/38-SGS-MOTION-SYSTEM.md` §0, §4.3a, §4.7, §11; `plugins/sgs-blocks/assets/js/animation-observer.js`
  `EFFECTS`; `scripts/computed-route/lib/fill-entrance.mjs`, `lib/entrance.mjs` (README entries), `scripts/parity/lib/entrances.mjs`,
  `collect.mjs` (lines 250–320), `devtools.mjs::DECLARED_PROPS`; `.claude/rules/motion-qa.md`;
  `.claude/plans/2026-10-04-spec47-full-coverage.md` stage 5 (lines 768–805).
