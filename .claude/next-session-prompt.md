---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-19-spec-17-live-verification
generated: 2026-05-18
prior_session: small-giants-wp-2026-05-18-spec-17-complete
---

You are a senior SGS Framework engineer + WordPress operations specialist. Spec 17 (Wave 2 + 2.5 + 3, 16 FRs) landed on `main` at commit `a6aab7ac` last session. Suite 1183/0/0. Build clean. This session's job: validate the work on a real WP install — operator workflows, WP-CLI commands, admin pages, conditional rules — then write the operator-facing onboarding doc.

Read `.claude/handoff.md` and `CLAUDE.md` for full context, then work through these priorities.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural / strategy decisions if any blocker surfaces |
| `/gap-analysis` | Grade smoke-test outputs + onboarding doc before delivery |
| `/lifecycle` | Any skill/agent/pipeline edits this session |
| `/research` | If WP 6.9 admin API or Spec 17 feature semantics need verification |
| `/strategic-plan` | Plan deploy sequence + rollback path before touching production |
| `/sgs-wp-engine` | All SGS framework operations |
| `/deploy-check` | Pre-deploy checklist for tar + scp + OPcache reset |
| `/wp-wpcli-and-ops` | WP-CLI command live verification |
| `/visual-qa` | Lighthouse + a11y audit on new admin pages |
| `/qc-inline` | Self-check before any commit |
| `/qc` | Multi-rater panel before production cutover decision |
| `/delegate` | Pick model per subagent dispatch |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `mcp-wordpress` | Live REST verification (admin pages, block registration, pattern registry, CPT REST 403 for subscribers) |
| `playwright` | Multi-viewport screenshots of new admin pages + variation-activation E2E |
| `chrome-devtools-mcp` | Inspect Network panel during variation save → confirm `save_post_wp_global_styles` fires |
| `mcp__a11y__audit_webpage` | Accessibility audit on Site Info admin + Header Rules admin |
| `python ~/.claude/hooks/context7.py` (`/library-docs`) | WP-CLI capability conventions, `WP_Theme_JSON_Resolver` if drift surfaces |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Live-site verification + any deploy-side fix |
| `design-reviewer` | Visual QA of admin pages |
| `performance-auditor` | Lighthouse on new admin surfaces |
| General-purpose Sonnet | Mechanical sweeps (rendering verification, doc-writing) |

## Research Approach (only if blocker surfaces)

1. `/research-check` — quick lookup on the specific WP API
2. Cross-reference with `/library-docs` for exact WP 6.9 signature
3. If genuinely undocumented, escalate to `/research-buddies`

---

## Task 1 — Production deploy + golden-path smoke test

**What:** Build + deploy plugin to palestine-lives.org via tar/scp. Reset OPcache. Walk operator path: *Appearance → SGS Site Info* → fill 3 fields → save → reload → verify persist → visit page with `sgs/business-info` → verify rendered values match store.
**Why:** Code on main ≠ outcome until operators can use it.
**Estimated time:** ~25 min

**Orchestration:**
- Execution: inline (main thread on Opus) — destructive surface, supervised
- Depends on: none; Parallel with: none
- /qc gate after: `/qc-inline` confirming smoke test green

**Acceptance:** Live admin URL loads for `edit_theme_options` users; form save round-trips; `sgs/business-info` block renders stored values; deprecated-blocks admin notice appears.

## Task 2 — WP-CLI command surface live-verify

**What:** SSH to host. Run every `wp sgs` command per FR-S5-3 spec table + capture output.
**Why:** FR-S5-3 unit-tested in isolation; capability edge cases surface only on real CLI.
**Estimated time:** ~15 min

**Orchestration:**
- Execution: delegated (single Sonnet subagent)
- Model: sonnet via /delegate
- Brief: "SSH `hd` host, cd to WP root, run every `wp sgs *` command per FR-S5-3 spec, capture stdout + exit codes per command. Report any errors. Save full transcript to `.claude/reports/wp-cli-live-verify-2026-05-19.md`."
- Context: SSH command `ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73`, WP root, 12 commands list from FR-S5-3
- Depends on: Task 1; Parallel with: Task 3
- /qc gate after: `/qc-inline` on transcript

**Acceptance:** All 12 commands exit 0 OR fail with intentional capability error; transcript documents each.

## Task 3 — Visual + a11y audit on new admin pages

**What:** Playwright screenshot each new admin page at 1440 + 768 + 375. Run axe-core on Site Info, Header Rules, Footer Rules, Style Variations, Reset Template Parts, Advanced Headers/Footers list views.
**Why:** Admin pages are operator-facing daily — a11y issues block real client adoption.
**Estimated time:** ~20 min

**Orchestration:**
- Execution: delegated (single Sonnet subagent)
- Brief: "Use Playwright + a11y MCP. Screenshot each admin page at 3 breakpoints. Run axe-core. Report critical/serious WCAG issues. Save to `.claude/reports/wave-3-admin-a11y-2026-05-19/`."
- Depends on: Task 1; Parallel with: Task 2
- /qc gate after: `/qc-inline` if critical issues; otherwise commit screenshots

**Acceptance:** Zero critical + serious WCAG violations OR documented exemptions; screenshots cover all 7 admin pages × 3 breakpoints.

## Task 4 — Spec 17 operator onboarding doc

**What:** 1-page operator-facing guide at `.claude/specs/18-spec17-operator-onboarding.md`. Plain English, sequential, screenshots from Task 3.
**Why:** Framework useless if operators can't drive it. Doc IS the operator UX layer.
**Estimated time:** ~30 min

**Orchestration:**
- Execution: delegated (single Sonnet subagent)
- Brief: "Write 1-page operator guide. Cover: activate variation → Site Info admin → header/footer rules picker → custom rules → CPT advanced headers (when needed). Use Task 3 screenshots. UK English, plain language, no jargon."
- Context: Task 3's screenshot set + handoff's FR list
- Depends on: Task 3; Parallel with: none
- /qc gate after: `/qc-inline` for clarity

**Acceptance:** Bean can hand the doc to a non-coder + they complete end-to-end client onboarding without further help.

## Dependency graph

```
Task 1 (deploy + smoke — inline, Opus)
  ↓ /qc-inline gate
Task 2 (WP-CLI verify — Sonnet) ‖ Task 3 (visual + a11y — Sonnet)
  ↓ both complete
Task 4 (onboarding doc — Sonnet, needs Task 3 screenshots)
  ↓ /qc-inline gate
Final /qc multi-rater (cross-task verification)
  ↓
Commit + handoff
```

## Methodology guardrails (do not skip)

- **Deploy before measure** — confirm `git rev-parse HEAD` on host matches local before any visual/a11y/parity test
- **Root cause before instance fix** — failed smoke test → ask "what class of failure?" before patching symptom
- **Outcome vs completion** — Task 1 not done because deploy succeeded; done when operator completes golden path on live site
- **/qc multi-rater BEFORE every commit** touching converter/pipeline/SGS-block logic (blub.db row 255)
- **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, never full-page (blub.db row 256)
- **NO `git stash` in subagent safety clauses** — explicitly forbid alongside reset/restore/checkout/clean. See `feedback_no_git_stash_in_subagents.md`. Two stash incidents last session wiped ~30 tracked files
- **`--converter-v2`** required on any orchestrator runs (not expected this session)
- **WP_DEBUG_DISPLAY=false** on staging — verify before any visual test
- **Plain English first** — every major update opens with one-sentence plain-English statement before technical detail
- **NO Co-Authored-By footer** in commits (global rule)
