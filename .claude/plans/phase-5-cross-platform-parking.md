# Phase 5 - Cross-Platform Parking Entries

**USP:** Capture the strategic cross-platform emit pathway as detailed parking entries so the work is unambiguously resumable when a client / market opportunity arrives - not lost in handoff prose.
**Plan label:** [PLAN: opus]
**Docscore:** pending
**Aggregate cost estimate:** ~$0.30 (Opus inline; 3 parking entries)

**Phase success criteria (done when):**
- [ ] `.claude/parking.md` contains 3 new entries for cross-platform work: P-CP-1 /sgs-emit, P-CP-2 style translation, P-CP-3 animation translation
- [ ] Each entry has: trigger condition, full spec sketch, effort estimate, source materials, dependencies on M9 completion
- [ ] `.claude/decisions.md` records the strategic decision to defer cross-platform until M9 ships

**Entry context:**
- `.claude/parking.md` - current parking surface
- Spec 13 (Phase 1) - references SGS-BEM as cross-platform-aligned
- uimax tables: `equivalent_implementations` (Rosetta Stone), 16 stack tables, `design_tokens` (5,164), `animations` (63)

**References:**
- Conversation excerpt on cross-platform structural alignment
- Hard Rule 7 (Rosetta Stone discipline)
- Phase 1 lesson on SGS-BEM cross-platform suitability

**Tooling Index:**
| Type | Name | Used in |
|---|---|---|
| inline | Edit + Write | All steps |

---

## Steps

### Step 1 - Add P-CP-1 - `/sgs-emit` (cross-platform component emitter)
- **Model:** inline
- **Action:** Append to `.claude/parking.md` a new entry for `/sgs-emit` skill (or /sgs-clone extension)
- **Files:** `.claude/parking.md`
- **Inputs:** conversation context on emit pattern
- **Outcome:** Entry includes: what it does (emit React / RN / Flutter / SwiftUI / Web Components from a clone result via role-templates direction:generate); trigger (client request for non-WP platform; ~3-month soak after M9 production-stable); effort estimate (~8-12 hours initial scaffold + per-platform smoke); source materials (uimax stack_* tables, role-templates direction:generate entries, equivalent_implementations payloads); dependencies (M9 must be production-stable; at least 3 successful clones in the bank for test data)
- **Exec:** SEQUENTIAL
- **Deps:** Phase 4 complete (so /sgs-clone references in this entry are accurate)
- **Marker:** SESSION-START
- **Time:** 8 min
- **Tooling:** Edit
- **On-Fail:** If parking.md format conflict (frontmatter), validate before write
- **Cold-Entry:** This file + plan.md index + .claude/parking.md current state
- **Test:**
  - Happy: entry visible in parking.md with all 5 fields
  - Edge: entry id collision with existing P-CP-* - bump to next available
  - Fail: file write rejects → review formatting
  - Integration: future grep for "/sgs-emit" finds the parking entry

### Step 2 - Add P-CP-2 - Style translation (theme.json → React/Flutter/SwiftUI styles)
- **Model:** inline
- **Action:** Append parking entry for cross-platform style translation tooling
- **Files:** `.claude/parking.md`
- **Inputs:** uimax design_tokens schema (5,164 DTCG-format rows)
- **Outcome:** Entry includes: what it does (read theme.json or design_tokens; emit React style objects / styled-components, Flutter ThemeData, SwiftUI custom modifiers); trigger (P-CP-1 in flight OR client requests style-only port); effort (~6-8 hours per target platform); source (uimax `design_tokens` + Rosetta Stone payloads); dependencies (P-CP-1 not strictly required but synergistic - emit + translate ship together for full app-component parity)
- **Exec:** SEQUENTIAL
- **Deps:** Step 1 complete
- **Marker:** (none)
- **Time:** 6 min
- **Tooling:** Edit
- **On-Fail:** Same as Step 1
- **Test:**
  - Happy: entry visible
  - Edge: design_tokens table count drift since handoff (expect 5,164) → cite "as of 2026-05-10" for clarity
  - Fail: same as Step 1
  - Integration: cross-link to P-CP-1

### Step 3 - Add P-CP-3 - Animation translation (uimax animations → React-spring/Flutter/SwiftUI)
- **Model:** inline
- **Action:** Append parking entry for animation cross-platform translation
- **Files:** `.claude/parking.md`
- **Inputs:** uimax `animations` table (63 rows, post-2026-05-10 5-column migration)
- **Outcome:** Entry includes: what it does (translate CSS keyframes captured in uimax animations to React-spring / Flutter AnimationController / SwiftUI withAnimation form via equivalent_implementations); trigger (P-CP-1 + 2 in flight, animation-rich app port requested); effort (~4-6 hours per platform target); source (uimax `animations` rows already populate `sgs_animation_attribute` + `equivalent_implementations`); dependencies (animations table needs ≥30 cross-platform-mapped rows by then; M9 will surface more via /uimax-scrape-animation runs)
- **Exec:** SEQUENTIAL
- **Deps:** Step 2 complete
- **Marker:** (none)
- **Time:** 6 min
- **Tooling:** Edit
- **On-Fail:** Same
- **Test:**
  - Happy: entry visible
  - Edge: animations table grew between Phase 5 plan and execution - citation flexes
  - Fail: same
  - Integration: cross-link to P-CP-1 and P-CP-2

### Step 4 - Add architectural decision to decisions.md
- **Model:** inline
- **Action:** Append `.claude/decisions.md` (create if missing) with: "2026-05-10 - defer cross-platform emit work (P-CP-1/2/3) until M9 production-stable. Rationale: Rosetta Stone infrastructure is structurally ready (uimax stack tables populated, equivalent_implementations on every artefact, design_tokens DTCG-format, animations migrated). Cost is the engineering pass per platform target. M9 first - emit-pathway second."
- **Files:** `.claude/decisions.md` (existing or new)
- **Inputs:** Steps 1-3 outcomes
- **Outcome:** decisions.md has the entry; future sessions reading it understand the deferral rationale
- **Exec:** SEQUENTIAL
- **Deps:** Steps 1-3 complete
- **Marker:** HANDOFF
- **Time:** 4 min
- **Tooling:** Edit (or Write if creating)
- **On-Fail:** Validate frontmatter if creating new file
- **Test:**
  - Happy: decisions.md contains the dated entry
  - Edge: decisions.md doesn't exist → create with frontmatter doc_type: decisions
  - Fail: write conflict → re-read and retry
  - Integration: closes Phase 5

---

## QA Gate - Parking entries land + cross-linked
- **Model:** haiku
- **Exec:** SEQUENTIAL
- **Deps:** Steps 1-4 complete
- **Check:** `grep -c "P-CP-[123]" .claude/parking.md` returns 3 AND `grep -c "2026-05-10" .claude/decisions.md` returns ≥1
- **Pass:** Both true
- **Fail:** Re-run failing step
- **Marker:** QA

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Should the parking entries name a specific client / context that would trigger them, or just keep them as "when ready"?
  - **Options:** A) Keep as "client requests non-WP platform" / B) Add specific use cases (e.g. "Bean & Tub mobile app", "any Indus Foods mobile reskin") / C) Both - vague trigger + specific named use cases as examples
  - **Recommendation:** C
  - **Why:** Specific triggers help future Bean recognise the moment; vague backstop captures unforeseen
  - **Cost of wrong choice:** A causes deferred resumption ambiguity; B may name a use case that doesn't materialise
  - **Who decides:** Bean

### Pre-emptive decisions

- **Decision:** Should the entries point at Spec 13 directly or stand alone?
  - **Recommendation:** Cross-reference Spec 13 - the SGS-BEM convention is what makes cross-platform feasible at all; future sessions resuming the parking work need to know that

- **Decision:** Should there also be a P-CP-4 covering the lingua-franca-conversion-on-scrape work (which is in Spec 13 sub-rule but not yet implemented)?
  - **Recommendation:** No new parking entry - that work is Phase 4 territory (`/sgs-extraction` + `/uimax-scrape` etc. get the rule). It lands as part of the rollout, not as deferred work.