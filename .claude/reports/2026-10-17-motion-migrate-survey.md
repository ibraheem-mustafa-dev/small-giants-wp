# Motion migrate survey, 2026-10-17 (Spec 38A M6.5)

All four targets run commit 0e50f75f1 (deploy: 4 sites in 523 s, full gates 12/12, `[motion-qa] PASS` on all 6 live probes). Every sweep used `wp sgs motion-migrate` (dry run read first, then `--apply`, then a second `--apply` because the hover layer maps only after the entrance layer moves, then a dry run to confirm convergence). Backups sit in each site's `sgs-motion-backups/` outside the web root.

| Target | Posts written | Result |
|---|---|---|
| eye-care-test | 14 posts (83 blocks, then 12 blocks on the second pass) | Re-run dry run: 0 blocks left to migrate, 0 flags |
| indus-test | none | Nothing to migrate |
| mamas-test | 1 (footer, 5 blocks) | Re-run: nothing to write |
| sandybrown | 29 non-protected posts (1513, 1581, 1594, 1607, 2107, 2115, 2594, 2742, 3079, 3389, 3405, 3448, 3777, 3778, 4087, 4235, 4426, 4428, 4430, 4437, 4440, 4443, 4456, 4461, 4465, 4739, 5193, 5205, 5217) | Re-run dry run per post: 0 blocks left, 0 flags |

## What stays, by design
Values the mappers report as `REPORTED ... left in place` are not old-motion settings with a destination: `effectHover` (per-item hover class), `scaleHover`, `sgsHoverShadow` and `sgsHoverShadowCustom` (the shadow control owns them), `sgsHoverZoomDuration` on product cards, the nav-drawer panel-shape timings and stagger axes, `childIconPaintDuration`, and `bgParallax` on a fixed-background hero. M6.6 decides each.

## Protected, not swept
The 23 sandybrown pages named GATE, GATE-TEST or Motion fixture were not saved (2103, 2109, 2113, 2603, 2721, 2737, 2740, 2744, 2893, 2900, 3037, 3038, 3052, 3135, 3141, 3228, 5223, 5226, 5244, 5255, 5272, 5287, 5346). The dry run lists them as holding old settings, which is why they stay on the allow-list; 5244 also carries a `team-member` conflict flag (image hover scale 1 against 1.06). They are rebuilt from `tests/fixtures/motion/pages/` when their probe changes, never saved by the sweep.
