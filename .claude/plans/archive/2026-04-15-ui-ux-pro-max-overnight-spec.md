# Technical Brief — ui-ux-pro-max Upgrade

**Date:** 2026-04-14
**Prepared by:** Bean + Opus 4.6 (this session)
**For:** Fresh session running overnight autonomously
**Valid until:** Consumed or superseded

## Overview

Upgrade `ui-ux-pro-max` from a B-grade prose-heavy reference into the design intelligence tool 25+ consumer skills actually query at runtime. Close 32 gaps. Expand the CSV database 3x via parallel model delegation. Decide architecture (MCP vs bundled) autonomously. Ship migration by morning.

## Context

| Fact | Value |
|------|-------|
| Target skill directory | `C:/Users/Bean/.agents/skills/ui-ux-pro-max/` |
| Current grade | B (3.80/5) via gap-analysis; A- (91%) via skillscore |
| Database | 14 CSV files, 6,461 rows total |
| CLI entry point | `python ~/.agents/skills/ui-ux-pro-max/scripts/search.py` |
| Current CC consumers | `innovative-design`, `interactive-brief`, `skill-auditor` (3 — not 25 as described) |
| Current OC consumers | **ZERO** (verified by grep across `A:/.openclaw/workspace/`) |
| Broken-symlinks fix applied | 2026-04-14 — cloned from `nextlevelbuilder/ui-ux-pro-max-skill` |
| Agent budget approved | Gemini Pro (paid), Gemini Flash (free), Cerebras (free), SearXNG via `search.py` (free) |

## Deliverables

| # | Deliverable | Description | Acceptance test |
|---|-------------|-------------|-----------------|
| 1 | CSV injection patch | `search.py` rejects formula-prefixed cell values | `echo "=CMD\|'/C calc'!A0" \| python search.py -` returns error, not execution |
| 2 | Clean `draft.csv` audit | Removed or anonymised; header PII checked | File no longer in `data/` OR has `# anonymised` marker |
| 3 | All 11 hardcoded paths fixed | `grep "python3 skills/ui-ux-pro-max"` returns 0 in SKILL.md | Command returns no matches |
| 4 | Error handling on 11 bash blocks | Each has `2>/dev/null \|\| echo "ERROR: ..."` | grep count matches block count |
| 5 | `requirements.txt` added | Explicit Python deps listed | File exists at `scripts/requirements.txt` |
| 6 | Architecture decision logged | MCP vs bundled chosen with confidence ≥ 75% OR decision-pending with Telegram ping | Decision artifact at `.claude/plans/ui-ux-pro-max-architecture-decision.md` |
| 7 | Integration Contract section | Pre-query / post-query pattern documented in SKILL.md | Section exists, section name visible in grep |
| 8 | Data Dictionary | Column schemas for all 14 CSVs documented | File at `references/data-dictionary.md` |
| 9 | 6-8 consumer skills wired | Priority list: `colourise`, `polish`, `bolder`, `design-review`, `visual-qa`, `sgs-wp-engine`, `normalize`, `clarify` | Each skill's SKILL.md contains `search.py --domain` in a process step |
| 10 | `--json` + `--limit` documented | Worked example + default of 10, max 50 | `scripts/search.py --help` shows flags; SKILL.md has example |
| 11 | DB expansion 3x | Palettes 161→500, styles 85→250, curated fonts +1,000 with provenance | `wc -l data/colors.csv` ≥ 500; `wc -l data/styles.csv` ≥ 250 |
| 12 | Provenance column + `update-db.py` | Every CSV has `provenance` column; script validates | `head -1 data/*.csv \| grep provenance` shows all; `python scripts/update-db.py --validate` exits 0 |
| 13 | Migration complete (if MCP) OR SQLite (if bundled) | Single source of truth, query performance >10x faster | Benchmark query returns in <100ms |
| 14 | Morning report | `~/.claude/lifecycle-reports/2026-04-15-night.md` with before/after scores | File exists with all required sections |

## Technical requirements

**Stack:** Python 3.13, SQLite (if migration path), Bash (for session plumbing), PowerShell (for CSV → SQLite if chosen), Gemini CLI, Cerebras agent CLI, FastMCP (if MCP path).

**Must work on:** Windows 11 (Bean's primary). Git Bash is default shell.

**Constraints:**
- Zero breaking changes to current CLI consumers (`innovative-design` Phase 1/3 still works)
- Must stay within ~8 hour overnight window
- No user interaction — autonomous
- Revenue-critical (SGS client builds depend on this)
- Respect `>75%` confidence rule for architecture decision

## Per-unit implementation detail

### Unit 1 — CSV injection patch

**What:** Neutralise formula-prefixed cell values (`=`, `+`, `-`, `@`) during CSV read. Prepend `'` rather than rejecting outright — preserves legitimate values like `-10px`.

**Files:** `scripts/core.py` (primary CSV reader). `scripts/search.py` passes through.

**Implementation:**
```python
# In core.py — add this sanitiser, call it on every cell read:
def sanitise_cell(value: str) -> str:
    if not value:
        return value
    if value[0] in ('=', '+', '-', '@'):
        # Prepend single quote so Excel treats as text, not formula
        return "'" + value
    return value
```

**Gotcha:** Some legitimate cells may start with `-` (e.g., `-10px` in a CSS example). Don't blanket-reject — prepend `'` instead, preserving meaning.

**Acceptance test:**
```bash
# Manual test with malicious input
echo '"name","color"
"=CMD|calc","#FFF"' > /tmp/attack.csv
python scripts/core.py --test-load /tmp/attack.csv  # should load as text, not execute
```

**Failure handling:** If sanitisation breaks a legitimate query, log to `~/.claude/lifecycle-reports/2026-04-15-night.md` as a blocker and proceed. Security fix can't be backed out.

**Tooling:** main-thread (needs careful review — security). `/systematic-debugging` if the patch breaks queries.

---

### Unit 2 — `draft.csv` audit + archive

**What:** Inspect 1,778-row `draft.csv`. Header says (Chinese) "not read by CLI — backup/reference only." Confirm no PII, then archive or delete.

**Files:** `data/draft.csv`.

**Implementation:**
1. `head -20 data/draft.csv` — check column headers for PII fields (email, name, phone, address)
2. If PII present: move to `data/archive/draft-YYYY-MM-DD.csv` (not in git) + log entry
3. If no PII: delete outright (CLI doesn't read it anyway)

**Gotcha:** Chinese header may contain terms you don't recognise. If in doubt, archive rather than delete.

**Acceptance test:** `ls data/draft.csv` returns "no such file" after this unit.

**Failure handling:** If audit turns up PII, flag in morning report with exact row ranges. Never expose PII in logs.

**Tooling:** main-thread. `/security-standards` skill for PII-detection heuristics.

---

### Unit 3 — Fix 11 hardcoded paths

**What:** Replace every `python3 skills/ui-ux-pro-max/scripts/search.py` with `python ~/.agents/skills/ui-ux-pro-max/scripts/search.py` in SKILL.md.

**Files:** `C:/Users/Bean/.agents/skills/ui-ux-pro-max/SKILL.md` only.

**Implementation:**
```bash
sed -i 's|python3 skills/ui-ux-pro-max/scripts/search.py|python ~/.agents/skills/ui-ux-pro-max/scripts/search.py|g' SKILL.md
# Verify:
grep -c "python3 skills/ui-ux-pro-max" SKILL.md  # should return 0
```

**Gotcha:** Skillscore may flag line count change. Run skillscore after — if <90%, something broke.

**Acceptance test:** `grep -c "python3 skills/ui-ux-pro-max" SKILL.md` returns 0.

**Tooling:** Cerebras agent — trivial find/replace work. One-shot prompt.

---

### Unit 4 — Bash error handling

**What:** Each of 11 bare `python ...` bash blocks in SKILL.md gets `2>/dev/null || echo "ERROR: ..."` appended.

**Files:** `SKILL.md`.

**Implementation:** Delegate to Cerebras — scan for bare bash blocks, append error handling, write back. Template:
```bash
python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain> 2>/dev/null || echo "ERROR: search.py failed — check CLI path"
```

**Acceptance test:** `grep -c "python ~/.agents/skills/ui-ux-pro-max/scripts/search.py" SKILL.md` returns ~13; `grep -c '2>/dev/null' SKILL.md` is roughly equal.

**Tooling:** Cerebras agent.

---

### Unit 5 — Document `_sync_all.py`

**What:** Add a SKILL.md section explaining the script.

**Fact (verified 2026-04-15):** `_sync_all.py` is a **self-contained local reconciliation script**. Takes `products.csv` as source of truth, syncs `colors.csv` and `ui-reasoning.csv` to match (rename / add / remove / renumber). Does colour math locally (luminance, blend, on-colour contrast). **No upstream source, no API call, no external dependency.** "Sync" here means "keep these three CSVs aligned with each other", not "sync from a remote server".

**Files:** `SKILL.md`, `data/_sync_all.py` (read only).

**Implementation:**
1. Add a "Data Reconciliation" section to SKILL.md describing the three-CSV invariant (products.csv drives colors.csv + ui-reasoning.csv)
2. Document when to run it: after any row added/removed from `products.csv`
3. Show the one-line invocation: `cd data && python _sync_all.py`

**Acceptance test:** `grep -c "_sync_all.py" SKILL.md` returns ≥ 2.

**Tooling:** Cerebras (the facts are simple — just need the write).

---

### Unit 6 — `requirements.txt`

**What:** Add `scripts/requirements.txt` listing Python deps.

**Implementation:**
```bash
cd C:/Users/Bean/.agents/skills/ui-ux-pro-max/scripts
# Parse imports from core.py, search.py, design_system.py:
grep -hE "^(import|from) " *.py | sort -u
# Translate to requirements.txt — likely stdlib only, so file may be empty or:
# (Check if pandas, openpyxl, etc. are imported)
```

**If stdlib only:** `requirements.txt` reads `# stdlib only — no external dependencies`.

**Acceptance test:** `pip install -r requirements.txt` succeeds (or file says stdlib only).

**Tooling:** Cerebras agent.

---

### Unit 8 — Research MCP vs bundled (PARALLEL with Session 1 work)

**What:** Dispatch `/research-buddies` (or Gemini Pro if research-buddies slow) to evaluate: is an MCP server the right shape for ui-ux-pro-max, vs keeping skill-bundled flat-file DB?

**Implementation — dispatch at start of overnight run:**
```bash
set -a; source A:/.openclaw/.env; set +a
gemini -p "Research question: for an AI skill with a CSV-backed queryable reference database (14 files, 6,461 rows), consumed by ~25 sibling skills via Python CLI, what is the right architectural shape — (a) keep as skill-bundled flat-file with CLI, (b) migrate to MCP server with tools, or (c) hybrid. Consider: token cost (MCP registers schema at conversation start), cross-platform reuse (CC + OC + Cursor), update workflow, migration risk to 25 consumers, maintenance burden. Recommend one with confidence % (0-100). Output: 300 words, plus a table of pros/cons, plus final confidence score. Use python ~/.claude/hooks/search.py for any web research. Context: sibling precedent sgs-db.py is skill-bundled SQLite and works well; blub.db is SSOT SQLite not MCP. wp-blocks/wp-docs/a11y-audit are CLIs that replaced MCP servers to save token cost." -y --model gemini-3.1-pro-preview > /tmp/mcp-research.md 2>&1
```

**Acceptance:** `/tmp/mcp-research.md` contains structured output with confidence score.

**Feeds:** Unit 10.

**Tooling:** `/gemini-pro`, fallback to `/research-buddies` if Gemini Pro rate-limited.

---

### Unit 10 — Architecture decision

**What:** Read U8's output. Apply the >75% confidence rule: if research returns a recommendation with ≥75% confidence AND matches my prior (70% stay-bundled), commit. Otherwise write decision-pending artifact and Telegram-ping for morning review.

**Files:** `C:/Users/Bean/.claude/plans/ui-ux-pro-max-architecture-decision.md` (new).

**Decision-pending template (if <75%):**
```markdown
# Architecture Decision — PENDING

**Research summary:** [paste 300-word Gemini output]
**Confidence:** [%]
**Recommended path:** [MCP / bundled / hybrid]
**My prior:** 70% stay-bundled (precedent: sgs-db.py works beautifully as skill-bundled SQLite; MCP adds infra without clear benefit when CLI already works for 25 consumers)
**Unresolved tension:** [what the research didn't answer]
**Question for Bean:** [specific ask]
```

**Telegram ping (if pending):**
```bash
python C:/Users/Bean/.claude/hooks/tg-cli.py send "ui-ux-pro-max overnight: architecture decision pending. Research returned [X]% confidence for [path]. My prior is 70% stay-bundled. Will park U18-U21 until you decide. Full rationale: .claude/plans/ui-ux-pro-max-architecture-decision.md"
```

**Tooling:** main-thread (judgement call).

---

### Unit 11 — Integration Contract + Data Dictionary

**What:** Two additions to SKILL.md + one new references/ file.

**SKILL.md additions:**
1. `## Integration Contract` — how sibling skills call this. Pre-query: when to load full SKILL.md vs just call CLI. Post-query: how to apply results + cite provenance.
2. Update `## Reference Content` with all 14 CSVs (currently lists 4 missing domains: `ui-reasoning`, `icons`, `products`, `react-performance`).

**New file:** `references/data-dictionary.md` — one section per CSV, with column schema:
```markdown
## colors.csv (161 rows, target 500 after Unit 15)
| Column | Type | Example | Notes |
|--------|------|---------|-------|
| product_type | string | "Financial Dashboard" | Category key |
| primary | hex | "#0F172A" | Dominant color |
| on_primary | hex | "#FFFFFF" | Text on primary |
| ... | | | |
| provenance | string | "nextlevelbuilder" | Added Unit 17 |
```

Repeat for all 14 CSVs.

**Tooling:** Cerebras agent. Single-shot prompt with CSV list + template.

---

### Unit 12 — Wire 6-8 priority consumer skills (Session 3 core)

**What:** Add a process step to each priority consumer skill's SKILL.md telling it to call ui-ux-pro-max CLI before making recommendations.

**Priority skills (6-8 out of 25):**
1. `colourise` → `--domain color`
2. `polish` → `--domain ux` (priority rules)
3. `bolder` → `--domain style`
4. `design-review` → `--domain ux` (review rules)
5. `visual-qa` → `--domain ux` (QA rules)
6. `sgs-wp-engine` → `--domain product` (pattern templates)
7. `normalize` → `--domain typography`
8. `clarify` → copywriting — may not need CLI; skip if unclear

**Per-skill edit template:**
```markdown
### Stage X — Consult ui-ux-pro-max (NEW)

Before recommending [colours / fonts / etc.], query the design intelligence DB:

```bash
python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "<brief>" --domain <domain> --limit 5 --json 2>/dev/null || echo "CLI unavailable — fall back to model knowledge"
```

Apply the top 3 returned [items]. Cite their `provenance` field in your output.
```

**Gotcha:** Every skill edit fires skillscore hook + pending-gap-analysis gate. Use Cerebras to batch-prepare the edit text, main-thread to apply (lifecycle gate requires session-owner edit).

**Acceptance test:** `grep -lE "ui-ux-pro-max/scripts/search.py" ~/.agents/skills/*/SKILL.md | wc -l` returns ≥ 6.

**Tooling:** Cerebras for bulk edit prep, main-thread for lifecycle-gated application. `/lifecycle` mode active, no need to re-start pipeline per skill.

---

### Unit 12b — Opportunistic description expansion (CC-only)

**What:** Claude Code v2.1.105 raised the SKILL.md `description` cap from 250 → 1,536 chars. While editing the 6-8 consumer skills in U12, also check if their current descriptions are hitting the old 250-char wall — if yes, expand up to 1,536 with useful routing context (concrete triggers, negative routing to specific siblings, domain keywords).

**Classification:** CC-only. Skill frontmatter. No OC-side action.

**Files:** Each wired skill's SKILL.md frontmatter (colourise, polish, bolder, design-review, visual-qa, sgs-wp-engine, normalize, clarify).

**Implementation (per skill):**
1. Count current description char length: `awk '/^description:/,/^[a-z]+:/' SKILL.md | wc -c`
2. If < 260 (i.e., near old cap): flag for expansion
3. Expand with: specific trigger phrases, named-sibling negative routing ("Do NOT invoke for: X use `/y`, Z use `/w`"), domain keywords, and which `ui-ux-pro-max --domain` it should query (free routing context now that space allows)
4. Re-validate with skillscore after edit — improved description should lift `routing_accuracy` and `negative_routing` scores

**Gotcha:** CC must be v2.1.105+ for expanded descriptions to load without startup truncation warning. Check with `claude --version`. If older: skip this unit, log as follow-up.

**Acceptance test:** Each wired skill's description either was already long (>260 chars) or has been expanded. None are stuck at ~250 chars.

**Follow-up (NOT in this run):** Audit all ~80 SKILL.md files in `~/.claude/skills/` + `~/.agents/skills/` for 250-char-wall descriptions. Likely ~15-25 candidates. Schedule as a separate batch lifecycle pass.

**Tooling:** Cerebras (draft expanded descriptions per skill), main-thread (apply via Edit tool with lifecycle gate active).

---

### Unit 13 — `--json` documentation

**What:** `search.py` already has `--json` flag (verified in argparse). Document it in SKILL.md + create `references/json-example.md` with a full worked example.

**Worked example template (create file):**
```json
{
  "query": "dark fintech dashboard",
  "domain": "color",
  "count": 3,
  "results": [
    {
      "product_type": "Financial Dashboard",
      "primary": "#0F172A",
      "on_primary": "#FFFFFF",
      "accent": "#22C55E",
      "provenance": "nextlevelbuilder",
      "notes": "Dark bg + green positive indicators"
    }
  ]
}
```

**Tooling:** Cerebras.

---

### Unit 14 — `--limit` flag

**What:** Add `--limit N` (default 10, max 50) to `search.py`. Prevents context-window bloat when a sub-skill queries 1,775-row `design.csv`.

**Files:** `scripts/search.py`.

**Implementation:** argparse already exists. Add:
```python
parser.add_argument('--limit', type=int, default=10, help='Max results (default 10, hard cap 50)')
# In result trimming:
results = results[:min(args.limit, 50)]
```

**Acceptance test:** `search.py "foo" --limit 100` returns at most 50 results.

**Tooling:** Cerebras.

---

### Unit 15 + Unit 16 — DB expansion via Cerebras parallel research

**What:** Two Cerebras agents dispatched in parallel:
- **U15 agent:** expand `colors.csv` from 161 → 500 palettes. Sources: Refactoring UI, Tailwind defaults, Shadcn themes, Awwwards winners, Pollen palettes.
- **U16 agent:** expand `styles.csv` from 85 → 250 styles + curate 1,000 font pairings from `google-fonts.csv` (1,924 rows) with variable-font tags.

**Prompt pattern (per agent):**
```
Research and output CSV rows matching the existing schema at /data/colors.csv. Target: 300+ new palette entries.
Required columns per row: product_type, primary, on_primary, secondary, on_secondary, accent, on_accent, background, foreground, provenance, notes, source_url.
Sources (use python ~/.claude/hooks/search.py "site:<domain> palette"):
  - refactoringui.com (Adam Wathan's palette system)
  - tailwindcss.com/docs/customizing-colors
  - ui.shadcn.com/themes
  - awwwards.com (browse 2024-2026 winners)
  - pollen.style
Each row MUST include source_url (cite a real reference) and provenance (e.g., "refactoring-ui", "tailwind-v4", "shadcn", "awwwards-2025-q1", "pollen").
Output: valid CSV rows appended to /data/colors.csv. NO fabrication — if unsure about a palette, skip it.
Target: at least 300 genuine new rows.
```

**Gotcha:** Cerebras will hallucinate palettes if not constrained. `source_url` + `provenance` requirements force citation. Spot-audit 10% of output before accepting.

**Acceptance test:** `wc -l data/colors.csv` ≥ 500. `awk -F',' 'NR>1 && $NF==""' data/colors.csv | wc -l` (rows missing source_url) should be 0.

**Tooling:** Cerebras agents × 2, parallel. Takes ~30-60 min wall time each.

---

### Unit 17 — Provenance column + `update-db.py`

**What:** Add `provenance` column to all 14 CSVs. Create validation + merge script.

**Files:** All CSVs (header edit + existing-row annotation), `scripts/update-db.py` (new).

**Implementation — provenance annotation for existing rows:**
- Rows existing before 2026-04-14 Gemini review: `provenance = "nextlevelbuilder"` (they came from the GitHub clone)
- New rows from Unit 15/16: whatever Cerebras wrote
- Any manual Bean adds: `provenance = "bean-custom"`

**`update-db.py` structure:**
```python
# scripts/update-db.py
# Subcommands:
#   validate    — checks all CSVs have required columns, no broken rows
#   dedup       — removes duplicate rows by key columns (primary+product_type)
#   merge <file> — merges a new CSV into existing one with provenance preserved
#   stats       — row counts + provenance breakdown per file
```

**Acceptance test:** `head -1 data/*.csv | grep -c provenance` = 14. `python scripts/update-db.py validate` exits 0.

**Tooling:** Cerebras for provenance backfill, main-thread for `update-db.py` structure.

---

### Unit 18 — Migration (CONDITIONAL on Unit 10 decision)

**IF bundled path (my 70% prior):**
```powershell
# PowerShell one-shot — CSV → SQLite
$csvDir = "C:/Users/Bean/.agents/skills/ui-ux-pro-max/data"
$dbPath = "C:/Users/Bean/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db"
sqlite3 $dbPath "CREATE TABLE ..."  # schema per CSV
# For each CSV: .import <file> <table>
```

**IF MCP path:**
- Create `mcp/server.py` (FastMCP)
- Tools: `search`, `design_system`, `stats`, `validate`
- Register in `~/.claude/.mcp.json` or `a:/.openclaw/openclaw.json`

**Tooling:** PowerShell direct (bundled), `/mcp-builder` skill (MCP).

---

### Unit 19 — Extend CLI to 15 subcommands

**What:** Match SGS DB pattern. Current: 3 types (domain, stack, design-system). Target: 15.

**Subcommand list (matching SGS DB's `sgs-db.py`):**
```
search <query> --domain|--stack|--design-system   (existing)
match "<description>"                              — find best palette/style match
impact <entry-id>                                  — which consumer skills would re-recommend if this entry changed
gaps <product-type>                                — which product types lack coverage
context <variation>                                — client context switch (e.g., accessibility-first)
stats                                              — row count, provenance breakdown
health                                             — validate all CSVs, report issues
patterns [category]                                — list landing patterns
hooks [domain]                                     — list rules by domain
components                                         — list reusable UI components in DB
add <csv> <row>                                    — append row with provenance
update <csv> <id> <field> <value>                  — edit existing row
dedup <csv>                                        — remove duplicates
deploy <target>                                    — push DB to another location (OC sync)
sql "<query>"                                      — raw SQL fallback
```

**Tooling:** Cerebras (scaffolding), main-thread (review + test).

---

### Unit 20 — Dashboard page (CONDITIONAL)

**What:** If bundled path chosen AND Session 5b runs — build a Blub Dashboard page.

**Files:** `A:/.openclaw/workspace/tools/blub-dashboard-v2/app/design-intel/page.tsx` (Next.js 15 + Tailwind 4).

**Page structure:**
- Search bar (queries `ui-ux-pro-max.db` via API route)
- Domain filter dropdown
- Result cards (palette preview / font preview / style example)
- Provenance badge per entry
- "Add entry" modal (creates via `update-db.py add`)

**Tooling:** Gemini Flash (template writing — 1M context can hold whole dashboard codebase), main-thread (integration with existing dashboard API layer).

---

### Unit 21 — Sync with `blub.db`

**What:** Index ui-ux-pro-max entries in `blub.db` knowledge table for cross-project search.

**Implementation:**
```python
# scripts/sync-to-blub.py
import sqlite3, csv
src = sqlite3.connect('ui-ux-pro-max.db')  # or query CSVs
blub = sqlite3.connect('A:/.openclaw/workspace/tools/blub-dashboard-v2/data/blub.db')
# For each row: INSERT INTO knowledge (source, title, content, category='design-intel', ...)
```

**Acceptance test:** Query `SELECT COUNT(*) FROM knowledge WHERE category='design-intel'` in blub.db returns ≥ 6,461 + expansion.

**Tooling:** main-thread (DB integrity matters).

---

## Not included (deferred)

- Wiring all 25 consumer skills (targeting 6-8 priority this run)
- Full 10x DB growth (targeting 3x)
- Cross-platform propagation (`templates/platforms/` configs) — deferred
- Full dashboard UI build (may ship as minimal page only)
- Integration tests across all consumers (smoke test priority consumers only)
- **Full 80-skill description-cap audit** (CC v2.1.105 raised limit 250→1,536). U12b handles opportunistic in-scope skills only. Broader audit = separate batch lifecycle pass later.

## Timeline

| Milestone | Target |
|-----------|--------|
| Overnight run start | ~23:00 |
| Priority 1 (security) complete | +2h |
| Parallel research + DB expansion dispatched | +0:10 (fills in background) |
| Architecture decision logged | +3-4h (after research returns) |
| Priority consumer wiring complete | +6h |
| Migration (conditional) | +7-8h |
| Morning report delivered | +8h, written by ~07:00 |

## Access and resources

| Resource | Location |
|----------|----------|
| Target skill | `C:/Users/Bean/.agents/skills/ui-ux-pro-max/` |
| Plan index | `C:/Users/Bean/Projects/small-giants-wp/.claude/plans/specs/ui-ux-pro-max/README.md` |
| Gap register | `./gap-register.md` |
| Delegation matrix | `./model-delegation-matrix.md` |
| OC-CC adaptations | `./oc-cc-adaptations.md` |
| Runbook | `./overnight-execution-runbook.md` |
| Gemini API key | `A:/.openclaw/.env` (source first) |
| Cerebras agent | `C:/Users/Bean/.claude/agents/cerebras-agent/agent.py` |
| Telegram bot | `C:/Users/Bean/.claude/hooks/tg-cli.py` |
| SearXNG / unified search | `C:/Users/Bean/.claude/hooks/search.py` |
| Skillscore | `skillscore validate <path> --type skill` |
| Lifecycle enforcer | `C:/Users/Bean/.claude/hooks/pipeline-enforcer.py` |

## Contact

Bean, via Telegram bot `@ClaudeDub1_bot` — use `tg-cli.py send "<message>"` for any blocker during overnight run. Response time: morning.