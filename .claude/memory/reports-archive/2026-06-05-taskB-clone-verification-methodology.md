---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Task B — why clone-verification missed ~85% of defects, and the deterministic fix"
created: 2026-06-05
audience: next session (acting on this) + Bean
---

# Task B — Clone-verification methodology: the miss, and the deterministic fix

## Part 1 — How many of Bean's 32 points did the in-session investigation identify?

**~3–4 of 32 cleanly (~10–13%).** Caught: #6 (featured heading centred), #26 (announcement-bar), and *partially* #1 (container nesting — but mis-framed) and #18 (notice-banner — and the council's "content present" was misleading vs Bean's "looks nothing like the draft"). The 3-persona adversarial council added the responsive failures (H1/trust-bar/products at 768/375) — real, but still a fraction.

**Bean's single manual pass found 32. Multiple LLM agents across multiple viewports found ~4.** That ~8× gap is the finding. It recurred all session: every "live-verified" claim was a handful of elements at one viewport (1440), missing other elements, other viewports, and whole property classes.

### Why LLM-eyeball verification fails (root causes of the miss)
1. **Non-exhaustive by construction.** An LLM "looking at the page" samples a few elements it thinks to check. It cannot mechanically guarantee *every* element × *every* property × *every* viewport is compared. Bean's eye sweeps the whole page; the LLM checks what it remembered to query.
2. **Viewport-incomplete.** Default checks ran at 1440; 768/375 were skipped or shallow (STOP #46). Half the defects are responsive.
3. **Property-incomplete.** Checks looked at the ONE property just "fixed" (e.g. font-size) and not the siblings (alignment, colour-muting, padding, border-radius, button-fill, image-fit) — the exact measurement-vs-eye failure mode (`~/.claude/rules/measurement-vs-eye.md`).
4. **Confirmation bias.** After building a fix, the agent queries to confirm it, not to refute the whole section.
5. **Inconsistent run-to-run.** Two LLM passes find different subsets — no reproducibility.

## Part 2 — The fix: a deterministic per-element draft-vs-clone computed-style differ (remove the LLM from DETECTION)

The owner's own global rule already prescribes this (`measurement-vs-eye.md`: "if the comparison is repeatable, scriptable, and involves the user's eyes scanning rows of values — write the script"). We never built it for clone fidelity. Build it:

### `scripts/clone-parity.js` (Node + Playwright — NO LLM in the detection loop)
1. **Element correspondence by SGS-BEM class.** The clone preserves the draft's BEM classes (`.sgs-hero__content`, `.sgs-products`, `.sgs-trust-bar__inner`, …). So for each draft element, the corresponding clone element is the same selector. Build the pair list by walking the draft DOM and matching the clone DOM by class/structural path. Flag any draft element with NO clone counterpart (a dropped element — e.g. announcement-bar content).
2. **Fixed extended property set per element** (the measurement-vs-eye extended set — no element-specific judgement): `font-size, font-family, font-weight, line-height, letter-spacing, text-align, color`; full background family (`background-color, background-image, background-size/position/repeat`); `padding(4), margin(4), border(width/style/color), border-radius`; `display, grid-template-columns, gap, justify-content, align-items`; `width, max-width, min-height`; `box-shadow, opacity, filter`; for `<img>`: `naturalWidth, clientWidth/Height, object-fit` (catches 404s + fit + height-mismatch).
3. **Three viewports** (375, 768, 1440), fonts-loaded gate, lazy-images scrolled into view.
4. **Diff with tolerances** (colour ΔE ≤ small; px ≤ 1; enums exact) → per element×property×viewport: `PASS | FAIL(draft=X, clone=Y)`. Output structured `clone-parity.json` + a human per-section table (PASS/FAIL chips). Missing-element = FAIL.
5. **Run from the draft local server vs the live canary** (the same draft-vs-clone harness the measurement-vs-eye rule describes).

### Integrate as a pipeline stage
- Add **Stage 11b — computed-style parity** beside the pixel-diff. Every `/sgs-clone --deploy-target` run auto-produces `clone-parity.json`. The pixel-diff stays (informational, FR-22-18); parity is the *element-level* truth.
- **The LLM's role shrinks to reading the FAIL list + root-causing** — it no longer DETECTS. Detection is deterministic, exhaustive, reproducible.

### Why this would have caught Bean's 32
- Container double-nesting (#1/#4): the parity walker finds an *extra* `.sgs-container` with no draft counterpart, and the trust-bar inner-grid column-count mismatch — both structural FAILs.
- Heading alignment (#6/#13/#19/#22): `text-align` FAIL per heading.
- Button-fills-container (#9/#23): `background-color` + `width` FAIL on the button/its wrapper.
- Rounded corners (#10), image heights (#11), image fit (#12D), borders (#11/featured): `border-radius`/`clientHeight`/`object-fit`/`border` FAILs.
- Padding/gaps (#3/#8/#14/#17/#20/#24): `padding`/`gap`/`max-width` FAILs.
- text-muted-too-light (#7): `color` exact compare (settles the perception deterministically).
- Default-star icons + missing circle (#5/#15): missing/!= `background`/content element FAIL.
- Notice-banner content (#18): missing-element + text FAIL.
- All responsive (the 768/375 misses): every property is checked at 3 viewports.

### Artefact/log usability improvements (so they're trustworthy + easy to use)
- **`clone-parity.json` + a one-page `clone-parity.html`** (per-section PASS/FAIL chips, draft-vs-clone values side by side) — the single source of truth for "did the clone match", replacing LLM eyeballing.
- **Report body-only pixel-diff** (exclude header/footer chrome) so the headline number isn't inflated by the 87–96% header/footer regions (the 55.2% mean was misleading).
- **`leftover-buckets.json` is good** (trust it) but add a per-element parity cross-link so a FAIL maps to its converter/block/CSS owner.
- **Reduce LLM usage**: the deterministic harness is the gate; the LLM reads FAILs. This lowers room for error/step-skipping and is consistent run-to-run — exactly the owner's Task-B requirement.

## ⚠ ADVERSARIAL-COUNCIL VERDICT (2026-06-05): NO-GO as specified — honest coverage ~55-65% basic / ~70-75% robust (the "~90%" below was invented)
The feasibility-skeptic found four unproven integration assumptions, each of which alone breaks the coverage claim. **Prove these in a short spike BEFORE building:** (1) BEM+structural-path correspondence actually pairs correctly on the real clone HTML — WP injects `wp-block-*` wrappers, the double-container yields two `.sgs-container`, and composites render as `sgs/container` *wearing* the BEM class → **false-PASS on every composite defect until Method-2 routing exists** (write a 20-line pairing script, test on hero/products/announcement-bar sections first); (2) draft images 404 locally → all image checks silently skip (so #11/#12D are NOT covered basic — quantify the skip rate); (3) canary computed styles resolve from `wp_global_styles` post-7, NOT the draft CSS-vars → token noise-FAILs need a reconciliation step (NOT in the spec — extract+diff both token baselines); (4) prove the 40+-FAIL first-run triage is bounded (dry-run a synthetic FAIL list). **Build BASIC first** (skip font-load + global-styles reconciliation; cap coverage ~55-60%; treat run 1 as CALIBRATION not ground truth); extend to robust only after a verified first run on page 144. **Residual it can NEVER catch:** converter routing (symptom not cause), JS-interactive/slider, a11y/semantics, text-content completeness, font-render fidelity, perception-gestalt — do not over-trust the tool. The amendments below are still correct + necessary, but they raise coverage to ~70-75% (robust), not 90%.

## QC amendments (multi-agent QC, 2026-06-05 — fold these in BEFORE building; raise robust coverage toward ~70-75%, NOT ~90%)

The proposal QC'd at **B- / GO-WITH-AMENDMENTS** (not as-specified). Six load-bearing amendments:

1. **Correspondence must be structural-path-aware, not BEM-class-only.** The double-container bug (#1/#4) means both draft and clone have `.sgs-container` — a class-match pairs the WRONG one and hides the structural FAIL; and a composite emitted as a generic container still carries `.sgs-hero` on its `className`, so class-match gives a misleading PASS. Algorithm: BEM-class match first → if absent in clone = FAIL(dropped) → if ambiguous (multiple, e.g. `.sgs-container`) fall back to normalised DOM-path proximity. **Skip `wp-block-*` wrapper divs** in the clone when walking (WP block render wrappers have no draft counterpart).
2. **Font-LOAD verification** (the biggest invisible miss): `getComputedStyle().fontFamily` returns the CSS value, not the rendered typeface — a failed `@font-face` falls back silently and still PASSes. Add `await document.fonts.ready` + compare the `[...document.fonts].filter(f=>f.status==='loaded')` family set draft-vs-clone. Missing font in clone = FAIL.
3. **Image-404 guard:** if `draft.naturalWidth===0` (draft image 404s on the local server), SKIP that element's dimension diff (the draft is broken, not the clone) — else every image is a false FAIL.
4. **Element-count-by-role diff per section** (heading/image/button/badge counts + first-BEM-child nesting depth) — catches the slider→grid substitution (#32-area), dropped elements (announcement-bar #26), and the double-container depth mismatch, which pure computed-style diffing misses.
5. **Concrete ΔE thresholds:** ≤2 for text/interactive/brand colours, ≤5 for large decorative areas (so #7 "looks lighter" is settled deterministically, not re-tuned loose).
6. **Add `vertical-align`, `text-decoration`, `font-variant`** to the property set (superscript price-note #11d, sale strikethrough, small-caps).

**Residual the harness will STILL miss (next session should know):** deep interactive/JS-store UX (slider behaviour beyond element counts), cross-browser gradient parsing (mitigate with a per-element screenshot-crop pixel-diff fallback), and golden-master regression (add a golden-master mode: after Bean R-22-13 sign-off, snapshot `clone-parity.json` and diff future re-clones against it, not just the ambiguous draft). **Triage rule for the LLM root-cause pass:** group FAILs by property-class and root-cause by group, not per-item, so a 40-FAIL first run stays bounded.

**Effort:** basic class-match version ~3-4 hrs (~60% coverage); robust version with the 6 amendments 1-2 sessions (~90%).

## Bottom line
The pipeline's *transfer mechanics* are improving, but **verification was the weak link** — it relied on an LLM looking at a page, which is non-exhaustive and inconsistent. Build `clone-parity.js` (deterministic, per-element, 3-viewport, extended property set) as Stage 11b; the LLM then only root-causes a mechanical FAIL list. This is the highest-leverage process fix in the whole programme: without it, every "fixed" claim is untrustworthy (as this session repeatedly proved).
