# TRACK 2 · P2.5 — NAV SPEC SIGN-OFF → CODE SALVAGE → PURGE (fresh session)

**Invoke `/autopilot` before doing anything else.**

## State (plain English — re-ground)
The canonical SGS navigation spec is **WRITTEN, gated, and QC-verified**: `specs/36-SGS-NAVIGATION-SYSTEM.md`
**v2.1**, *pending Bean's final sign-off*. It reconciles two parallel P2.5 tracks (a 07-18 session that produced
Spec 36 + a 07-19 session that re-ran the arc on a stale `wp_navigation` lock before catching that Spec 36 was
the authoritative base). v2.1 = Spec 36 with the utility pieces (cart/search/social/logo/business-info) woven
into the body (§4, FR-36-19..25) + per-device + structured-data-once + fact-check fixes, gated through a
7-persona adversarial council + a qc-council empirical fact-check, integrated + QC'd (all 26 FRs survive).

**The remaining work is DESTRUCTIVE — do NOT start it until Bean signs off Spec 36 v2.1.**

## MANDATORY READING (in full, before any action)
1. `specs/36-SGS-NAVIGATION-SYSTEM.md` v2.1 — THE canonical nav spec. Read END TO END (Bean-locked full-read gate).
2. `reports/2026-07-19-P2.5-phase6-spec-audit-register.md` — the exact DELETE/STRIP/CARRY-FORWARD map for the purge.
3. `reports/2026-07-19-P2.5-spec36-v2-adversarial-council.md` — the council fix-list v2.1 integrated (context).
4. LEDGER.md "⚠ CORRECTION (2026-07-19)" block — how the divergence happened + the reconciliation.
5. `reports/2026-07-19-P2.5-pieces-research-{cart-search,logo-social-businessinfo}.md` — the meet-and-exceed
   feature bar per piece (the salvage measures against THESE, not "block exists").

## The plan

### GATE 0 — Bean signs off Spec 36 v2.1 (do first, do NOT skip)
Confirm Bean has reviewed + signed off v2.1. Nothing destructive runs before this. Update the spec status line
from "Pending Bean final sign-off" → signed-off once confirmed.

### Phase 6.5 — CODE SALVAGE (read-audit first; deletions after Bean's go)
For EACH existing nav/utility block, audit **which of the spec's ABOVE-BASIC features are genuinely built vs
to-build** against Spec 36 v2.1 — feature-by-feature, NOT "does the block exist" (⚠ the reused-block "~90% ready"
audits were THIN-BAR: the cart is a **badge+link only**, the mini-cart drawer is UNbuilt; search's ARIA combobox
IS shipped). Then keep ONLY clean code that TOTALLY matches the spec, mark those spec areas complete, delete the rest.
Targets (query `/sgs-db` for the live roster first):
- `sgs/adaptive-nav` + `sgs/mega-menu` — RETIRE (reference-only); salvage snippets only (esp. the drawer view.js
  **D323 body-reparent + D340 scrollbar-compensation** — port, don't re-derive, per FR-36-6/-7).
- `sgs/nav-menu` (registered slug) — a from-scratch same-slug rebuild (D270); its 617-line render.php is a full
  rewrite, not an extension (wp-dev council finding).
- `sgs/cart` — badge shell exists (Store-API hydrate + cache-safe + `aria-live`); the mini-cart drawer/flyout +
  contents are a BUILD; the one cheap fix now = add `role="status"`.
- `sgs/product-search` — the ARIA combobox IS shipped (genuine EXTEND; add product-preview + display modes).
- `sgs/responsive-logo`, social block, `sgs/business-info` — audit above-basic per the pieces research.
- Shared plumbing: `store('sgs/nav')` + the disclosure/dialog utility (prior art in `mega-menu/view.js`).
Output a per-piece built-vs-to-build table; mark the matching spec FRs "already built (salvaged)".

### Phase 6 — FINAL PURGE (destructive; after salvage + Bean's go) — one source of truth
Per the phase6-spec-audit-register map:
- **DELETE** `specs/34-ADAPTIVE-NAV-DISCLOSURE-DRAWER.md` (its elementFromPoint baseline methodology is ALREADY
  carried into Spec 36 §8 — verify before deleting).
- **STRIP** Spec 17 §S9 nav FRs (S9-1 hook clause / S9-2 palette / S9-4 / S9-5 / S9-8 / S9-10 nav refs / S9-11
  pointer) → KEEP all site-header/site-footer/rows/Site-Info/scroll/responsive-model.
- **DELETE** Spec 02 §23 "Mega Menu" + the Nav-System summary section (salvage the "Replaces Max Mega Menu/
  JetMenu/Kadence Pro" competitive line first).
- **REPOINT** Spec 33 Part 2 emit target — but only UPDATE it with the TRUE header/footer setup AFTER the nav is
  built + passes its test gate (Bean's ruling; NOT now — the specialised pipeline comes after this build).
- Mechanical (POST-BUILD, not purge-time): 00 §2.1 + `no-header-footer-block.py` allow-list + Spec 29 roster rows
  + 01 mega template-part file list need the new block-name roster once built; clean stale `block_composition`
  rows (`sgs/mobile-nav`, banned `core/navigation` in site-header-row) via `/sgs-update`.

## Guardrails (Bean-locked)
- Spec 36 v2.1 is the SINGLE source of truth — one home, no other options (that's the whole point of the purge).
- **Shared worktree:** `git status` + `.git/MERGE_HEAD` before touching tracked files; commit path-scoped to `main`
  via an isolated worktree (`git worktree add /c/tmp/x main`); NEVER `git add -A`; re-check branch in the SAME
  command as the commit (STOP-RECHECK-BRANCH — this worktree drifts onto other branches).
- Destructive-op discipline: salvage is a READ-AUDIT first; every deletion waits for Bean's explicit go + is
  verified (content carried forward where the audit register says CARRY).
- Converter: do NOT over-engineer — the spec's job is documenting the architecture + universal WP standards; the
  targeted pipeline is built AFTER the nav passes its test gate (FR-36-15, Bean-ruled).
- Research-ideal-before-reading-existing-code (memory `research-ideal-before-reading-existing-implementation`):
  the spec IS the ideal now — salvage checks code against it, never the reverse.

## Skills / tools
`/autopilot` (first) · `/sgs-wp-engine` + `/sgs-db` + `/wp-blocks` (ground salvage against live blocks/DB) ·
`/dispatching-parallel-agents` (salvage-audit the pieces in parallel) · `Explore` (read specs for the purge) ·
`/handoff` (session close). Model: Sonnet for the mechanical salvage-audit; Opus for any judgement call on
build-vs-salvage.
