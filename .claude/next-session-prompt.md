---
doc_type: next-session-prompt
project: small-giants-wp
thread: Indus "Our Brands" is DONE (pending Bean's final full-width eye sign-off). Next: EXECUTE the framework-wide inline-zero rollout using the council-revised plan.
generated: 2026-07-17 (long session — Our Brands to 100% + brand-strip zero-inline proof + inline-zero plan qc-council'd)
---

Invoke `/autopilot` before doing anything else. Read the governing spec (`specs/31-UNIVERSAL-CLONING-PIPELINE.md`) + `specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` in full before touching the converter/wrapper/block-styling surface.

# SGS Indus — Our Brands DONE; next = execute inline-zero rollout

## What shipped this session (all committed + pushed to `main`)
- **Git stash** cherry-picked: hero split hover-zoom, hero `alignfull` (fixed the outer-margin regression), brand-strip touch-pause. Reference diff at `.claude/scratch/2026-07-17-stashed-hero-brandstrip-REFERENCE.diff`.
- **Our Brands section — hero-grade** (page 13, palestine-lives.org): 3 spacing/width root-causes fixed; slider **full-width** (Our Brands group set to flow layout so it fills the teal band at every width); **8 columns** via new **columns-per-device** control (`columnsDesktop/Tablet/Mobile` 8/4/2, container-query `100cqw` driven); **square tiles** + **`tileShape` control** (square/circle/none); tiles **cap** at `--sgs-tile-cap` (maxHeight 200) with **20px gaps** (`logoGap`); logos 200px auto-centre; killed the 10px teal-on-teal invisible border. Commits `4926f859`, `ef51b575`.
- **brand-strip → ZERO inline `style`** (`4926f859`): per-instance `--var` values now emit as a scoped `.uid{…}` rule in the block `<style>` (registry consolidates to the stylesheet), `style` key dropped from `get_block_wrapper_attributes`, native supports skip-serialise. THE proven footprint case.

## ⭐ NEXT TASK — execute the framework-wide inline-zero rollout
Bean's decision: finish Our Brands (done) → extract a fix-footprint (done) → scale the rest with scripts + Haiku (bulk) + Sonnet (residue). Plan was **qc-council-validated; core premise FALSIFIED + revised** — read the revision before executing.

- **Plan (council-revised):** `.claude/plans/2026-07-17-phase-inline-zero-rollout.md` — READ the "⚠ QC-COUNCIL VERDICT" section at the TOP FIRST.
- **Footprint (the recipe):** `.claude/plans/2026-07-17-no-inline-fix-footprint.md` — CASE 1–4 + gotchas A–E.

**Binding corrections from the council (must obey):**
1. **NOT a uniform mechanical edit.** Only brand-strip uses the `$css_vars`→drop-`style` shape. Blocks split by KIND + 5+ emit shapes: (a) `get_block_wrapper_attributes(['style'=>…])`; (b) blocks that KEEP `style="--var"` (button/info-box/icon/testimonial — FR-32-4 permits it today); (c) `SGS_Container_Wrapper`-built roots (hero/container/multi-button — no `style` key; ONE shared-mechanism change, design-gate it). A blind "drop the style key" edit **deletes live vars + breaks blocks**. Bucket by emit-shape; one template per shape.
2. **Detector must be LIVE-RENDER-driven.** block.json is necessary-but-not-sufficient — 30 render.php emit `style=""` independently (mega-menu:208, form:234, testimonial-slider:254). The "~52 un-migrated" count is UNPROVEN — measure live (curl canary pages, grep inline `style` per `sgs/*`). skip-serialization evaluated **per-enabled-feature** (disabled=safe, boolean-`true`=STOP).
3. **Spec amend = 4 clauses**: FR-32-4 + §5 + §6 flow diagram + tighten §8 FR-32-1. (§6.1(e) + Spec 31 FR-31-22.3 already mandate scoped — no converter breakage; cache is sound.)

**First action (≤10 min):** amend Spec 32 (4 clauses) + record a new D-number, then build the live-render detector.

## Open / deferred
- **Our Brands — SIGNED OFF 100% by Bean 2026-07-17.** Full-width slider that caps at 8 columns + centres; square framed tiles (10px border transparent→gold hover, `background-clip:padding-box`); 20px gaps; logos 200px capped; brand-strip zero-inline. Later commits after the handoff was first written: `9cd02f41`, `4926f859`, `ef51b575`, `a760b46f`, `16c47033`. Heading↔separator gap (Spectra's built-in) ACCEPTED, out of scope.
- Whole-page regression sweep (other sections) — NOT started; hero + brand-strip already fixed.
- `/sgs-update` to reconcile `blocks.replaces` DB vs `block-replacements.json`.
- Services 768 overflow (uneven hardcoded px grid columns) — diagnosed, deferred.
- Task 2 (method-brainstorm on why visual discrepancies get missed) — deferred; partially answered live: single-width measurement misses responsive-scaling divergence (the 1440-match trap); computed extract-diff + wide-width checks catch it.

## HARD CONSTRAINTS (carried forward)
- **THE GATE IS BEAN'S EYE.** Screenshot at 375/768/1440 AND full desktop width; clear the CDN (`hosting_clearWebsiteCacheV1`, user `u945238940`, domain palestine-lives.org) before EVERY measure. Show cropped before/after.
- **Deploy blocks-only:** `powershell.exe … python plugins/sgs-blocks/scripts/build-deploy.py --blocks-only --allow-dirty --target palestine-lives`; after build `git checkout HEAD -- plugins/sgs-blocks/includes/lucide-icons.php`. NEVER full-deploy the theme.
- **Editor content on page 13** via `wp.data.dispatch` (Playwright), login user `Claude`. Commit path-scoped, re-check `git branch --show-current` in the same guarded command. Shared worktree.
- **No block version bumps / no deprecated.js** (D270). No-inline DONE bar: `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md`.

## Skills | Agents | MCP
| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/systematic-debugging` | root-cause any regression |
| `/qc-council` | validate fix-shapes before dispatching the bulk (it caught the falsified premise this session) |
| `/dispatching-parallel-agents` | the bulk conversion waves |
| `/sgs-wp-engine` · `/wp-blocks` · `/sgs-db` | block/attr ground truth |

| Agent | When | · | MCP | For |
|---|---|---|---|---|
| `wp-sgs-developer` | block edits + build/deploy | · | Playwright | screenshots + getComputedStyle + page-13 dispatch |
| `design-reviewer` | cropped mockup-vs-clone | · | Hostinger `hosting_clearWebsiteCacheV1` | clear CDN every measure |