Invoke /autopilot before doing anything else.

Context: SGS is a WordPress block framework; its cloning system (Spec 48, code in `scripts/computed-route/`, `scripts/parity/`, `scripts/local-wp/`) turns a client's Claude Design draft into a working SGS site. On 2026-10-28 the second full re-clone of all three clients (Indus Foods, Mama's Munches redesign, Eye Care Birmingham) finished and an adversarial council audited the tooling against its specs. Its verified register is the single list this work follows: `.claude/plans/2026-10-28-clone-spec-audit-register.md` (evidence for every row: `.claude/reports/2026-10-28-clone-spec-audit/`). Bean's goal: fix the tooling against the spec once, properly, instead of patching gaps one by one, then run the third full re-clone.

Model rule (Bean, 2026-10-28): every subagent runs on Sonnet (route through /delegate; spec and doc work writes under `.claude/`, so it uses the Agent tool, not API workers). Opus stays on the main thread only.

What cloning means (Bean, binding; read twice before touching any row):

- A draft is a Claude Design handoff folder (`.dc.html` code, its logic, `tokens/*.css`, `surfaces.json`, `animations.json`, `MANIFEST.json`), never WordPress or WooCommerce markup. That the draft has no SGS or WooCommerce blocks is the whole point.
- Cloning recognises the structure of each draft part and places the correct working SGS / WordPress / WooCommerce block or CPT in its place, carrying over that element's content and its CSS, on the right container (a blank-canvas page, a CPT, the site's own theme template copy, a WooCommerce piece inserted where the draft's equivalent region sits). A static copy where the spec names a working block is a route bug, never a design question.
- Carry the CSS to the equivalent element as the draft declares it, with no re-assignment: a gap the draft declares stays a gap, margins it declares stay margins. Translate only where a block cannot hold a value where the draft declares it, and render the same result. If a container's layout differs from the draft's, that is the fault to fix.
- The framework (blocks, theme, motion model, fx effects) already has the capabilities the register's rows need: every motion, header and layout row names the cloning stage at fault (intake reading, recognition, skeleton block choice, Fill writing, build, walker/census measuring). Never describe a row as a missing framework capability without checking the framework DB (`/sgs-db`, read-only) and `/wp-blocks` and the block's own source first.
- Section data sources come from the code (Spec 48A: "cloning reads the code"): a loop's data and what each item shows and links to decide a live block; headings only support, never decide.
- The whole draft page is the template; where one template serves many instances (products, posts), only the variable-content areas become bound working pieces (Bean ruling S1).
- Out of scope (Bean): reduced motion (a visitor browser setting; its census rows are bookkeeping only), posts' bodies and metadata and blog/single template fidelity (draft display content only; watch item: a draft that shows categories prominently and loses them).
- Fixtures and calibration products stay while a clone is built and checked; they are deleted only after a clone is confirmed complete and accurate (ruling S2).

Read first: the register in full (it is short; each row carries its spec quote, the file::function at fault, the evidence and the fix); `.claude/plans/2026-10-23-cloning-tool-completion.md` sections "The spec audit register" and "Phase 2" (the mirror route: site build on the mirror, then `scripts/local-wp/push-to-remote.sh`; Hostinger's edge 403s editor bursts); `.claude/LEDGER.md`; the spec sections each row cites (grep to them; Spec 48 is ~1,850 lines, never read it whole). Bean's rulings are already written into the specs (section S of the register says which).

Order (the register's "Suggested order for the fix pass"):

1. C6 plugin bugs (negative-margin sanitiser, fx-magnet display override, multi-button mobile fallback) and C1 box values written flat (`lib/fill-width-ladder.mjs` rung 2): small, cross-everything, the largest visible gain.
2. A3 draft links on single-file drafts and A4 words and lists (container own text, logic-as-data lists, icon+text links, quote bodies).
3. A1 openers (modal, flow, form prefill) with the modal frame, A5 drawer menus and close, A6 the no-region refusal.
4. A2 product pages (the `product` commerce role placing `sgs/buybox` and product bindings at the region `shop-parts` finds; the Spec 27 parts split is a planned dependency, the single-buybox form is the fallback).
5. B1 to B7 content, then C2 to C5 look (C5 motion is stage by stage: intake, recognition, Fill, skeleton).
6. D measurement and census, so the next census counts only real gaps.

Group rows that share a mechanism into one change; one Sonnet subagent per independent track in a worktree (at most 3 at once), the main thread reads every diff before merging.

Every fix (the route's standard, unchanged): prove the cause on a real artefact first; a MUST FAIL test with a negative control; a mutation list with every mutation killed and 0 skipped (`node scripts/computed-route/tools/mutate.mjs`, `tools/check-mutation-lists.mjs` 0 new); `node scripts/computed-route/lint.mjs` (README lists every file and export); keep green `node --test "scripts/computed-route/tests/*.test.mjs"`, `capabilities.mjs --gate`, `content-coverage.mjs`, `census-all.mjs --check`, `check-no-client-names.py --check`. Plugin changes deploy with `python plugins/sgs-blocks/scripts/build-deploy.py --target <sites>` (never during a site run; announce in `.claude/queue.md`). Never type `git stash`, even to list.

Already fixed on `main` and applied by the next re-clone: checkout region from entry fields, catalogue rewrite flush, product menu links, filter-not-flow, flow slug marker, walker check scope. Before the third re-clone: re-run Eye Care intake (its mega panel skeletons came from a stale inventory), reseed (applies the `wishlistUrl` link-href override), delete the stale `page-my-account` template (178) and the hollow flow post 159 on the mirrors, and deploy the plugin (gift cards and the flow slug marker are merged but not deployed; gift cards then get their live purchase test on mamas-test, `.claude/plans/2026-10-28-gift-cards.md` step 3).

Done when every register row is fixed with its proof or recorded as a gap row Bean has seen, the third full re-clone runs on the mirror route with 0 failed stages and is pushed to the three test sites, and site-check, census and the vision audits for Mama's and Eye Care run on its result. Then delete this prompt file.
