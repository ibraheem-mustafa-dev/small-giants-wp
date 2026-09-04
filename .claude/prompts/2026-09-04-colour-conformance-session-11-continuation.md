---
doc_type: prompt
title: Dispatch prompt — colour conformance, session 11 continuation
created: 2026-09-04
governs: .claude/plans/2026-09-03-golden-colour-staged-rollout.md
supersedes: .claude/prompts/2026-09-04-golden-colour-phase3-continuation-prompt.md, .claude/prompts/2026-09-04-colour-conformance-qc-council-continuation-prompt.md
retention: delete once consumed
---

# Session start: colour conformance — verify the parallel dispatch, then work the confirmed-safe/hard split

Read `c:\Users\Bean\Projects\small-giants-wp\CLAUDE.md` in full, then
`.claude/plans/2026-09-03-golden-colour-staged-rollout.md` in full — it is the live spec. Read
its **"fix.js hardening + first real --apply — 2026-09-04 (session 10)"** section (near the
end, before "Standing rules") first — session 10 rewrote most of what session 9's handoff
claimed, in both directions, and you need that context before touching anything.

## What session 10 actually did (don't re-derive this, it's expensive to re-derive)

1. **`fix.js` itself needed real hardening, not a quick patch.** Ran `/subagent-driven-development`
   in an isolated worktree (3 tasks, 5 review rounds total, cross-model review every round).
   Found and fixed: a classifier mislabelling bug, 3 pattern-matching gaps (one root cause), a
   hover-insertion nesting bug that made generated controls silently dead, **and — the review
   round no per-task check could catch — a live violation of the project's touch-safe hover
   doctrine** (the codemod was hand-building an unguarded `:hover` rule, which the framework's
   own gate would have failed). 7 commits, merged to `main` (`949c4d701`). self-test 15→23.
2. **First-ever real `--apply` run** (`nav-menu`/`team-member`, 7 rows) found a gap NONE of the
   review rounds covered: `--apply` doesn't wire the new attribute into the elements-manifest
   `attrMap`. Fixed by hand (twice now — nav-menu's two gradient attrs). **Not fixed in the
   tool.** Run `node scripts/check-element-manifest-conformance.js --check` after ANY future
   `--apply` run, before committing — don't assume this is fixed just because it was fixed
   before.
3. **Deployed and live-verified** (commit `653aaa69b`) via real Playwright hover probes on
   sandybrown. Two probe-writing mistakes were made and caught mid-session — **read the "Read
   this before writing another probe" section below before writing your own.**
4. **Reclassified rows in BOTH directions** from session 9's own (previously undocumented,
   only pasted into a conversation) 76-row synthesis — some rows moved from "tool bug" to
   "correctly refused by design," others moved from "trivial" to "genuinely hard." See the
   plan doc's own reclassification note for the full list — don't trust ANY older doc's
   characterisation of `product-card`'s title/desc/price/priceNote rows as "trivial swaps,"
   that was wrong.
5. **Dispatched 2 parallel agents** (via `/dispatching-parallel-agents`) for the two
   confirmed-genuinely-trivial rows remaining: `pricing-table.ctaBackground`/
   `.popularBadgeBackground` and `nav-menu.underlineColour`. **These were still running when
   this prompt was written — your first job is below.**

## Job 1 — verify the parallel dispatch, first thing

```bash
cd plugins/sgs-blocks
git log --oneline -10 -- src/blocks/pricing-table
git log --oneline -10 -- src/blocks/nav-menu
node scripts/colour-codemod/survey.js
```

Check whether both agents' commits landed (search for commit messages mentioning
`ctaBackgroundGradient`/`popularBadgeBackgroundGradient` and `underlineColourGradient`). If
they landed:
- Confirm `node scripts/check-element-manifest-conformance.js --check` passes (this is the
  exact gap named in point 2 above — both agents were told to check it, but VERIFY, don't
  trust the report).
- Confirm `npm run build` is green.
- **Deploy and live-verify with a real hover/gradient probe** — nothing from this dispatch has
  been live-tested yet. Use `check-colour-gradient-roundtrip.js` for the gradient dimension
  (both pricing-table rows are gradient additions) — you'll need to add fixture entries the
  same way session 10 did for `google-reviews`/`testimonial-slider` (read the script's
  `FIXTURES` object and its dotted-id convention, added this session specifically for this
  purpose). `nav-menu.underlineColour` needs its own probe (decorative bar, may need a
  hover-fires check too if it wired a hover sibling — check what the agent actually built).

If they did NOT land, or landed with problems: read their reports if still in context, or
re-derive from `git log` + `git diff`, and decide whether to fix forward or re-dispatch.

## Job 2 — re-derive the worklist fresh (every number here is already stale by definition)

```bash
node scripts/colour-codemod/survey.js
node scripts/colour-codemod/fix.js --fix          # dry run, writes nothing
```

## What's confirmed hard, don't re-attempt as "trivial" (session 10 verified these, don't re-derive)

- **`product-card.titleColour`/`.descColour`/`.priceColour`/`.priceNoteColour`** — feed a CSS
  custom property (`--sgs-card-title-colour` etc.) consumed by ONE `color:` declaration. A
  gradient needs 3 properties (`background-image`+`clip`+`color:transparent`) — cannot fit
  through one custom-property substitution. Same shape as `mega-panel`. Needs real design (a
  second gradient-carrying custom property + a conditional PHP branch choosing which CSS
  property to emit, or moving off custom-property indirection entirely) — not a copy-paste.
- **`tabs.tabBgColour`/`.panelBgColour`** (`--sgs-tab-bg`/`--sgs-panel-bg`) and
  **`social-icons.iconBackground`/`.iconBackgroundHover`** (`--sgs-social-bg`) — confirmed
  custom-property-fed.
- **`mega-panel`'s color-mix() derivations, `brand-strip.tileBackgroundColour`,
  `form.progressBarColour`, `post-grid.cardBgColour`** — named hard in session 9, unconfirmed
  further this session, treat as still hard until someone reads the actual code.
- **`option-picker`'s bespoke `--sgs-op-*` multi-variant pattern** — documented
  not-gradient-capable without new design (see `plugins/sgs-blocks/CLAUDE.md`'s "Colour
  EMISSION helpers" section).
- **`cta-section.backgroundColour`** — WP-native colour-support mechanism, not SGS helpers.
- **`post-grid.titleColour`/`.excerptColour`/`.metaColour`/`.readMoreColour`** — loop/dynamic-key
  shape, `fix.js`'s own docblock disclaims it, don't extend the matcher to guess.
- **`form.submitBackground`, `modal.triggerBackground`, `modal.modalBackground`** — CORRECTLY
  refused by design (`resolveDirectSelector`'s "never invent a selector" principle — these push
  into a plain array with no selector in the statement to recover). Do not try to force these
  through; they were miscategorised as "tool bugs" in session 9's original synthesis and that
  was wrong.
- **`sgs/quote.attributionColourHover`** — `fix.js` correctly self-refuses
  (`multiple-destructure-blocks-ambiguous`, `quote.js` has multiple ambiguous `= attributes;`
  blocks). Needs a human to pick the right block, or a smarter AST rule — not a blind retry.

## A real bug in ALREADY-SHIPPED code, unrelated to fix.js, not yet fixed

`sgs/info-box`'s existing gradient-text rollout is broken — it emits garbage CSS
(`color:var(--wp--preset--color--linear-gradient90degff...)`) for any gradient value, because
it uses the WRONG helper pairing (`sgs_text_decls()`+`sgs_emit_state_colour_css()`, safe only
for flat colours) instead of the correct one
(`sgs_resolve_text_colour_or_gradient()`→`sgs_text_colour_decl()`→
`sgs_text_colour_gradient_fallback_rule()`). Verified live via REST + rendered-content
inspection. **Not fixed. Worth a quick grep (`grep -rl "sgs_text_decls" src/blocks/*/render.php`)
to check for OTHER blocks using the same wrong pairing before assuming info-box is the only
instance** — this defect class has never been surveyed tree-wide.

## Read this before writing another live probe

Two probe-authoring mistakes were made and caught this session — read the plan doc's own
"Hard-won live-probe gotchas" section (session 10) in full before writing an ad-hoc hover or
gradient probe:
1. A page-scoped selector can silently grab the WRONG instance of a widely-used block
   (`nav-menu` renders 3× on a typical page via theme chrome) — always scope to a
   `<!-- wp:group {"anchor":"probe-id"} -->` wrapper.
2. A hover-vs-base colour probe needs DIFFERENTIATED token values on the two attributes, or a
   coincidental default match produces a false result in either direction — and always pair
   "hover fires" with "unhover reverts."

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — every session |
| `/subagent-driven-development` | If MORE real bugs in `fix.js` itself surface (worked extremely well this session — 5 review rounds, every one found something real) |
| `/dispatching-parallel-agents` | For any well-evidenced, disjoint-file trivial batch once confirmed-safe candidates are found (worked cleanly this session for pricing-table + nav-menu) |
| `/qc-council` | Before trusting any NEW row-classification claim from a doc or a prior session's summary — session 9's own unwritten synthesis was wrong on 4+ rows |
| `/visual-qa` or a hand-rolled Playwright probe | Live verification — see the gotchas above |
| `/handoff` | Session close |

## Tools

| Tool | Use for |
|---|---|
| `node scripts/colour-codemod/survey.js` / `fix.js --fix` | Re-derive current state — never trust a cached number from this or any prompt/doc, including this one |
| `node scripts/colour-codemod/fix.js --self-test` | Run before AND after any further `fix.js` edit — 23 assertions as of session 10, catches regressions |
| `node scripts/check-element-manifest-conformance.js --check` | Run after EVERY `--apply` run, before committing — `--apply` does not wire the attrMap entry itself yet |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."` | Check element attrMap / css_property before assuming a mechanism |
| `scripts/qa/check-colour-gradient-roundtrip.js` | Live gradient-fires probe — extend its `FIXTURES` object, don't rebuild it |
| `npm run gate:fast` | After every batch — 88+ gates, ~65-77s |

## Hand back, don't improvise, if:

- A row's refusal reason doesn't match what the actual code shows when you read it — real gap
  or another tool bug, not a forced fix either way.
- `git status` shows uncommitted work in your target paths you didn't write — this tree has had
  3+ concurrent sessions active on the same day, every day. Check before editing, and never run
  a bare `git commit` without `-- <explicit paths>`.
- You're about to touch `fix.js` itself again — re-run `--self-test` before AND after (23/23 as
  of session 10), and don't remove the `multiple-destructure-blocks-ambiguous`/
  `multiple-hover-sinks-ambiguous`/`hoist-blocked-by-*` refuse-rather-than-guess guards to force
  a row through — every one of them was added because forcing a row through produced a real
  bug.
- A pre-commit gate fails on something OBVIOUSLY unrelated to your diff (a DB-consistency
  finding about a block you never touched, a visual-diff gate on a purely mechanical gradient
  addition) — the project has TWO sanctioned scoped bypasses for exactly this, used repeatedly
  and correctly this session: `SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="..."` for
  the visual-diff gate, and `git commit --no-verify` (with a clear, honest reason in the commit
  message) ONLY for a gate whose own source comments document it as the sanctioned escape (the
  F5 db-consistency gate does; check before assuming any other gate does). Never blanket
  `--no-verify` to skip everything.
