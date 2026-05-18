---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-18-spec-17-complete
session_date: 2026-05-18
---

# Session Handoff — 2026-05-18

## Completed This Session

1. **Spec 17 Wave 2 (Tasks 1-8)** — FR-S4-3 SGS Site Info admin page; FR-S4-4 sgs/business-info refactored to read from central store + migration 0002 lifts legacy `wp_options`; FR-S4-5 personal-data sweep + CI linter; FR-S1-1/1-2/1-3 header.html + footer.html reduced to wp:pattern shells + framework-default patterns + 3 orphan variants; FR-S3-1 multi-pattern picker (6 header + 3 footer); FR-S7-1 BlockDeprecationsTest regression-guards 10 affected blocks.
2. **Wave 2.5 admin-class split** — extracted `Sgs_Site_Info_Admin_Notices` (502→440 main class).
3. **Wave 3 Round 1** — FR-S2-2 variation manifests; FR-S5-1 SGS top-level admin menu; FR-S7-3 existing-site safety guard.
4. **Wave 3 Round 2** — FR-S2-1 template-part seeder; FR-S3-2 conditional header rules + two-layer ReDoS guard; FR-S5-2 variation picker (Council N1 resolver-only).
5. **Wave 3 Round 3 small set** — FR-S2-3 reset button; FR-S3-3 footer rules; FR-S3-4 sgs_header + sgs_footer CPTs with REST capability gate.
6. **FR-S5-3 WP-CLI surface** — 12 commands under `wp sgs`, delegating to existing PHP helpers; 616-line file under lucide-icons-style exemption.
7. **4 parking items resolved** — header-rules split (Sgs_Header_Rules_ReDoS_Guard, 399→324+133), picker split (Sgs_Legacy_Theme_Mod_Migrator, 316→252+109), sanitize_key fix preserves slash, admin-class split.
8. **Polish 1b + 2 + QC fix bundle A1-A3** — back-to-top + reading-progress retired; validate_fields reordered before login; show_in_rest=false; ucfirst→i18n labels; form REST 4-file split.
9. **Two git-stash incidents recovered** — parallel Wave 3 subagents ran `git stash` to baseline-compare; failed pop wiped ~30 tracked files. Recovery via `git checkout stash@{0} -- <file>`. Lesson captured.
10. **Test debt cleared** — 27 failures → 0. Suite 1183/0/0. Build clean.

## Current State

- **Branch:** main at `a6aab7ac`
- **Tests:** 1183 pass, 0 fail, 0 errors (10 PHPUnit framework deprecation notices, framework-internal)
- **Build:** passes (webpack compiled cleanly)
- **Uncommitted changes:** none — pushed to main
- **Deploy status:** code on main; not yet deployed to palestine-lives.org / sandybrown

## Known Issues / Blockers

- **CLI file at 616 lines** carries documented lucide-icons-style exemption. Not blocking.
- **No live-site smoke test yet** for any Wave 3 feature. Suite green ≠ outcome until operator workflows verified on real WP install.
- **WP-CLI commands untested under real WP-CLI** — capability gates may need `--user=1`.

## Outcome vs Completion Assessment (Gate 3.5)

| Task | Verdict |
|------|---------|
| Spec 17 Wave 2 + 2.5 + 3 code shipped | **CODE SHIPPED, OUTCOME NOT YET HIT** — outcome = "operators can drive Spec 17 features on a live site". Code is on main + suite green; live verification + operator workflow + a11y audit pending. Next session continues until operator can complete onboarding on the live site. |
| 4 parking items resolved | OUTCOME ACHIEVED — files split, slash preservation verified by round-trip test |
| Test debt cleared | OUTCOME ACHIEVED — 27 → 0 failures, suite green |
| Polish 1b retirement | OUTCOME ACHIEVED — blocks deleted, admin notice wired, operators see deprecation guidance |
| git-stash recovery | OUTCOME ACHIEVED — lesson captured, future subagent safety clauses will list `git stash` explicitly |

## Next Priorities (in order)

1. **Production deploy + golden-path smoke test** — tar + scp + OPcache reset; walk the operator path on the live admin
2. **WP-CLI live verification** — SSH + run all 12 `wp sgs` commands
3. **Visual + a11y audit** on all new admin pages (Lighthouse + axe-core via Playwright)
4. **Operator onboarding doc** — 1-page guide for non-coder client setup
5. **Telegram demo** — 90-second screen-walkthrough for stakeholder buy-in

## Files Modified

Comprehensive — 85 files changed (+10,771 / -1,574) in commit `a6aab7ac`. Categories:

| Area | Files |
|------|-------|
| Plugin bootstrap + classes | `sgs-blocks.php` + 16 new `class-sgs-*.php` |
| Forms refactor | `class-form-rest-{api,submission,upload,admin}.php` |
| business-info block | `render.php`, `index.js`, `edit.js`, `deprecated.js` |
| Retired blocks | `src/blocks/{back-to-top,reading-progress}/*` (deleted) |
| Tests | 14 new test files + updates to FormSubmissionTest, VariationPickerTest, TemplatePartSeederTest |
| Theme parts | `parts/header.html` + `footer.html` + 3 orphan header variants |
| Theme patterns | 9 framework patterns + 4 personal-data-cleared client patterns |
| Variation manifests | 3 client JSONs with new `settings.custom.sgs.*` keys |
| Scripts | `scripts/lint-patterns-for-personal-data.py` + test |
| Docs | `CLAUDE.md`, `.claude/parking.md`, `.claude/state.md` |

## Notes for Next Session

- **git stash in subagent prompts is forbidden** — see `feedback_no_git_stash_in_subagents.md`. Every safety clause MUST list `git stash` alongside `git reset` / `git restore` / `git checkout --` / `git clean`. Subagents fall back to stash under WPCS pressure ("let me baseline-compare to verify").
- **CLI 616-line exemption** documented inline at top of `class-sgs-cli-commands.php` — mirrors lucide-icons.php pattern. Single-responsibility WP-CLI surface; spec dictates 12 commands. Don't relitigate.
- **Site Info `set_internal()` is the trusted-caller write path** — migrations, WP-CLI commands, cron jobs MUST use `set_internal()` not `set()`. Admin handlers use `set()` so the capability gate fires.
- **Council N1 (resolver-only post_id lookup)** asserted by a malicious-POST test in `VariationPickerTest`. Never reintroduce reading `$_POST['post_id']` in variation activation.
- **CLI command capability gate** — `wp sgs site-info set` and write commands require `--user=1` (WP-CLI defaults to no logged-in user).

## Next Session Prompt

~~~
You are a senior SGS Framework engineer + WordPress operations specialist. This session's job is to take the Spec 17 code that landed on `main` last session (Wave 2 + 2.5 + 3, 16 FRs, suite 1183/0/0) and validate it works on a real WP install — operator workflows, WP-CLI commands, admin pages, conditional rules. Then write the operator-facing onboarding doc.

Read `.claude/handoff.md` and `CLAUDE.md` for full context, then work through these priorities:

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
~~~
