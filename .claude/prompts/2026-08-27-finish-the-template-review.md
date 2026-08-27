# Next session — finish the twelve-template review

Invoke `/autopilot` before anything else.

> The twelve-template review has been deferred four times. This time it is the spine, not an
> afterthought: a full live assessment already ran against the sandybrown canary and found five
> real defects and zero fabricated ones. Nothing has been fixed yet. Everything else in this doc
> — typography re-measurement, stranded CSS, the product-card bug, the DB refresh — is supporting
> work around that one job. Close the templates this time.

---

## The rule that governs this track

> **Never assess a page by reading code, the DB or REST. Open it and LOOK.**

The live assessment this doc is built on did exactly that — twelve real URLs, opened and read,
not inferred. Keep doing it for every fix: a defect confirmed by opening the page is real: a
defect inferred from a diagnostic pass has been wrong repeatedly on this project.

---

## Read first, in this order

1. `.claude/LEDGER.md` — the Mama's clone block, for current front-of-queue status
2. `decisions.md` **D830 onward** — the five merged fixes this doc's opening depends on (grid/layout
   tier resolver, button WCAG + phantom border, root-modifier routing guard, layout-enum validation,
   the G2 fail-closed schema gate). Detail lives there — do not ask for it restated here.
3. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — **in full**, before touching the converter
4. `plugins/sgs-blocks/src/blocks/container/edit.js` around line 75 — the `TAG_NAME_OPTIONS` gap
   named in Task 1
5. `reports/visual-diff/site-footer-row-2026-08-01.md` — the pre-existing footer fixture named in
   Task 1, item 5

---

## What just shipped (context, not this session's work)

Five fixes merged to `origin/main`, all reviewed, all verified by a post-merge QC sweep of 7,553
real (block, property) pairs with zero exceptions:

| Commit | Change |
|---|---|
| `6fceb8198` | Grid/layout tier-object resolver bug |
| `a2e233f7b` | `sgs/button` WCAG min-height + phantom border |
| `e84d7f172` | Converter root-modifier routing guard |
| `94a3ab684` | Converter layout-enum validation |
| `01aaac181` / `a92446226` | G2 fail-closed schema-conformance gate + schema-driven OUTER guard |

Full rationale, before/after numbers and review trail: `decisions.md` D830 onward. This doc does
not restate them — read D830+ if you need the mechanism.

---

## Task 1 — Finish the twelve-template review (THE SPINE)

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

**5. Sitewide footer placeholder text "T1TOP A" / "T1TOP B"** — traced to a documented
pre-existing dev fixture, referenced in `plugins/sgs-blocks/src/blocks/site-header/style.css`
and `reports/visual-diff/site-footer-row-2026-08-01.md` as deliberate sparse content for a hover
z-index test. Not a new break, but it is live on the canary and looks unprofessional. Treat as a
client-readiness blocker, not a dev-blocker: replace with real footer copy.

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
path to select or recover a `<main>` tag if it's ever changed. Add it to the enum.

**Done when:** all five defects are fixed and re-verified live on the canary (not just re-read in
code), the `main` tag option is added, and every one of the twelve templates has been opened and
looked at in this session — not inferred from the prior assessment.

---

## Task 2 — Typography re-measurement

Nothing has been re-measured since all five fixes above merged. The last real numbers are mobile
parity 73% @375, 77% @768 vs 80% @1440
(`reports/mamas-parity-mobile-postdeploy-2026-08-26.json`, 456 property diffs, typography 38% of
them — line-height 90, font-size 82).

Clone Mama's fresh through the now-fixed converter and re-measure:
`plugins/sgs-blocks/scripts/parity/computed-parity.js --viewports 375,768,1440`.

⛔ Clone to a NEW page id — never write `post_content` to a page Bean has open in the editor
(D788).

⚠ Use `--no-scaffold-new-blocks --skip-register` unless block scaffolding and a shared-DB write
are actually wanted, and check no other session is mid-build first.

⚠ Of the font-size divergences, ~50 elements carry an authored size and ~9 inherit one. The
inherited ones will not move no matter what the converter does — nothing sets them, so they take
the theme's base where the draft takes its own. That points at the theme snapshot (Spec 33), not
the converter. Re-derive the split after the fresh clone before concluding anything — the old
50/9 split may itself have shifted.

**Done when:** computed-parity at 375/768 against the new clone beats 73/77%, and Bean's eye
agrees (R-31-13). A number alone does not close it.

---

## Task 3 — Stranded CSS: scope collapsed, Decision 2 needs Bean's call

⭐ Lead with this: the census originally reported ~36 stranded "Cause A" rules. Checking each
against the REAL converter output (`extract.json`), rather than the diagnostic `css_router`
pass, found **~34 were false positives** — featured-product, ingredients-section, gift-section
and social-proof all carry their draft class through correctly.

The genuine residue is **one thing**: the announcement-bar's own wrapper box, whose CONTENT
survives (text renders as `sgs/text`, CTA as `sgs/button`) but whose visual container does not —
`background:white; border:1px solid var(--primary); border-radius:10px; padding:14px 18px;
display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap`. The shape of the problem:
a nested BEM wrapper one level below the section root gets no `sgs/container` instance of its
own, so its box styling has nowhere to attach.

`.container` was also flagged but is dead CSS — never referenced in the draft's markup, nothing
lost. No action needed there.

⭐ **Re-raise this with Bean rather than assuming it's still worth building.** He approved
building the position-based routing mechanism (Option A) when the scope looked like 36 sections.
Now it's one banner. Bring him the choice: build the general mechanism anyway (future-proofing),
or ship a narrower fix scoped to just this wrapper pattern. That's his call, not this session's
to assume.

---

## Task 4 — The unexplained product-card font-size bug

Deliberately untouched — root-cause it properly, no guessing.

`sgs/product-card`'s `descFontSize`/`priceFontSize`/`titleFontSize`/`priceNoteFontSize` (and
`sgs/trust-bar.labelFontSize`) were 9 of the original 47 flat-tier gate violations and are NOT
fixed by the grid/layout work that fixed the other 39.

The DB confirms all four are correctly `attr_type='object'` with `box_family=NULL` — genuinely
tier-shaped, so they should flow through the fixed typography resolver. But they do not appear
anywhere in the run's converter trace
(`pipeline-state/mamas-munches-homepage-qa-2849-2026-08-26-223048/convert-trace-b4.jsonl`, zero
hits) — meaning they never reach any CSS resolver by the normal path.

A later note attributes them to `styling_content.py`'s per-item font-size path. Verify that
against the real code before building anything on it — it's a hypothesis, not a confirmed cause.

---

## Task 5 — `/sgs-update` DB refresh (cross-track — check first)

`specs/02-SGS-BLOCKS-REFERENCE.md` is stale against this session's new attributes and the newly
seeded `layout` `enum_values` on 12 blocks.

⛔ A shared-DB reseed is a CROSS-TRACK action — it has broken both tracks' builds once before.
Confirm no other session is mid-build before running.

⚠ Also verify the reseed does not revert `sgs/before-after.boxShadowColour`'s `css_element` —
that was migrated to `wrapper` and its source in `attr-classification-overrides.json` was updated
to match, specifically so a reseed would be safe. Confirm that held.

---

## Task 6 — `sgs/quote`'s attribution panel (design-gated, not this session's to build)

Still a bespoke emitter predating the shared `TypographyControls` component; only the duplicated
sanitiser was folded in. Its font-family was never dead, so the original defect is closed. Full
panel parity is separate design-gated work — get Bean's approval before building it.

---

## Task 7 — folded from the retired 2026-08-25 container/archive prompt (verified 2026-08-27)

✅ **VERIFIED CLOSED — solid option-picker contrast (source doc's item 1).** D774
(2026-08-24) already verified this: canary page 2736 `[GATE - DO NOT DELETE]` is the
fixture, `sgs/card-grid` `source:"cpt-collection"` `contentType:"product"`. Measured
resting border 13.14:1 vs the white card. Nothing left to do.

✅ **VERIFIED CLOSED — `woocommerce/catalog-sorting` unstyled (C1).** Re-confirmed
2026-08-27: `theme/sgs-theme/assets/css/woocommerce.css:2401,2425` has real
`select.orderby` rules (incl. `:focus-visible`). Matches this doc's own note above — do
not re-flag.

⚠ **CHANGED — flexWrap default flip (source doc's item 3).** The 94/4 figure was stale.
Live canary count 2026-08-27 (`wp db query` against all 38 posts/pages carrying
`wp:sgs/container`, regex-parsed): **131 stored instances, 127 with no `flexWrap` key, 4
with no attributes object at all.** Growth from 94→127 tracks new pages built since. ⛔
Several are `[GATE - DO NOT DELETE]` fixtures — do not hand-edit; still needs a migration
script with its own verification pass, not a manual sweep.

⚠ **CHANGED — "~59 accidental columns" (source doc's item 4).** That split is RETIRED,
confirmed unreproducible (D-log, 2026-08-25): `survey-flex-row-shape.py` skips any
container with an explicit `flexWrap`, and a same-day commit authored `flexWrap:"wrap"`
on 80 containers, silently removing them from the count. Classifier re-run with that
filter removed: **125 file-authored flex rows, 83 non-NO-OP** — that is the real current
number, not 59. Handed to the migration track alongside item above. `layout:"stack"` is
the correct destination for a row that's really a stack, but converting one changes its
children from content-sized to full-width — a VISIBLE change. Bring Bean screenshots per
candidate; do not batch-convert.

⚠ **CHANGED, still open — the 375px readable-card floor (source doc's item 5).**
Re-measured live 2026-08-27: shop archive is still 1-up, now **312px** (was 327px).
PDP related-products rail is **no longer the wrapping 2-up grid** the source doc
described — commit `460b0d28d` turned it into a horizontal peek-scroll carousel; live
width is now **140px/card** (was 155px), still under the 167-195px floor, but the
mechanism changed from "grid too narrow" to "carousel peek width" — that may change
whether the floor even applies. **Ask Bean, do not decide the design question yourself.**

✅ **VERIFIED CLOSED, non-issue — G1 (`index.html` vs `archive.html` "near-duplicate").**
Diffed live 2026-08-27: they are NOT duplicates. `index.html` is a plain post list
(`query-title` + flat `post-template`); `archive.html` is a full card grid with
`term-description`, 3-col `post-template` grid, styled cards, its own no-results copy.
Structurally different templates. (`index.html` is also unreachable —
`show_on_front=page` — so this was always low-stakes.)

**OPEN — G3, which templates are genuinely ours.** Not resolved this pass; still needs a
manual walk of the template list against what WooCommerce/core ship by default vs what
this project authored. (G2 stays answered per the source doc: Products by Attribute has
no reachable URL, both product attributes `attribute_public=0`.)

**ANSWERED — F, the "infinite scroll that used to exist".** Full `git log` archaeology
found **no evidence archive templates ever had infinite scroll.** Every archive-family
template (`archive.html`, `archive-product.html`, `search.html`) has used numbered
`core/query-pagination` since its first commit (`3d536f114`/`e4fe5383f`). The only
infinite-scroll code in the repo is a pagination TYPE option on `sgs/post-grid`
(`c46966fe7`) — a block never used in any template file. There is nothing to restore;
the premise behind item F was false.

**UNCHANGED — D1-D4 archive inconsistency.** Reconfirmed live 2026-08-27:
`archive-product.html` uses `sgs/product-search`, `search.html` uses core `wp:search` —
genuinely different blocks, not a styling slip. Still a design decision for Bean, not an
implementation task.

**Coverage gap — two templates never opened in the editor.** This review's twelve-URL
table above covers Search Results, Single Product and Products by Attribute, but not
**Order Confirmation** or **Coming soon** — neither has been opened in the Site Editor
this track. Add them to the "never opened" list; they are outside the twelve already
verified.

## Carried open item — not this session's scope

The OUTER root-element vocabulary fix has a deferred tail: `db_lookup.py`'s
`attrs_for_css_property_state` (~lines 3451-3462) still carries the same unguarded
`OR css_layer = 'OUTER'` the merged fix removed from its two siblings. Deliberately scoped out —
it has its own ≥2-candidate fallback and needs its own failing test written first.

---

## Standing hazards (carry forward — never subtract a structural defence)

- **`main` is shared with several live sessions.** Commit with explicit paths
  (`git commit -- <paths>`); a bare commit after `git add` flushes the whole index and has swept
  other tracks' staged work before. **Merge to main via an isolated worktree from `origin/main`,
  never in the shared working tree** — a direct merge attempt this session failed with "could not
  write index" because another session held it.
- **Never write `post_content` to a page Bean has open in the editor** (D788).
- **A green test suite is not proof.** A 109-resolution regression this session caught passed the
  entire suite because a fallback path masked it. Sweep real data.
- **Verify a subagent's claims, including your own tooling's.** Multiple findings this session
  were confidently wrong until checked against the live DB or the browser's own CSSOM.
- ⚠ **The shared-DB classifier drift** (~85 `db-consistency`/F6 violations from a concurrent
  session's in-progress edit) blocked several commits. `.githooks/pre-commit` line 54 documents
  `git commit --no-verify` as the sanctioned bypass for that specific gate. Verify it's the same
  pre-existing shape via an A/B check against `main` before using it.
