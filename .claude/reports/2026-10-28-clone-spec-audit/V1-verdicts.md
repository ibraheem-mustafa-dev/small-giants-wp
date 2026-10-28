# Verifier 1 verdicts (T, PC, RL)

- T-01 CONFIRMED MAJOR. sameNode/commonChain; wrappers identical once className dropped (21 Indus, 4 Mama's, 5 Eye Care shells → 1 signature each); md5 identical page.json/404.json; live 404 identical. Includes T-07, PC-6, PC-8.
- T-02 PARTLY. Holds for Mama's: manifest-build.mjs::matchRecord maps postType template to kind page, so record S-32 (kind result, Confirmation.dc.html) never matches; falls back to copy from:page. Eye Care Fills it but WHOLE_TREE excludes order-confirmation. Content-part copies (no --template-part caller) = spec body requirement (FR-48-56 first sentence) that the Done-when/Status do not test: MINOR.
- T-03 PARTLY → MINOR. Orphan page-my-account 178 is a stale mirror leftover; generator stopped by c3bab02b4; spec asks only to report served-without-copy, no orphan sweep. A fresh clean re-clone will not recreate it.
- T-04 FIXED-NOT-APPLIED (fc1db770f).
- T-05 REJECTED (index never served; Done-when covers served templates).
- T-06 PARTLY MINOR (Mama's no single/archive copy; only stock Hello world post; whether archive counts as served unclear).
- PC-1 CONFIRMED MAJOR (from FATAL; header still has 7 working links): probe-link reproduced; 20 Eye Care elements unresolved; Eye home 3/79 buttons with url.
- PC-2 CONFIRMED MAJOR: h1 skeleton nodes carry no level; nothing writes level; live h1 0 on Indus about, Mama's home, Eye home.
- PC-3 CONFIRMED MAJOR; PC-4 CONFIRMED MAJOR (same mechanism). Note FR-48-56 body vs Status disagree; code follows the narrower Status.
- PC-5 PARTLY MAJOR (body only): empty post bodies confirmed (placeholderTree; FR-48-38 Status logic-as-data not built); excerpt/date/category/author not required by any spec → REJECTED part.
- PC-7 CONFIRMED MAJOR: Root/611#0 "Message me" → empty sgs/container (FR-48-6 pillButton); same at home/contact/Indus single.
- PC MISSING: logic-as-data = PC-5; content-region recogniser = PC-3/4 fix; post metadata writes REJECTED.
- RL-1 CONFIRMED MAJOR (from FATAL): ladder rung 2 string tiers; counts 110/43/23 match; live padding 0.
- RL-2 CONFIRMED MAJOR: resolveProperty returns equal before alternate slots; live root block nowrap vs inner flex wrap.
- RL-3 PARTLY MAJOR: ~1,899 unread .sgs-container__inner rows confirmed, but FR-48-42 Status self-declares declared layout forms not built (overlaps RL-8).
- RL-4 CONFIRMED (symptom) MAJOR: has-global-padding gutter survives; wrapper already lets a client-set horizontal padding replace the gutter → fix is writing explicit 0. Rater's judgeUnmapped cause unproven.
- RL-5 CONFIRMED MAJOR: pinned-horizontal without orientation; render.php resets; live vertical.
- RL-6 CONFIRMED MINOR (wrong census class only, no visible defect).
- RL-7 PARTLY MINOR: 'unassessed' not in FR-48-65; but the U→W-walker sentence is a mapping rule, not a build requirement; triage.mjs ~598 already splits consequence/box-unexplained.
- RL-8 PARTLY (spec self-declares not built). RL-9 REJECTED (unverified). RL-10 REJECTED (untraced). RL MISSING box-geometry REJECTED; dependent settings = RL-5.

Miss found: Mama's order-confirmation falls back because of the matchRecord kind mismatch (fix KINDS for template rows; covers any result-kind draft page).
