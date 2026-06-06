---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-06
primary_goal: "Purge the converter's bound-mode CHEAT and replace it with TYPED native emission, fix the gap-wiring + hero-background bugs via line-by-line draft→block mapping, then adversarially-review all .claude docs. The converter script is NOT correct to Spec 22 — it must be fixed, not worked around."
---

# Next session — FIX THE CONVERTER PROPERLY (no cheats, no class-mirroring, verify on the homepage)

> Invoke `/autopilot` first. Then read the MANDATORY READING below IN FULL before doing anything.

## ⛔ THE CONVERTER SCRIPT IS NOT CORRECT TO THE SPEC. IT MUST BE FIXED.

`convert.py` (the cloning converter) does NOT do what Spec 22 says. It mirrors the draft's HTML class/DOM structure into WordPress instead of converting to native SGS blocks, and it uses a "bound mode" cheat to fake good test results. This is the root problem. Do not patch around it — fix it to match the spec.

## NON-NEGOTIABLE RULES (Bean-set; you keep breaking these — stop)

1. **Convert, do not mirror.** The clone must be **native SGS blocks driven by their own attributes** (e.g. trust-bar `items[]`), NOT a div-by-div copy of the draft's classes/DOM. If the output contains draft class names like `sgs-trust-bar__badge` as `sgs/container` blocks, that is WRONG.
2. **No cheats.** "Bound mode" (`sourceMode='bound'`, echoing the draft DOM as `$content`) is a cheat: it makes content *look* cloned while never converting it. Purge it. Lesson: `bound-mode-is-test-cheating-not-conversion`.
3. **Universal, no carve-outs.** A fix applies to every block/case that meets the condition — no per-block, per-tier, or per-"kind" exceptions unless there is universal justification to change the *condition itself*.
4. **No skipping.** Every piece of content and every CSS rule on a draft class/tag MUST transfer to the clone, OR you report exactly what was skipped, per class. Surface the pipeline's leftover-buckets as a readable per-class transfer report.
5. **Verify on the HOMEPAGE against real data.** Re-run `/sgs-clone` (and `/sgs-update` when a block schema changes), deploy, then measure the real rendered page (page 8) with Playwright computed-styles. Never claim "it works" from a test page, from the emit alone, or from an assertion. Compare to the draft's real computed values.
6. **Per-device/responsive values go in the block's responsive attributes**, never inline. Inline beats `@media`, so inline kills responsiveness.
7. **Design-gate sensitive changes** (`/adversarial-council` or `/qc-council`) and get Bean's approval BEFORE building high-blast-radius changes (the shared wrapper, the walker/router).

## MANDATORY READING (in order, in full)
1. `.claude/reports/2026-06-06-bound-mode-purge-plan.md` — the exact, safe, ordered plan to purge bound mode and emit typed. START HERE.
2. `.claude/reports/2026-06-06-container-architecture-rootcause-and-proposal.md` — the container-architecture root cause.
3. Memories: `bound-mode-is-test-cheating-not-conversion`, `composite-mirror-is-separate-from-cloning-fidelity`, `llm-eyeball-clone-verification-unreliable`, `diagnosis-without-delivery-needs-conformance-gate`.
4. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §FR-22-4.1 + §FR-22-21 (the universal procedure the converter MUST implement).
5. The draft: `sites/mamas-munches/mockups/homepage/index.html`. The clone target: page 8 (`--deploy-target page:8`).

## VERIFIED CURRENT STATE (data-checked 2026-06-06)
**On `main`, homepage-verified:**
- `8424d92d` — fold: removes the redundant `__inner` wrapper inside composites (partial — see below).
- `188b007e` — gap-value fix: `"16px 12px"` no longer collapses to invalid `16px12px`.
- `8361f7df` — the two report docs above.

**Deployed to the sandybrown canary, WORKING, but NOT committed** (they share `container/edit.js`; the wrapper fix isn't finished):
- Gap → free input (the shared `SpacingControl` `freeInput` prop). Confirmed in the built bundle.
- `contentWidth` caps a grid (shared wrapper): **desktop correct** (trust-bar caps at 1100 centred, band full-width); **mobile column regression** remains (base grid is emitted INLINE on the inner, so the `@media` 2-col rule can't override it — the inline-vs-responsive bug; per rule 6, responsive columns must be a class/attr rule, not inline).

**Confirmed-broken (fix next):**
- **Trust-bar is still bound** → 4 nested `sgs/container` badge blocks remain. The fold only removed `__inner`. The bound purge (→ typed `items[]`) is what removes them. (Bean's #2.)
- **Gap edit does nothing**: the trust-bar carries BOTH `gap:"0px"` and `style.spacing.blockGap:"16px 12px"`. The editor writes one; the render reads the other. Make it one gap source. (Bean's #1.)
- **Hero background**: only the left content area is the correct surface-pink; a dark pink wraps the section + the right image. The converter's hero mapping is inaccurate. (Bean's #3.)

## TASKS (in order; one fix at a time; verify each on page 8; get Bean's sign-off)

**Task 1 — Adversarial-review the docs (Bean's explicit request, do FIRST).** Run `/adversarial-council` over the docs in `.claude/`, `.claude/plans/`, `.claude/specs/`. Goal: find why the documentation fails to keep a session on-rules and on-goal (it is not enforcing the non-negotiable rules above; sessions read it and still cheat/mirror/skip-verification). Output: which docs to cut/merge/rewrite so the rules are impossible to miss and the long-term goal is unmistakable. Bean is paying for repeated drift — this is the meta-fix.

**Task 2 — Line-by-line draft→block mapping for hero AND trust-bar.** For each: list every draft class, tag, text node, and CSS rule; map each to the block's equivalent attribute; note anything with no home (a gap to fix, never to skip). From these two worked examples, define the converter's processing order + mapping rules. This is the foundation for Tasks 3-4 and fixes the hero dark-pink (#3) and the contentWidth/responsive issues (#4).

**Task 3 — Purge bound mode → typed emission** per `.claude/reports/2026-06-06-bound-mode-purge-plan.md`. Converter emits the block's native attributes (trust-bar `items[]`); remove the bound branches from blocks; PRESERVE product-card `wc-product`/`sgs-cpt` (the live WC configurator, page 589) + content-collection. Re-clone page 8; verify the trust-bar renders natively (no nested containers, native circles, correct labels) AND the page-589 configurator still works.

**Task 4 — Icon identity (follow-on of Task 3).** Map draft icons (raw SVG AND emoji) to the icon block across ALL its icon libraries + emoji libraries — not lucide-only. Build a reverse path→name index + a confidence threshold; on no match, emit the raw SVG, never a silent wrong/default icon.

**Task 5 — Gap wiring (#1).** One gap source, free-input, written to the block's gap attribute, read by the render, with per-device values in the responsive attributes (not inline). Verify editing the gap changes the rendered gap.

**Task 6 — Finish the contentWidth wrapper (mobile) + commit it with the gap-free-input** (they share `container/edit.js`). Emit responsive grid columns as a class/attr rule, not inline, so `@media` overrides work. Verify desktop cap + mobile 2-col on page 8.

**Task 7 — Per-class transfer accounting (rule 4).** Surface leftover-buckets as a readable per-div-class report so nothing is silently dropped.

## TOOLING
`/autopilot` · `/adversarial-council` (Task 1, sensitive-change design gates) · `/systematic-debugging` (root-cause from artefacts) · `/sgs-clone` (`--deploy-target page:8`) · `/sgs-update` (after block schema changes) · `/wp-blocks` + `/sgs-db` (schema before "missing X") · Playwright MCP (homepage computed-style verification, 375/768/1440, cache-bust `?cb=N`) · `/subagent-driven-development` + `/dispatching-parallel-agents` + `/delegate` (heavy edits — the orchestrator stays light + verifies) · `/handoff` (session close).

## DEPLOY / VERIFY QUICK REF
- Blocks/wrapper: `python plugins/sgs-blocks/scripts/build-deploy.py --blocks-only --allow-dirty` → OPcache reset (write `<?php opcache_reset();` to webroot, curl, rm).
- Converter change → re-clone: `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --converter-v2 --mode draft --deploy-target page:8`.
- Canary homepage: https://sandybrown-nightingale-600381.hostingersite.com/ (page 8). Configurator regression page: 589. Creds: `.claude/secrets/sandybrown.env`.
- Commit by EXPLICIT PATH (`git commit -- <paths>`); theme thread shares `main`. No `--no-verify` without Bean.
