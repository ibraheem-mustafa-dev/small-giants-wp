# Chrome DevTools MCP — Stage 8 Integration Spec

**Status:** Design only. No implementation yet.
**Date:** 2026-05-05
**Owner:** Bean / SGS Framework
**Scope:** Stage 8 (measurement layer) of the SGS clone pipeline — extending current Playwright-based QA harness with Chrome DevTools MCP (Model Context Protocol — the new tool channel that exposes Chrome DevTools capabilities to Claude).

## Why this exists

Stage 8 today is strong on visual diff and computed-style parity, weak on Core Web Vitals (LCP/CLS/INP — Google's loading/stability/responsiveness metrics), network failures, and console errors. Chrome DevTools MCP provides those out of the box. Playwright stays where it already wins.

---

## 1. Decision matrix — task → tool

| Stage 8 task | Current tool | Recommended | Why |
|---|---|---|---|
| Multi-frame screenshot capture (0/200/500/1000/3000ms) | `tools/multi-frame-qa/capture.js` (Playwright) | **Playwright** (keep) | Custom-timed screenshot loops are bespoke; DevTools MCP has no equivalent timed-capture API |
| Computed-style diff (mockup vs SGS, all viewports) | `scripts/mockup-parity-validator.js` (Playwright) | **Playwright** (keep) | `getComputedStyle()` parity is exactly what Playwright does best; DevTools adds nothing |
| Font-load assertion (`document.fonts.ready`) | mockup-parity-validator (Playwright) | **Playwright** (keep) | DOM API access — already covered |
| LCP / CLS / INP (Core Web Vitals) | none | **Chrome DevTools MCP** (new) | `lighthouse_audit` returns these natively; rebuilding in Playwright = ~200 lines of PerformanceObserver glue |
| Network request errors (404, blocked, slow) | none | **Chrome DevTools MCP** (new) | `list_network_requests` + `get_network_request` is the network panel; Playwright has `page.on('response')` but no aggregated view |
| Console errors / warnings | none | **Chrome DevTools MCP** (new) | `list_console_messages` returns the full console buffer; cleaner than Playwright's `page.on('console')` event firehose |
| Accessibility tree snapshot | partial (axe via Playwright) | **Hybrid** | DevTools `take_snapshot` for the raw a11y tree; keep axe-core (via `a11y-audit` skill) for WCAG rule evaluation |
| Pixel diff / screenshot comparison | manual / saved PNGs | **Playwright** (keep) | Pixel diff via `pixelmatch`/PIL is a Node/Python concern; DevTools doesn't do diffs |
| Lighthouse (perf + a11y + SEO + best-practices) | none | **Chrome DevTools MCP** (new) | `lighthouse_audit` runs the official audit in one call |
| CSS pattern audit (M1, F4, O2 anti-patterns) | `scripts/css-pattern-audit.js`, `render-mobile-override-audit.js`, `font-source-audit.js` | **Static analysis** (keep) | These are source-code grep, not runtime — orthogonal to both tools |
| `wp_global_styles` cache reset | `scripts/global-styles-reset.js` | **Keep** | WP server-side, neither browser tool relevant |

**Headline:** DevTools MCP wins on perf + network + console (3 new scripts). Playwright keeps every visual-diff and DOM-parity job.

---

## 2. New scripts to write (Chrome DevTools MCP-driven)

### 2.1 `scripts/cwv-audit.js` — Core Web Vitals via Lighthouse
- **Inputs:** `url` (string), `viewport` (`mobile` | `desktop`, default `mobile` — Lighthouse mobile is the Google ranking signal), optional `runs` (default 1)
- **Calls:** `mcp__plugin_chrome-devtools-mcp_chrome-devtools__lighthouse_audit`
- **Outputs:** `reports/cwv/<run-id>.json` with shape `{ url, viewport, lcp_ms, cls, inp_ms, tbt_ms, fcp_ms, score_perf, score_a11y, score_seo, score_best_practices, severity }`
- **Severity:** `critical` if LCP > 4000ms or CLS > 0.25; `warn` if LCP > 2500ms or CLS > 0.1; else `pass`
- **Failure modes:** Lighthouse run timeout (returns `severity: "error", reason: "timeout"`); MCP not connected (skip layer with explicit warning)
- **Pipeline layer:** sits in visual-qa Layer 7 (Performance) — alongside font-source-audit

### 2.2 `scripts/network-errors-audit.js` — Network request validator
- **Inputs:** `url`, `viewport`, optional `allow_domains` (string[])
- **Calls:** `navigate_page` → wait for load → `list_network_requests` → optionally `get_network_request` for each non-2xx
- **Outputs:** `reports/network/<run-id>.json` with `{ url, total_requests, errors: [{ url, status, type, initiator }], blocked: [...], slow: [...] }`
- **Flags:** any 4xx/5xx, blocked CDN, font 404, image 404, requests > 3000ms
- **Severity:** `critical` if any font 404 or main-CSS/JS 4xx; `warn` if any image 404; else `pass`
- **Failure modes:** page navigation failure (returns `severity: "error"`); empty network log (warn — likely cache, retry with cache disabled)
- **Pipeline layer:** Layer 8 (Network/Resources) — new layer

### 2.3 `scripts/console-errors-audit.js` — Console error capture
- **Inputs:** `url`, `viewport`, optional `ignore_patterns` (string[] — regex)
- **Calls:** `navigate_page` → wait → `list_console_messages`
- **Outputs:** `reports/console/<run-id>.json` with `{ url, errors: [], warnings: [], info_count }`
- **Severity:** `critical` if any uncaught JS error; `warn` if any deprecation/CSP warning; else `pass`
- **Failure modes:** noisy 3rd-party (Stripe, Cloudflare insights) — solved via `ignore_patterns`; MCP unavailable (skip)
- **Pipeline layer:** Layer 9 (Runtime Errors) — new layer

### 2.4 `scripts/a11y-tree-snapshot.js` (optional, lower priority)
- **Inputs:** `url`, `viewport`
- **Calls:** `take_snapshot` (a11y tree, not screenshot)
- **Outputs:** `reports/a11y-tree/<run-id>.json` — landmark + heading + role hierarchy
- **Use:** detect missing landmarks, mis-nested headings, unlabelled interactive elements
- **Pipeline layer:** Layer 6 (Accessibility) — augments existing axe-core

---

## 3. Updates to existing scripts

| Script | Change | Rationale |
|---|---|---|
| `scripts/mockup-parity-validator.js` | **No change** | Pure DOM/computed-style parity — orthogonal to DevTools layer |
| `tools/multi-frame-qa/capture.js` | **No change (keep)** | Custom-timed Playwright captures; DevTools has no equivalent |
| `scripts/css-pattern-audit.js` | **No change** | Static source analysis, browser-tool agnostic |
| `scripts/render-mobile-override-audit.js` | **No change** | Static analysis |
| `scripts/font-source-audit.js` | **No change** (but report consumed by `cwv-audit.js` for context) | Static analysis |
| `scripts/global-styles-reset.js` | **No change** | Server-side |
| `scripts/colour-parity-audit.js` | **No change** | Source-level token parity |

**Net:** zero rewrites. New layer composes alongside, doesn't replace.

---

## 4. Updates needed to the visual-qa skill

Skill file: `~/.claude/skills/visual-qa/SKILL.md` (current grade A). Deltas required:

1. **Pipeline diagram** — extend from 9 layers to 11. Add Layer 10 (Network/Resources) and Layer 11 (Runtime Errors). Renumber if needed; CWV folds into existing Layer 7 (Performance).
2. **"When to use" table** — add row: "Core Web Vitals failing" → invoke with `--include-cwv` flag.
3. **Mode definitions:**
   - `Quick` mode — DevTools layers OFF (slow); only Playwright capture + parity validator.
   - `Full` mode — all layers ON, including CWV + network + console.
   - `Compare` mode — DevTools network/console comparison between mockup and live (diff the error sets).
4. **New section: "Chrome DevTools MCP dependency"** — note that Layers 7 (CWV portion), 10, 11 require the DevTools MCP server connected. Skill must detect and gracefully skip with a flag.
5. **Failure-mode table** — append: MCP disconnected → skip + flag; Lighthouse timeout → retry once → skip; network panel empty → retry with cache-disabled.
6. **Output schema** — extend the unified report to include `cwv`, `network`, `console` blocks.

No edits to the Playwright sections; they stay as-is.

---

## 5. Implementation order

Ranked by impact × inverse-effort. Suggested staging across 2 sessions.

**Session 1 (highest impact, mechanical):**
1. `scripts/cwv-audit.js` — Lighthouse wrap. ~30 min. Single MCP call, JSON parse, severity mapping.
2. `scripts/console-errors-audit.js` — ~15 min. One MCP call, filter, write JSON.
3. `scripts/network-errors-audit.js` — ~20 min. One list call, optional per-request detail, classify.

**Session 2 (skill wiring + optional layer):**
4. visual-qa SKILL.md edits — wire 3 new scripts into 9-layer pipeline (now 11). ~15 min.
5. `scripts/a11y-tree-snapshot.js` (optional) — ~15 min.

**Total estimated wall-time:** ~95 min split across 2 sessions. CWV alone (script 1) unlocks the biggest gap (Bean has zero CWV monitoring today).

---

## 6. Failure modes worth flagging

1. **DevTools MCP requires an active browser session.** It connects to a running Chrome instance, not a headless spawn. Playwright launches its own browser. Running both in parallel may collide on Chrome user-data-dir locks. **Mitigation:** sequence them — Playwright captures first (uses its own headless instance), DevTools MCP runs second against a separately-launched Chrome with `--remote-debugging-port`.

2. **MCP latency.** Each MCP call has round-trip overhead (typically 200-500ms). `list_network_requests` with full headers can return MB of data. **Mitigation:** call once per page, never per request unless flagged as error.

3. **Lighthouse runs are slow** (~30-60s per run). Don't run on every commit. Gate behind `--include-cwv` or run nightly only.

4. **Network panel needs cache-disabled** for accurate first-load metrics. DevTools MCP page-level cache control is limited; may need a fresh incognito session per run.

5. **Console buffer truncation.** Long-running pages with chatty 3rd-party scripts can overflow the buffer. Capture immediately after `load` event, not after arbitrary waits.

6. **DevTools MCP availability.** If the plugin is disconnected, every new script must fail soft (skip layer, flag in report) — never crash the pipeline. The 3 existing Playwright scripts must continue running.

7. **Lighthouse mobile vs desktop divergence.** Mobile Lighthouse uses simulated throttling; desktop doesn't. Reports must label the mode clearly, otherwise CWV numbers across runs mean different things.

8. **Cross-tool screenshot ownership.** Both tools can screenshot. Decision: Playwright owns all screenshots used for visual diff (consistent rendering). DevTools screenshots are for Lighthouse internal use only — not consumed downstream.

---

## Summary

Three new scripts (CWV, network, console), zero rewrites, two new pipeline layers, one skill update. Playwright keeps every visual-diff job; DevTools MCP fills the perf/network/console gap. Highest-value first build is `cwv-audit.js`.
