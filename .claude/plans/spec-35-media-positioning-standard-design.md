---
doc_type: design
title: "Media positioning — the explicit-wiring standard, and when auto-injection is legitimate"
status: DESIGNED — not built. Bean approved the design 2026-08-11; build is a separate session.
date: 2026-08-11
supersedes: "go-track-1b-playful-hamster.md Phase 4 item 3 (object position), which was wrong about which control to keep"
---

# Media positioning — the explicit-wiring standard

## Context — why this exists

Phase 4 of the inspector-standardisation programme said, of hero's two object-position
controls: *"keep the crosshair (`image-controls.js`), delete hero's raw CSS text box."*

Grounding that instruction found it backwards, and then found something much larger. The
crosshair is a **universal opt-in extension** that injects a class onto a block's root tag and
relies on CSS selectors to find "the image". Measured across all 15 blocks that opt in, it
works on **2** — and one of those is an accident.

**The client-facing effect is the worst kind of bug:** the editor renders a focal-point
crosshair, the client drags it, and nothing happens. No error, no warning. A control that
lies about what it does.

This document is the replacement standard, the decision rule that prevents a repeat, and the
corrections owed to three governing docs that currently record this capability as DONE.

---

## Part 1 — What is actually broken, measured

### The mechanism

`inject_image_controls()` (`includes/image-controls.php:30`) hooks `render_block`. It checks
`supports.sgs.imageControls` (`:47-57`), bails when no non-default image attrs are set
(`:96-105`), skips any leading `<style>`/`<script>` to find the "real" root tag (`:157-165`),
then **regex-injects** `sgs-has-image-controls` into that tag's `class` attribute (`:184-201`).

It is blind to what is inside. There is no DOM traversal, no per-block hook, no lookup of
where the real image lives.

The CSS (`assets/css/extensions.css:585-616`) is three selector families:

```
.sgs-has-image-controls > img / > video                    (direct child of root)
.sgs-has-image-controls .wp-block-image > img / > video     (never matches — no SGS block emits .wp-block-image)
.sgs-has-image-controls figure > img / > video              (figure's DIRECT child)
```

### The census — 15 blocks declare `imageControls: true`

| Block | Reality |
|---|---|
| `hero` | **WORKS** — `.sgs-hero__bg-img` / `.sgs-hero__video-bg` are direct children of the root `<section>`. Reaches the BACKGROUND layer only; the foreground `.sgs-hero__split-image` is several levels inside `.sgs-hero__media` and is never touched |
| `testimonial` | **WORKS BY ACCIDENT** — the work-image slot wraps `sgs_render_media()`'s bare `<img>` directly in `<figure class="sgs-testimonial__work">` (`render.php:591-593`), so `figure > img` matches. Its avatar and logo slots use plain `<div>` wrappers and do not. One block-level attribute set silently steers one of three slots |
| `decorative-image` | **MATCHES NOTHING** — "NAKED MODE" (`render.php:278-283`): the `<img>` **is** the block root, so the class lands *on* the image. All three selectors need the class on an *ancestor*. The simplest, most obviously-should-work image block in the framework is inert |
| `info-box` | **DEAD OPT-IN** — no `<img>`, `<video>` or `sgs_render_media()` anywhere. Icon-only (Lucide SVG). Declares a capability it has no surface for |
| `product-card`, `card-grid`, `brand-strip`, `responsive-logo`, `before-after`, `trust-bar`, `testimonial-slider`, `gallery`, `team-member`, `timeline`, `image-sequence` | **BROKEN** — image nested 2-4 levels deep. `responsive-logo` is inside `<picture>`, which is not a covered selector. `gallery`'s `<img>` is a great-grandchild of its `<figure>` |

### The second, independent defect: multi-image blocks

`gallery`, `card-grid`, `trust-bar`, `before-after` and `testimonial` render **N images** but
carry **one** set of `sgsObjectPosition` / `sgsMaxWidth` attributes. Even a correct selector
would apply the same crop to every image in the block. There is no per-item targeting
mechanism at all.

---

## Part 2 — The decision rule (the durable output)

Research checked what WordPress core itself does. Core **uses** `render_block` injection
heavily — `wp_render_layout_support_flag()` and `WP_Duotone::render_duotone_support()` are
both `render_block` filters. So auto-injection is not intrinsically wrong.

The difference is that core never *guesses*. Where it advances past the outermost tag, it
matches a class captured from the **block's own parsed `innerContent`** — it is *reading*, not
*assuming*. It also uses `WP_HTML_Tag_Processor`, never regex.

> ### THE RULE
> **Auto-injection is correct when the filter can identify its target from information it
> legitimately owns. It is wrong when it must infer the block's internal DOM shape.**
>
> "Legitimately owns" = the root tag (always identifiable), or a target derivable from the
> parsed block array, `block.json`, or a class the extension itself wrote earlier.

Use auto-injection only if **all four** hold:

| # | Test |
|---|---|
| 1 | Target is the **root tag**, or derivable from `$block` / declared metadata — never "probably the first `<img>`" |
| 2 | Payload is a **class or custom property**, not a computed geometry meaningful only on one specific inner node |
| 3 | Behaviour is **uniform across every block** it applies to — no per-block internal-structure knowledge |
| 4 | Uses `WP_HTML_Tag_Processor`, and any enqueued CSS survives non-standard render contexts (or ships as a static stylesheet) |

Fail any one → **explicit per-block wiring**.

### Applied to SGS's existing extensions

| Extension | Verdict |
|---|---|
| device/conditional visibility, parallax, scroll animations | **PASS 1-3, keep the mechanism.** Root-scoped class/custom-property toggles whose effect is "this block, as a box". Audit only against test 4 |
| `block-link` | **RE-CHECK.** It alters document structure rather than decorating the root — interacts with anchors already inside the block (nested `<a>` is invalid HTML) and with focus order. Independent of its D551 removal |
| `hover-effects` | Passes on mechanism, but **stays deleted** — D551 killed it on demand (zero stored hover attributes across 194 canary pages, positive control 1,706 `wp:sgs/*` openings parsed). Mechanism legitimacy does **not** reopen that ruling |
| `image-controls` | **FAILS TEST 1 OUTRIGHT.** This is the bug |

### Known failure modes of injection, with evidence

1. **Regex mangling** — the HTML API dev article documents `<img title="bears > tigers">`
   becoming `<img title="bears loading="lazy"> tigers">`, greedy matches attaching to the
   *last* tag, and blindness to tag-like text in `<script>`/`<textarea>`.
2. **The filter does not always fire** — `gutenberg#64420`: `render_block` modifications are
   not applied to HTML blocks at template root level.
3. **Context loss** — `gutenberg#39054`: duotone's injection fails under AJAX/REST because the
   *enqueued stylesheet* half never reaches the page. The class survives; the CSS does not.
   Any inject-class-plus-enqueue-CSS extension inherits this.
4. **Ordering** — `render_block` is one priority chain with no arbitration between extensions
   rewriting the same markup.

---

## Part 3 — ⛔ The Block Selectors API is NOT the answer (verified)

This is the obvious-looking wrong answer, and it must be recorded before someone reaches for it.

The `selectors` key in `block.json` (stabilised WP 6.3) routes **Global Styles / theme.json CSS
only**. It does **not** change where an individual block instance's support styles land.

**Verified by exhaustive census**, not a single citation. `wp_get_block_css_selector()`
(`wp-includes/global-styles-and-settings.php:504`) has exactly six callers repo-wide:
`class-wp-theme-json.php`, `global-styles-and-settings.php`, `block-supports/settings.php:108`
(block-level preset *variables* only), `class-wp-duotone.php:985,992`,
`block-supports/states.php:597` (WP 7.1), and its own test.

The block-support functions never see it. `wp_apply_colors_support()` ends at
`colors.php:138-145` building a plain attribute array; identical in `typography.php:251-258`,
`border.php:127-134`, `spacing.php:58`, `dimensions.php`. Grepping those files for `selector`
returns **zero**. Those returns are merged by `WP_Block_Supports::apply_block_supports()`
(`class-wp-block-supports.php:133-150`) into `get_block_wrapper_attributes()` — the root
wrapper, unconditionally.

Confirmed independently by the original dev note
([Make Core, 2023-07-17](https://make.wordpress.org/core/2023/07/17/introducing-the-block-selectors-api/)),
where Aaron Robertshaw states verbatim: *"Block instances, aka. individual blocks, do not use
the selectors API to manipulate the styles applied to inner elements."*

**Carve-outs** (do not over-generalise the rule): duotone genuinely honours
`selectors.filter.duotone` per-instance, and WP 7.1's new `states` support adds a second such
path. Neither is reachable by the colour/typography/spacing/border/dimensions families.
⚠ The canary is on **WP 7.0.2**; 7.1 lands 19 Aug 2026 — re-check `states.php` then rather
than trusting this paragraph.

**Therefore the only supported route to an inner element per instance is
`__experimentalSkipSerialization` + apply the styles yourself inside the block** — which is
already SGS's locked rule (Spec 32 / `wp-native-supports-serialise-inline` / D402). Core's
style-engine docs say blocks opt out "usually in order to do it via the block's internals."
The existing rule is right; this is the authoritative reason for it.

---

## Part 4 — The standard

### 4.1 Precedent: core made this exact move

Block API **v1** auto-injected generated classes into saved markup. **v2 deliberately stopped**
— the handbook states the classes "are no longer added automatically… the block author must
explicitly spread `useBlockProps()` onto their chosen element." Core hit the same wall (the
framework cannot know which element is the real one) and answered with a hook the block
spreads onto its own element.

`useBlockProps` **is** the prop-getter pattern, shipped in WordPress. Aligning 13 blocks with
it is conforming to the API convention SGS is already built on — not inventing anything.

### 4.2 Ecosystem confirmation

No competitor uses auto-injection for this. Kadence, Spectra, Stackable and Otter all wire
explicitly per block (verified by local clone + grep, not code search).

**Stackable is the gold standard** and matches Bean's own instinct:

- `src/components/advanced-focal-point-control/index.js` wraps core's `FocalPointPicker`.
  Props: `attribute`, `responsive`, `hover`, `url`, `label`, `allowReset`, `default`.
- Responsiveness is **declare-once**: an attribute declares
  `imageFocalPoint { stkResponsive: true, stkHover: true, type: 'object' }`
  (`src/block-components/image/attributes.js`) and `expandAttributes()`
  (`src/util/attributes/index.js:142`) permutes it into real tiered attributes
  (`''`/`Tablet`/`Mobile` × hover states). One control with device tabs reads/writes them via
  `getAttributeName( attrName, deviceType, hoverState )`.
- The block-component **declares its own selector**: `styleRule: 'objectPosition'`,
  `selector: \`${selector} img\`` (`src/block-components/image/style.js`).
- **Reuse across 47 blocks is NOT copy-paste.** Only 3 wire it directly
  (`card`, `image`, `posts`). Every other image-bearing block **nests a `stackable/image`
  block** (`feature/variations.js:55`, `team-member/variations.js:70`).

⚠ **Documented absence:** no repo (Stackable included) documents this as a standard other
block authors should copy. It is discoverable only by reading the source. SGS should do better
— see 4.6.

### 4.3 The shape — hook + prop getters

**Not** a wrapper component (reintroduces "shared code decides the DOM" — the original bug).
**Not** 15 hand-rolled copies (drifts within a quarter).

| Layer | Shape |
|---|---|
| **Editor** | `useMediaPosition({ value, onChange })` returns the ready-made control for `InspectorControls` **plus a props object the block spreads onto its OWN `<img>`/`<video>`**. If a block never spreads it, the control never renders — the failure becomes **loud** instead of silent. Wrap core's `FocalPointPicker`; do not rebuild it |
| **PHP** | `sgs_media_position_css( string $selector, array $attrs ): string` — pure, no filter, no injection. `render.php` passes **its own** selector and echoes the result into the block's scoped `<style>`. Keeps Spec 32 compliance (no inline `style`), which the current `render_block` route was always in tension with |
| **Conversion** | Extract the `{x,y}` → `"X% Y%"` maths from `includes/image-controls.php:71-80` (clamp 0-1, ×100, round 2dp, suppress at 0.5/0.5, plus the `:108` regex re-check) into **one** shared function both callers use, so rounding/clamping can never drift |
| **Responsive** | Declare-once. SGS already has the registry Stackable's `expandAttributes` needs: the DB `modifier_suffixes` table. Do **not** hand-declare `Tablet`/`Mobile` per attribute |

### 4.4 Multi-image blocks — the structural answer

There is no clean CSS trick, and core says so. `gutenberg#38899` (focal point for Post Featured
Image) was rejected in the maintainers' words because the focal point *"would apply to all
featured images."*

What core actually shipped was **structural**: the Gallery Block Refactor (dev note, Aug 2021)
rebuilt `core/gallery` from one block owning N images into a thin wrapper around N real
`core/image` inner blocks, specifically so each item carries its own settings. The dev note is
candid that this was a **breaking change to the data model** and that no plugin had solved it
another way. Stackable independently arrived at the same answer.

Ranked, for SGS:

1. **Blocks whose items are (or could be) inner blocks** — put the control on the *item*.
   One image per instance, problem dissolves. **This is Bean's `sgs/media`-as-the-standard
   instinct, and it is the core-sanctioned path.**
2. **Repeaters that must stay a flat array attribute** (e.g. `brand-strip` logos) — store
   position inside each array item and emit one rule per index
   (`… > *:nth-child(3) img { object-position: … }`). Works, but couples CSS to child ordering
   — restrict to genuinely list-shaped blocks.
3. **Never** one attribute set for N images. That is today's bug wearing a new hat.

### 4.5 Hero specifically — two real controls, not a duplicate

Bean's correction to the original Phase 4 text, confirmed by grounding:

- **Foreground split image** — hero's own `imageObjectPosition` / `imageObjectPositionTablet` /
  `splitImageMobileObjectPosition` (`edit.js:1099-1126`, a `TextControl` inside
  `ResponsiveControl`; rendered `render.php:595-605` + `:1052-1054` via
  `$sgs_css_object_position`, `render.php:76`). **Keep and upgrade to a crosshair**, keeping
  its tiers. It is the control that actually works today.
- **Background image/video** — the universal control. Already reaches hero's background layer.
  **Needs tiers** (it has none) and a context-appropriate label.

⛔ The original instruction — delete hero's box, keep the crosshair — would have deleted the
**working, responsive** control and kept the **desktop-only** one.

⚠ Note the wrapper cannot simply absorb this: `container`/`cta-section` render background
*image* as a CSS `::before` `background-image` (`class-sgs-container-wrapper.php:774-803`), where
`object-position` does not apply at all (the lever is `background-position`, currently a
9-preset dropdown at `ContainerWrapperControls.js:144-154`), while their background *video* is a
real `<video class="sgs-container__video-bg">` (`:1109-1142`) with `object-fit:cover` hardcoded
in `style.css:131-138` and **no** `object-position`. Hero renders background image as a real
`<img>` (better for LCP). Two different rendering strategies, no shared helper, and
`container/block.json` declares no `imageControls` while `cta-section/block.json:20` sets it
**false**. "Route hero through the wrapper" is a genuine rearchitecture, not a shortcut.

### 4.6 The gate — the load-bearing piece

> **Fail the build if a block declares `supports.sgs.imageControls: true` but its `edit.js`
> does not call `useMediaPosition` / its `render.php` does not call the PHP helper.**

This is what turns the flag from a **wish** into a **promise the build checks**, and it is
exactly the defect class that produced this whole document: a capability declared on 15 blocks
and verified on none. Model it on the existing prebuild gates (`check-no-inline.py`,
`check-box-family-guard.py`). It must ship with a `--self-test` carrying a positive and a
negative control, and be wired into `prebuild` **in the same commit** — then
`grep package.json` to prove the wiring (this repo's recorded "built and never wired" failure).

Without it we have fixed 15 blocks. With it, block 16 cannot repeat the failure.

---

## Part 5 — Rollout

1. **Build the hook + PHP helper + the gate.**
2. **Convert the 2 accidentally-working blocks FIRST** (`hero` background, `testimonial` work
   image). Counter-intuitive but decisive: they are the only known-good output. If the explicit
   path reproduces their current rendered CSS byte-for-byte, the mechanism is proven.
   Converting a broken block first proves nothing, because anything beats nothing.
3. **Leave the old `render_block` filter running** during rollout, but make it **skip any block
   that has registered explicitly** — one wins, never both. Delete the filter at zero.
4. **Convert the remaining 13 one at a time**, each closed by dragging the crosshair on the
   live page and watching the image move.
5. **`info-box`** — remove the dead `imageControls: true`; it has no media surface at all.
6. **Multi-image blocks** — decide per block between 4.4's options 1 and 2 before converting.

---

## Part 6 — Corrections owed to the governing docs

⛔ **Several of these are false-status claims, not gaps.** They assert DONE for a capability
that is 2-of-15 functional, so they actively mislead.

### `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (ACTIVE v2.0)

| Line | Correction |
|---|---|
| `:352`, `:372`, `:476`, `:496-500` | Records focal point / object-fit as **"BUILT … DONE (Wave 2)"**. False — 2 of 15. Restate with the census. **The doc already contains the falsifying fact at `:210-213`**, where it names `decorative-image` as naked-mode ("the media element IS the block root") — the precise reason the class-injection cannot match there |
| `:352` framing | Only the *size dropdown* is ruled "NOT-FORCIBLE at extension level", on data-availability grounds. The deeper limit is DOM-shape inference, which applies to focal point and object-fit too |
| Part H `:325-340` | Has `focal point → FocalPointPicker` at `:333` but **no row for `object-fit` or `object-position`**, though Part B `:92` and Part C `:106-107` both list them as table stakes. Add both |
| Part L `:395` | Two adjacent checkboxes conflict: *"focal point where relevant"* and *"multi-item data is array-shaped"*. Add the rule from 4.4: positioning attributes must be **per-item** when the media attribute is an array |
| new | No rule anywhere for when auto-injection is legitimate; `hideExtensions` is opt-**out** only. Add Part 2's four-test checklist |
| `:267`, `:487-489` | **VALIDATED** — D402's "nothing adopts a support without the Spec-32 skip-serialisation + scoped-emission pattern" is exactly core's intent. Cite Part 3 as the authoritative reason, and record the Selectors API explicitly as the obvious-looking wrong answer |

### `.claude/plans/spec-35-control-type-contract.md`

| Line | Correction |
|---|---|
| §13 `:1015` | `FocalPointPicker \| 1 site` — that count was the unheard alarm (15 declare, 1 exists, 2 reached). Annotate with the census |
| CO-9 `:1331-1333` | *"Enforced by `audit-feature-parity.py`"* overstates: the obligation is unmet on 13 of 15, so the enforcer checks **declaration**, not **effect**. Same defect class as the bug itself |
| §13 register `:1005-1017` | `object-position` / `object-fit` is **absent**, violating the register's own standard at `:1001-1002` (*"each is either given a contract or recorded as deliberately uncontracted with a reason"*). Add it, contracted to `FocalPointPicker` + tiers |
| `:483-486`, `:1310-1313` | Sharpest existing statement of the extension problem — but frames injection purely as a **visibility** problem (no `extensionsDir` in `inspector-scan`), never a **legitimacy** one. Add the four-test rule |
| `:1307`, `:1505` | `image-controls.js:157` appears only as a *tab-group* defect ("sizing/position is Styles"). The doc audits where its panel renders, never whether its CSS reaches anything |
| §7.2-7.3 `:759-771` | Reuse via prop-presence is the opposite of 4.4's nesting answer; the contract has **no nested-block vocabulary**. §7.5 `:769-771` also anchors scope to the 15 `imageControls` blocks — an unreliable denominator |
| new | **Silent on `skipSerialization`** — a real gap, given `:305` records 27 blocks declaring native `color` and 48 declaring `__experimentalBorder`. Under Part 3 those all land on the block **root** and cannot be routed inward. Live constraint on Phase 2.2 |

### `.claude/plans/spec-35-flat-to-object-migration-design.md`

| Line | Correction |
|---|---|
| `:248`, `:130` | The writer census greps `edit.js` and never names `src/blocks/extensions/`. Extension-written attributes (`sgsObjectPosition`, `sgsMaxWidth` across 15 blocks) are missed **by construction**. Widen the search scope |
| `:98-111` | Tiers are hand-declared per attribute. 4.3's declare-once expansion (Stackable's `stkResponsive`, SGS's `modifier_suffixes`) is an **unexamined alternative**, not a contradiction — record it as an open option before the long tail is migrated |
| `:82`, `:246-252` | **VALIDATED** — "fully flat or fully object, never blended" and the same-commit writer rule are consistent with the framework approach |

---

## Part 7 — Impact on Phases 2 and 3

| Phase | Impact |
|---|---|
| **2.1** extensions → opt-in | **Scope changes.** Device-visibility / parallax / scroll-animations clear the rule — opt-in stays a bloat question for them. But `image-controls` is a **mechanism** failure: making a broken mechanism opt-in still ships a broken control. It must be replaced, not merely re-scoped. 2.1 can no longer treat all extensions as one uniform inversion |
| **2.1** | The plan's *"the declaration becomes the enforcement roster"* upgrades to 4.6: make it a **build-checked promise** |
| **2.2** native supports | **Validated** (Part 3) — keep supports declared + `skipSerialization` + own the CSS is core's own intent. **New constraint:** 27 `color` + 48 `__experimentalBorder` blocks land on the root and cannot be routed inward. Grep the specs for any assumption that `selectors` could do it |
| **3.2b / 3.3** | `ContainerWrapperControls` — the multi-attribute façade blocking the single-value column — **is** the headless-hook/prop-getter pattern. Supports the `control_owner` column direction. For 3.3, Part 2's four tests are a candidate basis for the composition-shape detection that must replace the hardcoded 16-name tuple, and align with the existing rule *detect a control by what it does, not its component name* |

---

## Open questions — NOT decided

1. **Per-block label mechanism** — how does a block tell the shared control to say "Background
   image position" instead of a generic default? A prop, or a `supports.sgs` string? Must not
   be a hardcoded per-block branch inside the shared file.
2. **Which multi-image blocks nest vs index** (4.4 option 1 vs 2), per block.
3. **Does `sgs/media` become the nested primitive** for images the way `stackable/image` is?
   Bean's stated instinct says yes. Scope and migration cost unestimated.
4. **Background-media rearchitecture** (4.5 ⚠) — whether `container`/`cta-section` ever move
   from `::before` background-image to real `<img>`. Out of scope here; it is the prerequisite
   for hero routing through the wrapper.

## Verification

- Gate ships with `--self-test` (positive + negative control) and is wired into `prebuild` in
  the same commit; `grep package.json` proves the wiring.
- Each converted block closed by **dragging the crosshair on the live canary page** and
  observing the image move — not by reading the emitted CSS.
- The 2 known-good blocks must reproduce their current rendered CSS **byte-for-byte** after
  conversion.
- Per-block visual-diff report bound to `source_sha` (the existing gate already enforces this).

## Sources

Core: Block API v2 handbook (`useBlockProps`); Gallery Block Refactor dev note (Aug 2021);
`gutenberg#38899` (featured-image focal point rejected); `gutenberg#64420`; `gutenberg#39054`;
`gutenberg#16471`; [Selectors API dev note](https://make.wordpress.org/core/2023/07/17/introducing-the-block-selectors-api/);
[block-selectors handbook](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-selectors/);
[The HTML API: process your tags, not your pain](https://developer.wordpress.org/news/2023/09/the-html-api-process-your-tags-not-your-pain/).
Ecosystem: Stackable (`gambitph/Stackable`), Kadence (`kadencewp/kadence-blocks`,
`stellarwp/kadence-components`), Spectra, Otter (`Codeinwp/otter-blocks`) — local clones,
grepped. ⚠ GenerateBlocks has **no public repo** (both candidate paths 404) — unexamined.
Pattern: Martin Fowler, *Headless Component* (Nov 2023); Kent C. Dodds, prop getters (Downshift).
