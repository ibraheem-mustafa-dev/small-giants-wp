# Investigation: why 14 "non-BEM" sections vanish from the Eye Care Birmingham clone

Date: 2026-09-19. Read-only investigation (no repo edits, no pipeline run, no deploy).
Run dir: `pipeline-state/eye-care-ward-end-eye-care-birmingham-2026-09-19-140958/`.
Live page: https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/
Scratch: `pipeline-state/_inv-non-bem/` (`a1.py`, `a2.py`, `live.html`, `live_body.txt`).

Every claim is marked PROVEN (I read the exact output or code) or ASSUMED (inference, not yet run).

---

## 1. Plain English

**Problem.** The pipeline dropped 14 whole sections of the draft. Four of them are the homepage's own sections
("Why buy from me", "What people say", the prescription-sunglasses explainer, the "You're buying from a person"
block). The label on them says "not SGS-BEM compliant", but that label is wrong. The draft has no classes at all.
The whole draft contains exactly one `class=` attribute in total. The real reason they were dropped is that a
permission check ("may this section be converted?") only says yes when a guessing tool happens to attach a hint to
the section. Sections that are a single wrapper `<div>` get no hint, so they are refused.

**Effect.**
1. Seven of the eight homepage sections are missing on the live page. Only the hero exists.
   - Four are blocked by the 14-boundary halt (b5, b7, b8, b9).
   - Three are blocked by a different mechanism, the Spec 44 review gate (b3, b4, b6).
   - "Not sure what suits you?" and "Start with a shape" are in b6, which is one of these three and is NOT one of the 14.
2. Some content from other pages of the draft's single-page app already leaks onto this page. Help (b19) and the
   checkout steps (b22 to b26) are on the live page under the homepage hero. So fixing only the "refused" problem
   would make the page worse: it would pile the Lenses, About, Contact, Product and Order-confirmed views on top of
   the homepage too.
3. The report says the halt happened, but not what was lost: 6,541 characters of literal text across the 14.
   The message text is also wrong (see section 4).

**Solution (recommended, two parts plus a reporting fix).**
- A. Let a boundary with NO classes at all through the permission check, on eligibility alone. The converter already
  handles it: since D1106 a classless top-level section takes the `sgs/container` default (FR-31-4), and the
  header/footer tags are already skipped as chrome inside the converter. Evidence: all 45 boundaries admitted this
  run converted or chrome-skipped with zero failures.
- B. Split the draft's routed views. Emit only the default (home) view into the page being cloned. Write each other
  view out separately and report it as "other-route view, not emitted to this page". This is a design-gated change
  (project Rule 7) and needs Bean's approval before building.
- C. Fix the reporting so a dropped or skipped section names its literal text and the correct reason.

---

## 2. Root cause (PROVEN)

### 2.1 Stage 0.1 is NOT the gate (PROVEN)

```
cat stage-0.1-bem-lint.json
  total_classes_checked: 1, violations: [class 'rev-rail' ...], passed: true, exit_code: 0
grep -c 'class=' dc-import-resolved.html   -> 1 line;  grep -o 'class="[^"]*"' ... -> only class="rev-rail"
```

The lint passed. Its single "violation" is `rev-rail`, a descendant inside b7. The draft is entirely classless
(Claude Design output: inline `style=` plus `<sc-if>` / `<sc-for>`). The halted boundaries all carry
`class_signature: []` in `voter.json` (run below) and in the `stage_4_non_bem_halt` trace rows.

### 2.2 The halt lives in Stage 4 of the orchestrator (PROVEN)

- File: `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`, function `stage_4_5_6_7_8_extract`.
- Per boundary it computes `_cv2_eligible`. A boundary is eligible if, in order:
  1. `_is_sgs_bem_canonical(class_signature)` is true;
  2. Tier 0: `primary_sgs_bem` and `primary_is_slot_map_hit` are set;
  3. sc_var Tier: `sc_var_hint` present with confidence >= `--sc-var-min-confidence`;
  4. dom_shape Tier: `dom_shape_hint` present with confidence >= `--dom-shape-min-confidence`.
- A boundary that fails all four falls to the end of the loop and hits the block that emits trace stage
  `stage_4_non_bem_halt`, status `unmatched-non-bem-compliant`, empty `block_markup`, warning text
  "section class '...' is not SGS-BEM compliant".
- This run passed `--dom-shape-min-confidence 0.0` (trace `stage_4_dom_shape_gate` rows carry
  `"dom_shape_min_confidence": 0.0`) and the sc_var flag (43 `stage_4_sc_var_gate` rows). With no flags the
  default is `None`, so every classless boundary would have halted (the tests
  `test_flag_omitted_still_hard_halts_even_with_a_strong_hint` lock that in).
- The 14 halted boundaries have `sc_var_hint = None` and `dom_shape_hint = None` (command in 3.1). Nothing admitted them.

### 2.3 Why these 14 get no hint (PROVEN)

`recogniser/per-section-convention-voter.py::dom_shape_hint_for_gap_candidate` looks at only two things:
(1) the boundary's own direct children as a group of at least 2 near-identical siblings, or (2) a heading as the
FIRST direct child. b5, b7, b8, b9, b12, b13, b14, b17, b18, b20, b21 and b27 each have a single wrapper
`<div>` (or `<p>`,`<h1>` in b17/b27) as first child, so neither signal fires. b1 and b28 are `header`/`footer`,
and `classify_landmark_tag` deliberately never fires at top level. The admitted classless boundaries were admitted
because they happened to have 3-4 sibling children (b2, b19, b26...) or an `<h2>` first child (b22 to b25).

### 2.4 The hint is a bare admission ticket; its value is thrown away (PROVEN)

```
b2  hint=card-grid  -> emitted markup blocks: sgs/container, sgs/container, sgs/media, sgs/container, sgs/text, sgs/heading
b22 hint=hero       -> emitted markup blocks: sgs/container, sgs/heading, sgs/text        (NOT sgs/hero)
b19 hint=card-grid  -> sgs/container, sgs/text, sgs/heading, ...                          (NOT sgs/card-grid)
```

`stage-4.json -> output.per_section_results[*].block_markup`. The converter ignores the hint's block and applies the
FR-31-4 container default. The docstring on the hint function calls it "advisory ... never a block assignment", yet
the orchestrator uses its mere presence as the permission. So which classless section survives is decided by an
accident of DOM shape, not by anything meaningful.

The orchestrator's own comment (sc_var Tier, before `_section_html = ...`) records the same finding from a live run:
"The eligibility gate alone is the right amount of intervention -- it lets the converter's own recognition run".

### 2.5 The converter can already handle these (PROVEN for the mechanism, ASSUMED for the 12 specific sections)

- `converter/recognition.py::recognise_section(node, is_boundary_root=True)`: a classless boundary root falls
  through to `container_default_slug()` (D1106, `decisions.md` D1106). It is only called if the orchestrator lets
  the boundary reach `convert_section`.
- `converter/entry.py::convert_section` applies the header/footer/nav chrome skip (`SKIP_TOP_LEVEL_TAGS`) FIRST.
  So b1 and b28 would come out correctly labelled `chrome-skipped` instead of being reported as "non-BEM".
  Evidence: nav b11, b29, b30 were admitted and reported `chrome-skipped`; header and footer were not admitted and
  were reported "non-BEM".
- Track record this run: trace shows 45 `stage_4_converter_v2` events and 0 `stage_4_converter_failed` /
  `softfail` events; statuses are 42 complete + 3 chrome-skipped. Every admitted classless boundary converted.
- ASSUMED: the 12 large, single-wrapper sections will also convert cleanly. D1106 records residual failures
  (`ContentConservationError`, `COLLISION`), and I could not run the converter (its import runs schema migrations
  on the shared DB). It needs one real pipeline run to confirm.

### 2.6 Is the halt correct policy? (PROVEN: no, for a classless section)

- Spec 31 FR-31-4: "a slug-None node at any depth defaults to `sgs/container` ... A no-name-match section is the
  COMMON case, never a failure."
- R-31-2 / Spec 00 section 3.1: BEM is the only signal for WHICH block a node is. It is not a permission to be
  converted at all. Emitting the container default for a classless node is not tag-based recognition, so it does not
  breach R-31-2.
- The C1 comment in the orchestrator ("everything becomes an undifferentiated container" hazard) is about Tier 0
  CLASS INJECTION from a lingua_franca guess. It does not apply to an empty class list, where nothing is injected
  (the sc_var / dom_shape tiers already admit with no injection).
- The tests that lock hard-halts for non-empty non-SGS classes (Tailwind `flex-1`, `external-class`) are a separate
  decision. This report does not challenge them. The recommendation in section 6 is scoped to `class_signature == []`.

### 2.7 Is the halt reported per Rule 4? (PROVEN: only partly)

Rule 4: every draft class's content and CSS transfers, or is reported as skipped-with-reason per class.

| Item | Reported? | Evidence |
|---|---|---|
| The boundary halted | Yes, per boundary | `leftover-buckets.json -> leftover_buckets.unrecognised_section` has one row per halted boundary (b5 and b28 checked); `stage-9.json -> unmatched_sections` |
| Per class | Not applicable | zero classes exist |
| What text was lost | No | `unrecognised_section` rows hold only `section_id, boundary_id, block_name, confidence, gap_level, severity`. `content-gaps.json` has 23 rows, all for converted fixtures (b2, b31, b23, ...): none for the 14. |
| Reason is correct | No | warning says "section class '' is not SGS-BEM compliant ... Re-author per Spec 13 section 8.1". The class is empty, so nothing can be re-authored, and there is no Spec 13 in `.claude/specs/` or `specs/archive/` (`ls archive | grep ^13` is empty). |
| Noise | Yes | each halted boundary adds 92 generic `extraction_failed` slot rows ("no value extracted"): 14 x 92 = 1,288 of 3,386 rows |
| Chrome labelled honestly | No | `leftover_totals.chrome_skipped = 0`, yet 3 boundaries are `chrome-skipped` and 2 more (b1, b28) are chrome mislabelled "non-BEM" |

---

## 3. Evidence: the 14 boundaries

### 3.1 How this was extracted

```
cd pipeline-state/eye-care-ward-end-eye-care-birmingham-2026-09-19-140958
export PYTHONIOENCODING=utf-8
python ../_inv-non-bem/a1.py            # per-boundary tag, sc-if ancestors, data-screen-label, literal text
python - <<E   # voter fields for the 14
import json; v=json.load(open('voter.json'))['boundaries']
# halted ids: class_signature == [], sc_var_hint None, dom_shape_hint None, primary_is_slot_map_hit False (all 14)
E
```

The draft is a single-page app. The frame's direct children, in order (PROVEN, `tagged-mockup.html`):
`div`, `header`, then nine `<sc-if value="{{ isX }}" hint-placeholder-val=...>` each wrapping one
`<main data-screen-label="...">` (Home, Shop, Product, Lenses, About, Help, Contact, Checkout, Order confirmed),
then `footer`. The draft's script sets `page:'home'` and `isHome: isPage('home')`. Only the `isHome` wrapper has
`hint-placeholder-val="{{ true }}"`. So the Home view is the default one, and the draft itself says so.

### 3.2 Table

Literal text = text left after removing `{{ ... }}` placeholders.

| Boundary | Tag | View (outer `sc-if`) | What it is | Literal text | Belongs to homepage? |
|---|---|---|---|---|---|
| b1 | header | none (frame child) | Sticky site header with mega-menu (Menu, Sunglasses, Brands, Lenses, Bag, prescription-sunglasses menu panel) | 366 chars, 60 words | No: chrome |
| b5 | section | isHome | "Why buy from me" + "Four reasons, and not one of them is a discount code." + intro + 4-reason list (sc-for) | 371 chars | YES |
| b7 | section | isHome | "From the clinic" / "What people say" / Google Reviews 4.7 rail (15 reviews, scroll rail) | 186 chars | YES |
| b8 | section | isHome | "Prescription sunglasses: Any pair here, made to your prescription." + 3 numbered steps | 399 chars | YES |
| b9 | section | isHome | "Photo of the clinic" + "You're buying from a person": "I'm Fatima Nawaz, and I run the clinic in Birmingham..." | 587 chars | YES |
| b12 | section | isProduct | Product page detail: UV400 / boxed / prescription note, "This pair, measured", "Which size am I?", "Good to know" | 635 chars | No: product view |
| b13 | section | isProduct > hasPdpReviews | Product page "Reviews" block, rating summary | 122 chars | No: product view |
| b14 | section | isProduct > noPdpReviews | Product page "No reviews on this frame yet ... clinic rated 4.7 from 15 Google reviews" | 179 chars | No: product view (mutually exclusive with b13) |
| b17 | main | isLenses (label "Lenses") | Whole Lenses page: "Prescription lenses / Three questions, then leave the rest to me", "In every lens, no extra charge", "How it goes" | 1,190 chars | No: Lenses view |
| b18 | main | isAbout (label "About") | Whole About page: "About Eye Care", Fatima Nawaz BSc (Hons) Optometry ... | 1,257 chars | No: About view |
| b20 | main | isContact (label "Contact") | Whole Contact page: WhatsApp, phone, email, clinic address, "Or send me a message" | 764 chars | No: Contact view |
| b21 | section | isCheckout | Checkout express-pay row (Apple Pay, G Pay, PayPal, Klarna, "or pay by card") | 45 chars | No: Checkout view |
| b27 | main | isDone (label "Order confirmed") | "Thank you, order EC-10482." confirmation | 46 chars | No: Order-confirmed view |
| b28 | footer | none (frame child) | Site footer: shop / help / contact links, address, opening hours, copyright | 394 chars | No: chrome |

Totals: 4 homepage (1,543 chars), 8 other-route (4,244 chars), 2 chrome (760 chars). Sum 6,541 chars.
Each has 0 to 1 `class` attributes anywhere inside (b7 holds the one `rev-rail`), and 4 to 68 inline `style=`
attributes: it is inline-styled Claude Design markup.

### 3.3 Which missing live-page text maps to which boundary (PROVEN)

Method: fetch the live page, take `body` text, normalise quotes and dashes, and test each draft string
(`a2.py`, `live_body.txt`). "Absent" means not found anywhere in the live body.

| Missing on live page | Draft boundary | Boundary status | Why it is missing | View |
|---|---|---|---|---|
| "Why buy from me" | b5 | unmatched-non-bem-compliant | halted (no hint) | Home |
| "Four reasons, and not one of them is a discount code." | b5 | halted | halted (no hint) | Home |
| "Not sure what suits you?" | b6 | unmatched-classless-review | Spec 44 review gate, NOT one of the 14 | Home |
| "Start with a shape" | b6 | unmatched-classless-review | Spec 44 review gate, NOT one of the 14 | Home |
| "Moving fastest this month" / "Best sellers" | b4 | unmatched-classless-review | Spec 44 review gate | Home |
| (brand marquee) | b3 | unmatched-classless-review | Spec 44 review gate | Home |
| "From the clinic" / "What people say" | b7 | halted | no hint | Home |
| "Prescription sunglasses / Any pair here, made to your prescription." | b8 | halted | no hint | Home |
| "You're buying from a person" / "I'm Fatima Nawaz" | b9 | halted | no hint | Home |
| "Three questions, then leave the rest to me" | b17 | halted | no hint | Lenses view |
| "About Eye Care" | b18 | halted | no hint | About view |
| "Thank you" | b27 | halted | no hint | Order-confirmed view |
| Draft header nav, draft footer copy ("designer eyewear from an independent optician") | b1, b28 | halted (should be chrome-skipped) | no hint | chrome |

Live page controls (present, from converted boundaries): "The same designer shades. A good deal less." (b2, Home),
"Delivery, returns and the usual questions" (b19, Help view), "1 Contact", "2 Delivery", "3 Prescription",
"Payment", "Your bag" (b22 to b26, Checkout view). The live page header ("Eye Care Birmingham (clone) ... my
account") is the theme's own header, not the draft's.

The homepage view is b2 to b9: hero converted; b3, b4, b6 in Spec 44 review (no markup); b5, b7, b8, b9 halted.

### 3.4 Other-route content already leaks onto the page (PROVEN)

`live_body.txt` contains, after the homepage hero: Help copy (b19), the checkout steps 1 to 4 and "Your bag"
(b22 to b26), then a long tail of un-substituted `{{ ... }}` template text. Cause: the orchestrator concatenates
every converted boundary's markup into one page, ignoring which routed view the boundary belongs to.
The voter already records the enclosing view flag (`sc_var_kind: if`, `sc_var_name: isHome / isHelp / ...`), and
D1057 deliberately excluded `sc-if` from block identity. Nothing uses it to decide what belongs on the page.

---

## 4. Wrong wording to fix (PROVEN)

`sgs-clone-orchestrator.py`, the `_non_bem_warning` text: "section class '' is not SGS-BEM compliant; cv2 cannot
process it. Re-author per Spec 13 §8.1 ... or run /uimax-sgs-scrape-pattern". For a Claude Design draft that is
wrong on three counts: the class is empty; the draft is not Bean-authored so "re-author" is not possible; and
Spec 13 does not exist in the current roster. `converter/entry.py` already reports header/footer as
`chrome-skipped` correctly, but the orchestrator gate runs first and pre-empts it.

---

## 5. Adjacent finding (PROVEN, not part of the 14): Spec 44 review gate drops the section

b3, b4, b6, b10, b15, b16, b35, b38, b39, b42, b45, b50, b52, b62, b64 (15 boundaries) took the
`unmatched-classless-review` path: Stage A recognised a candidate block but did not clear FR-44-1, so the
orchestrator emits an empty `block_markup` and `continue`s. It never falls through to `convert_section`. Three of
them (b3, b4, b6) are homepage sections. Whether a review-queued boundary should ALSO emit its FR-31-4 container
conversion (content kept, flagged for review) is a Spec 44 policy call for Bean, not decided here. It is the other
half of the "homepage is 7/8 missing" figure.

---

## 6. Recommendation (nothing applied)

Ranked; A and B together fix the page. A alone makes the page worse by adding more other-route content.

| # | Change | Fixes | Gate |
|---|---|---|---|
| A | Admit a boundary whose `class_signature` is empty (eligibility only, no class injection) | b1, b28 labelled chrome-skipped; b5, b7, b8, b9 converted; the 8 other-route views convert (see B) | Shared orchestrator mechanism: design-gate before building (Rule 7) |
| B | Partition routed views: only the default view (and ungated content) goes into the target page; each other view is written to its own artefact and reported | stops the leak of Help and Checkout onto the homepage; prevents the 8 newly admitted views doing the same | Design-gate, Bean's approval; needs the route-versus-overlay rule below |
| C | Report a dropped or skipped boundary with its literal text, headings and correct reason | Rule 4 | Small; ship with A |

### Handling per category

| Category | Boundaries | Correct handling |
|---|---|---|
| Homepage view | b5, b7, b8, b9 (plus b3, b4, b6 via Spec 44) | Convert through the FR-31-4 container default and emit into the page |
| Other-route view | b12, b13, b14, b17, b18, b20, b21, b27 (plus already-leaking b19, b22 to b26) | Convert, but do NOT emit into the homepage. Write per-view markup and report as "view: isLenses, not emitted to page N". Deploy to its own page or template later (Woo product/checkout are Spec 30 template-driven) |
| Chrome | b1, b28 (plus nav b11, b29, b30) | `chrome-skipped` with an honest reason, owned by the header/footer clone walker ("Spec 33 Part 2", Spec 37 section on the clone walker). The current theme header on the live page is the theme's own |

### Diff sketch A (orchestrator, eligibility)

In `stage_4_5_6_7_8_extract`, after the dom_shape tier block, add (same shape as the sc_var and dom_shape tiers):

```python
            # Classless-root tier (FR-31-4 + D1106): a boundary with NO class at all has no
            # identity to be "non-compliant" about. convert_section already gives its root the
            # sgs/container default (recognise_section is_boundary_root=True) and chrome-skips
            # header/footer/nav. Eligibility ONLY, never an injected class.
            _cv2_eligible_via_classless_root = False
            if not _cv2_eligible and not _class_sig:
                _cv2_eligible = True
                _cv2_eligible_via_classless_root = True
                _emit(_trace_for(run_dir), stage="stage_4_classless_root_gate",
                      boundary_id=boundary_id, class_signature=_class_sig,
                      reason="FR-31-4 container default for a classless boundary root")
```

Plus: add `"admitted_via_classless_root_gate": _cv2_eligible_via_classless_root` to both `per_section_results`
dicts (complete and failed). Keep the halt for non-empty non-SGS class signatures, but change its message to name
the actual classes and drop "Spec 13 §8.1". This is not a per-block or per-kind carve-out: the condition is the
absence of any class, applied to every boundary. It also makes `--sc-var-min-confidence` and
`--dom-shape-min-confidence` redundant for classless drafts, so they can stay as-is (harmless) or be retired later.

Tests that encode "a hint is required" and would need rewriting to the new behaviour:
`tests/test_orchestrator_sc_var_gate.py::TestScVarTierGate::test_below_threshold_still_hard_halts`,
`::test_flag_omitted_still_hard_halts_even_with_a_strong_hint`, and the same two in `TestDomShapeTierGate`.
The tests using non-empty classes (`some-external-class`, `flex-1`, `non-canonical-class`) stay valid.

### Diff sketch B (view partition; design-gated, ASSUMED feasible)

1. Voter (`per-section-convention-voter.py`, where `sc_var_kind` / `sc_var_name` are set): also record
   `view_flag` (the OUTERMOST `sc-if` ancestor's name, since b13 currently records only `hasPdpReviews`) and
   `view_is_default` (its `hint-placeholder-val` is true).
2. Route-versus-overlay rule (the open design question). Structural signal that is available and DB-free: a
   route view is an `sc-if` that is a direct child of the app frame and wraps a `main[data-screen-label]`. The
   overlay flags (`menuOpen`, `lensOpen`, `bagOpen`, `showRail`) sit inside the header or inside a view, not as
   frame children. The other candidate (evaluate the draft's `isPage('x')` in its script) needs the JS resolver.
   Bean should choose.
3. Orchestrator, where `aggregate_markup_parts.append(_cv2_markup)` runs: append only when the boundary's
   `view_flag` is empty or `view_is_default`. Otherwise write `view-<flag>.json` (markup plus boundary ids) and add
   a `per_section_results` field `view_not_emitted: "<flag>"`. Stage 9 lists these as "other-route view", not as
   unmatched.

### Diff sketch C (reporting)

- In the halt and review branches, add `literal_text_chars` and `headings` (first 3) to the
  `per_section_results` row and to the `unrecognised_section` bucket row, taken from the tagged element.
- Skip the 92 generic `extraction_failed` slot rows for a boundary that produced no block (they are not signal).
- Count `chrome-skipped` boundaries (statuses from `convert_section`) into `leftover_buckets.chrome_skipped`.

### How to verify after building (do not close on assertions; Rule 5)

1. Re-run the Eye Care pipeline; expect `stage_4_non_bem_halt` count 0 for classless boundaries.
2. b1 and b28 come back `chrome-skipped`; b5, b7, b8, b9 come back `complete` with markup.
3. Playwright the live page: headings "Why buy from me", "Four reasons ...", "What people say", "You're buying from a
   person" are present. "Delivery, returns ..." and "1 Contact" are absent (after B).
4. `computed-parity.js` against the draft served over HTTP (not the resolved file in the run dir, D1114 finding 3).

---

## 7. What I did not do

- Did not run the converter or the pipeline. `converter/db/db_lookup.py` runs schema migrations on the shared DB
  at import, so a read-only dry run of `convert_section` is not safe. The claim that the 12 large sections convert
  cleanly is therefore ASSUMED, supported by the 45/45 record on the admitted boundaries.
- Did not check the second half of D1114 finding 1 (the runtime `{{ }}` placeholders shown on the live page):
  that is another investigation group.
- Did not assess `--classless-match` Stage B or Spec 45 field resolution beyond noting they did not fire for the 14.
