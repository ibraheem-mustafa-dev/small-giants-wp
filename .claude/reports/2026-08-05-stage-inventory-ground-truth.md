# Stage inventory — ground truth (cloning pipeline)

**Date:** 2026-08-05
**Target:** `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (3,225 lines) + `orchestrator/` + `recogniser/` helpers
**Method:** code-read only. Every claim carries a `file:line`. Docstrings/comments were treated as untrusted and verified against code. Nothing was executed; no code changed.
**Line numbers** are as of the working tree at audit time (branch `main`).

---

## 0. True execution order (from `main()`)

| # | Step | Call site |
|---|---|---|
| pre | arg parse + draft-mode autonomy auto-skip | `sgs-clone-orchestrator.py:2364`, `:2486` |
| pre | client auto-derive | `:2495` → `_derive_client_from_mockup_path:2272` |
| pre | **FR-33-12 theme-snapshot freshness gate** | `:2509` → `_freshness_gate:2294` |
| pre | run_id + run_dir creation, `_RUN_DIR` global | `:2511-2521` |
| 0 | theme cache (theme.json + client snapshot overlay) | `:2539-2572` |
| 0.1 | BEM lint | `:2574` → `stage_0_1_bem_lint:117` |
| 0.5 | token lint | `:2575` → `stage_0_5_token_lint:189` |
| 0.7 | CSS lift / 4-destination router | `:2584` → `stage_0_7_css_lift:390` |
| 1 | boundary (voter) + lingua-franca enrichment | `:2599` → `stage_1_boundary:1007` |
| 2 | match (confidence matrix + wp-blocks cross-check) | `:2604` → `stage_2_match:1068` |
| 3 | slot list | `:2611` → `stage_3_slot_list:1167` |
| 4 (+4.5/5/7 inline) | extract → convert → serialise | `:2615` → `stage_4_5_6_7_8_extract:1276` |
| 9 (+9b/9c2/9d/9e) | report / buckets / gap writers | `:2619` → `stage_9_report:2034` |
| Gate | R-31-15 anti-mirror | `:2660` → `orchestrator/pipeline-stage-gate.py` |
| 4i | media sideload | `:2712-2796` |
| 4j | wp-blocks markup validation | `:2806-2847` |
| 9c | surface per-severity logs | `:2868` → `_surface_logs:663` |
| 10 | per-page deploy | `:2879-2977` → `orchestrator/upload_and_patch.py` |
| 11.6 | computed-parity | `:3001-3061` → `parity/computed-parity.js` |
| — | early return if `--skip-autonomy-gate` | `:3063-3068` |
| — | mirror artefacts to Phase-5 layout + `orchestrator_main.run()` | `:3086-3139` |
| +REG | pattern registration | `:3160-3184` |
| 4k | critical-fix-verification harness | `:3194-3209` |
| — | final `_surface_logs` in `finally` | `:3225` |

**Documented order (Spec 31 Appendix D, `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md:747-770`) matches the real order.** Divergences are in *content*, not sequence — see §4.

---

## 1. Per-stage inventory

### Pre-stage — FR-33-12 freshness gate
1. `_freshness_gate` — `sgs-clone-orchestrator.py:2294`, called `:2509`.
2. Plain English: refuses to run at all if the client's `theme-snapshot.json` wasn't generated from the current draft, because the converter snaps colours against it.
3. Inputs: `args.mockup`, `args.client` (`:2509`), `sites/<client>/theme-snapshot.json`.
4. Outputs: none (raises/exits).
5. Consumers: n/a — it is a control-flow gate.
6. **VERDICT: LOAD-BEARING** (can abort the whole run before any artefact exists).

### Stage 0 — theme cache
1. Inline in `main()` — `:2539-2572`.
2. Plain English: loads the framework `theme.json` and merges the client's snapshot over it into one in-memory dict.
3. Inputs: `theme/sgs-theme/theme.json` (`:2552`), `_client_variation_path()` (`:2548`, fn at `:171`).
4. Outputs: `run_ctx["theme_json"]` (`:2571`), one stdout line (`:2572`).
5. **Consumers — enumerated:**
   - `stage_0_7_css_lift(theme_json=...)` (`:2586`) → `css_router.route_css(theme_json=...)` (`:444`). **`theme_json` is a declared parameter of `route_css` and is never referenced in the body** — only occurrence in `orchestrator/css_router.py` is the signature at `:376`.
   - `stage_4_5_6_7_8_extract` reads it (`:1314`) and mutates it via `_reflect_new_token_in_theme_json` (`:1616`, fn at `:729`). The mutation touches an in-memory dict only (`:742-749`); no disk write.
   - `converter.entry.seed_theme_json` (`:1346`) is a **documented no-op** — `converter/entry.py:94-98`.
   - The converter loads its palette **independently from disk**: `converter/services/styling_helpers.py:253` reads `sites/<client>/theme-snapshot.json` directly.
6. **VERDICT: DECORATIVE.** No reader consumes the cached dict or its mutations. (Removing it changes only the `[stage-0]` stdout line — *provided* the two no-op seed calls are removed with it.)

### Stage 0.1 — BEM lint
1. `stage_0_1_bem_lint` — `:117`.
2. Plain English: checks every CSS class in the draft is SGS-BEM shaped; in `strict` mode it stops the run.
3. Inputs: `args.mockup`, `args.mode`; loads `lints/bem-lint.py` (`:129`).
4. Outputs: `run_dir/stage-0.1-bem-lint.json` (`:148`), trace event (`:150`), stdout, `sys.exit` on strict+violations (`:167`).
5. **Consumers:** the `sys.exit` at `:167` is the only load-bearing effect. **NOTHING CONSUMES `stage-0.1-bem-lint.json`** — repo-wide grep for `stage-0.1-bem-lint` returns only the write site (`:148`).
6. **VERDICT: LOAD-BEARING in `--mode strict` (halt), DECORATIVE artefact.** In `draft`/`legacy` mode the whole stage is decorative.

### Stage 0.5 — token lint
1. `stage_0_5_token_lint` — `:189`.
2. Plain English: scans inline styles for colours/spacings that aren't design tokens and proposes new token names.
3. Inputs: `args.mockup`, `args.mode`, client variation path (`:207`); loads `lints/token-lint.py` (`:206`).
4. Outputs: `run_dir/stage-0.5-token-lint.json` (`:241` legacy shim / `:282` additive), trace events, stdout.
5. **Consumers: NOTHING CONSUMES the artefact** — grep for `stage-0.5-token-lint` returns only the two write sites. In the default *additive* path there is no `sys.exit`; the halt at `:258` only exists on the `no_new_tokens=True` branch, and `no_new_tokens` is **never passed** by `main()` (`:2575` passes only `mode`, `run_dir`, `client`) — no `--no-new-tokens` flag exists in the parser.
6. **VERDICT: DECORATIVE** (the strict-halt branch at `:258` is unreachable from the CLI).

### Stage 0.7 — CSS lift (four-destination router)
1. `stage_0_7_css_lift` — `:390` (fallback `_stage_0_7_verbatim_fallback:498`; collector `_collect_mockup_css:335`).
2. Plain English: gathers every stylesheet the draft uses (inline `<style>` **and** linked `.css` files) and sorts each rule into one of four destinations — global, typed-attribute, page-scoped wrapper, gap-candidate.
3. Inputs: `args.mockup` (`:422`), `theme_json` (`:2586`, unused downstream — see Stage 0), `page_id` derived from `--deploy-target` (`:2577-2583`).
4. Outputs:
   - `run_dir/variation-d0-d2.css` (D0+D2+D3-fallback) — `css_router.write_variation_css` (`:462`, writer at `orchestrator/css_router.py:910`).
   - D3 rows into `sgs-framework.db.attribute_gap_candidates` (`:480`).
   - `run_dir/stage-7.json` via `write_artefact(run_dir, 7, "css-lift", …)` (`:494`).
5. **Consumers — enumerated:**
   - **Stage 4 (in-process, markup-affecting):** `_client_variation_css_path(...)` read + G2 merge into `_section_css` (`:1478-1487`) → passed to `convert_section(css=…)` (`:1537`). This is the **only channel** by which a draft's *linked* `.css` files reach the converter — `_style_blocks` at `:1465` only collects inline `<style>`.
   - `orchestrator/upload_and_patch.py:242` — reads it, but **does not deploy it** unless `SGS_EMIT_D2_PAGE=1` (`:243-256`, STOP-52).
   - `orchestrator/check_no_mirror.py:276` (out-of-process gate).
   - `cheat-gate/check_d2_when_d1.py:152` (out-of-process gate).
   - **D1 bucket:** no consumer. `route_css`'s `d1` result is not read at `:455-458`, and no file under `converter/` imports `css_router` (grep across `converter/**/*.py` returns one *comment* at `converter/resolvers/grid.py:115`). Spec 31 line 70 already records this ("Stage 0.7 routes CSS to D1 but Stage 4 no longer consumes it").
   - `run_dir/stage-7.json`: **NOTHING CONSUMES IT.** (`simple_html_review_report.py:199-203` reads stage-1/2/3/4 only; `staged_merge` mirrors stages 1,2,3,4,9 only — `:3093-3099`.)
6. **VERDICT: LOAD-BEARING** (via the G2 merge and the D3 DB write). Sub-parts: D1 = **DEAD**, `stage-7.json` = **DECORATIVE**.
   - Naming hazard: this stage writes `stage-7.json`, colliding with the canonical stage-7 = "serialise" slot (`orchestrator/staged_output.py:49`).

### Stage 1 — boundary (per-section convention voter)
1. `stage_1_boundary` — `:1007`.
2. Plain English: finds the top-level sections of the draft and records each one's selector, id and class list.
3. Inputs: `args.mockup`, `--section`/`--auto-section` (`:1011-1019`); subprocess `recogniser/per-section-convention-voter.py`.
4. Outputs: `run_dir/voter.json` (`:1010`, rewritten enriched at `:1047`), `run_dir/stage-1.json` (`:1052`), return dict.
5. **Consumers — enumerated:**
   - `stage_2_match(boundary_output)` — iterates `boundaries` (`:1085`).
   - Stage 4 re-reads `voter.json` from disk (`:1307-1309`) and uses `selector` (`:1355`), `class_signature` (`:1371`, `:1444`), `section_id` (`:1495`).
   - `stage_9b_autonomy_chain` boundary index (`:1846`, `_autonomy_boundary_index:1827`).
   - Stage 9 router subprocess `--boundary voter.json` (`:2060`).
   - `simple_html_review_report.py` `--boundary` (`:2172`) and its stand-alone path `stage-1.json` (`:199`).
   - Mirrored to `stage-1-boundary.json` for `staged_merge` schema validation (`:3094`, `orchestrator/staged_merge.py:118`).
   - `register_patterns.register_run(boundary_artefact=…)` (`:3181`, consumed at `orchestrator/register_patterns.py:452-454`).
   - Stage-1 **enrichment fields** (`source_convention`, `primary_sgs_bem`, `equivalent_implementations`, `gap_candidate_classes`) added at `:1044`: grep across `scripts/**/*.py` finds producers only (`orchestrator/lingua_franca.py:292-316`) — **no reader**. The only load-bearing part of that module is `_is_sgs_bem_canonical` (`orchestrator/stage1_boundary_hook.py:115`), called directly at `:1374`.
6. **VERDICT: LOAD-BEARING.** Enrichment sub-step: **DECORATIVE**.

### Stage 2 — match
1. `stage_2_match` — `:1068`.
2. Plain English: scores which SGS block each section looks like, and optionally lets the `wp-blocks` CLI overrule that score.
3. Inputs: Stage-1 `boundaries` (`:1085`); `recogniser/confidence-matrix.py` via `confidence_matrix()` (`:1080`, loader `:587`); `~/.claude/hooks/wp-blocks.py match` (`:1098`, `_wp_blocks_match:1060`).
4. Outputs: `run_dir/stage-2.json` (`:1139`), later copied to `run_dir/match.json` (`:2054`), return dict `{"matches": [...]}` with keys `boundary_id, section_id, block_name, confidence, alternatives, ranked_candidates, wp_blocks_match, wp_blocks_score, chosen_source` (`:1122-1132`).
5. **Consumers — enumerated (8 sites, 3 processes):**
   | # | Site | Process |
   |---|---|---|
   | 1 | `stage_3_slot_list` iterates `matches` — `:1185` | orchestrator |
   | 2 | **Stage 4 abort on empty `matches`** — `:1295-1300` (writes a failed stage-4 artefact with `block_markup: ""`) | orchestrator |
   | 3 | **Stage 4 iteration source** — `for m in matches:` `:1351`; `confidence == 0 and not _cv2_eligible` skips the section entirely `:1408-1436` | orchestrator |
   | 4 | Stage 9 coverage `block_by_bid` — `:2190-2191` | orchestrator |
   | 5 | Stage 9 `_harvest_functionality_gap_elements(mockup_path, match)` — `:2142` (fn `:876`) | orchestrator |
   | 6 | `leftover-bucket-router.py --match` — `:2061`; used by `route_unrecognised_section` (`:220`), `route_structural_mismatch_or_orphan` (`:688`), `route_wrong_block_type` (`:987`), `route_structural_mismatch` (`:1048`) | subprocess |
   | 7 | `simple_html_review_report.py --match` — `:2173`; stand-alone read of `stage-2.json` at `:200` | subprocess |
   | 8 | mirrored to `stage-2-match.json` for `staged_merge` schema validation — `:3095` | in-process module |
   Passed-but-unused: `stage_9b_autonomy_chain(boundary, match, …)` declares `match` (`:1831`) and never references it in the body (`:1835-1975`) — dead parameter.
6. **VERDICT: LOAD-BEARING.**
   **Nuance (this is where the earlier audit went wrong twice):** the *block choice* (`block_name`) never reaches emitted markup — `convert_section(...)` is called with `html, css, media_map, client_slug, repo_root, trace, boundary_id, section_id` only (`:1535-1548`), and `block_name` is used purely as a *fallback label* in `per_section_results` (`:1574`, `:1629`). But (a) the `matches` **list** is Stage 4's iteration source, so an empty list = zero markup (`:1295-1300`), and (b) the `confidence` **value** gates whether a section is converted at all (`:1408`). Deleting Stage 2 deletes the page.

### Stage 3 — slot list
1. `stage_3_slot_list` — `:1167` (DB helper `_load_db_block_attrs:1147` → `converter.db.db_lookup.block_attrs`).
2. Plain English: for each matched block, lists every attribute in its `block.json` and marks whether the DB knows a canonical slot for it.
3. Inputs: Stage-2 `matches` (`:1185`); `plugins/sgs-blocks/src/blocks/<slug>/block.json` (`:1204`, `:1215`); `sgs-framework.db.block_attributes` via `block_attrs` (`:1161`).
4. Outputs: `run_dir/stage-3.json` (`:1268`), copied to `run_dir/slot-list.json` (`:2055`), trace events (`:1261`), return dict.
5. **Consumers — enumerated:**
   - **Stage 9 coverage roll-up** — `slot_lists` at `:2189`, `open_slots` computed `:2200`, into `output["coverage"]` `:2237`.
   - `leftover-bucket-router.py --slot-list` (`:2062`) → `route_extraction_failed(slot_lists, …)` (`recogniser/leftover-bucket-router.py:727`, `:792-827`) → `extraction_failed` bucket entries with `"source": "stage_3_slot_list"` (`:827`).
   - `simple_html_review_report.py --slot-list` (`:2174`) → `_coverage_for_section` (`:33-36`), slot counts (`:107`).
   - mirrored to `stage-3-slot_list.json`; `staged_merge` requires the file to exist **and** validate against `orchestrator/schemas/stage-3.json` (`orchestrator/staged_merge.py:118-152`). A failure sets `outcome="rolled-back"` — but every handler's `apply`/`rollback` is a no-op lambda (`:3113-3117`), so the "rollback" reverts nothing; the only effect is that `/sgs-update` auto-invoke is skipped and the deliverable says rolled-back.
   - **The one place Stage 3 could gate deploy is dead:** `autonomy_gate.autonomy_decision(coverage=…)` implements Hard Rule 8 — any `open_slots` ⇒ `decision="halt"` (`orchestrator/autonomy_gate.py:324-405`). `orchestrator_main.run()` calls `autonomy_decision(vqa_result, console_errors=…, preflight_abort=…, config_path=…)` at `orchestrator/orchestrator_main.py:133-137` — **`coverage` is never passed**, so it defaults to `None` and `_count_unresolved_slots` returns `(0, 0)` (`autonomy_gate.py:343-345`). The unresolved-slots gate can never fire.
   - No consumer feeds Stage 3 into the converter: `stage_4_5_6_7_8_extract` does not take `slot_list` as a parameter (`:1276`).
6. **VERDICT: DECORATIVE.** **Bean's hypothesis is CONFIRMED with one caveat:** Stage 3 changes no emitted markup, but it is not free to delete — it feeds the `extraction_failed` leftover bucket, the coverage numbers in `stage-9.json`, the operator-review HTML, and the stage-3 schema check in `staged_merge`. Removing it silently empties a bucket and breaks the merge unless those are updated together.

### Stage 4 (+4.5, 5, 7 inline) — extract / convert / serialise
1. `stage_4_5_6_7_8_extract` — `:1276`.
2. Plain English: for each section, hands the section's HTML and CSS to the converter, which produces the actual WordPress block markup.
3. Inputs: `matches` (`:1295`), `run_dir/voter.json` (`:1307`), `args.mockup` (`:1462`), inline `<style>` blocks (`:1465`), `run_dir/variation-d0-d2.css` (`:1478`), `args.media_map` (`:1507`), `run_ctx["theme_json"]` (`:1314`), `converter.entry.convert_section` (`:1458`).
4. Outputs: `run_dir/extract-result.json` (`:1758`), `run_dir/stage-4.json` (`:1768`), return dict with `block_markup`, `extracted_attributes`, `per_section_results`, optional `convert-trace-<boundary>.jsonl` + expected-rules baseline when `--debug-trace` (`:1515-1534`, default ON `:2438`).
5. **Consumers:** Stage 9 (`:2619`, harvests at `:2098`/`:2120`, unmatched queue `:2216`), `run_dir/extract.json` copy (`:2056`) → anti-mirror gate (`orchestrator/check_no_mirror.py:209`), `orchestrator/upload_and_patch.py:163` (**the live page**), `cheat-gate/check_sentinel.py:117`, stage-4j validation (`:2809`), `register_patterns` (`:3179`), `staged_merge` stage-4 schema (`:3097`).
6. **VERDICT: LOAD-BEARING** — this is the only stage that produces markup.
   **Sub-stage 4.5 (token snap):** lines `:1311-1314` + `:1595-1624`. It harvests `token_resolutions` from the converter and mirrors new tokens into the in-memory `theme_json` — which, per Stage 0 above, **has no reader**. The harvested list itself *is* consumed (Stage 9 `_harvest_attribute_gap_candidates:934` → `attribute_gap_writer`). So: harvest = load-bearing for the gap ledger; reflection = **DEAD**.
   **Bean's hypothesis on 0.7 / 4.5:** *4.5 is confirmed not a separate stage* — it is 30 lines inside the Stage-4 loop, and Stages 5 and 7 are explicitly performed inside `convert_section` (`:1674` "Skip Stages 4.5, 5, 7 — converter handled them inline"). *0.7 is NOT part of the walker loop* — it runs once, before Stage 1, over the whole document (`:2584`), and produces a file the loop later reads (`:1478`). It is a genuine pre-stage, not a loop step. **No "Stage 0.8" exists in the orchestrator** — grep for `0.8` in `sgs-clone-orchestrator.py` returns nothing; the name appears only in Spec 31 line 66 as an alias for 4.5 ("Stage 4.5 / 0.8").

### Gate — R-31-15 anti-mirror
1. `main()` `:2655-2682` → `orchestrator/pipeline-stage-gate.py:62` → `orchestrator/check_no_mirror.py --enforce --baseline`.
2. Plain English: reads the just-produced markup and halts the run if the converter copied a draft class as a container or emitted a banned `sourceMode`.
3. Inputs: `run_dir` → `extract.patched.json` then `extract.json` (`check_no_mirror.py:209-210`), `variation-d0-d2.css` (`:276`), baseline JSON (`pipeline-stage-gate.py:54`).
4. Outputs: exit code; `sys.exit(gate_proc.returncode)` at `:2679`.
5. Consumers: control flow — a non-zero exit prevents Stage 4i/10/11.6/+REGISTER.
6. **VERDICT: LOAD-BEARING.**

### Stage 4i — media sideload
1. `main()` `:2712-2796`; module `orchestrator/media-sideload.py` via `media_sideload():841`.
2. Plain English: finds the images the draft references and uploads them to the WordPress media library (or just inventories them when no deploy target).
3. Inputs: `extract_out` (`:2726`), `args.mockup.parent` (`:2727`), `.claude/secrets/sandybrown.env` (`:2710`), `args.deploy_target` (`:2709`).
4. Outputs: `run_dir/media-sideload-manifest.json` (`:2731`), `run_dir/stage-4i.json` (`:2784`), WP media-library rows (real side effect when uploading), `RuntimeError` abort on auth failure (`:2771`).
5. **Consumers:** the WP side effect is real, but **NOTHING CONSUMES `media-sideload-manifest.json` or `stage-4i.json`** — `upload_and_patch.py` re-derives image URLs from `block_markup` itself (`:167-172`) and uploads via its own `upload_one` (`:199`); grep for `media-sideload-manifest` finds only the write site.
6. **VERDICT: LOAD-BEARING side effect (media library), DECORATIVE artefacts.** Note the comment at `:2705-2707` claiming stage-10 "consumes" the manifest is **stale** — `upload_and_patch.py` never reads it.

### Stage 4j — wp-blocks markup validation
1. `main()` `:2806-2847`; `orchestrator/wp_integration.py:validate_block_markup`.
2. Plain English: asks the `wp-blocks` CLI whether the emitted markup parses as valid blocks.
3. Inputs: `extract_out["block_markup"]` (`:2809`).
4. Outputs: `run_dir/stage-4j.json` (`:2833`), stdout, trace event (`:2842`).
5. **Consumers: NOTHING CONSUMES `stage-4j.json`.** Every failure path is soft-fail (`:2824-2832`); an `invalid` status does not halt.
6. **VERDICT: DECORATIVE.**

### Stage 9 — report (with 9b / 9c2 / 9d / 9e sub-steps)
1. `stage_9_report` — `:2034`.
2. Plain English: works out what the converter missed, buckets it, writes the operator review page, and triggers the block-scaffolding chain.
3. Inputs: `boundary`, `match`, `slot_list`, `extract` (`:2034`), `mockup_path` (`:2036`).
4. Outputs:
   - `run_dir/match.json`, `slot-list.json`, **`extract.json`** (`:2054-2056`) — the last one is what the deploy reads.
   - `run_dir/leftover-buckets.json` via `recogniser/leftover-bucket-router.py` (`:2058-2066`).
   - uimax `recognition_log` rows (`insert_recognition_log:1982`, called `:2076`).
   - `run_dir/content-gaps.json` (`:2117-2128`).
   - `pipeline-state/sgs-clone/<run>/gap-review.md` (`:2163`, `recogniser/gap-review-report.py:153`).
   - `run_dir/operator-review.html` (`:2169-2180`).
   - `run_dir/stage-9.json` (`:2264`).
5. **Consumers:**
   - `extract.json` → `upload_and_patch.py:163` (**live page**), `check_no_mirror.py:209`, `check_sentinel.py:117`.
   - `leftover-buckets.json` → `stage_9b_autonomy_chain` (`:2083`, read at `:1847-1848`), `simple_html_review_report.py --buckets` (`:2176`, stand-alone `:203`), `gap_review_report.write_report` (`:2163`).
   - `recognition_log` → out-of-process reader `plugins/sgs-blocks/scripts/gap-detection/detect.py:138-144`.
   - `stage-9.json` / mirrored `stage-9-coverage.json` → `staged_merge` schema check (`:3098`) only; its `coverage` field is **never** passed to the autonomy gate (see Stage 3).
   - `content-gaps.json`: **effectively unconsumed** — the F5 gate `ledger/content_gap_check.py` defaults to `_SCRIPTS_DIR / "content-gaps.json"` i.e. `plugins/sgs-blocks/scripts/content-gaps.json` (`ledger/content_gap_check.py:67-69`), **not** the run directory the orchestrator writes to (`:2117`). Unless someone passes `--gaps <run_dir>/content-gaps.json` by hand, the gate still runs in its "file absent → green" state that the `:2113-2116` comment says it was built to fix.
   - `operator-review.html`, `gap-review.md`: human-only.
   - **Sub-step 9d (functionality-gap-detector, `:2140-2148`) is DEAD.** `_harvest_functionality_gap_elements` (`:876`) reads `m.get("selector") or m.get("boundary_selector")` (`:900-902`), but Stage-2 match dicts contain no `selector` key (constructed at `:1122-1132`: `boundary_id, section_id, block_name, confidence, alternatives, ranked_candidates, wp_blocks_match, wp_blocks_score, chosen_source`). Every match therefore hits `continue` at `:903-904` and the function always returns `[]` → `if elements:` at `:2143` is never true → `functionality_gap_detector` never runs.
   - Dead locals: `boundary_path`/`match_path`/`slot_list_path`/`extract_path` assigned at `:2044-2047`, never read.
6. **VERDICT: LOAD-BEARING** (writes the `extract.json` the deploy consumes; drives the scaffolding chain). Sub-steps: 9d **DEAD**, 9c2 content-gaps **DECORATIVE as wired**, 9e gap-review **DECORATIVE**.

### Stage 9b — autonomy chain (scaffold new blocks)
1. `stage_9b_autonomy_chain` — `:1831`, called `:2083`.
2. Plain English: when a section matched no known block, it generates a brand-new starter block on disk and (by default) promotes it into the plugin and the database.
3. Inputs: boundary index (`:1846`), `leftover_buckets["unrecognised_section"]` (`:1847-1848`), `recogniser/bucket-c-classifier.py` (`:1900`), `orchestrator/atomic-block-scaffold.py` (`:1909`), `sgs-framework.db` (`:1901`, `:1937`).
4. Outputs: files under `plugins/sgs-blocks/src/blocks/<slug>/` on promote (`scaffold_mod.promote`, `:1937`), DB rows, `run_dir/stage-91.json` (`:1974`), `autonomy_chain` key in the stage-9 output (`:2255`).
5. Consumers: repo + DB mutations are the effect; the artefact is read by the stage-9 summary print (`:2634-2641`). `match` parameter unused.
6. **VERDICT: LOAD-BEARING** (mutates the repository and the framework DB), disabled by `--no-scaffold-new-blocks`.

### Stage 9c — surface pipeline logs
1. `_surface_logs` — `:663`, called `:2668` (halt path), `:2868`, and `:3225` (`finally`).
2. Plain English: turns the raw trace file into per-severity `summary.log` / `errors.log` / `warnings.log`.
3. Inputs: `run_dir/trace.jsonl` (`orchestrator/surface_pipeline_logs.py:68`), `chrome-skipped.log` (`:103`).
4. Outputs: `run_dir/summary.log` (`:137`) + severity logs.
5. Consumers: human/operator only — no code reader found.
6. **VERDICT: DECORATIVE.**

### Stage 10 — per-page deploy
1. `main()` `:2879-2977` → subprocess `orchestrator/upload_and_patch.py`.
2. Plain English: uploads the draft's images, rewrites the markup to point at the uploaded copies, and PATCHes the target WordPress page.
3. Inputs: `args.deploy_target` (`:2879`), `run_dir/extract.json` (`upload_and_patch.py:163`), `args.client`, `--push-theme-snapshot` (`:2910-2913`).
4. Outputs: the live page; `run_dir/extract.patched.json` (`upload_and_patch.py:260`); stdout carrying `link=<url>`.
5. Consumers: Stage 11.6 parses `link=` from this stdout (`:3005-3010`); `check_no_mirror` prefers `extract.patched.json` (`:209`).
6. **VERDICT: LOAD-BEARING** (opt-in via `--deploy-target`; soft-fails rather than halting, `:2973`).

### Stage 11.6 — computed-parity
1. `main()` `:3001-3061` → `node plugins/sgs-blocks/scripts/parity/computed-parity.js`.
2. Plain English: opens the draft and the live clone in a browser at three widths and compares the effective computed styles of matching text.
3. Inputs: `args.mockup` (`:3022`), the `link=` URL from Stage 10 (`:3010`), gated on `result.returncode == 0` (`:3002`).
4. Outputs: `run_dir/computed-parity.json` (`:3012`), stdout, trace event (`:3044`), local `computed_parity_overall_pct` (`:3034`).
5. **Consumers:** exactly one — `promote_to_canonical = (computed_parity_overall_pct == 100)` at `:3163`, choosing between `reg_mod.PATTERNS_DIR` and `proposed-patterns/`. **That consumer is itself inert** (see +REGISTER). No other reader of `computed-parity.json` exists in the repo (grep returns only the orchestrator and doc/comment mentions).
6. **VERDICT: DECORATIVE** as currently wired. (It is the *documented* fidelity signal, and Bean reads it — but no code branch it feeds has an effect.)

### Autonomy tail — preflight → staged_merge → visual-QA → autonomy_decision → /sgs-update
1. `main()` `:3070-3142` → `orchestrator/orchestrator_main.py:run:64`.
2. Plain English: re-checks the run's artefacts against schemas, then decides whether the run may auto-proceed.
3. Inputs: mirrored `stage-{1,2,3,4,9}-<name>.json` (`:3093-3102`), `orchestrator/schemas/*.json`, `visual_qa_capture.stub_capture` (`:3127`).
4. Outputs: `pipeline-state/sgs-clone/<run>/merge-log.md`, `stage-8-visual_qa.json` (`autonomy_gate.py:317`), `deliverable.md` (`autonomy_gate.py:519`), `RunOutcome`.
5. **Consumers:** `outcome` is printed (`:3140-3142`); it does **not** gate +REGISTER (`:3160` checks only `args.skip_register`) nor anything else. The whole tail is skipped by `--skip-autonomy-gate`, which `--mode draft` sets automatically (`:2486-2489`). Visual-QA capture is always the stub (`:3127`), so `max_diff_ratio` is always 0.
6. **VERDICT: DECORATIVE** (schema-validation-only; the "atomic rollback" is no-op handlers — `:3113-3117`, acknowledged at `:3104-3111`).

### +REGISTER — pattern registration
1. `main()` `:3160-3184` → `orchestrator/register_patterns.py:register_run:429`.
2. Plain English: turns novel composed sections into reusable WordPress pattern PHP files and catalogue rows.
3. Inputs: `extract_out` (`:3179`), `boundary` (`:3180`), `target_dir` chosen by the parity gate (`:3163-3170`).
4. Outputs: pattern PHP files, `sgs-framework.db.patterns` rows, uimax `recognition_log` rows.
5. **Consumers / reachability:** `register_run` immediately filters to sections with `status == "deferred-composed-pattern"` (`register_patterns.py:270-281`) and returns an empty result when none (`:456-458`). Grep across `plugins/sgs-blocks/scripts/**/*.py` for `deferred-composed-pattern` returns **only those two lines in `register_patterns.py`** — no producer sets that status (the `composer_fallback` that used to is retired, orchestrator `:535-538`).
6. **VERDICT: DEAD** in the current pipeline (always a no-op), and with it the only consumer of Stage 11.6.

### Stage 4k — critical-fix-verification
1. `main()` `:3194-3209` → `orchestrator/critical-fix-verification.py:run_harness`.
2. Plain English: a post-run audit that checks nothing outside the sanctioned channels was mutated.
3. Inputs: `so_run_id`; scans `pipeline-state/sgs-clone/<run>` (`critical-fix-verification.py:213-222`) — **not** `pipeline-state/<run>` where the legacy artefacts live.
4. Outputs: `run_dir/critical-fix-verification.json` (`:3198`), stdout, trace event (`:3205`).
5. **Consumers: NOTHING CONSUMES the artefact**; every failure is soft-fail (`:3202`).
6. **VERDICT: DECORATIVE.**

---

## 2. Verdict table

| Stage | Implemented at | Verdict |
|---|---|---|
| freshness gate | `:2294` / called `:2509` | LOAD-BEARING |
| 0 theme cache | `:2539-2572` | **DECORATIVE** |
| 0.1 BEM lint | `:117` | LOAD-BEARING (strict halt) / artefact DECORATIVE |
| 0.5 token lint | `:189` | **DECORATIVE** (halt branch unreachable from CLI) |
| 0.7 CSS lift | `:390` | LOAD-BEARING; D1 bucket **DEAD**; `stage-7.json` DECORATIVE |
| 1 boundary | `:1007` | LOAD-BEARING; lingua-franca enrichment DECORATIVE |
| 2 match | `:1068` | LOAD-BEARING (iteration source + confidence gate); block *choice* not in markup |
| 3 slot list | `:1167` | **DECORATIVE** (no markup effect; feeds buckets/coverage/schema) |
| 4 extract/convert | `:1276` | LOAD-BEARING |
| 4.5 token snap | inside `:1311`, `:1595` | harvest LOAD-BEARING (gap ledger); theme-json reflection **DEAD** |
| Gate anti-mirror | `:2655` | LOAD-BEARING |
| 4i media sideload | `:2712` | LOAD-BEARING side effect / artefacts DECORATIVE |
| 4j wp-blocks validate | `:2806` | **DECORATIVE** |
| 9 report | `:2034` | LOAD-BEARING (writes deploy's `extract.json`) |
| 9b autonomy chain | `:1831` | LOAD-BEARING (repo + DB mutation) |
| 9c surface logs | `:663` | **DECORATIVE** |
| 9c2 content gaps | `:2117` | **DECORATIVE as wired** (reader looks elsewhere) |
| 9d functionality gaps | `:2140` / `:876` | **DEAD** (harvest always returns `[]`) |
| 9e gap-review.md | `:2160` | **DECORATIVE** |
| 10 deploy | `:2879` | LOAD-BEARING |
| 11.6 computed-parity | `:3001` | **DECORATIVE** (its only consumer is inert) |
| autonomy tail | `:3070` | **DECORATIVE** (schema check; no-op rollback; stub capture) |
| +REGISTER | `:3160` | **DEAD** (no producer of `deferred-composed-pattern`) |
| 4k critical-fix-verification | `:3194` | **DECORATIVE** |

---

## 3. Stages whose real behaviour contradicts their name / docstring

1. **Stage 0.7 writes `stage-7.json`** (`:494`) — colliding with canonical stage 7 = "serialise" (`staged_output.py:49`).
2. **`stage_4_5_6_7_8_extract`** (`:1276`) does not run five stages; the converter performs 4.5/5/7 internally (`:1674`) and stage 6 (block.json schema validation) is not in this function at all — `--no-schema-validation` is described as "Stage 6" (`:2463`) but actually toggles `staged_merge`'s `require_schema` (`:3138`).
3. **`stage_9b_autonomy_chain` writes `stage-91.json`** (`:1974`) — an invented stage number.
4. **Comment at `:2705-2707`** claims stage-10 consumes the media-sideload manifest; `upload_and_patch.py` re-derives URLs itself (`:167-199`) and never opens the manifest.
5. **`_reflect_new_token_in_theme_json` docstring** (`:730-736`) claims "the next section's token_resolver can snap to the new slug" — the converter reads the snapshot from disk (`styling_helpers.py:253`) and `seed_theme_json` is a no-op (`converter/entry.py:94`).
6. **`autonomy_gate.autonomy_decision`'s Hard Rule 8** (`autonomy_gate.py:363-405`) documents an unresolved-slots deploy block that can never trigger — `coverage` is not passed (`orchestrator_main.py:133`).
7. **`staged_merge` "atomic rollback"** — handlers are no-op lambdas (`:3113-3117`); the orchestrator's own comment admits it (`:3104-3111`), but the `/sgs-clone` SKILL.md still claims "rolls back … leaves zero canonical changes behind" (`~/.claude/skills/sgs-clone/SKILL.md:288`), while Stage 9b has *already* written blocks to `src/blocks/` and DB rows before the merge runs.
8. **`~/.claude/skills/sgs-clone/SKILL.md:429`** documents `pipeline-state/<run>/css-d1-assignments.json` as "cv2 reads this for typed-attr-lift values" — no such file and no such read exist anywhere in `scripts/` (grep for `css-d1-assignments` / `d1_assignments` → zero hits).
9. **Stage 11 pixel-diff** is still documented in the skill (`SKILL.md:295`, `references/pipeline-stages.md:274`) though removed 2026-07-04 (`:2980-2988`).

---

## 4. Documented vs true order

Spec 31 Appendix D's sequence is **correct**. What the docs get wrong is *content*, not order:
- Appendix D omits 0-theme-cache's inertness, 9b/9c/9c2/9d/9e sub-steps, and the `finally` log pass (`:3225`).
- Appendix C (`:790-800`) lists `slot-list.json`, `match.json`, `voter.json`, `media-sideload-manifest.json` as run artefacts without noting that three of the four have no code reader beyond the report renderers.
- The `/sgs-clone` skill reference is materially stale (items 7–9 above).

---

## 5. Caveats / UNVERIFIED

- Verdicts are **static-analysis** verdicts from read sites, not from a live run. No pipeline was executed.
- "NOTHING CONSUMES IT" claims were each checked with at least two spellings (hyphen and underscore forms, quoted and unquoted) across `plugins/`, `theme/`, `scripts/`, `.claude/hooks/` and `~/.claude/hooks|skills`, excluding `node_modules`, `.claude/worktrees/`, `pipeline-state/` and test files. Test-only readers were deliberately excluded — several artefacts (e.g. `stage-4i.json`) do have `_tests/` readers.
- **UNVERIFIED:** whether any *human/AI operator workflow doc* outside the repo consumes the decorative artefacts (`operator-review.html`, `gap-review.md`, `summary.log`, `computed-parity.json`). These are plainly intended for human reading; "DECORATIVE" here means "no code branch depends on it", not "worthless".
- **UNVERIFIED:** whether `route_css`'s D1 list was ever consumed on a branch other than `main`.
- `orchestrator/staged_output.PIPELINE_ROOT` is a *relative* path (`staged_output.py:36`), so the Phase-5 mirror directory depends on the process CWD; runs launched from outside the repo root would place it elsewhere. Not exercised here.
