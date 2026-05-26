---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-26-desktop-1440-brand-layout-investigation
generated: 2026-05-26
parent_session: small-giants-wp-2026-05-25-f1-spike-shipped-partial
primary_goal: "Investigate why brand pixel-diff at 1440 desktop stayed flat (+0.8pp) post-F1 while 375 mobile dropped −23.8pp and 768 tablet dropped −13.0pp. Identify the CSS/layout cause and propose the next fix shape."
first_action_eta: "5 minutes (open page 144 at 1440 in Playwright + capture brand screenshot)"
hard_gate_pending: "None this session — diagnostic investigation, not a fix. Output is a root-cause statement + a ranked fix-shape menu for Bean to choose from."
---

# Next session — Desktop 1440 brand layout investigation (Phase 1 Commit 7 follow-up)

**Invoke `/autopilot` before anything else.**

---

## TL;DR for a fresh session (under 2 min read)

You are picking up post-F1. F1 (universal-nesting fallback) shipped in commit `a757ff1c` on 2026-05-25 23:53. It worked on mobile and tablet — brand pixel-diff dropped 23.8pp and 13.0pp respectively. **It did NOT move desktop 1440** — brand stayed at 50.8% (target ≤30%).

This means there is a **separate CSS/layout issue at desktop 1440** that F1 doesn't touch. Your job this session is to find it. Not to fix it yet — find it, characterise it, present a ranked fix-shape menu.

**3 things to internalise before starting:**

1. **F1 is shipped and architecturally validated.** Do NOT re-run the F1 spike. Do NOT propose changes to `_f1_universal_walk_direct_children` unless you find evidence it's misfiring at 1440. Helper lives at `convert.py:3916`; callsites at `walk()` lines 4047, 4124, 4181.
2. **The defect is desktop-only.** Whatever is wrong at 1440 is NOT wrong at 375 or 768 (those are now at 50.0% and 46.4%, both still above the 30% gate but improving). Look for things that change at desktop breakpoints: grid template columns, max-width, container constraints, sibling-vs-child positioning, responsive image sizing, font scaling.
3. **Mockup vs render comparison is the primary tool.** Open BOTH the mockup file (`sites/mamas-munches/mockups/homepage/index.html`) AND the live page 144 at 1440, screenshot the brand section in each, compare visually.

---

## First concrete action — 5-min step (ADHD Rule 2 compliant)

### Step 1 (5 min): Capture brand at 1440 from BOTH mockup and live page

```bash
# In Playwright MCP — two screenshots at 1440 viewport
# (a) Live page: https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/
#     Resize to 1440, take screenshot of section.sgs-brand
# (b) Mockup file: sites/mamas-munches/mockups/homepage/index.html
#     Resize to 1440, take screenshot of section.sgs-brand (or the brand section equivalent)
```

Place both screenshots side-by-side. The visible delta IS the defect. Common candidates:

- **Grid layout differs** — mockup may use `grid-template-columns: 1fr 1fr` while render uses something else
- **Sibling vs child positioning** — render emits brand as outer container with `__content` child + `__image` sibling (see brand markup capture in prior session). At 375/768 these stack vertically; at 1440 they should sit side-by-side. If the grid columns don't take effect at 1440, image lands below content.
- **Max-width constraint** — mockup may have `max-width: 1000px` or 1200px on brand container. If render's max-width is wrong, content stretches
- **Image sizing** — `<img>` at desktop may have explicit width/height that differ from mockup
- **Typography scale** — heading size at desktop may differ

### Step 2 (5-15 min): Inspect computed styles

Once the visible delta is named, use Playwright `browser_evaluate` to read `getComputedStyle()` on the diverging element. Apply the binding rule from `~/.claude/rules/measurement-vs-eye.md` — the WATCHED set MUST include the full background family + filter + mixBlendMode + pseudo-elements + parent chain. Don't conclude "match" without checking all of these. If automated measurement says "match" and your eye disputes, pixel-sample the screenshot.

### Step 3 (5 min): Compare against converter trace

```bash
# Read F1 trace events from the post-F1 run to confirm F1 fired correctly on brand at all viewports
python -c "
import json, sys, os; sys.stdout.reconfigure(encoding='utf-8')
run = 'mamas-munches-homepage-2026-05-25-225113'
trace_path = f'pipeline-state/{run}/trace.jsonl'
with open(trace_path, encoding='utf-8') as f:
    for line in f:
        ev = json.loads(line)
        if ev.get('event_type') in ('inner_blocks_fallback_universal_walk', 'inner_blocks_no_children'):
            print(ev)
"
```

This confirms whether F1 fired on brand and at what depth. If F1 fired correctly but pixel-diff stayed flat at 1440, the issue is downstream of block emission — it's in the CSS/layout layer.

### Step 4 (5 min): Diff the computed styles between mockup and render

For the element that visibly differs, capture both:
- `getComputedStyle(mockup_brand)` for the relevant properties (layout-affecting ones)
- `getComputedStyle(render_brand)` for the same set

Identify exactly which property diverges. That property is the root cause.

### Step 5: Write the diagnostic note + fix-shape menu

Append to `.claude/reports/2026-05-25-qc-council-issue-register.md` as **Section S — Desktop 1440 brand layout investigation**:

- Root cause: <one sentence — which CSS property diverges and why>
- Evidence: <2-3 lines — computed style diff, screenshot reference, trace evidence>
- Ranked fix-shape menu for Bean:
  - Option A: <minimal fix — adjust one property in one location>
  - Option B: <broader fix — add a new pipeline mechanism if Option A points to a pattern not just an instance>
  - Option C: <defer — if Option A/B would require Phase 1.5 work and current Phase 1 gate (≤30%) might be achieved by other Commit 8-18 work first>

**Do NOT implement the fix this session.** Diagnostic only. Bean picks from the menu.

**Total Step 1-5 wall-time: ~20-30 min.**

---

## Empirical state to cite

- **Latest commit:** `a757ff1c` on `main` — F1 universal-nesting + Phase 1H quote migration
- **Working tree:** 1 untracked change in `plugins/sgs-blocks/includes/lucide-icons.php` (unrelated)
- **Post-F1 brand run:** `pipeline-state/mamas-munches-homepage-2026-05-25-225113/`
- **Baseline run (pre-F1):** `pipeline-state/mamas-munches-homepage-2026-05-25-101222/`
- **Live page:** `https://sandybrown-nightingale-600381.hostingersite.com/rc-fix-verification-mamas-munches/` (page 144)
- **Mockup file:** `sites/mamas-munches/mockups/homepage/index.html`

## Post-F1 pixel-diff numbers

| Section | 375 (Δ from baseline) | 768 (Δ from baseline) | 1440 (Δ from baseline) |
|---|---|---|---|
| **brand** | **50.0% (−23.8pp WIN)** | **46.4% (−13.0pp WIN)** | **50.8% (+0.8pp — THE PROBLEM)** |

Other 6 body sections + hero + chrome were NOT re-measured in run 225113 (single-section spike). Their baseline numbers from run 101222 still stand for cross-reference.

---

## What F1 actually does (so you don't re-investigate it)

`_f1_universal_walk_direct_children(node, css_rules, variation_buf, depth)` at `convert.py:3916` — walks direct child Tag descendants of `node` (subset of div + content tags) and calls back into `walk()` on each. Called from inside `walk()` at 3 callsites when `_lift_inner_blocks` returns empty (i.e. when `blocks.parent_block` DB has no rows for the parent slug):
- Line 4047 (FR1 pattern path)
- Line 4124 (parent_block path)
- Line 4181 (standalone path)

For brand specifically: the F1 fallback now correctly walks brand's 3 `<p>` body paragraphs and emits them as nested `core/paragraph` (or sgs/text) blocks inside `sgs/quote`. That was the missing-nested-blocks fix. Validated on mobile + tablet. Did not move desktop 1440 — confirming desktop has a separate, CSS-layer cause.

Phase 1H sgs/quote ALSO shipped in same commit: render.php now branches on InnerBlocks content non-empty (uses InnerBlocks) vs legacy `body[]` attribute (uses old path). save.js → `<InnerBlocks.Content />`. deprecated.js v1 null-save shim for back-compat.

---

## Drift-correction history (don't repeat these mistakes)

1. **"Hero already at ≤1%" framing was wrong** — hero clones via hardcoded cheats at `convert.py:3557` + `3591-3608` (Section L15 of register). Architecture NOT yet proven by hero.
2. **"Wrapper-context noise floor" claim was wrong** — Bean: *"that dom wrapper stuff is BS, HTML/CSS/JS translates cleanly even through PHP"*. Diff is converter bugs, not noise.
3. **Output-only inference is a trap (2026-05-25 follow-up)** — fresh session halted on F1 claiming "brand mockup has no body paragraphs to nest" by reading only extract.json (converter output). Brand MOCKUP HTML actually has 3 `<p>` paragraphs being lost. Always verify both directions — code-shape AND source-of-truth input. See `feedback_grep_verify_handoff_diagnostic_premises.md` point 3 sub-rule.
4. **`_slot_attr_prefix` extension as universal G3 fix** — empirically falsified (only addressed 7 of 473 failures). Reverted in D71.
5. **"Phase 1 too big as one commit"** — wrong. Phase 1 is correctly large; the issue was commit cadence (now binding rule D73 — never one-commit-per-phase).
6. **References to `slot_list.py`** — file doesn't exist. Always grep-verify file paths before citing.

---

## Tooling table

| Tool | When |
|---|---|
| Playwright MCP | Live-page DOM verification + screenshot at 1440 (primary tool this session) |
| `browser_evaluate` | Read `getComputedStyle()` on diverging element |
| `/sgs-clone --section "section.sgs-brand" --deploy-target page:144 --debug-trace` | Only if you need a fresh pipeline run (probably not — run 225113 is recent) |
| `/qc-inline` | Per-file checks if you edit anything |
| `/research-check` | If you need a quick sanity-check on a CSS layout pattern |
| `/capture-lesson` | If you surface a new architectural rule |
| `/handoff` | Session close |
| `~/.claude/rules/measurement-vs-eye.md` | MANDATORY when Bean's eye disputes a "match" measurement |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs-brand` | Check brand block capability before proposing schema changes |

## 11 binding rules (still in force; full text in Section P of register)

1. Universally-applicable mechanisms (P1) — no per-block hyperfocus
2. Empirical-check before architectural conclusion (P2)
3. All div classes are blocks (P15)
4. Pipeline must achieve ≤1% deterministically (P17) — allowed manual work = block functionality + pipeline scripts only
5. Universal flat-scanning preserves hierarchy + direct-owner CSS attribution (P18)
6. Empty InnerBlocks array → walk direct child div descendants (P7) — **F1 IMPLEMENTS THIS, NOW SHIPPED**
7. One fix at a time with /verify-loop (P20)
8. Don't agree, disagree, or propose without evidence — find it first (P26)
9. Read full spec before proposing architectural fix-shape (blub.db 285) — state primitive in plain English BEFORE proposing
10. Check sgs-db block capability before evaluating (blub.db 286)
11. Phases never ship as single commits (blub.db 288)

---

## Pointers (quick-look index)

- **F1 implementation:** `convert.py:3916` (`_f1_universal_walk_direct_children`) + callsites 4047/4124/4181
- **Post-F1 brand run:** `pipeline-state/mamas-munches-homepage-2026-05-25-225113/`
- **Phase 1 plan canonical:** `.claude/plans/2026-05-25-phase-1-universal-extraction.md` (Commit 7 SHIPPED, Commits 1-6 + 8-19 pending)
- **Canonical register (~110 items):** `.claude/reports/2026-05-25-qc-council-issue-register.md` (Section S to be added this session)
- **Lesson on output-only inference trap:** `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_grep_verify_handoff_diagnostic_premises.md`
- **Measurement-vs-eye binding rule:** `~/.claude/rules/measurement-vs-eye.md`
