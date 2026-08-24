# Next session — template remediation (shop + PDP)

Invoke `/autopilot` before anything else.

> ⚠ **The filename is stale.** This file used to be the Phase 3 per-template-pass prompt.
> That work is CLOSED (Wave A, 2026-08-23) and this file was rewritten on 2026-08-24 to be
> the live prompt for the **template remediation** track. Trust the content, not the name.

---

## The one rule that governs this whole track

> **Do not assess a template by reading its code, querying the DB, calling REST, or
> inspecting hooks. Log in with `/playwright`, open the thing, LOOK at it, interact with it.**

Bean set this rule and it has earned itself repeatedly. On 2026-08-23 every gate was green
while the Product Archive rendered zero product cards in the editor. On 2026-08-24 he found
five more defects by eye that no gate caught. Code reads may EXPLAIN something you have
already seen; they may never be the evidence that something is fine.

## Read first, in this order

1. `.claude/decisions.md` — **D758** (what was reverted and what NOT to re-debug), **D757**
   (all four product listings), **D756** (the card-grid rebuild, DROPPED — do not re-propose),
   **D755** (the null-default 400).
2. `.claude/plans/2026-08-24-template-by-template-remediation.md` — the governing plan. Read
   the "⛔ Open items carried out of the 2026-08-24 wave" section and Part 2's issue register.
   ⚠ It contains a section marked **SUPERSEDED** further down; do not act on it.
3. `.claude/LEDGER.md` — the template-remediation block at the top.
4. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **IN FULL** if you touch the converter,
   walker, or `sgs/container`. Standing project rule. Templates route through `sgs/container`,
   so container changes count.

## Where the work stands

**Shipped and verified (2026-08-24):** all four product listings use `sgs/product-card`;
PDP cards uniform (305 ×4); cards fill their cell; dead rating filter removed; filter
headings on the body font.

**Open, in the order I would take them:**

### 1. The 91px contradiction — the shop's last-row stretch is still broken

Highest value, and genuinely interesting. `repeat(auto-fill, minmax(var(--sgs-shop-card-min),
1fr))` produced **exactly** the intended result — 3 tracks of 313px, last-row stretch gone —
while rendering every card at **91px inside those 313px tracks**. Reverted to the known-good
flex version.

⛔ **D758 carries the ruled-out list. Do not re-walk it.** Stale CSS, competing rules,
selector miss, and the grid's default stretch are ALL eliminated and measured.

**Start here, at the contradiction I could not resolve:** an INLINE `width:100%` on the item
measured **313px**; the **identical declaration from the stylesheet** measured **91px**. That
should not be possible. Understand that before writing any CSS.

Current live state: `flex: 1 1 var(--sgs-shop-card-min)`, which gives row 1 = 3 cards at
313px and the final row = 2 at 482px. Bean's ask: *"the width increase should only be when
someone sets all to 2 cards per row."*

### 2. Verify the `solid` option-picker contrast fix — it is deployed but UNVERIFIED

The resting border was measured at **2.38:1** against its container, below the WCAG 3.0
UI-boundary floor, because the preset used the client's pale-pink `primary`. The fix (neutral
tokens with a floor) is deployed, but **no live surface renders a solid-preset picker** —
`showPickers:false` on the shop and the PDP rail, and the standalone buybox picker uses
`outlined`. The 12.55:1 measured post-deploy is the pre-existing OUTLINED behaviour, not
evidence.

You need a product-card instance with pickers enabled. Then measure fill-vs-container AND
border-vs-container — not text contrast, which was fine (12.55:1) throughout and is what
made three of my probes miss this.

### 3. A design call for Bean — do not decide this yourself

At 375px the shop archive is **1-up at 327px**; the PDP related rail is **2-up at 155px**,
under the 167–195px readable-card floor from the design benchmark. Bean has the screenshots.
Ask; do not pick.

### 4. Sweep the single-child-shrunk container shape (D757)

`sgs/container` defaults to `layout:"flex"` with `flexDirection:""` → CSS row, and a single
flex item in a row sizes to its content. Two of three PDP sections were shrinking their only
child (the buybox band at 463px inside 1280px). Fixed on `single-product.html` only.
**Never swept repo-wide.** Measure other templates before changing anything — the row default
is DELIBERATE (`class-sgs-container-wrapper.php:905-945`, R-1 honesty for the converter) and
only `<main>` suppresses it, so the lever is per-container authoring, not a default change.

### 5. The rest of the register (plan Part 2)

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

### 6. Templates never opened in the editor

Search Results, Single Product, Order Confirmation, Coming soon, Products by Attribute. Bean
reported errors on eight templates; only 404, Single Posts and Product Archive have been
confirmed clean.

## Skills — invoke at the point of use, not all up front

| Skill | When |
|---|---|
| `/autopilot` | First. Live routing for the session |
| `/playwright` | The evidence tool for this whole track. Login creds below |
| `/systematic-debugging` | **Item 1.** It is a root-cause hunt with a live contradiction — do not guess a fix |
| `/delegate` | Before dispatching ANY subagent. Do not hardcode a model |
| `/dispatching-parallel-agents` | Only for genuinely disjoint FILES. Two fixes in one file are not parallel |
| `/subagent-prompt` | Writing each cold prompt |
| `/qc-inline` | After each fix, against a baseline captured BEFORE the change |
| `/qc-council` | Only if a defect yields 2+ competing fix shapes |
| `/sgs-wp-engine` | SGS block/theme mechanics |
| `/wp-block-development` | Core block-API questions (`usesContext`, query loops) |
| `/sgs-db` · `/wp-blocks` | Before ANY "there is no X" claim about the data layer (R-31-8) |
| `/visual-qa` · `/a11y-audit` | Design/contrast items (2 and 3) |
| `/capture-lesson` | Only for a genuinely NEW failure shape — check MEMORY.md first, it has ~200 bytes of headroom and most candidates are recurrences |

## Tools

| Tool | For | Gotcha earned the hard way |
|---|---|---|
| Chrome DevTools MCP | Live measurement | **Prefer it.** The Playwright MCP profile is often locked by another session ("Browser is already in use") — chrome-devtools is a separate browser |
| `emulate` viewport | 375 / 768 / 1440 | `resize_page` silently under-applies — it reported **500px** when asked for 375. Use `emulate` with `375x812x2,mobile,touch` and ALWAYS assert `window.innerWidth` |
| `.claude/secrets/sandybrown.env` | Canary login | Gitignored, always available, no need to ask |
| `build-deploy.py --target sandybrown` | The ONE deploy path | `--theme-only` when no `plugins/` change. Never `--allow-dirty`, never `--skip-verify`, never hand-rolled tar/scp (D336) |
| `curl` a CSS file | Checking what shipped | **Add a cache-buster.** A plain curl reads a stale CDN edge copy — this cost real time on 2026-08-24. `ssh hd` + `grep` bypasses every cache and is the ground truth |
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

## Method — the four traps this track has actually hit

1. **Measure the thing the fix was meant to ACHIEVE, not the thing you changed.** The grid
   swap's two headline metrics were both green while every card was 91px. The catch came from
   one unplanned check.
2. **Separate "my probe is wrong" from "the code is wrong".** Three probes on 2026-08-24
   returned confident numbers measuring the wrong element: the option picker twice, and a
   background that resolved to black. A "no evidence" result is usually a broken probe.
3. **Capture the BEFORE state as a body, not a hash.** `build-deploy` stamps a per-deploy
   `ver=<epoch>`, so rendered-HTML md5 moves on every deploy regardless. A hash tells you THAT
   something differs, never WHAT.
4. **When Bean names something, resolve it against the INSPECTOR LABEL** before saying it does
   not exist. Reading enum slugs produced a wrong statement to him once already.

## Done-when

A template is done when it opens in the Site Editor with zero errors, looks right to Bean at
375 / 768 / 1440, and its controls actually work when clicked — with the evidence in that
template's own commit message. "The markup looks right" is not evidence, and a green gate is
not evidence.
