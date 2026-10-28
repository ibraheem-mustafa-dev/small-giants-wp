# Verifier 3 verdicts (FA, NAV)

- FA-1 CONFIRMED MAJOR = RL-1. FA-2 CONFIRMED MAJOR (gap row exists; write half missing). FA-3 CONFIRMED MAJOR (spec link indirect). FA-4 CONFIRMED MAJOR (13 quotes). FA-5 KNOWN. FA-6 PARTLY MINOR (1,916/321/156/46 reproduced; 88/87 not; diagnostics quality, no binding spec). FA-7 CONFIRMED = RL-7 (diagnostics). FA-8 PARTLY MINOR (FR-33-15 Status contradicts its body: real; FR-48-45 not a contradiction). FA-9 CONFIRMED MINOR (noise). FA-10 CONFIRMED MINOR (spec says not built). FA MISSING all confirmed by Status lines (FR-48-76, -38, -49, -79, -36 E–L, -54, FR-33-14).

- NAV-1 FIXED-NOT-APPLIED (tabPanels returns four panels on current code; rerun intake). Stale-inventory guard not a spec requirement (freshness.mjs records route commit, never compares).
- NAV-2 CONFIRMED MAJOR (card-grid items title only; card-grid accepts link; headings and promo lost; old hand tree proves draft carries them).
- NAV-3 CONFIRMED FATAL = PC-1 (footer Root/1139#0 reproduced).
- NAV-4 CONFIRMED MAJOR (from FATAL): boundMenu tests includes('drawer'); Eye Care menus drawer-1/drawer-2. Mama's drawer differs (typed icon-list, falls under NAV-9).
- NAV-5 CONFIRMED MAJOR. NAV-6 CONFIRMED MAJOR (surfaceBlur has css_property None; scrimBlur maps backdrop-filter). NAV-7 CONFIRMED MAJOR. NAV-8 CONFIRMED MAJOR (edge of MINOR; spec basis indirect).
- NAV-9 PARTLY MINOR (FR-36-26 allows typed lists; binding is an addition).
- NAV-10 CONFIRMED MAJOR (hover/current not written; stored radius not rendering unexplained).
- NAV-11 CONFIRMED MAJOR content (FR-48-55 part 3 labels from the draft's own link text).
- NAV-12 FIXED-NOT-APPLIED = CO-10. NAV-13 REJECTED (matches spec). NAV-14 CONFIRMED MAJOR as an instance of FR-48-38 logic-as-data (Indus brands mega empty gallery). NAV-15 REJECTED as stated → MISS-1. NAV-16 PARTLY MINOR (cause unproven). NAV-17 PARTLY MINOR (mirror naming artefact).
- MISS-1 (Mama's footer, MAJOR) Fill overwrites sgs/business-info displayType copyright/attribution with "address" (fill-report footer 2026-10-28T06-44-59 lines 755, 797; post 176 two displayType address); live no ©, no credit; block renders correctly when called directly. Likely: a CSS display read on the icon slot routed to a content-selector enum (unproven). FIX exclude content-selector enums from look/discovered writes.
