---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-15
thread: TRACK A — verify the working tree → freeze shape → SPLIT framework/per-site → roster → FR-S9-6 → Goal 4 → Goal 1
---

# NEXT SESSION — Track A (header/footer/nav)

Invoke `/autopilot` first. Read `.claude/handoff.md` + `CLAUDE.md` + **Spec 17 §S9 IN FULL** + `.claude/decisions.md` D338/D337/D336 + Spec 02 §"Website Credit element" + Spec 33 §"Website-credit recognition".

**Parallel tracks — do NOT touch their files:** Track B = Indus page CONTENT (`.claude/next-session-prompts/TRACK-B-*.md`). Track C = core→SGS block migration in patterns (`TRACK-C-*.md`).

## ⛔ STEP 0 — THERE IS UNVERIFIED CODE IN THE WORKING TREE. VERIFY IT BEFORE BUILDING ANYTHING.

Branch `feat/adaptive-nav-dialog-drawer`. **STOP-67 is blocking the commit and it is RIGHT** — 3 block src trees are modified with no `reports/visual-diff/<block>-<TODAY>.md verdict: PASS` because **none is live-verified**. It was NOT bypassed. Do not bypass it.

| Uncommitted file | Change | Live-verify |
|---|---|---|
| `src/blocks/adaptive-nav/render.php` | palette-resolved drawer bg+fg | **Mama's drawer ≥4.5:1** (was 3.32 — cream on PINK `primary-dark`) AND Indus still ≥4.5. axe-core 0 both. |
| `src/blocks/cart/render.php` | returns `''` without WooCommerce | **Indus: NO trolley** (Bean flagged repeatedly). **Mama's: trolley STILL THERE.** |
| `src/blocks/site-footer/edit.js` | client copy stripped; core→sgs blocks; bottom-row formatting; **2 D328 coercion fixes** | Fresh insert: columns render **2fr 1fr 1fr NOT equal thirds**; bottom bar has border+padding |

**⛔ Bean has NOT signed off Mama's drawer text flipping cream → black** (the resolver picks black, 5.72:1). Baseline-parity vs WCAG genuinely conflict. R-31-13: his eye is co-authoritative. **Screenshot → Bean BEFORE committing.** If rejected, widen the resolver to try the client's own `surface`/`text` tokens before falling back to #000/#fff — never hardcode another token.

## STEP 1 — 2-line zero-dep fixes
`adaptive-nav/render.php:61` + `site-footer/render.php:36` use `wp_unique_id()` (a per-request counter) while the other 3 blocks use `md5(wp_json_encode($attributes))` **and carry a comment saying why the counter is wrong**. It fragments the CSS cache per page. Copy the sibling line. Also add the missing `var()` fallback at `adaptive-nav/style.css:202`.

## STEP 2 — FREEZE THE ATTRIBUTE SHAPE (decision, ~15 min)
**Measured: 87 of 95 attrs (91%) shipped FLAT** — site-header 0/26, site-footer 0/22, site-header-row 5/10, site-footer-row 6/11, adaptive-nav 6/26 (desktop-only). Spec 17:806 still says FR-S9-6 is *"foundational; FR-S9-2/3/4 consume this model"*; :733 admits *"NOT this block's dependency-in-fact"*. **The spec contradicts itself and the wrong side is the one sessions read.**

**D328: a flat value stored where block.json declares `object` is SILENTLY COERCED to the default at render.** D293 bans deprecations ⇒ no migration path. So the shape must be final BEFORE any hand-configuration (Goals 1/4), or every configured value silently resets.

Add to §S9 Guardrails: *"No flat→object attr shape change on the 5 §S9 blocks. New tiered capability = a NEW sibling attr, never a reshape."* Amend :806 to match :733.

## STEP 3 — ⭐ SPLIT FRAMEWORK vs PER-SITE HEADER/FOOTER (Bean's insight, 2026-07-15)

**Bean's words:** *"The header and footer template part and build that are part of the theme/plugin and need to be committed to git and used across all sites need to be differentiated and separated from the header and footer files that needs to be unique for each website. Then those files need to be gitignored and we can figure out some sort of REST API setup or json file setup like the styles snapshot for each website separately so they can be safely set up via the pipeline primarily and via an agent when necessary."*

**This is the ROOT CAUSE of the whole class**, independently confirmed: `theme/sgs-theme/patterns/footer-indus-foods.php` declares `Title: Indus Foods Footer`, `Slug: sgs/indus-foods-footer`, is registered via `class-pattern-slug-shim.php:47` — so **every client install gets "Indus Foods Footer" in their inserter**, including its hardcoded Google Place CID (`:88`). It is the only client-named pattern in the framework theme, and CLAUDE.md already says client work lives in `sites/<client>/` only.

Model to follow: `sites/<client>/theme-snapshot.json` + `push-theme-snapshot.py` (already proven for per-client theming). Do the same for header/footer. **Doing this BEFORE Goals 1/4 means those goals write to the per-site channel rather than into framework files that then need un-picking.**

Sub-tasks: move/delete `footer-indus-foods.php` out of the framework theme (this dissolves the CID problem by construction — no new Site Info field needed); decide the per-site channel (JSON snapshot vs REST); gitignore per-site files.

## STEP 4 — Restore the 12 kept capabilities, THEN build FR-S9-6 (Bean's call: build it properly)
**Roster (Bean delegated the call, decided 2026-07-15).** ~24 DROPPED as genuinely superseded: all CTA/secondary-CTA attrs → place `sgs/button` in the drop-zone; socials → `sgs/social-icons`; tagline → `business-info description`; search → `sgs/product-search`; contact/WhatsApp → `business-info` + `sgs/whatsapp-cta`; `desktopHamburger` → `collapseTier`; `breakpoint` → `collapseTier`+`collapseCustomPx`; swipe → already decided against (NN/g); **+ the 19 that were already DEAD on `main`** (emitted CSS vars, 0 consumers — restoring them restores nothing).

**~12 KEEP** — real drawer chrome nothing else can set: `drawerBg` (this IS the contrast bug), `drawerWidth`, `drawerMaxWidth`, `closeButtonSize`, `closeButtonStyle`, `showLogo`, `logoMaxWidth`, `showDividers`, `dividerColour`, `accentColour`, `variant` (overlay + bottom-sheet). Animation left dropped per the drawer design doc's "not client-configurable" — flagged, not decided.

They are currently CSS literals in `adaptive-nav/style.css` — **that file is this step's territory; hands off until now.** Then build FR-S9-6 on the FINAL attr set: reuse `helpers-responsive.php:437-497` (already does null-coalesce-up + tier-diff emission). **Wiring, not invention.**

## STEP 5 — Goal 4: match the Mama's draft (EASIER — Bean moved it BEFORE Goal 1)
`sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` is a real spec. **2 liabilities in it:** it cites patterns `sgs-theme/header-mamas-munches`/`footer-mamas-munches` that **do not exist**, and maps the hamburger to `sgs/mobile-nav-toggle` which was **deleted (D336)** — re-point at `sgs/adaptive-nav` before any pipeline consumes it.

## STEP 6 — Goal 1: replicate the Indus header/footer (AFTER all tracks complete — Bean)

**BASELINE = the preserved hand-built Astra/Spectra site: https://lightsalmon-tarsier-683012.hostingersite.com/** — NOT `mockups/*.html`. Bean: *"the handmade versions that are preserved on lightsalmon"*. The V3 mockup is a service-page template whose header has ONE 600px breakpoint, no drawer, and footer collapse at 960 — it contradicts the ≤1024 + Call-button + drawer pattern the framework implements. **The live site wins.**

**Restorable from git (better than rebuilding by hand):**
- `git show e3cd1a04^:theme/sgs-theme/patterns/header-indus-foods.php` — 75 lines, deleted at `e3cd1a04`
- `git show 0587f638:theme/sgs-theme/parts/header.html` — 60 lines, the pre-§S9 custom header

**Bean's measured defects in the CURRENT build (all must be fixed):**
- `sgs/adaptive-nav` does NOT switch to burger at the **tablet breakpoint (1023px)** — note `render.php:294-309` hardcodes **768/1024/1280**, never touches `SGS_Breakpoints` (which defines TABLET_MAX=**1023**, MOBILE_MAX=**767**). Off-by-one AND a phantom 1280. FR-S9-6's own acceptance ("grep-clean of any second hardcoded 768/1024 pair") FAILS on the file it names.
- `sgs/responsive-logo` does NOT switch to the square/stacked logo at the mobile breakpoint.
- Buttons, rows and background colours not preserved.
- The shopping trolley is still there (STEP 0's cart guard fixes this once deployed).
- Sticky + shrinking-sticky header behaviour, and "everything shrinks, never goes out of bounds".

**Mega-menu:** contents need NOT match (designed differently). Only requirement: **mega menus show on mobile AND desktop and don't look a mess.**

**Capture the baseline AS A FILE FIRST** (`reports/visual-diff/header-footer-baseline-indus.json`). It has NEVER existed as a file — it lives in prose, which is how a session lost 2 links while believing it had replicated perfectly.

**Bonus:** lightsalmon is Astra/Spectra with a 3-layer customiser header/footer builder — Bean expects comparing against it to expose weaknesses in our Site-Editor builder. Treat that as a finding source, not just a pixel target.

## STEP 7 — Goal 3: de-hardcode the base blocks (Bean's definition, corrected)
**NOT "empty containers derived from exemplars".** Bean: *"Goal 3 is about de-hardcoding all of that content you had inserted into the base blocks/files when trying to set up the Indus and Mamas header and footer row blocks."* Target: `site-header/edit.js` + `site-footer/edit.js` TEMPLATEs + the row blocks.

**Headings rule (Bean, 2026-07-15):** headings must NOT be in the shared header/footer default — only in opt-in variations/patterns. *"Some even want no footer and leave it just with the copyright/website credit strip."* `parts/footer.html` references `framework-footer-default`, so that IS the shared default ⇒ strip its `Quick Links`/`Contact`/`Opening Hours` headings; the rich versions already exist as opt-in patterns (`footer-compact`, `footer-informational`, `footer-minimal`).
*(NB: those headings were RESTORED on 2026-07-15 because emptying them created 3 WCAG "heading must have content" violations. Bean's rule supersedes: REMOVE the heading blocks entirely, don't empty them.)*

**Does NOT overlap Track C** (Bean checked, correct): Track C = lossless core→SGS migration in patterns; Goal 3 = de-hardcoding base blocks.

## STEP 8 — Attribution element (spec WRITTEN, build it)
Spec: **Spec 02 §"`sgs/business-info` `displayType="attribution"`"** + **Spec 33 §"Website-credit recognition"**. Already shipped: the enum value, the variation, the render case, `SGS_ATTRIBUTION_URL`/`TEXT` constants, and both patterns switched to it. **Still to build:** the typography-only attr surface, the WCAG-resolved default colour, and the left→right `#e7d768` hover sweep.

Prerequisite draft edits (Bean-approved): add `class="sgs-footer__credit"` to both drafts; **add the missing credit to the Mama's draft** (it has none — its 2nd bottom-bar span is a TAGLINE, so a positional rule would map the tagline to Bean's backlink). Then `/ui-ux-pro-max` must enforce the classifier on all future builds (parked `P-UIMAX-ENFORCE-CREDIT-CLASSIFIER`).

## STEP 8b — `sgs/heading` can't inherit; the hardcode gate is blind to block.json defaults (Bean, 2026-07-15)

**Bean's model, which is NOT implemented:** *"the default typography settings for sgs/text should be what is set as the global paragraph defaults and the heading block should have the exact same thing depending on what h tag you set."*

Measured:
```
sgs/text     supports.typography: null   fontSize: {"type":"number"}
sgs/heading  supports.typography: null   fontSize: {"type":"number", "default": 28}
```
Neither declares typography supports ⇒ **cannot represent a preset slug** (`"fontSize":"small"` — the theme.json `settings.typography.fontSizes` scale). That is Track C's blocker: converting `core/heading fontSize:"small"` has no target. And `sgs/heading`'s **hardcoded `default: 28`** actively defeats the h-tag inheritance Bean describes — an R-31-1 violation in the block itself.

**The fix (do it properly — this is a shared block on every page of both sites):** drop `default: 28`; add WP-native `supports.typography.fontSize` on the block ROOT. HC2 explicitly PERMITS this — *"HC2 bans a parent PER-ELEMENT typography control, NOT a wrapper inheritable default… what HC2 PERMITS is the WordPress-native `supports.typography` declared on the block ROOT"* — and `sgs/heading` renders the `<h*>` AS its root (D288 single-element pattern), so root == the element. Unset ⇒ inherits theme.json `styles.elements.h1..h6`. **`render.php` must be reworked in the same commit** (it emits px from a number today; WP will emit a preset class/inline style) and live-verified at 375/1440 on both clients — headings are on every page.

**⛔ THE GATE GAP — `check-hardcoded-render-defaults.js` cannot see this.** Its own docstring: *"Parse block.json → collect attribute NAMES"* then *"Scan style.css and render.php"*. It reads block.json for **names only, never for `default` VALUES** — so a hardcoded constant in a block.json default passes a green build, invisibly. **This is how `default: 28` shipped.** Extend the gate to flag a literal `default` on any attr whose property it already governs.

**NOT a blanket fix — 3 blocks, each needs the judgment call** (`framework-block-client-hardcode-is-a-bug-not-a-constant`: a hardcoded LAYOUT/CLIENT value is a bug; the component's OWN constant stays):

| Block | Attr | Default | Call |
|---|---|---|---|
| `sgs/heading` | `fontSize` | **28** | **BUG** — must inherit per h-tag |
| `sgs/label` | `fontSize` | 12 | Likely the component's OWN constant (a chip IS 12px) — probably KEEP |
| `sgs/product-card` | `ctaFontSize` | 15 | Needs Bean's call |

**Unblocks Track C's 100 preset-slug instances** — do this BEFORE Track C swaps `core/heading`/`core/paragraph`, or those conversions hardcode pixels into framework patterns (a framework regression).

## STEP 9 — Triage the 9 remaining dead attrs
`python plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py` (NEW gate, committed). Each needs a judgment call — typo, or a capability the block genuinely lacks?
- `sgs/info-box` → `iconColour` + `iconBackgroundColour` (`mega-menu-services.html` ×3)
- `sgs/whatsapp-cta` → `buttonText` (`mega-menu-contact.html:73`)
- `sgs/label` → `content` + `labelStyle` (`label-heading-subheading-cluster.php:16`)

## STEP 10 — Spec 15 is ABROGATED: 148 dangling refs across 76 files
`specs/15-*` **does not exist**. Sections cited: `§7`(9) `§6`(9) `§3.3`(8) `§9`(6) `§7.2`(3) `§3`(3) `§8.1`(2) `§8`(2). Decide the section→spec mapping ONCE, then sweep. Known: **§8.1/§3 (SGS-BEM) → Spec 00 §3/§3.1** (CLAUDE.md already fixed). **§3.3 (attribute decomposition) → Spec 31** (owns `slots`/`property_suffixes`). Bean: the live specs are **00, 01, 17, 33**. Heaviest files: `converter/db/db_lookup.py`, `behavioural-analyser/assign-canonical.py`, `drift-validator/validate.py`, `02-SGS-BLOCKS-REFERENCE.md:6652` (auto-generated — fix the GENERATOR, not the output).

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)

- **STOP-SILENT-ATTR-DISCARD (NEW, D338)** — WP DISCARDS any attr a block.json doesn't declare: no error, no gate, no build failure. **45 found live** (36 fixed: 19× `type`→`displayType`, 17× `textColor`→`textColour`; 9 open). Gate: `check-dead-pattern-attrs.py`. Never blanket-rename — American `textColor` is CORRECT on core blocks.
- **STOP-VERIFY-EVERY-CLIENT (NEW, D338)** — a colour/contrast fix verified on ONE client is NOT verified. Passed Indus 7.19:1, shipped 3.32:1 on Mama's. Measure across ALL `sites/*/theme-snapshot.json`.
- **STOP-TOKEN-NAME-IS-NOT-A-LUMINANCE (NEW, D338)** — `primary-dark` is a PINK on mamas-munches. Resolve slug→hex, COMPUTE the fg (`sgs_resolve_palette_hex` + `sgs_wcag_text_colour_for_bg`, `helpers-colour-wcag.php`). Never assume a name implies luminance.
- **STOP-D328-SHAPE-NOT-JUST-VALUE (NEW, D338)** — specify the SHAPE, not "copy the values". Flat where block.json says `object` → coerced to default. `border` is a SUPPORT not an attr → under `style`, else discarded.
- **STOP-GATE-BLIND-TO-DELETION (NEW, D338)** — `check-hardcoded-render-defaults.js` only fires when a block DECLARES an attr. Delete the attr + hardcode the value ⇒ build stays green. How 36 capabilities were destroyed. Nothing catches render-without-control.
- **STOP-DIALOG-DISPLAY-GATE (NEW, D338)** — never put `display` on a `<dialog>` base rule; any author `display` beats the UA's `dialog:not([open]){display:none}` ⇒ closed drawer renders permanently.
- **STOP-COUNCIL/REGISTER-FINDINGS-ARE-HYPOTHESES (D333)** — fact-check every one. This session: "main ships the broken drawer" = FALSE; "180 tests pass" = FALSE (**61 fail on a CLEAN tree** — A/B against a stash before blaming yourself).
- **STOP-GATES-GREEN-IS-NOT-VERIFIED (D337)** · **STOP-67** (blocked this session's commit, correctly) · **STOP-21** emit-green ≠ LANDED · **STOP-16** a subagent is a HYPOTHESIS; **Node/npm via PowerShell — the nvm shim is broken in Git Bash** · **STOP-WINDOWS-BASH-STALE** · **STOP-CACHE-URL-NEVER-CHANGES (D338)** — block CSS at a frozen `?ver` + Cloudflare `max-age=604800` = 7-day stale, incl. a cached **0-byte** file (fixed by filemtime `?ver` on this branch, NOT on `main`) · **STOP-TEST-DONT-GUESS (D337)** · **STOP-REUSE-THE-WORKING-BLOCK (D337)** · **STOP-READ-THE-ENV-CONFIG (D337)** — palestine-lives = DEV, sandybrown = STAGING; neither is a live client site · **STOP-REPLICATE-EXACTLY (D337)** · **STOP-CORE-BLOCK-WITH-SGS-REPLACEMENT (D337)** — DB `blocks.replaces` authoritative · **STOP-INNERBLOCKS-ARE-NOT-ALWAYS-THE-MENU (D337)** · **STOP-DEPLOY-CANARY-FIRST (D337)** · **STOP-HIDDEN-PARALLEL-SYSTEM (D330)** — grep first; the contrast resolver already existed · **STOP-PARALLEL-TRACK-SWEEP (D326)** — pre-existing dirt (`lucide-icons.php`, `package-lock`, `phase4-*.txt`, root `.db`, `rr.json`, `iapi.html`) is NOT yours · **STOP-NO-ALLOWLIST (D335)** · **STOP-ONE-SOURCE-BUSINESS-INFO (D335)** · **STOP-MEASUREMENT-VS-EYE (D335)** · Composite-mirror (R-31-9/D294) · no inline `style=""` (Spec 32) · no block version bumps / deprecations (D270/D293) — the theme `style.css` Version IS required and is NOT a block version.

## ⛔ PRE-FLIGHT SELF-ATTESTATION (answer before first Write/Edit)
1. Read Spec 17 §S9 IN FULL + D338/D337/D336 + handoff this session?
2. Is there UNVERIFIED code in the working tree I'd be building on? (Yes — Step 0 FIRST.)
3. Am I about to assert a cause I have NOT tested?
4. Verifying colour/contrast on ALL 8 client palettes, not one?
5. Passing the declared SHAPE (object vs flat; support vs attr) — not just the value?
6. Does an SGS block/helper already do this? Did I grep?
7. Am I building FR-S9-6 before the 12 capabilities are restored? (rework trap)
8. Canary before dev-site? Full cache clear incl. Hostinger CDN before measuring?
9. D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`) + branch verified?
10. Am I touching Track B's (page content) or Track C's (pattern core-blocks) files?

## Skills / tools
`/autopilot` (first) · `/systematic-debugging` · `/qc-council` (pre-commit on the a11y-critical drawer) · `/sgs-db` + `/wp-blocks` (schema BEFORE any "missing X") · `/visual-qa` + `/a11y-audit` (the STOP-67 reports) · `/ui-ux-pro-max` (Step 8 enforcement) · `/delegate` · `/handoff`.
Playwright MCP = the only gate that has caught these regressions. Hostinger MCP `hosting_clearWebsiteCacheV1` before EVERY live measure. `build-deploy.py` (canary default; `--target palestine-lives` explicit) — **it clears NO caches; do it manually.** LiteSpeed is on sandybrown only, NOT Indus.
