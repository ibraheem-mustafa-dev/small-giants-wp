# Classless repeater recognition — next design attempt (working synthesis, NOT a spec)

**doc_type:** report
**Date:** 2026-09-14
**Status:** working synthesis for next session's brainstorm — deliberately not a spec.
Nothing here is ready to build from directly. Figures marked "this session" are
conversation-derived and unverified on disk; re-check them before treating as settled.

## Why this doc exists

`.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md` went through three adversarial-council
rounds this session, each finding a fundamental flaw in the previous fix, and was reverted
to its original v1.0.0 draft (D1074). After parking it, four genuinely new evidence threads
turned up that none of the three failed rounds considered. This doc pulls all of it together
into one recommended shape, so next session's `/brainstorming` pass starts from real findings
instead of re-deriving them from scratch — and so it doesn't quietly re-walk the same three
dead ends.

---

## 1. What failed before and why (D1074, full trail)

Read `.claude/decisions.md` D1074 in full before starting; summary only below.

**Round 1 (6-persona council, v1.0.0 → v2.0.0 fixes):** NO-GO. Convergent findings — the
trust gate measured *completeness*, not *correctness*; auto-complete silently contradicted
`dom_shape_classifier.py`'s own "never adopt as ground truth" constraint; the wiring cited a
field that doesn't exist in the real code; the core attribute-selection mechanism doesn't work
against the real DB shape; a citation of an earlier regression (D1071) was subtly wrong.

**Round 2 (4 reviewers, v2.0.0 → v3.0.0 bridge):** NO-GO again. Two reviewers independently
found v2.0.0 was reinventing — worse — an already-shipped mechanism (`array_content.py` +
`array_item_schema`, FR-31-2.5/FR-31-2.5a, D258) that the design never checked existed. A
third found the new safety check could still be fooled by a mistake that affects **every item
in a group identically** — the single most likely real failure mode, since a repeated group is
by definition the same template repeated. A fourth found the D1071 citation was *still* wrong
after the "fix."

**Round 3 (2 reviewers, lighter pass on v3.0.0):** NO-GO. Both independently found the central
safety claim was **fabricated** — Spec 31's prose calls FR-31-2.5a's "reject non-matching
groups, pick best signature match" BUILT + LANDED, but no such group-level scoring function
exists anywhere in the codebase; `array_content.py`'s only real threshold is a `>=2`
sibling-count gate. Caught by reading the actual code, not trusting the spec's own claim about
the code.

**Outcome:** spec reverted to v1.0.0 at commit `ecd88386a`, Bean's explicit call, rather than
a fourth live rewrite. The three rounds' full text lives in git history
(`66e5e62a6`→`cbd3bb6bb`→`6db9f20b0`→`ecd88386a`) if a future session needs the exact wording
of a rejected design.

**The load-bearing lesson, not a spec defect:** all three designs worked from the RENDERED
HTML of a repeated group alone. None of them looked at the JS that built the data, none
checked the existing `array_item_schema`/`block_attributes` DB tables as a primary
mechanism (round 2 caught this only as a reuse-miss, not as a different *strategy*), and
none had an answer for a mistake that repeats identically across every member of a group —
because HTML-shape comparison between siblings can't see a shared, systematic error.

**Two prerequisite fixes designed during the reverted work are real and independent of Spec
44's fate, but were NOT applied** — flagged so a future session doesn't assume they shipped:
per-classifier `Hint.source` and a DB-verified `sgs/card-grid` slug (both fixes to
`dom_shape_classifier.py`).

---

## 2. What's new — four evidence threads none of the three failed rounds considered

### Thread 1 — JS construction-layer + HTML action-attribute signal (written up, verified on disk)

Source: `.claude/reports/2026-09-14-claude-design-draft-field-identity-schema.md`, read in
full for this doc. n=1 (one real draft, `sites/eye-care-ward-end/.../Eye Care Birmingham.dc.html`),
checked across 9 repeated groups.

Ranked findings, strongest first:

1. **Function-vs-string value, and `onClick="{{ field }}"`-style HTML binding** — the
   strongest, most reliable signal found, confirmed **independently at two separate layers**
   (JS: a field whose value is a function, e.g. `toggle: () => this.setState(...)`, is
   categorically an action, never content; HTML: `onClick="{{ q.toggle }}"` confirms the same
   rule with zero cross-reference to the JS needed). No exceptions found in 9 groups.
2. **A value passed through a named, reused formatter function** — e.g.
   `gbp(n){ return '£' + ... }`, used identically 6+ times across unrelated sections
   (`lineLabel`, `priceLabel`, `saveLabel`, `klarna`, a filter-chip label). Any field whose
   value passes through `this.gbp(...)` is a price, no exceptions found in this draft.
3. **Field names in the `.map()` construction code are self-describing English words** —
   `title`, `body`, `text`, `who`, `date`, `name`, `count`, never obfuscated/positional
   (`x1`, `val3`). Strong within this draft; unverified whether other AI drafting tools keep
   this convention.
4. **HTML tag shape for long-form vs short-form content** — real but weak/corroborating only
   (`reasons.body`→`<p>`, `reviews.text`→`<blockquote>`, `faqs.a`→`<p>`).
5. **HTML tag shape for "which field is the title"** — confirmed **unreliable even within
   this one draft**: `reasons.title`→`<h3>`, `reviews.who`→`<span>`, `faqs.q`→`<span>` inside
   a `<button>`. Same semantic role, three different tags. This is the direct explanation for
   why all three HTML-only Spec 44 attempts kept finding collisions — they were reading the
   one layer proven unreliable.
6. **Raw data-array shape** — no signal in most cases (most raw data is anonymous positional
   tuples: `['01', 'Below RRP...', 'The recommended...']`, with names existing only at the
   `.map()` step); one exception found (`PRODUCTS` is a named object literal at the data
   layer already) but explicitly flagged as not universal, not something to design around.

Boolean `hasX`/`noX`/`isX` pairs were also confirmed as display-branch flags, not content
fields, cross-checked against matching `<sc-if>` blocks.

### Thread 2 — content-value-shape detectors (NOT yet written to a file — conversation-derived this session, re-verify before treating as settled)

Investigated separately from Thread 1: given only a *value* (no field name, no JS context),
which value shapes carry their own reliable signal?

Three clean, reportedly zero-collision detectors:
- **Relative-date strings** — pattern like `"2 years ago"`.
- **FAQ-question strings** — strings ending in `?`.
- **SVG icon-path data** — strict `d="M... L... C..."` path-command grammar, unambiguous
  against any other string shape.

Genuine negative results also found, and worth carrying forward precisely because they're
honest gaps, not just wins:
- **Raw (unformatted) prices carry no signal** until they pass through a formatter — this is
  consistent with Thread 1's finding that `this.gbp(...)` is the real price signal, not the
  number itself.
- **Names/brands/titles are shape-identical** — value shape alone cannot distinguish them from
  each other. This matters because it means value-shape detectors are a *narrow* secondary
  tool, not a general field-classifier.

### Thread 3 — DB-fact elimination / disqualification (NOT yet written to a file — conversation-derived this session, re-verify before treating as settled)

**Reportedly the single strongest result found all session.** Mechanism: for a candidate
repeated group, check simple already-existing DATABASE facts — does the group have a price
field? an avatar field? an image field? — against the real `block_attributes` /
`array_item_schema` tables (the same tables Round 2's council flagged as already-shipped and
under-used), and use those facts to eliminate non-matching WordPress blocks from the candidate
list.

Reported result: **narrowed 6 of 8 real content groups in the draft down to exactly one
confident, correct block**, using facts that already exist in the framework's own schema —
nothing new invented, nothing fabricated (a direct answer to the exact failure mode Round 3
caught in v3.0.0 — this is checking real rows in a real table, not asserting a function
exists).

Two honest gaps also reportedly found by the same investigation, both load-bearing for a
future design and neither should be smoothed over:
- **A framework gap** — a "top brands" list (name + count + link, no image) has no matching
  block anywhere in the current ~85-block framework roster. This is a real content type with
  nowhere to route to, not a classifier failure.
- **A genuine unresolved tie** — a ticker/announcement strip could plausibly match either of
  two icon+text blocks, and the DB facts alone don't break the tie.

### Thread 4 — cross-reference against the framework's own block source (NOT yet written to a file — conversation-derived this session, re-verify before treating as settled)

Checked whether the framework's own blocks' field-naming conventions could serve as a
Rosetta-stone for interpreting AI-drafted field names.

Reported result: this angle **helps narrowly** — icon-slug and link/URL fields, via the
`array_item_schema.role` DB column when populated — but does **not** help distinguish
name/date/title/quote/body-text fields from each other, because **the framework's own blocks
name fields just as inconsistently as the AI-drafted content does.** Named example: real
`sgs/testimonial` uses `reviewerName`/`reviewDate` where real `sgs/process-steps` uses plain
`title`/`description` for a structurally similar concept. This is an important negative
result — it rules out "just match against our own block's field names" as a general solution,
even though it still contributes the narrow icon/link win.

### Thread 5 — Tier A variable-name classifier, real hit-rate measured for the first time

The existing "guess from the group's variable name alone" mechanism (Tier A,
`sc_var_classifier.py`) was tested against all 35 real repeated groups in the draft and found
to resolve **zero of them correctly** — a real, separate bug, currently being fixed in
parallel by another subagent in this session (`fix-tier-a-alias-bug`). Not part of the
recognition-design question itself, but relevant context: don't assume Tier A already
contributes any real signal until that fix lands and is re-verified.

---

## 3. The recommended shape (synthesis — not a spec)

**Two-stage pipeline, primary mechanism first, secondary signals to resolve what's left.**

**Stage A — PRIMARY: elimination-by-database-fact, narrows candidate blocks BEFORE any
field-identity guessing.**
For a repeated group, enumerate its available field *shapes* (has a price-shaped value? an
image/avatar field? a link? a function-valued action field?) and check those shapes against
the real `block_attributes` / `array_item_schema` schema to eliminate non-matching WordPress
blocks from the candidate list. This is Thread 3's mechanism — the strongest single result
this session, and structurally the right answer to Round 2's "you reinvented an existing
mechanism worse" finding and Round 3's "the safety claim doesn't exist in the code" finding:
it checks real rows in a real, already-shipped table rather than inventing new scoring logic.

**Stage B — SECONDARY: field-level resolution once block identity is narrowed.**
Once Stage A has narrowed the group to one (or a short list of) candidate block(s), resolve
remaining field-level ambiguity — which specific attribute a given child maps to — using, in
priority order:
1. Thread 1's function-vs-string / `onClick`-binding rule to separate action fields from
   content fields (strongest, two-layer-confirmed signal).
2. Thread 1's named-formatter-function rule (e.g. `this.gbp(...)` → price) where a shared
   formatter is present.
3. Thread 1's JS field-name-as-English-word signal, as a corroborating check, not a sole
   source.
4. Thread 2's content-value-shape detectors (relative-date, FAQ-question-mark, SVG
   icon-path) for the specific narrow field types they cover.
5. Thread 1's HTML tag-shape-for-long-form-content as the weakest tie-breaker only.

Explicitly NOT part of Stage B: HTML tag shape for "which field is the title" (Thread 1,
Finding 2a) — proven unreliable even within one draft, should not be resurrected as a signal
in any form.

**What this recommended shape does NOT yet solve — say this plainly, don't oversell:**
- The **framework gap** found in Thread 3 (name+count+link "top brands" list with no matching
  block) — this shape has no answer for a content type with nowhere to route.
- The **genuine tie** found in Thread 3 (ticker/announcement strip matching two plausible
  blocks) — DB-fact elimination alone doesn't resolve every case to exactly one candidate.
- **One-off, non-repeated content** — everything here is scoped to repeated/classless
  *groups*; a single classless block with no siblings is a different problem, out of scope.
- **Styling transfer** — this is a content-field-identity mechanism only; it says nothing
  about how the CSS/visual styling of a classless child gets transferred to the matched block
  attribute.
- The **mistake-that-repeats-identically-across-every-group-member** failure mode that killed
  Round 2's v2.0.0 design has NOT been re-examined against this new shape. Stage A eliminates
  by block-level schema facts (does the group have a price field at all), which is a
  different question from per-member consistency-checking (does this row's OWN mapped field
  agree with its siblings') — worth flagging explicitly as unresolved rather than assumed
  fixed by the new approach.

---

## 4. Concrete open questions for next session's brainstorm

Flagged, not answered — don't re-derive these from scratch:

1. **Does Stage A's DB-fact elimination run once per group, or once per member?** Round 2's
   failed v2.0.0 design tried to build member-level consistency-checking for the wrong reason
   (bolted onto a scoring function that didn't exist). Does a genuinely group-level Stage A
   still need a separate per-member check, and if so what does that check actually verify
   that Stage A doesn't already?
2. **How is Stage A's trust level established before auto-completing anything?** Round 1's
   NO-GO was specifically that the trust gate measured completeness, not correctness. A
   DB-fact match narrowing to one candidate is evidence of *plausibility*, not proof of
   *correctness* — what's the actual gate before this auto-completes a block versus routing
   to operator review?
3. **Framework gap ("top brands" list) — new block, or route to operator review?** This is a
   product decision (build coverage vs. accept a review-queue outcome for uncovered content
   types), not a technical one — needs Bean's input, not an engineering default.
4. **The genuine tie (ticker/announcement strip, two plausible blocks) — how does the system
   behave when Stage A narrows to 2+ candidates instead of 1?** Does it pick one with a
   documented tie-break rule, or always fall through to operator review on a tie? This will
   recur — ties are a structural possibility of the elimination approach, not a one-off.
5. **Is Thread 1/2's signal set generalisable, or specific to this one draft?** Both are
   explicitly n=1 (Thread 1 says so directly; Thread 2/3/4 are conversation-derived and
   unverified on disk at all). D1074's own recommendation — test against a second,
   independently-generated Claude Design draft before treating any of this as a universal
   rule — has not been done. This should probably happen before Stage B's signal list is
   locked into a spec.
6. **Does Stage A's schema check depend on `array_item_schema.role` being populated?**
   Thread 4 found the icon/link win specifically depends on that column being populated — is
   it populated broadly across the real block roster, or only for the blocks checked this
   session? Needs a real census before being relied on as "already works."
7. **Where does Tier A (variable-name classifier) fit once its bug is fixed?** Thread 5 found
   it currently resolves 0/35 real groups — once `fix-tier-a-alias-bug` lands, does a working
   Tier A become a THIRD signal source layered into Stage B, or is it superseded by the
   stronger signals in Threads 1/2? Don't assume it's automatically additive; measure it.
8. **What happens to the two undone `dom_shape_classifier.py` prerequisite fixes from D1074**
   (per-classifier `Hint.source`, DB-verified `sgs/card-grid` slug)? Are they still needed
   under this new Stage A/B shape, or were they specific to the reverted v1.0.0–v3.0.0
   designs?

---

## 5. Evidence index

| Source | What | Verified-on-disk? |
|---|---|---|
| `.claude/decisions.md` D1074 | Full 3-round council failure trail, revert rationale | Yes — read in full for this doc |
| `.claude/reports/2026-09-14-claude-design-draft-field-identity-schema.md` | Thread 1 (JS construction-layer + HTML action-attribute signal) | Yes — read in full for this doc |
| Thread 2 (content-value-shape detectors: relative-date, FAQ-question-mark, SVG icon-path; negative results on raw prices and name/brand/title shape-identity) | This session's conversation only | **No — not written to a file. Re-verify figures before treating as settled.** |
| Thread 3 (DB-fact elimination/disqualification against `block_attributes`/`array_item_schema`; 6/8 groups narrowed to exactly one block; framework gap; genuine tie) | This session's conversation only | **No — not written to a file. Re-verify figures before treating as settled — this is the strongest claim in this doc and the least documented.** |
| Thread 4 (cross-reference against framework's own block source; `array_item_schema.role`; `sgs/testimonial` vs `sgs/process-steps` naming-inconsistency example) | This session's conversation only | **No — not written to a file. Re-verify before treating as settled.** |
| Thread 5 (Tier A `sc_var_classifier.py` 0/35 hit-rate) | This session's conversation only; fix in progress via subagent `fix-tier-a-alias-bug` | **No — not written to a file. Re-verify after the parallel fix lands.** |
| `array_content.py` / `array_item_schema`, FR-31-2.5/FR-31-2.5a, D258 | Existing shipped mechanism the reverted designs failed to check/reuse correctly | Cited in D1074; not independently re-read for this doc — read it directly before building Stage A |
