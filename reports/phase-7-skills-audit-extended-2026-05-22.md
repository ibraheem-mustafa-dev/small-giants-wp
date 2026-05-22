# Phase 7 Skills Audit (Extended) — WP 7.0 Alignment

Generated: 2026-05-22
Source-of-truth: developer.wordpress.org/reference/since/7.0.0/, make.wordpress.org/core/2026/05/14/wordpress-7-0-field-guide/
Audit dispatched: Phase 7 extended audit (audit-only — NO edits in this dispatch)

---

## TL;DR

- **14 of 14 targets audited**
- **Cost split: LOW=5, MED=5, HIGH=4**
- **HIGH-cost items (recommend Phase 7c):**
  - `sgs-wp-engine` — no WP 7.0 section anywhere; invoked skills table doesn't mention AI Connectors skill; `wp_connectors_init` absent from hook table; `autoRegister` absent; iframed editor treated as future-tense
  - `sgs-clone` — no WP 7.0 section; `role:content` absent from stage descriptions; heading variation shape change absent from slot-list derivation; no mention of `apiVersion 3` in the MATCH/SLOT-LIST logic
  - `wp-scaffold` — scaffold generates no WP 7.0-compliant block.json (no `apiVersion: 3`, no `role:content`, no `listView`, no `autoRegister` support); most impactful skeleton generator gap
  - `wp-theme-check` — `--wp-version` defaults to `6.9` in argument hint; no WP 7.0 knowledge (pseudo-elements, dimension presets, Font Library page) built into the tool invocation guidance

---

## Per-target findings

---

### 1. sgs-wp-engine

**Path:** `~/.claude/skills/sgs-wp-engine/SKILL.md` (492 lines)

**Current state:** The central SGS authority. Excellent Spec 17 coverage, strong Rosetta Stone discipline, SGS-BEM convention. Has a detailed invoked-skills table. No WP 7.0 section.

**Missing WP 7.0 items:**

- **AI Connectors not in invoked-skills table.** `wp-plugin-development` now documents `wp_connectors_init` registration (per Phase 7 original audit). The `sgs-wp-engine` invoked-skills table routes plugin-architecture work to `wp-plugin-development` with a reference to Spec 17 patterns only — no mention that AI Connectors registration is now a `wp-plugin-development` concern. Any SGS plugin shipping an AI feature must register via `wp_connectors_init`; the routing entry point misses this.
- **`wp_connectors_init` absent from hooks table.** The Spec 17 hooks section lists `save_post_wp_global_styles`, `pre_render_block`, `upgrader_process_complete`, `admin_post_sgs_*`, `init`+`admin_init`. WP 7.0's `wp_connectors_init` and the `Sgs_Ai_Connector` class (shipped Step 7.1) are not listed.
- **`autoRegister: true` absent.** WP 7.0's PHP-only block registration pattern is not in the build guidance anywhere. The Phase 7 original audit confirmed zero SGS blocks qualify today, but the routing note should exist for future blocks.
- **Iframed editor still future-tense.** Phase 1 — Read First: "the block editor may run in an iframe" — this should now say "the block editor runs in an iframe for apiVersion 3 blocks."
- **MCP Adapter / Abilities API** — neither is in the skill-routing table. With WP 7.0's MCP Adapter exposing Abilities to external AI agents, plugin development that touches this surface has no routing entry here.
- **`compatibility` frontmatter absent.** (sgs-wp-engine has no frontmatter `compatibility` line; the three WP sub-skills that do have it all need updating to PHP 7.4+. Not sgs-wp-engine's gap, but worth noting for the parallel update pass.)

**Stale patterns:** Phase 1 iframed-editor note is pre-7.0 future-tense.

**Cost: HIGH**

**Recommended action:** Update Phase 1 iframed-editor note to present tense. Add `wp_connectors_init` + `Sgs_Ai_Connector` to the Spec 17 hooks section. Add an "AI Connectors" row to the invoked-skills routing table (→ `wp-plugin-development`). Add a one-line `autoRegister` note in the framework-development guidance. Add MCP Adapter entry. Estimated: 30–40 min (several scattered sections + new code reference).

---

### 2. wordpress-router

**Path:** `~/.claude/skills/wordpress-router/SKILL.md` (114 lines) + `references/decision-tree.md` (53 lines)

**Current state:** Well-maintained; Spec 17 routing additions landed (2026-05-18). Routes to all major WP sub-skills correctly.

**Missing WP 7.0 items:**

- **No AI Connectors routing row.** `decision-tree.md` Step 2 routes "Abilities API / `wp_register_ability`" → `wp-abilities-api` correctly. It has no equivalent row for AI Connectors (`wp_connectors_init`, `wp_get_connector()`). A developer asking "how do I register a connector" would fall through to `wp-plugin-development` via the generic "Plugins / hooks" catch-all — technically correct but suboptimal (no specific Connectors API signal).
- **`compatibility` frontmatter is `PHP 7.2.24+`** — stale; WP 7.0 requires PHP 7.4+.
- **`decision-tree.md` Step 1 `wp-project-triage` signal gap.** The decision tree documents new triage signals (from the Phase 7 original audit) but doesn't mention `signals.hasApiVersionBelow3` or `signals.hasDeprecated70Apis`. These signals, once added to `detect_wp_project.mjs`, should be surfaced in the CLASSIFY step here.

**Stale patterns:** `compatibility: "PHP 7.2.24+"` in frontmatter.

**Cost: LOW**

**Recommended action:** Update frontmatter `compatibility` to PHP 7.4+. Add an AI Connectors routing row to `decision-tree.md` Step 2 (one line: route → `wp-plugin-development`). Add a note in CLASSIFY referencing the two new WP 7.0 triage signals when `wp-project-triage` is updated. Estimated: 5–10 min.

---

### 3. sgs-extraction

**Path:** `~/.claude/skills/sgs-extraction/SKILL.md` (227 lines)

**Current state:** Well-specified data-capture pipeline. Handles Cloudflare, manifest, output formats. No WP-version concerns.

**Missing WP 7.0 items:**

- **`apiVersion 3` in extracted HTML.** Stage 3 (DOM structure) extracts section boundaries and heading hierarchy. WP 7.0 sites will have Gutenberg comment delimiters (`<!-- wp:heading {"level":2} -->`) in the HTML when extracting a WP page. The skill does not mention the heading-level-to-variation shape change (WP 7.0 converts `level` attribute to block variations) when parsing Gutenberg comments in extracted HTML.
- **Icons block absent from extraction targets.** The DOM structure JS in Stage 3 queries `section`, `[role="region"]`, `main > div`, `.section`. The WP 7.0 core Icons block uses `wp-block-icons` wrapper class. Minor but `sgs-extraction` is the feeder for `/sgs-clone` — unrecognised Icons block markup would fall into `unrecognised-section` bucket unnecessarily.
- **`role: "content"` attribute.** When extracting a WP 7.0 site that uses `contentOnly` patterns, nested blocks without `role: "content"` are locked. The skill doesn't note this as a pattern to flag during extraction.
- **Scope is primarily non-WP extraction.** The skill's `When NOT to Use` explicitly says "WordPress sites with SSH access → use wp-site-extraction." The WP 7.0 concerns are therefore lower-priority here; they apply only when extracting a WP site without SSH access (falling back to Playwright).

**Stale patterns:** None found. The skill has no version-specific claims.

**Cost: LOW**

**Recommended action:** Add a note in Stage 3 about Gutenberg block comment parsing on WP 7.0 sites (heading variation shape, `role: "content"` lock signal, Icons block class). This is a one-paragraph addition. Estimated: 5 min.

---

### 4. sgs-discover

**Path:** `~/.claude/skills/sgs-discover/SKILL.md` (270 lines)

**Current state:** Design-gallery search pipeline. Gallery patterns, screenshot capture, artefact output. No WP version concerns at all — this skill finds reference sites; it does not parse WP block markup.

**Missing WP 7.0 items:**

- **Marginal relevance confirmed.** `sgs-discover` finds reference sites for design inspiration. It does not parse WP APIs, generate block.json, or touch theme.json. WP 7.0 introduces no changes that affect gallery searching, screenshot capture, or artefact schema.
- **No stale patterns found.** No version-specific code or compatibility claims in the skill.

**Cost: N/A (no update needed)**

**Finding:** This skill is WP-7.0-agnostic by design. No changes recommended.

---

### 5. sgs-clone

**Path:** `~/.claude/skills/sgs-clone/SKILL.md` (250+ lines read)

**Current state:** The most technically detailed skill in the set. Strong Hard Rules, pipeline stage definitions, pre-flight checks. Spec 14/15/16 references. No WP 7.0 section.

**Missing WP 7.0 items:**

- **`role: "content"` absent from Stage 2 MATCH / Stage 3 SLOT-LIST.** When a mockup section maps to a `contentOnly` pattern block, the MATCH stage should note that nested blocks need `role: "content"` to be editable in WP 7.0. Without this, the pipeline can produce technically correct block markup that WP 7.0 renders as fully locked (no operator can edit inner blocks). This is a silent correctness failure for clones that use `contentOnly`.
- **`apiVersion: 3` absent from composition emit (Stage 7).** The COMPOSE stage serialises block markup. WP 7.0 requires `apiVersion: 3` for the iframed editor. If the scaffold emits `apiVersion: 2` or omits the field, blocks deployed from the clone pipeline will trigger WP 7.0 console warnings. No Stage 7 guidance covers apiVersion in the emit.
- **Heading variation shape change.** Stage 3 SLOT-LIST derives slot list from `block.json`. WP 7.0 changes heading blocks from `level` attribute to registered block variations. If the clone pipeline processes extracted markup containing old-style `{"level":2}` heading attributes, the slot-list derivation may misfire against the WP 7.0 `core/heading` schema.
- **Icons block not in MATCH lookup.** Stage 2 MATCH uses `confidence-matrix.py` with class-name and DOM-shape matching. `core/icons` (WP 7.0 native) is not mentioned as a recognisable block shape. Mockups with SVG icon grids that will become Icons blocks on the live WP 7.0 site would fall through to `unrecognised-section`.
- **WP 7.0 heading deprecation caveat.** The slot-list derivation Hard Rule 4 says "auto-derive slot list from block.json on every run." If the pipeline reads `block.json` from a WP 7.0 install where `core/heading` uses variations instead of a `level` attribute, the auto-derive step should not emit a `level` slot. No version guard exists.

**Stale patterns:** No explicitly stale patterns, but the absence of WP 7.0 awareness in MATCH and COMPOSE is a correctness gap as soon as WP 7.0 sites become clone sources or targets.

**Cost: HIGH**

**Recommended action:** Add a WP 7.0 Compatibility note to the Pre-flight checks section covering: (a) `apiVersion: 3` in Stage 7 emit; (b) `role: "content"` for `contentOnly` inner blocks; (c) heading variation shape (treat `core/heading` `level` attr as deprecated in WP 7.0 block schemas; derive from variation name instead); (d) Icons block as a recognisable block shape in Stage 2. Estimated: 30–40 min (spread across multiple stage definitions, each needs a specific note or guard).

---

### 6. wp-blocks (slash command)

**Path:** `~/.claude/commands/wp-blocks.md` (41 lines)

**Current state:** Thin wrapper over `wp-blocks.py` CLI. Lists subcommands. References `Spec 13` in the SGS-BEM section.

**Missing WP 7.0 items:**

- **Spec 13 reference is stale.** The SGS-BEM section says "Canonical reference: `.claude/specs/13-DRAFT-NAMING-CONVENTION.md`". Spec 13 was absorbed into Spec 15 on 2026-05-12 (blub.db row 236). The canonical reference should point to Spec 15 §8.1. This is an internal consistency issue rather than a WP 7.0 gap, but it's the dominant stale pattern here.
- **`wp-blocks.py` DB coverage.** The CLI queries `sgs-framework.db`. If `sgs-framework.db` has been updated by `/sgs-update` to reflect WP 7.0 blocks (Icons block, heading variations), the CLI inherits that coverage without any change to this command file. The command file itself is version-agnostic.
- **No `listView: true` in schema output.** The `schema <block_name>` subcommand shows block attributes. WP 7.0's `listView: true` block support is not mentioned as a field to expose in schema output.

**Stale patterns:** Spec 13 canonical reference (should be Spec 15 §8.1).

**Cost: LOW**

**Recommended action:** Update the SGS-BEM section's canonical reference from `Spec 13` to `Spec 15 §8.1` (one line). Add a note that `schema` output includes the `supports.listView` field when present (WP 7.0 new support). Estimated: 3 min.

---

### 7. wp-hook-graph (slash command)

**Path:** `~/.claude/commands/wp-hook-graph.md` (97 lines)

**Current state:** Hook dependency mapping. Excellent — has Spec 17 canonical hook table. The verified hook database claim says "7,283 hooks."

**Missing WP 7.0 items:**

- **`wp_connectors_init` not in the Spec 17 hook table.** The table correctly lists `save_post_wp_global_styles`, `pre_render_block`, `upgrader_process_complete`, `admin_post_sgs_*`, `init`+`admin_init`. WP 7.0's `wp_connectors_init` is the hook for AI Connectors registration. If `Sgs_Ai_Connector` (Step 7.1) uses it, it should be listed here for completeness.
- **Hook database count.** The command says "7,283 hooks" — no indication whether this has been refreshed for WP 7.0. If `wp-docs.py` was built against WP 6.x data, the validate subcommand would falsely reject WP 7.0-native hooks. This is a data concern, not a skill-file concern, but worth noting.
- **No WP 7.0 hook section.** The Spec 17 table covers SGS-specific patterns well. A brief note on WP 7.0's new core hooks (`wp_connectors_init`, abilities hooks) would complete the picture.

**Stale patterns:** Hook database count claim may be pre-WP-7.0. The skill itself is structurally sound.

**Cost: LOW**

**Recommended action:** Add `wp_connectors_init` to the Spec 17 hooks table (one row). Add a one-line note that the verified database should be refreshed against WP 7.0 source if `validate` rejects WP 7.0-native hooks. Estimated: 5 min.

---

### 8. wp-hooks (slash command)

**Path:** `~/.claude/commands/wp-hooks.md` (87 lines)

**Current state:** Hook lookup and validation. Same Spec 17 hook table as `wp-hook-graph`. Mirrors the gap exactly.

**Missing WP 7.0 items:**

- **Same `wp_connectors_init` gap as `wp-hook-graph`.** The Spec 17 hook table is copy-pasted between the two commands. Both need the same addition.
- **Hook database count "7,283 hooks"** — same data-currency concern as above.
- **`search-hooks` subcommand.** Searching for `wp_connectors_init` on a pre-WP-7.0 database would return no results, causing developers to treat it as unverified. No guidance note.

**Stale patterns:** Hook database count may be pre-WP-7.0.

**Cost: LOW**

**Recommended action:** Same as `wp-hook-graph` — add `wp_connectors_init` row to the Spec 17 table. Add a one-line data-currency note. Estimated: 5 min (identical change to `wp-hook-graph`).

---

### 9. wp-perf-gate (slash command)

**Path:** `~/.claude/commands/wp-perf-gate.md` (24 lines)

**Current state:** Very short PreToolUse hook description. Lists four block patterns and two warnings.

**Missing WP 7.0 items:**

- **`admin_enqueue_scripts` for editor targeting.** WP 7.0's always-on iframed editor means any JS enqueued via `admin_enqueue_scripts` that targets editor DOM silently fails. The perf-gate currently does not scan for this pattern. The Phase 7 original audit flagged it as a concern for `wp-performance` and `wp-project-triage`, but `wp-perf-gate` (the git-commit blocker) is where the enforcement should live.
- **`viewScriptModule` + `defer`/`async` anti-pattern.** ES modules loaded via `viewScriptModule` are natively deferred. Adding explicit `defer`/`async` to a module script is a correctness mistake, not just a perf anti-pattern. Not listed in the gate's block list.
- **Script Module loading anti-patterns.** General WP 7.0 guidance: blocks using `viewScriptModule` should not be loaded via the legacy `wp_enqueue_script` path. This cross-path enqueue is a common WP 7.0 migration mistake.

**Stale patterns:** None found (no version-specific claims).

**Cost: MED**

**Recommended action:** Add `admin_enqueue_scripts` (editor-targeting usage) to the block list with a WP 7.0 iframed-editor note. Add `viewScriptModule` + `defer/async` as a new warning entry. Estimated: 10–15 min (also requires updating the underlying `wp-perf-gate.py` hook script to scan for these patterns — the command file is just the documentation wrapper).

---

### 10. wp-perf (slash command)

**Path:** `~/.claude/commands/wp-perf.md` (16 lines)

**Current state:** Extremely brief — just a CLI wrapper with three subcommand descriptions. No version-specific content.

**Missing WP 7.0 items:**

- **No WP 7.0 performance guidance** — the command is a thin wrapper over `wp-perf.py`. Version-specific guidance lives in the `wp-performance` SKILL.md (which was rated MED in the original audit). The command file itself has no version-specific content, so there is nothing stale here.
- **Client-side image processing.** WP 7.0 moves image resize/compression to the browser before upload. The `audit` subcommand doesn't mention this as a new data point in its output. Minor.

**Stale patterns:** None found.

**Cost: LOW** (the version-specific gap belongs in `wp-performance` SKILL.md, already rated MED in the original audit; this command file is intentionally thin)

**Recommended action:** No changes needed to the command file itself. The `wp-perf.py` tool and `wp-performance` SKILL.md are the correct update targets (already queued in Phase 7a).

---

### 11. wp-scaffold (slash command)

**Path:** `~/.claude/commands/wp-scaffold.md` (15 lines)

**Current state:** Extremely brief — generates a plugin skeleton via `wp-scaffold.py`. Lists what the skeleton includes but says nothing about block.json generation or WP version targets.

**Missing WP 7.0 items:**

- **`apiVersion: 3` absent from scaffold output.** When the scaffold generates a block plugin skeleton, the generated `block.json` defaults (if any are templated) should use `apiVersion: 3` for WP 7.0. No mention.
- **`role: "content"` absent.** The scaffold guidance doesn't mention that `contentOnly` inner blocks should carry `role: "content"` in the generated block.json.
- **`listView: true` support absent.** WP 7.0 blocks with InnerBlocks may want `supports.listView: true`. Not in scaffold guidance.
- **`autoRegister: true` absent.** WP 7.0 PHP-only block pattern. Not mentioned.
- **`wp_set_script_module_translations()` absent.** Plugin scaffolds for blocks that use `viewScriptModule` should include the i18n hook. Not in the scaffold guidance.
- **PHP 7.4 minimum.** The generated `readme.txt` and `plugin headers` should list PHP 7.4 as minimum. No mention.

**Stale patterns:** If the underlying `wp-scaffold.py` generates `apiVersion: 2` in block.json templates, this is an active regression risk — every new plugin scaffolded from this template will ship with a pre-WP-7.0 block API version.

**Cost: HIGH**

**Recommended action:** Update the command file to list WP 7.0 defaults that the scaffold should generate: `apiVersion: 3` in block.json, PHP 7.4 minimum in headers, `wp_set_script_module_translations()` in i18n section. These require updating both the command file guidance AND the underlying `wp-scaffold.py` template files. Estimated: 30–40 min (template file changes + documentation).

---

### 12. wp-theme-check (slash command)

**Path:** `~/.claude/commands/wp-theme-check.md` (16 lines)

**Current state:** Brief — wraps `wp-theme-check.py`. The `argument-hint` shows `--wp-version 6.9` as the default. Two subcommands: `validate` and `presets`.

**Missing WP 7.0 items:**

- **`--wp-version 6.9` default in argument hint.** The default WP version shown to users is 6.9. WP 7.0 is now live. This is the most visible user-facing stale pattern — a developer running `validate theme.json` without specifying a version gets 6.9 validation, silently missing WP 7.0 checks.
- **Pseudo-element support absent.** WP 7.0 adds `:hover`, `:focus`, `:focus-visible`, `:active` in `styles.blocks` and `styles.elements` in theme.json. The validator would need to know about these to flag either missing or incorrect usage. No mention.
- **Preset dimensions (`settings.dimensions.presets`) absent.** New in WP 7.0. No mention.
- **Font Library dedicated page absent.** `Appearance → Fonts` is a WP 7.0 addition. The theme-check tool has no guidance on this.
- **Site Identity → Design panel move absent.** WP 7.0 moves Site Identity controls into the Design panel; themes that reference Site Identity locations may need updating.

**Stale patterns:** `--wp-version 6.9` default in the argument hint. Active stale pattern — affects every invocation without an explicit `--wp-version` flag.

**Cost: HIGH**

**Recommended action:** Update the argument hint default from `6.9` to `7.0`. Update the command guidance to note the four WP 7.0 theme.json additions the tool should check for (pseudo-elements, dimension presets, Font Library page, Site Identity panel). Also requires updating the underlying `wp-theme-check.py` validation logic. Estimated: 30–40 min (tool update + documentation).

---

### 13. clone-patterns (slash command)

**Path:** `~/.claude/commands/clone-patterns.md` (34 lines)

**Current state:** Wraps `wp-pattern-gen.py`. Three subcommands. Has an SGS-BEM section referencing Spec 13 (same stale reference as `wp-blocks.md`).

**Missing WP 7.0 items:**

- **`contentOnly` + `role: "content"` absent.** When `generate` or `clone` produces pattern PHP files, WP 7.0 `contentOnly` patterns require that inner editable blocks carry `role: "content"`. The generated pattern PHP files would produce locked inner blocks without this attribute. No mention in the command guidance.
- **`apiVersion: 3` in generated patterns absent.** The pattern PHP files should reference blocks with `apiVersion: 3`. No guidance.
- **Spec 13 reference stale.** Same issue as `wp-blocks.md` — canonical reference should be Spec 15 §8.1.

**Stale patterns:** Spec 13 canonical reference (should be Spec 15 §8.1).

**Cost: MED**

**Recommended action:** Update Spec 13 → Spec 15 §8.1 reference (one line). Add a note under `generate` and `clone` subcommands that generated pattern PHP should carry `role: "content"` on inner editable blocks for WP 7.0 `contentOnly` compatibility. Add `apiVersion: 3` to block markup in generated patterns. Estimated: 10–15 min.

---

### 14. sgs-db (slash command)

**Path:** `~/.claude/commands/sgs-db.md` (118 lines)

**Current state:** Well-specified query interface. Has a Spec 17 Entity Queries section. SGS-BEM references Spec 15 §8.1 correctly (unlike `wp-blocks.md` and `clone-patterns.md` which still reference Spec 13). Good internal consistency.

**Missing WP 7.0 items:**

- **`schema_metadata` table absent.** The audit brief mentions the post-Phase-4 enriched data including a `schema_metadata` table. The command's subcommand table and Stage 1 mapping do not surface this table. If `sgs-db.py` supports querying it, the command file should document how.
- **WP 7.0-era DB rows.** As of WP 7.0, if `/sgs-update` has scanned the live WP 7.0 install and written new data (Icons block, heading variations, autoRegister blocks), the `stats` and `health` subcommands would reflect this automatically. No command-file change needed for that — the DB is the source of truth.
- **No WP version signal in `stats` output.** The `stats` subcommand returns block count, attribute count, variation count, weakness count. It does not indicate the WP version the last `/sgs-update` scan was run against. A developer can't tell from `stats` output whether the DB reflects WP 7.0 or 6.9.

**Stale patterns:** None found (no version-specific claims). The SGS-BEM canonical reference correctly points to Spec 15 §8.1 — this command is more up-to-date than `wp-blocks.md` and `clone-patterns.md`.

**Cost: LOW**

**Recommended action:** Add `schema_metadata` as a documented subcommand target (or a note that it is accessible via `sql "SELECT * FROM schema_metadata"`). Add a note to `stats` output that it should display the WP version the last `/sgs-update` scan targeted. Estimated: 5 min.

---

## Recommendations

### Phase 7b — Inline in this session (LOW cost targets)

| Target | Cost | Why inline |
|--------|------|------------|
| `wordpress-router` | LOW | Frontmatter fix + one routing row + triage signal note |
| `sgs-extraction` | LOW | One-paragraph WP 7.0 note in Stage 3 |
| `wp-blocks.md` | LOW | Spec 13 → Spec 15 reference + `listView` note (3 min) |
| `wp-hook-graph.md` | LOW | `wp_connectors_init` row + data-currency note (5 min) |
| `wp-hooks.md` | LOW | Identical change to `wp-hook-graph.md` (5 min) |
| `wp-perf.md` | LOW | No changes needed — already captured in `wp-performance` SKILL.md queue |
| `sgs-db.md` | LOW | `schema_metadata` note + WP version signal note (5 min) |

### Phase 7c — Defer (HIGH + MED cost targets)

| Target | Cost | Why defer |
|--------|------|-----------|
| `sgs-wp-engine` | HIGH | Multiple scattered sections; requires `Sgs_Ai_Connector` code reference verification |
| `sgs-clone` | HIGH | Stage-level notes across 4 stages; correctness risk if done quickly |
| `wp-scaffold` | HIGH | Requires updating underlying `wp-scaffold.py` template + documentation |
| `wp-theme-check` | HIGH | Requires `wp-theme-check.py` logic update for WP 7.0 validator + default version bump |
| `wp-perf-gate.md` | MED | Requires `wp-perf-gate.py` scanner update + command doc |
| `clone-patterns.md` | MED | `role: "content"` + `apiVersion: 3` + Spec 13 fix |

**Priority within Phase 7c:**
1. `wp-scaffold` — highest blast radius (every new plugin scaffolded gets the wrong `apiVersion`)
2. `wp-theme-check` — default version 6.9 is the most visible active stale pattern for users
3. `sgs-clone` — correctness risk (silent block-locking on WP 7.0 sites)
4. `sgs-wp-engine` — routing gaps; no live breakage today but compounding miss over time

---

## Cross-skill cohesion notes

**1. AI Connectors routing gap across three skills.**
`wp-plugin-development` (original Phase 7 audit) documents `wp_connectors_init` registration. `sgs-wp-engine` does not route to it. `wordpress-router`'s `decision-tree.md` has no AI Connectors routing row. `wp-hooks.md` and `wp-hook-graph.md` don't list `wp_connectors_init` in their Spec 17 tables. The Connectors API was added in four independent skill updates but the routing and lookup surfaces weren't synced. A developer asking "how do I add AI to my plugin?" would not find the `wp_connectors_init` hook via any of the SGS routing tools.

**2. Spec 13 vs Spec 15 §8.1 reference split.**
`sgs-db.md` correctly references `Spec 15 §8.1`. `wp-blocks.md` and `clone-patterns.md` both still reference `Spec 13`. Spec 13 was absorbed into Spec 15 on 2026-05-12 (blub.db row 236). This creates an inconsistent canonical reference across three commands that all claim the same BEM convention.

**3. Hook database version currency — cross-skill blind spot.**
Both `wp-hooks.md` and `wp-hook-graph.md` claim "7,283 hooks" in the verified database. Neither mentions whether this count covers WP 7.0 hooks. If `wp-docs.py` was indexed against WP 6.x, running `validate wp_connectors_init` would return "unverified" — causing developers to distrust a perfectly valid WP 7.0 hook. Both commands need a single-line data-currency note and a path to re-index.

**4. `apiVersion 3` enforcement gap — scaffold to clone pipeline.**
`wp-scaffold` generates new plugin skeletons (no `apiVersion: 3` guidance), `sgs-clone` produces block markup (no `apiVersion: 3` in compose stage), and `clone-patterns.md` generates pattern PHP (no `apiVersion: 3` in output). All three are independently missing the same WP 7.0 block API version requirement. A full-stack fix requires updating all three consistently.

**5. Iframed-editor present-tense gap — two skills.**
`sgs-wp-engine` (Phase 1 Read First section) still says the editor "may run" in an iframe. `wp-block-development` (original audit) says it "will run" — future tense. Both should say it "runs in an iframe for `apiVersion: 3` blocks." Two-skill fix, consistent phrasing needed.
