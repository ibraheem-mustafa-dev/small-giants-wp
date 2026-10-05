Invoke /autopilot before doing anything else.

Context: Eye Care (client slug eye-care-ward-end) is being rebuilt from a Claude Design draft onto the SGS
WordPress block framework. Bean's fix register, `.claude/plans/2026-10-02-eye-care-fix-register.md`, is the source
of truth for what gets fixed: it holds the issues he decided and the fixes he agreed, each with a Status (proven /
to prove / decision) and a Type (tree / framework repair / framework new / content / client).

This is a PARALLEL TRACK. Two other sessions are planned on the same repo and you must not do their work:
- Session C repairs the Spec 47 measuring route and touches only `scripts/computed-route/` and `scripts/parity/`.
- Session C2 afterwards judges the measuring tool's findings, investigates anything unproven, and takes Bean's
  yes/no per item.
Your track needs neither: every item below has its cause already proven in the code and its fix already decided in
the register, so no investigation and no approval is owed. Same shape as the Google reviews track that ran beside
Session B. File overlap with Session C is zero: yours are `plugins/sgs-blocks/` and `theme/sgs-theme/`.

Read first:
- `.claude/plans/2026-10-05-eye-care-register-proven-repairs.md` in full. It is this track's plan: the twelve items
  with their verified causes, the five that need the rule locating first, the two to check as possibly already
  done, the hard boundaries, gates P1 to P3, and what was deliberately left out.
- For each item you pick up, its row in `.claude/plans/2026-10-02-eye-care-fix-register.md`. The register's fix
  stands; you implement it, you do not redesign it.

Tasks, in order:

1. **Settle the two that may already be done** (5 min, inline, read-only). Item 76: read the colour tile's
   `transition` list for `transform` (its Sweep column says "closed earlier" and S1's note says the tiles now take
   the 0.25s timing). Item 87: read the breadcrumb render for the current-item marker and the weight (Sweep says
   "clean on the walker"). Done when each is either struck off with the line that proves it, or confirmed open.
   Do this first: re-fixing something that already works leaves two overlapping fixes and neither can ever be
   safely removed (`~/.claude/rules/prove-the-cause-before-fix.md`).

2. **Build the five whose cause is verified** (about 1 h, inline or one subagent per item — no two share a file).
   Each is in the plan with its cause cited and its decided fix. In ascending order of risk: 38 the hours day-label
   weight (`business-info/style.css` hardcodes `font-weight: 600` on `.sgs-business-hours__day`, also closes
   register 130); N46 the footer row that collapses under a width cap (copy the header precedent, `acc2a3b6d` added
   `:where(<root> > *){width:100%;}` inside `includes/sgs-header-rows-align-css.php` for the same cause, and read
   its standalone test `tests/php/run-header-rows-align-standalone.php` first); N11(b) the 30-second per-fingerprint
   cooldown in `includes/class-cart-proxy.php::COOLDOWN_SECONDS` that blocks a normal second pair; 15 the drawer
   body (`min-height: 100%` under a 64px title row, so it ends 64px below the screen); S1 the button hover timing
   (`button/render.php` emits `transition:all {duration}ms` unconditionally and `block.json` defaults
   `transitionDuration` to 300, so the site value at `settings.custom.buttonPresets.default.hover-transition` never
   reaches a button). **S1 carries a trap**: a 300 default makes "unset" and "deliberately 300" indistinguishable,
   so the default must change to a value meaning inherit. That is a default change — the framework is
   pre-production, so choose on merit and name the choice and its effect on other clients in the commit message.

3. **Locate the rule, then build, for the five register-stated items** (about 50 min). S12 the focus underline that
   survives a click; N3 with 17B the bag count's inherited 2px nudge; N17b the hero vertical position writing to
   the wrong axis plus a hardcoded centre; 68 the colour tile's top padding on photo tiles; N25 the filter panel's
   empty group wrappers after choose-then-clear. **Each starts with a two-minute locate.** If the cause is not
   where the register says, STOP that item, record what you actually found against its register row, and move on:
   never substitute a fix of your own. Note S12 may be partly done — `theme/sgs-theme/assets/css/utilities.css`
   already uses `:focus-visible`, so find whatever still fires on mouse focus before changing anything. N25 comes
   with its own test in the register: choose a filter, clear it, and the group count must equal the heading count.

4. **Gate P2, the canary** (25 min, one host job at a time). `python plugins/sgs-blocks/scripts/run-gates.py --tier
   full`, `check-wiring-fingerprint.py --check` with no new blocking gaps, `python
   scripts/check-no-client-names.py --check`, and a before-and-after of sandybrown's motion-QA fixture pages (2103,
   2109, 2113, 2603, 2740, 3037) at 375/768/1440 showing no unintended computed-style change. Then check each
   repaired behaviour in a real browser on the real front end AND the real editor: a green build proves neither.
   Use `/sgs-wp-engine`, and `/wp-sgs-deploy` for the sandybrown deploy ceremony.

5. **Gate P3, update the register** (10 min, inline). Every item built says so in its own row with the commit hash;
   every item stopped records what was found; every tree value you discovered but did not write is recorded against
   its row for Session D. Leave the register's content otherwise untouched.

6. **At handoff**, tell Session C what you deployed and when, so its C3.6 sweep records the right block code, and
   `git rm` this prompt file: prompt files are single-use. `/handoff` does the rest.

Guardrails:
- **Never touch `scripts/computed-route/` or `scripts/parity/`.** Session C owns every file in both. Yours are
  `plugins/sgs-blocks/` and `theme/sgs-theme/` only.
- **Never write a page tree** (`sites/eye-care-ward-end/build/*.tree.json`). The trees are the measuring route's
  write target and Session D's work. Where an item's remainder is a tree value (15's "More" list gap and line
  height, for example), build the framework half and record the value needed.
- **Never add a `divergences.json` entry.** The ledger is Solve's write target, so a wrongly added entry freezes a
  wrong value permanently and turns no check red.
- **Never deploy to eye-care-test and never reseed until Session C's Wave 3 sweep has run.** Session C's whole
  output is a framework-gap count measured on the repaired route against a baseline taken at block code
  `4726700c1`; block code changing underneath it confounds that count, and `/sgs-update` rebuilds the database its
  resolver and calibration lanes read. Verify on sandybrown, commit to `main` as normal, and hand the reseed and
  the eye-care-test deploy to Session C's Wave 3, which already runs exactly one of each. Message that session
  either way.
- **If sandybrown will not deploy**, it is the known blocker, not you: `build-deploy.py --target sandybrown` aborts
  on its oldshape audit over 155 old-shape `sgs/cta-section` blocks on the Spec 47 calibration page (post 4750).
  Migrate with `scripts/wp-migrate-oldshape-blocks.js` or empty the page (calibration replaces it with an empty
  tree at the end of each run anyway). Session C's C0.2 does the same job, so check whether it is already cleared.
  **Never `--skip-oldshape-audit`, never `--allow-dirty`, never `--skip-verify`.**
- **Every new setting needs an inspector control and a `style.css` or `render.php` reader in the same commit**, or
  it exists, paints nothing, and `check-dead-controls.js` goes red. Confirm `calibrate.mjs` plans an instance for
  any new hover setting. `audit-inline-styling.js --check` must exit 0 (Spec 32): no SGS block renders an inline
  style declaration.
- **No deprecations** (`.claude/rules/block-authoring.md`): no `deprecated.js`, none wired into `registerBlockType`,
  no version bumps pre-production.
- **Never touch `sgs/google-reviews`.** Another track owns it, and its colours and sizes follow Google's own
  interface rather than the theme, which is an accepted difference and never a gap.
- **Never stage** `.claude/reports/serverside-render-disabled-audit.*`,
  `plugins/sgs-blocks/scripts/consistency/*.json`, `plugins/sgs-blocks/scripts/dbschema/seed-history.json`,
  `plugins/sgs-blocks/.phpunit.cache/*`, `reports/phase4-*.txt`,
  `.claude/reports/2026-10-04-route-data-audit/fingerprint/*.json`, or any path containing `Bean Points`. Commit
  straight to `main` with an explicit pathspec, checking `git branch --show-current` in the same command; never
  `git add -A`, never a glob, never a stash.
- **Host tools:** `SGS_HEADED=1`, one job at a time. If Hostinger shows a captcha, use the WSL mirrors
  (`scripts/local-wp/README.md`).
