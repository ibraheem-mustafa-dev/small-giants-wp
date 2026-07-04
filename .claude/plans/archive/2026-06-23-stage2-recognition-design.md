---
doc_type: design
project: small-giants-wp
thread: cloning-pipeline
spec_ref: specs/31-UNIVERSAL-CLONING-PIPELINE.md §12.6 step 3 / §12.7 (Stage 2)
created: 2026-06-23
updated: 2026-06-24
version: v2 — ADVERSARIAL-COUNCIL-CORRECTED (6 personas, fact-checked STOP-15) + Bean scope decision
status: DRAFT v2 — pending Bean sign-off (Rule 7). Council NO-GO-as-written folded; phantom APIs replaced with verified ones.
authors: Opus rebuild-orchestrator
supersedes: none (extends the BUILT slice — plans/2026-06-23-modular-scaffold-design.md)
binding_rules: R-22-1 (DB-first, names-no-block), R-22-9 (universal, no carve-outs), R-22-11 (verify rendered output), R-22-13 (Bean eye co-authoritative), FR-22-20 (variant_slots/variant_attr)
council: 6-persona adversarial-council 2026-06-23 (cynic/transpiler-correctness/ship-PM/spec-lawyer/cheat-red-teamer/non-coder-QC). Grades C-/D/C+/C/C+/C. NO-GO as written → corrected in §10.
bean_decisions:
  - S2-scope=UNIVERSAL fork (composites AND atomic AND scalar this stage) — Bean RE-RATIFIED 2026-06-24 against the council's re-scope recommendation (his "comprehensive, no carve-outs" principle). Hero is the LANDED-proof target.
  - S2-unknown=fail that section LOUDLY (red coverage row + hard gate fail on NEW UNRECOGNISED), finish the rest; never abort whole clone; never silent empty sgs/container emit.
---

# Stage 2 — recognition / Method-2 (modular rebuild, step 3 stage 1) — v2

## 0. Plain English — what this is and why

**Problem (RE-FRAMED 2026-06-26 by qc-council — the original "hero falls to sgs/container@conf-0.10" premise was FALSIFIED).** The FROZEN engine ALREADY recognises `.sgs-hero`→`sgs/hero` (and `.sgs-trust-bar`→`sgs/trust-bar`) with the `variant` attr set — verified against the 2026-06-21 live run (hero emits `wp:sgs/hero`, `variant` present). So this is NOT a live-bug fix — that live check served ONE purpose: to correct the stale "hero is broken" framing in the docs (which had wrongly justified recognition-first as "the most broken lever"). It is NOT the design source. The real problem: the FRESH `converter/` engine (D-MODULAR) has **no recognition at all** yet — the slice only transfers `max-width`. Stage 2 **BUILDS recognition fresh from the draft + DB + Spec** (Spec 22 §FR-22-3 + Spec 00 naming + the DB tables) so `convert.py` can eventually be retired. It does NOT replicate the frozen engine's recognition logic — we neither know nor care whether that logic is right for the right reasons; the fresh engine earns its own correctness draft-vs-clone. **Baseline = the empty new-engine; oracle = the draft; NEVER the frozen output** (which would falsely say "already done"). Success metric: "the fresh engine produces correct hero recognition + variant from the draft+DB, proven draft-vs-clone, zero cheats."

**The primitive.** *Route every draft BEM root to its native block, entirely from the database, naming no block in code.* `sgs-hero` → strip `sgs-` → `sgs/hero`; the DB confirms registration, picks the variant, and says whether it holds child blocks. Recognition is a **new component upstream of the dispatch table** that builds the `Ctx` the existing resolvers consume — NOT one of the six CSS-transfer resolver stubs.

**What Bean signs off** (R-22-13): a real `.sgs-hero` on canary page 8 clones as `wp:sgs/hero` with the **correct variant** (its live wrapper carries the variant-exclusive class `sgs-hero--split`) instead of `wp:sgs/container` — proven on the live rendered page via a before/after screenshot pair + plain-English recognition report (§5/§9-fold-K).

## 0.1 Bean's ratified scope decisions
- **S2-scope = UNIVERSAL fork (re-ratified 2026-06-24).** Recognition resolves *every* draft BEM root — composites (hero, cta-section), atomic-tag blocks (h1→sgs/heading), AND scalar element-slots (sgs-hero__heading→sgs/heading) — names-no-block (R-22-9), all this stage. The council recommended cutting atomic+scalar to later stages (stall risk); Bean re-ratified universal on his "comprehensive, no carve-outs" principle. **Mitigation that makes this affordable:** every branch reuses an EXISTING verified frozen function (none is unbacked — §1) — the council's "unbacked" premise flipped in fact-check.
- **S2-unknown = loud per-section failure, finish the rest.** Unrecognised block → loud RED `UNRECOGNISED` row + hard gate failure on any *new* `UNRECOGNISED` (baseline today's first, §9-fold-J), rest of page still clones. Never abort; never silent empty `sgs/container`.

## 1. The recognition algorithm — built on VERIFIED APIs (no phantom calls)

Fact-checked every API against `db_lookup.py` (STOP-15). Verified call sites cited inline. Given a parsed `bs4.Tag` node + the page `css_rules: dict[str, dict]` + an open `conn`:

**The recognition contract — defined ONLY from the DRAFT + DB + Spec (not from what any current code does).** Per Spec 22 §FR-22-3 + the Spec 00 naming convention (`.sgs-<block>` BEM root ↔ block `sgs/<block>`): every BEM-classed draft node resolves to a block slug via a DB lookup, and a top-level section whose BEM root class maps to a registered composite (`block_exists`) **emits AS that composite** — the hero IS the section, not a generic wrapper. We do NOT consult the frozen engine to learn "how recognition is done", do NOT define this by reference to its FR-22-4/container-default behaviour, and do NOT care whether the current code reaches this conclusion or for what reasons. The fresh engine is specified by the draft's BEM + the DB; correctness is proven draft-vs-clone (D-B). The captured lesson applies: Spec + DB + draft are the authority, never `convert.py`.

```
recognise(node: bs4.Tag, css_rules: dict) -> Recognition:
    # BEM is the ONLY recognition signal (R-22-2 / Spec 00 §3.1 / Spec 22 FR-22-3).
    # No structural heuristics, no frozen-engine logic. A node either carries a
    # registered BEM root class (→ that block via db_lookup.block_exists) or it
    # does not (→ atomic / scalar / unrecognised). The sgs-<x> → sgs/<x> mapping
    # is the Spec 00 NAMING CONVENTION, not a convert.py behaviour.

    root_classes = [c for c in node classes if c.startswith("sgs-") and "__" not in c and "--" not in c]

    # 1. NAMED / composite — a BEM root class mapping to a registered slug.
    candidates = [("sgs/" + c[4:]) for c in root_classes if db_lookup.block_exists("sgs/" + c[4:])]   # block_exists: db_lookup.py:300 ✓
    if candidates:
        slug = _pick_root(candidates, conn)        # MF-6 tie-break: prefer container_kind='section' > 'layout' > 'content';
                                                   # if still ≥2 → UNRECOGNISED + WARN (never source-order pick)
        kind             = "named"
        container_kind   = _get_container_kind(slug)                  # §9-fold-A: NEW db_lookup.get_container_kind (no phantom)
        has_inner_blocks = derive_has_inner_blocks(slug)              # §3: DERIVE fresh from save.js+render.php (NOT the cached column — Spec 31 §12.7)
        return Recognition(kind, slug, container_kind, has_inner_blocks)

    # 2. ATOMIC-TAG — no sgs- root class, tag maps to a block (h1→sgs/heading).
    atom = db_lookup.atomic_tag_map().get(node.name)                 # atomic_tag_map: db_lookup.py:2815 ✓ (EXISTS — council flip)
    if not root_classes and atom is not None:
        return Recognition("atomic", atom, _get_container_kind(atom, conn), 0)   # leaf → has_inner_blocks=0 (SF-2)

    # 3. SCALAR element-slot — a BEM element class (sgs-x__y) on this node mapping to a slot's standalone_block.
    canonical_slot = _bem_element_to_canonical_slot(node)            # parse __y token → canonical slot
    slot_slug = db_lookup.standalone_block_for(canonical_slot) if canonical_slot else None   # standalone_block_for: db_lookup.py:356 ✓
    if slot_slug is not None:
        return Recognition("scalar", slot_slug, _get_container_kind(slot_slug), 0)

    # 4. UNRECOGNISED — a BEM-classed node that resolves to no registered block. LOUD RED, finish the rest.
    return Recognition("unrecognised", None, None, None)
```
**Connection model (cynic MF-2 fold):** the reused `db_lookup` readers open their own (lru_cached) connection — they do NOT honour a passed `conn`. So recognition does NOT thread a decorative `conn`; new readers (`get_container_kind`) follow the same db_lookup pattern. A test that points at a fixture DB must patch `db_lookup.SGS_DB`, not pass a connection (documented, not silently assumed).

**Scalar DATA gap (verified, flagged not hidden):** `slots.standalone_block` is **40/103 populated** (2026-06-24). So the scalar branch will return `unrecognised` (loud RED) for the 63 unmapped element-slots — which is the CORRECT honest behaviour (S2-unknown: loud, never silent), NOT a bug, but it means scalar *coverage* is data-limited until those slots are seeded via `/sgs-update`. The fixture set's scalar fixtures must use *populated* slots; an unpopulated-slot fixture is the intentional-bogus loud-fail case. This is the gate-arm baseline concern (§9-fold-J) — baseline today's unmapped-slot UNRECOGNISED set, fail on NEW.

**Variant** is resolved in a thin SEPARATE step, NOT inside `recognise()` (it needs extracted attrs — §2). `Recognition` carries `slug`; variant is attached at the recognition→extraction boundary.

**`Recognition` dataclass (added to context.py — MF-3, complete + typed):**
```python
@dataclass(frozen=True)
class Recognition:
    kind: Literal["named", "atomic", "scalar", "unrecognised"]
    slug: str | None            # None ONLY when kind == "unrecognised"
    container_kind: str | None  # section|layout|content|None
    has_inner_blocks: int | None  # 0|1; None only when unrecognised
    variant_attr: str | None = None    # filled by the variant step (§2), not recognise()
    variant_value: str | None = None
```

**`assert_never` (MF-4, corrected):** `kind` is a closed `Literal`, so exhaustiveness is a **static** mypy `--strict` guarantee (a new kind is a compile error at the definition). The runtime `assert_never` in the emit dispatcher guards only against an `Any`-typed corruption injecting a non-Literal value; `unrecognised` is a normal *handled* case (branch 4), routed BEFORE the emit match. Static-exhaustiveness and runtime-corruption-guard are stated as two distinct things, not conflated.

**Names no block (R-22-1/R-22-9):** no `if slug == "sgs/hero"`. Every fork keys on DB facts (`block_exists`, `atomic_tag_map`, `get_container_kind`, `standalone_block_for`). The `no_slug_literal` AST gate is extended to cover the new files (§9-fold-G).

## 2. Variant detection — the BEM modifier matched against `variant_slots.variant_value` (CORRECTED 2026-06-26)

**The variant is carried in the draft as a BEM MODIFIER on the block root class** — confirmed on the REAL canary hero root: `class="... sgs-hero sgs-hero--split sgs-hero--align-left ... wp-block-sgs-hero ..."`. `split` ∈ the block's `variant_slots.variant_value` set {split, standard, svg-animated, video}; `--align-left`/`--desktop`/`--mobile` match no variant_value and are correctly ignored. So variant detection is **pure BEM (R-22-2, the only signal) + the DB (R-22-1, `variant_slots`/FR-22-20)**, runs at recognition time, NO Stage-4 extraction dependency, NO per-slot hand-dict.

**Why the earlier "bounded discriminator extract / `detect_variant(populated_attrs)`" framing was WRONG (DB evidence, 2026-06-26):** the discriminating `unique_slot`s have NO DB-derivable draft signal sufficient to discriminate — `backgroundImage` (standard) and `backgroundVideo` (video) **share** `derived_selector='.sgs-hero__backgroundMedia'`, `svgContent` has none, and `output_signature`/`equivalent_implementations` are NULL. The frozen `detect_variant` only works because it runs POST-extraction (the attrs are already populated by the `<img>`/`<video>`/`<svg>` detection). Doing that at recognition time would need a per-slot element-type hand-dict (the forbidden R-22-1 cheat). The BEM modifier sidesteps all of it — the draft already names the variant.

**Rule** — `services/variant_detect.detect_variant_for_node(node, slug)`:
1. `variant_attr = db_lookup.variant_attr_for(slug)`; null → `(None, None)` (block has no variant).
2. `values = {variant_value}` from `db_lookup._variant_slots_map(slug)` (DB, FR-22-20).
3. Extract the root's `sgs-<block>--<modifier>` tokens (Spec 00 naming `sgs/<block>`↔`sgs-<block>`); keep those whose modifier ∈ `values`.
4. **Exactly one** match → `(variant_attr, value)`. **Zero** → `(variant_attr, None)` (block default, logged note). **≥2 distinct** → `(variant_attr, None)` + ambiguity surfaced (never guess — cynic SF-3).

**Anti-cheat (cheat MF-1):** the mechanism reads `variant_slots.variant_value` and matches the draft's own modifier — there is no place to smuggle a literal `"split"` (it's compared *to the DB set*, not asserted). `no_slug_literal` (extended to `variant_detect.py`) + a DB-coupling test (a `variant_slots` view returning a different `variant_value` → the matched output changes) prove it reads the table. **Conformance caveat:** a non-SGS-BEM draft lacking the modifier → variant=None (block default); SGS-BEM is the draft standard (Spec 15 §8.1) and `/sgs-clone` Stage 0 hard-rejects non-conforming production drafts, so conforming drafts carry the modifier. A future content-inference secondary (post-extraction `detect_variant`) is OUT of this stage.

## 3. has_inner_blocks — DERIVED at convert-time from save.js (Spec 31 §12.7 LITERAL requirement)

**Spec 31 §12.7 Stage-2 row is explicit: "derive at convert-time from the save.js marker, NOT a cached column."** So recognition does NOT read the cached `block_composition.has_inner_blocks` column (`block_accepts_inner_blocks` is rejected here — qc-inline 2026-06-26 flagged it as a literal-spec deviation: a stale column mis-routes silently, the exact failure the spec forbids). Instead, `derive_has_inner_blocks(slug)` is built FRESH in the converter and computes the AND-rule from the block's own source: `1 iff (the block's save.js emits <InnerBlocks.Content) AND (its render.php consumes $content)`, honouring a `block.json supports.sgs.hasInnerBlocks` override (+ `hasInnerBlocksReason`). This is a small, self-contained reader of `src/blocks/<name>/{save.js,render.php,block.json}` — convert-time derivation, NOT a cached read, NOT an import of `check_composition` (build fresh; the AND-rule is re-implemented in `services/has_inner.py`, not borrowed across the db-consistency package). **F6 db-consistency remains the cross-check** (the spec says "Stage 2 / 4f + F6 pre-flight"): F6 already verifies the cached column agrees with this same AND-rule, so a divergence between the convert-time derivation and the column is a F6 violation surfaced pre-flight. Atomic/scalar leaves assert `0` (SF-2 — leaves cannot host children).

## 4. Module shape (a new upstream component; gates extended to it)
```
converter/
├── recognition.py            # NEW — recognise() (§1). Added to no_slug_literal scan (§9-fold-G).
├── services/
│   ├── variant_detect.py     # NEW — db_lookup.detect_variant + variant_slots discriminator gather (§2). Scanned ✓.
│   ├── has_inner.py          # NEW — derive_has_inner_blocks(slug): fresh save.js+render.php AND-rule, NOT the cached column (§3). Scanned ✓.
│   └── recognise_helpers.py  # NEW — _get_container_kind, _bem_element_to_canonical_slot, _pick_root. Scanned ✓.
├── context.py                # Recognition dataclass added (typed seam, frozen) (§1).
└── tests/
    ├── test_recognition.py        # named/atomic/scalar/unrecognised + multi-root tie-break + assert_never-static
    ├── test_variant_detect.py     # 4 hero variants + zero/≥2-loud-fail + DB-coupling test (real, not xfail)
    └── test_recognition_landed.py # the L1 oracle assertion (§5)
```
`process_element` (orchestrator) unchanged; a thin **Recognition→Ctx adapter** (§9-fold-M) builds the `Ctx`. `unrecognised` (slug=None) routes to a coverage RED row WITHOUT entering resolver dispatch (which expects a real slug). convert.py byte-identical (D-MODULAR). models.py gains `GapOrigin.UNRECOGNISED` (§9-fold-E). New DB accessor `get_container_kind` added to db_lookup.py via the migration/`/sgs-update` discipline if it touches data (it's a pure reader → just a function).

## 5. The correctness gate — LANDED for a recognition change (council headline #1 fold)

A recognition change transfers no CSS value; it picks the block. So LANDED is split into two honestly-scoped tiers (ship-PM MF-4 / cheat MF-5 / transpiler MF-2 / non-coder M1):

- **L1 — THIS stage's gate (provable now, no content needed):** deploy the new engine's hero emit to a fresh canary page (guard-safe REST create) → anonymous Playwright → assert the live section's wrapper carries the **block-identity-EXCLUSIVE class** `sgs-hero--<variant>` ([render.php:503](plugins/sgs-blocks/src/blocks/hero/render.php#L503) — `sgs/container` can NEVER emit this) AND the base `wp-block-sgs-hero` class, painted from the variant attribute ALONE. This proves "right block, right variant on the live page" without depending on Stage-4 content. NOT `innerText>0` (content is Stage 4 — gating on it would falsely fail an empty Stage-2 hero). NOT grid-behaviour alone (a container can grid — false pass).
- **L2 — DEFERRED to Stage 4:** the split-grid 2-col/stack rendered behaviour (`grid-template-columns`) is Stage-4's acceptance, not this stage's.
- **Ledger (F2 + §12.6.6):** on the multi-shape fixture set, recognisable shapes produce zero UNACCOUNTED + zero `UNRECOGNISED`; an intentionally-bogus fixture produces exactly one loud `UNRECOGNISED` (tested failure-path) AND the rest of the page still clones (a separate test asserts N-1 sections still emit — cheat SF-4).
- **Metamorphic (real):** source-order permutation → identical recognition. (The "BEM-synonym rename" relation is dropped for the root-class branch — recognition is a pure prefix-strip with no synonym table, so the relation was vacuous (transpiler SF-1); it's kept only for the scalar branch where `slots.aliases` provides real synonyms.)

## 6. Acceptance (this stage)
- A `.sgs-hero` draft routes to `sgs/hero` with the correct variant via frozen `detect_variant` (not `sgs/container`).
- L1 LANDED: the live page-8 hero wrapper carries `sgs-hero--<variant>` (block-identity-exclusive), draft-vs-clone, on the multi-shape fixture set + a real page-8 hero (A3).
- `UNRECOGNISED` is a tested loud failure-path; rest-of-page-still-clones tested; unknown-kind is static-exhaustive (mypy) + runtime-corruption-guarded.
- `no_slug_literal` (extended to recognition.py + bare-return detection) + `import_ban` green; variant DB-coupling test + has_inner + recognition tests real (not vacuous xfail).
- coverage_report `--check` exits 1 on a bogus fixture, 0 clean; baseline of today's page-8 UNRECOGNISED captured first (fail on NEW only).
- convert.py byte-identical. Bean signs the before/after hero screenshot pair + recognition report (§9-fold-K).

## 7. Build orchestration (per-stage ritual — do NOT batch)
`/adversarial-council` done (this doc, §10) → Bean sign-off on v2 → `/subagent-driven-development` (sonnet implementers per file: recognition.py / variant_detect.py / recognise_helpers.py + spec & quality reviewers; cold prompts: "implement only your assigned files; do NOT write shared docs or touch the shared git tree; reuse the cited frozen functions, build no parallel mechanism") → I re-run every gate `--check` + the suite myself from the canonical cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`) + prove each failure path (STOP-16) → `/qc-council` before commit → deploy (STOP-21 recipe) → L1 live LANDED verify → ledger+oracle gate → Bean sign-off → path-scoped commit (exclude `__pycache__`; verify HEAD after any rename, STOP-19) → D-ceiling check before any new D (→ D243).

## 8. Risks / guardrails carried
- STOP-9 variant grids are DB-defined — §2 reuses frozen detect_variant on variant_slots, never an `if slug==`.
- STOP-10 empty cloned section = usually a cv2 soft-fail — read extract.json status first; L1's marker check (not innerText) avoids the empty-hero false-win.
- A14 — generalisation NEVER banked; each branch (named/atomic/scalar/variant) earns its own LANDED/test proof.
- STOP-11 schema≠usage — every reused column/function (variant_attr, container_kind, standalone_block, atomic_tag_map) was grepped for its real signature before citing (§1).
- gate-arm precondition (STOP-14) — coverage `--check` baselined against today's page-8 output before arming; fail on NEW only.

## 9. Council fold (v2) — every must-fix → its fix (convergence-first)
- **A (phantom `container_kind`)** → add `db_lookup.get_container_kind(slug, conn)` (parallels `get_block_composition_role:504`); no inline-query divergence. [spec-lawyer MF-1, phantom-API MF-1]
- **B (phantom `standalone_block_for_element`)** → use real `standalone_block_for(canonical_slot)` + a cited `_bem_element_to_canonical_slot` reusing the frozen `equivalent_block_for:2171` path. [transpiler MF-3, phantom MF-2]
- **C (FATAL: variant keys on extracted attrs)** → reuse frozen `detect_variant`; variant step at the recognition→extraction boundary, not inside recognise(). [transpiler MF-1, ship-PM MF-4]
- **D (has_inner filesystem scan / hyphen-import)** → `block_accepts_inner_blocks(slug)`. [cynic MF-1, cheat MF-4]
- **E (no `UNRECOGNISED` GapOrigin)** → add `GapOrigin.UNRECOGNISED` to models.py (distinct from UNROUTED: UNROUTED=known-writer-path-no-attr; UNRECOGNISED=no block identity). [spec-lawyer MF-5]
- **F (assert_never collapse)** → static mypy exhaustiveness + runtime guard for Any-corruption only; unrecognised is handled. [transpiler MF-4]
- **G (gate blind spots)** → extend `no_slug_literal` `_SCAN_DIRS` to include `converter/recognition.py` + add bare-string-return/assign detection in variant code; add a variant DB-coupling test. [cheat MF-1, MF-2, M1]
- **H (UNRECOGNISED hard gate is prose)** → add `coverage_report.py --check` (exit 1 on UNRECOGNISED) wired to the prebuild suite + f5-commit-gate. [cheat MF-3]
- **I (LANDED depends on Stage 4 / false win)** → L1 (block-identity-exclusive `sgs-hero--variant` class) vs L2 (grid, Stage 4); not innerText, not grid-alone. [ship-PM MF-4, cheat MF-5, transpiler MF-2]
- **J (gate bricks day-one)** → baseline today's page-8 UNRECOGNISED first, fail on NEW. [ship-PM M-3]
- **K (Bean can't sign off)** → a **recognition report**: per section → BEM class → detected block → variant → L1 y/n + plain-English pass line + a "what each variant looks like" legend + a **before/after screenshot pair** (draft vs live clone @1440+375) + a plain-English UNRECOGNISED message with "what to do if it fails: flag to the developer, the block type may not be in the DB yet". [non-coder M1/M2/M3, S1-S3]
- **L (multi-root tie-break — built FRESH, no frozen port)** → the naive loop's wrapper-misrecognition is fixed WITHOUT porting `_absorb_transparent_wrappers`/`_ABSORB_GAP_PROPS` (those are old-engine heuristics we are replacing, not reusing — and importing them breaks the import-ban). `_pick_root` is pure-DB: prefer `container_kind='section'` > `'layout'` > `'content'`; still ≥2 → UNRECOGNISED+WARN, never source-order. BEM is the only signal (R-22-2). [transpiler MF-5, spec-lawyer MF-6 — re-solved name-free]
- **M (Recognition→Ctx integration unstated)** → define the adapter + the unrecognised(slug=None) path that produces a coverage row without crashing resolver dispatch. A recognised composite emits AS the section (per §1 recognition contract — Spec 22 FR-22-3), via the slice's `emit_block_markup`, built fresh — NOT the frozen walk's emission logic. [cynic M-2]
- **N (universality evidence)** → add a `testimonial` cross-check fixture (the only other variant block) + ≥1 fixture per container_kind + ≥1 atomic + ≥1 *populated*-slot scalar + ≥1 bogus. [transpiler SF-3, ship-PM M-2]
- **O — REMOVED.** The v2 "one-time frozen-output snapshot for the atomic branch" is DELETED: a snapshot of the frozen engine's output IS using the broken engine as a reference, which D-B forbids (the old engine is never an oracle, even for "un-disputed" branches). The oracle is the DRAFT + the DB, never `convert.py`'s output. Atomic correctness is proven by `atomic_tag_map`'s DB-driven result + the draft-vs-clone render, not by agreeing with the old engine.
- **node/css_rules types pinned** → `bs4.Tag`, `css_rules: dict[str,dict]`. (Type shapes only — NOT a reuse of convert.py's resolution logic.) [spec-lawyer/transpiler MISSING]

## 10. Council verdict + disposition
6 personas, grades C-/D/C+/C/C+/C, NO-GO as written. Convergent headlines: (#1, 4 personas) recognition can't visibly land on its own → L1/L2 split (folded I); (#2, 3 personas) re-scope to composite-only → **Bean re-ratified UNIVERSAL** (his call; council advised, did not overrule — §0.1). Fatal single-voice (transpiler MF-1, variant keys on extracted attrs) → folded C. All phantom-API findings fact-checked (STOP-15): `atomic_tag_map`/`block_accepts_inner_blocks`/`detect_variant`/`block_exists`/`standalone_block_for`/`equivalent_block_for` all EXIST (council's "atomic doesn't exist" + "check_composition is the only path" both flipped); `container_kind`/`standalone_block_for_element`/`UNRECOGNISED`-origin/coverage-`--check`/recognition.py-in-scan all confirmed missing → folded A/B/E/H/G. **Disposition: GO conditional on §9 folds + Bean sign-off on v2.**
