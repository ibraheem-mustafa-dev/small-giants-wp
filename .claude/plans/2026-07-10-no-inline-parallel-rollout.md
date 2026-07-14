---
doc_type: phase-plan
project: small-giants-wp
title: "No-inline rollout — PARALLEL edit / serial land (the remaining 35 blocks + 6 reconcile)"
created: 2026-07-10
status: ACTIVE
model: split-edit (parallel worktree sessions) → serial-land (one integration session)
governs: the completion of the universal no-inline styling rollout (Spec 32 / Spec 31 FR-31-22)
---

# No-inline rollout — PARALLEL edit / serial land

## Why this shape (read first)
The **editing** of block files is parallel-safe — each block is its own folder, no two tracks touch the
same source. **LANDED verification is NOT parallel-safe:** it needs the block deployed to the ONE canary
(sandybrown) and rendered on the ONE test page, and `build-deploy.py` ships the **whole** `sgs-blocks`
build — so two sessions deploying at once clobber each other's blocks on the server. Therefore:

- **EDIT phase = parallel.** N sessions, each a disjoint block set, each in its OWN git worktree/branch,
  **files only** — NO deploy, NO harness, NO central-file edits, NO commit to `main`. Each REPORTS its new
  box-object attrs so the integration session seeds them centrally.
- **LAND phase = serial.** ONE integration session merges every track branch, adds ALL `box_family` seeds
  centrally (one edit), builds, deploys ONCE, runs `/sgs-update`, purges, and LANDS every block through one
  big harness manifest, then gates + reports + docs + pushes.

Wall-clock win: the heavy migration (35 blocks) runs across as many parallel windows as you open; only the
~1 integration pass is serial. No deploy-clobber, no corrupted LANDED proof.

## MANDATORY shared how-to (every track + the integrator reads these IN FULL)
- `.claude/plans/block-migration-DONE-checklist.md` — the 11 end conditions (definition of done per block).
- `.claude/plans/2026-07-09-per-block-no-inline-migration-contract.md` — clauses A–G (the HOW, verbatim).
- `.claude/decisions.md` head — D294 (content-KIND→block-private vs section/layout→keep-wrapper), D298 (Wave 2 + STOP-69 + the F3 var()-fallback lesson).
- Spec 31 §3.A/§4/§13.4/§13.6 (FR-31-22 box-object, FR-31-21.1 composite-mirror + D294) + Spec 32 §6.1 — read Spec 31 IN FULL (Bean-locked every session).
- **Exemplars to COPY:** `src/blocks/label` (leaf block-private), `src/blocks/quote` (content-KIND composite → block-private), `src/blocks/hero` + `includes/class-sgs-container-wrapper.php` (section/layout composite → keep-wrapper).

---

## THE SHARED-RESOURCE PROTOCOL (every EDIT track obeys this)
1. **Own worktree/branch.** `git worktree add ../sgs-<track> -b feat/no-inline-<track>` off `main`. Work ONLY in that worktree. (See `/using-git-worktrees`.)
2. **Files ONLY, your block dirs ONLY.** Edit `src/blocks/<block>/{block.json,render.php,edit.js,save.js,style.css,view.js,index.js}` for YOUR track's blocks. Do NOT touch: `scripts/sgs-update-v2.py`, `scripts/hardcoded-render-defaults-baseline.json`, `includes/*` (shared helpers — reuse, never edit), any other block, `build/`.
3. **Dispatch ONE solo Sonnet subagent per block** (disjoint dirs → parallel-safe, FR-31-6.1/STOP-39). Never 2+ writers on a shared file.
4. **Catch JS errors locally.** After edits run `npm run build` in your worktree (build/ is gitignored, local — this catches the STOP-69 `*/`-in-JS-comment trap + parse errors + the prebuild gates). Fix until green. `php -l` each render.php.
5. **NO deploy, NO harness, NO /sgs-update, NO main commit.** Commit block files to YOUR branch only.
6. **REPORT (write to `reports/no-inline-<track>-report.md` on your branch):** per block — files changed; new box-object attrs `(block, attr, family)` for central seeding; flat attrs removed; border decision (quote-route custom `borderWidth` object vs media-route native — both valid); shadow handling; per-item/view.js inline fixes; the block's pattern (block-private vs keep-wrapper) + WHY; any clause you could NOT meet (STOP + report — never guess-wire, esp. a wrapper drop or an F3 row).
7. **Classification is per-block, verified — not assumed.** Use the DB (`container_kind`, `wraps_block`) + the D294 principle + reading the block's own render (does it wrap multiple children / use grid-section machinery?). If a wrapper looks load-bearing, KEEP it and say so. mobile-nav (D298) is the precedent: `container_kind='content'` but a genuine multi-child nav → keep-structure.

---

## THE ROSTER — 35 to migrate (disjoint tracks) + 6 to reconcile

DB-authoritative as of 2026-07-10 (blocks declaring styling supports, not yet fully skip-serialised, minus the 25 done). Re-derive each session — don't trust a cached list: `grep -lE '__experimentalSkipSerialization' src/blocks/*/block.json` for done; a block declaring an *enabled* `color`/`typography`/`spacing`/`__experimentalBorder`/`shadow` support without skip-serialisation is a target.

### Track A — leaf / simple → BLOCK-PRIVATE (8)
`audio, buybox, cart, filter-search, mobile-nav-toggle, product-search, responsive-logo, multi-button`
Pattern: like `label`/`button`. Small support sets; single semantic root or a thin wrapper. multi-button keeps its button children.

### Track B — content-KIND composites → BLOCK-PRIVATE (7, like quote)
`info-box, testimonial, team-member, product-faq, product-faq-item, notice-banner, option-picker`
Pattern: content-KIND (box+width only) → drop `SGS_Container_Wrapper`, semantic element as root, all CSS scoped (exemplar `quote`). VERIFY per block (info-box/testimonial declare `container_kind='content'`). product-faq + product-faq-item are a parent/child pair — do together. STOP-and-ask if any wrapper looks structurally load-bearing.

### Track C — section/layout composites → KEEP-WRAPPER, grid family (8, like hero)
`card-grid, feature-grid, cta-section, gallery, post-grid, google-reviews, trustpilot-reviews, modal`
Pattern: genuine grid/section → KEEP the (already-scoped) wrapper; emit only the block's OWN extras block-private-scoped. cta-section carries `shadow`. modal is `container_kind='section'`, `containerMirror:false` (like mobile-nav — keep-structure).

### Track D — composites with child items + forms + F3 (11)
`accordion, accordion-item, tabs, tab, testimonial-slider, content-collection, trust-bar, pricing-table, form, form-step, form-field-tiles`
Pattern: keep-wrapper composites + parent/child pairs kept TOGETHER (accordion+item, tabs+tab, form+step+field-tiles). **F3-drain in this track:** content-collection, form, pricing-table have hardcoded-defaults baseline rows — drain the REAL dead-control overrides; if a row traces to structural CSS / a safety clamp it is MIS-TAGGED (do NOT force-wire — report it for the `P-F3-NAV-MISTAG-GATE` gate fix). Note the D298 lesson: `var(--x, <literal>)` does NOT zero a baseline row (the literal must move to render.php).

### Track E — product-card → verify pattern (1, complex, own window)
`product-card` — dual-mode (typed/bound), arrayContentLift, imageControls, F3 debt. Give it a dedicated session; `/qc-council` before its commit (touches a lot). Verify block-private vs keep-wrapper per D294.

### RECONCILE bucket — ✅ DONE (D298 reconcile, `ee01c887`, 2026-07-10)
~~button, container, business-info, social-icons~~ — the 4 genuine cases (enabled `color`/`typography` native support without skip-serialisation → auto-inline) are FIXED + LANDED: skip-serialised + scoped, live-curl-confirmed the colour/typography paints scoped not inline (button `#fff/#123456`, container `#abcdef/21px` via the shared wrapper's `extra_classes` seam — no shared-file edit, business-info `19px`, social-icons defensive). `text` + `media` were false-positives (`color:false` = support DISABLED). **Bucket clear.** Residual assurance: the integration session's `audit-inline-styling.js --check` zero-tolerance wire (Task 4) is the belt-and-braces catch across ALL blocks.

---

## THE INTEGRATION / LAND SESSION (serial — run AFTER the edit tracks close)
Prereq: every edit track's branch is committed + its report written. Then, in ONE session on `main`:

1. **Merge every track branch** into `main` (block dirs disjoint → clean merge; resolve any incidental conflict). `git worktree remove` each when merged.
2. **Reconcile-6 audit:** flip the stray enabled `color`/`typography` supports on button/container/text/media/business-info/social-icons to `__experimentalSkipSerialization` + scope them in render; confirm no editor-control regression.
3. **Add ALL `box_family` seeds centrally** in `scripts/sgs-update-v2.py` (from every track's report — one edit, no conflict). Same dict shape as the D298 Wave-2 batches.
4. **Build once** (`npm run build` — prebuild gates), then **re-run the manual gates** (STOP-16): `python check-box-family-guard.py --check`, `python -m pytest converter/tests -q --import-mode=importlib`.
5. **Deploy once** (`build-deploy.py --target sandybrown --skip-build --blocks-only`) → `/sgs-update --stage 1` + `--stage 10` → OPcache + LiteSpeed purge. (`--allow-dirty` REMOVED 2026-07-14: the dirty gate is now scoped to files that ship AND execute. If it fires, READ the paths it lists — don't re-add the flag.)
6. **LAND every block** through one big harness manifest (`no-inline-land-verify.js`) — asymmetric instances at 375/768/1440, zero-inline + computed box; craft dependencies (ToC needs a heading; array blocks need one item; etc. — see the Wave-2 manifests for the recipe). Fix + redeploy any FAIL.
7. **Per block:** `reports/visual-diff/<block>-<date>.md` (repo ROOT, `verdict: PASS` + `first_paint_capture_passed: true`); commit path-scoped.
8. **Task 4 (rollout close):** wire `audit-inline-styling.js --check` (0 inline) + `check-box-family-guard.py --check` into `package.json prebuild` as ZERO-TOLERANCE; **fix `P-F3-NAV-MISTAG-GATE`** (gate attr↔property precision + var()-fallback counting); reconcile Spec 31/32 + CLAUDE.md to "rollout complete"; update `decisions.md`/`state.md`/`next-session-prompt.md`; `/handoff`; push.

## Skills / tools (carry forward)
| Skill/tool | When |
|---|---|
| /using-git-worktrees | each parallel edit track's isolated worktree |
| /dispatching-parallel-agents | the per-block solo Sonnet fan-out inside a track |
| /qc-council | product-card + any composite touching shared render (blub-255) |
| Playwright / chrome-devtools + `no-inline-land-verify.js` | integration LANDED verify at 375/768/1440 |
| Hostinger MCP `hosting_clearWebsiteCacheV1` (user `u945238940`) | LiteSpeed purge before verify |
| `sgs-db.py` (READ) + `sgs-update-v2.py` (--stage 1/10) | DB ground truth + seed/prune (integrator only) |
| REST app-pwd `.claude/secrets/sandybrown.env` | harness auth on page 1356 |
| /handoff /capture-lesson | integration session close |

## Guardrails (do not skip)
- Deploy + (re-clone if attr-shape changed) + purge before measure (STOP-21); emit ≠ LANDED (STOP-44); prove the premise on the real node (STOP-43).
- One solo coding subagent per shared file (STOP-39); QC every composite's wrapper decision vs the DB + D294; never guess-wire an F3 row or a wrapper drop.
- No version bumps, no deprecations (D293). Visual-diff report at REPO-ROOT (STOP-67). Branch discipline: edit tracks on `feat/no-inline-<track>`, land on `main`, commit path-scoped `git commit -- <paths>`.
