---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: spec-17-complete-plus-floating-ui
current_subphase: "Floating UI replacement shipped 2026-05-19. Sgs_Floating_UI_Customiser + Sgs_Floating_UI_Renderer move Back-to-Top + Reading-Progress from retired Gutenberg blocks (Polish 1b) to Appearance → Customise → SGS Floating UI. 7 controls, 12 PHPUnit tests, vanilla JS frontend with 44px touch targets, WCAG 2.2 AA. Build-replacement-before-retiring lesson captured to 3 layers. 4 commands restructured to skillscore 80%+ (wp-hooks 98%, wp-hook-graph 100%, deploy-check 100%, sgs-db 100%). 9 skill files updated with Spec 17 patterns. sgs-framework.db refreshed (71 blocks / 1714 attrs, regenerated 02-SGS-BLOCKS-REFERENCE.md, 215 component-libraries CSV rows after uimax sync)."
current_subphase_step: "NEXT SESSION — production deploy + operator validation. All code on main (HEAD d4da8c68). Suite 1195/0/0, build clean. Pending: live-site smoke test on sandybrown (admin pages render, wp sgs commands work via WP-CLI with --user=1, conditional header/footer rules fire correctly, CPT REST capability gate denies subscriber reads, Customiser Floating UI live-preview works for all 7 controls). Outcome-vs-completion bar: code shipped ≠ outcome until operator workflows verified on a real WP install."
last_updated: 2026-05-19
latest_commit: "d4da8c68 on main — feat(spec-17): ship Floating UI replacement via Customiser + capture lessons"
session_2026_05_19_summary: "Floating UI replacement build + 4 command restructures + 9 skill updates + DB refresh + lesson capture + 8-error inline diagnosis (namespace-scope bug in test stubs)."
prior_session_2026_05_18_summary: "Spec 17 Wave 2 + 2.5 + 3 delivery + two git-stash incidents wiping uncommitted work + surgical recovery via stash@{0} extraction. Test debt cleared from 27 failures to 0."
blockers:
  - "None — Spec 17 complete on main. Next session focuses on production verification (deploy + smoke test) and any blocker discovery from real-site operator workflows."
---

# small-giants-wp — State Snapshot

Spec 17 (Header/Footer Architecture) fully implemented across Waves 1, 2, 2.5, and 3 over 4 sessions ending 2026-05-18. All 16 FRs shipped on `main` at commit `a6aab7ac`. Suite 1183 tests / 0 failures / 0 errors. Build clean.

For full session detail see `.claude/handoff.md`.
