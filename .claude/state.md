---
doc_type: state
project: small-giants-wp
project_id: 14
last_updated: 2026-07-05-D278
note: "LEAN snapshot. Full history -> memory/state-archive.md. This file holds ONLY the current pointer; detail lives in handoff.md + next-session-prompt.md (the SoT). Do NOT restate D-numbers / counts / commit hashes here - they drift. <=24576 bytes."
---

# small-giants-wp — State Snapshot (lean)

## Human Summary
**THE MASSIVE QC IS DONE (D277, 2026-07-05): the executed programme is VERIFIED.** All 16 steps pass the 4 checks (Spec-31 alignment / 7 rules + R-31-1..15 / no known cheat / drop attribution), and the full shape is universal + DB-rooted — every rater/tracer finding fact-checked by tracing. Three real defects were found and FIXED same-session (`4a35134a`): the orchestrator silently swallowed converter `status:'failed'` sections (now loud + operator-queued), a pre-programme self-documented 'ghost'→'outline' cheat in assembly.py (now the slots-alias DB channel + the gate blind spot closed), and an R-31-1 role-tuple drift in `content_attr_for_element` (now DB-sourced; unblocks part of ctaUrl). Dead code deleted; flow docs + Spec 31 §12 regenerated to post-deletion reality (`d8769e8d`); A2 baseline honestly shrunk 6→5 via a fresh LANDED deploy (`314d6b8b`). Parity unregressed: **content 90% / CSS 67-69-76**. 752 canonical + 18 orchestrator tests, all gates green, everything pushed. **NEXT = the card residuals build** (ctaText/ctaUrl multi-attr lift, packSizes schema, imageAlt) + P-STYLESHEET-DEFAULTS — the P-QC-* backlog was CLEARED same-day at D278 (tiebreaker deleted, goldens restored, instrument tightened, 2 bonus drop-bugs fixed) — see next-session-prompt.md.

## State Snapshot

## GROUND TRUTH FIRST — do not trust any doc's cached status; verify these every session
- **HEAD + tree:** `git log -1 --stat` + `git status` + `git branch --show-current`. NO doc's cached line is authoritative.
- **D-number ceiling:** `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` — decisions.md is the SOLE source of truth.
- **Framework counts:** query `/sgs-db` or `/wp-blocks` — the DB is authoritative; counts are NOT maintained in prose.
- **Commit discipline:** commit by EXPLICIT PATH, never `git add -A`. `main` is the source of truth.

## ACTIVE WORKSTREAM — Cloning pipeline: post-QC residuals build (the ONLY active work)
- **SoT for current status:** `.claude/handoff.md` (top entry, D277) + `.claude/next-session-prompt.md` (the residuals-build orchestration plan with the MANDATORY READING GATE). READ THOSE.
- **One-line where-we-are:** the QC is FULLY closed (D277 + D278) — programme verified, 3 defect classes fixed (`4a35134a`), then ALL 8 parked findings cleared same-day per Bean (`a5161cc1`+`f31e1149`: tiebreaker deleted/FR-31-15 amended, 40 byte-compare goldens restored, real-draft metamorphic legs PASS, instrument tightened with numbers held, +2 bonus drop-bugs fixed). A2 5 keys; parity 90/67-69-76. Next front: card residuals ONLY (ctaText/ctaUrl multi-attr-per-element lift, packSizes items schema, imageAlt block-side attr — P-GATE-A-CARD-RESIDUALS) + P-STYLESHEET-DEFAULTS.
- **Canonical spec:** `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — read §2 FIRST; §13 = binding rules/FRs. §12 build-state prose is now CURRENT (regenerated to post-D276 reality at D277).

## DONE / ARCHIVED — theme + WooCommerce layer (Spec 30, not an active thread)
- Spec 30 COMPLETE + MERGED (D220). Deferred roadmap items live in parking.md.

## DOC DISCIPLINE
- decisions.md / parking.md / mistakes.md are append-only; D-ceiling check MANDATORY before a new D.
- /handoff writes handoff.md + next-session-prompt.md + this block.

## BLOCKERS
- None block the next session. Known-open items live in handoff.md "Known Issues".

<!-- Caps: this file <=24576 bytes, <=60 lines of body. History -> memory/state-archive.md. -->
