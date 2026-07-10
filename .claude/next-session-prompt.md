---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-10
thread: pipeline typography-fidelity — universal fix (residual-precedence + effective-value lift) + pill fidelity
---

# NEXT SESSION — universal typography-fidelity fix (the real priority: pipeline 100% for ANY future draft)

Invoke `/autopilot` first. The no-inline rollout is DONE + committed (`c5be4ab1`). Bean's priority is now the
CLONING PIPELINE working at 100% fidelity for ANY future draft (any page type, content, industry, UI, branding).
A fresh clone + direct Playwright comparison proved content is 100% faithful; the remaining gaps are TYPOGRAPHY,
root-caused to two mechanisms this session. This session: fix them UNIVERSALLY, then re-run the comparison.

## State recap (plain English)
`main` @ `c5be4ab1`, build green (440 tests + all prebuild gates incl. the new no-inline + box-family gates),
sandybrown page 8 = fresh clone (`pipeline-state/mamas-munches-homepage-2026-07-10-181016`). The direct
draft-vs-clone comparison (`scratchpad/draft-vs-clone.js`) found: content 100% present; 5 typography differences
that root-cause to (1) residual render-precedence and (2) theme typography defaults not overridden. Details in
`.claude/handoff.md` Known Issues + `.claude/parking.md` `P-RESIDUAL-RENDER-PRECEDENCE`.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (this session's record — the root-cause) + `.claude/decisions.md` head (D302 + D300/D301).
2. **Spec 31 IN FULL** (Bean-locked every session) — esp. §3 F-fork + §13.4 **FR-31-5.2** (whole-tier folding + `sgsCustomCss` residual + the render-precedence caveat) + §7b (verify vs draft).
3. `.claude/parking.md` head — `P-RESIDUAL-RENDER-PRECEDENCE` (STOP-64, the confirmed root cause), `P-RESPONSIVE-ROUTER-ROBUSTNESS`, `P-HERO-SUB-MAXWIDTH-NESTED-CHILD`.
4. Shared render surfaces you WILL touch: `includes/helpers-typography.php` (`sgs_typography_css_rule`), `includes/custom-css.php` (`sgsCustomCss` render), `includes/class-sgs-container-wrapper.php`.

## ⛔ ANTI-PATTERN STOPs (carry forward + this session's)
- **STOP-16** — a subagent/"it works" is a HYPOTHESIS. Re-run yourself: `npm run build`; `python -m pytest plugins/sgs-blocks/scripts/converter/tests -q --import-mode=importlib` (440 pass); `node scripts/audit-inline-styling.js --check` (0); `check-box-family-guard.py --check` (0).
- **STOP-21/43/44** — LANDED only by deploy + purge (OPcache HTTP + LiteSpeed MCP) + live computed-style at 375/768/1440. Emit-green ≠ LANDED. A schema-valid attr can be a render no-op (verify the LIVE painted value).
- **STOP-64 (this session, CONFIRMED)** — a `sgsCustomCss` residual (class-scoped, appended) LOSES to the block's `#uid`-scoped typography helper. An emitted residual is NOT a paint guarantee — verify the LIVE computed value. This IS Mechanism 1 of the typography gap.
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers (instrument bugs) or the leftover-buckets counts (input-side, mostly unused schema slots). The dependable signal = direct Playwright content-matched computed-style comparison (`scratchpad/draft-vs-clone.js`) + Bean's eye.
- **STOP-67** — pre-commit visual-diff gate needs `reports/visual-diff/<block>-<date>.md` (EXACT `<block>-<date>.md` name, `verdict: PASS` + `first_paint_capture_passed: true`) per CHANGED block. Descriptive names don't match.
- **NEW — safecss strips functional colours.** Any INLINE colour VALUE must be hex/named/var (rgb/rgba/hsl/hwb/oklch/lab are stripped by `safecss_filter_attr`). The universal fix is `sgs_colour_value`→hex. Scoped `<style>` (via `wp_strip_all_tags`) is NOT filtered.
- **The harness/node runs via PowerShell** (nvm4w shim broken in Git Bash). Python works in Bash.
- **Path-scoped commits** — always `git commit -- <paths>`, never `git add -A`. Two threads share `main`. Don't pipe `git commit` to `tail` (SIGPIPE aborts it).

## Skills to Invoke
| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS INCLUDE — the residual-precedence fix shape (option a/b/c) is a design decision |
| `/gap-analysis` | ALWAYS INCLUDE — grade the fix before delivery |
| `/lifecycle` | ALWAYS INCLUDE — before any skill/agent/pipeline change |
| `/research` | ALWAYS INCLUDE — CSS specificity / WP style-engine best practice if unsure |
| `/strategic-plan` | ALWAYS INCLUDE — order the two mechanisms + pill fix |
| `/systematic-debugging` | trace one element end-to-end (draft CSS → extract → convert → render) before the fix |
| `/qc-council` | any shared-render change (helpers-typography / custom-css / wrapper) — blub-255 |
| `/sgs-clone` `/sgs-db` `/wp-blocks` | pipeline + schema ground truth |
| `/handoff` `/capture-lesson` | session close |

## MCP Servers & Tools
| Tool | What to use it for |
|------|-------------------|
| Playwright / chrome-devtools | LIVE computed-style + matched-rule inspection at 375/768/1440; re-run `scratchpad/draft-vs-clone.js` |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | LiteSpeed purge (user `u945238940`, domain `sandybrown-nightingale-600381.hostingersite.com`) |
| `sgs-clone-orchestrator.py` | fresh clone → `pipeline-state/mamas-munches-homepage-<ts>/` |
| REST app-pwd `.claude/secrets/sandybrown.env` | read page-8 stored markup / re-verify |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (Sonnet, solo) | trace one representative element per mechanism (READ-only — parallel-fine) |
| feature-dev:code-reviewer | pre-commit review of the shared-render change |
| test-and-explain | plain-English verify of a LANDED batch |

---

## Task 1 — Universal typography-fidelity fix (`P-RESIDUAL-RENDER-PRECEDENCE` + effective-value lift)
**What:** fix the two proven mechanisms so per-element typography renders faithfully for ANY draft.
**Why:** THE priority — pipeline 100% fidelity. Currently hero H1 renders 52px not 58, headings get theme letter-spacing, some line-heights fall to theme defaults.
**Estimated time:** 45–90 min.
**Orchestration:**
- Execution: inline (Opus). `/systematic-debugging` to trace one element per mechanism first (hero H1 58→52 for Mech-1; a section-heading letter-spacing for Mech-2).
- **Mechanism 1 (residual precedence, STOP-64):** `/brainstorming` the fix shape — (a) emit the typography helper (`sgs_typography_css_rule`) at CLASS specificity so the appended `sgsCustomCss` residual can override by source order, OR (b) emit the residual at `#uid` specificity to match/beat the helper, OR (c) route the residual through the helper channel. `/qc-council` (shared render). It's a shared-render change to `helpers-typography.php` + `custom-css.php` — DESIGN-GATE + Bean approval before building.
- **Mechanism 2 (effective-value lift):** make the extraction lift the EFFECTIVE computed line-height + letter-spacing (incl. an explicit value that overrides the theme default) onto every text element's block attrs. Verify the attr renders (STOP-44).
- **Acceptance:** re-run `scratchpad/draft-vs-clone.js` — the line-height/font-size/letter-spacing diffs on hero H1, section headings, and labels are gone (draft == clone computed) at 375/768/1440; content stays 100%. Live-verified on page 8 after re-clone + purge. Per-block visual-diff report(s).

## Task 2 — Option-picker pill state fidelity
**What:** the cloned pills differ from the draft on selected-vs-resting colour/bg/font-size(13→14)/text-align(centre→left).
**Why:** the last non-typography fidelity gap.
**Estimated time:** 30 min.
**Orchestration:** inline. `/qc-council` if converter-adjacent. Re-clone page 8 + live-verify.
**Acceptance:** live pill selected/resting bg+colour+size+align match the draft at 3 breakpoints.

## Dependency graph
```
Task 1 (inline, Opus — /systematic-debugging → /brainstorming → design-gate → build → /qc-council)
   ↓ re-run draft-vs-clone.js (verify)
Task 2 (inline — pills) ─ parallel-independent
   ↓ (both done)
/handoff → push
```

## Methodology guardrails (do not skip)
- **Deploy + (re-clone if attr-shape changed) + purge (OPcache + LiteSpeed) BEFORE measure** (STOP-21). Emit-green ≠ LANDED.
- **Root cause before instance fix** — a class-of-failure fix (render-precedence / extraction) beats per-element tuning.
- **The dependable fidelity signal = direct Playwright content-matched comparison + Bean's eye** — NOT computed-parity.js, NOT leftover-buckets (STOP-48/49).
- **/qc-council before any shared-render commit** (blub-255). **Design-gate the render-precedence change** (shared helper) + Bean approval before building.
- **No version bumps, no deprecations** (D293). Visual-diff report at repo-ROOT (STOP-67). Branch `main`; path-scoped commits.
