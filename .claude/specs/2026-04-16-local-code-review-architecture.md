# Requirements Specification — Local Code Review Architecture

**Version:** 2.0
**Date:** 2026-04-16
**Author:** Bean (with Claude Code assistance)
**Status:** Draft — awaiting approval
**Supersedes:** v1.0 (same path, 2026-04-16 — see change log)

---

## 1. Executive Summary

A four-pillar local code-review system for Bean's toolchain spanning all 13 active projects (WordPress/PHP, Next.js/TS, Python, Supabase, future Flutter). CC-side covers daily review with zero LLM tokens via VSCode extensions + `/diagnostics` + `/lint`. OC-side (see SSB spec 2026-04-16-code-review-automation-and-learning) covers nightly cross-project scans and pattern learning. This spec covers CC-side pillars 1-4 only.

---

## 2. Background and Context

### 2.1 Problem Statement

Bean needs daily code-review coverage across a heterogeneous stack — PHP/WordPress, TS/JS/Next.js, Python (OpenClaw, windowsagent, open-icd11), CSS/Tailwind, HTML email mockups, Supabase schemas, planned Flutter — running in varied contexts (Git repos, non-Git folders, VPS-edited files). No SaaS reviewer (CodeRabbit, Greptile) fits because they lock to GitHub and charge per seat.

### 2.2 Current State

Bean has 71 VSCode extensions installed. Code-review-relevant coverage by language:

| Language | Coverage | Quality |
|---|---|---|
| PHP | Intelephense + PHPCS + PHPStan + DEVSENSE + SonarLint + Semgrep + WP-hooks | Over-covered; primary tool choice needed |
| JS / TS | ESLint + SonarLint + Semgrep + TS-next | Solid |
| Python | Pylance (types only) | **Gap — no lint/format extension** |
| CSS | Tailwind IntelliSense + Prettier | **Gap — no stylelint** |
| HTML | html-css + Prettier | Minimal (email needs `email-html-builder` skill) |
| Accessibility | Axe-linter (Deque) | Industry-standard |
| Dart / Flutter | None | **Deferred — install when ibadah-app begins** |
| Supabase | Prisma only | **Minor gap — install when touching schema** |

Two new CC commands already built this session:
- `/diagnostics` — reads the VSCode Problems panel via `mcp__ide__getDiagnostics`, aggregates all extension findings
- `/lint` — routes by file extension to CLI autofixers (eslint, phpcbf, ruff, prettier)

### 2.3 Why Now

Completed the 5-MCP + 2-plugin dedup pass today. `code-review` plugin uninstalled. Need the replacement architecture written before the slot gets filled by another GitHub-dependent tool.

---

## 3. Scope

### 3.1 In Scope (Pillars 1-4, CC-side)

**Pillar 1 — Extensions (passive, in-editor live feedback):**
- Install `charliermarsh.ruff` — Python lint/format in editor
- Install `stylelint.vscode-stylelint` — CSS linting
- Configure SonarLint, Semgrep, PHPStan, Axe-linter with per-project configs
- Decide DEVSENSE vs Intelephense as primary PHP LSP (one, not both)

**Pillar 2 — `/lint` (active, on-demand fix pass):**
- Already built. Routes `.ts/.tsx/.js/.jsx` → eslint + prettier, `.php` → phpcbf + phpcs, `.py` → ruff, `.json/.md/.yml/.css` → prettier.
- Add Dart routing (`dart format + dart analyze`) when ibadah-app begins.

**Pillar 3 — `/diagnostics` (read verb):**
- Already built. Reads Problems panel, groups by file + severity, falls back to CLI linters if `ide` MCP disconnected.

**Pillar 4 — `/code-review` deep pipeline (deferred):**
- CLI pipeline wrapping Semgrep CLI with expanded ruleset + `arm/metis` for security-sensitive SGS client deliverables + Opus synthesis via `receiving-code-review` skill.
- Built only if Pillars 1-3 prove insufficient after 1-week soak.

### 3.2 Cross-Referenced to SSB Spec

Pillars 5 and 6 live in `A:/.openclaw/.claude/subprojects/ssb/specs/2026-04-16-code-review-automation-and-learning.md`:
- **Pillar 5** — Automation Engine nightly cross-project flow → blub.db (SSB Phase 5)
- **Pillar 6** — SSB pattern learning from findings (SSB Phase 7)

### 3.3 Out of Scope

- Any GitHub-dependent reviewer (CodeRabbit, Greptile, code-review plugin, pr-reviewer skill's GitHub posting)
- Any SaaS reviewer requiring account or paid tier
- Snyk extension (documented false-positive / alert-fatigue issues — use `npm audit` + `pip-audit` + WPScan CLI on demand instead)
- CI/CD integration (no GitHub Actions hooks, no Git pre-commit hooks)
- Custom semantic analysis engines — always use existing OSS rulesets

### 3.4 Assumptions

- VSCode is the primary editor across all 13 projects
- `ide` MCP server (built-in to Claude Code VSCode extension) remains reliable
- SonarLint, Semgrep, PHPStan, Axe-linter remain free at their current tier
- `/diagnostics` and `/lint` remain routed via `/dev verify`, `/commit` pre-flight, and the memory rule preferring them over raw CLI invocation

---

## 4. Users and Stakeholders

| Role | Description | Primary need |
|---|---|---|
| Bean | Solo developer, ADHD, non-coder, 13 active projects | Daily review working everywhere, zero tokens, zero per-project remember-to-run |
| Future CC sessions | Claude Code sessions across projects | Clear convention for when to invoke `/diagnostics` vs `/lint` vs deferred `/code-review` |
| SSB Phase 5 sessions | Future OC-side sessions building Pillar 5 flow | Spec cross-reference point for schema + flow hooks |

---

## 5. User Stories

**As Bean, I want to finish editing any file in any of my 13 projects and run `/diagnostics` to see every error/warning without burning LLM tokens.**

Acceptance:
- [ ] `/diagnostics` returns findings from the full extension stack (types, lint, semantic, security, a11y)
- [ ] Zero API tokens consumed when Problems panel is populated
- [ ] Works on Git repos, non-Git folders, and Remote-SSH VPS files identically

**As Bean, I want to run `/lint path/` and have the right fixer auto-applied regardless of language.**

Acceptance:
- [ ] `.py` files routed through ruff
- [ ] `.php` files routed through phpcbf + phpcs
- [ ] `.ts/.js/.tsx/.jsx` files routed through eslint --fix + prettier
- [ ] `.css/.scss/.json/.md/.yml` files routed through prettier
- [ ] Unsupported extensions (e.g. `.dart` pre-Flutter) report "no route" gracefully

**As Bean, I want the same extension stack to work in my Python projects as in my WordPress projects, without per-project setup friction.**

Acceptance:
- [ ] Global extensions auto-apply in every workspace
- [ ] Per-project config files (phpstan.neon, eslint.config.js, ruff.toml, stylelint.config.js) ship as reusable templates

---

## 6. Functional Requirements

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| FR-001 | Install `charliermarsh.ruff` VSCode extension | Must | Fills Python live-feedback gap |
| FR-002 | Install `stylelint.vscode-stylelint` VSCode extension | Must | Fills CSS gap |
| FR-003 | Configure PHPStan with `phpstan.neon` at level 5-7 per WP project | Must | Unlocks real static analysis — biggest leverage gain |
| FR-004 | Decide primary PHP LSP — Intelephense vs DEVSENSE | Must | Don't run both. Pick one based on feature need. |
| FR-005 | Ship per-project config templates in `~/.claude/templates/` | Should | Reusable across projects: phpstan.neon, eslint.config.js, ruff.toml, stylelint.config.js, sonar-project.properties |
| FR-006 | Defer `dart-code.flutter` + `dart-code.dart-code` until ibadah-app work begins | Should | Avoid extension bloat until needed |
| FR-007 | Defer `supabase.supabase-vscode` until booking-system schema work begins | Should | Same rationale |
| FR-008 | Extend `/lint` command with Dart routing when ibadah-app begins | Should | One-line addition to the routing table |
| FR-009 | Reject Snyk extension | Must | Documented false-positive / alert-fatigue reputation |
| FR-010 | `/dev commit` chains `/diagnostics` as Step 0 via skill composition, then invokes `commit-commands:commit` | Must | Structural enforcement via skill runtime — not a hook. Skill runtime guarantees Step 0 runs per-invocation; no cross-session state, so nothing leaks between sessions (lesson from lifecycle-gate grading-pending loop). Triage rule applied: a hook is justified only when (a) the check must run regardless of which skill invoked the action AND (b) state is genuinely cross-session. Neither holds for pre-commit verification. |
| FR-010a | `/dev verify` chains `/diagnostics` as Step 0 via skill composition | Must | Same pattern — structural step, not hook |
| FR-010b | `/dev ship` chains `/diagnostics` as Step 0 via skill composition | Must | Same pattern |
| FR-010c | Three-step review ritual documented as fallback when `/dev` not used | Should | `/diagnostics` → `/systematic-debugging` (if bugs) → `/security-review` (high-stakes only). Prose-level only — primary enforcement is the skill-composition chain in FR-010/010a/010b |
| FR-011 | `/commit` plugin untouched (plugin-owned) | Done | Primary path is `/dev commit` which wraps it. If Bean calls `/commit` directly (bypassing `/dev`), no /diagnostics step fires — acceptable because user chose to bypass, not a failure of the architecture |
| FR-012 | Cross-reference SSB spec from this spec's phasing section | Must | Pillars 5-6 live in SSB subproject |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | `/diagnostics` returns in <2s from invocation (reads cached LSP state) |
| Token cost | Pillars 1-3 consume zero LLM tokens per review |
| Connectivity | Works fully offline after initial extension install |
| Portability | Identical UX on Git repos, non-Git folders, Remote-SSH VPS files |
| Language coverage | PHP, JS, TS, Python first-class; CSS, JSON, MD, YAML second-class; Dart deferred |
| Privacy | All analysis runs locally; no code uploaded to any service |
| Failure mode | Missing extension / missing CLI returns partial findings + "tool not available" warning — never silent success |
| ADHD | Two invocations total (`/diagnostics` read, `/lint` fix). No cron. No remember-to-run. |

---

## 8. Integrations

| Integration | Direction | What flows |
|---|---|---|
| VSCode Problems panel | Read via `mcp__ide__getDiagnostics` | All extension findings |
| SonarLint extension | Extension host → Problems panel | Semantic bugs, security hotspots, code smells |
| Semgrep extension | Extension host → Problems panel | OWASP + community rule matches |
| PHPStan extension | Extension host → Problems panel | PHP static analysis |
| Axe-linter extension | Extension host → Problems panel | WCAG violations |
| Ruff extension (to install) | Extension host → Problems panel | Python lint + format |
| Stylelint extension (to install) | Extension host → Problems panel | CSS errors |
| `/lint` command | On-demand CLI dispatch | Autofix across PHP/JS/TS/Python/CSS/JSON |
| `/diagnostics` command | Reads Problems panel | Aggregated verdict |
| SSB spec (Pillar 5) | This spec's outputs become SSB inputs | Findings to blub.db nightly |

---

## 9. Technical Constraints

- Must not depend on GitHub (hard constraint)
- Must not require paid SaaS
- Must work without Git
- Must use existing `/diagnostics` and `/lint` as entry points — no new invocation surface for Pillars 1-3
- No per-project install cost for extensions — only config files
- CLI tools (phpstan, eslint, ruff, semgrep, sonar-scanner) installed globally or via project `node_modules`/`vendor`

---

## 10. Acceptance Criteria

Pillars 1-3 are complete when:

- [ ] `charliermarsh.ruff` and `stylelint.vscode-stylelint` installed
- [ ] SonarLint + Semgrep + PHPStan + Axe-linter verified active (status bar + test file)
- [ ] DEVSENSE vs Intelephense decision made and the loser uninstalled
- [ ] `phpstan.neon` template exists at `~/.claude/templates/phpstan.neon` and applied in small-giants-wp
- [ ] `/diagnostics` on a known-bad PHP file returns PHPStan + SonarLint + Semgrep findings
- [ ] `/diagnostics` on a known-bad Python file returns Pylance + Ruff findings (post-install)
- [ ] `/diagnostics` on a known-bad CSS file returns Stylelint findings (post-install)
- [ ] Three-step review ritual (`/diagnostics` → `/systematic-debugging` → `/security-review`) documented in the session-start template
- [ ] Snyk is NOT installed
- [ ] SSB spec exists and is cross-referenced from this spec

Pillar 4 is deferred — explicit acceptance criterion: "Pillars 1-3 used for 1 full week of real SGS/Indus/booking-system work, and specific gaps recorded in `parking.md` that Semgrep CLI + metis + Opus synthesis would close."

---

## 11. Phasing

### Phase 1 — Install + Configure (this session or next, ~1 hour)

- Install ruff + stylelint extensions
- Decide DEVSENSE vs Intelephense, uninstall the loser
- Create `~/.claude/templates/` with phpstan.neon, eslint.config.js, ruff.toml, stylelint.config.js templates
- Apply phpstan.neon at small-giants-wp root
- Test `/diagnostics` on a known-bad file per language

### Phase 2 — Soak (1 week)

- Use the three-step ritual on real work across SGS, Indus, booking-system, scripts
- Record gaps + false-positives in `parking.md`
- Record extension-specific config tweaks in `decisions.md`

### Phase 3 — Pillar 4 Decision (after Phase 2)

- If gaps recorded justify the build → invoke `/brainstorming design` on `/code-review` shape
- If no gaps → close this spec; Pillar 4 permanently deferred

### Phase 4 — SSB Cross-Reference

- SSB Phase 5 picks up the automation flow spec (already written this session at `A:/.openclaw/.claude/subprojects/ssb/specs/2026-04-16-code-review-automation-and-learning.md`)
- No CC-side work in Phase 4 — pointer only

---

## 12. Open Questions

| Question | Owner | Due |
|---|---|---|
| Is SonarLint noisy on WordPress-specific idioms? | Bean | After 1 week soak |
| Does PHPStan at level 5 catch more than PHPCS at WordPress level? | Bean | After config + test |
| Should `/lint` dry-run mode exist (`--check-only` — report without fixing)? | Bean | Before Pillar 5 starts (that flow will need it) |

---

## 13. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-16 | Bean + Claude | Initial draft — 2-tier architecture with install list including Snyk |
| 2.0 | 2026-04-16 | Bean + Claude | Rewrote after holistic audit: 4-pillar CC-side architecture + SSB spec cross-reference; removed Snyk (false-positive rep); added PHPStan as must-configure; added ruff + stylelint install; documented 13-project stack coverage; cross-referenced SSB Phase 5/7 work |
| 2.1 | 2026-04-16 | Bean + Claude | Post gap-analysis (graded B 3.53). Revised FR-010 from prose-ritual to skill-composition enforcement: `/dev commit`, `/dev verify`, `/dev ship` chain `/diagnostics` as Step 0 via Skill tool. Replaces originally-recommended PostToolUse hook — skill composition gives structural enforcement without cross-session state (avoids lifecycle-gate-style leakage). Triage rule for hook-vs-skill documented in FR-010 notes. |
