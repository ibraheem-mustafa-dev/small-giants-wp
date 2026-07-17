---
doc_type: phase-plan
project: small-giants-wp
phase: Inline-Zero Rollout (framework-wide)
generated: 2026-07-17
---

# Phase — Inline-Zero Rollout (every SGS block → zero inline `style`)

**USP:** Bean's researched no-inline system only half-lands today — ~37 blocks still
inline `style="--var"` + 15 emit empty `style=""`. Finishing it makes every cloned
page's markup clean, browser-cacheable, and consistent with the system he built — the
difference between "mostly no-inline" and "actually no-inline".
**Plan label:** [PLAN: sonnet] (settled design — the pattern is proven on brand-strip;
this is implementation-at-scale, not architecture)
**Docscore:** not run inline (context-preserved for /qc-council + /handoff) — run at execution.
**Aggregate cost estimate:** ~1 Sonnet detector + ~52 Haiku block-edits (mechanical) +
~10 Sonnet residue = roughly £3–6 in agent tokens; ~1 focused session to build the
harness, then bulk runs in waves.

**Phase success criteria (done when):**
- [ ] Spec 32 FR-32-4 amended to FORBID inline `--var` (currently permits it — E in footprint)
- [ ] A detector script enumerates every `sgs/*` block's render surface + live pages for CASE 1/2/3 signatures, outputting a per-block worklist tagged mechanical vs judgment
- [ ] Every mechanical (CASE 1/2) block converted: 0 `style="--` and 0 `style=""` on its rendered root/elements; computed styles unchanged at 375/768/1440
- [ ] CASE 3 residue (native-support auto-inline) converted via skip-serialization + style-engine routing
- [ ] A structural prebuild gate asserts 0 body `style="--"`/`style=""` on `sgs/*` elements across canary pages, so it can't regress
- [ ] `sgs/quote` + `sgs/brand-strip` remain the reference implementations (already zero-inline)

**Entry context (read before starting):**
- `.claude/plans/2026-07-17-no-inline-fix-footprint.md` — THE recipe (cases 1–4, gotchas A–E, scale plan). Read first.
- `plugins/sgs-blocks/src/blocks/brand-strip/render.php` (commit 4926f859) — proven CASE 1 conversion (scoped `.uid{--var}`, no `style` key)
- `plugins/sgs-blocks/src/blocks/quote/render.php` — reference "everything scoped" block
- `plugins/sgs-blocks/includes/class-sgs-css-registry.php` — the consolidator (lifts `<style>` → collected file; already works)
- `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` §6.1(b)/§6.2 + FR-32-4/FR-32-11 — the governing spec

**References:**
- footprint doc (above) — cases + gotchas
- Spec 32 FR-32-4 (permits inline `--var` — the rule to tighten) + FR-32-11 (registry acceptance: "0 body `<style>` tags")
- brand-strip commit 4926f859 — the empirical proof the pattern works live

**Tooling Index:**
| Type | Name | Used in |
|------|------|---------|
| cli | grep / ripgrep | detector (S1) |
| cli | python | detector script + gate (S1, S6) |
| skill | /delegate | per-block model assignment (S3) |
| skill | /dispatching-parallel-agents | Haiku bulk wave (S3) |
| cli | build-deploy.py | verify each wave live |
| external | Playwright / curl | live 0-inline assertion (QA gates) |
| skill | /qc-council | validate this plan (next) |

---

Step 1 — Amend FR-32-4 (forbid inline `--var`)
  Model:       inline
  Action:      Edit `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` FR-32-4: change "Setting a var value inline is permitted" → inline `--var` is FORBIDDEN on the frontend; per-instance values MUST be emitted as a scoped `.uid{--var:…}` rule in the block's `<style>` (consolidated by FR-32-11). Note the one narrow allowance (documented `sgsCustomCss` residual) explicitly, and record the change in decisions.md as a new D-number.
  Files:       .claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md, .claude/decisions.md
  Inputs:      footprint gotcha E; current FR-32-4 text
  Outcome:     Spec forbids inline `--var`; the rollout now has a rule with teeth to enforce against.
  Exec:        SEQUENTIAL (gates everything — the gate + edits enforce this rule)
  Deps:        none
  Marker:      SESSION-START
  Time:        10 min
  Tooling:     Edit
  On-Fail:     Revert the spec edit; the rule stays permissive; do not proceed (gate would have nothing to enforce).
  Cold-Entry:  footprint doc + Spec 32 FR-32-4/FR-32-11
  Test:
    Happy:       grep FR-32-4 shows "forbidden"/"MUST NOT" for inline --var → present
    Edge:        the sgsCustomCss residual allowance is still documented (not over-tightened)
    Fail:        if FR-32-11's "0 body <style>" acceptance conflicts, reconcile wording so both agree
    Integration: decisions.md carries the new D-number

Step 2 — Build the detector script (worklist generator)
  Model:       sonnet
  Action:      Write `plugins/sgs-blocks/scripts/no-inline/detect.py`: (a) static scan of every `src/blocks/*/render.php` for the CASE-1 signature (`$css_vars`→`get_block_wrapper_attributes(['style'=>…])`) + CASE-2 empty-style emit; (b) block.json scan for CASE-3 (native support WITHOUT `__experimentalSkipSerialization`); (c) optional live-page scan (curl a canary page, count `style="--sgs` / `style=""` per `sgs/*`). Output `no-inline-worklist.json`: one row per block tagged `case:1|2|3`, `class:mechanical|judgment`, `has_scoped_style_tag:bool`, `supports_skip_serialization:bool`.
  Files:       plugins/sgs-blocks/scripts/no-inline/detect.py, plugins/sgs-blocks/scripts/no-inline/no-inline-worklist.json (output)
  Inputs:      footprint CASE 1/2/3 signatures; brand-strip (positive control, should NOT appear); quote (should NOT appear)
  Outcome:     A machine worklist that splits the ~52 remaining blocks into mechanical vs judgment.
  Exec:        SEQUENTIAL
  Deps:        Step 1
  Marker:      (none)
  Time:        25 min
  Tooling:     python, ripgrep
  On-Fail:     If the signature over/under-matches, refine the regex against brand-strip (must be absent) + a known un-migrated block (must be present) as fixtures.
  Prompt:      "Write a Python detector at plugins/sgs-blocks/scripts/no-inline/detect.py. It classifies every sgs/* block by how it emits per-instance CSS. CASE 1 = render.php builds a css-vars array and passes it as get_block_wrapper_attributes(['style'=>implode(...)]). CASE 2 = emits an empty style=''. CASE 3 = block.json declares supports.color/spacing/__experimentalBorder WITHOUT __experimentalSkipSerialization:true. Output no-inline-worklist.json rows {block, case, class:mechanical(1,2)|judgment(3), has_scoped_style_tag, supports_skip_serialization}. VALIDATE: brand-strip and quote must NOT appear (already converted). Read .claude/plans/2026-07-17-no-inline-fix-footprint.md for exact signatures. No false-positive on the sgsCustomCss residual."
  Test:
    Happy:       run detect.py → worklist.json lists un-migrated blocks; brand-strip + quote absent
    Edge:        a block using a non-standard var-emit shape lands in `judgment`, not silently dropped
    Fail:        malformed block.json → logged + skipped, not a crash
    Integration: worklist row count ≈ the ~52 estimate (sanity)

QA Gate — detector correctness
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Step 2
  Check:   `python detect.py && python -c "import json;w=json.load(open('.../no-inline-worklist.json'));assert not any(r['block'] in ('brand-strip','quote') for r in w)"`
  Pass:    exit 0; brand-strip/quote absent; every row has a case + class
  Fail:    refine signatures against the two positive controls before any bulk edit
  Marker:  QA

Step 3 — Mechanical bulk wave (CASE 1 + CASE 2) via Haiku agents
  Model:       haiku
  Action:      For each `class:mechanical` block in the worklist, apply the brand-strip CASE-1 edit: push `$css_vars` into `$scoped_css` as `$root_sel.'{'.implode(';',$css_vars).'}'`; drop the `'style'` key from get_block_wrapper_attributes; confirm skip-serialization already true (else route to Step 5). One Haiku agent per block (or small batch), dispatched via /dispatching-parallel-agents in waves of ~8. Rebuild after each wave.
  Files:       plugins/sgs-blocks/src/blocks/<block>/render.php (per block; disjoint — parallel-safe)
  Inputs:      worklist mechanical rows; brand-strip render.php as the exemplar diff
  Outcome:     Each mechanical block's rendered root carries no `style` attribute; values are scoped.
  Exec:        PARALLEL (disjoint files per block)
  Deps:        QA Gate (detector)
  Marker:      (none)
  Time:        ~5 min/block, parallelised → ~1–2 sessions in waves
  Tooling:     /dispatching-parallel-agents, /delegate, Edit, build-deploy.py
  On-Fail:     Per-block: if computed style changes, revert that block's render.php (`git checkout`), re-tag it `judgment`, and move to Step 5.
  Prompt:      "Convert ONE SGS block to zero-inline, exactly like plugins/sgs-blocks/src/blocks/brand-strip/render.php did (commit 4926f859). In <block>/render.php: (1) find the $css_vars array passed to get_block_wrapper_attributes(['style'=>implode(';',$css_vars)…]); (2) instead, push a scoped rule into the block's scoped-CSS array that becomes its <style>: $scoped_css[] = $root_sel.'{'.implode(';',$css_vars).'}'; use the block's existing uid selector variable; (3) remove the 'style' key from get_block_wrapper_attributes (keep 'class'); (4) if the block emits an empty style='' anywhere, remove it. Do NOT touch style.css. Do NOT change any value. Verify block.json has __experimentalSkipSerialization:true on color/spacing/border — if NOT, STOP and report (that's CASE 3, not yours). Output: the diff + a one-line 'scoped, style key removed, skip-serialization confirmed'."
  Test:
    Happy:       rebuild + curl canary page → 0 `style="--sgs` and 0 `style=""` on that block
    Edge:        a block with conditional css_vars (some only set on hover) → all still land scoped
    Fail:        native support re-inlines → caught by "verify skip-serialization" → routed to Step 5
    Integration: computed styles at 375/768/1440 identical pre/post (spot-check 3 blocks per wave)

QA Gate — mechanical wave zero-inline
  Model:   sonnet
  Exec:    SEQUENTIAL
  Deps:    Step 3
  Check:   deploy the wave, then `curl -s <canary> | grep -oE 'style="--sgs[^"]*"|style=""[^>]*wp-block-sgs' | wc -l` for pages exercising the converted blocks
  Pass:    count = 0 for every converted mechanical block; computed-style spot-check unchanged
  Fail:    identify the block still emitting inline; revert + re-tag judgment
  Marker:  QA

Step 4 — SESSION-START: residue triage
  Model:       inline
  Action:      Read the worklist `judgment` rows + any blocks Step 3 kicked back. Confirm each is CASE 3 (native-support auto-inline) vs a bespoke emit shape. Group for Step 5.
  Files:       no-inline-worklist.json (read)
  Inputs:      Step 3 kickbacks; worklist judgment rows
  Outcome:     A clean residue list, each tagged with its exact non-standard shape.
  Exec:        SEQUENTIAL
  Deps:        QA Gate (mechanical wave)
  Marker:      SESSION-START
  Time:        15 min
  Tooling:     Read
  On-Fail:     n/a (read-only triage)
  Cold-Entry:  worklist + footprint CASE 3 + Spec 32 D292 (skip-serialization + wp_style_engine_get_styles pattern)
  Test:
    Happy:       every residue block has a named shape (CASE 3 vs bespoke)
    Edge:        a block that's BOTH CASE 1 leftover + CASE 3 → handled in Step 5, not lost
    Fail:        ambiguous block → escalate to Bean (KJC)
    Integration: residue count + mechanical count = original worklist count (nothing dropped)

Step 5 — Residue conversion (CASE 3 + bespoke) via Sonnet
  Model:       sonnet
  Action:      Per residue block: add `__experimentalSkipSerialization: true` to the relevant supports in block.json; route those values scoped via `wp_style_engine_get_styles($style, ['selector'=>$root_sel])` into the block's `<style>` (the D292/quote pattern); handle any bespoke var-emit by the CASE-1 shape. Rebuild + verify per block.
  Files:       plugins/sgs-blocks/src/blocks/<block>/{block.json,render.php} (per residue block)
  Inputs:      residue list; quote render.php (D294 reference); brand-strip
  Outcome:     Residue blocks emit zero inline style; native supports skip-serialise + route scoped.
  Exec:        PARALLEL (disjoint files) — but Sonnet, lower fan-out than Step 3
  Deps:        Step 4
  Marker:      (none)
  Time:        ~10 min/block
  Tooling:     /delegate, Edit, build-deploy.py, Playwright
  On-Fail:     Revert the block; if the value genuinely can't route scoped (rare), document as a spec exception + flag Bean.
  Prompt:      "Convert ONE SGS block whose native WP supports auto-inline their styles. In <block>/block.json add __experimentalSkipSerialization:true under supports.color/spacing/__experimentalBorder as present. In render.php, read $attributes['style'] and emit the styles scoped: wp_style_engine_get_styles($style, ['selector'=>$root_sel]) appended to the block's <style>. Reference plugins/sgs-blocks/src/blocks/quote/render.php (D294). Do NOT change values. Verify live: rendered root has NO style attribute; computed padding/border/colour identical to before at 375/768/1440."
  Test:
    Happy:       curl → 0 inline style on the block; computed box/colour unchanged
    Edge:        border via CUSTOM attrs (button-style path) vs WP-native (container path) — both handled by box_family, not routing path
    Fail:        safecss-stripped functional colour now survives scoped (gotcha B) — a fix, verify it
    Integration: hover/:responsive tiers still work (they were already scoped)

Step 6 — Structural prebuild gate (anti-regression)
  Model:       sonnet
  Action:      Write `plugins/sgs-blocks/scripts/no-inline/check-no-inline.py` + wire to `prebuild`: fail the build if any `sgs/*` element on the canary pages (or in a fixture render) carries `style="--` or `style=""`. Baseline any legitimate exception (the documented sgsCustomCss residual) explicitly.
  Files:       plugins/sgs-blocks/scripts/no-inline/check-no-inline.py, plugins/sgs-blocks/package.json (prebuild wiring)
  Inputs:      the converted state (should pass); a known-bad fixture (should fail)
  Outcome:     The build blocks any future block that re-introduces inline `--var`/empty style.
  Exec:        SEQUENTIAL
  Deps:        Step 5
  Marker:      HANDOFF
  Time:        20 min
  Tooling:     python, package.json prebuild
  On-Fail:     If it false-positives the sgsCustomCss residual, narrow the matcher (not baseline-dump the finding).
  Prompt:      "Write plugins/sgs-blocks/scripts/no-inline/check-no-inline.py and wire it into package.json prebuild. It fails (exit 1) if any sgs/* block element carries style=\"--\" or an empty style=\"\" — scanned on the canary page renders (or a fixture render of each block). The one allowed exception is the documented sgsCustomCss residual — match it narrowly, do not blanket-allow. Prove it by injecting a style=\"--x:1\" into one block fixture (must fail) and removing it (must pass)."
  Test:
    Happy:       npm run build → gate passes on the converted tree
    Edge:        inject inline `--var` into a fixture → build fails with the offending block named
    Fail:        gate script error → build fails closed (never green on gate error)
    Integration: runs in the standard build-deploy.py path (no separate invocation)

QA Gate — full-page zero-inline + no visual regression
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Step 6
  Check:   deploy; `curl -s <each canary page> | grep -cE 'style="--sgs|style=""[^>]*wp-block-sgs'` = 0; + Playwright computed-style diff on 3 representative pages at 375/768/1440
  Pass:    0 inline SGS style attrs page-wide; computed styles unchanged; editor canvas still styled
  Fail:    name the offending block; route back to Step 3 (mechanical) or Step 5 (residue)
  Marker:  QA

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Move per-instance `--var` values into the collected stylesheet (`.uid{--var}`), accepting the collected file becomes more per-page-specific.
  - **Options:** (A) scoped `.uid{--var}` in the block `<style>` (registry consolidates) / (B) keep inline `--var` (status quo, FR-32-4-permitted) / (C) a wholly new per-page CSS var channel
  - **Recommendation:** A
  - **Why:** Proven on brand-strip; reuses the existing registry; matches quote; the collected file is already per-page (it holds the scoped rules), so this adds no new cache dimension.
  - **Cost of wrong choice:** Low — reversible per block; the registry already handles the `<style>` either way.
  - **Who decides:** Bean (already directed this).

- **Decision:** CASE 4 (core WP blocks inlining their own styles) is OUT of this phase.
  - **Options:** (A) exclude — separate core→SGS migration / (B) include — convert core blocks now
  - **Recommendation:** A
  - **Why:** Core-block inline is WP core behaviour, not SGS's registry scope; bundling it turns a mechanical sweep into a page-restructure. The core→SGS migration tool already owns this.
  - **Cost of wrong choice:** Scope blow-up + risk to page structure.
  - **Who decides:** Bean.

- **Decision:** Does the `sgsCustomCss` residual also move off inline?
  - **Options:** (A) leave it (documented single exception) / (B) route it scoped too (full zero)
  - **Recommendation:** A for this phase, revisit after — Bean asked "does it need to be inline?" (answer: no, but it's the smallest, safest to defer).
  - **Why:** It's one narrow, already-documented channel; converting it is low-value vs the 52-block bulk. Keep the gate allowing it, flag for a follow-up.
  - **Cost of wrong choice:** Negligible.
  - **Who decides:** Bean.

### Pre-emptive decisions (reasoned inline — full Hidden-Decisions peer pass deferred to preserve context; run it at execution if desired)

- **Decision:** What counts as "verified unchanged" per block without eyeballing 52 blocks?
  - **Recommendation:** computed-style diff (getComputedStyle on the block's key elements) pre/post, scripted — not screenshots. Spot-check 3 blocks per wave by eye; trust the computed diff for the rest.
  - **Why:** Extends this session's `extract-css-diff.js` standard; scales to 52 blocks; eye-gate only where cheap.

- **Decision:** Wave size for the Haiku bulk.
  - **Recommendation:** ~8 blocks per wave, rebuild + gate between waves, so a bad signature is caught after 8 not 52.
  - **Why:** Matches the concurrency cap and keeps blast radius small.

- **Decision:** What if a block's var-emit isn't the standard `$css_vars`→wrapper shape?
  - **Recommendation:** the detector tags it `judgment` → Sonnet (Step 5), never force the Haiku mechanical edit on it.
  - **Why:** The mechanical edit assumes the exact brand-strip shape; anything else risks a silent value drop.

---

## Notes for /qc-council (next step)

Validate before dispatch: (1) is the CASE-1 mechanical edit truly identical across blocks, or will var-emit shapes vary enough that "mechanical" is optimistic? (2) does moving `--var` values into the per-page collected file measurably change its cache behaviour / size? (3) is the skip-serialization precondition (gotcha A) reliably detectable statically, or does it need a live render check? (4) the FR-32-4 amendment — does it conflict with any other spec clause that still cites inline `--var` as canonical?
