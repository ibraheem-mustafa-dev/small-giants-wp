# CHECK A (editor-canvas desync) — minor-signal audit: E2, E4, E5, E6, E7

Scope: `plugins/sgs-blocks/scripts/check-editor-render-parity.js`, CHECK A's
exemption ladder. Covers the five signals owned by this pass — E2
(`providesContext`), E4 (SIGNAL 1 non-paint-sink), E5 (SIGNAL 2 companion),
E6 (SIGNAL 3 no-preview Notice), E7 (SIGNAL 4 live-data placeholder). E3
(`usedOutsideControls`) is owned by another agent and is NOT analysed here.
Source differential: `reports/2026-08-26-check-a-exemption-differential.json`.
Every pair listed below was opened in its own `edit.js`/`render.php` (and,
where relevant, a shared component file) — nothing here is reasoned from the
survey list alone.

All 116 pairs (E2=10, E4=56, E5=29, E6=7, E7=20) were examined; none were
sampled.

---

## E2 — `providesContext` (10 pairs)

**What it exempts, on what evidence.** `readDeclaredAttrs()`
(`check-editor-render-parity.js:495`) reads a block's `block.json`
`providesContext` map and builds a set of the attributes that SOURCE a
context key handed to a child block. In the main loop
(`check-editor-render-parity.js:2436-2438`):

```js
if ( providesContextAttrs.has( attr ) ) {
    continue; // consumed by a CHILD block's own editor preview via block context, not this block's
}
```

The code's own comment (`check-editor-render-parity.js:483-490`) documents the
blind spot: it does NOT verify that any child actually declares
`usesContext` for that key, let alone that the child's `edit.js` reads
`context['sgs/...']` back out. It exempts on **declaration alone**.

**Findings (10/10 opened):**

| Block.attr | Verdict | Evidence |
|---|---|---|
| `sgs/accordion.openIcon` | **REAL-MISS** | Child `sgs/accordion-item` declares `usesContext: ["sgs/accordionOpenIcon", "sgs/accordionCloseIcon", ...]` (`accordion-item/block.json:78-88`) but its `edit.js` never reads either key — it renders a hardcoded `CHEVRON_SVG` regardless (`accordion-item/edit.js:14-30,102-176`). Frontend genuinely resolves a per-item icon via the lucide resolver (`accordion-item/render.php:50-51,176-198`). Canvas always shows the same chevron no matter what open/close icon is picked. |
| `sgs/accordion.closeIcon` | **REAL-MISS** | Same evidence as above. |
| `sgs/container.gridItemBackground` | **REAL-MISS** | Zero blocks in the plugin declare `usesContext` for any `sgs/gridItem*` key (`grep -rl` across `src/` returns nothing but `container/block.json` itself). The real transfer mechanism isn't WP block context at all — it's CSS custom properties (`--sgs-gi-bg`, `--sgs-gi-padding`, ...) emitted by `SGS_Container_Wrapper::render()` at render time (`includes/class-sgs-container-wrapper.php:1392-1417`), which only runs in `render.php` (frontend). `container/edit.js` never emits these vars and never mounts `ServerSideRender`. `providesContext` is vestigial here. |
| `sgs/container.gridItemBorder` | **REAL-MISS** | Same mechanism as above. |
| `sgs/container.gridItemBorderRadius` | **REAL-MISS** | Same. |
| `sgs/container.gridItemPadding` | **REAL-MISS** | Same. |
| `sgs/container.gridItemShadow` | **REAL-MISS** | Same. |
| `sgs/container.gridItemTextColour` | **REAL-MISS** | Same. |
| `sgs/nav-drawer.submenuModel` | **REAL-MISS** | Child `sgs/nav-menu` declares `usesContext: ["sgs/navDrawerSubmenuModel"]` (`nav-menu/block.json:19-21`) and its `render.php` genuinely reads `$block->context['sgs/navDrawerSubmenuModel']` (`nav-menu/render.php:679`). But `nav-menu/edit.js`'s `Edit()` signature doesn't even destructure `context` (`nav-menu/edit.js:148`) — the prop is never received, let alone read. Canvas never reflects the submenu-display-mode choice. |
| `sgs/product-faq.iconPosition` | **CORRECT-EXEMPTION** | Child `sgs/product-faq-item` declares `usesContext: ["sgs/productFaqIconPosition"]` (`product-faq-item/block.json:63-65`) AND its `edit.js` genuinely reads it — `const iconPosition = context['sgs/productFaqIconPosition'] || 'right';` (`product-faq-item/edit.js:96`) — used to conditionally place the chevron left/right in the child's own canvas (`product-faq-item/edit.js:192,204`). |

**Counts:** 9 REAL-MISS, 1 CORRECT-EXEMPTION, 0 UNCERTAIN.

**Verdict: WRONG.** The signal exempts on `providesContext` DECLARATION
alone with no verification of consumption. 9 of 10 hidden findings are
genuine desyncs the check should be catching — including a structural class
(`gridItem*`) where the context declaration is dead code plugin-wide and the
real transfer mechanism (CSS custom properties) doesn't touch the editor at
all.

**Proposed narrowing (not implemented).** Require BOTH: (a) at least one
sibling block declares `usesContext` for the corresponding context key, AND
(b) that sibling's own `edit.js` references `context['sgs/<key>']` (a
literal string match against the raw source is enough — mirrors how the
checker already scans render.php for attribute reads). Only exempt when both
hold. This would correctly keep `product-faq.iconPosition` exempt and flag
the other 9.

**What the narrowed fix would still miss:** it still wouldn't verify the
child's usage is inside the child's own CANVAS render path rather than
buried in the child's own InspectorControls (an edge case, but the same
class of gap CHECK A polices for the parent already) — that would need the
same JSX-exclusion-range machinery CHECK A already runs on the PARENT
applied recursively to the CHILD file too. Flag as a residual blind spot,
not a blocker.

---

## E4 — SIGNAL 1 non-paint-sink (56 pairs)

**What it exempts, on what evidence.**
`attributeIsNonPaintSinkOnly()` (`check-editor-render-parity.js:1650-1668`)
walks every render.php usage site of the attribute and classifies each site
via `classifyUsageSite()`. If EVERY site classifies into
`NON_PAINT_SINK_CLASSES` (`check-editor-render-parity.js:780-782` —
`hover-css`, `reduced-motion-css`, `motion-timing`, `aria`, `data`,
`native-functional`, `json-ld`) and none classify as `paint`, the attribute
is exempted:

```js
if ( phpSrc && attributeIsNonPaintSinkOnly( phpSrc, phpMask, phpCommentMask, attr, attrVarMap, derivedVarMap ) ) {
    continue; // SIGNAL 1 — every render.php consumption site is a non-paint sink
}
```

**Findings (56/56 opened):** 48 CORRECT-EXEMPTION, 8 REAL-MISS, 0 UNCERTAIN.

REAL-MISS (8):

| Block.attr | Evidence |
|---|---|
| `sgs/audio.audioControls` | Feeds `$show_native_controls = ($controls \|\| !$autoplay)` → toggles the native `<audio controls>` attribute, i.e. whether the browser's control bar is visible at all — clearly paint-relevant (`audio/render.php:52,101,105`). Editor hardcodes `<audio className="sgs-audio__native" controls src={audioUrl} .../>` with `controls` always present (`audio/edit.js:326`) — the toggle has zero effect on canvas. |
| `sgs/hero.backgroundOverlayBlendMode` | Feeds `sgs_overlay_decls()` → emits `mix-blend-mode:<mode>` in the frontend overlay CSS (`includes/helpers-tokens.php:968-985`, `hero/render.php:111,1063`) — a strongly visible property (multiply/screen/overlay look nothing alike). `hero/edit.js` has zero references to `backgroundOverlayBlendMode`. |
| `sgs/hero.bgVideo` | Frontend resolves `$bg_video_attr['url']` into a real `<video>` background element (`hero/render.php:196,963-974`). `hero/edit.js` never reads `bgVideo` at all (only the unrelated `splitVideo` family, which is a different attribute set for the split-layout column, not the section background) — no video preview, no fallback indication. Same shape as the block's own already-proven `backgroundColour`/`has-background` misses. |
| `sgs/countdown-timer.targetDate` | Feeds `data-target`/`data-evergreen` (`countdown-timer/render.php:335-339`), consumed by a frontend JS ticker that writes the live digits. Editor hardcodes every digit unit to the literal string `'00'` regardless of any of these attrs (`countdown-timer/edit.js:127-130`) — classified by SIGNAL 1 as a `data` (non-paint) sink, but the data attribute feeds a genuinely visible JS-rendered result on the frontend, which is exactly the shape a `data-*` sink CAN produce. |
| `sgs/countdown-timer.evergreenMode` | Same evidence — hardcoded `'00'` regardless. |
| `sgs/countdown-timer.evergreenHours` | Same. |
| `sgs/countdown-timer.evergreenMinutes` | Same. |
| `sgs/countdown-timer.expiredMessage` | Destructured in `edit.js:97` but never referenced in the returned JSX at all — no expired-state preview exists in the editor, so the text the client types is never shown there, ever. |

CORRECT-EXEMPTION (48): confirmed genuinely non-paint in every case checked
— aria labels (`icon.ariaLabel`), JSON-LD gates
(`accordion.faqSchema`, `testimonial.schemaEnabled`,
`star-rating.schemaEnabled/schemaItemName`), `data-*` behavioural/JS-only
hooks with no visible frontend rendering difference
(`accordion.allowMultiple`, `audio.audioAutoplay/audioLoop/audioPreload`,
`audio.reactiveSensitivity`, `button.isSubmit`, `form.formName`,
`form.storeSubmissions`, `form-field-*.fieldName`, `modal.closeOnOverlay`,
`nav-drawer.drawerRef`, `product-search.maxResults`,
`table-of-contents.scrollOffset/scrollSpy/smoothScroll`,
`trust-bar.autoScrollPauseOnHover/autoScrollSpeed`), hover-only CSS
(`button.scaleHover`, `container.*Hover*`, `quote.scaleHover`,
`team-member.overlayHover`, `testimonial-slider.effectHover`), motion-timing
(`button.transitionDuration/transitionEasing`,
`decorative-image.parallaxStrength/pathDraw*`, `countdown-timer.digitStyle`
— confirmed its frontend CSS class `sgs-countdown--digit-flip` is entirely
wrapped in `@media (prefers-reduced-motion: no-preference)` and only sets
`transition`/`animation`/`perspective`, no static-frame difference —
`countdown-timer/style.css:82-95`; `counter.duration`; `quote.transitionDuration/transitionEasing`),
and physics-simulation parameters with no static-frame difference
(`physics-canvas.physicsBounce/physicsEdgeResistance/physicsGravity`).

**Verdict: TOO BROAD.** 86% correct, but the `data` classification bucket
has a real conceptual hole: it treats every `data-*`-attribute consumption
site as inherently non-visual, when a `data-*` attribute that feeds a
frontend JS-driven DOM write (a live countdown, in this case) is exactly as
paint-relevant as an inline style — the paint just happens in JS instead of
PHP. Separately, `classifyUsageSite()` has no recognised shape for a raw
HTML media-embed sink (`<video src="...">`) or for `mix-blend-mode`
specifically, so both fall through unclassified in a way that still nets
out "non-paint-sink-only" for those two hero attributes.

**Proposed narrowing (not implemented):** (1) For the `data` class, add a
same-block check: if `edit.js` contains NO client-side ticking/animation
loop reading the equivalent attribute (`useEffect`/`setInterval`/a
requestAnimationFrame loop) AND render.php's `data-*` sink is consumed by a
`viewScriptModule` that visibly rewrites DOM text/content (detectable via a
static `textContent =` / `innerText =` grep in the associated `view.js`),
treat it as a real candidate rather than an automatic non-paint sink. (2)
Add `mix-blend-mode` to the set of recognised CSS paint properties in
`classifyUsageSite()`'s property list. (3) Recognise `<video src=` /
`<img src=` HTML-attribute embedding of an attribute-derived URL as a
`paint` (not unclassified) sink.

**What the narrowed fix would still miss:** it wouldn't catch a case where
the block's `view.js` DOES exist and DOES tick, but the specific attribute's
value never actually reaches the DOM write (the "referenced but produces
the wrong value" class of bug from the proven ground truth) — that needs
live-DOM verification, not static analysis, and is out of reach for any
purely syntactic signal.

---

## E5 — SIGNAL 2 companion (29 pairs)

**What it exempts, on what evidence.**
`collectSetAttributesGroups()` (`check-editor-render-parity.js:1697-1716`)
groups every `setAttributes({...})` call site in `edit.js` with 2+ written
keys into a "companion set." `checkCompanionExemption()`
(`check-editor-render-parity.js:1750-1761`) then exempts `attr` if it
appears in any group alongside another attribute that already passes
`usedOutsideControls` (i.e. is referenced somewhere in the file outside
`InspectorControls`/`BlockControls`):

```js
for ( const companion of group ) {
    if ( companion !== attr && usedOutsideControls.has( companion ) ) {
        return true;
    }
}
```

**Findings (29/29 opened):** 14 CORRECT-EXEMPTION, 15 REAL-MISS, 0
UNCERTAIN.

REAL-MISS (15) — two distinct root causes:

**Cause A — `resetAll` bulk-clear grouping is not "co-written together."**
`collectSetAttributesGroups()` doesn't distinguish a genuine "one control
writes N related keys together" shape from a `ToolsPanel`'s `resetAll={()
=> setAttributes({...})}` handler, which legitimately bulk-clears many
UNRELATED attributes back to their defaults in one call. Being reset
together proves nothing about being painted together.

| Block.attr | Evidence |
|---|---|
| `sgs/button.labelCollapse` | Only appears inside `InspectorControls` (`ToolsPanelItem`/`SelectControl` at `button/edit.js:581-593`); its ONLY multi-key group is the icon-panel `resetAll` (`button/edit.js:555-559`), grouped with `iconPosition` (which IS genuinely visible). `labelCollapse` never touches canvas className/style — the "collapse label to icon below N px" effect never previews. |
| `sgs/decorative-image.hideOnMobile` | Same shape — only multi-key group is the responsive-visibility `resetAll` (`decorative-image/edit.js:346-347`). Never referenced in canvas markup (`decorative-image/edit.js` has zero non-InspectorControls hits). |
| `sgs/decorative-image.hideOnTablet` | Same as above. |
| `sgs/hero.contentBackgroundGradient` | Multi-key `resetAll` group at `hero/edit.js:1053` (with `contentPadding`/`gridTemplateColumns`, also both misses below). No canvas usage anywhere in the file (`grep` for the attr outside InspectorControls returns nothing). |
| `sgs/hero.contentPadding` | Same `resetAll` group; box-tier object never applied to canvas style. |
| `sgs/hero.gridTemplateColumns` | Same group (`hero/edit.js:885,1096-1118`); grid columns never reflected in canvas layout. |
| `sgs/hero.textAlignMobile` | `resetAll` group at `hero/edit.js:877-885` alongside `verticalAlignment`; never applied to canvas. |
| `sgs/hero.textAlignTablet` | Same group. |
| `sgs/hero.verticalAlignment` | Same group; content vertical alignment is a section/layout-composite property that should visibly move the content block, but the attribute is inspector-only in this file. |
| `sgs/post-grid.shadow` | See Cause B below — its literal companion writes are both `resetAll`/`onDeselect`-bulk-clear shapes, not genuine paired control writes. |
| `sgs/quote.boxShadow` | Same shape — companion is `boxShadowColour` via a 2-key `onDeselect` clear (`quote/edit.js:794-795,818-819`), not a real paired write; see Cause B for why `boxShadowColour` looks "visible" when it isn't. |
| `sgs/testimonial.nameFontSize` | Companion group is the typography-panel `resetAll` (`testimonial/edit.js:875-876`, alongside `nameFontWeight`). Canvas `nameStyle` object only sets `color: nameColour` (`testimonial/edit.js:277`) — font-size/weight never reach the rendered `<cite>` element. |
| `sgs/testimonial.nameFontWeight` | Same evidence. |

**Cause B — the `usedOutsideControls` collector itself is fooled by a
shared colour-panel component mounted as a JSX SIBLING of
`<InspectorControls>` rather than nested inside it.** `SgsColourPanel`
(`plugins/sgs-blocks/src/components/SgsColourPanel.js:115-117`) internally
wraps its content in its own `<InspectorControls group="styles"><PanelBody>`
— it is a sidebar-only panel. But blocks mount it as
`<SgsColourPanel rows={colourRows} .../>` BEFORE/outside their own literal
`<InspectorControls>` JSX block (e.g. `post-grid/edit.js:454` vs.
`InspectorControls` starting at `post-grid/edit.js:605`). CHECK A's
`EXCLUDED_JSX_CONTAINERS` exclusion only recognises the literal
`InspectorControls`/`BlockControls` JSX tag by position in the FILE's own
AST — it has no idea `SgsColourPanel` renders into the inspector
internally. Any colour attribute referenced only inside a `rows`/`colourRows`
config array (e.g. `value: shadowColour`, `onChange: (val) =>
setAttributes({shadowColour: val})`) is wrongly counted as "used outside
controls" — i.e. visible — because syntactically it sits outside the
literal `<InspectorControls>` tags. That false "visible companion" then lets
SIGNAL 2 wrongly clear its sibling.

| Block.attr | Evidence |
|---|---|
| `sgs/post-grid.excerptLength` | Only referenced in `InspectorControls` (`post-grid/edit.js:808-809`) and a `resetAll` (`post-grid/edit.js:742`, grouped with `imageSize`, itself a miss). Frontend excerpt truncation is genuinely attribute-driven; the editor HARDCODES `.slice(0, 120)` regardless of the value (`post-grid/edit.js:226`) — proven, not inferred. |
| `sgs/post-grid.imageSize` | Only referenced in `InspectorControls` (`post-grid/edit.js:765-767`). Editor's `<img src={featuredImage.source_url}>` (`post-grid/edit.js:180`) always uses the default REST media URL — never resolves the specific registered WP image size the attribute names. |
| `sgs/post-grid.shadow` | This is the RESTING (base) box-shadow control, explicitly distinct from the separate `shadowHover` attribute (`post-grid/edit.js:924-930,958-976` — comment: "resting shadow shape... mirrors the shadowHover pair"). Its companion (`shadowColour`) is referenced only inside the `SgsColourPanel` `rows` config (`post-grid/edit.js:587-588`), which is Cause B. No box-shadow style reaches the canvas anywhere in the file. |

**Findings — CORRECT-EXEMPTION (14):** confirmed genuinely correct in every
case — `sgs/form-field-textarea.fieldName` (non-visual `id`/`name` wiring,
same pattern as the other `fieldName` attrs already confirmed under E4);
all 6 `sgs/image-sequence` tablet/mobile frame attrs (`mobileFrameExt`,
`mobileFramePad`, `mobileFramesUrl`, `tabletFrameExt`, `tabletFramePad`,
`tabletFramesUrl`) — the editor's own explicit `<Notice>` states "Scroll
effects preview on the live site. The editor always shows the thumbnail
frame." (`image-sequence/edit.js:619-625`), and the `<img>` shown is always
`thumbnail.url`, never keyed by any tier's frame source; `sgs/media.imageId`
— genuinely always written together with the visible `imageUrl` by the SAME
`onSelectImage` picker call (`media/edit.js:137-143`), so there is no
scenario where `imageId` changes independently of the visible `imageUrl`;
`sgs/post-grid.transitionDuration`/`transitionEasing` (motion-timing,
confirmed via the same `resetAll` group, holds regardless of the flawed
detection mechanism); `sgs/testimonial.effectHover`/`scaleHover` (hover-only
CSS vars, `testimonial/render.php:135,138,454,499-500`);
`sgs/testimonial-slider.autoplaySpeed` (JS-timing `data-speed`,
`testimonial-slider/render.php:49,313`)/`dragToScroll` (behavioural-only
`data-sgs-slider-momentum` flag, `testimonial-slider/render.php:83,85`).

**Verdict: WRONG.** 15 of 29 (52%) are real misses. This is the weakest
signal audited. It has two independent, compounding flaws: treating
`resetAll` bulk-clears as evidence of paired visibility, and inheriting a
false-positive "visible" classification from a shared-component boundary
crossing that the base `usedOutsideControls` collector (owned by the E3
track, but the corruption surfaces here) doesn't account for.

**Proposed narrowing (not implemented):** (1) Exclude any `setAttributes`
call site whose enclosing function is passed as a `resetAll` prop (or, more
simply, any call site with more than ~4 keys, since genuine paired-control
writes are almost always 2-3 keys — a `resetAll` bulk-clear is a smell at
scale) from `collectSetAttributesGroups()`. (2) Extend
`COMPONENT_FILE_MAP`-style resolution (already used elsewhere in the file
for the R3-a write-tracking case, `check-editor-render-parity.js:2380-2400`)
to `usedOutsideControls` too: when a JSX tag mounted OUTSIDE
`InspectorControls`/`BlockControls` resolves to a component file that
itself renders `<InspectorControls>` internally, treat every identifier
passed into that component's props as excluded (sidebar-only), not visible.

**What the narrowed fix would still miss:** a component that conditionally
renders SOMETIMES into the canvas and sometimes into the inspector (none
observed in this audit, but structurally possible) would need per-call-site
resolution rather than a per-component-file flag.

---

## E6 — SIGNAL 3 no-preview Notice (7 pairs)

**What it exempts, on what evidence.**
`checkNoPreviewNoticeExemption()` (`check-editor-render-parity.js:1915-1943`)
finds `<Notice>` JSX whose text matches
`NO_PREVIEW_TEXT_RE` (`check-editor-render-parity.js:1892` — "not available
in the editor" / "handled by the server" / "no preview" / "preview not
available"), then finds every boolean flag NOT used as an early-return
guard that gates a JSX group alongside that Notice, and exempts every
declared attribute referenced within that same gated span.

**Findings (7/7 opened) — all `sgs/media`:** `thumbnailId`, `videoAutoplay`,
`videoControls`, `videoLazyLoad`, `videoLoop`, `videoMuted`,
`videoPlaysInline`.

All 7 are **CORRECT-EXEMPTION.** Confirmed: once `hasVideo` is true,
`media/edit.js`'s ENTIRE canvas branch (`media/edit.js:1653-1678`) renders
ONLY an explicit `<Notice status="info">Video URL set. Frontend render
handled by server. Preview not available in editor.</Notice>` (or the
sibling internal-video Notice) — no poster image, no toggle-driven markup,
nothing else. The file's own top comment even documents this as deliberate:
"Video preview in editor — simplified; render.php drives the frontend."
Every one of the 7 attributes is genuinely unreachable in canvas, and the
client is told so.

**Verdict: SOUND.** 7/7 correct, evidence matches the signal's stated
design exactly.

---

## E7 — SIGNAL 4 live-data placeholder (20 pairs)

**The structural suspicion, verified against the code.** Confirmed TRUE.
`checkLiveDataPlaceholderExemption( phpSrc, src )` is called exactly ONCE
per block (`check-editor-render-parity.js:2414`) and stored in a single
boolean, `liveDataPlaceholderExempt`. Inside the PER-ATTRIBUTE loop, the
gate is a bare, unconditional continue on that one block-wide boolean
(`check-editor-render-parity.js:2440-2443`):

```js
if ( liveDataPlaceholderExempt ) {
    continue; // SIGNAL 4 — render.php reaches a live-data function; edit.js self-declares a placeholder
}
```

There is no per-attribute check that the SPECIFIC attribute under
consideration has anything to do with the live-data call. If a block calls
a live-data function anywhere in `render.php` AND `edit.js` contains any
`className` matching `/placeholder/i` anywhere, EVERY attribute of that
block — styling, layout, unrelated toggles — is swept, exactly as
suspected.

**Findings (20/20 opened) — two blocks, both hidden entirely by this
signal:**

- `sgs/buybox` (6 attrs: `addToCartLabel`, `notifyEnabled`, `notifyMeLabel`,
  `perUnitDenomination`, `soldOutLabel`, `unavailableLabel`) — the block's
  own file header documents this as deliberate: "Static placeholder panel —
  the block is fully server-rendered on the product page (render.php
  resolves the product from `context.postId`). A live ServerSideRender
  preview is deliberately avoided: outside a product template context there
  is no product to render, so the preview would always show the core-blocks
  fallback and mislead operators." (`buybox/edit.js:6-13`). `edit.js` has
  exactly one return path (`useBlockProps({className: 'sgs-buybox
  sgs-buybox--editor-placeholder'})` plus `InspectorControls`-only
  `TextControl`s) — genuinely zero canvas representation for ANY of these
  6, confirmed by reading the file, not by trusting the sweep.
- `sgs/google-reviews` (14 attrs: `cardStyle`, `columns`, `excludeKeywords`,
  `minRating`, `reviewRequestUrl`, `showAggregate`, `showArrows`,
  `showAvatar`, `showBreakdown`, `showDate`, `showDots`, `showGoogleLogo`,
  `sortBy`, `textOnly`) — `edit.js` has exactly ONE `return (` statement
  (`google-reviews/edit.js:55`), and it always renders the
  `.sgs-google-reviews__placeholder` box ("Configure Google API settings in
  WordPress admin to display reviews.") with no branching on real review
  data at all. `cardStyle`/`columns` (pure layout/style attrs, unrelated to
  the live Google Places fetch) get swept along with the genuinely
  data-dependent ones, but since the canvas NEVER renders anything but the
  placeholder box regardless of any attribute, the outcome is still
  correct — every one of the 14 genuinely has zero visible effect today.

**Counts:** 0 REAL-MISS, 20 CORRECT-EXEMPTION, 0 UNCERTAIN.

**Verdict: SOUND in this run's outcome, but the mechanism is TOO BROAD by
design and the current corpus does not exercise the risk.** The code-level
bug is real and would misfire the moment a THIRD block matches both
conditions (live-data call in render.php + a `placeholder` className
anywhere in edit.js) while ALSO having even one attribute with a genuine,
independent partial canvas preview (e.g. a block that shows dummy/skeleton
cards styled by `cardStyle` while a real API call is pending, rather than a
single all-or-nothing placeholder box). Neither `buybox` nor
`google-reviews` happens to have that shape — both are unconditional,
single-return, zero-preview blocks — so the coarse per-block grant
currently produces the same answer a correct per-attribute check would.
That is not evidence the mechanism is safe; it is evidence today's corpus
doesn't stress it.

**Proposed narrowing (not implemented):** move the check inside the
per-attribute loop and scope it to the SAME reachability analysis SIGNAL 3
already performs — only exempt an attribute if it is referenced exclusively
within the JSX span gated by the "no live preview" condition (the branch
containing the placeholder className), not merely "somewhere in a block
that happens to have both a live-data call and a placeholder className
anywhere." Concretely: reuse `collectFlagGatedJsxGroups`
(`check-editor-render-parity.js`, used by SIGNAL 3) to find the reachable
span for the live-data branch, then only exempt attributes whose only
non-InspectorControls references fall inside that span (or, for a
single-return block like both of these, the whole file — same outcome,
correctly derived rather than accidentally correct).

**What the narrowed fix would still miss:** a block with a PARTIAL preview
(some attrs paint, some don't, gated by the same live-data condition but
inside DIFFERENT JSX branches) would still need per-attribute reachability
tracing rather than a single span — the narrowed version above only fixes
the single-return/single-span case, which happens to be the only shape
observed in this plugin today.

---

## Summary table

| Signal | Pairs | REAL-MISS | CORRECT-EXEMPTION | UNCERTAIN | Verdict |
|---|---|---|---|---|---|
| E2 `providesContext` | 10 | 9 | 1 | 0 | **WRONG** |
| E4 SIGNAL1 non-paint-sink | 56 | 8 | 48 | 0 | **TOO BROAD** |
| E5 SIGNAL2 companion | 29 | 15 | 14 | 0 | **WRONG** |
| E6 SIGNAL3 no-preview Notice | 7 | 0 | 7 | 0 | **SOUND** |
| E7 SIGNAL4 live-data placeholder | 20 | 0 | 20 | 0 | **SOUND (outcome) / TOO BROAD (design)** |
| **Total** | **116** | **32** | **84** | **0** | |

32 of 116 (28%) of the findings hidden by these five signals are genuine
REAL-MISS false negatives, concentrated almost entirely in E2 (90% wrong)
and E5 (52% wrong). E4 is mostly sound with a specific, fixable gap around
JS-driven `data-*` sinks and two unrecognised paint shapes
(`mix-blend-mode`, raw `<video>`/`<img src>` embedding). E6 and E7 are
sound in this corpus; E7's soundness is coincidental (both affected blocks
happen to be unconditional single-return placeholders) rather than
structurally guaranteed, and should not be trusted to generalise without
the narrowing proposed above.
