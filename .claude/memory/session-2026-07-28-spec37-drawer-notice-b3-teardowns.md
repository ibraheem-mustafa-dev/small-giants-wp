# Session 2026-07-28 — Spec 37 track: drawer notice shipped · FR-37-42 · B3 reshaped into reference teardowns

**Track:** header/footer (was Track 2b). **Commits:** `6ddb9f48` (drawer notice + specs 36/37),
`7ff5a184` (FR-37-42), `87c6aeea` (lesson capture). **Decision record:** D412.

## Shipped

1. **First action — D393 regression probe re-run on the canary: 16/16 starters clean** (0 corrupted).
   Baseline re-established as measurement, not inherited claim.
2. **FR-36-9a(2) built + deployed + live-verified (`6ddb9f48`)** — the "burger opens nothing" gap,
   the only hard FAIL in the FR-37-26 simplicity test. `sgs/nav-menu` warns when no `sgs/nav-drawer`
   matches its effective `drawerRef` and offers one-click fixes: "Add the mobile menu" (inserts a
   drawer as a ROOT SIBLING seeded with the same menu, selects it) / "Open X instead" (re-points a
   dangling ref). Verified live with negative controls: starter-with-drawer shows NO notice;
   nav-menu INSIDE a drawer suppressed; blank ref matches the default (both sides fall back to
   `sgs-nav-drawer`); dangling ref shows the second variant. Jargon reworded ("DRAWER ID" → "Panel
   this burger opens"). Specs 36+37 edited in the same commit per §1.2. FR-37-26's FAIL verdict
   deliberately left standing (blind-tester arm is the authoritative half).
3. **FR-37-42 approved + spec amended (`7ff5a184`)** — visual column-shape picker. Bean overruled my
   reading of §3.3's ratio rejection: it bound the hand-typed STRING, not the capability. Writes the
   EXISTING `gridTemplateColumns`; count stays default; derived active state; `1fr auto 1fr`
   (true-centred logo) required by the teardown evidence.
4. **Lesson captured 3-layer (blub 411)** — `an-unreachable-capability-is-a-control-surface-problem`;
   also cleared the owed blub backlog via direct SQLite (rows 412/413; API down, handler not DB).
5. **B3 reshaped by Bean: no invented presets — ground everything in real references.** Built a
   header/footer TEARDOWN probe (twice-corrected: cookie-overlay junk filter; scroll-verification
   negative control) and measured 9/12 reference sites. Artefacts:
   `~/.claude/pipeline-state/sgs-discover/20260728-112649-7bc4a8/` (FINDINGS.md + per-site files).
   Load-bearing findings: best headers sit on ASYMMETRIC 3-col grids (Gymshark 630/83/630,
   ColourPop 580/264/580) that neither our flex nor count can express (→ FR-37-42); letter-spacing
   does the "premium" work; sticky is earned, not default (Island Creek's transparent→solid +
   layered shadow); Troubadour's pill = `top: var(--header-offset)` (we own the primitive).
   Bean corrected the sticky claim: Lama Lama IS sticky by eye — my probe couldn't measure it
   (unmeasured ≠ non-sticky).
6. **Remaining-work inventory for Specs 36+37 written** —
   `reports/2026-07-28-spec36-37-remaining-work-inventory.md` — verified against both specs' own
   status lines; it is the scope source for the merged-track strategic plan.

## Bean decisions this session (recorded in D412; the later drawer-rejection session's merged gate supersedes parts)

- Clone the references COMPLETELY as the proof the header/footer system is S-tier (evolved into the
  merged gate's clone-first POC: studionamma 100% first).
- Floating UI STAYS in the Customiser (live-preview-while-editing is the value).
- Merge Spec 36+37 EXECUTION into one track; keep the spec documents separate.
- 8+ presets → later refined by the merged gate Q1 (7 cloned pairs + 3 invented fills, Warm cut).

## Honest gaps

- Teardowns: 3 of 12 sites unmeasured (Away, ButcherBox, rabbit.tech) — owed before the clone gate.
- Cecilie Bahnsen's "no scroll behaviour" verdict predates the scroll-verification control.
- The 768/375 + drawer capture pass never ran (superseded by the clone-first POC, which requires it
  per-site at clone time anyway).
