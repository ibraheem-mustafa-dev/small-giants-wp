# Next session — container/layout system + archive design

Invoke `/autopilot` before anything else.

> Renamed from `2026-08-24-template-remediation.md` on 2026-08-24. That prompt's #1 item
> (the 91px shop contradiction) is now RESOLVED (D760) and its Stack-layout side-track is
> also COMPLETE. The track has moved from "fix broken templates" to "finish the container
> layout system, then settle the archive design questions" — hence the rename.

---

## The one rule that governs this whole track

> **Do not assess a template by reading its code, querying the DB, calling REST, or
> inspecting hooks. Log in with `/playwright`, open the thing, LOOK at it, interact with it.**

Bean set this rule and it has earned itself repeatedly. Every gate has passed at least three
separate times while a template was visibly broken. Code reads may EXPLAIN something you have
already seen; they may never be the evidence that something is fine.

## Read first, in this order

1. `.claude/decisions.md` — **D760** (the 91px fix, and why D758's cascade audit missed the
   real cause), **D758** (superseded conclusion, kept for the ruled-out list), **D757** (all
   four product listings use the bespoke card), **D756** (card-grid query-inherit rebuild,
   DROPPED — do not re-propose), **D755** (the null-default 400, closed).
2. `.claude/plans/2026-08-24-stack-layout-rebuild.md` — COMPLETE. Read the Outcome section
   before touching `sgs/container`'s layout system again.
3. `.claude/plans/2026-08-24-template-by-template-remediation.md` — the governing register.
   Read the "⛔ Open items carried out of the 2026-08-24 wave" section (item 1 is now marked
   resolved) and Part 2's issue register. ⚠ It contains a section marked **SUPERSEDED**
   further down; do not act on it.
4. `.claude/LEDGER.md` — the container-layout / template-remediation block at the top.
5. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **IN FULL** if you touch the converter,
   walker, or `sgs/container`. Standing project rule. Templates route through `sgs/container`,
   so container changes count.

## Where the work stands

**Shipped and verified (2026-08-24):** Stack is a real layout type on `sgs/container` (gap,
alignment, canvas mirroring all work; QC-inline 7/7); the shop's last-row stretch is fixed
(D760); all four product listings use `sgs/product-card`; PDP cards uniform (305 ×4); cards
fill their cell; dead rating filter removed; filter headings on the body font.

**Open, in the order I would take them:**

### 1. Verify the `solid` option-picker contrast fix — it is deployed but UNVERIFIED

Now the highest-value open item: the last two ahead of it (the 91px contradiction, the Stack
layout gap) are both resolved today.

The resting border was measured at **2.38:1** against its container, below the WCAG 3.0
UI-boundary floor, because the preset used the client's pale-pink `primary`. The fix (neutral
tokens with a floor) is deployed, but **no live surface renders a solid-preset picker** —
`showPickers:false` on the shop and the PDP rail, and the standalone buybox picker uses
`outlined`. The 12.55:1 measured post-deploy is the pre-existing OUTLINED behaviour, not
evidence.

You need a product-card instance with pickers enabled. Then measure fill-vs-container AND
border-vs-container — not text contrast, which was fine (12.55:1) throughout and is what
made three earlier probes miss this.

### 2. `layout` has no enum on `sgs/container` — add one

Found during the Stack rebuild, not fixed. An invalid `layout` value (a typo, a stale
migration write) silently falls through to `display:block` — the exact bug Stack rebuild just
fixed, reachable by a second route. Small, mechanical, low-risk: add the enum to `block.json`,
confirm an invalid value now fails loudly instead of silently degrading.

### 3. flexWrap default flip — BLOCKED on a content migration

94 stored `sgs/container` instances carry no `flexWrap`; 4 carry no attributes at all. Theme
FILES are all authored now — this is a DB-content problem, not a code problem. Several
affected instances are `[GATE - DO NOT DELETE]` fixtures. Do not touch them by hand; this
needs a migration script with its own verification pass, not a manual sweep.

### 4. ~59 "accidental columns" — RE-RUN THE SURVEY FIRST, the count is unreliable

`survey-flex-row-shape.py` (`--survey/--verbose/--json/--self-test`) exists and its own
self-test is 9/9. Its regex is now FIXED (it could not see core blocks, which serialise
without a namespace), but the "52 / 5 / 59" split was produced BEFORE that fix. Re-run it
before treating any of those figures as fact. `layout:"stack"` now exists as the correct
destination for a container authored as flex-row that is really a stack, but converting one
changes its children from content-sized to full-width — a VISIBLE change. Bring Bean
screenshots per candidate; do not batch-convert.

### 5. A design call for Bean — do not decide this yourself

At 375px the shop archive is **1-up at 327px**; the PDP related rail is **2-up at 155px**,
under the 167-195px readable-card floor from the design benchmark. Bean has the screenshots.
Ask; do not pick.

### 6. Sweep the single-child-shrunk container shape (D757)

`sgs/container` defaults to `layout:"flex"` with `flexDirection:""` → CSS row, and a single
flex item in a row sizes to its content. Two of three PDP sections were shrinking their only
child (the buybox band at 463px inside 1280px). Fixed on `single-product.html` only.
**Never swept repo-wide.** Measure other templates before changing anything — the row default
is DELIBERATE (`class-sgs-container-wrapper.php:905-945`, R-1 honesty for the converter) and
only `<main>` suppresses it, so the lever is per-container authoring, not a default change.

### 7. The rest of the register (plan Part 2)

- **C1/C2** — `woocommerce/catalog-sorting` and `core/query-pagination` still unstyled
  against the site's tokens.
- **D1-D4** — archives inconsistent with each other: search bar bottom on Search Results, top
  on Product Archive; different search blocks, different button styling. Bean: *"some archive
  templates look like they were made while not knowing what the others of the same type
  looked like."* **This is a design decision for Bean before it is an implementation task.**
- **F** — pagination vs the infinite scroll that used to exist. Needs a `git log` answer
  (when, which templates, what removed it) before a decision.
- **G1/G3** — `index.html` near-duplicate of `archive.html`; which templates are genuinely
  ours. (**G2 is ANSWERED:** "Products by Attribute" is WooCommerce's template for a surface
  that is switched off — both product attributes have `attribute_public = 0`, so it has no
  reachable URL on this site.)

### 8. Templates never opened in the editor

Search Results, Single Product, Order Confirmation, Coming soon, Products by Attribute. Bean
reported errors on eight templates; only 404, Single Posts and Product Archive have been
confirmed clean.

## Skills — invoke at the point of use, not all up front

| Skill | When |
|---|---|
| `/autopilot` | First. Live routing for the session |
| `/playwright` | The evidence tool for this whole track. Login creds below |
| `/systematic-debugging` | **Item 1.** Root-cause the contrast gap on a real picker instance — do not guess a fix |
| `/delegate` | Before dispatching ANY subagent. Do not hardcode a model |
| `/dispatching-parallel-agents` | Only for genuinely disjoint FILES. Two fixes in one file are not parallel |
| `/subagent-prompt` | Writing each cold prompt |
| `/qc-inline` | After each fix, against a baseline captured BEFORE the change |
| `/qc-council` | Only if a defect yields 2+ competing fix shapes |
| `/sgs-wp-engine` | SGS block/theme mechanics |
| `/wp-block-development` | Core block-API questions (`usesContext`, query loops) |
| `/sgs-db` · `/wp-blocks` | Before ANY "there is no X" claim about the data layer (R-31-8) |
| `/visual-qa` · `/a11y-audit` | Design/contrast items (1 and 5) |
| `/capture-lesson` | Only for a genuinely NEW failure shape — check MEMORY.md first, it has limited headroom and most candidates are recurrences |

## Tools

| Tool | For | Gotcha earned the hard way |
|---|---|---|
| Chrome DevTools MCP | Live measurement | **Prefer it.** The Playwright MCP profile is often locked by another session ("Browser is already in use") — chrome-devtools is a separate browser |
| `emulate` viewport | 375 / 768 / 1440 | `resize_page` silently under-applies — it reported **500px** when asked for 375. Use `emulate` with `375x812x2,mobile,touch` and ALWAYS assert `window.innerWidth` |
| `.claude/secrets/sandybrown.env` | Canary login | Gitignored, always available, no need to ask |
| `build-deploy.py --target sandybrown` | The ONE deploy path | `--theme-only` when no `plugins/` change. Never `--allow-dirty`, never `--skip-verify`, never hand-rolled tar/scp (D336) |
| `curl` a CSS file | Checking what shipped | **Add a cache-buster.** A plain curl reads a stale CDN edge copy. `ssh hd` + `grep` bypasses every cache and is the ground truth |
| `ssh hd` + `wp eval` | Template ownership, palettes | Quote carefully — a nested-quoting slip returned identical results for four different blocks and looked like a finding |

## Standing constraints

- **Bump `theme/sgs-theme/style.css` Version on EVERY CSS change.** Theme CSS cache-busts off
  it; a CSS deploy without a bump serves the stale edge copy and your probes then confirm a
  rule the browser never loaded.
- **One template (or one fix) per commit**, with its own measurements in the message.
- **Shared worktree — other tracks commit to `main` constantly.** `git status` before
  anything; path-scope every commit (`git commit -- <paths>`, a hook enforces it); never
  `git add -A`, never `git stash push`, never `git checkout --`. `decisions.md` has
  concurrent writers and D-number races happen — take the next free number and re-run
  `handoff-preflight --check`.
- **The visual-diff gate will block block-CSS commits.** Run the qualification checkers first
  (`check-editor-only.py`, `check-markup-neutral.py` — note they read the STAGED set, so
  `git add` first). The scoped bypass `SGS_VISUAL_GATE_SKIP=<block>
  SGS_VISUAL_GATE_REASON="..."` is real, logged and auditable — retire it afterwards with a
  report in `reports/visual-diff/`.
- **`decisions.md` size failures are self-healing** — a Stop hook sweeps and rebaselines.
  Do NOT spend session time on it.

## Method — traps this track has actually hit

1. **Measure the thing the fix was meant to ACHIEVE, not the thing you changed.** The shop
   grid swap's two headline metrics were both green while every card was 91px — the real
   cause was an inline WooCommerce rule inside `@media`, invisible to a cascade scan that
   does not descend into conditional rules. Resolved (D760), but the trap is general: green
   headline metrics are not proof.
2. **Separate "my probe is wrong" from "the code is wrong".** Multiple probes this track
   returned confident numbers measuring the wrong element — the option picker twice, a
   background that resolved to black. A "no evidence" result is usually a broken probe.
3. **Capture the BEFORE state as a body, not a hash.** `build-deploy` stamps a per-deploy
   `ver=<epoch>`, so rendered-HTML md5 moves on every deploy regardless. A hash tells you THAT
   something differs, never WHAT.
4. **When Bean names something, resolve it against the INSPECTOR LABEL** before saying it does
   not exist. Reading enum slugs produced a wrong statement to him once already.
5. **A survey/detector's own self-test passing does not mean its regex is right.** The
   accidental-columns count (item 4 above) shipped from a detector with a 7/7 self-test and a
   wrong regex. Self-test proves the harness runs; it does not prove the logic is correct.

## Done-when

A template is done when it opens in the Site Editor with zero errors, looks right to Bean at
375 / 768 / 1440, and its controls actually work when clicked — with the evidence in that
template's own commit message. "The markup looks right" is not evidence, and a green gate is
not evidence.
