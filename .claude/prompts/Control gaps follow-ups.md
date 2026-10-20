Invoke /autopilot before doing anything else.

CONTEXT (plain English) The 12 control gaps (features Mama's and Indus's drafts use that SGS lacked) are closed: built, reviewed, live-checked and on sandybrown, indus-test and mamas-test, and Bean co-signed faithful screenshot pairs on mamas-test (2026-10-20). That review added a pressed state and custom easing to the site-wide button style, and let the per-block Additional CSS box hold `@keyframes`. A handful of follow-ups were parked; this session clears them.

READ FIRST
- C:\Users\Bean\Projects\small-giants-wp\.claude\plans\2026-10-19-control-gaps-build.md: "## Parking lot" (every item there is in scope unless it names another owner).
- C:\Users\Bean\Projects\small-giants-wp\.claude\specs\32-COMPONENT-STYLING-TOKEN-CONTRACT.md: FR-32-19 (button presets' press and timing, its "Not built" list) and FR-32-20.

TASKS, IN ORDER
1. Pre-flight (5 min): git pull --ff-only; ListAgents and SendMessage peers before any build, deploy or reseed.
2. The pressed state and per-variant timing on the other button-shaped CTAs that read the button preset tokens: the buybox add-to-cart, product-card's CTA and whatsapp-cta (FR-32-19 Not built). Reuse plugins/sgs-blocks/includes/helpers-button-press.php; MUST FAIL tests first; done when each prints the `:active` rule only when the preset sets a press role, and a live pointer press on mamas-test matches sgs/button's.
3. Fix plugins/sgs-blocks/scripts/hover-guard/check.js so it runs: its CSS half reads `build/blocks/*/style-index.css`, and its PHP half passes relative paths with a larger execFileSync buffer. Then fix or baseline, with a reason, the 4 existing failures it reports (choice-flow-colour, fx-cursor-field, separators-hover-css, testimonial). Done when `node plugins/sgs-blocks/scripts/hover-guard/check.js` exits 0 and a planted unguarded `:hover` rule turns it red.
4. G6's add path: find why product 1125 (the canary's "single-variant fixture") refuses every add with "Variation attributes are required" from both the in-page button and the bar (/systematic-debugging, cause first), fix it at the root, then prove on the canary at 375 that the add-to-basket bar's click changes the cart count.
5. Ask Bean to tap a hero button on mamas-test on his phone (the press should show while held), since no test harness could trigger :active on touch; record the result in FR-32-19's Status.
6. The remaining parking-lot items in order (the 86 TextStrokeColour rows without css_property, the wiring-fingerprint baseline update when no other session holds it); each closed or reasoned.
7. Close: /qc-council on this session's commits, then /handoff.

GUARDRAILS
- A reseed is python plugins/sgs-blocks/scripts/sgs-update-v2.py from a detached HEAD worktree at a timestamped short path (copy, never link, node packages); message peers first, since intake sessions read the DB.
- Subagents never run git checkout, restore, stash, add, commit, build or deploy.
- node plugins/sgs-blocks/scripts/audit-inline-styling.js --check and node plugins/sgs-blocks/scripts/inspector-scan/run.js --check exit 0.
- Before saying SGS lacks a control, grep its motion schema and extensions (Bean names controls by their inspector labels).
