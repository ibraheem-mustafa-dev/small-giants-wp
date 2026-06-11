# Visual-diff — sgs/container Step 2 responsive-spacing controls (container 4-layer programme) — 2026-06-11

verdict: PASS
first_paint_capture_passed: true

**Change:** Step 2 of the container 4-layer fix programme — wired the 16 previously-dead responsive spacing attrs (`padding{Top,Right,Bottom,Left}{Tablet,Mobile}` + `margin{…}{Tablet,Mobile}`) to a new shared `ResponsiveSpacingPanel` (named export from `ContainerWrapperControls.js`), mounted in all three KIND panels (section/layout/content) and in `container/edit.js`. Controls follow the canonical pattern: `ResponsiveControl` device-icon switcher + 4-side `SpacingControl freeInput` (UnitControl) per tier; desktop tier defers to the native Dimensions panel (help note, no duplicate control — HC2). Frontend render path untouched (the wrapper PHP already rendered these attrs at `class-sgs-container-wrapper.php:700-776`).

**Validation (live on the sandybrown canary, 2026-06-11):**
- Editor: probe page with `sgs/container` selected — "Responsive spacing" panel renders Padding + Margin ResponsiveControls; tablet tier shows 4 UnitControl inputs; desktop tier shows 0 inputs + the Dimensions help note. Verified via DOM probe (chrome-devtools).
- Frontend first paint: probe page published with `paddingTopTablet:'77px'` + `paddingTopMobile:'33px'` → computed `padding-top` = **77px at 768w** and **33px at ≤599w** (live `getComputedStyle` on the rendered `.sgs-container`). Probe page deleted after capture.
- Build green incl. all 3 prebuild guards (check-dead-controls / check-hardcoded-render-defaults / check-control-ux: 0 net-new each).

## Result — PASS (R-22-11)
Live DOM verified at two viewports; editor controls reachable for all 16 attrs; zero guard regressions; no frontend rendering change for existing content (attrs previously rendered, now merely controllable).

---

# Addendum — Step 3 content band + universal inline-vs-@media cascade fix (same day)

verdict: PASS
first_paint_capture_passed: true

**Change:** (1) Layer-2 content band shipped end-to-end: 17 new attrs (`contentBandPadding{side}{,Tablet,Mobile}` ×12 + `contentBandBackground` + `contentWidthTablet/Mobile`), wrapper renders them on `__inner`, shared `ContentBandPanel` (section+layout kinds) in the inspector + edit.js. (2) Two render bugs found live and fixed in the main thread: the `<style>` tag used `esc_html()` which turned the band selector's `>` into `&gt;` (rules matched nothing) → `wp_strip_all_tags()`; the band base was inline on `__inner` so @media tiers could never win → base now emitted via the uid stylesheet when tiers exist. (3) The SAME inline-beats-@media class bug was then probed and confirmed on the ROOT tiers and fixed universally: WP-native inline base padding/margin → tier decls now `!important`; our own inline bases (gap, grid-template-columns, grid-template-rows) → deferred to the uid stylesheet when tiers exist (the file's existing min-height convention).

**Validation (live on sandybrown, 2026-06-11):**
- Band probe (`contentWidth` 800px→tablet 600px; band paddingTop 40→24→12; bg #ffeecc): `.sgs-container__inner` computed = 40px/800px/rgb(255,238,204) @1440 · 24px/600px @768 · 12px @≤599. No inline style on `__inner` (base in uid stylesheet).
- Root conflict probe (native inline base padding-top 50px + `paddingTopTablet` 21px): 50px @1440, **21px @768** (was 50px before the fix — the Step 2 tiers silently lost to inline base; now win via !important).
- Page-8 regression smoke: hero 2-col grid intact, 37 containers, grid gaps painting, content renders.
- Editor: "Content band" panel reachable on a page-8 container — Band padding + Band width ResponsiveControls + colour control.
- php -l clean; build green ×3 guards; probe pages deleted.

## Result — PASS (R-22-11)

---

# Addendum — Step 4 inspector dedup (same day)

verdict: PASS
first_paint_capture_passed: true

**Change:** container/edit.js refactored from 1375 → 276 lines: inline duplicate panels (Layout, Width, Grid item defaults, Background, Shape Dividers) replaced by the shared ContainerWrapperControls exports (`LayoutPanel`/`WidthPanel`/`BackgroundPanel`/`ShapeDividersPanel`/`GridItemDefaultsPanel` + shared `MIN_HEIGHT_OPTIONS`/`SHADOW_OPTIONS`). Container-specific panels (min-height, HTML tag, Template mode, Shadow body) stay inline. Zero frontend render change (editor-only refactor).

---

# Addendum — Step 5 flex controls (same day)

verdict: PASS
first_paint_capture_passed: true

**Change:** the 3 dead flex attrs (`flexDirection`/`flexWrap`/`justifyContent` — rendered by the wrapper, zero controls) wired as SelectControls in the shared `LayoutPanel`, visible when layout=flex. Found + fixed during live verify: the wrapper allowlist (`'', row, column`) and block.json enums silently dropped valid CSS values — both widened to the full set (row/column-reverse, wrap-reverse, space-evenly).

**Validation (live canary):** probe page `layout:flex, flexDirection:row-reverse, justifyContent:space-between, flexWrap:nowrap` → computed `row-reverse` / `space-between` / `nowrap`. Build green ×3 guards; php -l clean; probe deleted.

## Result — PASS (R-22-11)

---

---

# Addendum — Step 6 per-area grid layer + hero alignment (same day)

verdict: PASS
first_paint_capture_passed: true

**Change:** official Layer-4-per-area standard (Spec 22 §FR-22-21.3): shared `GridAreaPanel` (generic `<areaName>+<Suffix>` controls — 4-side × 3-tier padding writing number + shared `<area>PaddingUnit`, background) + `gridAreas` prop through `ContainerWrapperControls`; KIND_PANELS.section reordered to the 4-layer standard. Hero: `supports.sgs.gridAreas:["content","media"]`; `contentBackground`/`mediaBackground` added + rendered; `splitColumnRatio*` retired → `gridTemplateColumns*` (deprecated.js v7 migrate; render.php explicit '1fr 1fr' default); duplicate `mediaBackgroundColour` + bespoke contentPadding controls removed (one control per setting).

**Defects caught + fixed during the gate:** (1) hero TDZ — v7 deprecation spread `V6_ATTRIBUTES` before its declaration → hero silently unregistered in the editor (core/missing); moved below v6. (2) `GridAreaPanel` discarded the unit on change — now parses number+unit and writes the shared `<area>PaddingUnit`. (3) render.php `?? '1fr 1fr'` never fired (mirror attr defaults `''`) — explicit empty-string default added. (4) migrate() no longer bakes '1fr 1fr' into standard-variant heroes.

**Validation (live canary):** editor page 8 — hero registered (7 deprecations), 0 missing/0 invalid blocks; panel order Section (outer) → Content band → Responsive spacing → Layout → Content area → Media area → Background → Shadow → Shape Dividers; no splitColumnRatio control; per-area write round-trip = `contentPaddingTop:33` (number) + `contentPaddingUnit:'px'`. Frontend — hero grid 2-col, `__content` padding-top 72px, body text intact. Build green ×3 guards; php -l clean.

## Result — PASS (R-22-11)

---

**Validation (live canary editor, page 8):** full inspector enumeration with a container selected — all panels present (Layout, Responsive spacing, Content band, Template mode, Background, Shadow, Shape Dividers + extensions); switching layout→grid in-memory revealed Columns/Custom column template/Row template/Auto rows/Justify items/Align content + the Grid item defaults panel (Padding/Background/Radius/Border/Shadow/Text colour). Matches the before/after inventory; no control lost; reverted without save. Build green ×3 guards.

## Result — PASS (R-22-11)
