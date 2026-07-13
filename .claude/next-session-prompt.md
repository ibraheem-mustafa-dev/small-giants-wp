---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-13
thread: BUILD the shared FR-S9-6 {desktop,tablet,mobile} responsive-override engine ONCE + wire all row/nav blocks to it
---

# NEXT SESSION — BUILD the shared responsive-override engine (FR-S9-6)

You are the SGS WordPress block + frontend developer. The header (P1 D324 + nav P2 D326) and footer (P3 D325) blocks are all SHIPPED + live. This session builds the **shared `{desktop,tablet,mobile}` per-property responsive-override engine** ONCE and wires the three row/nav blocks to it. Invoke `/autopilot` first.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. **`.claude/handoff.md`** — this session's record (D326) + what shipped.
2. **`.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` §S9 FR-S9-6 IN FULL** (the responsive-override model spec) + Spec 17 end-to-end (Bean-locked: read the governing spec fully each session).
3. **`.claude/plans/2026-07-13-header-footer-nav-system-design-gate.md` §8** (per-breakpoint override model — data model, cascade, canonicalisation, editor UX).
4. **`.claude/parking.md`** → `P-ADAPTIVE-NAV-P2B` (item 3 = this build) + `P-DRAWER-MOVABLE-OVERFLOW-DROPZONE`.
5. **The 3 target blocks' current flat-tier attrs:** `plugins/sgs-blocks/src/blocks/{site-header-row,site-footer-row,adaptive-nav}/block.json` (all `gapTablet`/`maxWidthMobile` flat — the thing you're replacing) + **`SGS_Container_Wrapper`** (`includes/class-sgs-container-wrapper.php`) — how it reads flat-tier attrs + computes the uid.

## Why this next
FR-S9-6 (the `{desktop,tablet,mobile}` null-inherit per-property override model) is the ONE foundational §S9 FR that **no track has built** — header, footer, AND nav all ship on the simpler flat-tier attrs (`object-model=0`, verified on-disk). The footer track deferred it too. So there is **nothing to copy** — it is a fresh build. The upside (Bean's build-once intent): all three blocks are identical flat-tier, so build the engine ONCE and wire all three together, no divergence to reconcile.

## Track B (D325) — shipped this session + open follow-ups (secondary to FR-S9-6)
The footer track (parallel to D326) SHIPPED: `sgs/site-footer` + `sgs/site-footer-row`, `sgs/cart` `hideWhenEmpty`, `Org_Website_Schema` `sameAs`/`contactPoint`, the `sgs/business-info` block now has 8 draggable per-type variations (footer data reads live from Site Info, not bindings), and a **Tier-1 pipeline business-info auto-fill** (`sync-business-info.py` + capability-gated `POST /sgs/v1/site-info`, wired into `orchestrator/upload_and_patch.py` as a Spec 33 FR-33-14 Part-1 companion). **Open follow-ups (lower priority than FR-S9-6):** (a) **Tier-2 business-info** — tagline/address/hours are semantic guesses that need a review-not-auto-write flow (parallels FR-33-5); (b) a **full `/sgs-clone` run** to exercise the auto business-info fill end-to-end (only static-verified so far); (c) FR-S9-8 Site-Editor header-builder editor-UX design-gate (Track B Task 2, not done). Full detail: `.claude/handoff.md` (D325 section).

## ⛔ ANTI-PATTERN STOPs (carried forward — NEVER subtract, D101)
- **STOP-GROUND-TRUTH-CHECK-PARALLEL-TRACK (D326, NEW)** — before assuming a parallel track built something, VERIFY on-disk (grep the actual files). My "adopt the footer track's shared engine" was a false premise — the footer track deferred FR-S9-6; all blocks are flat-tier. Read ground truth, don't infer from a doc claim.
- **STOP-NO-KSORT-WRAPPER-UID (D326, NEW)** — the shared-wrapper uid = `md5(wp_json_encode($attributes))` and its docblock FORBIDS `ksort`/key-reorder (churns EVERY container block's uid → pixel drift). The object-model must guarantee key order at WRITE-time (edit.js + block.json default order), never by mutating the hash input. Verify existing blocks' uids are unchanged after the engine lands.
- **STOP-WHOLE-PAGE-SCROLLWIDTH-POLLUTED (D326, NEW)** — `document.documentElement.scrollWidth` is polluted by the testimonial-slider carousel (off-screen slides, accepted exception). To judge a block's own overflow, measure per-element `el.closest('header,...')`/`inHeader`, not the page's scrollWidth.
- **STOP-READ-TRUTH-NOT-ASSUME (D324)** — read theme files + plugin/WC source + the SPEC for ground truth BEFORE theorising. Prove the cause in the source, not by assumption.
- **STOP-CSS-VER-CACHE-BUST (D310/D316/D322)** — a `style.css`/theme-CSS-only change is served stale unless `theme/sgs-theme/style.css` Version is bumped; a block CSS change bumps that `block.json` version.
- **STOP-VERIFY-CACHE-LAYER (D312/D322)** — LiteSpeed v7.8.1 active on sandybrown; `wp litespeed-purge all` + OPcache + CDN (`hosting_clearWebsiteCacheV1`) before ANY live CSS/JS measure.
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache + LiteSpeed + CDN clear + live computed-value. (This session caught 3 bugs live that all passed the build.)
- **STOP-static-vs-live (D304/D305)** — for "does this rule apply / what renders?" use the LIVE DOM, never static PHP/CSS parsing.
- **STOP-67** — a changed BLOCK needs a pre-commit visual-diff report at `reports/visual-diff/<block>-<date>.md` (`verdict: PASS` + `first_paint_capture_passed: true`).
- **STOP-16** — a subagent / "it works" / build-green is a HYPOTHESIS. Re-run + re-verify yourself. Node/npm via PowerShell (nvm shim broken in Git Bash). This session's subagent shipped a `display:contents` layout bug + 2 view.js bugs — all caught by main-agent live re-verify.
- **STOP-WP-HOOKS-VALIDATE (D324)** — validate any WP hook via `/wp-hooks` before wiring it.
- **STOP-PARALLEL-TRACK-SWEEP (D326)** — a parallel session on the same working tree can sweep your uncommitted shared-file edits into ITS commit. Commit path-scoped + promptly; verify D-ceiling + branch before every commit.
- **STOP-VERIFY-BINDING-REGISTRATION (D325, NEW)** — a WP block-bindings source (or any registered thing) that "exists" in code can be entirely DEAD. Verify it's on the LIVE registry + renders the real value, not just that the class exists. Never pass `can_user_edit_value` to `register_block_bindings_source` (NOT a valid WP-core arg → the whole registration silently returns false). A binding `get_value` callback's param 2 is a `WP_Block` object, NOT `array` (a wrong type-hint → TypeError → HTTP 500). The `sgs/site-info` source was dead for its whole life until the footer surfaced all 3 (memory `verify-block-binding-registration-on-live-registry`).
- **STOP-GRID-MOBILE-COLLAPSE-NEEDS-EXPLICIT-TEMPLATE (D325, NEW)** — an explicit base `gridTemplateColumns` on a wrapper grid SUPPRESSES the `sgs-cols-mobile-N`/`sgs-cols-tablet-N` shorthand classes (D228 gate). To collapse columns at a tier you MUST set an explicit `gridTemplateColumns{Tablet,Mobile}` responsive value, not just `columns{Tablet,Mobile}`. Caught live (footer stayed 3-col at 375 until fixed).
- **Composite-mirror (R-31-9 / D294)** — delegate outer render to `SGS_Container_Wrapper`; no divergent per-block styling path. No inline `style=""` (Spec 32). No block version bumps as deprecations (D270/D293).

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — the data-model + cascade + canonicalisation design decisions |
| `/gap-analysis` | ALWAYS — grade the engine vs FR-S9-6 acceptance criteria |
| `/lifecycle` | ALWAYS — before any skill/agent change |
| `/research` | ALWAYS — WP responsive-attr patterns; Kadence/Spectra/GenerateBlocks device-tier models |
| `/strategic-plan` | ALWAYS — order the engine build + the 3-block wiring |
| `/qc-council` | validate the shared-wrapper change before dispatch (blub.db 255) — it's a cross-block sensitive surface |
| `/sgs-wp-engine` + `/sgs-update` | SGS block dev + DB register |
| `/qc` · `/visual-qa` · `/a11y-audit` | live breakpoint verification of all 3 blocks after wiring |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright / chrome-devtools MCP (or a standalone `node` Playwright script — MCP browser was locked this session) | live per-tier computed-value verification on all 3 blocks |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear (user `u945238940`, domain `sandybrown-nightingale-600381.hostingersite.com`) + `wp litespeed-purge all` + OPcache before any live measure |
| `/wp-blocks` + `/sgs-db` | schema/DB ground truth before any "missing X" claim |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet) | scaffold the editor device-switcher component + per-block wiring (re-verify live yourself, STOP-16) |
| `wp-sgs-developer` | heavy shared-wrapper/engine build (if registered) |
| `feature-dev:code-reviewer` (or /qc-council raters) | review the shared-wrapper change before commit |

## Task 1: Design + build the shared responsive-override engine (FR-S9-6)
**What:** a shared `{desktop, tablet, mobile}` per-property override data model (`null`=inherit-tier-above, `desktop` always concrete), consumed by `SGS_Container_Wrapper`, that emits a tier's CSS rule ONLY where it diverges from the tier below, with per-side box inheritance, container-query + media-query tiers, and a shared breakpoint source (768/1024 + custom-px).
**Why:** the foundational cross-block responsive model (FR-S9-6) that the header rows, footer rows, and nav all currently fake with flat-tier attrs.
**Orchestration:** inline (main, Opus) for the wrapper/data-model design; `/qc-council` the wrapper change before dispatch; delegate the editor device-switcher React component to Sonnet.
**Acceptance (FR-S9-6 full scope):** data model + null-inherit cascade + tier-diff emission + per-side box inheritance + shared breakpoint source (grep-clean of a second hardcoded 768/1024) + `container-type:inline-size` + the SGS-owned device-switcher (keyboard tabs, 44px, non-colour inherited-indicator, reset-to-inherited) + a golden "re-save = same uid" test. Existing (non-§S9) blocks' uids + CSS byte-unchanged (STOP-NO-KSORT).
**/qc gate after:** yes — `/qc-council` (shared surface) + live per-tier verify.

## Task 2: Wire the 3 row/nav blocks to the engine
**What:** migrate `sgs/site-header-row`, `sgs/site-footer-row`, `sgs/adaptive-nav` from flat-tier attrs to the object model, wiring their edit.js to the device-switcher and render.php to the engine.
**Why:** one consistent responsive model across the whole header + footer.
**Orchestration:** inline or 1 Sonnet subagent per block (disjoint dirs); re-verify each live yourself.
**Acceptance:** all 3 blocks live-verified at 320/768/1024/1440 — per-tier overrides apply, inherited values resolve, uid stable on re-save, no regression to the shipped header/footer/nav behaviour (WC blocks still gone, collapse still correct). Visual-diff report per block (STOP-67).
**Depends on:** Task 1.
**/qc gate after:** yes — `/qc` + `/visual-qa` + `/a11y-audit`.

## Dependency graph
```
Task 1 (inline Opus + /qc-council the wrapper change)
  ↓  live per-tier verify + golden uid test
Task 2 (per-block wiring, disjoint — verify each live)
  ↓  /qc + /visual-qa + /a11y-audit
Commit + merge-to-main (path-scoped; verify D-ceiling + branch)
```

## Methodology guardrails (do not skip)
- **Read the truth first** (spec + on-disk block.json + wrapper code), then design. **Deploy before measure** (STOP-21). **Root cause before instance fix.** **Outcome vs completion** — the outcome is all 3 blocks on ONE working responsive model, live-verified per tier; engine-built ≠ done. **/qc-council the shared-wrapper change BEFORE dispatch.** **Never `ksort` the uid.** **Ground-truth-check before assuming a parallel track built anything.**
