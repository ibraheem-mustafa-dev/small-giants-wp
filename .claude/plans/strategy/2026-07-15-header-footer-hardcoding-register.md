# Header/Footer content-hardcoding removal — EXACT register

**Date:** 2026-07-15 · **Owner:** Haiku (mechanical execution ONLY) · **Verifier:** Opus, live, both clients.

## What this is / is NOT

**IS:** removal of *content* hardcoding — client copy, client URLs, ecommerce assumptions, and one
broken attribute name. Every item below is a NAMED edit with an exact replacement. **Independent of
the FR-S9-6 responsive model and the capability roster, so nothing here gets overwritten later.**

**IS NOT:** the 36 capability literals in `adaptive-nav/style.css` (`width:min(85%,400px)` =
`drawerWidth`+`drawerMaxWidth`, etc). **DO NOT TOUCH `adaptive-nav/style.css`.** Those literals are
the capability roster + FR-S9-6 work and are being handled separately. Touching them here = rework.

## ⛔ RULES FOR THE EXECUTING AGENT

1. **Make ONLY the edits listed below.** No judgment calls. No "while I was there" fixes. If a line
   does not appear in this register, do not touch it.
2. **If any edit does not match** (line moved, text differs), **STOP and report** — do not improvise a
   near-match. A wrong guess here ships client data into a framework file.
3. **Never edit `post_content`** — `wp-content-guard.py` blocks it and it breaks block validation.
4. **`parts/header.html` and `patterns/framework-header-default.php` must stay BYTE-IDENTICAL**
   in their shared region (§S1). Any edit to one = the same edit to the other. Verify with a diff.
5. **No block version bumps, no `deprecated.js`** (D270/D293).
6. **Bump `theme/sgs-theme/style.css` `Version:` 1.5.24 → 1.5.25** as the LAST edit (WP caches the
   pattern list + CDN caches theme CSS against it; without the bump your change is invisible).
7. Do NOT commit the pre-existing dirt: `lucide-icons.php`, `package-lock.json`, `phase4-*.txt`,
   root `.db`, `rr.json`.

## Checklist this must satisfy (per `.claude/plans/block-migration-DONE-checklist.md`)

- No hardcoded client value in any framework file — Site Info or a theme token, always (R-31-1).
- A core block with an SGS replacement is never used — DB `blocks.replaces` is authoritative.
- No inline `style=""` (Spec 32).
- Every attr rendered has an editor control; every control has a rendered attr.

---

## SECTION A — FOOTER: client copy in a framework block

**File: `plugins/sgs-blocks/src/blocks/site-footer/edit.js`** (the TEMPLATE, ~lines 21-94)

The docblock at :15 says *"Three rows matching the draft `.mm-footer`"* — `mm` = Mama's Munches.
The framework's default footer is a copy of ONE client's draft.

| # | Line | Current | Replace with |
|---|---|---|---|
| A1 | ~54 | `[ 'core/heading', { level: 2, content: __( 'Shop', 'sgs-blocks' ) } ]` | `[ 'sgs/heading', { level: 2 } ]` — **no `content`** (operator/pipeline fills it) |
| A2 | ~59-62 | `core/list` + `core/list-item` × `About Us`/`Contact`/`FAQs`/`Gift Ideas` | ONE `[ 'sgs/text', {} ]` — no content |
| A3 | ~72 | `[ 'core/heading', { level: 2, content: __( 'Legal', 'sgs-blocks' ) } ]` | `[ 'sgs/heading', { level: 2 } ]` — no `content` |
| A4 | ~77-80 | `core/list-item` × `Privacy Policy`/`Shipping`/`Terms & Conditions`/`Allergen Info` | ONE `[ 'sgs/text', {} ]` — no content |
| A5 | ~41, ~51 | `'core/group'` (column wrappers) | `'sgs/container'` (DB `blocks.replaces`: container replaces core/group) |
| A6 | ~89 | `{ rowSlot: 'bottom', layout: 'flex', justifyContent: 'center' }` | Add the formatting the bottom bar has NO CSS for anywhere in the repo (`grep -rn "sgs-site-footer-row--" --include=*.css` → 0 hits). Copy the values PROVEN in `framework-footer-default.php:110`: `gap`, `padding` (top/bottom `var:preset|spacing|40`), `margin` top `var:preset|spacing|50`, `border.top` 1px. **This is the "floating, unformatted strip".** |

**File: `theme/sgs-theme/patterns/framework-footer-default.php`**

| # | Line | Current | Replace with |
|---|---|---|---|
| A7 | ~54 | `>Quick Links</h2>` literal | Keep the heading block, empty its content (operator/pipeline fills) |
| A8 | ~60-79 | 7 hardcoded hrefs: `/`, `/about/`, `/services/`, `/blog/`, `/contact/`, `/privacy-policy/`, `/terms/` | Empty list — no baked IA |
| A9 | ~90, ~100 | `>Contact</h2>`, `>Opening Hours</h3>` literals | Empty content |
| A10 | ~114-115 | `<a href="https://smallgiantsstudio.co.uk/">Website by Small Giants Studio</a>` in a raw `core/paragraph` | `sgs/business-info` `displayType="attribution"` reading Site Info. **If that displayType does not exist, STOP and report — do not invent one and do not leave the hardcoded URL.** |
| A11 | ~53, ~89, ~99 | `"fontSize":"medium"` on footer column headings | Leave as-is BUT report: both drafts render these as 11px/0.82rem uppercase micro-labels, not `medium`. Flagged for the Opus pass, not for you to change. |

**File: `theme/sgs-theme/patterns/footer-indus-foods.php` — BROKEN, silently**

| # | Line | Current | Replace with |
|---|---|---|---|
| A12 | 24, 26, 64, 65, 71, 78, 84 | `"type":"..."` (7 instances) | `"displayType":"..."` — `business-info/block.json:22` declares `displayType`, default `"phone"`. Unknown attrs are discarded, so **all 7 currently render a phone number** (description, socials, hours, map, address). |
| A13 | ~88 | `href="https://maps.google.com/?cid=7952814055868010143"` — Indus's literal Google Place CID | Site Info. If no field exists, **STOP and report**. |
| A14 | ~106 | Duplicate hardcoded `Website by Small Giants Studio` + URL | Same as A10 |

---

## SECTION B — HEADER: ecommerce + one client's pattern in the framework default

| # | File | Current | Replace with |
|---|---|---|---|
| B1 | `plugins/sgs-blocks/src/blocks/cart/render.php` | Renders regardless of WooCommerce | **Return early (render nothing) when WooCommerce is inactive** — `if ( ! class_exists( 'WooCommerce' ) ) { return ''; }`. **This is the universal fix (R-31-9)**: it fixes the cart appearing on Indus (no ecommerce, Bean flagged repeatedly) BY CONSTRUCTION, keeps Mama's working, and needs no per-client carve-out. **Do NOT remove `sgs/cart` from the patterns** — that would break Mama's and is a carve-out. |
| B2 | `theme/sgs-theme/parts/header.html` ~24 AND `patterns/framework-header-default.php` ~40 | `sgs/business-info` `displayType:phone` `className:"is-style-button"` `sgsHideOnDesktop:true` | **REPORT ONLY — do not edit.** This is Indus's "Call button" pattern baked into the FRAMEWORK default. Removing it changes the live Indus header, which is Goal 1's target. Opus decides. |
| B3 | `theme/sgs-theme/parts/header.html` | Inlines the full pattern markup | **REPORT ONLY.** `parts/footer.html` is a 1-line `wp:pattern` reference; the header inlines a byte-identical duplicate. Known drift vector (already drifted). Opus decides. |

---

## VERIFICATION (the executing agent runs 1-3; Opus runs 4-6)

1. `cd plugins/sgs-blocks && npm run build` — must pass (runs dead-control + hardcoded-defaults gates).
2. `git diff --stat` — ONLY the files named above. Nothing else.
3. `diff <(sed -n '/site-header/,/\/site-header/p' theme/sgs-theme/parts/header.html) ...` — prove header.html and the pattern still match byte-for-byte in the shared region.
4. **Opus:** deploy canary → Indus, full cache clear incl. Hostinger CDN, live-verify.
5. **Opus:** Indus header shows NO cart (WooCommerce inactive). Mama's header STILL shows the cart.
6. **Opus:** Indus footer renders description/socials/hours/address correctly — NOT 7 phone numbers.

## Known-failing baseline (do not chase)

`plugins/sgs-blocks/scripts/tests/` = **61 failed, 112 passed, 2 skipped on a CLEAN tree** as of
2026-07-14. Pre-existing. A/B against a stash before blaming your change. Do not "fix" them here.
