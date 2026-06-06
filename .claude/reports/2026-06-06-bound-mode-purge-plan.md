---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Bound-mode purge plan (READY TO EXECUTE) — excise the freestyle-echo cheat, emit TYPED native; preserve the live WC configurator"
created: 2026-06-06
status: PLAN — mapped + safe-ordered; execute next. Bean-directed (bound mode = a test-cheat, purge from blocks AND scripts).
source: opus bound-purge-map agent (read-only audit, 2026-06-06) + Bean directive
---

# Bound-mode purge — execution plan

**Why:** `sourceMode='bound'` makes a composite echo `$content` (a draft-DOM mirror) instead of rendering from its OWN native attrs. It's a cheat — content "present" passes shallow checks but the block never converts to native (loses grid/circles/icons). Memory: `bound-mode-is-test-cheating-not-conversion`.

## Classification (what to purge vs preserve)
| Block | sourceMode value | Verdict |
|---|---|---|
| sgs/trust-bar | `typed` | KEEP — the native items[] render (the target) |
| sgs/trust-bar | `bound` | **PURGE** — freestyle-echo cheat |
| sgs/product-card | `typed` | KEEP — FR-22-6 InnerBlocks |
| sgs/product-card | `wc-product` / `sgs-cpt` | **KEEP — DO NOT TOUCH** (live WooCommerce configurator, page 589) |
| sgs/product-card | `bound` (stamped by converter) | **BUG** — not in enum; converter illegally stamps it. Fixed by deleting the converter stamp. |
| sgs/content-collection | sets wc-product/sgs-cpt | KEEP — live data, never bound |

Only trust-bar + product-card declare `sourceMode`. Only trust-bar's `bound` is the cheat.

## The converter change (the source)
`plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` lines **2834-2842** — DELETE the whole FR-24-10 `attrs["sourceMode"]="bound"` block. Do NOT replace with another blanket stamp. Effect: trust-bar keeps its block.json `typed` default; product-card never gets an invalid `bound`. THEN add a trust-bar TYPED extraction handler (registered like option-picker's `optionItems`): lift each draft `.sgs-trust-bar__badge` → `items[]` entry {label (text node — easy), url (if `<a>` — easy), icon (HARD — see dependency)}.

## Block changes — sgs/trust-bar (5 files)
- **render.php**: delete `$source_mode`/`$is_bound` (27-29) + the entire BOUND branch (~140-157). Keep the typed path.
- **block.json**: enum `["typed","bound"]` → `["typed"]`; bump version 0.4.0→0.5.0; fix description (drop the "Bound" clause).
- **edit.js**: strip Bound UI — SOURCE_MODE_OPTIONS, BOUND_TEMPLATE, useInnerBlocksProps + import, the "Content source" PanelBody, the bound canvas div; always-typed.
- **index.js**: `save()` → `() => null` (drop InnerBlocks import) — it's a dynamic block again.
- **deprecated.js**: ADD newest-first `v5` matching the OLD saved shape (`save() => <InnerBlocks.Content/>`, enum incl. `bound`) → `migrate()` forces `sourceMode:'typed'` (label-only; items[] re-cloned per §existing-content). Order `[v5,v4,v3,v2]`.

## Existing serialised content (page 8, 144 carry `sourceMode:"bound"`)
R-22-14 forbids an `empty($content)` fallback. After the render branch is removed, re-clone page 8 + page 144 (canary/scratch — the canonical path) so they get fresh typed items[]. Audit first: `wp post list` + grep post_content for `sgs/trust-bar` + `"sourceMode":"bound"` to confirm only scratch pages are affected.

## Ordered execution (nothing breaks mid-purge)
1. Audit serialised content for bound trust-bars (escalate if a real client page has one).
2. Converter first: delete 2834-2842 + add trust-bar typed items[] extraction. `/sgs-clone --debug-trace` a trust-bar draft → emitted sourceMode typed/absent + items[] non-empty + live badge count > 0.
3. Add deprecated.js v5 BEFORE removing the render branch; build; load page 8/144 editor → bound blocks migrate, no "invalid content".
4. render.php: delete bound branch.
5. edit.js/index.js/block.json: strip bound UI, save→null, enum, version, description.
6. Re-clone page 8 + 144 → fresh typed markup.
7. VERIFY (R-22-11/R-22-13): homepage trust-bar badges render with correct labels; **product-card configurator on page 589 still resolves WooCommerce data (REGRESSION GUARD)**; content-collection grid still renders live cards. Bean sign-off.
8. `/sgs-update` (trust-bar enum/attr schema change).

## FOLLOW-ON DEPENDENCY (do NOT solve in the purge)
**Icon-identity resolver** — map a draft badge's SVG/emoji → the trust-bar icon enum (multi-library + emoji, NOT lucide-only; council: SVG fingerprint unreliable, build a reverse index + confidence threshold + visible fallback, never silent star). Until built, cloned trust-bars render correct LABELS + a placeholder icon. This is the one piece of full trust-bar fidelity the purge alone can't deliver.

## OUT OF SCOPE (live data — never touch)
product-card/{render.php,block.json,edit.js,view.js}; content-collection/render.php.

---

# ⭐ COUNCIL-CORRECTED EXECUTION SPEC (Bean-approved 2026-06-06) — BUILD FROM THIS, not the draft above

A 6-persona `/adversarial-council` (cynic/spec-lawyer/ship-PM/migration-guardian/regression-red-team/support-realist) graded the draft plan above **NO-GO-as-written** (grades: D,D,D,D,C+,B−). Convergent fixes are baked in below. Bean's 2 decisions: **(1)** placeholder-icon interim is an ACCEPTABLE shippable win (icons next task), with a VISIBLE "unresolved" flag — never a silent `check`; **(2)** existing bound content handled by **re-clone, NOT a deprecated.js v5**.

## GATE — DONE 2026-06-06 (audit passed)
Audited ALL post types on canary (7 pages, 2 posts, 0 wp_block, 15 templates, 21 template-parts): **only page 8** (`mamas-munches-homepage`) carries a bound trust-bar. No real client page. Page 589 has **no** product-card (and the converter never touches existing post content anyway) → configurator can't regress. **→ re-clone path validated; NO deprecated.js v5 needed.**

## FATAL FIX (council convergence #1 — without this it ships the duplicate-nesting bug it claims to fix)
Trust-bar is `has_inner_blocks=1` → resolved as `_is_container_mirror_block` → its 4 multi-child badges fall through the sole-child fold to the plain walk → emitted as nested containers → bound stamp fires. Deleting the stamp ALONE leaves those nested containers as orphan InnerBlocks inside a "typed" block. **The lever:** flip trust-bar to `has_inner_blocks=0` so the walk drops to the G3-attrs path (`convert.py:2806` — child recursion suppressed, `_atomic_attrs_for` called, exactly like option-picker). In TYPED mode the block renders its OWN grid via render.php from attrs — the draft `__inner` grid CSS is no longer needed.

## ORDERED BUILD STEPS (one PR; each step verified)
**S1 — Converter `convert.py`:**
  (a) DELETE the FR-24-10 bound stamp (`convert.py` ~2818-2820: `if slug ... children_markup and "sourceMode" in db.block_attrs(slug): attrs["sourceMode"]="bound"`). Do NOT replace with another stamp. This also fixes product-card's illegal `bound` stamp (council regression-RT confirmed: purge FIXES product-card, doesn't break it).
  (b) ADD a typed trust-bar handler inside `_atomic_attrs_for` (the G3 path, where option-picker's `optionItems` handler lives). **Full extraction contract (council #2/#5):**
   - Enumerate `.sgs-trust-bar__badge` nodes (handle nesting — the draft may nest `__inner > __badge`).
   - `label` ← text of `.sgs-trust-bar__label` if present, ELSE `node.get_text(strip=True)` of the badge (NOT `_rich_text_content` — avoids double-escape; NOT raw concat that swallows SVG path data).
   - `url` ← `_safe_href(badge_anchor['href'])` (strips `javascript:`) or omit if no `<a>`.
   - `badgeStyle` (block-level) ← infer: any badge has `<img>` → `image-badge`; has circle/`<svg>` → `icon-circle`; bare text → `text-only`. Populate the matching field set per render.php (`:214` icon-circle{icon,label} / `:226` text-only{label,url} / `:243` image-badge{media.url,label,url}).
   - `icon` ← DEFERRED resolver. For now set `icon:''` + a VISIBLE unresolved flag (e.g. `pending:true` or an `_iconUnresolved` marker the editor surfaces) — NOT a silent `'check'`. Image-badge `media.url` filtered to `^https?://`.
   - `columns` ← draft badge count (so the typed grid matches).
**S2 — Seed `seed-composition-roles.py:84`:** `RENAME_HAS_INNER_BLOCKS["sgs/trust-bar"]` `1 → 0`; re-run the seed (writes BOTH DBs) + `/sgs-update` so `block_composition.has_inner_blocks=0` lands. Verify via `sgs-db.py` BOTH DBs.
**S3 — trust-bar block strips (5 files, NO deprecated.js v5):**
  - `render.php`: delete `$source_mode`/`$is_bound` (~28-29) + the entire BOUND branch (~147-157). Keep typed path. Confirm the typed `SGS_Container_Wrapper::render(...)` call (~292) is byte-unchanged (council #3 — shared wrapper blast radius; live `do_blocks()` verify, not page-clone).
  - `block.json`: enum `["typed","bound"]`→`["typed"]`; version bump; description drop the "Bound" clause (keep D95 attribution); (optional) `autoScroll` default→true if Bean confirms.
  - `edit.js`: strip ALL bound UI — SOURCE_MODE_OPTIONS, BOUND_TEMPLATE, useInnerBlocksProps+import, AND the entire "Content source" PanelBody (support-RT M3 — a 1-option dropdown confuses clients), the bound canvas div. Always-typed.
  - `index.js`: `save()`→`()=>null`; drop the `InnerBlocks` import.
**S4 — Build + deploy blocks** (`build-deploy.py --blocks-only`; OPcache reset).
**S5 — Re-clone page 8** (`--deploy-target page:8`). Delete the old bound trust-bar block; emit fresh typed. Acceptance: emitted markup has `"sourceMode":"typed"` (or absent) + `"items":[` with entry-count == draft badge count.
**S6 — VERIFY on the real homepage (R-22-11/R-22-13, council #5 — live DOM not eyeball):**
  - Playwright page 8: `document.querySelectorAll('.sgs-trust-bar__badge').length === <expected>`; native circles present; labels correct; icons = visible placeholder (flagged); NO nested `sgs/container` badge blocks.
  - REGRESSION GUARD: page 589 configurator still resolves (radio-pill count > 0, From-price renders); content-collection grid still renders live cards.
  - Bean R-22-13 sign-off (expectation pre-set: labels+structure right, icons uniform-placeholder).
  - Rollback line: if S5 emits empty/garbage items[] → revert the stamp deletion + re-plan (STOP #19), don't iterate inline.
**S7 — `/sgs-update`** (enum/has_inner_blocks/attr schema change → DB sync).

## FOLLOW-ON (next task, Bean-scoped): icon-identity resolver — multi-library SVG fingerprint + emoji reverse-index + confidence threshold + visible fallback (never silent star). Replaces the S1(b) placeholder.
