---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-15
thread: TRACK A — adaptive-nav/header/footer. Verify+commit the uncommitted work, then roster restore → FR-S9-6 → goals 1/4/3
---

# NEXT SESSION — verify what's in the working tree, THEN the roster restore

Invoke `/autopilot` first. Read `.claude/handoff.md` + `CLAUDE.md` + Spec 17 §S9 **IN FULL** + `.claude/decisions.md` D338/D337/D336.

## ⛔ READ THIS FIRST — THERE IS UNCOMMITTED, UNVERIFIED CODE IN THE WORKING TREE

Branch `feat/adaptive-nav-dialog-drawer`. **The STOP-67 pre-commit gate is BLOCKING the commit and it is RIGHT** — three block src trees (`site-footer`, `cart`, `adaptive-nav`) are modified with no `reports/visual-diff/<block>-<TODAY>.md` `verdict: PASS`, because **none of it has been live-verified**. It was NOT bypassed. Do not bypass it.

**Your first job: deploy → live-verify → write the 3 visual-diff reports → commit.** Do not build anything new until this is closed.

Uncommitted (all from the register `.claude/plans/2026-07-15-header-footer-hardcoding-register.md`):
| File | Change | Verify |
|---|---|---|
| `src/blocks/site-footer/edit.js` | client copy stripped; core/group\|heading\|list → sgs/container\|heading\|text; bottom-row formatting; **2 D328 coercion fixes** | Insert a fresh `sgs/site-footer`: no "Gift Ideas"/"Allergen Info"; columns render **2fr 1fr 1fr NOT equal thirds**; bottom bar has border+padding |
| `src/blocks/cart/render.php` | returns '' without WooCommerce | **Indus: NO cart. Mama's: cart STILL THERE.** Both live. |
| `src/blocks/adaptive-nav/render.php` | palette-resolved drawer bg+fg | **Mama's drawer ≥4.5:1** (was 3.32) AND Indus still ≥4.5. axe-core 0 on open drawer, BOTH. |
| `theme/sgs-theme/patterns/footer-indus-foods.php` | 7× `type`→`displayType` | Indus footer renders description/socials/hours/address — **NOT 7 phone numbers** |
| `theme/sgs-theme/patterns/framework-footer-default.php` | literals + 7 hrefs removed | no regression |
| `theme/sgs-theme/style.css` | 1.5.24 → **1.5.25** | served `?ver=1.5.25` |

**⛔ Bean has NOT signed off the Mama's drawer text flipping cream → black.** The resolver picks black (5.72:1) because cream-on-pink was 3.32:1 = a WCAG fail. Baseline-parity and WCAG genuinely conflict here. **R-31-13: his eye is co-authoritative. Show him a screenshot BEFORE committing.** If he rejects black, widen the resolver to try the client's own `surface`/`text` tokens before falling back to #000/#fff — do NOT hardcode another token.

## Current state

- **`main` is SAFE and deployable** — it ships the old `sgs/mobile-nav`, which never had the `<dialog>` bug. A previous session's claim that "main ships the broken drawer" was FALSE and was corrected. There is no urgency to merge.
- **Indus (palestine-lives) = ROLLED BACK to `main`** at Bean's instruction, verified live (old drawer restored, `<dialog>` gone, HTTP 200). **Leave it alone. Bean said: Mama's only for now.**
- **Mama's (sandybrown) = the feat branch is deployed** (drawer hidden when closed, logo/nav aligned, no overflow).
- **Branch has 9 commits**, incl. the mega-menu fix (Indus 7 links / 18-18 proven), the `<dialog>` `[open]` outage fix, and filemtime `?ver=`.

## Bean's decisions (LOCKED — do not re-litigate)

1. **Indus source of truth = the LIVE site he hand-built**, NOT `mockups/...V3.html`. The draft has one 600px breakpoint and no drawer; the framework implements a ≤1024 + Call-button + drawer pattern the draft does not contain. **The live site wins.**
2. **Build FR-S9-6 properly first** (he overruled the recommendation to cut it). See the ordering trap below.
3. **Roster: Bean delegated it to me.** ~24 DROPPED as genuinely superseded (all CTA attrs → `sgs/button` in the drop-zone; socials → `sgs/social-icons`; tagline → `business-info description`; search → `sgs/product-search`; `desktopHamburger` → `collapseTier`; swipe → already decided against; + the 19 that were already DEAD on `main`). **~12 KEEP** — real drawer chrome nothing else can set: `drawerBg`, `drawerWidth`, `drawerMaxWidth`, `closeButtonSize`, `closeButtonStyle`, `showLogo`, `logoMaxWidth`, `showDividers`, `dividerColour`, `accentColour`, `variant` (overlay + bottom-sheet). Animation flagged, left dropped per the drawer design doc's "not client-configurable".
4. **Goal 2 = Spec 33 Part 2, NOT starting.** The job is only that what we build is **pipeline-COMPATIBLE**. The converter's `SKIP_TOP_LEVEL_TAGS` frozenset stays.
5. **Bean builds pages BY HAND.** Re-cloning is NEVER the fix for his content. (Track B.)

## ⛔ THE ORDERING TRAP (the whole reason for the order below)

FR-S9-6 is spec'd *"foundational; FR-S9-2/3/4 consume this model"* (:806) but **91% of attrs shipped flat — 87 of 95** (site-header 0/26, site-footer 0/22, adaptive-nav 6/26 desktop-only). The spec at :733 admits it: *"NOT this block's dependency-in-fact"*.

**D328: a flat value stored where block.json declares `object` is SILENTLY COERCED to the default at render.** D293 bans deprecations → no migration path. So:
- **Restore the 12 kept capabilities FIRST**, then build FR-S9-6 on the FINAL attr set. Build the model first and it gets re-cut for 12 late arrivals.
- **Configure Indus/Mama's LAST.** Configure before the shape is final and every hand-set value silently resets.

## Order (each step independently shippable; nothing overwritten)

0. **Verify + commit the working tree** (above). Includes the 3 STOP-67 reports.
1. **2-line zero-dep fixes:** `adaptive-nav/render.php:61` + `site-footer/render.php:36` use `wp_unique_id()` — a per-request counter — while the other 3 blocks use `md5(wp_json_encode($attributes))` **and carry a comment explaining exactly why the counter is wrong**. It fragments the CSS cache per page. Copy the sibling line. Also add the missing `var()` fallback at `adaptive-nav/style.css:202`.
2. **Restore the 12 kept capabilities** as attrs + inspector controls (they are currently CSS literals in `adaptive-nav/style.css` — that file is the roster's territory, hands off until now).
3. **Build FR-S9-6** on the final shape. Reuse `helpers-responsive.php:437-497` — it already does null-coalesce-up + tier-diff emission correctly. **Wiring, not invention.**
4. **Goal 1 — Indus by hand.** CAPTURE THE BASELINE AS A FILE FIRST (`reports/visual-diff/header-footer-baseline-indus.json`). It has NEVER existed as a file — it lives in prose, which is how a session lost 2 links while believing it had replicated perfectly.
5. **Goal 4 — Mama's draft by hand.** 6. **Goal 3 — empty modular containers** (derive the slots from 4+5; do not guess them first).

## Open items needing Bean

- `displayType="attribution"` does not exist → his agency backlink is still hardcoded in `framework-footer-default.php:114` + `footer-indus-foods.php:106`. Adding `attribution` to Site Info is the single-source fix.
- No Site Info field for the Indus Google Place CID (`footer-indus-foods.php:88`).
- Mama's black-on-pink drawer text (above).
- **REPORT-ONLY, not actioned:** the Indus "Call button" (`is-style-button`) sits in the FRAMEWORK header default — one client's pattern in the shared file; removing it changes Goal 1's target. `parts/header.html` INLINES its pattern while `parts/footer.html` REFERENCES it — a known drift vector that has already drifted. Footer heading `fontSize:"medium"` vs the drafts' 11px uppercase micro-labels.

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)

- **STOP-VERIFY-EVERY-CLIENT (NEW, D338)** — a colour/contrast fix verified on ONE client is NOT verified. My drawer fix passed Indus (7.19:1) and shipped a 3.32:1 FAIL on Mama's because `primary-dark` is a PINK there. Measure across ALL `sites/*/theme-snapshot.json`.
- **STOP-TOKEN-NAME-IS-NOT-A-LUMINANCE (NEW, D338)** — never assume `primary-dark` is dark or `surface` is light. Resolve the slug to hex and COMPUTE the readable fg (`sgs_resolve_palette_hex` + `sgs_wcag_text_colour_for_bg`, helpers-colour-wcag.php). The extractor regenerates palettes per client.
- **STOP-D328-SHAPE-NOT-JUST-VALUE (NEW, D338)** — when specifying an attr edit, give the SHAPE not "copy the values". `gap` flat where block.json says `object` → silently coerced to default. `border` is a SUPPORT not an attr → goes under `style`, else discarded. Both shipped today from an imprecise register.
- **STOP-GATE-BLIND-TO-DELETION (NEW, D338)** — `check-hardcoded-render-defaults.js` only fires when a block **declares** an attr. Delete the attr, hardcode the value, and the build stays green. That is how 36 capabilities were destroyed. `check-dead-controls.js` catches control-without-render; **nothing catches render-without-control**.
- **STOP-COUNCIL/REGISTER-FINDINGS-ARE-HYPOTHESES (D333)** — fact-check every one vs live code. This session: a council claim that "main ships the broken drawer" was FALSE; a "180 tests pass" claim was FALSE (61 fail on a CLEAN tree — A/B against a stash before blaming yourself).
- **STOP-GATES-GREEN-IS-NOT-VERIFIED (D337)** — build + tests + every guard green while the desktop nav rendered 0 links, and while a closed `<dialog>` covered both sites.
- **STOP-DIALOG-DISPLAY-GATE (NEW, D338)** — never put `display` on a `<dialog>` base rule. Any author `display` beats the UA's `dialog:not([open]){display:none}` → the closed drawer renders permanently, and the wrapper's `position:relative` (0,2,0) puts it IN FLOW.
- **STOP-CACHE-URL-NEVER-CHANGES (D338)** — block CSS served at a frozen `?ver` (D293) + Cloudflare `max-age=604800` = a 7-day stale copy, incl. a cached **0-byte** file. Fixed by filemtime `?ver` on this branch; NOT on `main`.
- **STOP-TEST-DONT-GUESS (D337)** · **STOP-REUSE-THE-WORKING-BLOCK (D337)** · **STOP-READ-THE-ENV-CONFIG (D337)** — palestine-lives = DEV, sandybrown = STAGING, neither is a live client site · **STOP-REPLICATE-EXACTLY (D337)** · **STOP-CORE-BLOCK-WITH-SGS-REPLACEMENT (D337)** — DB `blocks.replaces` is authoritative · **STOP-INNERBLOCKS-ARE-NOT-ALWAYS-THE-MENU (D337)** · **STOP-DEPLOY-CANARY-FIRST (D337)** · **STOP-HIDDEN-PARALLEL-SYSTEM (D330)** — grep before building; the contrast resolver already existed · **STOP-21** emit-green ≠ LANDED · **STOP-67** visual-diff report per changed block (it blocked this session's commit, correctly) · **STOP-16** a subagent is a HYPOTHESIS; Node/npm via PowerShell (nvm shim broken in Git Bash) · **STOP-WINDOWS-BASH-STALE** · **STOP-PARALLEL-TRACK-SWEEP (D326)** — pre-existing dirt (lucide-icons.php, package-lock, phase4-*.txt, root .db, rr.json, iapi.html) is NOT yours · **STOP-NO-ALLOWLIST (D335)** · **STOP-ONE-SOURCE-BUSINESS-INFO (D335)** · **STOP-MEASUREMENT-VS-EYE (D335)** · Composite-mirror (R-31-9/D294) · no inline `style=""` (Spec 32) · no version bumps/deprecations (D270/D293) — theme `style.css` Version IS required and is not a block version.

## ⛔ PRE-FLIGHT SELF-ATTESTATION (answer before first Write/Edit)

1. Have I read Spec 17 §S9 IN FULL + D338/D337/D336 + the handoff this session?
2. Is there UNVERIFIED code in the working tree I am about to build on top of? (Yes — verify + commit it FIRST.)
3. Am I about to assert a cause I have not tested?
4. Am I verifying a colour/contrast fix on ALL 8 client palettes, not one?
5. Am I passing the declared SHAPE (object vs flat; support vs attr), or just the value?
6. Does an SGS block/helper already do what I'm about to write? Did I grep?
7. Am I about to build FR-S9-6 before the 12 capabilities are restored? (That is the rework trap.)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring?
9. D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) + branch verified?

## Skills / tools

`/autopilot` (first) · `/systematic-debugging` · `/qc-council` (pre-commit on the a11y-critical drawer) · `/sgs-db` + `/wp-blocks` (schema before any "missing X" claim) · `/visual-qa` + `/a11y-audit` (the 3 STOP-67 reports) · `/delegate` · `/handoff`.
Playwright MCP = the only gate that has ever caught these regressions. Hostinger MCP `hosting_clearWebsiteCacheV1` = CDN clear before EVERY live measure. `build-deploy.py` (canary default; `--target palestine-lives` explicit) — **it clears NO caches; do it manually**. LiteSpeed exists on sandybrown only, NOT on Indus.
