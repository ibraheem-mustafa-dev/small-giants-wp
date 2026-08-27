# Next session — finish the twelve-template review (Task 1 is now the ONLY item)

Invoke `/autopilot` before anything else.

> Every other task from the 2026-08-27 predecessor prompt (typography re-measurement, stranded
> CSS, the product-card font-size bug, the DB refresh, the quote panel, the folded
> container/archive residue) shipped and closed on 2026-08-27 — full detail is single-sourced to
> `.claude/decisions.md` D830-D851, do not restate it here. **This prompt has exactly one job: the
> twelve-template live review.** It has now been deferred five times. Close it this time.

---

## The rule that governs this track

> **Never assess a page by reading code, the DB or REST. Open it and LOOK.**

A live assessment already ran once and found five real defects with zero fabricated ones — keep
using that method for every fix: a defect confirmed by opening the page is real, a defect inferred
from a diagnostic pass has been wrong repeatedly on this project.

---

## Mandatory READING (do not skip, do not skim)

## Read first, in this order

1. `.claude/LEDGER.md` — the Mama's clone block, for current front-of-queue status
2. `.claude/decisions.md` **D830 onward** — every merged fix this prompt's opening depends on.
   Detail lives there — do not ask for it restated here.
3. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **in full**, before touching the converter
4. `plugins/sgs-blocks/src/blocks/container/edit.js` around line 75 — the `TAG_NAME_OPTIONS` gap
   named in Task 1 (confirmed still missing as of 2026-08-27)

---

## Tool bindings

| For | Use |
|---|---|
| Root-causing defect #1 (taxonomy template never renders) | `python ~/.claude/hooks/wp-blocks.py dump` for schema, Playwright MCP for live DOM, `wp rewrite list` over SSH |
| Live-DOM verification of every fix | Playwright MCP (`mcp__plugin_playwright_playwright__*`) — navigate, snapshot, `getComputedStyle` |
| Heavy WP build work (defects #2-4, the `main` tag enum fix) | `wp-sgs-developer` agent |
| Multi-rater validation before any converter/pipeline/SGS-block commit | `/qc-council` (per blub.db 255 / this project's CLAUDE.md) |
| Deploy | `plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown` — the ONE path, never hand-rolled |
| Session close | `/handoff` |

## First action (under 5 minutes, zero dependencies)

Open `https://sandybrown-nightingale-600381.hostingersite.com/?taxonomy=pa_flavour&term=banana` in
a browser (or via Playwright MCP) and confirm defect #1 still reproduces exactly as described — a
200 response serving the front page's title/content instead of the taxonomy archive. That single
observation is the entry point into root-causing the whole highest-priority defect.

## Task 1 — Finish the twelve-template review (THE ONLY TASK)

A live visual assessment has already run against these twelve confirmed URLs. No re-discovery
needed — use them verbatim. Base: `https://sandybrown-nightingale-600381.hostingersite.com`

| Template | URL |
|---|---|
| `front-page.html` | `/` (page 2742) |
| `home.html` | `/blog/` (page 2741) |
| `single.html` | `/2026/07/31/motion-fixture-post-8/` |
| `page.html` | `/mamas-homepage-clone-qa-2026-08-26/` (page 2849) |
| `single-product.html` | `/product/sgs-single-variant-fixture/` |
| `archive-product.html` | `/shop/` |
| `taxonomy-product_attribute.html` | `/?taxonomy=pa_flavour&term=banana` |
| `product-search-results.html` | `/?s=snack&post_type=product` |
| `search.html` | `/?s=test` |
| `archive.html` | `/category/uncategorized/` |
| `404.html` | any bad slug |
| `index.html` | genuinely unreachable (`show_on_front=page`) — **expected-healthy, not a defect** |

Five real defects were found, ranked by the reviewer in priority order. Fix each as its own
sub-task, in this order:

**1. `taxonomy-product_attribute.html` never renders.** WP's own canonical term link returns
HTTP 200 but serves the FRONT PAGE's title and content instead. Retested after a
`wp rewrite flush --hard` — same result, so it is not stale permalinks. Highest priority: a
whole template is unreachable and a 200 masks it, which is worse than a 404 (at least visible).
Root-cause this properly — likely a template-hierarchy resolution bug or a missing
`taxonomy-product_attribute.php`/`.html` match — before proposing a fix.

**2. `page.html`'s per-page lifted CSS bundle 404s** (`sgs-2506-693c….css`), leaving the
header/nav completely unstyled on that page — raw bulleted menu, no flex layout. This is a
per-page asset problem (the lifted-CSS write/serve path for that specific page), not template
code. Check the asset actually exists in `uploads/sgs-css/` and that the enqueued URL matches.

**3. `core/query-pagination` has ZERO CSS anywhere in the repo** — confirmed by a whole-repo
grep across `theme/` and `plugins/`, not just "missing from some templates". Affects
`home.html`, `index.html`, `archive.html`, `archive-product.html`, `search.html`,
`taxonomy-product_attribute.html`. Visually confirmed on `search.html`: bare underlined
"1 2 3 Next Page" text, no button styling, no spacing. Needs a real stylesheet contribution for
this core block, styled to match the framework's other native-block treatments.

**4. Two empty `sgs/heading` blocks (`<h2></h2>`, zero text) render sitewide**, inside
`.sgs-container__inner`. This is a genuine WCAG issue — screen readers announce blank headings.
Find where these are emitted (a template part or pattern with an unfilled heading placeholder)
and either give them real text or remove the block.

**5. Sitewide footer placeholder text "T1TOP A" / "T1TOP B"** — verified 2026-08-27: this is
genuinely live placeholder content on the canary, NOT an engineered test fixture (a prior prompt's
"deliberate sparse content for a hover z-index test" framing was checked and found wrong — it was
simply useful evidence once, for a different, already-fixed header hover bug). No standing fixture
depends on it. Replace with real footer copy — client-readiness blocker, not a dev-blocker.

⚠ **Canary content constraints** — state these plainly rather than re-deriving them: 9 posts, 135
pages, 5 products, 1 category, and **0 approved comments**. `single.html`'s comment blocks were
already verified once this way — a test comment was seeded, confirmed rendering correctly, then
deleted — so that path IS proven but leaves no standing fixture; don't re-flag it as untested.
`front-page.html` renders ~104 chars and zero `<h1>`: the template itself is correct as a shell —
the real mismatch is that Settings → Reading shows latest posts while the template holds
`post-content`. That is a Settings finding, not a template bug — do not "fix" the template.
`catalog-sorting` is already correctly themed — an older prompt wrongly flagged it; do not
re-flag it again.

**Also open, code-level, not visually testable:** `main` is missing from
`plugins/sgs-blocks/src/blocks/container/edit.js:75-84`'s `TAG_NAME_OPTIONS`. Templates hardcode
`tagName:"main"` in the block comment so pages render fine today, but an operator has no dropdown
path to select or recover a `<main>` tag if it's ever changed. Add it to the enum. ⚠ Note:
`plugins/sgs-blocks/CLAUDE.md` claims D710 already reversed an earlier removal of `main` from this
enum — the live code doesn't reflect that. When fixing this, also correct that doc's claim (a
doc/code drift, low-risk, flagged 2026-08-27).

**Done when:** all five defects are fixed and re-verified live on the canary (not just re-read in
code), the `main` tag option is added, and every one of the twelve templates has been opened and
looked at in this session — not inferred from the prior assessment.

⚠ **New context from 2026-08-27, worth having in view while doing this work (not part of Task 1
itself):** page **2884** (a fresh Mama's Munches clone made 2026-08-27 for an unrelated
typography check) has a real converter bug — `sgs/product-card.titleLineHeight`/`descLineHeight`
stored as strings where `block.json` declares `number`, so WordPress silently drops both to
default (D851, same bug class as D802/D833, not yet root-caused). Not part of the twelve-template
set, but worth knowing if a template review touches a product-card instance and a line-height
looks off — this is why, not a Task 1 regression.

Also carried, not this session's scope: two templates never opened in the editor this track
(Order Confirmation, Coming soon) — confirmed 2026-08-27 that **neither exists as a file** in
`theme/sgs-theme/templates/` (G3 audit). Confirm with Bean whether they live elsewhere or are
unbuilt before trying to open them.

**Recovered orphan item (found during the 2026-08-27 handoff QC, not part of Task 1's five
defects, low priority):** an earlier prompt named "redundant nested `contentWidth` in 5 files" as
a correctness item, but the specific file names were lost in a prompt rewrite before this one. If
picked up: re-derive the 5 instances first (e.g.
`grep -rn 'contentWidth' plugins/sgs-blocks/src/blocks/*/render.php` cross-checked against actual
nesting depth) before attempting any fix — do not guess which 5 files were meant.

---

## Standing hazards (carry forward — never subtract a structural defence)

- **`main` is shared with several live sessions.** Commit with explicit paths
  (`git commit -- <paths>`); a bare commit after `git add` flushes the whole index and has swept
  other tracks' staged work before. **Merge to main via an isolated worktree from `origin/main`,
  never in the shared working tree.**
- **Never write `post_content` to a page Bean has open in the editor** (D788).
- **A green test suite is not proof.** Sweep real data — a 109-resolution regression this project
  once caught passed the entire suite because a fallback path masked it.
- **Verify a subagent's claims, including your own tooling's — and including a peer session's
  claims.** 2026-08-27: a peer session grepped a flat key against a nested `{"entries":[...]}`
  JSON file, got a false "not found", and reported real data as missing debris; the same session
  self-corrected, but the main session then independently made the exact same grep mistake minutes
  later on the same file. Parse structured data before concluding "it's not there" — a grep miss is
  evidence about the grep, not the data, especially before any destructive action (see next point).
- **A `/sgs-update` DB reseed is a cross-track action.** Check live with any other sessions sharing
  the worktree before running one — 2026-08-27 found a reseed would have silently deleted ~122
  legitimate rows backed by another track's uncommitted work, caught only by asking first.
- ⚠ **The shared-DB classifier drift** (concurrent sessions' in-progress edits) can block commits.
  `.githooks/pre-commit` documents a sanctioned bypass for that specific gate — verify it's the
  same pre-existing shape via an A/B check against `main` before using it, don't assume.
