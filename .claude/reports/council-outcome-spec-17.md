---
doc_type: council-outcome
spec: 17
date: 2026-05-19
rounds: 2
seats: 4
final_verdict: SHIP-IF-MUST-FIX-LIST-APPLIED
---

# Spec 17 Council — Final Outcome

## Verdict

**3 of 4 seats: SHIP IF must-fix list applied. 1 seat: REVISE (resolvable — the deal-breaker concern is fixed by item M4 below).**

After two rounds of independent + cross-pollinated review by four distinct evaluator personas (WP core dev, non-tech site owner, security auditor, AI pipeline engineer), the spec's architecture is judged sound and WP-canonical. The remaining gaps are all acceptance-criteria-level and require no architectural rework.

## Consolidated must-fix list (10 items, ranked)

Spec v2 cannot ship without these. Each item names the FR to revise + the consensus fix shape.

### M1 — `sgs_header`/`sgs_footer` CPT REST read exposure
**FR:** FR-S3-4
**Issue:** `show_in_rest: true` with default capabilities lets unauthenticated REST consumers enumerate and read published `sgs_header` posts. Bypasses operator privacy expectations on advanced headers.
**Consensus fix:** Set `'capability_type' => 'sgs_header'` + `'map_meta_cap' => true` + `'capabilities' => ['read_post' => 'edit_theme_options', ...]` so REST reads are also capability-gated. Do NOT use `show_in_rest: false` (would break the Site Editor — Seat 2 + Seat 4 objection).
**Endorsed by:** Seats 1, 2, 3, 4.

### M2 — FR-S3-2 wrong hook + ReDoS guard at both store + render time
**FR:** FR-S3-2
**Issue:** Two named hooks (`template_include`, `block_template_part`) are either wrong-for-block-themes or nonexistent. Operator-supplied URL regex evaluated via `preg_match` is a ReDoS vector on every page load.
**Consensus fix:** Replace hook citation with `pre_render_block` filtering on `blockName === 'core/template-part'`. Add ReDoS guard at storage time (complexity allowlist; reject `(a+)+`-style patterns) AND at evaluation time (`PREG_BACKTRACK_LIMIT`). Cap per-request rule evaluation depth.
**Endorsed by:** Seats 1, 3. Seat 2 confirms operator-visible impact (silent rule failure would betray trust).

### M3 — FR-S2-1 seeding guard: slug comparison + transient lock
**FR:** FR-S2-1
**Issue:** Timestamp-based guard (`sgs_seeding_armed_at`) is race-condition-prone. Static-variable recursive guard insufficient against concurrent REST autosave events.
**Consensus fix:** Replace timestamp comparison with slug comparison: `_sgs_last_seeded_variation !== $new_slug` (post meta on each `wp_template_part` record). Replace static guard with a 5-second transient lock keyed `sgs_seeding_in_progress` for cross-request safety.
**Endorsed by:** Seats 1, 3, 4.

### M4 — `_sgs_cloned_from_pattern_slug` post meta (re-clone idempotence)
**FR:** new FR-S7-4 (companion to FR-S7-3)
**Issue:** FR-S7-3 safety guard only protects the first deploy. Subsequent re-clones overwrite operator edits silently. Seat 2 called this the operator deal-breaker.
**Consensus fix:** Add per-record post meta `_sgs_cloned_from_pattern_slug` on every pipeline-seeded `wp_template_part` record. Re-clone logic gates on its presence: meta present → safe to overwrite; meta absent → skip + warn. The meta itself must be `register_post_meta` registered with `auth_callback = current_user_can('edit_theme_options')` so a low-privilege CPT edit cannot spoof it (Seat 3 cross-seat threat C1).
**Endorsed by:** Seats 1, 2, 3, 4.

### M5 — Server-side key allowlist + reserved-key denylist (FR-S4-3 custom fields)
**FR:** FR-S4-3
**Issue:** Custom-fields key regex `[a-z0-9_]+` enforced only in JS. Direct POST bypasses; attacker writes `<script>` keys or overwrites reserved options (`sgs_framework_version` etc.).
**Consensus fix:** Add server-side `preg_match('/^[a-z0-9_]+$/', $key)` in the admin POST handler. Add denylist check against reserved `sgs_*` option keys. Both must appear in FR-S4-3's acceptance criteria.
**Endorsed by:** Seats 1, 3.

### M6 — WP-CLI surface (`wp sgs site-info`, `wp sgs seed-template-parts`, `wp sgs migrations`)
**FR:** extension to FR-S5-1; new FR-S5-3
**Issue:** Pipeline cannot trigger seeding or populate Site Info store. REST endpoint for pattern registration BLOCKED by Seat 3 (code-injection vector). WP-CLI is the only safe surface.
**Consensus fix:** Add explicit WP-CLI commands:
- `wp sgs site-info set <key> <value>` / `wp sgs site-info update <json-file>` / `wp sgs site-info get <key>`
- `wp sgs seed-template-parts [--variation=<slug>] [--force]`
- `wp sgs migrations status` / `wp sgs migrations run` (already named in FR-S7-2 — confirm and surface)
- `wp sgs header-rules list|add|remove` / `wp sgs footer-rules list|add|remove` (already named in FR-S3-2 — confirm)
- `wp sgs reset-template-parts [--header] [--footer]` (mirrors the admin button)

Each command MUST call the same PHP API helper that the admin POST handler calls (single source of truth, single sanitiser, single capability check). CLI invocations must still enforce `current_user_can` when `--user=<id>` is set; document the `--allow-root` caveat.
**Endorsed by:** Seats 1, 3, 4.

### M7 — Escaping contract on `sgs_site_info_get()` helper
**FR:** FR-S4-1
**Issue:** Helper API returns raw values. Direct PHP callers can produce stored XSS if they forget `esc_html()`. Both the empty-binding hint path and the populated-data path are affected (Seat 3 cross-seat threat C2).
**Consensus fix:** Document `sgs_site_info_get()` as returning RAW (caller escapes). Provide convenience wrappers `sgs_site_info_get_esc_html($key)` and `sgs_site_info_get_esc_url($key)`. Add this contract to FR-S4-1 acceptance criteria.
**Endorsed by:** Seats 1, 3.

### M8 — Logo workflow: deep-link to Site Editor, no new uploader
**FR:** revision to FR-S4-3
**Issue:** Operator has no clear path to set the logo. Seat 2 proposed a media uploader on the SGS admin page; Seat 3 BLOCKED that proposal due to SVG XSS risk.
**Consensus fix:** Keep logo workflow native to the Site Editor (uses WP's built-in `wp_check_filetype` + core sanitisation). On the SGS Site Info admin page, add a prominent "Set logo →" link that opens the Site Editor's Site Logo block at the correct anchor. Document this in the FR text + UX.
**Endorsed by:** Seats 2, 3.

### M9 — Pattern picker labels + preview thumbnails
**FR:** FR-S3-1
**Issue:** "Replace" picker shows ≥3 patterns with no labels or previews; operator cannot tell them apart.
**Consensus fix:** Every registered pattern must declare a `description` field (label) and a `viewportWidth` for the preview. Patterns SHOULD also declare a `keywords` array (helps Site Editor search). Add to FR-S3-1's acceptance criteria.
**Endorsed by:** Seat 2; Seat 4 endorses for pipeline (pipeline must emit metadata alongside markup).

### M10 — Empty-binding friendly placeholders
**FR:** FR-S4-2
**Issue:** Empty binding renders as blank; operator thinks the site is broken. Both empty-path and data-path output must be `esc_html`'d (Seat 3 cross-seat C2).
**Consensus fix:** `sgs/site-info` binding source's `get_value_callback`: if value is empty, return a friendly hint string with a link to the SGS Site Info admin page. Document the hint string per well-known key. Both code paths call `esc_html` / `esc_url`. Add to FR-S4-2 acceptance criteria.
**Endorsed by:** Seats 2, 3.

## Council-recommended additions (not blockers, but strongly recommended)

### A1 — `wp_global_styles` post-ID never accepted from user input (FR-S5-2)
Hard-code the lookup. Reject any form POST that includes `post_id`. Seat 3 surfaced this as threat N1.

### A2 — Site Info excluded from generic WP XML export; surfaced in GDPR personal-data export instead
PII in `wp_options` is downloadable by any user with `export` capability (lower than `edit_theme_options`). Use the `wp_privacy_personal_data_exporters` filter.

### A3 — `WP_Theme_JSON_Resolver::get_user_data_from_wp_global_styles()` is not stable public API
Document a fallback: parse `wp_global_styles` post content directly via `get_posts` + `json_decode`. Spec should name both paths.

### A4 — Pattern registration: PHP files only for v1, no REST endpoint
Confirm the spec language closes the door on REST-based pattern registration. Pipeline uses WP-CLI (via SSH) to generate PHP pattern files in the theme on disk, then triggers WP-CLI to register them.

### A5 — `pre_render_block` for FR-S3-2 must cap evaluation depth
Per-request rule evaluation across many `core/template-part` blocks compounds. Bail after first match per request. Add to FR-S3-2 acceptance criteria.

## Out-of-spec but worth parking (deferred to follow-up specs)

These came up across the council; none block v1 but all are worth a parking entry.

| ID | Description | Source |
|----|-------------|--------|
| P-S17-A | Independent colour + typography preset split (TT5/Ollie style: `/styles/colors/` + `/styles/typography/` for combinatorial variations) | Seat 1 (Round 2) |
| P-S17-B | Pattern versioning on `wp_template_part` records (track which version of a pattern is live) | Seat 4 (Round 2) |
| P-S17-C | Complex component-hierarchy patterns (5+ nested layout components beyond 1:1 pattern mapping) | Seat 4 (Round 2) |
| P-S17-D | Customiser-replacement live preview for variation picker (FR-S5-2) | inferred from Seat 2 walkthrough #2 |
| P-S17-E | Public browseable pattern library marketing page | brief §6 idea #7 |
| P-S17-F | Site Info store PII export safety + GDPR exporter integration (A2 above) | Seat 3 (Round 2) |
| P-S17-G | Block-attribute schema migration framework (down-migrations / rollback) | Seat 3 (Round 1 FR-S7-1 critique) |
| P-S17-H | WP-CLI `--allow-root` audit + capability enforcement when run as server user | Seat 3 (Round 2) |

## Sequence for spec v2

1. Apply all 10 must-fix items (M1-M10) to the FR acceptance criteria + the relevant cross-cutting sections (§4, §7.1, §9)
2. Apply 5 council-recommended additions (A1-A5) — small inline changes
3. Add new FR-S7-4 for `_sgs_cloned_from_pattern_slug` post meta
4. Update FR-S5-2 to hard-code `wp_global_styles` lookup
5. Add new FR-S5-3 covering the full WP-CLI surface
6. Add the 8 P-S17-* parking entries to `.claude/parking.md`
7. Bump spec changelog to v2

## Sequence for implementation

1. Phase B-impl: dispatch parallel subagents per spec section (§S1 through §S7)
2. Each subagent invokes `/verification-before-completion` + `/diagnostics` + `/lint` as standard gates
3. Each subagent returns files + summary; main thread runs `/qc-inline` before merging
4. WP-CLI commands implemented in `plugins/sgs-blocks/includes/cli/` with one class per command group
5. Site Info admin page implemented via Settings API (FR-S4-3)
6. Migration framework (FR-S7-2) implemented before any other migration-touching FR
7. Live deploy to sandybrown as canary; observed against the success-metrics list (§8)

## Council process notes

- Round 1: 4 seats × Sonnet/Haiku/Sonnet/Haiku. All returned REVISE.
- Round 2: same 4 seats cross-pollinated. 3 returned SHIP-IF, 1 returned REVISE (resolvable via M4).
- Persona diversity (vs. true model diversity) was sufficient — each seat's persona produced findings the others missed.
- Cross-pollination strengthened convergence: every Round 2 seat endorsed at least 2 findings from other seats; only 2 OBJECTIONS surfaced (logo uploader, REST pattern endpoint) — both resolved.
- No seat failed. Bean's failover rule (retry failed seats as Sonnet) was not exercised.
