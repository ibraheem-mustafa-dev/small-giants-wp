# Handoff brief, 2026-11-19 (site speed session, LEDGER Front S)

This is Step 1 of `/handoff` for a worker with no access to the session. Trust what it says is deployed and found.

## Tasks and intended outcomes

1. **Mama's Munches (live shop, https://mamasmunches.com, deploy target `mamas-test`) to `inline` CSS delivery.** Outcome: done. Option `sgs_css_shared_delivery` = `inline` (was `bundle`), Bean's ruling: Stage C (below) makes inline the likely winner everywhere, so no switching back and forth. `bundle` hardening (the CSS plan's old Open 1) is parked.
2. **Shop image loading.** Outcome: code shipped, outcome not hit. Only the first three items of a post or product loop load images eagerly (`SGS_Media_Priority::resolve`, Spec 49 §7.7 rule 4). Target was Mama's Shop 95 on PageSpeed phones (median of 5); now 87 (was 81 the same day before the release). Remaining gap: the LCP image (first product card) downloads in about 0.2 s, then waits about 2.1 s to paint; the biggest main-thread cost is Style & Layout (about 0.7 s) from Mama's very large per-instance CSS. Owner: Stage C plan.
3. **Footer JavaScript.** Outcome: achieved. SGS's own classic front-end scripts print `defer`; render-blocking 0 ms on Mama's Home, 50 ms on Shop (target under 300 ms). Open follow-up from code review: no gate stops the next blocking enqueue; a detector is owed (recorded in the CSS plan, item 3).
4. **Stage C plan.** Outcome: achieved. `.claude/plans/2026-11-19-stage-c-per-instance-css.md` exists (commit `3ae7fdb32`) and LEDGER Front S points to it.
5. **Page cache (added by Bean this session).** Outcome: achieved. LiteSpeed Cache plugin on sandybrown (already active) and mamas-test (installed today): page caching only, every optimisation off, public and front-page lifetime 36,000 s (10 hours) because WooCommerce login and register nonces on the cached sign-in page must stay valid (WordPress nonces live 12 to 24 hours). Cached pages answer in 0.10 to 0.15 s against 0.55 to 0.75 s. Basket, checkout and account are never cached; a visitor with items gets an uncached page with their own count (checked with `E:\sgs-tmp\cc-plan\probe\cache-basket.mjs`). Recorded in `.claude/dev-setup.md` Known Gotchas.
6. **Object cache (Bean asked to test).** Outcome revised: tried on the canary (Hostinger's Memcached, `localhost:11211`, shared between web and CLI, keys namespaced by DB name), no measurable gain on basket, checkout or account (account slower), so it is off. Not enabled on Mama's.
7. **Google Analytics / Google Tag Manager.** Outcome revised: left as it is. Research note `C:\Users\Bean\.claude\memory\research\2026-11-19-gtm-ga4-pagespeed-cost.md`. Delaying GA gains lab points mainly because Lighthouse never interacts, and loses visitors; Mama's has no CrUX field data, so no ranking gain. Measured locally: blocking GA entirely moves Mama's Home from median 55 to 64 (local Lighthouse, 3 runs). Google tag gateway was set up through Cloudflare's API (zone setting `google-tag-gateway`, path `/mmtag`) and GTM4WP pointed at it, then reverted the same day: UK visitors are routed around it (`gtm_region_override=GB-ENG`), so the container downloaded twice. Everything is back: gateway disabled, GTM4WP domain and path empty, the `/ns.html` redirect rule deleted.

## This session's commits (all on `main`, pushed)

- `86c9cface` fix(media): first three loop items eager (helper branch, merged in `abfd6558d`)
- `13ec046fb` perf(scripts): SGS classic front-end scripts deferred (helper branch, merged in `75fcde519`)
- `3ae7fdb32` docs(plan): Stage C plan + LEDGER Front S pointer
- `94c290d5a` chore(gates): `_wp_to_kebab_case` added to `plugins/sgs-blocks/scripts/dead-api-checker/wp-wc-function-allowlist.json` (real WP core function; the full gate failed on it) + dev-setup page-cache row
- `2258a185a` chore(gates): `check-length-unit-partners.py` ALLOW_RUNTIME entry for `scripts/computed-route/lib/fill-part-look.mjs::unitCompanion` (another session's code, schema-checked read; it failed the release build's fast tier)
- `d2278b481` docs(css delivery): plan, Spec 32 FR-32-32 status, LEDGER Front S brought to current truth
- `60dafb653` fix(media, scripts): code-review findings (medium review of `86c9cface` and `13ec046fb`): every template opens its own image loop (nested templates count their own items); `enter_template` runs at `pre_render_block` PHP_INT_MAX and only when `$pre` is null; card-grid and post-grid close their loop in `finally`; post-grid names items with `loop_item( get_the_ID() )`; `nav-accessibility.js` runs at once when the page is already parsed; plan item 3 records the owed detector.

## Findings with no file change, or ruled out

- Bundle part (b) "a new file per URL" does not happen on the live shop: two product pages shared one bundle file; files differ only by block set.
- Bundle part (c) "re-reading every stylesheet on each uncached request" applies to `inline` too; moot on cached pages.
- Shop's third font (Caveat, 74 KB) requests at about 440 ms, after the LCP image finished, so it is not on the LCP path.
- Hostinger's panel server cache promises no shop-page exclusions, so it stays off; LiteSpeed Cache plugin is the cache.
- Code review findings kept by choice: an item counts its loop position even when its image is lazy for another reason; the threshold reuses core's `wp_omit_loading_attr_threshold` (as core's own query loop does); six `class_exists` guards left as they are.
- Removing the helper worktree `E:\sgs-tmp\wt-shop-images` with `git worktree remove` deleted the main checkout's `plugins/sgs-blocks/vendor` through a junction the helper made (runtime libraries live there). Restored with `php C:\ProgramData\ComposerSetup\bin\composer.phar install` in `plugins/sgs-blocks`. Auto memory `removing-a-worktree-follows-its-junctions-into-the-main-checkout` updated. `~/.claude/scripts/git-tidy.py` removes worktrees the same way; it was run as a dry run only. A fix under `~/.claude/` needs Bean's approval (main session handles it).

## State

- Branch `main`, HEAD `60dafb653` (or a later merge of `origin/main`), pushed, matches `origin/main`.
- Build and gates: release build at `cd9718b2a` passed fast 232/232 and full 17/17. After `60dafb653`: `run-media-loop-priority-standalone.php` OK; PHPUnit `MediaPriorityTest|ProductCardImagePriorityTest|BuyboxImagePriorityTest` 38 pass; `run-motion-loop-delays-standalone.php` 4 of 85 failing, the same 4 as before this session.
- Deployed: release `cd9718b2a` on sandybrown, mamas-test, indus-test and eye-care-test (2026-11-19 about 17:00). `60dafb653` (review fixes) and the docs commits are on `main`, NOT deployed. eye-care-clone-test still runs `c7b9372ff`.
- Mama's after deploy: journey check 6 of 6 (`E:\sgs-tmp\cc-plan\probe\journey.mjs`); PageSpeed phones median of 5: Home 94 (86 to 98), Shop 87 (79 to 90), TBT 168 and 209 ms, render-blocking 0 and 50 ms.
- Mama's DB backups taken before each settings change (`~/backups/db/mamasmunches.com-20261119-*` on the server: before-inline, before-litespeed, before-litespeed-ttl, before-tag-gateway, before-deploy-speed).
- Uncommitted files of this session: none. (The working tree holds other sessions' uncommitted files; never stage them.)

## Docs already updated this session (verify, don't redo)

- `.claude/plans/2026-11-19-css-delivery.md`: Where it stands, Results (new Mama's inline table and LCP analysis), Open items 1 to 4 rewritten, item 3's owed detector.
- `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` FR-32-32 status line (every site `inline`; `bundle` needs Open 1 before a site with an HTML cache selects it).
- `.claude/specs/49-SGS-MEDIA-SYSTEM.md` §7.7 loop rule (by the helper in `86c9cface`): check it still matches `60dafb653` (each template, nested included, is its own loop; a short-circuited render opens nothing).
- `.claude/LEDGER.md` Front S and the "Need you (Mama's)" summary line.
- `.claude/dev-setup.md` Known Gotchas: page cache row.

## Docs the worker should check

- Spec 49 §7.7 (above) and the header of `plugins/sgs-blocks/includes/media/class-sgs-media-priority.php` against `60dafb653`'s nested-loop behaviour.
- Any doc that says Mama's runs `bundle`, or quotes Mama's Home 95 / Shop 82 as current (grep `bundle`, `Shop 82`, `Home 95` in `.claude/` live docs, not dated reports).
- Any doc naming the deferred handles or `nav-accessibility.js` timing.
- `.claude/plans/2026-11-19-stage-c-per-instance-css.md`: its baseline should cite Mama's current inline numbers (Home 94, Shop 87) and the Shop LCP finding (Style & Layout about 0.7 s) as Stage C's measured lever.
