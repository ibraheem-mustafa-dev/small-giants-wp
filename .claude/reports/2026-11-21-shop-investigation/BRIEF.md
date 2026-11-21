# Page investigation brief (2026-11-21 night)

Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better. Make any reversible call yourself and list the calls you made in your report.

## Goal

Bean wants every shop page type's problems found, their causes proved and their fixes named BEFORE any fixing, so the fixing and checking can be planned as one fast, parallel effort. You investigate one page type on two from-blank scratch copies, each built by the cloning route ("the route", `scripts/computed-route`) from a client's Claude Design draft with no hand edits. You fix nothing.

- Eye Care (an optician selling sunglasses): client `eye-care-ward-end`, copy `local-mediatest-trec`, http://localhost:8125. Draft: one file, `sites/eye-care-ward-end/handoff/Eye Care Birmingham.dc.html`, whose pages are its own logic's state: open a page with `L.go('<route>')` (routes and basket-filling scripts in `sites/eye-care-ward-end/build/part-look.json`; `lib/part-look-run.mjs::openPage` shows how).
- Mama's Munches (a bakery): client `mamas-munches-redesign`, copy `local-mediatest-trlab`, http://localhost:8121. Draft: one file per page in `sites/mamas-munches-redesign/handoff/` (e.g. `Product.dc.html?id=zookies`, `Shop.dc.html`, `Account.dc.html`, `SignIn.dc.html`); each surface's draft file is `draftIndex` in `sites/<client>/build/surfaces.json`.

Both copies run today's `main` (built and synced at 20:54). The lab worktree `E:\sgs-tmp\wt-tr-lab` holds the route at today's main plus each client's build outputs.

## Rules

- Read only. Never write to any WordPress site, never edit any file in a git worktree, never commit. Write only inside `E:\sgs-tmp\template-rework\investigation\` (your findings file and scratch scripts in a subfolder named for your page type) and pictures under `E:\sgs-tmp\template-rework\investigation\shots\<page>\`.
- Never run the route's write commands (`clone-surface.mjs`, `site-build.mjs --apply`, `part-look.mjs --write`, `calibrate.mjs`); the main session runs them. `part-look.mjs` WITHOUT `--write`/`--verify` (a report) and `skeleton.mjs propose` on a copy of the data in your own scratch folder are fine.
- Git Bash: `export SGS_SECRETS_ROOT=C:/Users/Bean/Projects/small-giants-wp MSYS_NO_PATHCONV=1`. Read-only WP-CLI from PowerShell: `wsl -d Ubuntu -u root -- sudo -u www-data wp --path=/var/www/<site> eval-file /mnt/e/...`. Playwright: `createRequire('E:/sgs-tmp/wt-tr-lab/plugins/sgs-blocks/')` then `require('playwright')`.
- The seeded customer: `rc-customer` / `rc-Lab-2026-pass` on both copies. Basket seeds: `E:\sgs-tmp\template-rework\lab\ec\seed-out.json` (Eye Care), `E:\sgs-tmp\template-rework\lab\seed-out.json` (Mama's). Orders: Mama's 5998 (signed-in), 6058 (gift), 6059 (guest); Eye Care 455 (`?key=wc_order_rendercheck01`).
- Pairs beside the draft: `node E:/sgs-tmp/template-rework/lab/shots.mjs <route dir> <handoff dir> "<draft file>[#@state/page=<route>]" <clone origin> <clone path> <out prefix> [--basket <seed>] [--login user:pass] [--widths 375,1440]` then `python E:/sgs-tmp/template-rework/lab/pair.py <draft.png> <clone.png> <pair.png>` (see `E:\sgs-tmp\template-rework\lab\ec\shots1.sh`). Look at 375 and 1440.

## Wait for the fresh build first

The main session rebuilds every page type on both copies, one surface at a time per copy, then runs part-look on each. Before judging a page, wait until its logs exist and end with `exit=`:
- rebuild: `E:\sgs-tmp\template-rework\investigation\logs\<client>-<surface>.log`
- looks: `E:\sgs-tmp\template-rework\investigation\logs\<client>-pl-<surface>.log` (`until grep -q '^exit=' <log> 2>/dev/null; do sleep 30; done`). A rebuild that FAILS is itself a finding: read its log and `sites/<client>/build/skeleton/<surface>.proposal.json` `problems` and `templatePieces` in the lab, and say what refused and why. While you wait, read the code and the known findings below.

## Known already (do not rediscover; confirm, extend or correct)

- `.claude/plans/2026-11-18-template-rework.md` in the lab: Task 7's status bullets and the First action's "Product round 1" item.
- `.claude/reports/2026-11-18-template-rework/lab-findings.md` in the lab.
- Owners: this stream (template rework) owns `scripts/computed-route/lib/template-piece*.mjs`, `lib/template-pieces*.mjs`, `lib/part-look*.mjs`, the catalogue step `lib/site-build-catalogue*.mjs` and `lib/catalogue-*.mjs`, `lib/skeleton-filter-rail.mjs`, the shop blocks' look settings (Cart, Checkout, `sgs/account`, `sgs/cart`, order blocks, buy box, product card) and `plugins/sgs-blocks/includes/woocommerce/`. The general cloning session owns the skeleton rules (`lib/skeleton-*.mjs` except the rail), Fill, the header, footer, nav drawer and mega menus, and the Claude Design instructions. A missing block setting is a plugin round item (say which block and which part).

## What to find

Everything that would stop the page passing Bean's eye beside the draft at 375 and 1440, worst first, plus anything broken (a control that does not work, a wrong state, an overflow, an accessibility failure such as a missing label or focus ring). For each, prove the cause in the artefacts (the draft, the inventory, the proposal, the built tree in the lab, the saved block attributes, the live DOM and computed styles, the code), and classify the layer. Group problems that share one cause into one finding. Never guess a cause: say "hypothesis" and what would prove it when you could not prove it.

## Findings file

Write `E:\sgs-tmp\template-rework\investigation\<page>.md` (UK English, never hard-wrapped, plain words first). Start with a three-line summary (how far each client's page is from passing, the worst problem, the number of findings). Then one block per finding, worst first:

```
### <page>-<n>: <what Bean would see, in plain words>
- Clients and widths: ...
- Evidence: <measurement, selector, picture path, file::symbol>
- Cause: proved (<how>) | hypothesis (<what would prove it>)
- Layer and owner: route rule (general) | route piece / part-look / catalogue (this stream) | block setting gap (plugin round: block, part, setting) | plugin bug | theme | site data on the copy | draft defect
- Fix: <the concrete change, file::symbol where known>
- Size: S (under an hour) | M (a few hours) | L (a day or more)
- Depends on: <other finding ids or nothing>
- Verify by: <the check that proves it fixed>
- Same cause elsewhere: <other pages or clients>
```

End with the list of pictures and probes you made. Your final reply to the main session: the summary, the finding ids with one line each, and every call you made.
