---
doc_type: report
project: small-giants-wp
title: "Spec 22 → Spec 31 merge blueprint (3-agent inventory synthesis)"
created: 2026-06-30
status: blueprint-ready
---

# Spec 22 → Spec 31 merge blueprint

Synthesised from 3 parallel inventory agents (R-rules verbatim+citations; FR inventory+built-status+citations; 31-vs-22 dedup/contradiction). This is the authoring spec for the merge.

## Decisive finding — the renumber is NOT cleanly possible

- **~1,098 `FR-22-*` citations across ~163 files; the most-cited rules (R-22-1, R-22-9) have ~100 comments in `convert.py` alone + ~53 in `db_lookup.py`.**
- **`convert.py` is FROZEN (D-MODULAR, byte-identical) — its ~150 R-22/FR-22 references CANNOT be edited.** A renumber would leave frozen/legacy code on R-22 and docs/new-engine on R-31 = a permanent split.
- **Gates are NAMED after the rules:** `check_no_mirror.py` IS the R-22-15 anti-mirror gate (6 refs); `pipeline-stage-gate.py`, `check_converter_source.py` cite it. Renaming risks the gate wiring.
- Active-code ~292 hits (60 files) · active-doc ~250 (35 files) · historical ~556 (68 files, leave as-is).

**Recommendation:** KEEP the `R-22-*`/`FR-22-*` IDs as stable identifiers, now *defined in* the merged Spec 31 (the prefix is an identifier, not a file-location claim). Zero citation breakage, no frozen-code conflict, gates intact. Add a Spec 31 note: "These rules/FRs were authored in the now-archived Spec 22; their IDs are retained as stable identifiers." This achieves the real goal (ONE unified spec) at zero risk. (If a true renumber is still wanted, it is a dedicated, verified refactor — not part of the content merge.)

## Top contradictions to resolve (author these carefully)

- **C1 widthMode/customWidth RETIRED (D230/D231):** purge EVERY stale Spec 22 mention; state the 3-layer `align`/`maxWidth`/`contentWidth` model ONCE (Spec 31 §2/§3.A). Keep one archive line.
- **C2 sgs/container default vs loud-failure:** carry FR-22-4 forward AS LAW (container = default; name-match hero/trust-bar = exception); delete any residual "no-match = LOUD FAILURE" phrasing. (Already corrected in Spec 31's DEFAULT-IS-CONTAINER box.)
- **C3 sourceMode='bound':** banned (R-22-15b); both specs agree — single statement.
- **C4 lift-function count:** 8 (council-verified), not 5.
- **C5 (BIGGEST) content-fork home-of-record:** Spec 31 §3.B is an *acknowledged-incomplete* restatement of FR-22-2/2.1/2.2/2.5. ABSORB the full FR-22-2 family as the canonical mechanism — it closes Spec 31's own G1–G5 open gaps (token-match predicate = FR-22-2.1 Tier B; array = FR-22-2.5; scalar-vs-child = FR-22-2.2 role-exclusion). Do NOT drop as duplicate. Preserve the "one authoritative fork, two call-sites (CSS D1 + content)" cross-reference.

## CARRY-FORWARD (unique to 22 — absorb into Spec 31, with target §)

1. **FR-22-3** — 3 permitted walker exceptions (atomic-tag swap / top-level chrome-skip / top-level container-wrap) + "4th requires amendment" → new §3 walker-contract sub.
2. **FR-22-2.1/2.2** — two-tier `equivalent_block_for` derivation + role-exclusion allowlist (5 content-bearing + 16 styling/behaviour roles) → §3.B (closes G1/G4).
3. **FR-22-2.5** — array/repeater resolution → §3.B B4 (currently a stub).
4. **FR-22-4 / 4.1** — section base = sgs/container (LAW) + the universal fold/recurse precedence (#1–#5, incl. the content-leaf exception that prevents "container wrapping raw text") → §2/§3.
5. **FR-22-5.1** — inherited/absent-value resolution (ancestor-chain + LTR default) → §3.A.
6. **FR-22-6 / 6.1** — hybrid render.php migration recipe + parallel-session protocol → new build §.
7. **FR-22-11 + R-22-15(a)** — non-sgs pass-through + BEM-class-preservation-is-last-resort warning → §3.B.0.
8. **FR-22-15** — capability-rank tiebreaking (multi-candidate BEM) → recognition (Stage 2).
9. **FR-22-16** — voter `blocks.tier='class-section'` signal → §1/§3 recognition.
10. **FR-22-20** — full variant detection (variant_slots set-difference, THIS-run-extract not stored attrs, $is_split ban) → §2 Axis-4 (expand).
11. **FR-22-21.1/.2** — composite-mirror rule + /sgs-update Stage-11 auto-propagation → new build §.
12. **Appendix A** walker pseudocode + **Appendix B** atomic_tag_map (`blocks.replaces` reverse-walk) → reference appendices.
13. **Binding rules R-22-4/5/7/8/10/12/13/14** not yet in Spec 31 → §6 (note R-22-4 pixel-diff DEMOTED to diagnostic per §7b; R-22-14 no-legacy-fallback is load-bearing Bean-P1).

## R-22 verbatim text (for harmonising into Spec 31 §6)

- R-22-1 DB-first, no hardcoded dicts (only `SKIP_TOP_LEVEL_TAGS`); roles in `roles` table.
- R-22-2 BEM is the only recognition signal; tag = shape only (except atomic-tag swap).
- R-22-3 Three permitted walker exceptions, no others; a 4th needs a spec amendment.
- R-22-4 Pixel-diff gates every commit. **(DEMOTE to diagnostic — §7b live-vs-draft + Bean eye is the closing gate.)**
- R-22-5 Phases never ship as single commits.
- R-22-6 Output-only inference is a trap — verify mockup HTML + extract.json + live DOM.
- R-22-7 Council fix-shapes are hypotheses, not specs — empirical pre/post before dispatch.
- R-22-8 Schema enumeration before "missing X".
- R-22-9 Universal mechanisms, no per-block hyperfocus.
- R-22-10 Read the full spec before proposing a fix-shape.
- R-22-11 Verify rendered output vs the DRAFT, not internal metrics (structure-match alone ≠ pass).
- R-22-12 QC gates are structural, not prompt.
- R-22-13 Bean visual sign-off is co-authoritative (numbers alone don't close; eye alone doesn't close).
- R-22-14 FR-22-6 migrations never carry server-side legacy fallback hacks.
- R-22-15 No mirror emit: (a) no draft-BEM-element className; (b) no sourceMode='bound'/echo-$content; (c) no D2 when a D1 destination exists.

## HISTORICAL — drop to one archive pointer

Spec 22 §5 (survives/retires), §7 (phases 0–5), §8 (cross-doc impact), §10 (risks), §11 (success criteria), §12 (time estimate), §15 (council findings), §16 (ratification gate); built_status tags (status single-sourced via state.md); FR-22-7 ≤5% gate framing (demoted), FR-22-9 uimax oracle (retire/down-scope), FR-22-10 (N/A), FR-22-2.3 (already retired), FR-22-19 (retirement-pending, code removal owed). One line: "Implementation history, phases, risks, council findings, ratification → archived Spec 22 §5/§7/§10/§15/§16."

## Author's note on style (Bean: harmonise into Spec 31's voice)

Rewrite absorbed content in Spec 31's format — numbered §-sections, the L1–L4 layer / 4-axis model, STATUS notes, plain-English-then-technical — NOT raw FR blocks with PASS/FAIL/built_status. The FR content becomes mechanism prose inside the relevant §; the binding rules become a consolidated §6 list.
