# R1 ledger: the Indus Foods handoff folder

Slice: `C:\Users\Bean\Projects\small-giants-wp\.claude\Indus-Foods-Claude-Design-Files\design_handoff_indus_foods_website\` (15 files, read-only).
Reviewer: R1. Date: 2026-10-10. Everything below cites a file plus a quote or a command. Anything I could not check is marked UNVERIFIED.

Scratch evidence (all in the same scratchpad `council\` folder): `r1-pages.js` (page roster extractor), `r1-probe.mjs`, `r1-bisect.mjs`, `r1-bisect2.mjs`, `r1-timing.mjs` (crash reproduction), `r1-shots2.mjs` plus `r1-home-1440.png` and `r1-about-1440.png` (successful render screenshots).

## 0. Headline findings

1. **The handoff adds exactly one new file: `README.md`.** All 14 other files are byte-identical to files at the export root (sha256 table in section 1). The root `readme.md` is a different document: the design-system skill readme, 3,025 bytes. The handoff README is 12,782 bytes.
2. **The current theme-extractor README reader gets nothing from this README.** `declared_sources.read_readme_tokens()` on the handoff folder returned `"colours": [], "fonts": [], "layout": {}` (command in section 3.3). The README states its colours as backticked hexes in bullets, its fonts without `**bold**` families, and its token groups under bare lines ("Colours", "Typography") rather than markdown headings. The reader's grammar only accepts tables, `Label: **Family**` bullets and `#` headings.
3. **The React `removeChild` crash is in the handoff copy too.** The handoff copy is byte-identical to the root v2 file (`dc3af6250eaa8510…`). I reproduced the crash with headless Chromium served through `lib/draft.mjs::serveDraft`. It is intermittent: 13 of 15 loads with `indus-logo.js` loading normally crashed (tally in section 5.1), and each crash left `section` count 0, `image-slot` count 0 and only 7 `data-dc-tpl` nodes (355 on a good render). Removing the `<script src="./indus-logo.js">` tag, or stubbing `IndusLogo.prototype.load`, gave 0 crashes in 7 loads. The evidence points to `indus-logo.js` writing `this.innerHTML` while React is reconciling, but the exact mechanism is UNVERIFIED. `skeleton-inventory.mjs` waits a fixed 2.5s (`waitForTimeout( 2500 )`) and never checks for the runtime's `[dc-runtime] render error`, so a crashed load would silently inventory 7 nodes.
4. **The README contradicts the rendered footer.** The README says: "Footer: link groups About, Sectors, Trade, Company … accreditation logo slots (BRC, Halal, Today's Group, FWD)". The v2 logic computes `footerGroups` and `accreds` in `renderVals()`, but the template never iterates them. The rendered footer has a call, email and opening-hours strip, a brand blurb, "Quick links" (`footerQuick`) and a "Visit us" map. I confirmed this from the template (`<sc-for list="{{ footerQuick }}"`; no `footerGroups` or `accreds` in the template) and from the live render's `footer.innerText`.
5. **The v2 file is the real answer key, not the README.** It holds 29 hash routes in the `pages` getter (about 7,700 words of copy), a typed block list per page, the full mega-menu and drawer data, 4 testimonials, opening hours as minute slots, a 19-photo Unsplash map, and every motion timing. The TradeApplication form schema has 5 steps and about 35 fields, with conditional `show`/`req` and regex validation. No other export file holds the form schemas or the page data, apart from the identical root copies.

## 1. File inventory and provenance

`sha256` = first 16 hex of `sha256sum`, compared with the same-named file at the export root.

| Path (relative to the handoff folder) | Bytes | sha256 (handoff) | Root counterpart | Identical? |
|---|---|---|---|---|
| `README.md` | 12,782 | 209402a9fb015a9d | `readme.md` 3406dcd50edd877a | **Different document** (root = design-system skill readme, 3,025 B) |
| `Indus Foods Website v2.dc.html` | 223,543 | dc3af6250eaa8510 | dc3af6250eaa8510 | Identical |
| `TradeApplication.dc.html` | 34,189 | 55bf8a4178a8bb5b | 55bf8a4178a8bb5b | Identical |
| `EnquiryForm.dc.html` | 13,099 | d80b33c1580a89b6 | d80b33c1580a89b6 | Identical |
| `support.js` | 66,404 | c60c49083997f51a | c60c49083997f51a | Identical |
| `image-slot.js` | 64,449 | d797f41b7d66c445 | d797f41b7d66c445 | Identical |
| `indus-logo.js` | 4,373 | 266c7e488d8e161e | 266c7e488d8e161e | Identical |
| `assets/about-hero-desktop.svg` | 21,572 | fa7ad864f3a488fc | same | Identical |
| `assets/about-hero-tablet.svg` | 21,572 | 536cef72b4c2b3be | same | Identical |
| `assets/about-hero-mobile.svg` | 21,572 | 7bd1a820160ff269 | same | Identical |
| `assets/logo-horizontal.svg` | 52,648 | 657e941c14adf091 | same | Identical |
| `assets/logo-horizontal-anim.svg` | 52,648 | 657e941c14adf091 | same | Identical, **and identical to `logo-horizontal.svg`** |
| `assets/logo-square.svg` | 29,580 | bfd601cfa34eb53d | same | Identical |
| `assets/logo-square-anim.svg` | 29,580 | bfd601cfa34eb53d | same | Identical, **and identical to `logo-square.svg`** |
| `assets/whatsapp-ink.svg` | 8,309 | 1d98c1896e1bca40 | same | Identical |

These export-root items are absent from the handoff folder (listed by `ls -la`; whether they matter is the other reviewers' slices):

- `Indus Foods Website.dc.html` (v1)
- `Indus Foods Mega Menu.dc.html`
- `Mega Menu.dc.html`
- `_feature.dc.html`
- `styles.css`
- `tokens/`, `guidelines/`, `components/`, `screenshots/`, `uploads/`
- `SKILL.md`
- `.thumbnail`

No `.image-slots.state.json` sidecar exists anywhere in the export (`find . -name "*.state.json"` found nothing). Every image the designer dropped by hand is therefore lost, and slots show either Unsplash fallbacks or empty placeholders.

Provenance evidence common to all of them: the files sit in Claude Design's "Handoff to Claude Code" folder (`design_handoff_<project>/`). Every SVG carries a C2PA manifest whose decoded claim reads `com.anthropic.claude.provided` / "Claude provided this file at the request of a user" / `claim_generator_info: Anthropic Files 1.0.0` (decoded from `whatsapp-ink.svg`; all eight SVGs open with `<metadata><c2pa:manifest>`). `support.js` line 1 reads `// GENERATED from dc-runtime/src/*.ts — do not edit.` `image-slot.js` line 2 reads `Copied omelette starter`.

## 2. Per-file ledger

### 2.1 `README.md`

| Field | Value |
|---|---|
| Size | 12,782 B, 100 lines |
| Produced by + evidence | The Claude Design "Handoff to Claude Code" skill. Its title is `# Handoff: Indus Foods Website Redesign`, and it carries the skill's boilerplate sections (`## About the Design Files`: "design references created in HTML … not production code to copy directly", and `## Fidelity`). Unique to the handoff (no same-content file at the root). |
| Contents | Overview, file-format notes, fidelity, breakpoints, responsive tokens, global layout (top bar, progress bar, header, mega menus, drawer, footer, WhatsApp), the 29-route list, home section specs, the inner-page block vocabulary, animations with timings, the state model, design tokens, assets, open items and a file list. Full catalogue in section 3. |
| Unique information | (a) **Designer intent and rejected options**: "an earlier lighter blue was rejected"; "Confirm the Sectors panel gradient". (b) **Open items**: social URLs are `#/`, forms need a backend, food cut-out PNGs are pending, the scatter layer is "currently disabled, `density = 'Off'`". (c) **Fidelity contract**: "Photos are Unsplash placeholders … brand logos are empty `image-slot` placeholders awaiting real artwork". (d) **Named breakpoints and responsive tokens in one place** (in v2 they are scattered JS ternaries). (e) **The colour-role naming** ("Brand blue", "Ink", "slate", "body grey"): v2 has only raw hexes. Everything else in the README is a summary of v2 and is checkable against it. |
| Consumers now | `theme-extractor/declared_sources.py::read_readme_tokens` finds it (it accepts any `readme.md` case-insensitively) **but extracts nothing** (section 3.3). No computed-route tool reads it: `grep -rn -i "readme" scripts/computed-route/*.mjs scripts/computed-route/lib/*.mjs scripts/parity/*.mjs` hits only `lint.mjs`, which checks the route folder's own README. |
| Consumers possible | Theme extractor: palette roles, fonts, radius scale, shadows, spacing scale. surfaces.json: route list, global parts, states. Walker: motion expectations, hover end states, `states` to walk. Skeleton writer: section order per page. Site Info: phone, email, address, hours, WhatsApp. Media: the photo URL pattern and placeholder ids. Divergence ledger: the open items. Details in section 4. |
| Verdict | **Essential**, but only as an index and intent layer. It is not machine-read today and is wrong about the footer, so it must be checked against v2, never trusted alone. |

### 2.2 `Indus Foods Website v2.dc.html`

| Field | Value |
|---|---|
| Size | 223,543 B, 2,143 lines |
| Produced by + evidence | Claude Design's Design Component format. It contains `<x-dc>` (template, lines 9 to 956) plus `<script type="text/x-dc" data-dc-script>` with `class Component extends DCLogic` (lines 957 to 2141). The page `<head>` loads `./support.js`, and `<helmet>` loads Google Fonts, `./image-slot.js` and `./indus-logo.js`. It is byte-identical to the root copy. |
| Contents | **Template**: top bar, sticky header, mega-menu panels (`isSimple`, `isSectorsCards`, `isBrands`), mobile drawer, home sections (`<sc-if value="{{ isHome }}">`), a generic inner-page hero, and a block loop (`<sc-for list="{{ blocks }}">`). The block loop has 18 typed branches: stats, gradients, split, rows, hscroll (pinned and unpinned), wizard (`<dc-import name="TradeApplication">`), enquiry (`<dc-import name="EnquiryForm">`), timeline, cards, logos, quotes, cta, contact (with a Google Maps iframe), form, faq, posts, article, prose. Then the footer and the WhatsApp pill. Hover states are declared as `style-hover="…"` attributes, which `support.js::collectProps` turns into pseudo-class rules. **Logic**: state model, resize, hash routing, scroll and motion handlers, opening-hours maths, `applyStock()` (Unsplash photo assignment), `setHeroSvgEl` (About hero animation), `sectors`, `_menus`, `brandLogos`, the `pages` getter (all inner-page data), `homeVals` (home data) and `renderVals()` (responsive tokens `R` and per-block flags). |
| Unique information | It is the only source for the following. (1) **The 29-route page roster with its typed block list.** Extracted with `node r1-pages.js`: `about: stats,hscroll,cards:quad,cta`, `apply: wizard`, `contact: contact,enquiry,formOld`, `post-post-1: article,posts,cta`, and so on. `formOld` is dead: `page.blocks.filter((b) => b.type !== 'formOld')`. (2) **All copy**, about 7,700 words in `pages` plus home and menu copy. (3) **The menu data**: 6 top items, the About and Trade link lists with descriptions, 4 sector cards with gradients, 10 brand entries (5 of them "Partner brand" placeholders). (4) **Home data**: 4 testimonials (anonymised: "Restaurant owner / Foodservice customer"), 4 "why" items, 4 milestones, 3 steps, trust chips. (5) **Opening hours** as minute slots: `5: [[570, 720], [870, 1020]]` is Friday 9:30 to 12:00 and 14:30 to 17:00. (6) **The image manifest**: `applyStock()` holds 19 Unsplash ids and an explicit id map for 14 slots (`'home-hero-banner': P[0]` …). Every other slot gets `P[hash(id) % 19]`. Credits are the generic `'Photo on Unsplash'`, with no photographer names. (7) **Responsive tokens beyond the README's**: `heroRatio: d ? '4 / 4.6' : t ? '16 / 10' : '4 / 3.4'`, `sectorCols`, `whyCols`, `footMainCols`, `hsCardW: 'min(900px, 72vw)'`, `mapH`, and others. (8) **Hex colours used but absent from the README**: 29, for example `#EAF4F7`, `#C9D4DE`, `#E8A13A` (the "Closed" dot) and `#25D366` (WhatsApp). (9) **Company blurb in the footer**: "Part of the Unitas Wholesale Group, with an annual turnover of £8bn". (10) **Credits line**: "Website by Ibraheem Mustafa". |
| Consumers now | `lib/draft.mjs::serveDraft` serves it. Because the filename is not `index.html` it needs `{ index: 'Indus Foods Website v2.dc.html' }` (the doc comment names this case: "a handoff whose page is \"Home.dc.html\""). `lib/skeleton-inventory.mjs` reads the stamped DOM plus `window.__dcAnnotatedTemplate(window.__dcRootName())`; on a good render the root is `"Indus Foods Website v2"` with 125,400 chars of annotated template (probe output). Fill and the walker read its computed styles in the browser. Theme extractor: UNVERIFIED for this draft (it reads usage when no README facts land). |
| Consumers possible | surfaces.json: one surface per route, `draftUrl` = served URL + `#/<route>`. Site Info: phone, email, address, hours and company blurb from `pages.contact` and `hoursRows()`. Form plugin: the `form` block `fields` (Careers, Catalogue). Walker: state lists (`faqOpen`, `blogCat`, `tIdx`, mega-menu `active` 1/2/3/4, `mobileOpen` with `acc`). Skeleton writer: the `pages` block types as an answer key for section boundaries and repeated items. Blog: 6 `post-*` articles as WordPress posts, not pages. |
| Verdict | **Essential.** It is the ground truth for structure, copy, data and motion. It is also the crash site (section 5.1). |

### 2.3 `TradeApplication.dc.html`

| Field | Value |
|---|---|
| Size | 34,189 B, 317 lines |
| Produced by + evidence | Design Component, child of v2: `<dc-import name="TradeApplication" hint-size="100%,900px">` in v2, resolved by `support.js` as `COMPONENT_DIR + "/" + encodeURIComponent(name) + ".dc.html"`. Its own `data-props` sets `$preview` to 1200×1000. Identical to root. |
| Contents | A 5-step wizard (Business, Premises, Contact, Ordering, Review) with a step rail, a progress bar, "Progress saved" (localStorage key `indus-trade-application`), a "Have these ready" checklist aside, a "Need a hand?" phone card, a review screen with per-section Edit, and a done screen with reference `'IND-' + Math.floor(100000 + Math.random() * 900000)` and 3 next steps. |
| Unique information | **The full field schema** (`get schema()`). About 35 fields across the types text, email, tel, select, chips (single and multi), check, heading, textarea and file. It includes conditional logic (`show: ltd`, `req: credit`, `show: diffDel`) and regexes: UK postcode `/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i`, Companies House `/^[A-Z0-9]{8}$/i`, phone `/^[+\d\s()-]{10,}$/`. It holds the options lists (business type, structure, time trading, FHRS rating, delivery window, ranges, brands, weekly spend, frequency, payment, credit limit), the error messages ("This field is required", "Please choose at least one option", "Please confirm to continue") and the error colour `#C8412B`. **None of this is in the README**, which says only "Field types: text, email, tel, select, file, textarea; `req` marks required fields". |
| Consumers now | Rendered inside v2 on `#/apply`, so skeleton, Fill and walker see it only as DOM. No tool reads the schema. |
| Consumers possible | Form seeding: a direct source for an SGS form definition (fields, required, conditions, validation, options) instead of re-deriving it from DOM. Walker states: each step, the error state (submit empty), credit-account branch on/off, the review step and the done step. |
| Verdict | **Essential** for the Apply page. The only source of the form logic. |

### 2.4 `EnquiryForm.dc.html`

| Field | Value |
|---|---|
| Size | 13,099 B, 129 lines |
| Produced by + evidence | Design Component, child of v2 (`<dc-import name="EnquiryForm" hint-size="100%,760px">`), `$preview` 1100×900. Identical to root. |
| Contents | Section 01 "What can we help with?" has 6 multi-select topic tiles with `aria-pressed`. Section 02 "Your details" has floating-label inputs (name, business, email, phone) and a message with an 800-character counter. Then "Reply by" (Email, Phone, WhatsApp), a send button showing "Sending…" for 900ms, and a "Message sent" state with a personalised sentence and "Send another message". |
| Unique information | Topic list and descriptions. Validation messages ("Please choose at least one topic", "Enter a valid email address", "Tell us a little more (at least 10 characters)"). Floating-label geometry (`lTop: up ? '9px' : '20px', lSize: up ? '13px' : '17px'`). Focus ring `style-focus="…box-shadow:0 0 0 4px rgba(46,173,226,.18)"`. The done-state sentence template. The README does not describe this form at all; it lumps "Contact" under generic forms. |
| Consumers now | Rendered inside v2 on `#/contact`. No tool reads its schema. |
| Consumers possible | Form seeding for Contact. Walker states: empty-submit errors, topic selected, focused field, sent. |
| Verdict | **Essential** for the Contact page. |

### 2.5 `support.js`

| Field | Value |
|---|---|
| Size | 66,404 B, 1,841 lines (read by section: parse, boot, compile, cdn, external, helmet, runtime, index) |
| Produced by + evidence | Claude Design's `dc-runtime`. Line 1: `// GENERATED from dc-runtime/src/*.ts — do not edit.` Identical to root (and presumably the same runtime as other Claude Design drafts: UNVERIFIED across drafts). |
| Contents | Parses `<x-dc>`, compiles the template to React elements, stamps `data-dc-tpl` (`node.setAttribute("data-dc-tpl", String(tplN++))`), evaluates the logic class with `new Function(…)`, and turns `style-hover`/`style-focus` attributes into pseudo-class rules. It resolves `dc-import` by fetching `./<Name>.dc.html` and exposes the editor bridges (`__dcAnnotatedTemplate`, `__dcTemplateSource`, `__dcRootName`, `__dcRegistry`, `__dcSetProps`). **It loads React from the CDN**: `REACT_URL = "https://unpkg.com/react@18.3.1/umd/react.production.min.js"` and `REACT_DOM_URL` (with SRI), and Babel `@babel/standalone@7.29.0` only for JSX `x-import`s. `cdnScriptFor()` prefers `window.__resources[url]` when the host maps it. |
| Unique information | None about the design. Its value is the bridge contract the skeleton writer depends on, and the fact that template node *n* in `__dcAnnotatedTemplate` matches rendered `[data-dc-tpl="n"]`. |
| Consumers now | Required at runtime by every `.dc.html`. `skeleton-inventory.mjs` calls `window.__dcAnnotatedTemplate( name )`. |
| Consumers possible | A pre-flight check: after load, assert `window.__dcRootName()` resolves and the `[data-dc-tpl]` count is plausible, and fail fast on `[dc-runtime] render error`. A local React copy mapped through `window.__resources` would remove the unpkg dependency. |
| Verdict | **Essential** (runtime). It carries no design information. |

### 2.6 `image-slot.js`

| Field | Value |
|---|---|
| Size | 64,449 B, 1,208 lines (read the usage block and the store logic, lines 1 to 240, and grepped the rest) |
| Produced by + evidence | The Claude Design "omelette starter" component: `// Copied omelette starter. Re-running copy_starter_component …`. Identical to root. |
| Contents | The `<image-slot>` custom element. It handles `id`, `shape`, `radius`, `mask`, `fit`, `placeholder`, `src`, `credit` and `credit-href`. It persists user drops to the `.image-slots.state.json` sidecar through `window.omelette.writeFile` ("Outside the omelette runtime the slot is read-only"), and it enforces Unsplash credit (an uncredited Unsplash `src` renders an error tile). |
| Unique information | Behaviour only. The slot ids and placeholder captions live in v2; the dropped images would live in the missing sidecar. |
| Consumers now | Runtime only. The served draft requests `/.image-slots.state.json`, which 404s (probe: `requestFailed: ".image-slots.state.json net::ERR_ABORTED"`). |
| Consumers possible | Media step: the slot `id`, `shape`, `fit` and `placeholder` attributes form an image manifest. Example: `placeholder="Hero banner: spices in bowls on a wooden table"` is a description of the image wanted, usable as alt-text seed or stock-search query. |
| Verdict | **Useful** (runtime, and the manifest shape). It would be essential only if a sidecar had shipped. |

### 2.7 `indus-logo.js`

| Field | Value |
|---|---|
| Size | 4,373 B, 62 lines (read in full) |
| Produced by + evidence | Project-authored custom element (`customElements.define('indus-logo', IndusLogo)`). Identical to root. |
| Contents | It fetches `./assets/logo-{horizontal,square}-anim.svg`, strips `<?xml>` and `<metadata>`, prefixes every id, then sets `this.innerHTML = t`. It animates by element id with the Web Animations API. Sun rays spin 60s infinite. On entering view: sun `scale 0→1` 1200ms (delay 150, spring `cubic-bezier(.34,1.56,.64,1)`); mountain rises from 120px over 1000ms; snow fades in 700ms (delay 650); road `clip-path inset(100% 0 0 0)→0` 900ms (delay 500); logo letters rise from 60px over 650ms (delay 420 + i×45). On hover it replays: rays speed up ×14 for 900ms, sun 1→1.12→1, mountain lifts 24px, letters jump 40px with 28ms stagger. It skips all of this under `prefers-reduced-motion`. |
| Unique information | **All logo motion.** The README never mentions the logo animation or its hover replay. The `*-anim.svg` files are identical to the static ones, so the animation exists only here. |
| Consumers now | Runtime only. **It is the strongest suspect in the `removeChild` crash** (section 5.1). |
| Consumers possible | Walker motion expectations for the header and footer logos (load and hover). A spec for an SGS animated-logo capability (Spec 38 motion tier). |
| Verdict | **Useful.** It holds logo motion nothing else holds, and it is risky. |

### 2.8 `assets/about-hero-{desktop,tablet,mobile}.svg`

| Field | Value |
|---|---|
| Size | 21,572 B each, with different content (different hashes) |
| Produced by + evidence | Inkscape-authored artwork. Ids like `meshgradient448` and `path5-0`, and `xml:space="preserve"`. Copied by Claude Design from `uploads/Indus_Foods_Hero_Background_Animation_{Desktop,Tablet,Mobile}.svg` (root `uploads/` listing; that the content matches is UNVERIFIED and outside this slice). C2PA-signed by Anthropic. |
| Contents | Banners with viewBoxes `0 0 2100 1000`, `0 0 1400 1000` and `0 0 1000 1000`, all `preserveAspectRatio="xMidYMax slice"`. Named groups: `background`, `sunrays_spin`, `sunrays_expand`, `Mountain Block`, `snow`, `darkpath`, `path5`, `goldpath_glow`, `goldpath_highlight`. **They contain no animation themselves** (`grep -c '<animate\|@keyframes\|<style'` gives 0). v2's `setHeroSvgEl` animates them by id and picks the file by breakpoint: `animSrc: 'assets/about-hero-' + (d ? 'desktop' : t ? 'tablet' : 'mobile') + '.svg'`. Three fills use Inkscape `meshgradient`, which browsers do not support; the render shows flat colour (`r1-about-1440.png`: flat blue mountain). |
| Unique information | The artwork itself. The id names are the contract the animation needs. |
| Consumers now | v2 at runtime (fetched and inlined). No pipeline tool. |
| Consumers possible | Media upload as the About hero background, one per breakpoint. A motion spec (README timings plus these ids). The walker's About-hero motion checks. |
| Verdict | **Essential** for the About hero. Mesh gradients are a fidelity caveat. |

### 2.9 `assets/logo-horizontal.svg`, `logo-horizontal-anim.svg`, `logo-square.svg`, `logo-square-anim.svg`

| Field | Value |
|---|---|
| Size | 52,648 B (horizontal ×2) and 29,580 B (square ×2) |
| Produced by + evidence | Inkscape artwork, copied from `uploads/IndusFoods_Animated_Logo_*.svg` (match UNVERIFIED). C2PA-signed. **Each `-anim` file is byte-identical to its static twin** (same sha256). |
| Contents | Horizontal viewBox `0 0 3741.5916 847.97405`; square `0 0 1998.5702 1302.7118` (v2 uses `aspect-ratio:1998 / 1302`). Ids `sunrays_spin`, `sunrays_expand`, `Mountain Block`, `snow`, `darkpath`, `logo_text`. |
| Unique information | The brand logo, in two lockups. |
| Consumers now | `indus-logo.js` (fetches only the `-anim` names). |
| Consumers possible | Site Info / site logo upload (horizontal lockup for the header, square for the footer). Brand-logo identity for the skeleton's logo rule ("Wordmarks are logos" memory). |
| Verdict | Static pair: **essential**. `-anim` pair: **redundant** (duplicate bytes; the README's "animated variants" wording is misleading). |

### 2.10 `assets/whatsapp-ink.svg`

| Field | Value |
|---|---|
| Size | 8,309 B (most of it the C2PA manifest) |
| Produced by + evidence | A 24×24 glyph, `fill="#0B2B17"`, C2PA-signed. Identical to root. |
| Contents | The WhatsApp glyph used by the floating pill (`<img src="assets/whatsapp-ink.svg" … width="22">`). |
| Unique information | None of design weight. It is the standard brand glyph. |
| Consumers now | v2 at runtime. |
| Consumers possible | Icon for the WhatsApp floating button, if SGS's icon set lacks one. |
| Verdict | **Useful** (minor). |

## 3. README fact catalogue

### 3.1 Section outline

`# Handoff: Indus Foods Website Redesign`, with these subsections:

- Overview
- About the Design Files
- Fidelity
- Breakpoints
- Global layout (every page): 7 numbered items, item 4 with 5 sub-bullets
- Screens / Views: an intro routes paragraph, then `### Home` (8 bullets) and `### Inner pages` (block vocabulary plus 6 bullets)
- Animations & Behaviour (7 bullets)
- State (1 paragraph)
- Design Tokens (bare-line subgroups "Colours" and "Typography", then "Radius:", "Shadows:" and "Spacing:" lines; **not markdown headings, not bullets for the last three**)
- Assets (6 bullets)
- Open items (3 bullets)
- Files (4 bullets)

### 3.2 Fact kinds

Each row gives an example quote, the format it is written in, how machine-readable it is, and whether it matches v2.

| Fact kind | Example quote | Format | Machine-readable? | Checked against v2 |
|---|---|---|---|---|
| Colour tokens with role names | "Brand blue `#0A7EA8` (hover `#075E80`, text-on-gold alt `#0A6E93`); light blue `#2EADE2`" | Bullets with backticked hex and inline role words | Medium: hexes regex out easily; the role is the bullet's leading phrase; several hexes share one bullet | Yes. All README hexes appear in v2, which uses 29 more |
| Gradients | "Brand gradient: … (`120deg,#E7D768 0%,#2EADE2 55%,#0A7EA8 100%`)"; hero "`135deg #EBDD78, #E3D35F, #D8CA50`" | Prose and bullets | Medium (CSS-like fragments) | Yes |
| Social and brand colours | "LinkedIn `#0A66C2`, Facebook `#1877F2`, Google `#EA4335`" | Bullet | Medium | Yes. Instagram is a gradient in v2; the README gives no value |
| Fonts | "Headings: Montserrat 500/600/700/800. Body: Source Sans 3 (400-700), base 19px/1.55. Mono labels: Geist Mono 12px, 0.14em tracking, uppercase." | Bare sentence lines under a non-heading "Typography" | Low for the current reader (no `**Family**`); easy for a tolerant regex | Yes (the Google Fonts URL in `<helmet>` matches) |
| Type scale | "H2: clamp(28px,3.4vw,40px)/1.15, -0.01em. Card titles 22px/700. Eyebrow: Montserrat 13px/700, 0.14em tracking"; H1 "clamp(36px,5vw,62px), line-height 1.08" | Prose | Medium (CSS values verbatim) | Spot-checked yes |
| Radius scale | "Radius: 3 (tags), 9-12 (tiles/inputs), 16-22 (cards), 999 (pills/buttons)." | Plain line, not a bullet | Low today (the reader needs a bullet or table) | Yes (roughly; v2 also uses 11, 18, 20 and 26) |
| Shadows | "button `0 8px 18px -8px rgba(0,0,0,.45)`; card `0 20px 34px -20px rgba(44,62,80,.55)`; panel `0 30px 80px -30px rgba(20,25,35,.28)`" | Plain line | Medium | Yes |
| Spacing scale | "Spacing: gaps 8/10/14/18/22/28/40/64px" | Plain line | Medium | Yes |
| Breakpoints | "Mobile: width < 768 / Tablet: 768 to 1023 / Desktop: >= 1024 (header CTA pill appears at >= 1260; nav padding 10px below 1200, 15px above)" | Bullets | High | Yes: `bp = w < 768 ? 'm' : w < 1024 ? 't' : 'd'`, `showHeaderCta: w >= 1260`, `navPad: w < 1200 ? '10px' : '15px'` |
| Responsive tokens | "page gutter 20 / 32 / 40px; section padding 64 / 88 / 108px; tight section padding 40 / 52 / 64px; header height 72 / 72 / 84px. Max content widths: header and top bar 1320px; sections 1040 to 1120px." | Prose with slash triples | High (triples line up with the m/t/d order) | Yes (`R.px`, `R.secPad`, `R.secPadTight`, `R.headH`) |
| Global parts structure | Top bar, progress bar, sticky header, mega menu (4 panels), drawer, footer, WhatsApp | Numbered list with nested bullets | Medium (structured, but prose inside) | Yes, **except the footer** (section 0, finding 4) |
| Per-screen structure (home) | "**Hero** … **Our Brands** … **Our UK Wide Food Services** … **Why Choose Indus Foods?** … **Heritage** … **Our Partners Love Us!** … **How to open a trade account** … Final CTA band" | Bullets with bold section names, in order | Medium-high (section order and names) | Yes (the order matches the template's home block) |
| Per-screen structure (inner) | "Shared hero (eyebrow, H1, intro, optional CTAs, optional image, breadcrumb label) followed by a list of typed blocks: `stats`, `hscroll` …" | Prose plus code-ticked vocabulary | Medium | **Incomplete**: omits `wizard`, `enquiry` and `timeline` (template branches `b.isWizard`, `b.isEnquiry`, `b.isTimeline`). `timeline` is used by no page; `formOld` is dead data |
| Route list | "`/` home, `/about`, `/our-story`, … `/post-*` (articles)" | Inline code list | High | Yes (29 keys in `pages`; posts are `post-post-1` to `post-post-6`) |
| Components and variants | "`cards` (variants: `quad` 4-col, min-width columns, image height)"; "Sectors … Cards radius 18, padding 18, border 2px …, min-height 270, image 110px" | Prose | Medium | Spot-checked yes (`min-height:270px` and `height:110px` each occur once) |
| States and interactions | "`page` (from hash), viewport width `w`, `active` …, `mobileOpen`, `acc`, `faqOpen` map, `sent` map, `blogCat`, `tIdx`"; "Esc closes menus; body scroll locked while drawer open" | Paragraph | Medium (state names are code identifiers) | Yes (`state = { page, w, active, mobileOpen, acc, faqOpen, sent, blogCat, tIdx, missing }`). The form-internal states (wizard steps, errors, done) are not listed |
| Hover states | "hover: scale 1.05, lift 2px, bg `#D8CA50`, text `#2C3E50`"; "hover scale 1.15, rotate -8deg, lift 3px" | Inline prose | Medium | Yes (matches the `style-hover` strings). v2 has many more hover declarations than the README names |
| Animations with timings | "hero children stagger (translateY 28px + blur 8px to none, 900ms, 80ms + 110ms x index …)"; About SVG "mountains rise (1.1s), snow fades in (0.7s delay 0.7s), sun rays spin 40s loop …"; marquee "38s linear loop, slows to 0.15x on hover"; testimonial "auto-advance every 6.5s" | Bullets of dense prose | Medium (numbers present; parsing needs a grammar or an LLM) | Yes on every timing spot-checked. **Omits all logo motion** (`indus-logo.js`) and the inner image scale duration (1600ms) |
| Reduced motion | "all JS-driven motion is skipped when `prefers-reduced-motion` is set"; About hero "Reduced motion: jump to final state" | Bullets | High (a boolean fact) | Yes (`get rm()`, `if (this.rm) {… grow.style.scale = '4.2'; bg.style.fill = '#E7D768'; return; }`) |
| Content and copy | Headings and button labels quoted ("Leading Indian Food & Drinks Wholesaler", "Register For A Trade Account") | Inline quotes | Medium; partial only. The README says "the exact copy lives there [the `pages` getter] and is the source of truth" | Yes |
| Business data | Phone "`0121 771 4330` (tel:01217714330)"; email "`amir@indusfoodsltd.com`"; address "55-58 Stratford Street North, Sparkbrook, Birmingham B11 1BU"; hours "Mon-Thu 9:30am-5pm, Fri 9:30am-12pm and 2:30-5pm, Sat 10am-3pm, Sun closed" (Europe/London); WhatsApp "`https://wa.me/441217714330`" | Bullets and prose | High (well-formed values) | Yes (hours match `slots`). v2 adds the company blurb and "Unitas Wholesale Group" |
| Images | "Photos: Unsplash placeholders loaded by id (`https://images.unsplash.com/photo-<id>?w=<2x width>&q=70&auto=format&fit=crop`) … Brand, accreditation and testimonial logos are placeholders (`brand-*`, `acc-*`, `t-avatar*` ids)." | Bullet | Medium (pattern given, ids not listed) | Yes (the ids are in `applyStock()`) |
| Asset files | "`assets/logo-horizontal.svg`, `logo-square.svg` and animated variants (`*-anim.svg`)" | Bullets | High | The "animated variants" are byte-identical copies |
| Fidelity and intent | "High-fidelity. Final colours, typography, spacing, copy and interactions. Recreate pixel-accurately." | Paragraph | n/a | n/a |
| Rejected options | "an earlier lighter blue was rejected" | Bullet | Low (prose) | n/a (unique to the README) |
| Open items | "Confirm the Sectors panel gradient. Social links currently point to `#/`; supply real URLs. Forms need a backend." | Bullets | High (a list) | Yes (`href="#/" aria-label="LinkedIn"`) |
| Pending assets | "transparent-background tabletop food cut-outs (PNG) are being produced … currently disabled, `density = 'Off'`" | Bullet | Medium | Yes (`const density = 'Off';` in three places) |
| Accessibility | Only "opens on hover/focus", "Esc closes menus", reduced motion and "Email address set small enough to stay on one line" | Scattered | Low | v2 has 0 `aria-expanded`, 0 `aria-current`, 0 `aria-controls`, 0 `role=` (grep counts). The draft's ARIA is not an answer key; SGS supplies it |
| Implementation advice | "pick a suitable framework (… Next.js or Astro …)"; "Routing is hash-based (`#/about`); use real routes in production." | Prose | n/a | Generic skill boilerplate. **An agent could misread it as a stack instruction**; it is irrelevant to the SGS/WordPress route |

### 3.3 What the current README reader extracts

Command, run from the repo root:

```
python -I -c "import sys,json,pathlib; sys.path.insert(0,'plugins/sgs-blocks/scripts/theme-extractor'); import declared_sources as d; print(json.dumps(d.read_readme_tokens(pathlib.Path('.claude/Indus-Foods-Claude-Design-Files/design_handoff_indus_foods_website'))))"
```

Output:

```
{"found": true, "path": "…\\README.md", "colours": [], "unreadable_tables": 0, "rows_without_hex": [], "fonts": [], "layout": {}}
```

Why it gets nothing, from the reader's own patterns:

- `_parse_tables` needs `|` tables, and this README has none.
- `_FONT_BULLET_RE = r"^([^:*`|]+?):\s*\*\*([^*]+)\*\*(.*)$"` needs a bold family; "Headings: Montserrat …" has none, and is not a bullet anyway.
- `_HEADING_RE` needs `#`; "Colours" and "Typography" are bare lines.
- "Radius:", "Shadows:" and "Spacing:" are plain lines, not `- ` bullets, so `_LABEL_RE` never runs on them.
- `_PROSE_RADIUS_RE` needs "border-radius:"; the README says "radius 999".

So the Handoff skill's README format, which is now Bean's mandated input, is **not the format the extractor was built for** (the reader was proven on a "Theme Mapping.md" table README, per commit 4c329803c).

## 4. Where each fact or file can serve the cloning process

| Pipeline step / tool | What it reads today from this slice | What it could read (concrete) |
|---|---|---|
| **Serve** (`lib/draft.mjs::serveDraft`) | The folder, with `index: 'Indus Foods Website v2.dc.html'` | It could detect the single top-level non-component `.dc.html` (the one not named by any `dc-import`) as the index automatically. It could also map `window.__resources` to a local React UMD to drop unpkg. |
| **Theme extractor** (`extract.py` + `declared_sources.py`) | README: nothing (section 3.3). Draft usage: UNVERIFIED for Indus | From the README, a tolerant grammar or an LLM pass could take: role-named colours (Brand blue, Gold, Ink, Slate, Body grey, Muted, Surfaces, tints), fonts with weights (Montserrat 500 to 800 headings, Source Sans 3 400 to 700 body at 19px/1.55, Geist Mono labels), H2 and eyebrow presets, radius scale 3/9-12/16-22/999, 3 shadow presets, spacing scale 8 to 64, responsive section padding, gutters, and max widths 1320 and 1040 to 1120. Selection colours and link/hover colours too. |
| **surfaces.json** (per-client surface manifest; Eye Care's has `tree`, `target.postId`, `walker`, `draftUrl`, `states`, `provides`) | Nothing | **The surface list**: 4 global parts (top bar plus header as `core/template-part:header`, mega menus, drawer, footer as `core/template-part:footer`), home, 22 inner pages, and 6 blog posts (as posts, not pages; note `single.html` caps width at 800px, per CLAUDE.md). Each surface's `draftUrl` = served URL + `#/<route>`. `states`: mega-menu `active` 1 to 4, `mobileOpen` plus `acc`, `faqOpen`, `blogCat` chips, `tIdx` 0 to 3, form error/sent/wizard-step states. |
| **Skeleton writer** (`skeleton.mjs`, `lib/skeleton-inventory.mjs`, `skeleton-propose.mjs`) | `[data-dc-tpl]` DOM plus `__dcAnnotatedTemplate` (355 stamped nodes on a good render, **7 on a crashed one**) | An answer key: each page's typed block list (`about: stats, hscroll, cards:quad, cta`), so section boundaries and repeated-item groups can be checked. Block-type to SGS block hints (`hscroll` = pinned horizontal timeline, `cta` = CTA band, `faq` = accordion, `posts` = post grid with chip filter, `logos` = logo grid, `gradients` = sector cards). The README's home section names and order. |
| **Fill** (`fill.mjs`) | Computed styles at 375/768/1440 | The README's per-breakpoint triples could cross-check measured values (gutter 20/32/40, section padding 64/88/108), catching a mis-measured breakpoint. Note that **v2's breakpoints are JS state (`window.innerWidth` on `resize`), not media queries**, so the viewport must be set before load or a `resize` event must fire. |
| **Parity walker** (`scripts/parity/draft-live-walk.mjs`) | Draft DOM, motion, hover end states, scroll reveals | **Expected motion**: README timings (entrance 900ms, 80+110i stagger; reveal threshold 0.12 and rootMargin -4%; marquee 38s; testimonial 6.5s; About hero sequence to about 4.4s) plus logo motion from `indus-logo.js`. **Hover end states**: v2's `style-hover` strings are explicit hover targets (e.g. `transform:scale(1.05) translateY(-2px);…background:#D8CA50;color:#2C3E50`). **States to walk**: listed in the surfaces.json row. **Settle times**: the About hero needs at least 4.4s; the walker's default floor is 900ms. |
| **Solve** | Walker findings | A README-level "intent" tie-breaker when the draft and the README disagree. The footer is the counter-example: the rendered draft is what Bean saw, so the draft must win. |
| **Site Info / business data** | Nothing | Phone 0121 771 4330, email amir@indusfoodsltd.com, address "55-58 Stratford Street North, Sparkbrook, Birmingham B11 1BU", opening hours (minute slots in `get slots()`, Europe/London), WhatsApp `441217714330`, company blurb, "since 1962". Social URLs: none (all `#/`, an open item). |
| **Media upload** | Nothing | The logo SVGs (static pair), the About hero SVGs per breakpoint, and the WhatsApp glyph. Photos: 19 Unsplash ids in `applyStock()` with an explicit slot map; these are **placeholders** per the README and need owned photography. The `image-slot` placeholder captions describe the wanted image ("Cut-out: ras malai", "Hero banner: spices in bowls on a wooden table"). Brand, accreditation and testimonial logos are empty (no sidecar). |
| **WooCommerce product seeding** | Nothing | **Nothing usable.** No products or prices exist. There are 10 brand entries (5 placeholders) and range-card titles per brand page, plus the wizard's "Ranges" chip list. This is a trade-account site, not a shop, in this design. |
| **Forms (sgs-blocks forms)** | Nothing | TradeApplication `schema` (5 steps, about 35 fields, conditional `show`/`req`, regexes, options, messages). EnquiryForm fields and validation. Generic `form` blocks in `pages.careers` and `pages.catalogue` (`fields` arrays with `req`). The README's "Forms need a backend" applies here. |
| **Blog** | Nothing | 6 `post-*` articles (title, category, content array of lead, p, h, q; read time = words/200, minimum 2) for WP posts, and the blog chip categories. |
| **Divergence ledger** | Nothing | Pre-known divergences: social links `#/`; forms with no backend; empty brand, accreditation and testimonial logos; the disabled food scatter (`density = 'Off'`); Unsplash placeholder photos; mesh gradients render flat; and **the README-vs-draft footer contradiction**. |

## 5. Risks

### 5.1 The runtime crash, reproduced in the handoff copy

- **Reproduced.** Served with `serveDraft(folder, { index: 'Indus Foods Website v2.dc.html' })` and loaded in Playwright Chromium. The console showed `NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node. at Di (https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js:168:448)`, then `[dc-runtime] render error in <Indus Foods Website v2>`. After a crash: `sections: 0, imageSlots: 0, tpl: 7`, and the page shows only the red runtime error banner (seen in a screenshot taken mid-session).
- **Frequency.** Tally of loads where `indus-logo.js` loaded normally: 13 of 15 crashed.
  - `r1-probe.mjs`: 3 of 3 widths (1440, 768, 375).
  - `r1-bisect.mjs`: baseline, noApplyStock, noReveal and reducedMotion, 4 of 4.
  - `r1-timing.mjs`: baseline 2 of 3 (at 715ms and 2122ms; one clean), and the testimonial-timer variant 3 of 3.
  - `r1-shots2.mjs` retry loop: 1 of 2.

  It is **intermittent and timing-dependent**.
- **What removes it**, from small samples:
  - Removing the `indus-logo.js` script tag: 0 of 4 crashed.
  - Stubbing `IndusLogo.prototype.load`, so the custom element still exists but never writes `this.innerHTML`: 0 of 3.
  - Delaying `indus-logo.js` by 4s: 0 of 1.
  - Removing both helmet script tags: 0 of 4.
- **What does not remove it**:
  - Removing only the `image-slot.js` tag: 1 of 3 crashed.
  - Moving both scripts into the document `<head>`: 1 of 2 crashed.
  - Disabling `applyStock`, reveals or the testimonial timer: 7 of 7 crashed in total (applyStock 1/1, reveal 1/1, testimonial timer 3/3, reduced-motion 1/1, baseline 1/1).
- **Reading.** The cause sits with `indus-logo.js` racing React's first renders. **The exact mechanism is UNVERIFIED**: React renders `<indus-logo>` with no children (`walkElement` → `h(realTag, props, ...kids)`), so the exact node React fails to remove was not identified. Per the "prove the cause" rule, this is a strong lead, not a proven cause.
- **Pipeline impact.** `skeleton-inventory.mjs` waits a fixed `waitForTimeout( 2500 )` after `networkidle` and does not check for the runtime error, so a crashed load yields a near-empty inventory without failing. The walker's draft side, Fill's draft measurements and the theme extractor's usage pass would also read a blank page. **A cause-agnostic mitigation**: every draft load asserts that `[data-dc-tpl]` count is above a floor (or that `main section` exists) and that no `[dc-runtime] render error` console line appeared, and retries or fails loudly. In my retry loop, a good render came on attempt 2 (`r1-shots2.mjs`: `tries 2 true`).

### 5.2 Network dependencies at draft-render time

`r1-probe.mjs` saw these external hosts:

- `unpkg.com`: React 18.3.1 and ReactDOM UMD, SRI-pinned; Babel only for JSX imports.
- `fonts.googleapis.com` and `fonts.gstatic.com`.
- `images.unsplash.com`: every photo is set at runtime by `applyStock()`, not in the template.
- The Google Maps iframe on Contact and in the footer (`maps.google.com`), lazy-loaded.

An offline or blocked run renders nothing (React) or wrong typography and imagery. This matches the Stage 5 finding that Fill needs `--allow-external`.

### 5.3 The README is not the source of truth, and an agent could treat it as one

- **Footer contradiction** (section 0, finding 4).
- **The block vocabulary omits `wizard` and `enquiry`** (the Apply and Contact pages) and `timeline`.
- **"Forms (Careers, Trade Application, Contact)"** implies one generic form. In fact Trade Application is the separate 5-step `TradeApplication.dc.html` and Contact is `EnquiryForm.dc.html`. The contact page's generic form data is `formOld`, filtered out.
- **"animated variants (`*-anim.svg`)"**: these are byte-identical to the static files.
- **Framework boilerplate**: "pick a suitable framework (… Next.js or Astro …)" and "use real routes in production" are the skill's generic advice, not a requirement for the SGS route.
- **Logo motion is missing** from "Animations & Behaviour".

### 5.4 Content that varies with time or randomness (walker flakiness)

- The opening-hours badge ("Open now / Closes at X" against "Closed / Opens …") depends on the Europe/London clock. The probe read "Closed … Opens Monday at 9:30am".
- The testimonial auto-advances every 6.5s.
- The marquee is continuous.
- The wizard reference is `Math.random()`.
- Photo assignment for unmapped slots is deterministic (an id hash), but it depends on Unsplash availability.

A draft-vs-live text comparison must freeze or mask these.

### 5.5 Hash routing

All 28 inner pages exist only as `#/<route>` states of one document. `grep` for `location.hash|#/|hashchange` in `scripts/computed-route/lib`, `skeleton.mjs` and `scripts/parity` found nothing. Whether every tool keeps a `#/about` fragment through its navigation, and waits for the post-`hashchange` re-render and the 380ms main fade, is UNVERIFIED. `parseHash()` runs on mount, so a direct load with the hash should render that page.

### 5.6 Missing pieces

- No `.image-slots.state.json`: hand-dropped imagery is lost and brand, accreditation and testimonial logos are empty.
- No real social URLs.
- No form backend.
- Food cut-out PNGs are pending.
- Testimonials are anonymised roles, not real customers.
- 5 of 10 brands are "Partner brand" placeholders.
- No product data.
- The handoff folder carries no screenshots and no token CSS. Both exist only at the export root (`screenshots/`, `tokens/`), outside this slice.

### 5.7 Mesh gradients

Three `meshgradient` fills in each About-hero SVG (and in the logos) are unsupported in browsers and render flat. The designer's Inkscape view may differ from what both the draft and the live site show (UNVERIFIED which was intended).

### 5.8 Accessibility is not a reference

The draft has no `aria-expanded`, `aria-current` or `aria-controls` and no `role=`. Mega menus open on hover and focus via `onFocus` (1 occurrence). Parity on ARIA must not copy the draft; SGS's own controls (WCAG 2.1 AA) apply.

### 5.9 Index filename with spaces

`Indus Foods Website v2.dc.html` needs URL encoding (`encodeURI`) and an explicit `index`. The root name derives from the path (`dcNameFromPath` gives `"Indus Foods Website v2"`), and that is the name `__dcAnnotatedTemplate` must be called with.
