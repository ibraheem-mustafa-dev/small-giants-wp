---
doc_type: report
title: Doc-vs-reality audit — .claude truth docs
date: 2026-08-12
---

# Doc-vs-reality audit — `.claude/` truth docs (2026-08-12)

**Method:** 4 parallel read-only auditors, each checking a subset of docs against live code, the SGS database, `decisions.md`, and git — per `/doc-audit`. Plus `/docscore` structural grading on every doc. Nothing was edited; this is the findings register for sign-off.

**Ground truth used:** branch `main`, HEAD `dfc16d06`, D-ceiling `D590`, DB stats (Blocks 205 total / 83 `sgs/*`-prefixed / 144 dynamic, attrs 2751, patterns 57, hooks 5494).

---

## 1. CRITICAL — the "current front" doc contradicts itself

`LEDGER.md` is meant to be the ONE doc a fresh session reads to know where the project stands. Its own status header is now stale against its own body text:

| Field in LEDGER's header | Says | Actually | Where the correct value already sits |
|---|---|---|---|
| HEAD | `a637e984` | `dfc16d06` — 13 commits later | LEDGER's own session-14 narrative, lower in the same file |
| D-ceiling | 588 | 590 | LEDGER's own ✅-tagged sections name D589 and D590 |
| shared-panel-schema gate | "advisory... 26 untriaged findings" | Promoted to BLOCKING, all 26 closed (D589) | LEDGER's own "✅ All 26 shared-panel-schema findings — CLOSED" section, 30 lines below |
| "D587 is this session" | — | D590 is | same pointers table |

**Why it matters:** anyone (including me next session) reading only the header gets a picture that's 2 D-numbers and 13 commits stale, while the truth is sitting a few paragraphs down in the same file. This is exactly the failure mode LEDGER.md exists to prevent.

**Fix:** mechanical — update 4 header fields to match the file's own newer content. 2 minutes.

---

## 2. WRONG / DEAD-REF — false or broken, safe to correct

| Doc | Claim | Reality |
|---|---|---|
| `CLAUDE.md` (root) | Delegation table lists `code-reviewer` agent | No such agent registered (roster has `design-reviewer`, `wp-sgs-developer`, etc. — not `code-reviewer`) |
| `CLAUDE.md` (root) | "`/goals` (re-anchor)" listed as a tool | No `/goals` command exists — `.claude/goals.md` is a file, not a slash command |
| `CLAUDE.md` (root) + `specs/02-SGS-BLOCKS.md:308` | Icon resolver at `converter_v2/icon_resolver.py` | `converter_v2/` was deleted at D276 (2026-07-05) — CLAUDE.md says so itself elsewhere. Real path: `converter/services/icon_resolver.py` |
| `CLAUDE.md` (root) | "extends STOP-26" | No STOP-26 entry exists in `STOP-CATALOGUE.md` — even the doc-council notes from 2026-06-06 flagged it as never located |
| `CLAUDE.md` (root) | `sgs-update-v2.py` stage-choice cited at `:6396`, docstring `1-63` | Actual lines `:6539` and `1-70` — drifted |
| `architecture.md` | Tech-debt row: `navigation ref="4"` bug in `header.html` | `header.html` is now a one-line pattern reference — no `wp:navigation`/`ref` attribute exists any more |
| `dev-setup.md` | "Unit tests: `converter_v2/tests/`, run with pytest" | `converter_v2/` doesn't exist (same D276 deletion) — whole bullet is dead |
| `dev-setup.md` | `assign-canonical.py` at `scripts/assign-canonical.py` | Real path is `scripts/behavioural-analyser/assign-canonical.py` |
| `mistakes.md:125` | Link to `memory/llm-eyeball-clone-verification-unreliable.md` | Wrong filename — real file is `feedback_llm_eyeball_clone_verification_unreliable.md` |

**Fix:** all 9 are one-line corrections. ~10 minutes bulk.

---

## 3. STALE — count drift / outdated snapshots

| Doc | Claim | Live value |
|---|---|---|
| `architecture.md` (×3 places) | "79" / "74" / "69" SGS blocks | 205 total, 83 `sgs/*`-prefixed |
| `architecture.md` vs `dev-setup.md` | Container roster "28" vs "29" | **Disagree with each other**; live DB shows 36 rows with `container_kind` populated |
| `dev-setup.md` | Gate A fixture count "43" | 30 live fixture files |
| `goals.md` | Header "Last updated: 2026-06-07" | Body has an entry dated 2026-07-29 — the header is 7 weeks behind its own content |
| `goals.md` | Track B roster: Mama's, Indus, **CMX Group**, Snooza, SGS Studio v2 | No `CMX Group` folder exists in `sites/`; meanwhile `snooza-chair` and `small-giants-studio-v2` both have their own CLAUDE.md and recent activity but read as generic entries, not confirmed against this roster |
| `goals.md` | Entire active-goals list | The single biggest current body of work — the Spec 35 / capability-routing / tier-object migration track (D579–D590, its own governing spec + strategic plan) — **isn't listed at all** |
| `CLAUDE.md` (root) | Active clients: mamas-munches, indus-foods, **helping-doctors** | `helping-doctors` has no CLAUDE.md and hasn't been touched in ~3 months; `snooza-chair` and `small-giants-studio-v2` (both have CLAUDE.md, recently active) aren't listed |
| `parking.md` | "61 entries total" | Actual 60 — the self-count script is catching its own template example |
| `parking.md` | `P-DECISIONS-MD-OVER-LINE-CAP`: "6,961 lines, re-measured 2026-08-09" | Now 9,476 lines (+36% in 3 days) — this is already an open parked item, just needs re-measuring, not a new decision |
| `STOP-CATALOGUE.md` | Front-matter `last_updated: 2026-07-17` | Newest entry inside is dated 2026-08-11 — front matter is 3+ weeks behind the body |
| `architecture.md` | Spec 32 framed as "pilot scope (container + button)" | 30+ recent decisions (D560–D590) show a framework-wide rollout well past pilot |
| `architecture.md` | Tech-debt row: "Table of Contents broken, root cause unknown since session 12" | A specific fix for this is already documented in decisions.md — the row reads as dated leftover language |
| `dev-setup.md` | "`check-hardcoded-render-defaults.js` PLANNED, NOT yet wired" | Confirmed wired and blocking in `package.json`'s `prebuild` |
| `dev-setup.md` | Build-process section names ~3 prebuild gates | `package.json`'s actual `prebuild` chain runs ~40 gates — the doc badly undersells what actually blocks a build |
| `dev-setup.md` | Deploy section documents 4 flags | Missing `--payload`, `--takeover`, `--dry-run`, and — safety-relevant — the canary ownership-contention refusal behaviour that LEDGER.md says is now part of the mandated safe-deploy path |

**Fix:** mostly one-line number/date swaps. The goals.md gap (missing Spec 35 track) and the client roster mismatches need your confirmation, not a mechanical fix — see §5.

---

## 4. Process violations — parking.md / mistakes.md structure

Project rule: parking entries need `**Status:** · **Bucket:** · **Parked:**`, one of 6 legal buckets, and must move to the archive the moment they're resolved. mistakes.md is meant to be a keyword-stub index, capped near 30 entries.

- **`mistakes.md` is 49 entries** against its own ~30 cap — already self-flagged in its own header as an owed archive sweep, still not done.
- **`mistakes.md` entries aren't actually stubs** — most carry 5–7 lines of inline "Evidence"/"Rule" prose rather than a one-liner + link, which is the opposite of what the doc's own convention describes.
- **`P-MAMAS-PRODUCT-DRAFT-NOT-BEM`** is missing its required Bucket and Parked fields entirely.
- **Near-duplicate parking entries**: `P-MAMAS-PRODUCT-DRAFT-NOT-BEM` and `P-PRODUCT-PAGE-MOCKUP-NOT-SGS-BEM` describe the identical defect on the identical file, with two different slugs and two contradicting framings (one says "needs a decision", the other says "just needs a mechanical HTML edit").
- **`P-NAV-DROPDOWN-STACKING-IN-PAGE-CONTENT`** has `**Bucket:** blocks` — "blocks" isn't one of the 6 legal bucket names.
- The doc's physical layout has **11 `##` headings**, not the documented 6 — including one empty "Uncategorised" heading with zero entries under it.
- The enforcement script (`handoff-preflight.py`) genuinely checks Status conformance and archive-on-resolve (verified by reading its source, not just its docstring) — but it does **not** check the Bucket taxonomy at all, despite parking.md claiming it does.

**Fix:** the duplicate-merge and mistakes.md archive sweep are judgment calls (which framing to keep, what to cut) — flagging for your go, not auto-fixing. The Bucket-field fixes are mechanical.

---

## 5. Needs your judgment (not a mechanical fix)

1. **Client roster** — is `helping-doctors` still an active build, or should it drop off the "current client builds" list in favour of `snooza-chair` / `small-giants-studio-v2`? Is "CMX Group" a real client with a folder I'm missing, or should it be removed from `goals.md`'s Track B?
2. **goals.md missing the biggest current track** — should I add a Goal entry for the Spec 35 / capability-routing work, pointing at its governing spec + plan?
3. **parking.md duplicate merge** — which framing survives for the mamas-munches BEM-draft issue: "needs a decision" or "mechanical fix, no decision needed"? (Cross-reference notes added to both entries so neither gets acted on in isolation until this is settled.)
4. **mistakes.md over-cap** — run the archive sweep now (mechanical once you say go) and separately decide whether the convention should change from "pure stub" to "short working summary", since every entry currently breaks the stub rule.
5. **2 more genuinely-dead links in mistakes.md** (found while verifying fix #9 in §2, not just a docscore quirk — confirmed by diffing every linked filename against what's actually on disk): `feedback_chained_shell_commands_mask_a_failed_stage.md` and `feedback_shared_wrapper_generic_attr_collides_with_block_vocabulary.md` don't exist under any name. Either the underlying lesson was never written up (recreate from the stub's own inline text) or it should be dropped — your call, not mine to guess.

---

## 6. Structural (docscore) — separate from correctness

| Doc | Grade | Issue |
|---|---|---|
| `CLAUDE.md` (root) | B+ (89.5%) | 309 lines vs an 80-line template cap; missing a completion-rule line |
| `LEDGER.md` | A (95%) | 321 lines vs a 150-line cap |
| `decisions.md` | B+ (86.3%) | 9,477 lines vs a 600-line cap (already tracked as `P-DECISIONS-MD-OVER-LINE-CAP`, re-drifted — see §3), 4 hedging phrases ("Maybe" ×2, "kind of") |
| `parking.md` | B (80%) | 4 TODO/TBD stub markers, 2 hedging phrases |
| `mistakes.md` | A- (94.3%) | Docscore's own link-checker flagged 9 broken relative links — the auditor spot-checked 9 *different* links and found those genuine (only 1 real dead link, §2). The two checks used different link samples; recommend re-running docscore after the §2 fix rather than trusting either count as final. |
| Everything else (`architecture.md`, `dev-setup.md`, `goals.md`, `STOP-CATALOGUE.md`, `.claude/CLAUDE.md`, `specs/README.md`) | A (100%) | — |

`CLAUDE.md` (root) is the target for the `/claude-md-management:revise-claude-md` request — it's carrying 309 lines of load-bearing project rules against an 80-line generic template. Recommend NOT blindly trimming to 80 (this project's density is deliberate — dense CLAUDE.md, thin working-area manifest, per the project's own doc-op standards) but DO fix the 9 correctness issues above and add the missing completion-rule line.

---

## 7. Non-issue, flagged for transparency

One background auditor's report tripped the harness's "instruction-shaped pattern" heuristic (it quoted `.claude/settings.json` contents while confirming a hook was wired). Reviewed the content — it's an ordinary audit finding, nothing resembling an injection attempt. No action needed.

Also: the 16h-old git stash (`other-track-decisions-wip-2026-08-11`) turned out to already be fully present in the committed `decisions.md` (D581/D582/D585) — it's superseded, not missing work. Not touching it without your say-so, just flagging it's safe to drop whenever you want.

---

## Status: mechanical fixes applied (2026-08-12)

All of §1 (LEDGER header), §2 (9 dead/wrong refs), and the mechanical half of §3/§4 (count/date corrections, missing parking Bucket/Parked fields, illegal Bucket value, STOP-CATALOGUE front-matter date + 2 dead-ref resolution notes) are done — 9 files touched, `git diff --stat` shows 54 insertions / 44 deletions across correctness-only edits (no line-ending rewrites). `handoff-preflight.py --check` still passes all 9 gates after the edits. Re-ran `/docscore`: root `CLAUDE.md` A- → A (95%, only remaining fail is the deliberate 80-line cap); `mistakes.md` link count 9 → 8 broken (1 fixed; the other 8 investigated directly, not just re-scored — see §5 item 5).

**Not touched — the 5 items in §5** need your call before I act: client roster, goals.md's missing Spec 35 track, the parking.md duplicate merge, the mistakes.md archive sweep + convention question, and 2 more genuinely-dead mistakes.md links found while verifying the first fix.

**Not touched — decisions.md's own docscore "hedging"/"stub" flags:** these are already documented inside `parking.md` as false positives (quoted titles/historical prose, not real hedging or stubs) — no action needed, left as-is.
