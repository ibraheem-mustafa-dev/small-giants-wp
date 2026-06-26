---
doc_type: design
project: small-giants-wp
thread: cloning-pipeline
spec_ref: specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.0/§12.6 step 3/§12.7 (Stage 3-4, the content / block-equivalent extraction) · cloning-pipeline-stages.md Stage 3 (slot list) + Stage 4 (universal block-equivalent extraction) · specs/22 FR-22-2 / FR-22-2.1 / FR-22-2.2 / FR-22-5.3 / FR-22-2.5
created: 2026-06-26
updated: 2026-06-26
version: v2 — COUNCIL-CORRECTED (6-persona adversarial-council 2026-06-26 NO-GO-as-written + Opus DB/spec fact-check) + Bean scope ratification
status: DRAFT v2 — pending a round-2 council re-gate of the CORRECTED mechanism + Bean sign-off (Rule 7). No code until both.
authors: Opus rebuild-orchestrator
supersedes: v1 (same file; v1's fork mechanism was FATALLY wrong — see §12)
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

## 1. The two mechanisms — DB-driven, names no block (corrected, verified signatures)

The destination of a composite's content is decided **per block by DB facts**, never the parent's `has_inner_blocks` alone (council cynic M5):

### Mechanism A — scalar-content-lift via `derived_selector` (the SHIPPED D212/D222 mechanism, re-derived)
For a block carrying the `scalar-content-lift` capability (`db_lookup.capabilities_for(slug)` — VERIFIED: `db_lookup.py:765`; live scope = `sgs/testimonial`, `sgs/team-member`):
```
for attr_name, info in content_bearing_attrs_with_selector(slug):     # role∈content-bearing AND derived_selector NOT NULL
    node = section_root.select_one(info.derived_selector)            # bs4 CSS-select within the recognised section (BeautifulSoup)
    if node is None:
        yield ContentGap(attr_name, info.derived_selector, "no draft node matched this selector")   # tracked, loud, never silent
        continue
    yield ScalarLift(attr=attr_name, value=extract_payload(node, info.role))   # lift content into the parent's typed scalar attr
```
- **No tree-walk** — selector-driven (`bs4 .select_one`), which sidesteps the v1 "minimal walk becomes the whole walker" trap (council cynic M3 / ship-PM M-1).
- **Iterates ATTRS (not slots), keyed on `derived_selector`** — so `reviewerName` (canonical_slot=NULL, role=text-content, derived_selector=`.sgs-testimonial__author`, VERIFIED) is covered; the canonical_slot multi-match ambiguity (council spec-lawyer MF-2) does not arise because we key on the attr's own `derived_selector`, not a slot→attr lookup.
- **The content-bearing role set is DB-authoritative** (`_content_bearing_roles()`: text-content, image-object, content, link-href, identity — VERIFIED in `db_lookup.py`), never a hardcoded set (R-22-1).

### Mechanism B — child-block via the SLOT-KEYED predicate (for `has_inner_blocks=1` composites)
For a composite that composes child InnerBlocks (`rec.has_inner_blocks == 1`; ~20 blocks incl. hero/cta-section — VERIFIED):
```
for child in content_children(section_root):                         # §2 — content-leaf BEM children (not wrapper shells)
    slot = recognise_helpers.bem_element_to_canonical_slot(child)     # built (Stage 2): DB synonym map → canonical slot
    if slot is None:
        yield ContentGap(child, "no canonical slot for this BEM element"); continue
    if db_lookup.slot_has_equivalent_block(rec.slug, slot):           # SLOT-KEYED + role-gated (VERIFIED db_lookup.py:2334)
        yield ChildBlock(slug=db_lookup.standalone_block_for(slot), content=extract_payload(child, role_for(slot)))
    else:
        yield ContentGap(child, f"{rec.slug} slot '{slot}' is not a content-bearing child slot")
```
- **`slot_has_equivalent_block(block_slug, slot_name)`** is the spec-mandated SLOT-KEYED, role-gated predicate (Spec 22 §FR-22-5.3 step 2; its own docstring documents the exact v1 bug). VERIFIED `db_lookup.py:2334`.
- Mechanism B emits child InnerBlocks → the parent block's `save.js` must emit `<InnerBlocks.Content/>` and a `deprecated.js` shim is required where the save-shape changes (council transpiler M-4 / cynic MISSING). This is part of Mechanism B's per-block LANDED proof (cadence step 3), NOT the testimonial-quote first proof.

### `extract_payload(node, role)` — the content payload contract (council transpiler MF-4 / spec-lawyer MS-2)
| role | extraction | escaping / shape |
|------|-----------|------------------|
| text-content | the node's inner content. **DECISION: preserve a fixed inline-tag allowlist** (`<strong> <em> <b> <i> <br> <a>`); strip all other tags to text. (A `string`/RichText attr stores inline HTML; flattening to plain text would silently drop `<strong>` = a faithfulness break.) | output is `wp_kses`-safe inline HTML; entities normalised once (no double-encode — the WP serialiser re-escapes) |
| image-object / media | `<img src>` (+ `alt`, `width`, `height` where present) / `<video src>` + `poster` | URL only; never the class |
| link-href | `<a href>` (+ inner text via the text-content rule) | |
| identity / content | node inner text (allowlist as text-content) | |

**Rules:** (a) **first matching node wins** (`select_one`); a 2nd match is logged as a `ContentGap`-warn, never silently concatenated (spec-lawyer MF-2). (b) **NEVER the node's `className`** — if extraction yields empty, raise a `ContentGap`, never fall back to the BEM class (council cheat MF-3 / R-22-15a). (c) **empty payload is a `ContentGap`, never a `ScalarLift("")`** (council cheat G2 — an empty string reproduces the blank-testimonial symptom).

## 2. Conservation + the Stage-3c no-content-dropping `continue` (§12.7)

**§12.7 Stage-3c:** the legacy walk `continue`s past a `<video>`/caption it doesn't recognise, dropping content silently. v2 has **no such `continue`**: every content node is `ScalarLift`/`ChildBlock`/`ContentGap` — never silently skipped.

**"A child" is DEFINED (council cynic M4 / transpiler SF-2/SF-3 / spec-lawyer SF-2/MF-4):** a **content-leaf** BEM node (carries a `sgs-<block>__<element>` class AND has no BEM-element descendants of its own). A **wrapper-shell** BEM node (e.g. `.sgs-testimonial__inner`, `__body` — has BEM-element descendants) is **recursed into, not counted as a child** (Spec 22 line 666: `__inner`/`__content` are routing-irrelevant). A **non-BEM node with real text** but no BEM class is surfaced as a `ContentGap` (NOT dropped — "zero silent content drops"; council transpiler M-3).

**Mutual exclusion (council transpiler SF-2):** each content node routes to **exactly one** of `{ScalarLift, ChildBlock, ContentGap}`. The conservation invariant — wired as a hard fail in the orchestrator, mirroring the slice's `_check_conservation` (`orchestrator.py:51`) — is `content_nodes_seen == lifts + child_blocks + content_gaps`. Any leak raises a named `ContentConservationError`.

## 3. has_inner_blocks — parent-shape only; destination decided per-block (council cynic M5)
`rec.has_inner_blocks` (derived fresh from save.js in Stage 2 — `has_inner.py`, NOT a cached column) selects which **mechanism** runs (A for 0+scalar-content-lift, B for 1). It does NOT decide an individual child's destination — that's the per-block DB predicate (`capabilities_for` / `slot_has_equivalent_block`). F6 db-consistency remains the cross-check.

## 4. Module shape + gate scope (council cheat MF-6 / G4)
```
converter/
├── extraction.py             # NEW — the content-extraction entry: run_mechanism_a / run_mechanism_b + content_children + extract_payload.
│                             #   MUST be added to no_slug_literal _SCAN_FILES (cheat MF-6) — it names no block; the gate proves it.
├── services/
│   ├── content_select.py     # NEW — bs4 selector match (select_one), content-leaf vs wrapper-shell discrimination (§2). Scanned (under services/).
│   └── payload.py            # NEW — extract_payload + the inline-tag allowlist (§1). Scanned.
├── context.py                # add ScalarLift / ChildBlock / ContentGap dataclasses + ContentConservationError (typed, frozen).
├── models.py                 # GapOrigin.CONTENT_GAP (distinct from UNRECOGNISED/UNROUTED).
└── tests/ …                  # mechanism-A landed, mechanism-B child-emit, conservation, payload-allowlist, oracle-independence, no-mirror.
```
**ContentGap → the existing ledger (cheat G4):** a `ContentGap` writes to the same coverage/ledger store the F2/F5 checker reads (`attribute_gap_candidates` or the ledger's content-gap channel), so a dropped child is visible to the armed F5 gate at commit — not a private list. The HTML parser is **BeautifulSoup (`bs4`)**, matching `recognition.recognise(node: bs4.Tag)` (council ship-PM M-2 / cynic "name the parser").

## 5. The CSS-on-scalar-children resolvers — NOT this stage (explicit deferral)
`scalar_content.py` / `scalar_media.py` (CSS-declaration resolvers) + `media_signal`'s DB source stay honest `UNIMPLEMENTED_STUB` / `NotImplementedError` — their own follow-on stage (the quote's *colour/typography*, mechanism mirrors `outer_box.resolve`). This stage lands the quote *text*; its *styling* is later. (Council ship-PM MF-4 / cynic S1 / spec-lawyer SF-1 — accepted: cut from this stage.)

## 6. DB data limit + baseline-before-arming (STOP-14; council spec-lawyer MF-5)
Element-scope `slots.standalone_block` = **36/99 populated** (VERIFIED live DB 2026-06-26; the handoff/D244 "40/103" is stale — the live DB is authoritative). An unmatched selector / unmapped slot → a loud `ContentGap` (honest, never silent). **Arming sequence (fixes the v1 "baseline a set from a walker that doesn't exist" contradiction — spec-lawyer MF-5):** (1) build the extraction; (2) run it in **report mode** over the page-8 + fixture-set drafts; (3) capture today's `ContentGap` set as `content-gap-baseline.json` (key by `(block, slot/selector, fixture)` identity, not line — STOP-17); (4) THEN arm `--check` to fail on NEW only. Seed the 63 unmapped slots later via `/sgs-update` (dated migration + reseed — `db-changes-reproducible-via-migration`), never manual.

## 7. The LANDED gate — independent draft oracle (council cheat MF-5 / non-coder)
- **L1 — THIS stage's gate:** deploy the genuine `extraction → emit_block_markup()` output to a fresh canary page (guard-safe REST CREATE, STOP-21 recipe) → anonymous Chrome-DevTools/Playwright → assert the live quote element's `innerText` **equals the draft quote text read INDEPENDENTLY** by a draft-fixture reader (NOT the engine's own output — non-circular, STOP-3). **Planted-canary negative test (cheat MF-5):** a fixture whose quote is `"ORACLE_CANARY_QZX"` (a string absent from every block default) — if the live page shows the block's default instead, LANDED **FAILS**. Gate on `innerText.length > 0` + element-present FIRST (the §7b empty-section guard — a missing element is a FAIL, never a match).
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
- **STOP-11** schema≠usage — every reused function VERIFIED for real signature this session: `capabilities_for` (db_lookup.py:765), `slot_has_equivalent_block` (2334), `attr_for_slot` (621), `standalone_block_for` (356), `bem_element_to_canonical_slot` (recognise_helpers.py). `equivalent_block_for(slug,slot)` REJECTED (attr-keyed, FR-22-5.3 fatal catch). `scalar_attr_for` was a v1 PHANTOM — removed.
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
