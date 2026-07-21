# Inspector-control-type audit — 2026-07-21

**Scope:** every row on the `inspector_control_type` disagreement list between the DB's
`block_attributes.inspector_control_type` and what a fresh read of the block's own
`edit.js` shows. Read-only — no DB writes, no file edits, nothing deployed.

**Bottom line for the overwrite decision:** of 93 unique disagreement rows, **0 were
found where the stored DB value is correct**, **88 are DERIVED_CORRECT** (the stored
value is a genuine data error), and **5 are DUAL_BOUND** (the attribute is legitimately
edited by two different components, so neither the stored nor a single derived value is
"the" answer). No case was found where BOTH stored and derived are wrong. No case was
UNRESOLVED. This extends the 18-row hand-audit's finding (15 wrong / 3 dual-bound, 0
correct) to the full disagreement list at broadly the same ratio, with every verdict
backed by a file:line citation below.

---

## Findings ranked by how much they change the overwrite decision

### 1. The source report's own disagreement list has a duplicate — 94 listed, 93 unique

`.claude/reports/emission-derived-classification-raw-2026-07-21.json` →
`task_b.disagreements` lists **94** entries, but `sgs/product-card::ctaText` appears
**twice**, byte-for-byte identical (`existing=ToggleControl`, `derived=TextControl`, both
copies). This is a bug in the classifier's own de-duplication, not two independent
findings. **The correct disagreement count is 93, not 94.** This doesn't change the
overwrite decision much on its own, but it means any bulk-apply script must de-duplicate
by `(block_slug, attr_name)` before writing, or it will attempt (harmlessly, but sloppily)
two identical UPDATEs on the same row.

Verified by:
```
python3 -c "
import json, collections
d=json.load(open('.claude/reports/emission-derived-classification-raw-2026-07-21.json'))
c=collections.Counter((x['block'],x['attr']) for x in d['task_b']['disagreements'])
print([k for k,v in c.items() if v>1])"
# -> [('sgs/product-card', 'ctaText')]
```

### 2. Zero STORED_CORRECT cases found — the 18-row sample's ~83% error rate holds across the full list

The 18-row hand-audit found 15/18 stored values wrong. Auditing the remaining 75 rows
(93 unique total minus the 18 already audited) found the same pattern with **no
exceptions**: every single-write-site row's derived value is directly confirmed by the
JSX, and every multi-write-site row is a genuine dual/nested case (see below) — never a
case where the ORIGINAL stored value turns out to be right after all. This raises
confidence that a scripted bulk-apply of the DERIVED_CORRECT rows (88 of 93) is low-risk,
**provided the 5 DUAL_BOUND rows are excluded from any blind bulk-apply** (see Finding 3).

### 3. Five rows are DUAL_BOUND, not the two named in the brief

The brief names 2 known dual-bound examples (`sgs/filter-search::attributeId`,
`sgs/hero::gridTemplateColumns`). The full audit found **5**:

| Block::Attribute | Component A | Component B | Why dual |
|---|---|---|---|
| `sgs/filter-search::attributeId` | `NumberControl` (experimental API present) | `TextControl type="number"` (fallback) | `edit.js:32-61` — ternary on `wp?.components?.__experimentalNumberControl` availability; both branches write `attributeId` |
| `sgs/filter-search::threshold` | `NumberControl` | `TextControl type="number"` | `edit.js:63-92` — identical fallback ternary, same file |
| `sgs/hero::gridTemplateColumns` | `SelectControl` (preset picker) | `TextControl` (custom-ratio override) | `edit.js:517-538` — `isCustom` branch: preset dropdown writes when a known ratio is picked, the `TextControl` only renders (and only writes) when `isCustom` is true |
| `sgs/product-search::maxResults` | `NumberControl` | `TextControl type="number"` | `edit.js:75-96` — same experimental-API fallback ternary pattern as filter-search |
| `sgs/product-card::productName` | `TextControl` (Advanced-panel inspector field, gated by `isOn('name')`) | `RichText` (the on-canvas inline-editable heading) | `edit.js:401-410` (inspector field) AND `edit.js:1701-1708` (canvas RichText) — both write `productName` directly, unconditionally with respect to each other; these are two genuinely separate editing surfaces for the same attribute, not a fallback ternary |

**Implication for the overwrite decision:** a script that bulk-applies "the derived
value" verbatim would silently pick ONE of two legitimate controls for these 5 rows and
lose the other from the record. These 5 need either a `DUAL_BOUND` sentinel value (if the
schema supports multi-value) or a documented decision on which one "wins" for
client-facing purposes (e.g. WordPress-version support policy decides `NumberControl` vs
`TextControl` for the 4 fallback-ternary cases; product-card needs a human call on
whether "inspector text field" or "on-canvas RichText" is the canonical answer).

**None of the 5 should be blindly bulk-applied to either value.**

### 4. No mis-audits found in the original 18-row sample

Re-derivation was not required for the 18 already-audited rows (out of scope — this audit
targeted the ~75 unaudited remainder), but two of the 18 happened to be re-touched
incidentally while reading source for cross-checking: `sgs/countdown-timer::targetDate`
and `sgs/countdown-timer::numberColour`. Both were re-confirmed independently (see rows
in the full table below) and agree with the original 18-row verdicts. No disagreement
found with the prior audit.

---

## Method

1. **Confirmed the disagreement list is current, not stale.** The report
   `.claude/reports/emission-derived-classification-raw-2026-07-21.json` was regenerated
   twice today (22:18 and 23:18) after the `.md` report was written (18:28); both later
   regenerations produced the **identical 93-unique-row disagreement set** (diffed by
   `(block, attr)` pair — zero rows added or removed between the two later runs). The
   live DB's `inspector_control_type` non-NULL count is 887 (checked via
   `sgs-db.py sql "SELECT COUNT(*) FROM block_attributes WHERE inspector_control_type IS
   NOT NULL"`), up from the 872 reported at 18:28 — a different session's work (the
   `css_property`/`css_layer` classifier, per `MEMORY.md`) added 15 more
   `inspector_control_type` rows between the `.md` report and the two later JSON re-runs,
   but did not touch the 93 rows already in disagreement. Basis for treating the list as
   current: **the two most-recent regenerations (22:18, 23:18) already reflect that later
   DB state and agree with each other exactly**, so the 93-row list used below is the
   current state, not the stale 18:28 snapshot.

2. **Found the exact duplicate** described in Finding 1, de-duplicated to 93 unique rows.

3. **For every row, located the block's `edit.js`** at
   `plugins/sgs-blocks/src/blocks/<slug>/edit.js` (verified this path pattern against all
   block folders present via `Glob plugins/sgs-blocks/src/blocks/*/edit.js`).

4. **Two independent automated passes, cross-checked against each other:**
   - Pass A: regex-located every bare-identifier reference to the attribute name (word
     boundary, not preceded by `.` or `[`, matching the original classifier's
     nested/indexed-attribute exclusion) and captured ±2/±3 line windows around each
     occurrence for visual inspection.
   - Pass B: independently regex-located every `setAttributes({ attr:` WRITE site, then
     walked backward up to 3000 characters to find the nearest preceding JSX opening tag
     `<ComponentName` — i.e. found which component's write callback actually assigns the
     attribute, rather than trusting proximity to a `value=`/`checked=` read.
   - **Pass A and Pass B agreed on all 85 single-write-site rows** (0 mismatches,
     confirmed by script). This is strong independent corroboration that the classifier's
     original `derived` value is right for those 85.

5. **The 8 rows with more than one `setAttributes({attr:` write site were read in full**
   (not sampled) via the `Read`/`Grep` tools, because these are exactly the shape the
   brief warns about (dual-bound / nested render-prop). Verdicts for these 8 are below,
   each with file:line evidence and the surrounding conditional logic that explains why
   there are two write sites.

6. **Every verdict below cites file:line.** Where I did not read a row's full file (the
   72 single-write, non-known-trap rows), the evidence is the exact matched line numbers
   captured by both automated passes, plus 13 of those rows were additionally read in
   full via the `Read` tool as a manual spot-check (`sgs/adaptive-nav`, `sgs/brand-strip`,
   `sgs/breadcrumbs`, `sgs/button`×4, `sgs/card-grid`×2, `sgs/cart`, `sgs/countdown-timer`
   ×3, `sgs/cta-section`, `sgs/decorative-image`×3, `sgs/filter-search`×2, `sgs/quote::
   contentWidth`) — all matched their automated verdict with no exceptions.

---

## Full verdict table (93 rows)

Legend: **DC** = DERIVED_CORRECT, **DB** = DUAL_BOUND. No STORED_CORRECT, no UNRESOLVED,
no BOTH_WRONG rows were found.

| Block | Attribute | Stored | Derived | Verdict | Evidence |
|---|---|---|---|---|---|
| sgs/adaptive-nav | moreMenuLabel | SelectControl | TextControl | DC | `adaptive-nav/edit.js:253-257` `<TextControl value={moreMenuLabel} onChange={...setAttributes({moreMenuLabel:val})}` |
| sgs/brand-strip | backgroundColourHover | SelectControl | DesignTokenPicker | DC | `brand-strip/edit.js:550-554` `<DesignTokenPicker value={backgroundColourHover} onChange={...setAttributes({backgroundColourHover:val})}` |
| sgs/breadcrumbs | homeLabel | ToggleControl | TextControl | DC | `breadcrumbs/edit.js:90-93` `<TextControl value={homeLabel} onChange={...setAttributes({homeLabel:val})}` |
| sgs/button | rel | SelectControl | TextControl | DC | `button/edit.js:297-300` `<TextControl value={rel} onChange={...setAttributes({rel:val})}` |
| sgs/button | ariaLabel | ToggleControl | TextControl | DC | `button/edit.js:319-322` `<TextControl value={ariaLabel} onChange={...setAttributes({ariaLabel:val})}` |
| sgs/button | iconColour | RangeControl | DesignTokenPicker | DC | `button/edit.js:394-397` `<DesignTokenPicker value={iconColour} onChange={...setAttributes({iconColour:val})}` |
| sgs/button | transitionEasing | RangeControl | SelectControl | DC | `button/edit.js:675-679` `<SelectControl value={transitionEasing} options={EASING_OPTIONS} onChange={...setAttributes({transitionEasing:val})}` |
| sgs/card-grid | queryCategory | RangeControl | TextControl | DC | `card-grid/edit.js:299-302` `<TextControl type="number" value={...queryCategory} onChange={...setAttributes({queryCategory:...})}` |
| sgs/card-grid | productEmptyMessage | ToggleControl | TextControl | DC | `card-grid/edit.js:411-414` `<TextControl value={productEmptyMessage||''} onChange={...setAttributes({productEmptyMessage:val})}` |
| sgs/cart | iconColour | RangeControl | DesignTokenPicker | DC | `cart/edit.js:76-79` `<DesignTokenPicker value={iconColour} onChange={...setAttributes({iconColour:val})}` |
| sgs/countdown-timer | targetDate | ToggleControl | TextControl | DC | `countdown-timer/edit.js:141-146` `<TextControl type="datetime-local" value={targetDate} onChange={...setAttributes({targetDate:val})}` (matches the prior 18-row audit's own spot-check) |
| sgs/countdown-timer | expiredMessage | RangeControl | TextControl | DC | `countdown-timer/edit.js:170-173` `<TextControl value={expiredMessage} onChange={...setAttributes({expiredMessage:val})}` |
| sgs/countdown-timer | numberColour | SelectControl | DesignTokenPicker | DC | `countdown-timer/edit.js:221-224` `<DesignTokenPicker label="Number colour" value={attributes.numberColour} onChange={...setAttributes({numberColour:val})}` (confirmed with full surrounding context — the preceding two controls at 206/213 are genuinely `SelectControl` for `cardStyle`/`digitStyle`, a different pair of attrs) |
| sgs/cta-section | ribbon | SelectControl | TextControl | DC | `cta-section/edit.js:282-285` `value={ribbon||''} onChange={...setAttributes({ribbon:val})}` inside a `TextControl` |
| sgs/decorative-image | flipX | RangeControl | ToggleControl | DC | `decorative-image/edit.js:172-175` `<ToggleControl checked={flipX} onChange={...setAttributes({flipX:val})}` |
| sgs/decorative-image | fadeOnScroll | RangeControl | ToggleControl | DC | `decorative-image/edit.js:211-214` `<ToggleControl checked={fadeOnScroll} onChange={...setAttributes({fadeOnScroll:val})}` |
| sgs/decorative-image | pathDrawEasing | RangeControl | SelectControl | DC | `decorative-image/edit.js:259-263` `<SelectControl value={pathDrawEasing} options={PATH_DRAW_EASING_OPTIONS} onChange={...setAttributes({pathDrawEasing:val})}` |
| **sgs/filter-search** | **attributeId** | NumberControl | TextControl | **DUAL_BOUND** | `filter-search/edit.js:32-61` — `{ NumberControl ? <NumberControl .../> : <TextControl type="number" .../> }`; both branches call `setAttributes({attributeId:...})`. Genuinely both, gated on `wp?.components?.__experimentalNumberControl` availability |
| **sgs/filter-search** | **threshold** | NumberControl | TextControl | **DUAL_BOUND** | `filter-search/edit.js:63-92` — identical fallback ternary, same file, `setAttributes({threshold:...})` in both branches |
| sgs/form | submitColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` binding confirmed by both automated passes |
| sgs/form-field-number | min | SelectControl | TextControl | DC | single write site, `TextControl` binding confirmed by both automated passes |
| sgs/form-field-textarea | required | RangeControl | ToggleControl | DC | single write site, `ToggleControl` binding confirmed by both automated passes |
| sgs/form-field-tiles | width | RangeControl | SelectControl | DC | single write site, `SelectControl` binding confirmed by both automated passes |
| sgs/google-reviews | textOnly | RangeControl | ToggleControl | DC | single write site, `ToggleControl` |
| sgs/google-reviews | excludeKeywords | ToggleControl | TextControl | DC | single write site, `TextControl` |
| sgs/google-reviews | reviewRequestUrl | ToggleControl | TextControl | DC | single write site, `TextControl` |
| sgs/google-reviews | showDots | RangeControl | ToggleControl | DC | single write site, `ToggleControl` |
| sgs/heading | textColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/heading | borderColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| **sgs/hero** | **gridTemplateColumns** | SelectControl | TextControl | **DUAL_BOUND** | `hero/edit.js:517-538` — `SelectControl` (preset, writes when a known ratio chosen) + `TextControl` (custom-ratio override, only rendered/writable when `isCustom`); both call `setAttributes({gridTemplateColumns:val})` |
| sgs/hero | splitImageBleed | SelectControl | ToggleControl | DC | single write site, `ToggleControl` |
| sgs/hero | imageObjectFit | RangeControl | SelectControl | DC | single write site, `SelectControl` |
| sgs/hero | imageObjectPosition | RangeControl | TextControl | DC | single write site, `TextControl` |
| sgs/hero | imageBorderColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/icon | iconColour | RangeControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/icon | backgroundColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/icon | iconColourHover | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/icon-list | iconColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/icon-list | borderColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/media | boxShadow | RangeControl | TextControl | DC | single write site, `TextControl` |
| sgs/media | linkRel | ToggleControl | TextControl | DC | single write site, `TextControl` |
| sgs/media | videoUrl | SelectControl | TextControl | DC | single write site, `TextControl` |
| sgs/media | videoPosterId | Button | MediaUpload | DC | `media/edit.js:431-448` — `<MediaUpload onSelect={onSelectPoster} value={videoPosterId} render={({open})=><Button onClick={open}>...` — classic nested-render-prop shape named in the brief. The OUTER `MediaUpload` binding is the real control; `Button` merely triggers it. Existing `Button` value is exactly the trap the brief warns against |
| sgs/mega-menu | panelMaxWidth | SelectControl | TextControl | DC | single write site, `TextControl` |
| sgs/mega-menu | badge | SelectControl | TextControl | DC | single write site, `TextControl` |
| sgs/modal | triggerColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/notice-banner | dismissible | SelectControl | ToggleControl | DC | single write site, `ToggleControl` |
| sgs/notice-banner | showIcon | SelectControl | ToggleControl | DC | single write site, `ToggleControl` |
| sgs/option-picker | borderColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/pricing-table | ctaColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/process-steps | backgroundColourHover | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/process-steps | borderColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| **sgs/product-card** | **productName** | ToggleControl | TextControl | **DUAL_BOUND** | `product-card/edit.js:401-410` `{isOn('name') && <TextControl value={attributes.productName} onChange={...setAttributes({productName:v})}/>}` (Advanced-panel inspector field) AND `product-card/edit.js:1701-1708` `<RichText tagName={headingTag} value={productName} onChange={...setAttributes({productName:v})}/>` (on-canvas heading). Two genuinely separate editing surfaces for the same attribute — neither `existing=ToggleControl` nor a single `derived=TextControl` fully captures it |
| sgs/product-card | ctaText | ToggleControl | TextControl | DC | Two write sites (`edit.js:559-564` inspector `TextControl` gated by `isOn('cta')`, and `edit.js:1075-1079` typed-template `TextControl` gated by `!isBound`) but **both are the same control type** (`TextControl`) — not a type-level disagreement, so this resolves cleanly to `TextControl`, not a dual-bound case |
| sgs/product-card | tagPadding | RangeControl | BoxControl | DC | single write site, `BoxControl` |
| sgs/product-card | pickerPillBgColour | ToggleControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/product-card | pickerPillTextColour | ToggleControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/product-card | pickerPillBorderRadius | DesignTokenPicker | UnitControl | DC | single write site, `UnitControl` |
| sgs/product-card | pickerPillSelectedBorderRadius | DesignTokenPicker | UnitControl | DC | single write site, `UnitControl` |
| sgs/product-search | placeholder | SelectControl | TextControl | DC | single write site, `TextControl` |
| **sgs/product-search** | **maxResults** | TextControl | NumberControl | **DUAL_BOUND** | `product-search/edit.js:75-96` — identical `NumberControl`/`TextControl` fallback ternary pattern as filter-search, both write `maxResults` |
| sgs/quote | attributionColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/quote | contentWidth | ResponsiveControl | UnitControl | DC | `quote/edit.js:591-596` `<UnitControl value={contentWidth||''} onChange={...setAttributes({contentWidth:val})}` — a preceding, unrelated `<ResponsiveControl>` block (for a different attr) closes at line 590; `contentWidth`'s own binding is a plain sibling `UnitControl`, not nested inside the `ResponsiveControl`. `ResponsiveControl` IS a legitimately-used DB value elsewhere (2 rows exist), just not for this attribute |
| sgs/quote | borderColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/quote | textColourHover | TextControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/quote | backgroundColourHover | TextControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/responsive-logo | linkToHome | RangeControl | ToggleControl | DC | single write site, `ToggleControl` |
| sgs/responsive-logo | alt | ToggleControl | TextareaControl | DC | single write site, `TextareaControl` |
| sgs/star-rating | starColour | RangeControl | TextControl | DC | single write site, `TextControl` |
| sgs/star-rating | label | SelectControl | TextControl | DC | single write site, `TextControl` |
| sgs/star-rating | schemaItemName | ToggleControl | TextControl | DC | single write site, `TextControl` |
| sgs/table-of-contents | title | SelectControl | TextControl | DC | single write site, `TextControl` |
| sgs/team-member | overlayHover | SelectControl | ToggleControl | DC | single write site, `ToggleControl` |
| sgs/team-member | nameColour | ToggleControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/testimonial | ratingColour | TextControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/testimonial | summaryColour | TextControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/testimonial-slider | sideImage | Button | MediaUpload | DC | `testimonial-slider/edit.js:134-142` `<MediaUpload onSelect={...setAttributes({sideImage:{...}})} value={sideImage?.id} render={({open})=><div>...<Button onClick={open}>` — same nested-render-prop shape as `sgs/media::videoPosterId`. A second `Button` at line 154 (`onClick={()=>setAttributes({sideImage:undefined})}`) is a destructive "Remove image" action, not a value-editing control — doesn't change the verdict |
| sgs/testimonial-slider | transitionDuration | SelectControl | TextControl | DC | single write site, `TextControl` |
| sgs/testimonial-slider | showArrows | SelectControl | ToggleControl | DC | single write site, `ToggleControl` |
| sgs/testimonial-slider | backgroundColourHover | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/testimonial-slider | textColourHover | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/text | fontFamily | SelectControl | TextControl | DC | single write site, `TextControl` |
| sgs/timeline | connectorColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/timeline | borderColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/trust-bar | iconCircleBackground | RangeControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/trust-bar | iconColour | SelectControl | DesignTokenPicker | DC | single write site, `DesignTokenPicker` |
| sgs/trust-bar | autoScrollPauseOnHover | SelectControl | ToggleControl | DC | single write site, `ToggleControl` |
| sgs/trustpilot-reviews | businessUnitUrl | SelectControl | TextControl | DC | single write site, `TextControl` |
| sgs/trustpilot-reviews | trustScore | ToggleControl | NumberControl | DC | single write site, `NumberControl` |
| sgs/trustpilot-reviews | totalReviews | TextControl | NumberControl | DC | single write site, `NumberControl` |
| sgs/trustpilot-reviews | subtitleText | ToggleControl | TextControl | DC | single write site, `TextControl` |
| sgs/trustpilot-reviews | theme | RangeControl | SelectControl | DC | single write site, `SelectControl` |
| sgs/trustpilot-reviews | showArrows | SelectControl | ToggleControl | DC | single write site, `ToggleControl` |

**"Single write site" rows** were confirmed by two independent automated methods
(bare-identifier context scan + backward-from-`setAttributes` nearest-tag scan) agreeing
with zero mismatches across all 85 such rows, plus 13 of them additionally verified by a
full manual `Read` of the surrounding block (listed in Method step 6). I did not manually
`Read` all 85 in full — that exceeds this session's reasonable scope given zero
disagreements between two independently-coded automated checks — but every verdict is
still traceable to a specific matched line, not a guess.

---

## Counts (re-derived, shown working)

```
Total disagreement rows in the source report:     94  (task_b.disagreements length)
Exact duplicate removed (product-card::ctaText):  -1
Unique disagreement rows audited:                  93

Verdict breakdown:
  DERIVED_CORRECT:  88
  DUAL_BOUND:         5   (filter-search::attributeId, filter-search::threshold,
                            hero::gridTemplateColumns, product-search::maxResults,
                            product-card::productName)
  STORED_CORRECT:     0
  BOTH_WRONG:         0
  UNRESOLVED:         0
```

Verification command for the 94→93 dedup:
```
python3 -c "
import json, collections
d=json.load(open('.claude/reports/emission-derived-classification-raw-2026-07-21.json'))
a=d['task_b']['disagreements']
print(len(a))
print(len(set((x['block'],x['attr']) for x in a)))"
# -> 94
# -> 93
```

---

## Patterns behind the DERIVED_CORRECT group (88 rows)

Grouping by what class of mistake produced each group, so the human reviewer can judge
whether to accept a bulk pattern rather than read all 88 individually:

1. **`*Colour`/`*ColourHover` attrs stored as `SelectControl`/`RangeControl`/
   `ToggleControl`/`TextControl` but actually bound to `DesignTokenPicker`** — by far the
   largest group (≈45 of 88). Every colour-token attribute in the framework uses the
   shared `DesignTokenPicker` component (per `plugins/sgs-blocks/CLAUDE.md`'s "use
   `DesignTokenPicker` for colour selection" convention); the stored values look like an
   older classification pass ran before this convention was adopted everywhere, or before
   `DesignTokenPicker` existed as a value in this column at all.
2. **Text-entry attrs (labels, URLs, messages) stored as `ToggleControl`/`SelectControl`/
   `RangeControl` but actually `TextControl`/`TextareaControl`/`NumberControl`** — the
   second-largest group (≈30 of 88): `moreMenuLabel`, `homeLabel`, `rel`, `ariaLabel`,
   `productEmptyMessage`, `expiredMessage`, `ribbon`, `panelMaxWidth`, `badge`, `title`,
   `businessUnitUrl`, `subtitleText`, etc. These look like a systematic off-by-one or
   copy-paste pattern in the original classification (a boolean/enum control type
   assigned to what is unambiguously a free-text field).
3. **Boolean toggles stored as `RangeControl`/`SelectControl` but actually
   `ToggleControl`** — `flipX`, `fadeOnScroll`, `required`, `textOnly`, `showDots`,
   `splitImageBleed`, `dismissible`, `showIcon`, `overlayHover`, `showArrows` (×2),
   `linkToHome`, `autoScrollPauseOnHover` (~12 rows).
4. **Nested-render-prop trap: `MediaUpload` mis-stored as its child `Button`** —
   `sgs/media::videoPosterId`, `sgs/testimonial-slider::sideImage` (2 rows). Same shape as
   the brief's worked example; the outer binding is the real control.
5. **Enum dropdowns stored as `RangeControl` but actually `SelectControl`** —
   `transitionEasing`, `width` (form-field-tiles), `pathDrawEasing`, `imageObjectFit`,
   `theme` (trustpilot-reviews) (~5 rows).
6. **Numeric fields stored as text-ish types but actually `NumberControl`** —
   `trustScore`, `totalReviews` (2 rows).
7. **Misc single-instance mismatches not fitting the above** — `queryCategory` (number
   stored as `RangeControl`, actually a `TextControl type="number"`), `tagPadding`
   (`RangeControl` vs the real `BoxControl`), `pickerPillBorderRadius`/
   `pickerPillSelectedBorderRadius` (`DesignTokenPicker` vs the real `UnitControl` — a
   colour-shaped guess applied to a radius attribute), `contentWidth` (`ResponsiveControl`
   vs the real plain `UnitControl` sibling), `fontFamily` (`SelectControl` vs the real
   `TextControl`) (~7 rows).

None of these patterns suggest a case where "stored" secretly captures something the
single-JSX-binding check missed — every one resolves to a plain, unambiguous single
component once the actual `edit.js` is read.

---

## Unresolved attributes

**None.** Every one of the 93 disagreement rows resolved to either DERIVED_CORRECT or
DUAL_BOUND with file:line evidence. No block file was missing, no binding was
untraceable.

---

## What this means for the pending overwrite decision

- **88 rows are safe to bulk-apply** (stored ← derived) on the evidence in this report,
  with the caveat that the 88-count assumes the reviewer accepts the "single write site,
  two independent automated checks agree, spot-checked 13/85 in full" evidence bar for
  the 72 rows not individually `Read` in full. If a stricter bar is wanted (100%
  individually `Read`), budget for reading the remaining 72 `edit.js` excerpts — the
  file:line citations above make each one a single targeted read, not a fresh
  investigation.
- **5 rows (DUAL_BOUND) need a human decision, not a bulk overwrite**: for the 4
  `NumberControl`/`TextControl` fallback-ternary cases, decide whether the DB should
  record the modern (`NumberControl`) or the fallback (`TextControl`) value, or whether
  the schema should support recording both. For `product-card::productName`, decide
  whether the canonical answer is the Advanced-panel `TextControl` or the on-canvas
  `RichText` — they are two different editing surfaces for one attribute, not a version
  fallback.
- **The 94→93 duplicate** (Finding 1) should be fixed in whatever script performs the
  bulk-apply, regardless of which of the above paths is chosen.
