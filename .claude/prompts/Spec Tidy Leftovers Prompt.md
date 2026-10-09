Invoke /autopilot before doing anything else.

GOAL
Finish the last items left after the 2026-10-09 spec tidy: four choices only Bean can take, then a short list of small checks and
fixes. This prompt file is single-use: delete it (git rm) when the work is done.

CONTEXT
SGS is a WordPress block framework (repo c:\Users\Bean\Projects\small-giants-wp). The specs in .claude/specs/ were tidied to
current truth on 2026-10-09: cloning is Spec 47 only; Specs 41, 28, 30, 26 and 33 were merged into Specs 36, 27 and 32 (FR ids
unchanged); .claude/specs/README.md maps every retired spec number to its new home. Already decided by Bean: WCAG level is the
framework baseline (2.1 AA plus 2.2's cheap wins); each spec records its own FR status (Spec 36 now has a Status line per FR);
the universal gradient rollout is closed (77 blocks, shared helper sgs_css_gradient_value()).

TASKS, IN ORDER
1. Put these four decisions to Bean as self-contained choices (what it is, options with benefits and drawbacks, your
   recommendation), and apply each answer in the same turn:
   a. Spec 05 client notes (.claude/specs/05-SGS-CLIENT-NOTES.md): the roster says deferred, but plugins/sgs-client-notes is built
      and live on sandybrown (commits "live on sandybrown", emails on note creation and reply). Bean believes WordPress native Notes
      (editor-side block comments) replaced it; this plugin is a front-end annotation tool for clients, so they may not overlap.
      Keep and mark active, or retire the plugin and the spec.
   b. Spec 47 R-47-1 row still says "Spec 31 code" and "Spec 31's plans": replace with "the retired converter code" and "the
      retired converter's plans". A rule-row edit needs Bean's approval.
   c. Spec 36 Part 14 (the condensed Spec 41) is about 173 KB; a second pass could cut about 30% more but would trim rules that code
      and gates read. Optional; recommend leaving it.
   d. Parked product items with no plan home: Spec 35A's open items (spacing token control, brand-strip gallery picker, Section
      Styles, populate-db.py retirement, PHPUnit environment), `wp sgs seed-template-parts` and `seeding-arm` (still use style-variation
      wording the theme dropped), the decorative-foods PNGs in the theme (client art), .claude/specs/design-brain/ (rubrics for
      user-global skills), Spec 04's unbuilt payment, address-lookup, max-files and retention features, and eight SGS blocks that have
      colour attributes but no gradient attribute (sgs/account, wishlist-panel, wishlist-link, image-sequence, decorative-image,
      theme-toggle, choice-flow-result, mega-group). Each is keep / cut / plan; record the answer in the owning spec or a plan.
   Done when each is applied or recorded. Inline; about 10 min plus Bean's time.
2. Small fixes (delegate to one Sonnet subagent via /delegate, comments and text only; other sessions have uncommitted edits, so
   `git diff --stat -- <file>` first and skip any file with foreign changes):
   - ~40 old citations (Spec 41, 28, 30, FR-31-22) remain inside plugins/sgs-blocks/src/blocks/{account,nav-bar-menu,nav-drawer-menu,
     nav-drawer,product-card,theme-toggle}/block.json `_note`, `reason` and `description` strings. Some descriptions are shown in the
     editor and the DB seed holds copies, so do this as one pass, then run /sgs-update from a CLEAN HEAD and diff the DB.
   - plugins/sgs-blocks/src/shared/nav-interactivity/mega-disclosure.js header comment says hover-intent is 300ms; the block default is 80ms.
   - sites/mamas-munches/accepted-differences.md intro still names the old computed-parity tool; point it at the parity walker.
3. Checks that need a live look or a run (Playwright/Chrome, one batched pass): Spec 42 FR-42-5 (does the form picker show a type badge
   anyway through WordPress's own link search? status is NOT BUILT until seen); Spec 38 wave-gradient current look and reduced-motion
   behaviour; Spec 18 back-to-top ignores prefers-reduced-motion in plugins/sgs-blocks/assets/floating-ui/floating-ui.js (always
   scrollTo smooth): decide fix (one line) or leave; Spec 36 FR-36-11 (forced-colors on nav-drawer-menu and mega-panel), FR-36-16
   (mega-region late-CSS A/B gate report), FR-36-17 (mega performance budget), FR-36-26c (live three-type render). Correct each spec's
   Status line to what you find.

GUARDRAILS
Never git add -A or a glob; never stash; commit to main with explicit paths and `git branch --show-current` in the same command; push
after each task. Use git grep, not grep -r. Do not edit .claude/archive/ or .claude/plans/archive/. Do not change Spec 47's
divergence-ledger rules. Do not touch plugins/sgs-blocks/scripts/converter, recogniser, oracle or orchestrator (the "Remove Old
Converter" prompt owns them). Verify: python plugins/sgs-blocks/scripts/lints/lint-spec-drift.py --check shows 0 gating;
python .claude/hooks/handoff-preflight.py --check is 5 of 5; then /handoff.
