---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-07-17
generated: 2026-07-17 (P4 — collapsed state.md + handoff.md + next-session-prompt.md into this one LEDGER)
note: "THE single living-status doc. Replaces the old 3-way split (state/handoff/next-session-prompt) that drifted and overwrote each other. Current status is REPLACED here each session, never appended (that is how state.md ballooned to 66KB). History → dated snapshots in memory/session-YYYY-MM-DD.md (the ledger-rotate Stop hook backs this up). Structural defences (STOP catalogue + pre-flight ritual) live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24576 bytes — the rotate hook warns past that)."
---

# small-giants-wp — LEDGER (the one living status)

## ⭐ FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next," so a fresh session
(or you) gets ONE true answer instead of three drifting ones. It replaces the old three
docs (state / handoff / next-session-prompt) that kept contradicting each other.

**Where we are (2026-07-17).** Two things run in parallel:
1. **The website builder itself** — the header/footer/nav system + the drawer menu are built
   and LIVE on both your test site (sandybrown) and the Indus site (palestine-lives). The
   last real product work (Phase 2 nav/logo fixes + the disclosure drawer) shipped and was
   merged to the `main` line. A few small polish items and the Indus header/footer match are
   still queued (below).
2. **A tidy-up of how the project is run** — a signed-off plan
   (`plans/2026-07-16-setup-simplification-and-protocol.md`) is culling cruft and adding
   automatic guard-rails so the AI needs less babysitting. We are on **P4** of that plan
   (this doc IS P4's deliverable). One phase per session by rule.

**Why it matters.** You are QC-only on the framework; every drifting doc or missing guard-rail
is time you have to spend catching mistakes. Collapsing to one ledger + adding the guard-rails
is directly buying down that tax.

**Your single next action.** Nothing is blocked. Two independent fronts to pick from: the
**product** front — the drawer link-colour polish (a 5-minute fix) at the top of the "Product
queue" below, then the Indus header/footer match; or the **setup** front — **P3glob** (the
rest of the global hook edits, a separate session needing your global mini-sign-off). P4 (this
doc's collapse + the ledger-rotate hook) is done and live on main.

---

## Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main`. **HEAD:** `d3967a2c` (merge of `feat/adaptive-nav-dialog-drawer` +
  `feat/core-block-migration` + P1/P2/P3proj). **D-ceiling:** **D342**.
- **Canonical spec:** `specs/31-UNIVERSAL-CLONING-PIPELINE.md` — the standing governing spec for cloning-pipeline work; read IN FULL each cloning session.
  For the active header/footer/nav front, also `specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` + `specs/17` §S9.
- **Sites:** dev = palestine-lives.org (Indus). staging/canary = sandybrown-nightingale-600381.hostingersite.com. Both WP 7.0.1.
- **Verify every session (no cached line is authoritative):**
  - `git log -1 --stat` + `git status` + `git branch --show-current`
  - D-ceiling: `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`
  - Framework counts: `/sgs-db` or `/wp-blocks` (the DB is authoritative; counts are NOT in prose)
  - Commit by EXACT PATH, never `git add -A`. `main` is the source of truth. Re-check the
    branch in the SAME command as the commit (STOP-RECHECK-BRANCH).

---

## Setup-simplification track (the meta plan — one phase per session)

Plan: `plans/2026-07-16-setup-simplification-and-protocol.md` (signed off; execute, don't re-plan).

| Phase | What | Status |
|---|---|---|
| P0/P1/P2 | in-flight commit · culls · archive-with-redirect | ✅ done (live on main) |
| P3proj | project enforcement — f5 gained a machine-evidence converter-guard (folded the retired qc-on-converter-edit stub); NEW `spec-drift-commit-gate.py` wired; qc-on-converter-edit.py removed | ✅ done (live on main) |
| P4 | collapsed the 3 status docs → this LEDGER + STOP-CATALOGUE.md + `ledger-rotate.py` Stop hook (wired, self-test + fired) + F1 global filename patch (additive, mini-sign-off approved, `~/.claude` commit `44f3b95`) | ✅ done (commits `a55d0fc1`+`410c7552`) |
| **P3glob** | **⬅ NEXT — rest of the GLOBAL hook edits (§3.1 sgs-selfreport evidence-scan, §3.2 baseline-update token gate, §3.3 handoff-enforce extension). Own session, needs a global mini-sign-off.** | pending |
| P5 | agent refresh + skills refresh + WCAG 2.1 AA baseline | pending (own session(s)) |
| P6 | remaining global simplifications (tooling-map-drift, `__pycache__`, global CLAUDE.md ≤80, rule path-scoping) | pending (own sign-off) |

**The go-forward protocol (plan §5) — captured as a lesson:** (1) one ledger, Stop-rotated;
(2) structural gates over prose; (3) done = machine evidence; (4) minimal always-on context
(≤80-line cap on the GLOBAL CLAUDE.md only); (5) clean folders; (6) docs gated like code;
(7) verify contents not filenames; (8) protect architecture, cull description.

---

## Product queue (the website-builder work — reconcile before acting, some is already live)

**Last shipped (D341/D342, 2026-07-16, on `main` `a693e0e8`→merged into d3967a2c):** Phase 2
nav/logo fixes — `sgs/responsive-logo` dropped the unshippable `auto` logo-switch for an
operator `custom` breakpoint; `sgs/adaptive-nav` collapse tier now reads `SGS_Breakpoints`
(fixes the burger missing the 768–1023 tablet band). Spec 34 disclosure drawer BUILT + live
(Gate B all pass). Track C core→SGS migration (395→0 replaceable core blocks). All
live-verified both sites. Detail: `decisions.md` D341/D342 + `memory/session-2026-07-16.md`
(swept from the old handoff/state).

1. **Phase 1 — drawer link-colour polish (quick, do first).** `sgs/nav-menu` resting link
   text renders `#000`; Bean prefers the `text` token charcoal `#3a2e26`. Keep the
   focus-mirrors-base + underline (already live-correct). Change ONLY resting colour; verify
   across all 8 client palettes (STOP-VERIFY-EVERY-CLIENT).
2. **Phase 3 — finish Spec 34** (`specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md`, plan
   `plans/2026-07-15-spec34-build-plan.md`): Step 5 drawer settings (FR-34-5), Step 6
   builder reflection (FR-34-6 — RECONCILE, don't redo), Gate C (FR-34-7), then a FRESH
   `/adversarial-council` + prove the Site-Editor→frontend round trip for BOTH header AND
   footer (they are wired differently — test both).
3. **Step 1 — SPLIT framework vs per-site header/footer.** Move/delete
   `theme/sgs-theme/patterns/footer-indus-foods.php` (the only client-named framework
   pattern; leaks "Indus Foods Footer" + a hardcoded Google Place CID to every install);
   decide the per-site channel (JSON snapshot vs REST); gitignore per-site files. Do this
   BEFORE Goals 4/1 so they write to the per-site channel.
4. **Goal 4 — match the Mama's draft** (`sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md`):
   fix its 2 liabilities first (cites non-existent `header/footer-mamas-munches` patterns;
   maps the hamburger to the deleted `sgs/mobile-nav-toggle` → re-point at `sgs/adaptive-nav`).
   Bean's heading-specific eye pass (R-31-13) lands here.
5. **Goal 1 — replicate the Indus header/footer.** BASELINE = the preserved hand-built
   Astra/Spectra site https://lightsalmon-tarsier-683012.hostingersite.com/ (NOT the
   `mockups/*.html`). Capture it AS A FILE FIRST (`reports/visual-diff/header-footer-baseline-indus.json`).
   Open defects: logo mobile-tier switch (confirm the D341 `custom` mode covers it); buttons/rows/bg
   not preserved; sticky+shrinking header; mega-menu shows on mobile+desktop. NEW:
   `P-INDUS-BRANDSTRIP-OVERFLOW-9PX` (width-independent 9px overflow, source = `sgs-brand-strip` marquee).
6. **Goal 3 — de-hardcode base blocks.** `site-header/edit.js` + `site-footer/edit.js`
   TEMPLATEs + row blocks — remove the content hardcoded into them (NOT "empty containers").
   REMOVE the `Quick Links`/`Contact`/`Opening Hours` heading blocks from
   `framework-footer-default` (rich versions exist as opt-in patterns). Does NOT overlap Track C.

**Open reconciliation:** Track B (`feat/track-b-content-restore`, Indus page content) stayed
unmerged/paused — check its branch state before touching its files. Track B/C scratch decision
logs (`scratch/track-{b,c}-decisions-pending.md`, TB-1..9 / TC-1..34) were NOT FOUND in this
worktree/history — if located on another branch, fold into decisions.md/parking.md.

---

## Standing programmes (parallel / deferred — not the active front)

- **No-inline styling roster (~52 blocks, phased waves).** Hard architecture SETTLED
  (mechanism, D294 pattern selector, grid-scoping). Roster count drifts in prose — the DB +
  `plans/block-migration-DONE-checklist.md` are authoritative. Reusable LANDED harness:
  `plugins/sgs-blocks/scripts/no-inline-land-verify.js`. Canonical: Spec 31 §3.A/§13.4/§13.6
  + Spec 32 §6.1 + the DONE-checklist + the migration-contract plan.
- **WooCommerce layer (Spec 30) — COMPLETE + merged (D220).** Deferred roadmap → parking.md.
- **Cloning pipeline (L1–L4 cascade / L4 per-area extraction) — DONE (D290).** No longer active.

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | **`STOP-CATALOGUE.md`** (uncapped, D101) |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative (swept from the old handoff/state) | `memory/session-YYYY-MM-DD.md` + `memory/state-archive.md` |
| Governing cloning spec | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each cloning session) |
| Clone-fidelity measurement | `specs/20-CLONE-FIDELITY-MEASUREMENT.md` (computed-parity, Stage 11.6) |
| Build / deploy / SSH / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` (the ONE path) |
| Goals + exit criteria | `goals.md` |

## Blockers

None block the next session. Known-open items are the numbered Product queue + parking.md.
