---
doc_type: session-archive
project: small-giants-wp
archived: 2026-08-23
note: "Swept verbatim from LEDGER.md when Phase 3 Wave A closed and the file went over its 24,576-byte cap. Phase 1 + Phase 2 of the shop-archive container remediation are CLOSED (D742); this is their narrative. The LIVE front is Phase 3 — see LEDGER.md."
---

# Shop-archive track — Phases 1 & 2 (CLOSED 2026-08-22, D742)

**All pushed to `origin/main`. Build GREEN. Canary deployed and live-verified.**

**PHASE 1 AND PHASE 2 ARE BOTH COMPLETE.** Wave 1 + Wave 2 + R-3 all shipped; QC Gate 2
closed by the colour-golden track against Bean's behavioural test (swatch picked in the
editor, computed style confirmed on the frontend at rest AND under a real pointer hover,
with a negative control). Phase 2's four remaining steps (P2-2/P2-4/P2-5/P2-7) closed
2026-08-22 — see D742 for the full write-up. QC Gate 3 and QC Gate 4 both closed live.
Per-step detail is single-sourced to the plan doc, not duplicated here. **Phase 3 (the
per-template pass) is the only work left in this plan and has not been started.**

### Shipped this session (2026-08-21)

- **Container/width session (same day).** One cap per page (`c984a676`); the EDITOR now renders
  the `.sgs-container__inner` band it had styled but never created, so band controls finally
  move the canvas (`921954fc`; 7 banded / 4 unbanded, exactly tracking `contentWidth`);
  archive-product's WC blocks made valid (`a47e76f2`, `426d3d42`); `build-deploy.py` purges BOTH
  cache layers — the OPcache reset both CLAUDE.md files claimed existed did not (`32315c37`);
  4 dead template-part slots deleted (`0413f76e`); P2-6 residual closed (`7636397d`).
  D719-D721, D725, D726.

- **Shop filter UI rebuilt.** Accordion (`<details>`/`<summary>`) collapses the filter groups:
  panel 1154px → 505px, which is what finally made `position:sticky` work — held at its 24px
  offset through a 300px scroll. ⚠ Both figures are LIVE-DOM measurements with no repo
  artefact: 1154 is the colour-golden track's pre-accordion reading, 505 is this session's
  post-accordion one. Re-measure rather than cite them if they matter. The height-cap approach the other track measured as
  inert stayed inert; shortening the CONTENT was the load-bearing fix.
- **Ten review defects fixed** — nine enumerated in `4da95b46`'s own message, plus the
  heading band (`451aae75` + `9a0347aa`), which Bean raised separately. Verified live at
  1440 and 390. (Stated as 9+1 because the commit enumerates nine; the tenth is its own
  commit pair.)
- **`<main>` landmark restored sitewide.** ALL NINE templates authored `tagName:"main"` and
  ZERO pages rendered one — `main` was absent from both the block.json enum and the wrapper
  allowlist, so every page silently fell back to `section`. Now allowed with a per-request
  singleton guard: first claim wins, any later one falls back. Reverses an earlier deliberate
  removal without reopening the footgun it closed (a client duplicating a container).
- **`sgs/site-footer` migrated off WordPress's native colour path** — the last block on it —
  atomically with its 7 theme authorings, so no window existed where a pattern was half-migrated.
- **`sgs/cta-section` colour attrs renamed to British** + its 11 client authorings (PR #35).
- **THEME ASSETS WERE BEING SERVED STALE** to any warm browser cache, and had been for a long
  time: every theme CSS/JS URL carried the theme version, which is never bumped, so an asset
  deployed between releases kept an identical URL. Same URL returned 10,199 fresh bytes vs
  5,079 cached. Now versioned by `filemtime` (`d3e98700`). A server cache purge does NOT fix
  it. ⚠ Re-test anything theme-side you judged before that commit.

### ⛔ A container capability gap, still open — NOT the same thing as Phase 2 (which is closed)

**Distinct from P2-2/P2-4/P2-5/P2-7 (D742, closed) — this is a separate, still-unresolved
limitation, not the same work under a different name.** `sgs/container` injects `.sgs-container__inner` carrying `max-width` ON ITSELF. Core instead
emits `.is-layout-constrained > :where(:not(.alignfull)) { max-width: … }` — capping CHILDREN,
excluding `.alignfull` by name, at zero specificity. Ours therefore cannot express "full-bleed
child of a constrained parent" at all; unconstraining `<main>` was a workaround, not the answer.
Confirmed independently by three research legs against fetched theme markup and core's own
PHPUnit stylesheet assertions. Full findings + ruled-out options in the research file.
⚠ `sgs/container` emits NO `.is-layout-constrained` class, so `useRootPaddingAwareAlignments`
cannot help for free — that option is weaker than it first appears, not stronger.

### P2-6 rename — status corrected

The other track's note below says `sgs/site-footer` (7) and `sgs/site-header-row` (3) must NOT
be renamed until those blocks leave the native colour path. That was right, and this session
satisfied it: site-footer was MIGRATED and renamed in one commit; site-header-row was renamed
because it already declared only the British name and its 3 authorings were writing an
attribute WP discards. Their warning is met, not violated.

### Corrections made to my own claims this session

1. **D338 is only half true** (their D704): WP drops undeclared attrs from the EDITOR schema
   but PHP does NOT drop them before `render.php`. Several blocks read
   `$attributes['backgroundColor']` anyway to re-add `has-*` classes. So of 21 authorings
   renamed, 16 were genuinely dead and **5 were already painting**. The renames still stand
   (canonical `sgs_colour_value()` path) but were not all fixes.
2. **"cta-section backgrounds are dead" — WRONG.** It declares those attrs explicitly, so WP
   registers them regardless of `supports.color.background`. Consistency work, not a repair.
3. **"The client's tokens are inconsistent" — WRONG, retracted.** `primary` is the brand
   colour, `primary-text` is the text that sits on it. Nothing to fix in the snapshot.
4. **A rule that loses is indistinguishable from a rule that is absent.** Two deploys "did
   nothing" because my selector was (0,1,0) against an existing (0,2,0). Fix the rule that
   already OWNS the element; never add a competing one.

### Methodology guardrails (do not skip)

- **Deploy before measure.** A test against a live URL before deploying measures stale output.
- **A cached page is not a measurement.** Always cache-bust.
- **Measure with the flag the gate is actually wired with** — several scripts exit 0 without
  `--check` and 1 with it.
- **Enumerate, don't reason.** Every figure reasoned to was wrong; every figure derived by
  listing the items was right.
- **Never regenerate `attr-role-map.json` on a shared worktree** without `/sgs-update` first.
- **/qc multi-rater before any commit** touching converter / pipeline / SGS block logic.
- **A dead selector fails silently.** Five times this session, CSS targeted markup WooCommerce
  had changed; an unmatched selector looks exactly like a missing one. Verify against the LIVE
  DOM, never the stylesheet.
- **Two owners for one element is the defect** — correct the owning rule, delete the challenger.
- **Shared worktree:** commit path-scoped (a repo hook enforces it) and never trust a
  subagent's "not my block" attribution while another session is committing.

## Decisions taken (BINDING — do not re-litigate)

| # | Decision |
|---|---|
| **D-1** | A background fills its container's own box and must NEVER be capped by content width. |
| **D-2** | `layout` default → `flex`; `flexDirection` stays `""` → **`row`** (CSS default). **SHIPPED 2026-08-22 (D742).** |
| **D-4** | Orphan colour authorings get full `SgsColourPanel` standardisation — bg + text, normal + hover, gradient setup 1 for background / setup 2 for text. |
| **G2** | Container root colour routes through `SGS_Container_Wrapper`. Rule 7 satisfied. |
| **Colour** | White-on-pink is Bean's brand call. Per-client only; the framework default stays compliant. |
| **Grid** | Column floor exposed as `minColumnWidth`/`minColumnWidthUnit`, not hardcoded — **SHIPPED 2026-08-22 (D742)**. Framework default stays the prior `16rem` (≈256px) fallback when the client sets nothing. |
| **Filters** | Mobile = slide-up sheet, one DOM / two presentations. Scrollbar STYLED, not hidden — a filter panel has no other affordance, unlike the carousels. |
| **Canary** | Canary content is a test rig. A regressed test page gets deleted, not protected. |


