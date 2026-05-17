---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-20-spec-17-wave-2
generated: 2026-05-19
spec: .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md
prior_session: small-giants-wp-2026-05-19-spec-17-wave-1
---

# Spec 17 Wave 2 implementation — admin page + business-info refactor + framework defaults

You are a senior SGS Framework engineer with deep WordPress block + Gutenberg expertise. Yesterday's session shipped Spec 17 v2 (council-passed) and Wave 1 foundation (Site Info store, block binding source, migrations framework, post meta with auth_callback, slug conventions, two-axis style variations). Wave 2 layers the operator-visible features on top: the SGS Site Info admin page, the refactored `sgs/business-info` block that reads from the global store, framework-default patterns that operators see on fresh installs, and block deprecations to silence "Invalid block" warnings on existing sites.

## State recap (plain English)

Yesterday we built the plumbing. None of it is yet visible to a site owner. The Site Info store exists at `wp_options['sgs_site_info']` with an 11-method PHP API, but no admin page surfaces it. The block binding source `sgs/site-info` registers correctly, but no patterns reference it yet. The migration framework boots, but only the baseline migration is wired. The two-axis style variations are on disk in `theme/sgs-theme/styles/colours/` and `theme/sgs-theme/styles/typography/`, but no operator can mix them until WP 6.5+ discovers them at next admin load (which it should, automatically). Today's job: make Wave 1 visible to operators, refactor `sgs/business-info` so it reads from the store (with a one-shot migration lifting per-instance attribute data into the store), replace the framework-default `parts/header.html` and `parts/footer.html` with single `wp:pattern` references that activate the Site Editor "Replace" picker, and add block deprecations so existing sites stop showing "Invalid block" warnings in the editor.

Wave 1 left one foundation gap: PHP test files at `plugins/sgs-blocks/scripts/tests/` use PHPUnit but the existing bootstrap lives at `plugins/sgs-blocks/tests/php/`. Tests cannot run as-is. That's Task 0 — it gates everything else.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural decisions inside FRs (e.g. "where exactly does the logo deep-link go in the Site Editor URL?") |
| `/gap-analysis` | Grade Wave 2 deliveries before merge |
| `/lifecycle` | Any skill/agent/pipeline changes (unlikely this session) |
| `/research` | If WP 6.9 admin API behaviour needs verification |
| `/strategic-plan` | Already done for the whole spec; not needed unless scope changes |
| `/library-docs` | Settings API conventions, block deprecations, wp_template_part REST writes |
| `/sgs-wp-engine` | All SGS framework work |
| `/wp-plugin-development` | Admin page (Settings API) + block deprecation work |
| `/wp-block-development` | FR-S4-4 sgs/business-info refactor; FR-S7-1 deprecation entries |
| `/wp-rest-api` | If admin form chooses REST + nonce over admin-post.php |
| `/wp-wpcli-and-ops` | Wave 3 prep — confirm CLI command structure |
| `/qc` | Multi-rater panel before every commit touching converter/pipeline/block logic |
| `/qc-inline` | Self-check before each merge |
| `/delegate` | Pick model per subagent dispatch |
| `/dispatching-parallel-agents` | Wave 2 is parallel-dispatch-shaped |
| `/subagent-driven-development` | Coordinate subagent outputs |
| `/verification-before-completion` | Standard gate per subagent |
| `/diagnostics` | Catch type errors before merge |
| `/lint` | After every PHP edit |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `mcp-wordpress` REST | Verify block registration + template-part listings on sandybrown |
| `playwright` | Multi-viewport screenshots + admin page E2E walkthrough |
| `chrome-devtools-mcp` | Inspect admin page DOM if Playwright misses something |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | Block schema + style variation queries |
| `python ~/.claude/hooks/context7.py` (or `/library-docs`) | WP 6.9 docs: Settings API, block bindings, register_block_pattern, register_post_meta |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | If WP-specific judgement needed on admin page or block deprecation |
| General-purpose Sonnet subagent | Wave 2 implementation FRs (per-task; parallel) |
| General-purpose Haiku subagent | Mechanical sweeps (FR-S4-5 personal-data sweep + linter) |

---

## Task 0 — Resolve P-S17-TESTS-BOOTSTRAP (gates everything)

**What:** Move new PHP test files from `plugins/sgs-blocks/scripts/tests/` into `plugins/sgs-blocks/tests/php/` so they inherit the existing PHPUnit bootstrap. Python tests stay where they are.

**Why:** Wave 1's PHP test files (test_site_info.php, test_site_info_binding.php) cannot run as-is because PHPUnit's TestCase isn't on the autoload path. Without this fix, no Wave 2 test can run either — every FR's 4-layer test strategy stays on paper.

**Estimated time:** ~10 min

**Orchestration:**
- Execution: inline (main thread on Opus)
- Reason: trivial file move + path update; not worth subagent overhead
- Depends on: none
- Parallel with: none — gates the rest
- /qc gate after: `/qc-inline` (smoke: run `phpunit` against the moved files; all green)

**Acceptance:** `cd plugins/sgs-blocks && vendor/bin/phpunit tests/php/test_site_info.php` returns 10/10 pass; same for `test_site_info_binding.php` (22/22).

---

## Task 1 — FR-S4-3 SGS Site Info admin page

**What:** Settings API admin page at *Appearance → SGS Site Info*. Sections: Identity (logo deep-link to Site Editor — NO new uploader), Contact, Socials, Opening Hours, Copyright, Custom Fields. Server-side `[a-z0-9_]+` allowlist on Custom Fields keys + reserved-key denylist.

**Why:** Unblocks every operator-visible feature. Without the admin page, the Site Info store is unreachable by non-developers.

**Estimated time:** ~45 min

**Orchestration:**
- Execution: delegated (single subagent)
- Model: opus via /delegate (admin UX is high-touch + Council M5 server-side validation gate is security-sensitive)
- Dispatch pattern: single-agent
- Brief: "Implement Spec 17 FR-S4-3. New PHP class at `plugins/sgs-blocks/includes/class-sgs-site-info-admin.php` registers an admin page under Appearance → SGS Site Info via Settings API. Reads/writes through `Sgs_Site_Info::get_*` / `::set` helpers. Logo section has NO uploader — instead deep-links to Site Editor Site Logo block. Custom Fields enforce `preg_match('/^[a-z0-9_]+$/', $key)` server-side + reserved-key denylist. PHPUnit tests cover capability gating + reserved-key block + invalid-key rejection."
- Context the subagent needs: `Sgs_Site_Info` public API (Wave 1B); WP Settings API conventions (`add_settings_section`, `add_settings_field`, `register_setting`); deep-link URL for Site Editor Site Logo block (research via /library-docs)
- Depends on: Task 0
- Parallel with: Tasks 2, 3, 4, 5, 6, 7
- /qc gate after: `/qc-inline` + multi-rater /qc (admin UX surface; security-sensitive)

**Acceptance:** Page loads at `admin.php?page=sgs-site-info` for `edit_theme_options` users only. Form save round-trips via `Sgs_Site_Info::set`. Direct POST with `<script>` key returns 400. Direct POST with `sgs_framework_version` key returns 400. Playwright: fill form → save → reload → values persist.

---

## Task 2 — FR-S4-4 Refactor `sgs/business-info` block to read from Site Info store

**What:** Refactor `plugins/sgs-blocks/src/blocks/business-info/render.php` to read data fields from `Sgs_Site_Info::get_esc_html` / `_esc_url`. Block attribute schema retains `type` + presentation options; loses data fields. Add deprecation entry. One-shot migration (in `migrations/0002-spec-17-foundation.php`) lifts attribute data into the store.

**Why:** Eliminates per-instance hardcoded business data. One source of truth across every block on every page.

**Estimated time:** ~40 min

**Orchestration:**
- Execution: delegated (single subagent)
- Model: opus via /delegate (block deprecation + migration is fragile; one-shot per-site cannot be re-run)
- Dispatch pattern: single-agent
- Brief: "Implement Spec 17 FR-S4-4. Refactor `plugins/sgs-blocks/src/blocks/business-info/render.php` to read from `Sgs_Site_Info::get_esc_html($attrs['type'])` (or `_esc_url` for URL types). Remove per-instance data attributes; keep `type` + presentation. Add deprecation entry covering pre-refactor shape. Populate `plugins/sgs-blocks/includes/migrations/0002-spec-17-foundation.php` with idempotent migration that scans posts for `sgs/business-info` block instances, extracts attribute data, writes into Site Info store (using same sanitisers as admin form), then marks migration completed in `sgs_migrations_completed`."
- Context the subagent needs: current business-info `render.php` + `block.json` schema; `Sgs_Site_Info::set` capability requirements (CLI run may need `--user=1`); migration runner registered in Wave 1D
- Depends on: Task 0
- Parallel with: Tasks 1, 3, 4, 5, 6, 7
- /qc gate after: `/qc-inline` + multi-rater /qc (block deprecation + destructive migration)

**Acceptance:** Existing site's `sgs/business-info` blocks render correctly post-refactor (manual Playwright check on sandybrown clone). Migration runs once, sets `sgs_migrations_completed` entry, re-run is no-op. Block deprecation prevents "Invalid block" warning on existing post content.

---

## Task 3 — FR-S4-5 Pattern personal-data sweep + CI linter

**What:** Grep all `theme/sgs-theme/patterns/*.php` for hardcoded personal data (emails, addresses, phone numbers, specific names/URLs). Replace with block bindings. New `scripts/lint-patterns-for-personal-data.py` runs in CI.

**Why:** Closes Council M-correction #4 (client data leak risk). Patterns become reusable across clients.

**Estimated time:** ~25 min

**Orchestration:**
- Execution: delegated (single subagent)
- Model: haiku via /delegate (mechanical sweep + grep-style linter — no novel design)
- Dispatch pattern: single-agent
- Brief: "Implement Spec 17 FR-S4-5. Audit `theme/sgs-theme/patterns/*.php` for personal-data hits. Replace each with `sgs/site-info` block binding. Create `scripts/lint-patterns-for-personal-data.py` that scans pattern files for hits and fails CI on violation. Smoke-test fixtures included."
- Context the subagent needs: list of personal-data patterns (emails like `Zainab@mamasmunches.com`, addresses like "Birmingham", URLs like `facebook.com/<account>`); the `sgs/site-info` binding API surface
- Depends on: Task 0
- Parallel with: all other Wave 2 tasks
- /qc gate after: `/qc-inline` (mechanical change, lower risk)

**Acceptance:** Grep across `patterns/` for emails/phones/specific-strings returns zero hits. Linter fails on fixture with hardcoded data; passes on cleaned patterns.

---

## Task 4 — FR-S1-1 Pattern-delegation for `header.html`

**What:** Reduce `theme/sgs-theme/parts/header.html` to ≤3 lines (skip-to-main + `wp:pattern` reference). Create `theme/sgs-theme/patterns/framework-header-default.php` containing the current minimal SGS header markup with renamed BEM classes + Site-Info bindings already wired. Pattern declares `Description:`, `Keywords:`, `Viewport Width:` headers.

**Why:** Activates the Site Editor "Replace" toolbar quick-swap (FR-S3-1 needs ≥2 patterns per area).

**Estimated time:** ~20 min

**Orchestration:**
- Execution: delegated (single subagent)
- Model: sonnet via /delegate (pattern authoring + WP header conventions)
- Dispatch pattern: single-agent
- Brief: "Implement Spec 17 FR-S1-1. Strip `parts/header.html` to a single `wp:pattern` reference. Write the real markup into `patterns/framework-header-default.php` with full pattern headers (Title, Slug, Block Types, Categories, Keywords, Viewport Width, Description, Inserter). Use renamed BEM classes (sgs-link-list__* from commit 0c1edbd3) + Site Info block bindings."
- Context the subagent needs: existing `parts/header.html` content; FR-S1-1 acceptance criteria; pattern header format
- Depends on: Task 0
- Parallel with: all other Wave 2 tasks
- /qc gate after: `/qc-inline` (Playwright pixel-diff < 1% on fresh install)

**Acceptance:** `wc -l parts/header.html` ≤ 3. Pattern registered (assert via `WP_Block_Patterns_Registry`). Site Editor "Replace" picker shows it with label + preview.

---

## Task 5 — FR-S1-2 Pattern-delegation for `footer.html`

**What:** Same as Task 4 for footer. `parts/footer.html` ≤3 lines. New `patterns/framework-footer-default.php` with no hardcoded client strings, Site-Info bindings for all data fields.

**Estimated time:** ~25 min

**Orchestration:**
- Execution: delegated (single subagent)
- Model: sonnet via /delegate
- Dispatch pattern: single-agent
- Brief: "Implement Spec 17 FR-S1-2. Mirror Task 4 for footer. Zero hardcoded client strings — `grep -E '(Zainab|Birmingham|mamasmunches)' patterns/framework-footer-default.php` returns nothing. Empty Site Info store renders friendly hints (Wave 1C provides). Default 3-column footer structure."
- Context: same as Task 4
- Depends on: Task 0
- Parallel with: all other Wave 2 tasks
- /qc gate after: `/qc-inline`

**Acceptance:** `wc -l parts/footer.html` ≤ 3. Static-string grep zero hits. Pattern in "Replace" picker.

---

## Task 6 — FR-S1-3 Resolve orphan `header-sticky` / `-transparent` / `-shrink` registrations

**What:** Create `parts/header-sticky.html`, `parts/header-transparent.html`, `parts/header-shrink.html` as pattern references; create matching pattern files. v1 pattern bodies can defer to `sgs/framework-header-default` content with a `TODO(v1.1)` comment.

**Why:** `theme.json` registers these but no files exist — empty renders. Unblocks the "Replace" picker showing 4 header options.

**Estimated time:** ~15 min

**Orchestration:**
- Execution: delegated (single subagent — same subagent as Task 4, since the work is adjacent)
- Model: sonnet via /delegate
- Dispatch pattern: single-agent
- Brief: "Implement Spec 17 FR-S1-3. Create 3 new template-part files + 3 matching patterns referencing the framework default. Pattern headers required."
- Depends on: Task 4 (so the default exists)
- Parallel with: Tasks 1, 2, 3, 5, 7
- /qc gate after: `/qc-inline`

**Acceptance:** `ls parts/header*.html` returns 4 files. Site Editor "Replace" picker shows 4 framework headers.

---

## Task 7 — FR-S3-1 Multiple header + footer patterns per area (with labels + thumbnails)

**What:** Register ≥3 patterns per area: `sgs/framework-header-{default,minimal,centred}` + footer counterparts. Each declares full pattern metadata + preview-viable Viewport Width.

**Why:** Native "Replace" toolbar quick-swap activates only when ≥2 patterns share `blockTypes` for the same area. Council M9 says picker also needs labels + thumbnails for non-coder UX.

**Estimated time:** ~30 min

**Orchestration:**
- Execution: delegated (single subagent)
- Model: sonnet via /delegate
- Dispatch pattern: single-agent
- Brief: "Implement Spec 17 FR-S3-1. Register the existing minimal/centred header + footer patterns (refactor existing files from `header-minimal.php`, `header-centred.php`, `footer-compact.php`, `footer-informational.php`) with `Block Types: core/template-part/header` (or footer), `Description:`, `Keywords:`, `Viewport Width:`. Patterns must work on empty Site Info store (use Wave 1C bindings)."
- Context: existing pattern files; FR-S1-1 framework-default pattern shape (from Task 4)
- Depends on: Task 4 (pattern conventions established)
- Parallel with: Tasks 1, 2, 3, 5, 6
- /qc gate after: `/qc-inline`

**Acceptance:** Registry returns ≥3 patterns per area. Playwright opens "Replace" picker — shows ≥3 framework + N client patterns with labels.

---

## Task 8 — FR-S7-1 Block deprecations + validation recovery

**What:** Audit dynamic SGS blocks whose attribute schema has changed in the last 30 days. Add `deprecated.js` entries with previous `save()` output + optional `migrate()` for attribute backfill.

**Why:** Silences "Invalid block" warnings on existing sites. Council M7 + the existing parking entry P-FOOTER-WRAPPER-CLASS-MISSING note this as a recurring operator-pain.

**Estimated time:** ~35 min

**Orchestration:**
- Execution: delegated (single subagent)
- Model: opus via /delegate (block deprecation is fragile — wrong shape can permanently break existing content)
- Dispatch pattern: single-agent
- Brief: "Implement Spec 17 FR-S7-1. `git log --since='30 days ago' -- plugins/sgs-blocks/src/blocks/*/block.json` to find candidates. For each block with attribute schema change, add a `deprecated.js` entry matching the previous shape's `save()` output. Optional `migrate()` for backfill. Add canonical procedure to CLAUDE.md (one-paragraph)."
- Context: WP block-deprecation API docs (use /library-docs); current state of each affected block
- Depends on: Task 0
- Parallel with: all other Wave 2 tasks
- /qc gate after: `/qc-inline` + multi-rater /qc (deprecation correctness is critical)

**Acceptance:** Open the Site Editor on a sandybrown clone; navigate to template parts containing the affected blocks; zero "Invalid block" warnings.

---

## Dependency graph

```
Task 0 (inline, Opus — gates all)
  ↓
Task 1 (Opus subagent — admin page)        ┐
Task 2 (Opus subagent — business-info)     │
Task 3 (Haiku subagent — sweep + linter)   │  all parallel post-Task-0
Task 4 (Sonnet subagent — header default)  │
Task 5 (Sonnet subagent — footer default)  │
Task 8 (Opus subagent — deprecations)      ┘
  ↓ Task 4 lands
Task 6 (Sonnet subagent — orphan headers) — depends on Task 4
Task 7 (Sonnet subagent — multi-pattern picker) — depends on Task 4
  ↓ all 9 tasks complete
/qc multi-rater panel on each commit
  ↓
Commit + merge to main (Gate 2 auto-merge)
```

## Methodology guardrails (do not skip)

- **Deploy before measure** — any visual / pixel-diff verification on sandybrown requires `npm run build` + tar deploy + OPcache reset before testing.
- **Root cause before instance fix** — Wave 2 is structural; resist fixing per-section symptoms before the structural FR lands.
- **Outcome vs completion** — code shipped ≠ outcome achieved. Outcome for Wave 2: site owners can set business data once at *Appearance → SGS Site Info*, and it renders correctly across every page. Test it as a non-coder.
- **/qc multi-rater BEFORE every commit** touching converter / pipeline / SGS block logic (blub.db row 255).
- **Per-section cropped pixel-diff** via `scripts/pixel-diff.py --selector .sgs-{section}`, NOT full-page (blub.db row 256).
- **`--converter-v2` required** on any orchestrator runs this session (captured 2026-05-18).
- **WP_DEBUG_DISPLAY must stay false** on sandybrown (captured 2026-05-18).
- **Plain English first** — every major update starts with one-sentence plain-English statement before technical detail (captured 2026-05-18 communication-standards HARD RULE).
- **NO Co-Authored-By footer** in commits (global rule).
- **Test bootstrap first** — Task 0 gates every other test result. If tests don't run, no Wave 2 FR is verifiable.
