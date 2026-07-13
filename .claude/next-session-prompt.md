---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-13
thread: BUILD P1 — sgs/site-header (also fixes the STILL-LIVE header-overflow WCAG failure). Then P2 adaptive-nav, P3 site-footer.
---

# NEXT SESSION — BUILD P1: `sgs/site-header` (Header/Footer/Nav system)

You are the SGS WordPress block + frontend developer. The header/footer/nav SYSTEM design is APPROVED (D323, Bean sign-off); P0 (the unclickable mobile-nav drawer) shipped live. This session builds **P1 — `sgs/site-header`** — which also fixes the emergency header-overflow-below-~400px WCAG 2.2 SC 1.4.10 failure that is **still live**. Invoke `/autopilot` first.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. **`.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md`** — the approved system design (blocks, 3-row structure, per-breakpoint model, never-overflow Cluster+`clamp()`, drawer a11y, global-defaults+Site-Info, phasing, §12 S-tier QC regime).
2. **`.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 (FR-S9-1..11)** — the owning FRs. Plus Spec 17 IN FULL (Bean-locked: read the governing spec end-to-end each session).
3. **`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` §13.6** (composite-mirror) + **Spec 32 §6.1** (box-object/no-inline contract).
4. This handoff (`.claude/handoff.md`) + the STOP catalogue below.

## State recap (plain English)
The site header is currently a WordPress `core/group` with inline CSS inside `parts/header.html`. Below ~400px it overflows the viewport (logo 180px + 3× 44px icons + no rule under 480px) — a live WCAG Reflow failure. The approved fix is to build `sgs/site-header`: a specialised container block (like `sgs/feature-grid`) that lives INSIDE the header template part, lays its rows out with an intrinsic never-overflow Cluster (`flex-wrap:wrap` + `min-width:0` + `flex-shrink:0` logo) + fluid `clamp()` spacing, and drives responsiveness through block attributes (no inline CSS). Building it kills the overflow by construction.

---

## Task 1 — build `sgs/site-header` (P1)

**What:** a new specialised container block `sgs/site-header` (section KIND) with 3 optional named rows (top/middle/bottom, empty row = zero output), a typed element palette, the never-overflow Cluster layout, per-breakpoint overrides, and global-defaults + Site-Info access. It renders INSIDE the header template part.
**Why:** fixes the live WCAG header-overflow AND removes the inline-CSS `core/group`; first block of the approved system.
**Estimated time:** ~30–45 min for a first working block + live-verify (model on `feature-grid`).

**Orchestration:**
- Execution: inline (main thread, Opus) for the block architecture + live verification; a Sonnet subagent MAY scaffold the 5 files from the `feature-grid` template.
- Model: sonnet (scaffold) via /delegate; Opus (architecture + verify).
- Dispatch pattern: single-agent scaffold, then inline integration.
- Brief: create `src/blocks/site-header/` (block.json section KIND + `supports.sgs.containerKind:"section"` + skip-serialised colour/spacing/border; render.php delegating to `SGS_Container_Wrapper::render($attrs,$block,$inner,'section',opts)` with `$attrs` VERBATIM; edit.js with 3 named InnerBlocks row slots; save.js `<InnerBlocks.Content />`; index.js). Add the Cluster+`clamp()` never-overflow CSS.
- Context the subagent needs: model on `plugins/sgs-blocks/src/blocks/feature-grid/` (the `layout`-KIND exemplar; site-header is `section`); the wrapper is `plugins/sgs-blocks/includes/class-sgs-container-wrapper.php` (KINDs section/layout/content at line ~115); auto-registration is a `build/blocks` scandir loop (no manifest edit); NO block deprecations (D270). The `no-header-footer-block.py` hook already permits `src/blocks/site-header/` (its regex only blocks bare `header`).
- Depends on: none.
- Parallel with: none (P2/P3 depend on this).
- /qc gate after: yes — `/qc` + `/visual-qa` (the §12 QC matrix) + a `/qc-council` pre-build on the shared-surface bits.

**Acceptance (§12 QC regime — live, on the real page after deploy + full cache clear):** at 320/360/375/414/768/1024/1280/1440 `scrollWidth ≤ innerWidth`, no header element past the edge, cart+burger ≥44px; wrapper carries NO inline `style=""` (values in scoped `<style id="uid">`); 3 named rows render, empty row = zero output; the header content parity vs the current header holds. Then swap the `framework-header-default` pattern + ADD the CPT template (`class-sgs-block-cpts.php`). DB reseed via `/sgs-update`. Update the `header-footer-are-template-parts-not-blocks` memory to the evolved rule. Visual-diff report at `reports/visual-diff/`.

## Task 2 — P2 `sgs/adaptive-nav` (after P1) and Task 3 — P3 `sgs/site-footer`
Deferred to their own sessions/phases per the design-gate §13. Do NOT start until P1 is live-verified.

## Dependency graph
```
P1 sgs/site-header (inline Opus + sonnet scaffold)
  ↓ /qc + /visual-qa (320→1440) + swap pattern + CPT add + /sgs-update
  ↓ (fixes the live WCAG overflow)
P2 sgs/adaptive-nav  →  P3 sgs/site-footer  (later sessions)
```

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS — any design decision within the block |
| `/gap-analysis` | ALWAYS — grade the block vs WCAG + FR-S9 before declaring done |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` | ALWAYS — auto-routes research tier (e.g. a Cluster/clamp detail) |
| `/strategic-plan` | ALWAYS — order the P1 build steps before coding |
| `/sgs-wp-engine` | SGS block dev — block.json, render, QA |
| `/sgs-clone` + `/sgs-update` | register the new block's DB rows after build |
| `/qc` · `/visual-qa` · `/a11y-audit` | the §12 QC regime (live breakpoint matrix + axe) |
| `/qc-council` | pre-build multi-rater on shared-surface bits (blub.db 255) |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright / chrome-devtools MCP | THE live verification (resize, getBoundingClientRect, scrollWidth, computed styles) at every breakpoint |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before any live measure (user `u945238940`) + `wp litespeed-purge all` + OPcache |
| REST/SSH `.claude/secrets/sandybrown.env` | canary logins (user `Claude`); creds inline (unquoted specials — don't `source`) |
| `/wp-blocks` + `/sgs-db` | schema/DB ground truth BEFORE any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet) | scaffold the 5 block files from `feature-grid`; the deploy+verify mechanics |
| wp-sgs-developer | heavy SGS block build (if registered + relevant) |
| design-reviewer | mobile header layout visual/UX sign-off |

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)
- **STOP-HEADER-FOOTER-CONTAINER-BLOCK-OK (D323)** — header/footer/nav REMAIN template parts; a specialised CONTAINER block used INSIDE the part (like `sgs/card-grid`) is PERMITTED; a monolithic header/footer block that subsumes the template-part/CPT/rules/Site-Info system is FORBIDDEN. The `no-header-footer-block.py` hook already permits `site-header`/`site-footer`/`adaptive-nav` (its regex only blocks bare `header`/`footer`/`nav`) — no hook code change; update the `header-footer-are-template-parts-not-blocks` memory to record the evolution.
- **STOP-INERT-FREEZES-POPOVER-DESCENDANT (D323)** — `inert` on an ANCESTOR disables a Popover-top-layer descendant (the top layer is a PAINT-tree concept; `inert` follows the DOM tree). A modal/drawer that inerts its background must NOT be a descendant of the inerted node — re-parent it to `<body>`.
- **STOP-REVERIFY-OWN-QUICK-MEASUREMENT (D323)** — a quick live measurement can be a timing artifact (measured before an async handler ran) or grab the wrong element (an off-screen skip-link). Wait for the handler + filter to on-screen elements before concluding; my first drawer re-verify would have WRONGLY refuted a correct diagnosis. Extends fact-check-own-output.
- **STOP-RESEARCH-REAL-DOCS-HOLISTICALLY (D323, Bean)** — for a design decision, study top-tier systems' ACTUAL documentation as whole systems (how pieces fit + depend), not piecemeal forum-scraping. Name the best-documented systems + read them end-to-end.
- **STOP-CSS-VER-CACHE-BUST (D310/D316/D322)** — a `style.css`/theme-CSS-ONLY change is served stale (`?ver` pinned to the theme `Version:`) → bump `theme/sgs-theme/style.css` Version. A block CSS change bumps that block.json version. (A block viewScriptModule/JS change auto-busts via its content-hash `view.asset.php`.)
- **STOP-VERIFY-CACHE-LAYER-INSTALLED (D312/D322)** — LiteSpeed v7.8.1 IS active on sandybrown; `wp litespeed-purge all` + OPcache + CDN (`hosting_clearWebsiteCacheV1`) before ANY live CSS/JS measure.
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

## Methodology guardrails (do not skip)
- **Deploy before measure** (STOP-21) — build + deploy + OPcache + LiteSpeed + CDN clear BEFORE any live breakpoint/pixel/DOM measurement. Skipping = measuring stale output.
- **Root cause before instance fix** — for a class of failure, find the class root cause; don't tune one instance.
- **Outcome vs completion** — the outcome is the header no longer overflowing at 320–400px AND rendering with no inline CSS, live-verified. Block-built ≠ done.
- **/qc + /visual-qa (§12 matrix) BEFORE declaring done**; `/qc-council` before committing shared-surface changes (blub.db 255).
- **No block version bumps / deprecations** (D270/D293) — re-clone/re-insert instead.
- **Composite-mirror (R-31-9 / D294)** — the new block delegates to `SGS_Container_Wrapper`; no divergent per-block styling path.
