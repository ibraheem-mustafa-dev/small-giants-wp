---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-13
thread: EMERGENCY — header horizontal-overflow below 384px (Bean-reported). THEN (session after) Spec 33 other-5-client rollout + Part 2 (header/footer clone).
---

# NEXT SESSION — EMERGENCY: header horizontal-overflow below 384px

You are the SGS WordPress theme + frontend developer. **This session is a single emergency fix** (Bean-reported 2026-07-13): the site header overflows the viewport on small screens. Do ONLY this. The Spec 33 rollout + Part 2 tasks are deferred to THE SESSION AFTER (preserved at the bottom of this doc — do not start them). Invoke `/autopilot` first.

## ⛔ THE EMERGENCY (Bean's report, verbatim)
> On smaller screens, everything below 384px the website content starts to recede from the right. Every pixel I remove from the width of the screen adds the visual equivalent of a pixel of margin to the right. This occurs when the header elements reach the point where they have no space between them and the elements don't adapt or change — instead the website all gets more squished. As you go down in screen width the header elements shrink a little but not much and start escaping the margin, so the header is still full-width; at ~300px the page is super-thin with only the logo and burger visible. The customer-account icon and shopping-cart icon have escaped the page bounds and are visible if you swipe right.

**Problem (plain English):** below ~384px the header's element row runs out of space, but nothing tells it to wrap, hide, or collapse — so the row stays full-width and the right-hand icons (account + cart) push past the screen edge. That horizontal overflow drags the whole page's content rightward (the "receding from the right" + swipe-to-see-hidden-icons).

**Effect:** broken mobile UX on the smallest phones AND a **WCAG 2.2 SC 1.4.10 (Reflow) failure** — content must not require horizontal scrolling at 320px width. A large share of mobile traffic hits this.

**Ground truth already gathered this session (read-only):** the header is `theme/sgs-theme/parts/header.html` (logo + navigation + account + cart + burger). Its CSS lives across `assets/css/{header-modes.css, core-blocks-critical.css, core-blocks.css, utilities.css, woocommerce.css}`. The header/nav breakpoints STOP at 599px / 782px — **there is NO rule below ~384px**, which is exactly why the elements stop adapting and overflow. The account/cart icons are WooCommerce header elements.

## Task 1 (EMERGENCY) — make the header reflow below 384px, zero horizontal overflow

**What:** fix the header so that from 320px up there is NO horizontal overflow and the account/cart icons never escape the viewport.
**Why:** WCAG 2.2 Reflow compliance + a usable header on the smallest phones.
**Estimated time:** ~20-40 min (reproduce + root-cause + fix + verify at 4 widths).

**Orchestration:** inline (main thread, Opus) for diagnosis; a Sonnet subagent MAY do the multi-breakpoint Playwright capture. `/qc` gate after: YES (visual-qa at 320/360/384px).

**Investigation plan (do IN ORDER — root-cause before fixing; STOP-static-vs-live):**
1. **Reproduce on the canary LIVE** (`https://sandybrown-nightingale-600381.hostingersite.com/` — use a page that renders the full site header; if page 8 lacks it, use the homepage or any WooCommerce/shop page). Playwright: `browser_resize` to 320, 360, 384, 300px; at each, `document.documentElement.scrollWidth` vs `window.innerWidth` (overflow = scrollWidth > innerWidth). Screenshot each.
2. **Find the OVERFLOWING element** — don't guess. Walk the DOM for the widest element: `[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right > innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right}))`. Identify which header cluster (the account/cart icon group? the nav row? a fixed min-width?) pushes past the edge.
3. **Root-cause (classify the layer):** is it (a) the header flex row missing `flex-wrap`/gap-collapse, (b) a `min-width`/fixed-width on the icon cluster or a nav item, (c) `white-space:nowrap` on a wide element, or (d) an element positioned/padded outside bounds? Read `parts/header.html` + the matched CSS rules (enumerate matched rules on the culprit LIVE, per D304 `use-live-dom-not-static-parsing`).
4. **Fix at the LAYOUT layer (not a band-aid):** the proper fix is a small-screen breakpoint (≤384px, or fold into the existing mobile behaviour) where the header REFLOWS — most likely: collapse the account + cart icons into the mobile menu/burger below the breakpoint (they're already secondary on mobile), OR let the header row wrap, so nothing exceeds the viewport. `overflow-x:hidden` on a wrapper is a LAST-RESORT masking hack that hides the icons rather than fixing reflow — prefer a real reflow. Whatever you choose, verify the account + cart remain REACHABLE (in the burger menu if collapsed).
5. **Verify LIVE at 320/360/384/300px** (STOP-21 — deploy the theme + bump `style.css` Version + clear OPcache + LiteSpeed + CDN FIRST): `scrollWidth === innerWidth` (no overflow) at every width; account + cart reachable; header usable; no element past the edge. Screenshot each. `/visual-qa`.

**Acceptance:** at 320/360/384/300px the page has NO horizontal scroll (`scrollWidth <= innerWidth`), no element escapes the viewport, and the account + cart are still reachable (visible or in the menu). Live-verified on the canary with computed geometry, not just a screenshot glance.

**Guardrails:** theme CSS change → bump `theme/sgs-theme/style.css` Version (STOP-CSS-VER-CACHE-BUST) + full cache clear before measuring (OPcache + `wp litespeed-purge all` + `hosting_clearWebsiteCacheV1` — LiteSpeed v7.8.1 IS active on sandybrown). Root-cause on the LIVE DOM (enumerate matched rules), not static CSS reading (STOP-static-vs-live). Header is shared across all pages/clients — a fix here is universal (R-31-9); do NOT hardcode a client value. If the fix touches a header BLOCK's CSS (e.g. mobile-nav/mega-menu), that's a block change → visual-diff report (STOP-67).

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)
- **STOP-CSS-VER-CACHE-BUST (D310/D316/D322)** — a `style.css`/theme-CSS-ONLY change is served stale (`?ver` pinned to the theme `Version:`) → bump `theme/sgs-theme/style.css` Version. A block CSS change bumps that block.json version.
- **STOP-VERIFY-CACHE-LAYER-INSTALLED (D312/D322)** — LiteSpeed v7.8.1 IS active on sandybrown; `wp litespeed-purge all` + OPcache + CDN (`hosting_clearWebsiteCacheV1`) before ANY live CSS measure.
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache + LiteSpeed + CDN clear + live computed-value.
- **STOP-static-vs-live (D304/D305)** — for "does this rule apply / what overflows?" use the LIVE DOM (Playwright computed-style / matched-rules / getBoundingClientRect), NEVER static PHP/CSS parsing.
- **STOP-67** — a changed BLOCK needs a pre-commit visual-diff report at repo-ROOT `reports/visual-diff/<block>-<date>.md` (`verdict: PASS` + `first_paint_capture_passed: true`). A pure theme-CSS / template change is NOT a block → `--no-verify` (still hits the path-scope guard).
- **STOP-EMBED-FRESHNESS-IN-GATED-FILE (D320)** — a freshness/staleness gate MUST read its key from the EXACT file the consumer reads, never a sibling that can drift.
- **STOP-COUNCIL-SPEC-AUTHORITY (D321)** — when raters split (blast-radius "safe" vs spec "violation"), the SPEC wins.
- **STOP-MARKER-NEEDS-PATH-NOT-JUST-SELECTOR (D321)** — a "which selector matched" signal cannot LOCATE an element; capture its DOM path to exclude by ancestry.
- **STOP-GLOBAL-RULE-BELONGS-IN-THEME-ASSET-NOT-SNAPSHOT (D322)** — the client's deployed `theme.json` IS the snapshot; a FRAMEWORK-wide rule lives in a theme ASSET CSS, not the client snapshot.
- **STOP-DEAL-WITH-FOLLOWUPS-NOW (D322, Bean)** — do not accumulate follow-ups; deal with them THIS session, or explicitly as the next-session task. Use subagents if context is a concern.
- **STOP-PALETTE-ADDITIVE (D319)** — a regenerated palette deployed to an already-cloned site MUST be additive (raw draft-token-name slugs, emit-all, `--merge-onto`); a rename/drop breaks slug references → cream. Gate a palette change by a reclone (FR-33-11/12).
- **STOP-PRESERVE-ALPHA (D318)** — serialising a computed colour MUST preserve alpha (transparent→"transparent", partial→rgba, opaque→hex).
- **STOP-MEASURE-LIVE-BEFORE-CUTOVER (D318)** — before a prove-the-fix-live deploy, MEASURE the current live state first.
- **STOP-33-COMPUTED-VALUE-WINS (D317)** — the emitted VALUE is ALWAYS the COMPUTED value on a real rendered node; a `:root`/base declaration supplies only the NAME/ROLE.
- **STOP-33-PASSB-ADVISORY (D317/D321)** — a DERIVED (Pass B) token is advisory, never auto-live; role from USAGE-CONTEXT not raw frequency; nothing-usable→baseline+skip; parser-fail→HALT.
- **STOP-33-DEPLOY-SAFETY / FR-33-11 (D317)** — other 5 client snapshots DEFERRED behind their own reclone + parity; NEVER a snapshot-only push of a regenerated palette without a reclone (the D318/D319 pink regression).
- **STOP-33-DETERMINISM (D317)** — re-run on an unchanged draft → BYTE-IDENTICAL snapshot.
- **STOP-33-ORDERING / FR-33-12 (D320)** — the extractor is a HARD prerequisite of ANY block clone; `/sgs-clone` fails-closed if the deployed snapshot's `_sgsExtractor` hash ≠ the current draft (`--skip-freshness-gate` for extract-only runs only).
- **STOP-FIX-DRAFT-NOT-CLONE (D313)** — a draft-INHERITED issue is fixed at the DRAFT source (edit mockup, re-clone), not the clone/converter.
- **STOP-STYLE-TAG-IS-NOT-STYLE-ATTR (D311)** — a `<style>` TAG is NOT an inline `style="…"` ATTRIBUTE; check BOTH.
- **STOP-GOLDEN-CAN-BE-STALE (D311)** — prove a converter emit with a real-node trace of the CURRENT converter, not by reading a golden.
- **STOP-VERIFY-COLOUR-HOVER-AND-VS-DRAFT (D310)** — verifying a cloned colour = measure REST + HOVER (`.hover()`) vs the DRAFT's exact rule.
- **STOP-STANDARDISE-NAMING-FIRST (D309)** — standardise a naming convention first, then build the mechanism.
- **STOP-REGISTER-MECHANISMS-UNRELIABLE** — a pre-diagnosed register lists SYMPTOMS but its CAUSES are often wrong. Prove each on the live DOM / a real-node trace FIRST.
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself. Node/npm via PowerShell (nvm shim broken in Git Bash).
- **STOP-34** — verify a converter fix on the REAL draft node, not a synthetic fixture.
- **STOP-D228** — a framework default overriding the draft's faithfully-ABSENT/present value is a CHEAT to REMOVE/GATE. Universal (R-31-9).
- **STOP-WP-CORE-SERIALISATION (D306)** — a schema-valid emitted `style.*` value can be DROPPED by WP-core if the property definition lacks `css_vars`.
- **STOP-COLOUR-SLUG-VALIDATION (D308)** — never emit a bare `var()` capture as a colour slug without validating it exists in the theme palette.
- **STOP-VERIFY-CLAIM** — do NOT assert "X isn't recognised / lacks Z" from a failed grep. Verify against emitted markup / render code / live DOM first.
- **STOP-60** — a converter change adding attrs changes conformance goldens (reseed deliberately + cited).
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49 (RESOLVED D315)** — `computed-parity.js` is trustworthy; still ignore header/footer + the accepted testimonial slider when judging fidelity.
- **STOP-SUBVISIBLE-NEEDS-PREDICATE (D315)** — a fidelity tool's "sub-visible" bucket MUST be gated by a per-pair rendered-INVISIBILITY predicate.
- **STOP-PARITY-RAW-IS-PAGE-AGNOSTIC (D315)** — the parity tool's RAW % is page-agnostic; apply dispositions + Bean's eye.
- **safecss strips functional colours (D302)** — any INLINE colour VALUE must be hex/named/var; the scoped `<style>` channel is NOT filtered.
- **Path-scoped commits** — `git commit -F <msgfile> -- <paths>` (message FILE, explicit pathspec). `git add <file>` for NEW files; never `git add -A`. No co-author. Verify branch (`main`) + D-ceiling before commit.

## Skills to Invoke (emergency)
| Skill | When |
|---|---|
| `/systematic-debugging` | root-cause the overflow on the LIVE DOM before touching CSS |
| `/visual-qa` | multi-breakpoint (320/360/384/300px) live proof |
| `/brainstorming` | if the reflow approach (collapse-to-menu vs wrap) needs a design decision |
| `/gap-analysis` | grade the fix vs WCAG Reflow before declaring done |
| `/lifecycle` | any skill/agent/pipeline change |
| `/research` | WCAG 2.2 Reflow (SC 1.4.10) + WP block-theme header responsive patterns if needed |
| `/strategic-plan` | (only if the fix balloons; a single-file CSS fix does not need it) |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools (emergency)
| Tool | For |
|---|---|
| Playwright / chrome-devtools MCP | THE reproduction + root-cause (resize, getBoundingClientRect, scrollWidth, matched-rules) + the live proof |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live measure (user u945238940); + `wp litespeed-purge all` + OPcache |
| REST/SSH `.claude/secrets/sandybrown.env` | user `Claude`; pass creds inline (unquoted specials — don't `source`) |

## Agents to Delegate To (emergency)
| Agent | When |
|---|---|
| general-purpose (Sonnet) | multi-breakpoint Playwright capture / the deploy+verify mechanics |
| design-reviewer | if the mobile header layout needs a visual/UX sign-off |
| wp-sgs-developer | if the fix needs a header template-part edit (parts/header.html) |

## Methodology guardrails (do not skip)
- **Root-cause before fixing** — identify the OVERFLOWING element on the live DOM first; do not blanket `overflow-x:hidden` (that masks, doesn't fix, and hides the icons).
- **Deploy before measure** (STOP-21/CSS-VER/CDN/LiteSpeed) — theme deploy + Version bump + OPcache + LiteSpeed + CDN clear BEFORE any breakpoint measurement.
- **Universal, no carve-out** — the header is shared across all pages + clients; the fix is universal (R-31-9), no hardcoded client value.
- **`/qc` / visual-qa BEFORE declaring done** — no horizontal scroll at 320/360/384/300px, account+cart reachable.
- **Path-scoped commit** (message FILE, `-- <paths>`); no co-author; verify branch (`main`) + D-ceiling first. End with `/handoff`.

---

# THE SESSION AFTER — Spec 33 other-5-client rollout + Part 2 (DO NOT START until the emergency is fixed + closed)

Spec 33 Part 1 (the draft global-styles extractor) is COMPLETE (13/13 FRs, D320/D321/D322). Once the emergency header fix ships, resume here.

**Reading gate for that session:** Spec 33 IN FULL (v1.1.0 COMPLETE — note FR-33-11 Mama's-only, FR-33-13 namespace) + Spec 31 IN FULL (Bean-locked) + Spec 17 IN FULL (before ANY Part 2 work). Run the extractor tests first (`cd plugins/sgs-blocks/scripts && python -m pytest theme-extractor/tests -q --import-mode=importlib`, expect 26 green).

**Task A — roll the extractor out to the other 5 clients** (indus-foods first, then helping-doctors + 3). Per client: run the extractor on its draft → generate + `--merge-onto` its snapshot → RECLONE its pages via `/sgs-clone` (the FR-33-12 gate now REQUIRES a fresh snapshot) → live visual + computed-parity (Stage 11.6) → Bean's eye. Each client its OWN reclone + parity — NEVER a snapshot-only push (STOP-33-DEPLOY-SAFETY / the D318/D319 pink regression).

**Task B — Part 2 design-gate (header/footer clone, Spec 17)** via `/brainstorming`. FIRST resolve FR-33-13's tokenise-vs-Customiser question (Spec 17's built model = Customiser + inline CSS + JS-measured `--sgs-header-height`; Part 1 reserved `settings.custom.header`/`.footer`). Then design the draft→template-part header/footer converter. Design-gate + Bean approval before building (shared-mechanism rule).

**Note:** the emergency header-overflow fix and Part 2 (header/footer clone) BOTH touch the header — if the emergency fix changes `parts/header.html` or the header CSS structure, carry that context into the Part 2 design so they don't conflict.
