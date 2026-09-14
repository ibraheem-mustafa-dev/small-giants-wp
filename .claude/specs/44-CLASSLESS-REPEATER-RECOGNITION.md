# Spec 44 — Classless Repeater Recognition

**doc_type:** spec
**spec_id:** 44
**spec_version:** 1.0.0
**Status:** DESIGNED — not yet built
**Date:** 2026-09-14

## 1. Problem (plain English)

Claude Design — the AI tool used to draft new sites before they're cloned into
WordPress — never writes CSS classes. Everything is inline `style="..."`. The
`/sgs-clone` pipeline's recognition step (`converter/recognition.py::recognise()`)
reads ONLY CSS class names (`R-31-2`, currently locked) or, for a handful of atomic
tags (h1, button, img), the bare HTML tag. A repeated group of classless content —
a ticker of trust badges, a row of brand logos, a grid of "why choose us" cards, a
strip of filter chips, a list of basket line items — is therefore invisible to the
converter today: it reaches Stage 4, gets correctly identified by this session's new
`dom_shape_classifier.py` as "probably a card-grid" (13 boundaries proven live against
the real Eye Care Birmingham draft), gets admitted past the hard-halt gate — and then
still fails, because knowing "this is a card-grid" is not enough. The converter needs
to know which CHILD element is the title, which is the icon, which is the price, to
extract real block attributes. `recognise_section()` → `build_block_markup()` has no
path for that today; both are 100% class/tag driven, at every recursion level.

**Goal:** teach the pipeline to reliably recognise a repeated, classless group's
children — durably, from a real structural signature, not a one-off patch for this
draft — so a genuinely unedited Claude Design export clones correctly with zero
manual fixes.

## 2. Scope (decided 2026-09-14, Bean-approved)

- **Repeated groups ONLY** for this spec. A classless ONE-OFF section (a lone hero,
  a single unrepeated CTA block) is a harder problem — no sibling to cross-check a
  guess against — and is explicitly out of scope here. Track separately if needed.
- **Deterministic, DB-driven child→slot rules FIRST.** No AI call in the critical
  path for this spec. (A Tier-B-style AI fallback for rules that can't decide is a
  future extension, tracked in §8, not built here — it also depends on the still-open
  API-key decision from earlier this session.)
- **Trust policy: auto-complete, with a permanent audit trail.** Once a classless
  group is confidently recognised and mapped, the clone completes automatically — no
  human gate. Every decision (success AND any child that couldn't be mapped) is
  written to a durable, cross-run log, and the orchestrator prints a clear
  end-of-run alert so a Claude Code session driving `/sgs-clone` sees it immediately,
  not buried in a JSON file that gets overwritten next run.

## 3. Why Approach A (a new, separate path) — not extending `recognise()`

Three options were weighed (full detail: conversation record, 2026-09-14 design
session). Chosen: **a wholly separate recognition + assembly path that only ever
runs for content Stage 1 already flagged as "repeated, classless"** — `recognise()`
and `build_block_markup()` stay completely untouched, so R-31-2 ("BEM is the only
recognition signal") remains true of the function it currently governs, and there is
zero risk to any currently-working conversion.

Rejected: extending `recognise()` with a 5th, flag-guarded branch (bigger blast
radius on the one function every block in the framework depends on, for no real
gain over a separate path). Rejected: injecting synthesised classes onto a copy of
the child HTML and reusing the existing pipeline unmodified — this is the same
shape as the class-injection regression already found and fixed once this session
(17 working blocks collapsed to 2); per-child injection is a different blast radius
than per-section, but close enough to that exact failure mode that it isn't worth
the risk when Approach A achieves the same result without ever rewriting the
draft's HTML.

## 4. The mechanism

### 4.1 New DB table — `classless_slot_rules`

Same pattern as the existing `property_suffixes` table (R-31-1: DB-first, no
hardcoded dicts). One row per rule:

```sql
CREATE TABLE classless_slot_rules (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    match_type      TEXT NOT NULL CHECK (match_type IN ('tag', 'content_pattern', 'position')),
    match_value     TEXT NOT NULL,   -- e.g. 'svg' / 'img' / a regex for content_pattern / 'first'/'last' for position
    canonical_slot  TEXT NOT NULL,   -- must resolve via the EXISTING slots/roles vocabulary (icon, title, price, image, link, label, badge...)
    priority        INTEGER NOT NULL DEFAULT 0,  -- higher wins when >1 rule matches the same child
    notes           TEXT
);
```

Seed rules (illustrative, not exhaustive — populate + tune against real drafts
during build, per the project's "prove the cause" discipline, not guessed up
front):

| match_type | match_value | canonical_slot | notes |
|---|---|---|---|
| tag | `svg` | `icon` | first `<svg>` in the item |
| tag | `img` | `image` | |
| tag | `a` | `link` | |
| content_pattern | `^[£$€]\s?\d` | `price` | currency-shaped text |
| tag | `h1,h2,h3,h4` | `heading` | |
| position | `longest_text` | `text` | the child with the most text content, when no other rule claimed it |

### 4.2 New module — `plugins/sgs-blocks/scripts/recogniser/classless_slot_mapper.py`

`classify_group_children(representative_item, group_members) -> SlotMapResult`

Takes ONE representative item from a `dom_shape_classifier.classify_repeated_siblings`
group (already detected + proven this session), walks its DIRECT children (this is
a FLAT match — every real example found this session, ticker/card/chip/basket-line,
is 1-2 levels deep, never a deep recursive tree), applies `classless_slot_rules` in
priority order, and returns:

```python
@dataclass
class SlotMapResult:
    slots: dict[str, ChildRef]     # {canonical_slot: reference to the matched child element}
    unmapped_children: list[ChildRef]  # children no rule could label — NEVER silently dropped
    confidence: float              # derived from coverage: mapped_children / total_children
```

Same hard constraints as `dom_shape_classifier.py`: never fires if the item already
carries a canonical SGS-BEM class (constraint 1, unchanged), never treated as ground
truth below a confidence floor.

### 4.3 New module — `converter/services/classless_assembly.py`

`assemble_classless_block_markup(block_slug, slot_map, item_element) -> str`

The SIMPLER, non-recursive counterpart to `build_block_markup()` — appropriately
scoped to a flat repeated-item shape, not a rebuild of the full recursive BEM-tree
assembler. For the given `block_slug`, reads its declared attrs from
`block_attributes` (keyed by `canonical_slot`, same column the BEM path already
uses), and for each attr whose `canonical_slot` has a match in `slot_map`, lifts the
real value from that specific child — reusing the EXISTING per-value lift helpers
already in the pipeline (icon-identity resolution via
`converter/services/icon_resolver.py`, media sideload, colour token-snap) rather
than reinventing value extraction. Serialises the resulting attrs dict into the same
`<!-- wp:sgs/<slug> {...} /-->` comment format every other path emits, so everything
downstream (Stage 9 reporting, the anti-mirror gate, media-sideload) sees identical
shape regardless of which path produced it.

**Open item to verify at build time, not guessed here:** confirm exactly which of
`icon_resolver.py`'s functions take a bare element (rather than requiring a BEM
class context) before assuming direct reuse — flag and adapt during implementation
if a function needs a small signature change to accept a plain element.

### 4.4 Wiring point

`sgs-clone-orchestrator.py::stage_4_5_6_7_8_extract` — when a boundary was admitted
via `admitted_via_dom_shape_gate=True` AND its `dom_shape_hint.source` came from
`classify_repeated_siblings` (i.e. this is a repeated-group guess, not a heading/
button/landmark guess, which stay firmly out of scope per §2), route to the new
`classless_slot_mapper` + `classless_assembly` pair INSTEAD of the normal
`converter.entry.convert_section` call — which would just fail again, as proven
live this session (13 admitted, 0 additional completions). This is a NEW branch at
the orchestrator/extraction layer, outside `converter/walk.py` entirely — satisfies
"no 4th walker conditional" (R-31-3) by construction, same reasoning already
established for the `dom_shape` and `sc_var` gates.

### 4.5 Permanent audit log (Bean's explicit requirement)

New file: `plugins/sgs-blocks/scripts/recogniser/classless-recognition-log.jsonl`
(append-only, git-tracked — NOT inside `pipeline-state/<run>/`, which is per-run and
gets superseded). One line per classless-group decision, ever, across every run:

```json
{"ts": "...", "run_id": "...", "client": "...", "boundary_id": "...",
 "block_guessed": "sgs/card", "confidence": 0.42,
 "slots_mapped": {"icon": "svg:0", "text": "span:1"},
 "unmapped_children": ["div.badge-count"], "status": "complete"}
```

At orchestrator completion, if this run produced ANY classless-path conversions
(mapped or with unmapped children), print a clear, impossible-to-miss summary block
to stdout (mirroring the existing `[stage-9]`-style summary lines) — e.g.:

```
[classless-recognition] 3 classless group(s) converted this run — 1 child left
unmapped (div.badge-count in boundary b32). Full log:
plugins/sgs-blocks/scripts/recogniser/classless-recognition-log.jsonl
```

This is what makes "auto-complete but never silently drop" real: the next Claude
Code session (or Bean) can grep the log for `unmapped_children` non-empty across
every historical run, not just the one just finished.

## 5. What this does NOT change

- `recognise()` / `converter/recognition.py` — byte-for-byte unchanged. R-31-2's
  scope is exactly what it was.
- `build_block_markup()` — unchanged; the classless path never calls it.
- The existing `dom_shape`/`sc_var` eligibility gates — unchanged; this spec adds a
  new BRANCH inside Stage 4's handling of an already-admitted boundary, not a new
  gate.
- One-off (non-repeated) classless sections — explicitly out of scope (§2).

## 6. Test plan

- Unit tests for `classless_slot_mapper.py`: real fixtures (not synthetic-canonical)
  for each of this session's proven real shapes — ticker item, brand-tile, "why
  choose us" card, filter chip, basket line item — asserting the correct slot map,
  PLUS a negative control (an item with a genuinely ambiguous child no rule can
  label) asserting it lands in `unmapped_children`, never a guessed slot.
- Unit tests for `classless_assembly.py`: assert the emitted markup round-trips
  through the SAME schema-conformance gate every other path passes through
  (`check_attr_schema_conformance.py`).
- Live verification (this project's hard rule — never claim success from mocks
  alone): re-run against the real Eye Care Birmingham draft with
  `--dom-shape-min-confidence 0.0`, confirm the previously-13-admitted-0-completed
  boundaries now show real `status: complete` with real extracted attributes, and
  confirm the existing 414-attribute/17-complete-block baseline is unaffected
  (nothing in this spec touches the BEM path those came from).
- Confirm the audit log + end-of-run alert actually fire on that real run.

## 7. Rollout

Stays behind the existing `--dom-shape-min-confidence` flag (no new CLI surface) —
when a classless group is admitted via that gate, this spec's path is now what
handles it (replacing today's guaranteed-fail `convert_section` call for that case).
Auto-completes per §2's trust-policy decision; the permanent log is what makes that
safe to trust without a human gate.

## 8. Explicitly deferred (tracked, not built here)

- One-off classless sections (heading-only, button-only, landmark-only hints from
  `dom_shape_classifier.py`) — same "needs a design decision" verdict the original
  Wave-1 research gave; revisit once the repeated-group case is proven across more
  real drafts.
- An AI fallback (Tier-B-style) for children no deterministic rule can label —
  depends on the still-open Anthropic API-key decision; only worth building once
  real logged `unmapped_children` data shows deterministic rules genuinely aren't
  enough, not speculatively.
