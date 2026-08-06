---
doc_type: session
project: small-giants-wp
date: 2026-08-06
track: 1b (Spec 35)
---

# 2026-08-06 — Track 1b: the container-mirror payload landed, plus 4 residuals

Swept from LEDGER.md at session close. Commits: `c9857923` `271d0ab9` `6ed15e11` `60f7fbbb`
`fc71ee16` `3cbdd89f` `d6027ec9`.

## The headline: the "blocked" payload was not blocked, it was broken

The inherited handoff said 15 `block.json` files were uncommitted and "blocked by the visual-diff
gate", with a circularity to solve first. Both halves were wrong.

**1. There was no circularity.** `build-deploy.py` already carried `--payload`, written for exactly
this deadlock (its own docstring: *"Breaks the deploy<->commit deadlock … canary-deploy the payload
uncommitted, capture the visual-diff report the pre-commit gate demands, THEN commit"*). You name the
files you intend to ship uncommitted; anything else dirty still blocks, so D336's protection is
intact. The deploy-relevant dirty set was exactly the 15 files — nothing from the co-active track.

**2. They did not build.** `npm run build` exited 1. Two defects inside the pending work:
- Six blocks (hero, cta-section, trust-bar, physics-canvas, site-header, site-footer) declared a
  `tagName` attribute mirrored from `sgs/container` that **nothing read**. Dead control: a client
  picks a tag, nothing happens.
- `nav-menu` hardcoded `justify-content: space-between` on the block ROOT, which the newly-added
  `justifyContent` attr is meant to own — the control would have been dead on arrival.

A third finding was a FALSE positive worth recording: the F3 gate flagged site-header's
`align-items`, but that rule targets `.sgs-header-icons`, which is an operator `className` on a
NESTED `sgs/container` block (four theme patterns), not a site-header sub-element. A BEM rename would
have been both wrong and breaking. Moved to `:where()` anyway, because at (0,2,0) it could suppress
that child's own alignment attr. The gate's E13 exemption deliberately does NOT cover hyphenated
descendants (root class is not reliably derivable) — widening it would have overridden a documented
decision.

## Pre-deploy render-risk analysis (the method, worth reusing)

Before deploying, all 266 newly-declared attrs were compared against the `??` fallback each consuming
PHP file already used. **First pass was wrong and its wrongness is the lesson:** it matched attribute
NAMES across ALL blocks, so `multi-button.columns` was compared against `card-grid/render.php`, a file
that never renders multi-button — 111 false positives. Re-scoped to each block's OWN `render.php` plus
the shared `includes/`, the signal collapsed to: 207 pairs provably neutral, 12 empty-vs-empty, 46
with no PHP consumer, **13 differing — all shape-dividers, all matching `sgs/container` exactly**.

Those 13 are unreachable on stored content: they sit behind `if ( $shape_top )` guards, and because
the attrs were previously UNDECLARED, WordPress would have discarded any stored value (D338). No
stored instance can have a divider enabled. That argument is provable, not probabilistic.

## D498 — the footer landmark (Bean's catch)

Bean asked "why not switch footer to a footer class?" The live DOM agreed with him. Full detail in
`decisions.md` D498. Short version: the page had FOUR `<footer>` elements and ZERO contentinfo
landmark — all four were sub-elements inside `<main>`. Cause was the exact mirror of D375's header
bug. Two claims in the `render.php` docblock were measured false, one of which (the tag allowlist)
had been wrong since D344 in July.

Bean's other catch: trust-bar and physics-canvas are section-KIND composites and should say so in the
markup. I had set their `tagName` default from the tag they currently EMIT (`div`) rather than what
they ARE. No CSS selects any of these by tag, so `div` → `section` is visually inert and semantically
correct. Verified live.

## Evidence discipline — what was measured vs what was not

All 14 blocks carry a first-paint capture taken with **JavaScript disabled** (strictly harder than
"before the module boots") against a **published** canary URL.

Three blocks (brand-strip, mega-aside, mega-panel) had no published surface. They were held back from
the first commit rather than stamp `first_paint_capture_passed: true` on a capture nobody took. Then
fixtures were published through the **block editor's own data layer** (Playwright +
`wp.data.dispatch` / `wp.blocks.createBlock`) — never `post_content` via WP-CLI or SQL, and never
hand-authored markup with guessed attributes. brand-strip reused the existing configured draft 1513
so the fixture carried real logo content; mega-aside was nested inside mega-panel because it declares
`parent: ['sgs/mega-panel']`.

**Enum-narrowing risk** (the real risk for those three) was checked against the database, not assumed:
a REGEXP over `post_content` for all six narrowed attrs matched two posts, holding
`colourScheme:"dark"` and `desktopFrameExt:"webp"` — both inside their new enums. Nothing can be
coerced.

**Probe failures that were MY bugs, not defects** — three in one session, all the same shape:
1. A `git show` with cp1252 decoding crashed silently and returned empty, so every attribute counted
   as "new" (556 instead of 266).
2. `.sgs-physics-canvas` matched zero — the block emits `wp-block-sgs-physics-canvas`. Broken probe,
   not broken block.
3. The `inspector-scan` JSON schema was guessed twice (`findings` / `flagged` keys) and reported
   "0 findings" for a working tool. Had I stopped at the first, I would have reported a correct
   migration as broken.

Also: `EXIT=0` values captured through a `| tail` pipe are **tail's** exit code, not the probe's.

## The 69 rows: decisions, not detector work

`/sgs-update` was run (announced, DB backed up first, no agents active). Result: **unchanged** —
1609 roled / 69 NULL, byte-identical buckets before and after. The `extract-signatures` fix moves
element manifests, not role assignment.

`ASSIGNABLE 0` had been firing an "below the declared expectation" warning on every run. Investigated
rather than accepted: the expectation was declared when the eligible pool was **262 rows**; a live
count returns 1609 roled vs 69 NULL. ASSIGNABLE 0 is the CORRECT steady state. Every one of the 69 IS
reached by a detector (`unreached` = 0) and lands in a bucket that deliberately declines to assign.

The warning was **re-pointed, not deleted** — it now fires if the pool GROWS while ASSIGNABLE stays 0
(new unroled attrs should be assignable), plus a second warning if any row reaches no detector at
all. `--self-test` still passes. A tripwire that fires every run is one nobody reads; deleting it
would drop a real defence.

**Corrected figure:** the LEDGER recorded D4-needs-review as 32. It is 22. The four buckets sum to 69
(33+22+13+1); with 32 they summed to 79.

## Delegation notes

Three agents ran on strictly disjoint paths, none permitted to commit (concurrent agent commits
collide on `.git/index`; one killed command left a stale `index.lock` that had to be cleared after
confirming no git process was running).

- **extract-signatures case bug** — real. `"" + "Gap"` could never match a camelCase `gap`, silently
  disabling the prefix-convention path for every bare-prefix element. 224 → 280 matches (+56) across
  7 blocks. The agent self-corrected a wrong intermediate figure (394 from a hand-rolled harness that
  did not replicate the real function's attrMap precedence).
- **Task C** — 6 rules ported. Independently re-verified by the orchestrating session: 16 FLAGGED +
  2 BASELINED both sides, identical per rule. The agent caught a nuance the "6 gating rules" framing
  hides: only **4** are severity `warn` and actually gate; porting the other 2 as gates would have
  created new unreviewed gates.
- **multi-button Phase B** — stopped safely at the login throttle. Diagnosed: the wp-login FORM is
  rate-limited and the driver logs in once per run, so dry-run + live = two logins. The REST
  app-password path is unaffected. Fix is one session, one login, both posts.

⚠ **A correction I owed:** I told an agent the multi-button blocker was "cleared" because my own
Playwright login had succeeded. That was an inference from one data point and it was wrong — it sent
an agent at a still-blocked task. Nothing was harmed (post 2130 byte-identical, `modified` timestamp
unchanged), but the reasoning was the error, not the outcome.

⚠ **A doc "error" that was mine:** an agent reported the multi-button report cites the driver at the
wrong path. Checked: the report is correct; the wrong path came from my own agent brief. Verifying
saved me from "correcting" an accurate document.
