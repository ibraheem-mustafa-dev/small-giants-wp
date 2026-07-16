---
doc_type: council-round-1
spec: 17
date: 2026-05-19
seats: 4
verdicts:
  seat_1_wp_core_dev: REVISE
  seat_2_non_tech_owner: REVISE
  seat_3_security_auditor: REVISE
  seat_4_ai_pipeline_engineer: REVISE
---

# Spec 17 Council — Round 1 Outputs (all four seats)

Each seat evaluated independently. None saw the others' findings.

---

## Seat 1 — WP Core Developer (Sonnet, persona-biased toward WP-canonical correctness)

### Scores
| Dim | Score |
|-----|-------|
| 1 Site-owner UX | 8 |
| 2 AI agent setup | 7 |
| 3 Cloning compatibility | 6 |
| 4 Multi-client isolation | 9 |
| 5 WP 6.9 features | 7 |
| 6 Security | 7 |
| 7 Code quality | 8 |

### Top 3 concerns
1. **FR-S2-1 — Timestamp guard is race-condition-prone.** `sgs_seeding_armed_at` timestamp comparison can pass spuriously if upgrade + activate happen in the same second or via WP-CLI deploy. Use slug comparison instead (`_sgs_last_seeded_variation !== $new_slug`), not a timestamp.
2. **FR-S3-2 — Cited hook does not exist.** `template_include` is wrong for block themes; `block_template_part` does not exist as a filter in WP 6.7. Correct mechanism is `pre_render_block` for `core/template-part` blocks. Either fix the hook citation or defer conditional headers to v1.1.
3. **FR-S3-4 — CPT pattern registration on `init` hits the frontend.** Registering N patterns per published `sgs_header` post on `init` runs on every page load. Move to `admin_init` only, or use a transient-cached pattern list with invalidation on post save.

### Other FR-level concerns
- FR-S2-1: recursive-firing guard mechanism unspecified (static / `doing_action()` / transient — pick one).
- FR-S2-2: `settings.custom.sgs.headerPattern` resolver round-trip not verified.
- FR-S4-3: address sanitiser conflates write-time sanitisation with output-context escaping. Separate them.
- FR-S5-2: variation-picker write path unspecified — must explicitly write to `wp_global_styles` via `wp_update_post`, not via a side-channel `do_action`.

### Verdict
**REVISE** — three blocking technical issues, otherwise architecturally sound.

---

## Seat 2 — Non-Tech Site Owner (Haiku, persona-biased toward operator UX)

### Scores
| Dim | Score |
|-----|-------|
| 1 Site-owner UX | 7 |
| 2 AI agent setup | 8 |
| 3 Cloning compatibility | 8 |
| 4 Multi-client isolation | 9 |
| 5 WP 6.9 features | 7 |
| 6 Security | 8 |
| 7 Code quality | N/A |

### Top 3 things that would scare or confuse the operator
1. **Logo workflow undefined.** Spec says "logo placeholder — defers to Site Editor" but never says where. Operator opens Customise, finds nothing, gets stuck. Add a media uploader directly on the SGS Site Info admin page.
2. **"Replace" picker is too magic.** Four headers appear in the picker with no labels or previews — operator can't tell which is which. Pattern entries need explicit labels ("Mama's Munches Header — logo + three-column nav") and preview thumbnails.
3. **Empty bindings render as blanks.** Operator sees an empty footer column and thinks they broke the site, not that a binding is waiting for data. Empty bindings should render friendly hints like *"📞 Set your phone in SGS Site Info"* with a link.

### Walkthrough verdicts (5 journeys)
1. "I want my logo in the header" → **Awkward** (no clear path)
2. "I activated Mama's and lost my logo" → **Scary** (no obvious recovery path)
3. "I want my phone in the footer" → **Easy** (admin form works)
4. "I want different headers on different pages" → **Confusing** (conditional rules UI unspecified)
5. "I broke something. How do I recover?" → **Awkward** (Reset button is buried)

### Verdict
**REVISE** — 3 must-fix UX gaps; core architecture is correct.

---

## Seat 3 — Security Auditor (Sonnet, persona-biased toward adversarial mindset)

### Scores
| Dim | Score |
|-----|-------|
| 1 Site-owner UX | 7 |
| 2 AI agent setup | 6 |
| 3 Cloning compatibility | 7 |
| 4 Multi-client isolation | 5 |
| 5 WP 6.9 features | 8 |
| 6 Security | **4** |
| 7 Code quality | 6 |

### Threats identified
- **T1 (FR-S4-3)** Custom-fields key allowlist `[a-z0-9_]+` only client-side enforced → attacker POSTs `<script>` key, overwrites reserved option keys.
- **T2 (FR-S2-1)** Static-variable recursive guard insufficient — concurrent REST autosave can bypass it.
- **T3 (FR-S3-4)** `sgs_header` CPT with `show_in_rest: true` exposes published posts to **unauthenticated REST reads** — public consumer can hit `/wp-json/wp/v2/sgs_header/{id}`. Capability check governs WRITE only, not READ.
- **T4 (FR-S3-2)** Stored URL patterns evaluated via `preg_match` without ReDoS protection — `(a+)+` pattern degrades every page load.
- **T5 (FR-S4-2)** Block-binding `canUserEditValue` cap check uses current blog context; multisite cross-blog leak risk if a different blog's data is read.
- **T6 (FR-S5-2)** Variation activation POST not explicitly nonced; if PHP path bypasses REST, no CSRF protection.
- **T7 (FR-S4-1)** `sgs_site_info_get()` returns raw value; helper API has no escaping contract → stored XSS if a direct caller forgets `esc_html()`.

### Required must-fix before ship
1. Server-side key allowlist + reserved-key denylist (FR-S4-3)
2. CPT REST read restriction or `show_in_rest: false` (FR-S3-4)
3. Cross-request seeding lock via short-lived transient (FR-S2-1)
4. ReDoS guard on URL-pattern storage (FR-S3-2)
5. Explicit nonce on variation-activation POST (FR-S5-2)
6. Escaping contract on `sgs_site_info_get()` helper + convenience wrappers (FR-S4-1)

### Other parking-worth concerns
- WP-CLI migrations bypass `current_user_can()` entirely; cap enforcement must be added if exposed via REST
- Site Info exported in WP Core XML export — client PII travels in plaintext export files

### Verdict
**REVISE** — six must-fix items, all acceptance-criteria-level (no architectural rework).

---

## Seat 4 — AI Pipeline Engineer (Haiku, persona-biased toward /sgs-clone integration)

### Scores
| Dim | Score |
|-----|-------|
| 1 Site-owner UX | 8 |
| 2 AI agent setup | 6 |
| 3 Cloning compatibility | 5 |
| 4 Multi-client isolation | 9 |
| 5 WP 6.9 features | 8 |
| 6 Security | 8 |
| 7 Code quality | 7 |

### Pipeline integration walkthroughs (4 scenarios)
1. Fresh mockup `.sgs-header` / `.sgs-footer` → **BLOCKED.** Pipeline outputs block markup; spec assumes patterns are PHP files registered via `register_block_pattern()`. No integration point.
2. Site Info population from mockup metadata → **AMBIGUOUS.** No REST or WP-CLI command exists for pipeline to write `sgs_site_info` data.
3. Pattern mapping to variation → **CLEAN IFF** pipeline can write variation JSON files (undocumented if it can).
4. Re-clone idempotence → **CLEAN for variation-switches**, but BROKEN for re-clones: FR-S7-3 safety guard only applies on first deploy, so re-clones overwrite operator edits.

### Required pipeline additions
1. **`wp sgs seed-template-parts [--variation=<slug>]`** WP-CLI command — explicitly trigger FR-S2-1 seeding logic outside the Site Editor.
2. **`wp sgs site-info set <key> <value> | update <json-file>`** WP-CLI command — populate Site Info store from extracted mockup data.
3. **REST endpoint or WP-CLI for atomic pattern registration** — pipeline outputs block markup; spec assumes operators hand-author pattern PHP files. Need a path to write `wp_template_part` post + register as pattern atomically.
4. **Post meta `_sgs_cloned_from_pattern_slug`** on seeded template-part records — marks content as pipeline-generated so re-clone can safely overwrite without destroying operator edits. If meta is absent, skip overwrite and warn.

### Out-of-spec but pipeline-worth-parking
- Pattern versioning: track which version of a pattern is currently live vs being emitted
- Complex component hierarchies: real mockups have 5+ nested layout components — pipeline needs a composition mechanism beyond 1:1 pattern mapping

### Verdict
**REVISE** — 4 missing integration points; without them the pipeline cannot land headers/footers cleanly.

---

# Round 1 Convergence Summary

## Consensus must-fixes (cited by 2+ seats)
- **FR-S2-1 recursive-firing guard mechanism** — Seat 1 says "specify", Seat 3 says "must be cross-request via transient". Combined: use a short-lived transient, not a static.
- **FR-S2-1 seeding guard logic** — Seat 1 says "use slug comparison not timestamp", Seat 4 says "add post-meta `_sgs_cloned_from_pattern_slug` for re-clone safety". Combined: slug comparison for variation-change, post-meta for re-clone discrimination.
- **FR-S3-4 CPT exposure** — Seat 1 says "perf regression on init", Seat 3 says "publicly readable via REST". Both call for either `show_in_rest: false` or REST capability override + admin-only registration.

## Singleton blockers (cited by 1 seat but unambiguous)
- **FR-S3-2 hook citation is wrong** (Seat 1) — `template_include` / `block_template_part` are not valid; use `pre_render_block` for `core/template-part` blocks.
- **FR-S4-3 server-side key allowlist** (Seat 3) — currently only client-side enforced.
- **FR-S3-2 ReDoS guard on URL patterns** (Seat 3) — store-time validation needed.
- **Logo workflow** (Seat 2) — add media uploader directly on the admin page.
- **Picker labels + thumbnails** (Seat 2) — operator UX gap.
- **Empty-binding placeholders** (Seat 2) — friendly hint instead of blank.
- **Pipeline WP-CLI commands** (Seat 4) — `wp sgs seed-template-parts`, `wp sgs site-info`, atomic pattern registration.
- **`_sgs_cloned_from_pattern_slug` post meta** (Seat 4) — for re-clone idempotence.

## Overall convergence
4 / 4 seats: REVISE.
0 / 4 seats: SHIP.
0 / 4 seats: KILL.

All seats agree the spec is architecturally sound and that fixes are acceptance-criteria-level rather than architectural rework.
