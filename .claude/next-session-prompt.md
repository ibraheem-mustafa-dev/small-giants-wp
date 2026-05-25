---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-25-phase-1-universal-extraction-start
generated: 2026-05-25
parent_session: small-giants-wp-2026-05-25-qc-council-session
primary_goal: "Start Phase 1 universal-extraction backbone with F1 spike validation BEFORE full dispatch. Acceptance: per-section ≤30% × 3 viewports for all 7 body sections (mean baseline 63.2%; F1 fix proposed at convert.py:1430)."
first_action_eta: "10 minutes (F1 spike step 1: read _lift_inner_blocks end-to-end)"
hard_gate_pending: "F1 spike on brand alone — brand 1440 must drop from 50.0% to ≤30% (≥20pp drop) OR halt + diagnose"
---

# Next session — Phase 1 universal-extraction backbone (F1 spike first)

**Invoke `/autopilot` before anything else.**

---

## TL;DR for a fresh session (under 3 min read)

You are continuing the SGS cloning-pipeline universal-extraction backbone work. **Your very first action is a 10-minute spike — implement the F1 fallback at `convert.py:1430` and measure on the brand section ONLY.** If brand 1440 pixel-diff drops from 50.0% to ≤30%, F1 is validated and you proceed to full Phase 1. If not, halt + surface to Bean — the diagnosis is wrong.

You are NOT shipping all 19 Phase 1 commits today. You're shipping 1 spike + measure + decide.

**4 things that will trip you up if you don't internalise them first:**

1. **Hero is NOT a clean reference.** It clones near-perfect today via hardcoded cheats in `convert.py:3557-3608`. Architecture is NOT yet proven by hero. The Phase 1 work is to make it work WITHOUT cheats — and hero will get worse before it gets better.
2. **"Per-section ≤30% × 3 viewports", NOT mean.** Mean averaging hides hidden failures. 21 cells (7 sections × 3 viewports), each ≤30% independently.
3. **Phases never ship as single commits** (binding rule blub.db row 288). Within Phase 1, every major task commits separately with `/qc-council` + measurement + predicted/actual delta.
4. **"All div classes are blocks; just some nested inside others" (P15).** This is THE architectural primitive in operator language. F1 implements it. If you find yourself proposing per-block fixes, STOP.

Everything else expands these 4 points.

---

## Predicted numeric outcome (write this BEFORE running the spike — falsifiable per blub.db row 276)

**Hypothesis:** F1 fallback inserted at `convert.py:1430` (universal walk over direct child div + semantic-tag descendants when `_db_children(parent_slug)` returns empty) will cause brand `sgs/quote` to emit OPEN with 3 nested core/paragraph (or sgs/text) children instead of self-closing — closing the empty `body[]` gap that drives brand's high pixel-diff.

**Numeric prediction (against baseline `pipeline-state/mamas-munches-homepage-2026-05-25-101222/stage-11-pixel-diff.json`):**

| Section | Baseline 375 | Baseline 768 | Baseline 1440 | Predicted 375 | Predicted 768 | Predicted 1440 |
|---|---|---|---|---|---|---|
| brand | 73.8% | 59.4% | **50.0%** | ≤50% (≤24pp drop) | ≤30% (≤30pp drop) | **≤30% (≤20pp drop)** ← gate cell |
| hero | 86.5% | 64.1% | 69.6% | ±2pp (regression guard) | ±2pp | ±2pp |
| other 5 body | (per stage-11) | (per stage-11) | (per stage-11) | ±2pp (regression guard) | ±2pp | ±2pp |

**HARD GATE on brand 1440 cell only** (smallest-pipeline-slice per blub.db row 276):

| Brand 1440 post-spike | Verdict | Action |
|---|---|---|
| ≤30% (≥20pp drop) | F1 validated | Proceed to Phase 0E + full Phase 1 per phase plan |
| 30–40% (10–20pp drop) | F1 partial | Surface to Bean. The diagnosis is right but the fix shape needs adjustment. DO NOT proceed without Bean go-ahead. |
| >40% (<10pp drop) OR regression | F1 falsified | HALT. Re-investigate per blub.db row 285 (read full spec; state architectural primitive in plain English; verify it's invoked correctly). Surface to Bean with disproof. |

**Regression guard** (must pass alongside the brand cell): hero 1440 stays within ±2pp of baseline 69.6% (i.e. 67.6%-71.6%). F1 fallback fires only when `_db_children` returns empty; hero has `parent_block` rows so it shouldn't fire on hero. If hero moves, F1 is over-firing.

---

## First concrete action — 10 min step-by-step (ADHD Rule 2 compliant)

### Step 1 (5 min): Read `_lift_inner_blocks` end-to-end
```bash
# Read lines 1350-1517 of convert.py — the full _lift_inner_blocks function
```
- File: `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`
- Lines: 1350-1517
- Find the early-return at line 1430: `if not child_slugs: return []`
- Note the helpers already in scope: `_find_top_level`, `_cls_frag`, `emit_wp_block`

### Step 2 (5 min): Capture pre-spike empirical state
```bash
# Hero attribute-count baseline (for regression guard later)
python -c "
import json, sys; sys.stdout.reconfigure(encoding='utf-8')
e = json.load(open('pipeline-state/mamas-munches-homepage-2026-05-25-101222/extract.json', encoding='utf-8'))
for s in e['per_section_results']:
    if s.get('boundary_id') in ('b2','b5'):
        bid = s['boundary_id']
        bmark = s.get('block_markup','')
        n = bmark.count('<!-- wp:')
        print(f\"{bid}: {n} blocks emitted; markup_len={len(bmark)}\")
"
# Expected output: b2 (hero) ~6-8 blocks; b5 (brand) ~5 blocks (self-closing sgs/quote without body[])
```
- Brand baseline at page 144: 73.8 / 59.4 / **50.0%**
- Hero baseline at page 144: 86.5 / 64.1 / 69.6%

### Step 3 (15 min): Implement the F1 fallback inline at convert.py:1430

Replace this existing block:
```python
if not child_slugs:
    _trace(
        "inner_blocks_no_children",
        parent_slug=parent_slug,
        reason=(
            "No rows in blocks.parent_block for this slug (source=sgs). "
            "Seed blocks.parent_block to enable InnerBlocks emission."
        ),
        soft_failed=True,
    )
    return []
```

With (sketch — implementer adapts to the existing return-list-of-markup-strings interface):
```python
if not child_slugs:
    # F1 universal-nesting fallback (D74, blub.db row 288)
    # Per Spec 16 §15 line 990 + Bean P7: when DB has no parent_block rows,
    # walk direct child div + semantic-tag descendants and call back into walk().
    direct_children = [
        c for c in node.children
        if hasattr(c, 'name') and c.name in ('div', 'p', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'ul', 'ol', 'figure', 'button')
    ]
    if direct_children:
        fallback_markup = []
        for child in direct_children:
            # Call back into walk() so FR2 atomic-tag + class-based recognition apply universally
            child_markup, _child_css = walk(child, css_rules, [], depth=1, is_top_level=False)
            if child_markup:
                fallback_markup.append(child_markup)
        if fallback_markup:
            _trace(
                "inner_blocks_fallback_universal_walk",
                parent_slug=parent_slug,
                child_count=len(fallback_markup),
            )
            return fallback_markup
    # Truly empty — preserve existing soft-fail diagnostic
    _trace(
        "inner_blocks_no_children",
        parent_slug=parent_slug,
        reason=(
            "No rows in blocks.parent_block for this slug, and no direct child "
            "div/semantic-tag descendants found for universal-walk fallback."
        ),
        soft_failed=True,
    )
    return []
```

**Critical implementation notes (READ before writing code):**
- `walk()` signature in this codebase: `walk(node, css_rules, variation_buf, depth, is_top_level=False) -> (markup, css)` — confirm by reading the actual signature at the top of `convert.py`, do not trust this prompt
- "Direct child" means immediate children, NOT descendants (no `descendants` walk)
- The `_db_children(parent_slug)` query already cached the empty result; just use the local `child_slugs` variable
- Do NOT touch the populated-children path (lines 1442 onwards) — only the early-return at 1430

### Step 4 (5 min): Run the spike on brand alone
```bash
cd /c/Users/Bean/Projects/small-giants-wp
python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py \
  --mockup sites/mamas-munches/mockups/homepage/index.html \
  --section "section.sgs-brand" \
  --client mamas-munches \
  --page homepage \
  --deploy-target page:144 \
  --debug-trace
```

CLI flags verified against current `sgs-clone-orchestrator.py` arg parser (2026-05-25). `--section` takes a CSS selector (e.g. `"section.sgs-brand"`), NOT a section name.

### Step 5 (2 min): Measure brand at 3 viewports
```bash
# The orchestrator writes Stage 11 pixel-diff. Read the new run dir:
ls -t pipeline-state/ | head -3
# Then read the latest stage-11-pixel-diff.json filtering to .sgs-brand selector
python -c "
import json, sys, os; sys.stdout.reconfigure(encoding='utf-8')
latest = sorted([d for d in os.listdir('pipeline-state') if d.startswith('mamas-munches-homepage-2026-05-25')], reverse=True)[0]
d = json.load(open(f'pipeline-state/{latest}/stage-11-pixel-diff.json', encoding='utf-8'))
for r in d['results']:
    if 'sgs-brand' in r['selector'] or 'sgs-hero' in r['selector']:
        print(f\"{r['selector']:30s} {r['viewport']:12s} {r['mismatch_percent']:.1f}%\")
"
```

### Step 6 (1 min): Apply HARD GATE
Compare brand 1440 cell post-spike to the HARD GATE table above. Take the matching action.

### Step 7 (5 min): Record the spike result
Append to `.claude/reports/2026-05-25-qc-council-issue-register.md` as a new "Section S — F1 spike empirical result" section:
- Predicted: brand 1440 ≤30%
- Actual: <fill in>
- Verdict: F1 validated / F1 partial / F1 falsified
- Implication: <one paragraph: if validated, what's next; if not, what to re-investigate>

**Total Step 1-7 wall-time: ~40 minutes if everything is straightforward; up to 60 min including the build + deploy.**

---

## What to do if dashboard API is still down

The 2026-05-25 session found blub.db dashboard at `http://localhost:5050` unreachable. If still down:
- `/capture-lesson` Step 4 (blub.db POST) falls back to direct SQLite INSERT into `C:/Users/Bean/.openclaw/workspace/tools/blub-dashboard-v2/data/blub.db` `learning` table — full row schema in the script
- `/handoff` Gate 4b/4c.5 (knowledge API push) will fail silently per protocol; do NOT block
- Sync resync command (if dashboard comes back up): `python ~/.openclaw/workspace/scripts/cc-knowledge-resync.py`

---

## Critical reference docs (in priority order — read AFTER spike validates)

**If the spike validates (brand 1440 ≤30%):** you have ~6 hours of Phase 1 work ahead. Read these in order before Commit 8 (full Phase 1B F1 dispatch):

1. `.claude/plans/2026-05-25-phase-1-universal-extraction.md` — the 19-commit plan. Read commits 8-19. Each commit has model routing + skills + predicted delta + risk.
2. `.claude/reports/2026-05-25-qc-council-issue-register.md` Sections P (P1-P27 binding principles) + Q (20-cheat inventory) + R (consolidated plan with worked example) + L15 (hero cheats roadmap) + J (methodology lessons).
3. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §15 — read the new 2026-05-25 quick-reference callout at top of §15. Then §14 G1-G5 status.
4. `.claude/specs/21-PIPELINE-STATE-ARTEFACTS.md` — what every JSON in pipeline-state/<run>/ contains.

**If the spike is partial (10-20pp drop) OR falsified (<10pp):** surface to Bean. Don't read further; the diagnosis needs Bean's call before more work.

---

## Empirical baseline (cite these numbers when reporting)

Run: `pipeline-state/mamas-munches-homepage-2026-05-25-101222/`. Mean pixel-diff: **63.2%** across 27 captures.

| Section | 375 | 768 | 1440 |
|---|---|---|---|
| header (parked) | 84.8% | 83.5% | 24.4% |
| hero (FR1-matched, 17% extracted) | 86.5% | 64.1% | 69.6% |
| trust-bar | 37.0% | 24.6% | 33.1% |
| featured-product | 70.4% | 58.7% | 81.9% |
| brand | 73.8% | 59.4% | **50.0%** |
| ingredients-section | 53.2% | 41.4% | 53.9% |
| gift-section | 55.2% | 44.8% | 47.5% |
| social-proof | 75.2% | 80.1% | 60.2% |
| footer (parked) | 97.9% | 97.4% | 98.5% |

Canary page: 144 (`/rc-fix-verification-mamas-munches/`) on `sandybrown-nightingale-600381.hostingersite.com`.

---

## Drift-correction history (don't repeat these mistakes)

These were called out by Bean during 2026-05-25 and previous sessions. If anything below feels NEW to you on cold read, you've missed something important — go re-read Section L15 + P9 + K17 of the register.

1. **"Hero already at ≤1%" framing was wrong** — hero clones via hardcoded cheats (Section L15 of register). Architecture NOT yet proven by hero.
2. **"Wrapper-context noise floor" claim was wrong** — Bean: *"that dom wrapper stuff is BS, HTML/CSS/JS translates cleanly even through PHP"*. Diff is converter bugs, not noise.
3. **Tier-1 "dictionary-definition-of-cheating" Tier 1 recommendations** — referenced retired blocks (sgs/trust-bar — D72 retired same day); proposed seeding parent_block rows to silence walker diagnostics; proposed slot synonyms that didn't match section reality. ALL violations of P26 + P8.
4. **`_slot_attr_prefix` extension as universal G3 fix** — empirically falsified (only addressed 7 of 473 failures). The other 440 are legitimate `value_empty` for features absent from mockups. Reverted in D71.
5. **"Phase 1 too big as one commit"** framing — wrong. Phase 1 is correctly large; the issue was commit cadence (now binding rule D73 — never one-commit-per-phase).
6. **References to `slot_list.py`** — file doesn't exist. 14 stale citations across 4 docs (corrected 2026-05-25). Always grep-verify file paths before citing.

---

## Tooling table

| Tool | When |
|---|---|
| `/qc-council` | Pre-commit gate on HIGH-leverage commits marked ⚡ in phase plan — blub.db 255 |
| `/qc-inline` | Per-file checks during implementation |
| `/verify-loop` | 2-attestation per load-bearing claim |
| `/systematic-debugging` | Root-cause investigation if any commit regresses |
| `/subagent-driven-development` | Implementer + 2 reviewers pattern for non-trivial commits |
| `/dispatching-parallel-agents` | F1F + 1G parallel work across composites/blocks |
| `/subagent-prompt` | Cold prompts (embed Dispatch Bindings A/B/C/D verbatim) |
| `/delegate` | Picks model per task (Haiku mechanical / Sonnet architectural / Cerebras+Gemini Flash validation) |
| `/capture-lesson` | New architectural rules surfaced |
| `/sgs-clone --section "section.sgs-X" --deploy-target page:144 --debug-trace` | After every commit (Binding B per blub.db 240) |
| `/sgs-update` Stage 1 | role='content' DB sync (Phase 0C) |
| `/docscore` | Auto-runs on every doc Write/Edit via PostToolUse hook |
| `/handoff` | Phase 1 close |
| Playwright MCP | Live-page DOM verification for G1 hero CTAs (later commits) |
| `python ~/.claude/hooks/wp-blocks.py dump` | Schema enumeration BEFORE any "missing X" claim — blub.db 272 |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block <slug>` | DB query — verify block capability before evaluating per blub.db 286 |

## 11 binding rules (gate every commit; full text in Section P of register)

1. **Universally-applicable mechanisms (P1)** — no per-block hyperfocus
2. **Empirical-check before architectural conclusion (P2)** — `/sgs-clone --debug-trace` + read artefacts before proposing
3. **All div classes are blocks (P15)** — THE structural primitive
4. **Pipeline must achieve ≤1% deterministically (P17)** — allowed manual work = block functionality + pipeline scripts only
5. **Universal flat-scanning preserves hierarchy + direct-owner CSS attribution (P18)**
6. **Empty InnerBlocks array → walk direct child div descendants (P7)** — the F1 fallback
7. **One fix at a time with /verify-loop (P20)**
8. **Don't agree, disagree, or propose without evidence — find it first (P26)**
9. **Read full spec before proposing architectural fix-shape (blub.db 285)** — state primitive in plain English BEFORE proposing
10. **Check sgs-db block capability before evaluating (blub.db 286)**
11. **Phases never ship as single commits (blub.db 288)** — every major task commits separately with /qc-council + measurement + delta in message

---

## After Phase 1 closes

Phase 1.5 (per-section ≤1% closure) opens — scope determined empirically by Phase 1 end-results. Then Phase 2 (header/footer cloner). See `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md` for Phase 2 scope (parked until Phase 1.5 hits ≤1%).

---

## Pointers (quick-look index)

- **Empirical baseline:** `pipeline-state/mamas-munches-homepage-2026-05-25-101222/`
- **Phase 1 plan canonical:** `.claude/plans/2026-05-25-phase-1-universal-extraction.md`
- **Canonical register (~110 items):** `.claude/reports/2026-05-25-qc-council-issue-register.md`
- **Architecture decisions D70-D75 + 14-19:** `.claude/architecture.md` + `.claude/decisions.md`
- **Recent feedback files:** `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_phases_never_ship_as_single_commits.md` + MEMORY.md index
- **Old phase-1 plan archived:** `.claude/plans/archive/2026-05-24-phase-1-structural-recovery-superseded-by-phase-1-universal-extraction.md`
