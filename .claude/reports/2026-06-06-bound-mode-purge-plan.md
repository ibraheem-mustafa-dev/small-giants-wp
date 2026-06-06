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
