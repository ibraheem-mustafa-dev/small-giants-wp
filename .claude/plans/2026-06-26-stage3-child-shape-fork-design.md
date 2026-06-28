---
doc_type: design
project: small-giants-wp
thread: cloning-pipeline
spec_ref: specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.0/§12.6 step 3/§12.7 (Stage 3-4, the content / block-equivalent extraction) · cloning-pipeline-stages.md Stage 3 (slot list) + Stage 4 (universal block-equivalent extraction) · specs/22 FR-22-2 / FR-22-2.1 / FR-22-2.2 / FR-22-5.3 / FR-22-2.5
created: 2026-06-26
updated: 2026-06-26
version: v3 — TWO council rounds + Opus DB/spec fact-check of every load-bearing claim. Round-1 fixed the fatal fork mechanism (v1→v2); round-2 validated the corrected mechanism SOUND + surfaced 12 concrete implementation must-fixes (folded here, v2→v3). Build-ready pending Bean sign-off.
status: "⛔ SUPERSEDED by D246 (2026-06-27) — the SEPARATE-CONTENT-ENGINE ARCHITECTURE of this doc is WRONG. Content + CSS are ONE dispatch (Spec 31 §1); the correct build modularises the WORKING `_lift_scalar_attrs_by_selector`/`_lift_scalar_media_from_img` functions INTO the one dispatch table, NOT a parallel `extraction.py` (run_mechanism_a/b) + new db_lookup columns. KEEP for reference only: the MECHANISM details — the FR-22-5.3 slot-keyed fork (NOT equivalent_block_for(slug,slot)), the D212 regression guard, the 6-role payload, the silent-drop coverage, the input-class≠output-class trap — remain valid and should be PORTED into the unified Spec 31 §3, but as the content BRANCH of the one dispatch, never a separate engine. Doc-council root-cause: patient-zero framing was the 2026-06-23 modular-scaffold's separate scalar_content/scalar_media stubs."
authors: Opus rebuild-orchestrator
supersedes: v1 (fatal fork mechanism) + v2 (phantom funcs / missing guards) — see §12
binding_rules: R-22-1 (DB-first, names-no-block) · R-22-2 (BEM is the only signal) · R-22-9 (universal, no carve-outs) · R-22-11 (verify rendered output) · R-22-13 (Bean eye co-authoritative) · FR-22-2/2.1/2.2 (content fork) · FR-22-5.3 (the SLOT-KEYED predicate, NOT equivalent_block_for(block,slot)) · FR-22-3 (single recursive walker, 3 exceptions)
council: 6-persona adversarial-council 2026-06-26 (cynic/transpiler-correctness/ship-PM/spec-lawyer/cheat-red-teamer/non-coder-QC). Grades C+/D/C+/C+/C+/C-. NO-GO as written — fatal fork-mechanism error, Opus-fact-checked TRUE against the live DB + Spec 22 §FR-22-5.3. Corrected in §1 + §12.
bean_decisions:
  - S3-scope = ONE UNIVERSAL Spec-31 stage (the content / block-equivalent extraction across ALL block-shapes — Bean re-ratified 2026-06-26 against the council's "cut to one testimonial quote" recommendation, grounding it in Spec 31 §12.0 "each stage universal across all block-shapes before the next"). The council's value was the MECHANISM fix, not the scope cut.
  - S3-cadence = vertical-slice as a BUILD CADENCE within the one stage (D242/D243): testimonial quote text = first LANDED proof, THEN generalise the SAME mechanisms to all shapes under the one ledger+oracle gate (exactly how Stage 2 landed hero-first then all 10 variants).
  - S3-arrays = FR-22-2.5 many-children (card lists) is the one shape with genuinely-absent emit machinery; IN or OUT of this stage decided by whether the multi-shape fixture set needs it (STOP-18, cited evidence), never by habit.
---

# Stage 3-4 — universal content / block-equivalent extraction — v2

## 0. Plain English — what this is and why

**Problem.** Recognition (Stage 2, D244) gets a draft section's **identity** — "this is a testimonial." But the testimonial holds **content** — a quote, a name, an avatar — and nothing extracts it yet, so a recognised testimonial **renders blank** (the exact D244 finding). The fresh `converter/` engine recognises blocks + transfers the section's own box-CSS (the slice's `max-width`), but has **no content extraction**.

**Effect.** Every content-gated composite on the page recognises and comes out **hollow**. This is the single biggest remaining fidelity lever (§12.7).

**Solution — the primitive.** *Given a recognised composite, lift each of its content slots from the draft to the correct native destination — either a typed scalar attribute on the parent (for scalar-leaf blocks) or a child InnerBlock (for InnerBlocks-composing blocks) — entirely from the database, naming no block, dropping no content.* A `<blockquote class="sgs-testimonial__quote">Best munchies ever</blockquote>` → the DB says the testimonial carries a `scalar-content-lift` capability and its `quote` attr has `derived_selector='.sgs-testimonial__text, .sgs-testimonial__quote'` → match the draft node by that selector → lift its text into `quote` → `wp:sgs/testimonial {"quote":"Best munchies ever", ...}` → the quote renders live.

**WHY v2 exists (the v1 lesson, kept visible):** v1 designed the fork on `equivalent_block_for(slug, slot)`. The 6-persona council flagged this and I **fact-checked it TRUE against the live DB + Spec 22**: that function is **attr-keyed**, Spec 22 §FR-22-5.3 *explicitly names passing it a slot a "qc-council fatal catch"*, and `equivalent_block_for('sgs/testimonial','quote')` returns **`'sgs/quote'`** (not None) — v1 would have routed the quote into a child block the typed render ignores = the **D212 empty-testimonial bug it was meant to kill**. v2 uses the SHIPPED, spec-correct mechanism (§1), re-derived fresh from the DB (never `convert.py`'s implementation — STOP-22).

## 0.1 Scope (Bean-ratified 2026-06-26)

**ONE UNIVERSAL Spec-31 stage** (Spec 31 §12.0: "each pipeline stage universal across ALL block-shapes; do not start stage N+1 until stage N passes"). The stage = the content / block-equivalent extraction (pipeline Stage 3 slot-list feeding Stage 4 extraction). It builds **both** content mechanisms (§1), gated by the ledger+oracle on the **multi-shape fixture set** (zero UNACCOUNTED + zero WRITTEN-not-LANDED). NOT cut to one block (that would slice below Spec 31's stage granularity).

**Vertical-slice = the BUILD CADENCE within the one stage** (D242/D243), not the scope. Build + prove the simplest shape LANDED first, then generalise the SAME mechanism to every shape under the one gate — exactly how Stage 2 built one recogniser, proved it on hero, then verified universal across all 10 variants:
1. **Mechanism A first LANDED proof:** testimonial `quote` text on the live page (scalar-content-lift via `derived_selector`). Closes the D244 gap. Simplest: selector match → scalar attr, no child-block serialisation, no `deprecated.js`.
2. **Generalise Mechanism A:** `team-member` (the other `scalar-content-lift` block) + the testimonial's other content slots (name/avatar/rating).
3. **Mechanism B:** the `has_inner_blocks=1` composites (hero headline → child `sgs/heading` InnerBlock, via `slot_has_equivalent_block`). Needs the InnerBlocks save-marker + `deprecated.js`.
4. **Fixture-set green:** the gate. Universal across the shape representatives, not page 8 alone.

**Mechanism scope (DB-verified 2026-06-26):** Mechanism A (`scalar-content-lift`) covers `sgs/testimonial` + `sgs/team-member`. Mechanism B (`has_inner_blocks=1`) covers ~20 composites (hero, cta-section, info-box, …). **S3-arrays** (FR-22-2.5, many children) is the one shape with absent emit machinery — IN/OUT decided by fixture-set evidence (STOP-18).

**OUT of this stage (explicit — council clarified content ≠ CSS):** the `scalar_content.py`/`scalar_media.py` resolver stubs are **CSS-declaration** resolvers (they transfer a quote's *colour/typography*, taking `(decl, ctx)`). They are a **separate later stage** (CSS-on-scalar-children), NOT this one. This stage extracts content (the quote *text*); a CSS declaration on a scalar child stays an honest `UNIMPLEMENTED_STUB` GAP (tracked by conservation, never a silent drop) until its own stage. This separation also dissolves the v1 "two-stream merge" risk — this stage is the **content stream** only.

## 0.2 What Bean signs off (R-22-13) — plain English, council-MF folded
A real draft testimonial clones to a `wp:sgs/testimonial` whose **quote text appears on the live rendered canary page** (was blank after D244). The sign-off package (delivered IN the conversation, not as a file to open — non-coder MF-3):
- **A before/after image pair:** LEFT = the DRAFT testimonial rendered in a browser (cropped, @1440 + @375); RIGHT = the LIVE canary clone, same crop, same tool. The actual quote text printed as a label under each so Bean reads both and confirms they match. If the text differs at all → FAIL (non-coder MF-4).
- **A plain-English content report:** one row per piece of content — *what it is* (first ~40 chars of the actual text, or "image: [alt]") | *found in draft?* | *visible on live page?* The last column is the only one Bean must read. A missing piece says in plain words: "This content was NOT transferred — the rest of the section still cloned. Flag to developer; the slot isn't in the database yet." (non-coder MF-1/MF-2).
- **A 404 confirmation** that the temporary test page was deleted (non-coder MF-3/SF-4).

## 1. The content mechanisms — DB-driven, names no block (v3, every function real)

The mechanism is selected **per block by DB facts** — `has_inner_blocks` (parent shape) AND the `scalar-content-lift` capability — never one alone (council cynic M5). **Three exhaustive cases** (round-2 spec-lawyer MF-3 — the v2 third-case gap closed):

```
caps = db_lookup.capabilities_for(rec.slug)
if rec.has_inner_blocks == 0 and "scalar-content-lift" in caps:   run_mechanism_a(rec, section_root)
elif rec.has_inner_blocks == 1:                                    run_mechanism_b(rec, section_root)
else:  # has_inner_blocks==0 AND NOT scalar-content-lift (e.g. sgs/trust-bar) — loud, never silent
    yield ContentGap(section_root, f"{rec.slug} has no content-extraction capability "
                     "(not scalar-content-lift, not InnerBlocks) — a DB-capability gap; flag to developer")
```
**Capability-based mutual exclusion (round-2 transpiler SF-2):** a `scalar-content-lift` block NEVER enters Mechanism B — asserted on the capability, so even a future `has_inner_blocks` mis-derivation cannot re-route the quote to a child block (the D212 regression guard).

### Mechanism A — scalar-content-lift via `derived_selector` (the SHIPPED D212/D222 mechanism, re-derived)
Live scope = `sgs/testimonial`, `sgs/team-member` (VERIFIED). All helpers below are real or NEW-to-build (labelled):
```
def run_mechanism_a(rec, section_root):
    attrs = content_attrs_with_selector(rec.slug)   # NEW (build in db_lookup.py); SQL below. attempted-set is FIXED here.
    attempted = 0
    for info in attrs:                              # info: AttrInfo(attr_name, role, derived_selector)
        attempted += 1
        node = section_root.select_one(info.derived_selector)        # bs4 (BeautifulSoup) CSS-select
        if node is None:
            yield ContentGap(info.attr_name, "no draft node matched derived_selector"); continue
        if _has_bem_element_descendant(node):       # wrapper-shell over-capture guard (round-2 transpiler MF-3)
            yield ContentGap(info.attr_name, "derived_selector matched a wrapper, not a content leaf"); continue
        payload = extract_payload(node, info.role)
        if not payload:                             # empty -> gap, NEVER ScalarLift("") (cheat G2)
            yield ContentGap(info.attr_name, "matched node has no extractable content"); continue
        yield ScalarLift(attr=info.attr_name, value=payload)
```
**`content_attrs_with_selector(block_slug)` — NEW, build in `db_lookup.py`** (round-2 transpiler MF-4 / spec-lawyer MF-1 — the v2 phantom, now pinned). Exact SQL:
```sql
SELECT attr_name, role, derived_selector FROM block_attributes
WHERE block_slug=? AND derived_selector IS NOT NULL AND role IN (<_content_bearing_roles()>)
```
returning a list of frozen `AttrInfo(attr_name:str, role:str, derived_selector:str)`. `_content_bearing_roles()` is the DB-authoritative set — **6 roles, VERIFIED live: `content, identity, image-object, link-href, rating, text-content`** (round-2 transpiler MF-1 — v2 wrongly cited 5, missing `rating`).

- **No tree-walk** — selector-driven, sidesteps the "minimal walk → whole walker" trap (council cynic M3).
- **Keyed on the attr's own `derived_selector`** — so `reviewerName` (canonical_slot NULL, derived_selector `.sgs-testimonial__author`) is covered; the slot multi-match ambiguity does not arise.
- **Silent-drop coverage (round-2 cheat MF-4):** `avatarMedia`/`orgLogo`/`workMedia` have `role=NULL` + `derived_selector=NULL` (VERIFIED) → Mechanism A never attempts them → an **invisible** drop. Fix = the **expected-content coverage check** (§6): enumerate every attr whose `attr_type` is object/string with a content-semantic name but role/derived_selector NULL, emit a visible `ContentGap` per block (so it's tracked, never silent), + a dated `/sgs-update` migration to give those attrs `role`+`derived_selector`. The avatar is NOT needed for the first LANDED proof (the quote) — it lands as a tracked gap, fixed in the same stage's generalisation.

### Mechanism B — child-block via the SLOT-KEYED predicate (`has_inner_blocks=1` composites)
~20 composites incl. hero/cta-section (VERIFIED). Walks content-leaf children (§2):
```
def run_mechanism_b(rec, section_root):
    for child in content_children(section_root):    # §2 — content-leaf BEM children (recurses shells, never crosses a nested composite)
        slot = recognise_helpers.bem_element_to_canonical_slot(child)   # built (Stage 2)
        if slot is None:
            yield ContentGap(child, "BEM element has no DB slot mapping (data gap)"); continue
        if not db_lookup.slot_has_equivalent_block(rec.slug, slot):     # SLOT-KEYED + role-gated (VERIFIED db_lookup.py:2334)
            yield ContentGap(child, f"slot '{slot}' is not a content-bearing child slot"); continue
        child_slug = db_lookup.standalone_block_for(slot)              # VERIFIED db_lookup.py:356
        if child_slug is None:                                         # None-guard (round-2 transpiler MF-2: 50 slots lack a standalone_block)
            yield ContentGap(child, f"slot '{slot}' content-bearing but no standalone_block (DB data limit)"); continue
        role = db_lookup.content_role_for_slot(rec.slug, slot)         # NEW (build): the role of the content-bearing attr for this slot (replaces v2 phantom role_for)
        yield ChildBlock(slug=child_slug, content=extract_payload(child, role))
```
- Mechanism B emits child InnerBlocks → the parent's `save.js` must emit `<InnerBlocks.Content/>`; a `deprecated.js` shim is required **only where the save-shape changes** (round-2 spec-lawyer M-4) — a block already emitting `<InnerBlocks.Content/>` needs none. Part of Mechanism B's per-block LANDED proof (cadence step 3), NOT the testimonial-quote first proof.
- **Chrome filter (round-2 transpiler SF-1):** `image-object`/`content`-role slots that map to wrapper-level scalars (hero `backgroundMedia`/`items`) are NOT body content — Mechanism B applies the same content-leaf vs wrapper-shell discrimination (§2) before emitting a child block, so a hero's background image never becomes a spurious child media block.

### `extract_payload(node, role)` — the content payload contract (6 roles; round-2 transpiler MF-1)
| role | extraction | escaping / shape |
|------|-----------|------------------|
| text-content / content / identity | inner content, preserving a fixed inline-tag allowlist (`<strong> <em> <b> <i> <br> <a>`); strip other tags to text. (`quote` renders via `wp_kses_post` — VERIFIED render.php:281 — so inline HTML is safe + not double-escaped.) `html.unescape` ONCE before store, then the WP serialiser stores verbatim (round-2 transpiler/spec-lawyer SF-4: no double-encode). | `wp_kses_post`-safe inline HTML |
| image-object | `<img src>` (+ `alt`/`width`/`height`) / `<video src>`+`poster` | URL only; never the class |
| link-href | `<a href>` + inner text (text-content rule) | |
| **rating** (round-2 transpiler MF-1) | the rating SIGNAL: count of star glyphs / `aria-label` number / numeric text → a number | numeric (e.g. `4.5`) |

**Rules:** (a) **empty = `node.get_text(strip=True)==''`** → `ContentGap`, never `ScalarLift("")` (cheat G2). (b) **NEVER the node's `className`** — extraction failure raises a `ContentGap`, never a BEM-class fallback (cheat MF-3 / R-22-15a). (c) **child-block payload (round-2 spec-lawyer SF-3):** for a `ChildBlock`, `content` is the child's extractable inner content for that role (NOT serialised WP markup — the emitter wraps it); the child block's own CSS is the CSS-stream's concern (later stage).

## 2. Conservation + the Stage-3c no-content-dropping `continue` (§12.7)

**§12.7 Stage-3c:** the legacy walk `continue`s past a `<video>`/caption it doesn't recognise, dropping content silently. v2 has **no such `continue`**: every content node is `ScalarLift`/`ChildBlock`/`ContentGap` — never silently skipped.

**"A child" is DEFINED (council cynic M4 / transpiler SF-2/SF-3 / spec-lawyer SF-2/MF-4):** a **content-leaf** BEM node (carries a `sgs-<block>__<element>` class AND has no BEM-element descendants of its own). A **wrapper-shell** BEM node (e.g. `.sgs-testimonial__inner`, `__body` — has BEM-element descendants) is **recursed into, not counted as a child** (Spec 22 line 666: `__inner`/`__content` are routing-irrelevant). A **non-BEM node with real text** but no BEM class is surfaced as a `ContentGap` (NOT dropped — "zero silent content drops"; council transpiler M-3).

**Mutual exclusion + per-mechanism conservation (round-2 spec-lawyer MF-4 — the v2 invariant was ill-defined for the attr-iterating Mechanism A):** each unit routes to **exactly one** outcome. The invariant is stated PER mechanism (they iterate different domains), wired as a hard `ContentConservationError` mirroring the slice's `_check_conservation` (`orchestrator.py:51`):
- **Mechanism A (iterates ATTRS):** `attrs_attempted == lifts + content_gaps` (no child_blocks). `attrs_attempted` = the count returned by `content_attrs_with_selector` (the fixed set) PLUS the expected-content-coverage gaps (§6). So an attr that is neither lifted nor gapped is a hard fail.
- **Mechanism B (iterates NODES):** `content_leaves_seen == child_blocks + content_gaps`. Wrapper-shell nodes are **recursed into, not counted** (they are not leaves). A non-BEM node with `get_text(strip=True)!=''` is counted as a leaf → must gap (never drop).
`ContentConservationError` names which invariant it enforces. If `_content_bearing_roles()` ever returns empty (migration soft-fail), Mechanism A's `attempted==0` with a non-empty section is a **hard error**, not a silent zero (round-2 transpiler MISSING) — caught additionally by the §7 planted-canary.

## 3. has_inner_blocks — parent-shape only; destination decided per-block (council cynic M5)
`rec.has_inner_blocks` (derived fresh from save.js in Stage 2 — `has_inner.py`, NOT a cached column) selects which **mechanism** runs (A for 0+scalar-content-lift, B for 1). It does NOT decide an individual child's destination — that's the per-block DB predicate (`capabilities_for` / `slot_has_equivalent_block`). F6 db-consistency remains the cross-check.

## 4. Module shape + gate scope (corrected — round-2 cheat MF-1/MF-2/MF-3)
```
converter/
├── services/                 # ALL new logic under services/ so it is auto-scanned by no_slug_literal _SCAN_DIRS (round-2 MF-2)
│   ├── extraction.py         # NEW — run_mechanism_a / run_mechanism_b / the 3-case selector + content_children. Under services/ = scanned.
│   ├── content_select.py     # NEW — bs4 select_one + content-leaf vs wrapper-shell + _has_bem_element_descendant (§2).
│   └── payload.py            # NEW — extract_payload (6-role table) + inline-tag allowlist + html.unescape-once.
├── context.py                # add ScalarLift / ChildBlock / ContentGap + AttrInfo (frozen) + ContentConservationError.
├── models.py                 # GapOrigin.CONTENT_GAP (distinct from UNRECOGNISED / UNROUTED).
├── gates/no_slug_literal.py  # EDIT: add 'slot','slot_name','canonical_slot' to _TARGET_IDENTS (round-2 cheat MF-1 — the NEW carve-out surface).
└── tests/ …                  # mechanism-A landed, mechanism-B child-emit + None-guard, per-mechanism conservation, payload 6-role, oracle-canary, no-mirror, slot-carve-out-caught.
```
**Three gate corrections (round-2 cheat — all VERIFIED holes):**
1. **`no_slug_literal` `_TARGET_IDENTS` += `slot`/`slot_name`/`canonical_slot`** — the mechanism now keys on SLOTS, so a slot-name carve-out (`if slot == 'quote'`) is the new cheat surface; today's gate (`{block_slug, variant_value, variant_attr}`) misses it. After the edit, a planted `if slot=='quote'` must exit-1 (proven, STOP-16).
2. **New logic under `services/`** (auto-scanned) — NOT a converter-root `extraction.py` (which `_SCAN_DIRS` would miss). Acceptance (§8) runs `no_slug_literal --check` against the ACTUAL final file list.
3. **ContentGap → a REAL F5-visible channel** — `coverage_check.py` does NOT read `attribute_gap_candidates` (VERIFIED round-2 cheat MF-3), so the v2 "writes to the ledger" claim was aspirational. v3 builds `ledger/content_gap_check.py` that reads a per-run `content-gaps.json` (written by extraction) + a committed `content-gap-baseline.json`, fails on NEW, and is **wired into `f5-commit-gate.py` `_GATES`** alongside the existing checks. A dropped child is then a commit-blocking event, not a private list.

The HTML parser is **BeautifulSoup (`bs4`)**, matching `recognition.recognise(node: bs4.Tag)`.

## 5. The CSS-on-scalar-children resolvers — NOT this stage (explicit deferral)
`scalar_content.py` / `scalar_media.py` (CSS-declaration resolvers) + `media_signal`'s DB source stay honest `UNIMPLEMENTED_STUB` / `NotImplementedError` — their own follow-on stage (the quote's *colour/typography*, mechanism mirrors `outer_box.resolve`). This stage lands the quote *text*; its *styling* is later. (Council ship-PM MF-4 / cynic S1 / spec-lawyer SF-1 — accepted: cut from this stage.)

## 6. DB data limit + expected-content coverage + baseline-before-arming (STOP-14)
Element-scope `slots.standalone_block` = **36/99 populated** (VERIFIED live DB 2026-06-26; the "40/103" in the handoff/D244 is stale). An unmatched selector / unmapped slot / NULL-standalone-block → a loud `ContentGap` (honest, never silent).

**Expected-content coverage check (round-2 cheat MF-4 — the silent-drop hole):** a content-semantic attr with `role=NULL`+`derived_selector=NULL` (e.g. `avatarMedia`/`orgLogo`/`workMedia`) is never *attempted* by Mechanism A → an INVISIBLE drop. v3 adds a coverage pass: for each block in scope, enumerate attrs whose `attr_type ∈ {object,string}` and name matches a content-semantic pattern (media/image/logo/text/title/quote/…) but have NULL role/selector → emit a visible `ContentGap("attr has no role/derived_selector — DB-data gap")` so it's tracked + counted in Mechanism A's conservation (§2). A dated `/sgs-update` migration then gives `avatarMedia`/`orgLogo`/`workMedia` proper `role`+`derived_selector` (also fixes the `reviewDate.derived_selector='.sgs-testimonial__card'` wrapper over-capture — round-2 transpiler MF-3 — to `.sgs-testimonial__date`). DB changes via migration + full reseed, never manual (`db-changes-reproducible-via-migration`).

**Arming sequence (fixes the v1 "baseline a walker that doesn't exist" contradiction — spec-lawyer MF-5):** (1) build the extraction; (2) run it in **report mode** over the page-8 + fixture-set drafts; (3) capture today's `ContentGap` set as `content-gap-baseline.json` (key by `(block, attr/slot, fixture)` identity, not line — STOP-17); (4) THEN arm `content_gap_check.py --check` to fail on NEW only (§4).

## 7. The LANDED gate — independent draft oracle (council cheat MF-5 / round-2 SF-2/SF-5)
- **L1 — THIS stage's gate:** deploy the genuine `extraction → emit_block_markup()` output to a fresh canary page (guard-safe REST CREATE, STOP-21 recipe) → anonymous Chrome-DevTools/Playwright → assert the live quote element's `innerText` **equals the draft quote text read INDEPENDENTLY** by a **draft-fixture reader** (round-2 spec-lawyer SF-1 — defined, not phantom): `BeautifulSoup(open(fixture+'.draft.html')).select_one(derived_selector).get_text(strip=True)` — reads the raw draft HTML directly, NEVER the engine's output (non-circular, STOP-3).
- **Planted-canary negative test (cheat MF-5, build it — round-2 cheat MISS-3):** a real fixture whose quote is `"ORACLE_CANARY_QZX"` — a string **definitionally absent from every block default INCLUDING the empty-string default** (round-2 spec-lawyer SF-5). The test asserts the live page shows exactly `"ORACLE_CANARY_QZX"`; if it shows the block default (empty or otherwise), LANDED **FAILS**. This is what blocks the "seed the attr from the block's stored default" cheat.
- Gate on `innerText.length > 0` + element-present FIRST (the §7b empty-section guard — a missing element is a FAIL, never a match).
- **Per-mechanism acceptance boundary (round-2 spec-lawyer SF-2):** Mechanism A acceptance (testimonial quote LANDED) closes INDEPENDENTLY of Mechanism B — a Mechanism-B (hero) regression does NOT block Bean's sign-off on the working testimonial content. The universal Spec-31 gate requires BOTH; the per-mechanism LANDED proofs close separately (the cadence).
- **WRITTEN-not-LANDED guard (memory `converter-attr-must-match-the-attr-render-reads`):** the attr the lift writes MUST be the attr `render.php` reads — verified by the live `innerText`, not by "the attr was emitted."
- **Ledger (F2):** every content child on the fixture set → zero UNACCOUNTED + zero silent drop; an intentionally-unmapped-slot fixture → exactly one loud `ContentGap` AND the rest of the section still clones (a separate test asserts the N-1 other pieces still land — council cheat / non-coder SF-2).
- **Metamorphic (real, DB-backed — council transpiler SF-1):** the synonym-rename test uses a REAL alias pair from the DB (`__text` ↔ `__quote`, both in the `quote` attr's `derived_selector` — VERIFIED) so it isn't vacuous; source-order permutation → identical lifts.

## 8. Acceptance (this stage — universal, per Spec 31 §12.0)
- Mechanism A LANDS the testimonial `quote` text on the live canary (was blank post-D244), draft-vs-clone, on the fixture set + a real page-8 testimonial; generalises to `team-member` + the testimonial's other content slots.
- Mechanism B LANDS a hero headline as a child `sgs/heading` InnerBlock (with its `deprecated.js`), draft-vs-clone — its OWN LANDED proof (A14, not banked from A).
- No content-dropping `continue`: every content node routes / gaps / recurses; `content_nodes_seen == lifts + child_blocks + content_gaps` is a hard invariant.
- Names no block (`no_slug_literal` extended to `extraction.py` + the new services + green); payload is never the child's `className`; empty payload → `ContentGap`, never `ScalarLift("")`.
- Content-coverage `--check` exits 1 on an unmapped-slot fixture, 0 clean; baseline captured first (fail on NEW only); `ContentGap`s land in the F5-visible ledger.
- Ledger+oracle green on the **multi-shape fixture set** (zero UNACCOUNTED + zero WRITTEN-not-LANDED) — the Spec-31 §12.0 universal gate, not page 8 alone.
- convert.py byte-identical (D-MODULAR). Bean signs the plain-English package (§0.2).

## 9. Bean-facing failure legibility + sign-off mechanics (council non-coder, folded)
- **ChildGap/ContentGap = a plain-English warning row** in the report (§0.2), NOT a code term Bean sees. The surrounding section still clones and that is VISIBLE in the screenshot (non-coder MF-2/SF-2 — include one graceful-failure screenshot in the package so Bean has a reference for "one piece missing, rest intact").
- **Summary line:** "X pieces of content landed; Y could not be transferred yet (database has no mapping — expected, logged, developer notified)." So 30 gaps reads as "working, data-limited", not "collapsed" (non-coder M-2).
- **Canary cleanup:** the test page is titled `TEMP-TEST-DO-NOT-PUBLISH — Stage 3 content check`; after the LANDED read it is deleted and the package includes a **404 confirmation**; if any step fails mid-way, the failure note tells Bean the page may still exist + how to spot/delete it (non-coder MF-3).
- **Sign-off ask, in-conversation:** "Do you see the quote text on the right? Does it match the left? yes/no." (non-coder M-3).

## 10. Build orchestration (per-stage ritual — do NOT batch; Rule 7)
round-2 `/adversarial-council` on THIS v2 (validate the corrected mechanism has no NEW fatal flaw) → FACT-CHECK every finding against Spec+DB+draft, never convert.py (STOP-22) → Bean sign-off on v2 → `/subagent-driven-development` (sonnet implementers per file: `extraction.py` / `content_select.py` / `payload.py` + spec & quality reviewers; cold prompts: "implement only your assigned files; RETURN findings; do NOT write shared docs or touch the shared git tree; reuse `db_lookup.capabilities_for`/`slot_has_equivalent_block`/`standalone_block_for`/`bem_element_to_canonical_slot`, build no parallel mechanism") → I re-run every gate `--check` + the suite myself from the canonical cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`) + prove each failure path (STOP-16) → `/qc-council` before commit → deploy (STOP-21) → L1 live LANDED verify (quote text on the page, independent oracle) → ledger+oracle gate on the fixture set → Bean sign-off → path-scoped commit (exclude `__pycache__`; verify HEAD after any rename, STOP-19) → D-ceiling check before any new D (→ D244).

## 11. Risks / guardrails carried
- **STOP-9** variant grids DB-defined — Mechanism B reads `variant_slots`, never `if slug==`.
- **STOP-10** content-gated block renders empty WITHOUT content BY DESIGN (D244 A14) — this stage fills it; L1 gates on `innerText.length>0`, so an empty render is a FAIL, never a false win.
- **STOP-11** schema≠usage — every reused function VERIFIED live: `capabilities_for` (db_lookup.py:765), `slot_has_equivalent_block` (2334), `standalone_block_for` (356), `_content_bearing_roles` (returns **6** roles incl `rating`), `bem_element_to_canonical_slot` (recognise_helpers.py). **NEW functions to build (labelled, not phantoms):** `content_attrs_with_selector(block_slug)` + `content_role_for_slot(block_slug, slot)` (db_lookup.py, exact SQL in §1). REJECTED: `equivalent_block_for(slug,slot)` (attr-keyed, FR-22-5.3 fatal catch — v1); `scalar_attr_for`/`content_bearing_attrs_with_selector`/`role_for` (phantoms — v1/v2, replaced).
- **A14** generalisation NEVER banked — Mechanism A (testimonial) does not bank Mechanism B (hero); each earns its own LANDED proof.
- **STOP-3/4/5** ledger/oracle input is the DRAFT; WRITTEN≠LANDED; stage-by-stage is the build ORDER, ledger+oracle the cross-stage TEST.
- **STOP-22** built FRESH from Spec 22/31 + DB + draft; `convert.py` consulted ONLY to NAME the D212 bug being avoided, never to learn the mechanism.
- **R-22-15a** preserving a child's BEM `className` is a fail-able last resort, never the success path.

## 12. Council fold (v1 → v2) — every must-fix → its fix, convergence-first

| # | Finding (raters) | Fact-check | Fix in v2 |
|---|------------------|-----------|-----------|
| **FATAL-1** | Fork keys on `equivalent_block_for(slug, slot)` — wrong function, attr-keyed, Spec 22 §FR-22-5.3 names it a "fatal catch"; `equivalent_block_for('sgs/testimonial','quote')`='sgs/quote' not None → reproduces D212 (cynic M1, transpiler MF-1/MF-2, ship-PM MF-2, spec-lawyer MF-1/MF-6, cheat MF-2) | **VERIFIED TRUE** (live DB + Spec 22:316) | §1: Mechanism A = `scalar-content-lift` + `derived_selector` lift; Mechanism B = `slot_has_equivalent_block` (slot-keyed). `equivalent_block_for(slug,slot)` REMOVED. |
| **FATAL-2** | `scalar_attr_for` is a phantom function (all raters) | **VERIFIED** (grep empty) | §1: removed; Mechanism A iterates attrs by `derived_selector`; Mechanism B uses `standalone_block_for`. |
| **SCOPE** | "Three branches under one gate" = horizontal scaffold / stall trap; cut to one (ship-PM MF-1/3/4, cynic S1, spec-lawyer MS-5) | partially accepted | §0.1: ONE universal Spec-31 stage (Bean-ratified) BUT vertical-slice as the build CADENCE (testimonial-quote first, then generalise); §5: CSS resolvers CUT to their own stage. |
| **C1** | `extract_payload` underspecified — inline HTML, entities, first-match, child-block payload (transpiler MF-4, spec-lawyer MS-2, cynic MISSING) | accepted | §1: payload contract table + inline-tag allowlist + first-match + empty→ContentGap. |
| **C2** | "minimal walk" = whole walker; parser unnamed (cynic M3, ship-PM M-1/M-2, spec-lawyer MF-4) | accepted | §1: Mechanism A is selector-driven (no walk); §4: parser = BeautifulSoup; §2: "a child" defined (content-leaf vs wrapper-shell). |
| **C3** | Two streams unreconciled (cynic M4, transpiler SF-3) | accepted | §0.1/§5: this stage is CONTENT stream ONLY; CSS stream is a separate stage — the merge risk dissolves. |
| **C4** | LANDED oracle circular (cheat MF-5) | accepted | §7: independent draft-fixture reader + planted `ORACLE_CANARY_QZX` negative test. |
| **C5** | `no_slug_literal` won't scan a new converter-root file (cheat MF-6) | **VERIFIED** (gate `_SCAN_DIRS`) | §4: new files under `services/` + `extraction.py` added to `_SCAN_FILES`. |
| **C6** | ContentGap invisible to F5 ledger (cheat G4) | accepted | §4: ContentGap writes to the F5-visible ledger store. |
| **C7** | Non-coder can't verify; ChildGap/sign-off/canary-cleanup illegible (non-coder MF-1/2/3/4) | accepted | §0.2 + §9: plain-English report, graceful-failure screenshot, 404 confirmation, in-conversation yes/no sign-off. |
| **C8** | Baseline-before-arming not runnable pre-walk (spec-lawyer MF-5) | **VERIFIED** (no walk yet) | §6: build → report-mode → baseline → arm sequence. |
| **C9** | has_inner_blocks is parent-shape, not child destination (cynic M5) | **VERIFIED** | §3: parent flag selects the mechanism; per-child destination is the DB predicate. |
| **C10** | reviewerName (canonical_slot NULL) silently unextractable (spec-lawyer SF-4) | **VERIFIED** (DB) | §1: Mechanism A keys on `derived_selector` (reviewerName has one), not canonical_slot — covered. |
| **C11** | deprecated.js for the hero child-block branch (transpiler M-4, cynic MISSING) | accepted | §1/§8: Mechanism B's per-block LANDED proof includes the save-marker + deprecated.js. |
| **C12** | arrays (FR-22-2.5) machinery absent (cynic S3, ship-PM S-1) | **VERIFIED** (no call-site) | §0.1: IN/OUT by fixture-set evidence (STOP-18); not cited as "built". |

### Round-2 fold (v2 → v3) — the corrected mechanism validated SOUND + 12 concrete must-fixes folded
6-persona round-1 NO-GO fixed the fatal fork (v1→v2); 3-persona round-2 (transpiler B−, spec-lawyer C, cheat C−) confirmed v2's mechanism SOUND (v1's fatal error genuinely gone, first-LANDED proof reachable, escaping correct) and surfaced v2's OWN concrete defects — all Opus-fact-checked TRUE:

| # | Round-2 finding | Fact-check | Fix in v3 |
|---|-----------------|-----------|-----------|
| **R-1** | `_content_bearing_roles()` is **6** roles (incl `rating`), v2 cited 5 → `rating` attrs silently dropped | **VERIFIED** (live) | §1: 6-role set + `rating` row in extract_payload. |
| **R-2** | `content_bearing_attrs_with_selector` + `role_for` are PHANTOMS (v2 repeated the FATAL-2 pattern) | **VERIFIED** (grep) | §1: defined as NEW with exact SQL → `content_attrs_with_selector` + `content_role_for_slot`. |
| **R-3** | Mechanism B `ChildBlock(slug=None)` — **50** content slots lack a `standalone_block` → invalid `wp:None` | **VERIFIED** (live, 50 slots) | §1: None-guard after `standalone_block_for` → ContentGap. |
| **R-4** | `avatarMedia`/`orgLogo`/`workMedia` role+selector NULL → **silent** drop, no gap | **VERIFIED** (DB) | §6: expected-content coverage check (visible gap) + migration. |
| **R-5** | `reviewDate.derived_selector='.sgs-testimonial__card'` (a wrapper) → Mechanism A over-captures whole card | **VERIFIED** (DB+render) | §1: wrapper-shell guard in Mechanism A; §6: migration to `.sgs-testimonial__date`. |
| **R-6** | Third case unhandled: `has_inner_blocks=0` WITHOUT scalar-content-lift (trust-bar) → silent | **VERIFIED** (DB) | §1: explicit 3-case dispatch + loud ContentGap. |
| **R-7** | Conservation invariant ill-defined for Mechanism A (iterates attrs, not nodes) | **VERIFIED** | §2: per-mechanism invariants (A=attrs, B=nodes). |
| **R-8** | `no_slug_literal` `_TARGET_IDENTS` lacks `slot`/`canonical_slot` → slot-name carve-out uncaught | **VERIFIED** (gate code) | §4: add slot idents; prove exit-1 on a planted `if slot==`. |
| **R-9** | New converter-root file not scanned by the gate | **VERIFIED** (`_SCAN_DIRS`) | §4: all new logic under `services/` (auto-scanned). |
| **R-10** | ContentGap→F5 ledger ASPIRATIONAL — `coverage_check` doesn't read the gap table | **VERIFIED** (grep) | §4: build `content_gap_check.py` + wire into `f5-commit-gate.py`. |
| **R-11** | Planted-canary `ORACLE_CANARY_QZX` + draft-fixture reader don't exist | **VERIFIED** (grep) | §7: build both; canary string ≠ all defaults incl empty. |
| **R-12** | Capability mis-derivation could still re-route quote to a child block (D212 regression) | accepted | §1: capability-based mutual exclusion (scalar-content-lift NEVER enters Mechanism B). |

**Round-2 verdict:** the corrected mechanism is SOUND (clears the gate on the headline); the 12 fixes are bounded specifications, not redesigns — all folded. No round-3: the SDD build + `/qc-council` + the armed gates + the live LANDED proof are the structural backstops.
