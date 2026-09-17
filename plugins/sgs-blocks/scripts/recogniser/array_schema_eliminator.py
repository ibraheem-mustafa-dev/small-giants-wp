"""Stage B recognition for a repeated, classless draft group — Spec 44 §5.

The FALLBACK Stage A hands off to. Structurally a different mechanism, not a second
pass of the same one:

| | Stage A (`render_repeater_recogniser`) | Stage B (here) |
|---|---|---|
| table | `block_render_repeaters` (render-time structure) | `array_item_schema` (declared item fields) |
| candidates | parent-narrowed FIRST (§4.3 Step 0) | the FULL seeded roster, always (§5) |
| compares | rendered role SEQUENCE | declared field coverage, then §5.2's field signals |

INERT BY DESIGN (2026-09-17): nothing here is wired into `sgs-clone-orchestrator.py`
(Task 4's job), and no live pipeline behaviour changes today.

§5's precondition is enforced HERE rather than left to the caller: `recognise_by_db_
elimination` takes Stage A's result and refuses to run when Stage A already reached a
known shape, reporting `ran=False`. A precondition a caller has to remember is a
precondition that eventually gets forgotten.

FOUR THINGS THIS MODULE REFUSES TO DO:

1. **It never INFERS a draft field into a NULL-role field.** A field with no declared
   role is a WILDCARD for elimination (it cannot prove incompatibility), and is a
   resolution target ONLY on an exact key-name match — the name is a declared DB fact,
   the role's absence is not. Both halves are load-bearing on §5.3's own worked case:
   `sgs/brand-strip.logos` declares `name` and `linkUrl` with no seeded role and both
   must still receive, while the unmatched "12 frames" count text must NOT land in
   `objectFit` — a confident-looking wrong answer where §5.3 requires an honest skip.
   A candidate surviving only via wildcards is flagged `wildcard_dependent`, so a weak
   survival reads as weak.
2. **It never tie-breaks across surviving candidates.** More than one survivor is
   reported as ambiguous with the survivors named (FR-44-1(a)), never resolved by
   position or by score.
3. **It never uses HTML tag shape to pick a title.** §5.2 names that as proven
   unreliable (Thread 1 Finding 2a: the same headline role renders as `<h3>`, `<span>`
   and `<span>`-in-`<button>` within ONE draft). Priority 5 reads tag shape ONLY for
   long-form-vs-short-form, and only after every stronger signal has run.
4. **It never extracts a VALUE.** Stage B answers "which declared field does this draft
   field belong to". Pulling the value out of a DOM node is `array_content.py`'s job and
   stays unmodified there (§8) — see THE `array_content` NOTE below.

THE `array_content` NOTE (load-bearing — §8 says Stage B "reuses `array_content.py`'s
existing, unmodified extraction helpers"). Those helpers are NOT called from here, for
two measured reasons. (a) They take `bs4.Tag` DOM nodes and match BEM element classes;
a classless draft group has neither, so there is no DOM for them to read at this layer.
(b) `array_content` imports `converter.db.db_lookup`, which runs six schema migrations
against the shared live DB AS AN IMPORT SIDE EFFECT — measured, not assumed: importing
it changes the live file's mtime. A read-only recogniser must not carry that. The §8
guarantee is honoured by NOT FORKING extraction rather than by calling it: nothing here
duplicates a line of `array_content`'s extraction logic, and the value-lift path it owns
is untouched. The same measurement is why Spec 45's `classless_field_resolver` is not
imported either, even though its `DraftField` shape is the obvious sibling — see
`is_action_value`, which interoperates with its sentinel without importing it.

UK English throughout.
"""
from __future__ import annotations

import re
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

import render_repeater_recogniser as _stage_a  # noqa: E402

SGS_DB = _stage_a.SGS_DB  # one source for the DB path, never a second literal

EXACT = _stage_a.EXACT
PARTIAL = _stage_a.PARTIAL
NONE = _stage_a.NONE

RecogniserDataError = _stage_a.RecogniserDataError
open_db = _stage_a.open_db

# Per-field dispositions, matching §4.4's conservation record vocabulary.
TRANSFERRED = "transferred"
ACTION = "action"
SKIPPED = "skipped"


class FunctionLiteral:
    """Sentinel: this draft field's JS value was a function/arrow-function literal.

    §5.2 priority 1 is a TYPE test, never a name test — Thread 1 Finding 1c. A field
    NAMED like a verb (`go`, `pick`) whose value is a plain string is content; a field
    named like a noun whose value is a function is an action.
    """

    __slots__ = ()

    def __repr__(self) -> str:  # pragma: no cover - debug aid only
        return "FUNCTION_LITERAL"


FUNCTION_LITERAL = FunctionLiteral()


def is_action_value(value: Any) -> bool:
    """§5.2 priority 1, layer 1 (Thread 1 Finding 1c).

    Accepts Spec 45's identically-named sentinel by CLASS NAME as well as this module's
    own. That looks loose and is deliberate: Spec 45's sentinel lives in
    `classless_field_resolver`, whose import chain mutates the live DB (see this
    module's docstring), so it cannot be imported to compare by identity. Two sentinels
    that silently fail to compare equal would make every Spec-45-sourced action field
    read as content — the exact failure this accepts a string check to avoid.
    """
    return (
        isinstance(value, FunctionLiteral)
        or type(value).__name__ == "FunctionLiteral"
        or callable(value)
    )


# ---------------------------------------------------------------- value shapes
#
# §5.2 priority 4's "content-value-shape detectors (relative-date, FAQ-question-mark,
# SVG icon-path)". DECISION SURFACED: no such detector existed anywhere in this
# codebase when this was built (`grep -rn "relative-date\|FAQ-question-mark\|icon-path"`
# over `plugins/` + `.claude/` returned nothing), so this is new code following Spec
# 45's own precedent for the same situation — `classless_field_resolver.py::
# _role_value_shape_matches` is itself a small, explicitly-scoped shape table built
# rather than assumed-reusable. Scoped to the three shapes §5.2 names, plus two the
# real evidence needs: a colour literal (so a draft's styling fields get §2's honest
# skip rather than competing for a content slot) and the url/media shapes every
# candidate role already keys on.
#
# This is a VALUE classifier, not a per-block routing dict — R-31-1 targets the latter.
# No block slug, attribute name or field key appears in any table below.

_URL_RE = re.compile(r"^(?:https?://|//|/|#|mailto:|tel:)", re.IGNORECASE)
_IMAGE_EXT_RE = re.compile(r"\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?.*)?$", re.IGNORECASE)
_COLOUR_RE = re.compile(
    r"^(?:#[0-9a-f]{3,8}|(?:rgba?|hsla?|oklch|oklab|color-mix)\s*\()", re.IGNORECASE
)
_RELATIVE_DATE_RE = re.compile(
    r"^(?:(?:an?|\d+)\s+(?:second|minute|hour|day|week|month|year)s?\s+ago"
    r"|just\s+now|yesterday|today)$",
    re.IGNORECASE,
)
# SVG path data: a `d=` payload (starts with a move command, then path commands), or
# raw markup carrying one. Not "any string with an M in it" — the command grammar and
# a following coordinate are both required, or every word beginning with M matches.
_SVG_PATH_DATA_RE = re.compile(r"^[Mm]\s*-?[\d.]+[,\s].*[LlHhVvCcSsQqTtAaZz]", re.DOTALL)
_SVG_MARKUP_RE = re.compile(r"<\s*(?:svg|path)\b", re.IGNORECASE)

SHAPE_URL = "url"
SHAPE_MEDIA = "media"
SHAPE_COLOUR = "colour"
SHAPE_RELATIVE_DATE = "relative-date"
SHAPE_QUESTION = "question"
SHAPE_SVG_ICON_PATH = "svg-icon-path"
SHAPE_TEXT = "text"

# Which declared roles each shape is COMPATIBLE with. Read as an exclusion table: a
# shape narrows the candidate fields to those whose role could plausibly receive it,
# and narrows nothing when the role is absent from the map (no evidence, no narrowing).
_SHAPE_COMPATIBLE_ROLES: dict[str, frozenset[str]] = {
    SHAPE_URL: frozenset({"url-href", "link-href", "link-content"}),
    SHAPE_MEDIA: frozenset({"image-object", "scalar-media", "svg"}),
    SHAPE_RELATIVE_DATE: frozenset({"text-content", "content"}),
    SHAPE_QUESTION: frozenset({"text-content", "content"}),
    SHAPE_SVG_ICON_PATH: frozenset({"svg", "icon", "icon-slug", "identity"}),
}

# Roles whose value MUST carry a particular shape. The mirror of
# `_SHAPE_COMPATIBLE_ROLES` and not derivable from it: a bare word is a legal
# `icon-slug` but can never be an `image-object`, so "which shapes may this role
# accept" has to be stated in its own direction. Without it a plain text value lands
# in the candidate's image field — measured on the real brand-tile group, where
# `name: 'Ray-Ban'` resolved to `sgs/brand-strip.logos.media`.
_ROLE_REQUIRED_SHAPES: dict[str, frozenset[str]] = {
    "image-object": frozenset({SHAPE_MEDIA}),
    "scalar-media": frozenset({SHAPE_MEDIA}),
    "url-href": frozenset({SHAPE_URL, SHAPE_MEDIA}),
    "link-href": frozenset({SHAPE_URL, SHAPE_MEDIA}),
    "link-content": frozenset({SHAPE_URL, SHAPE_MEDIA}),
}

_LONG_FORM_TAGS = frozenset({"p", "blockquote", "article", "section", "pre"})
_SHORT_FORM_TAGS = frozenset({"span", "div", "a", "button", "label", "li", "td", "th",
                              "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "small"})


def classify_value_shape(value: Any) -> str:
    """The shape of ONE draft value. Order matters: the narrower tests run first."""
    if not isinstance(value, str):
        return SHAPE_TEXT
    text = value.strip()
    if not text:
        return SHAPE_TEXT
    if _COLOUR_RE.match(text):
        return SHAPE_COLOUR
    if _SVG_MARKUP_RE.search(text) or _SVG_PATH_DATA_RE.match(text):
        return SHAPE_SVG_ICON_PATH
    if _IMAGE_EXT_RE.search(text):
        return SHAPE_MEDIA
    if _URL_RE.match(text):
        return SHAPE_URL
    if _RELATIVE_DATE_RE.match(text):
        return SHAPE_RELATIVE_DATE
    if text.endswith("?"):
        return SHAPE_QUESTION
    return SHAPE_TEXT


def _is_media_reference(value: Any) -> bool:
    if isinstance(value, dict):
        return "url" in value or "id" in value
    return classify_value_shape(value) == SHAPE_MEDIA


# ---------------------------------------------------------------- inputs

@dataclass(frozen=True)
class DraftField:
    """One field on a repeated draft item, as the draft's own JS builds it.

    `value` carries real content or `FUNCTION_LITERAL`. `onclick_bound` is Thread 1
    Finding 2c — the HTML-only action signal (`onClick="{{ q.toggle }}"`), independent
    of `value`'s type, which is what makes §5.2 priority 1 "two-layer-confirmed".
    `formatter` is the NAME of a shared formatter the value passes through
    (Finding 1b's `this.gbp(...)`); `tag` is the rendering tag, priority 5's only input.
    """

    key: str
    value: Any = None
    tag: str = ""
    onclick_bound: bool = False
    formatter: str = ""


@dataclass(frozen=True)
class DraftItemGroup:
    """A repeated, classless draft group, reduced to ONE item's field set.

    Stage B matches on the DECLARED SHAPE of an item, which every member of a real
    repeated group shares — so one representative item is the whole input. A per-member
    consistency check is Spec 44 §11's explicitly-open question, not silently assumed
    solved here.
    """

    fields: tuple[DraftField, ...]
    label: str = ""


# ---------------------------------------------------------------- outputs

@dataclass(frozen=True)
class Candidate:
    """One `(block_slug, array_attr)` pair and its declared item fields."""

    block_slug: str
    array_attr: str
    fields: tuple[tuple[str, str | None, int], ...]  # (field_key, role, field_order)

    @property
    def name(self) -> str:
        return f"{self.block_slug}.{self.array_attr}"

    @property
    def roled_fields(self) -> tuple[tuple[str, str, int], ...]:
        return tuple((k, r, o) for k, r, o in self.fields if r)

    @property
    def wildcard_fields(self) -> tuple[tuple[str, None, int], ...]:
        return tuple((k, r, o) for k, r, o in self.fields if not r)


@dataclass(frozen=True)
class EliminationResult:
    """§5's full-roster scan, in full — the audit trail for "nothing was pre-narrowed"."""

    roster: tuple[str, ...]
    survivors: tuple[str, ...]
    excluded: tuple[tuple[str, str], ...]  # (candidate name, reason)
    wildcard_dependent: frozenset[str] = frozenset()

    @property
    def sole_survivor(self) -> bool:
        return len(self.survivors) == 1


@dataclass(frozen=True)
class FieldResolution:
    """§4.4's PER-FIELD conservation record — never a bare count."""

    draft_key: str
    disposition: str  # TRANSFERRED | ACTION | SKIPPED
    field_key: str | None = None
    matched_by: str = ""
    reason: str = ""
    considered: tuple[str, ...] = ()

    def __str__(self) -> str:  # pragma: no cover - report aid
        if self.disposition == TRANSFERRED:
            return f"{self.draft_key}: transferred -> {self.field_key} ({self.matched_by})"
        if self.disposition == ACTION:
            return f"{self.draft_key}: action ({self.reason})"
        return f"{self.draft_key}: skipped: {self.reason}"


@dataclass(frozen=True)
class SchemaMatchResult:
    """§5's return value.

    Deliberately NOT Stage A's `RenderMatchResult`: Stage B performs no parent-narrowing
    and no leaf comparison, so populating a `NarrowingResult`/`LeafMatch` would be a
    fabricated audit trail. The COMMON field names (`matched`, `block_slug`,
    `match_quality`, `client_slug`, `ambiguous_candidates`, `notes`) are name-compatible
    on purpose, so Task 4's orchestrator can handle either result uniformly without
    either stage claiming the other's mechanism.

    `matched` is identification, NOT auto-completion. FR-44-1's trust gate — including
    (b)'s per-client first-look against the §7 audit log — is Task 4's.
    """

    ran: bool
    matched: bool
    block_slug: str | None
    array_attr: str | None
    match_quality: str
    client_slug: str
    elimination: EliminationResult
    fields: tuple[FieldResolution, ...] = ()
    ambiguous_candidates: tuple[str, ...] = ()
    notes: tuple[str, ...] = ()


# ---------------------------------------------------------------- DB access

def content_bearing_roles(conn: sqlite3.Connection) -> frozenset[str]:
    """The `roles` table's own classification — the same rows `db_lookup` reads.

    Queried directly rather than through `db_lookup._content_bearing_roles()` because
    that module mutates the live DB on import (module docstring). Same data, no writes.
    """
    rows = conn.execute(
        "SELECT role_name FROM roles WHERE classification = 'content-bearing'"
    ).fetchall()
    if not rows:
        raise RecogniserDataError(
            "roles table holds no content-bearing rows — an unseeded vocabulary, "
            "not a proven absence of content roles"
        )
    return frozenset(r[0] for r in rows)


def seeded_roster(conn: sqlite3.Connection) -> tuple[Candidate, ...]:
    """Every `(block_slug, array_attr)` pair in `array_item_schema`, with its fields.

    This IS §5's "full seeded roster" — scanned whole, every time, with no
    pre-narrowing. Empty means unseeded, not "no block declares a repeater".
    """
    rows = conn.execute(
        "SELECT block_slug, array_attr, field_key, role, COALESCE(field_order, 0) "
        "FROM array_item_schema ORDER BY block_slug, array_attr, field_order, field_key"
    ).fetchall()
    grouped: dict[tuple[str, str], list[tuple[str, str | None, int]]] = {}
    for slug, attr, key, role, order in rows:
        grouped.setdefault((slug, attr), []).append((key, role or None, int(order)))
    return tuple(
        Candidate(block_slug=slug, array_attr=attr, fields=tuple(fields))
        for (slug, attr), fields in grouped.items()
    )


# ---------------------------------------------------------------- pre-filter

def _tokens(name: str) -> frozenset[str]:
    return _stage_a.tokenise(name)


def _names_match(draft_key: str, field_key: str) -> bool:
    """Exact key identity, normalised for camelCase/snake_case/kebab-case only.

    NOT a synonym table and not a fuzzy score — §5.2 priority 3 is a corroborating
    check, and a loose name match dressed as an exact one would promote the weakest
    signal above the two stronger ones.
    """
    return _tokens(draft_key) == _tokens(field_key) and bool(_tokens(draft_key))


def prefilter(group: DraftItemGroup) -> tuple[tuple[DraftField, ...], tuple[FieldResolution, ...]]:
    """Split a group's fields into CONTENT (participates) and already-dispositioned.

    Three evidence-grounded exclusions, all decided before any candidate is consulted
    so none of them can eliminate a candidate:

    * **action** — §5.2 priority 1 (function value, Finding 1c; or `onClick`-bound,
      Finding 2c). An action can never be a content field.
    * **display-branch flag** — a boolean (Finding 1d's `hasImg`/`noImg`/`isChip`
      pairs). Marks which branch renders, carries no content.
    * **styling** — a colour literal. Recorded with §2's exact skip reason, which §4.4
      requires be written down rather than left unmentioned.
    """
    content: list[DraftField] = []
    decided: list[FieldResolution] = []
    for f in group.fields:
        if is_action_value(f.value):
            decided.append(FieldResolution(
                f.key, ACTION, reason="function-valued field (Thread 1 Finding 1c)"))
            continue
        if f.onclick_bound:
            decided.append(FieldResolution(
                f.key, ACTION, reason="bound in an onClick/onChange handler "
                                      "(Thread 1 Finding 2c)"))
            continue
        if isinstance(f.value, bool):
            decided.append(FieldResolution(
                f.key, SKIPPED, reason="display-branch boolean, not content "
                                       "(Thread 1 Finding 1d)"))
            continue
        if classify_value_shape(f.value) == SHAPE_COLOUR:
            decided.append(FieldResolution(
                f.key, SKIPPED, reason="styling transfer out of scope, Spec 44 §2"))
            continue
        content.append(f)
    return tuple(content), tuple(decided)


# ---------------------------------------------------------------- §5 elimination

def _receivable_by(
    draft_field: DraftField,
    candidate: Candidate,
    content_roles: frozenset[str],
) -> tuple[tuple[str, str | None, int], ...]:
    """Candidate fields that could RECEIVE this draft field — the resolution targets.

    Two ways in, and only two:

    * **exact key-name match**, whatever the role — INCLUDING a NULL role. The field
      NAME is a declared DB fact; §5.3 turns on precisely this (`sgs/brand-strip.logos`
      declares `name` and `linkUrl` with no seeded role, and both must still receive).
    * **a declared content-bearing role** the value's shape is compatible with, in both
      directions: the shape admits the role (`_SHAPE_COMPATIBLE_ROLES`) and the role
      admits the shape (`_ROLE_REQUIRED_SHAPES`).

    A NULL-role field is otherwise NEVER a resolution target. That is what keeps §5.3's
    unmatched "12 frames" count text out of `objectFit` — a confident-looking wrong
    answer where the spec requires an honest skip.
    """
    shape = _shape_of(draft_field)
    compatible = _SHAPE_COMPATIBLE_ROLES.get(shape)
    out: list[tuple[str, str | None, int]] = []
    for key, role, order in candidate.fields:
        if _names_match(draft_field.key, key):
            out.append((key, role, order))
            continue
        if role is None or role not in content_roles:
            continue
        required = _ROLE_REQUIRED_SHAPES.get(role)
        if required is not None and shape not in required:
            continue
        # `compatible is None` means a plain-text value: it narrows nothing, because
        # every remaining content role could hold text. Absence of evidence must not
        # read as evidence either way.
        if compatible is not None and role not in compatible:
            continue
        out.append((key, role, order))
    return tuple(out)


def eliminate_candidates(
    conn: sqlite3.Connection,
    group: DraftItemGroup,
    roster: Sequence[Candidate] | None = None,
) -> EliminationResult:
    """§5 — DB-fact elimination across the FULL seeded roster, exclusion-only.

    TWO criteria, and deliberately only two, because only two are DB FACTS:

    * **E1 shape incompatibility** — a content field whose value carries a DISTINCTIVE
      shape (url / media / svg-icon-path / relative-date / question) needs a candidate
      field that is either named the same or declares a role that shape is compatible
      with. None left unclaimed -> excluded, naming the field that could not land.
    * **E2 capacity** — a candidate cannot hold more fields than it declares. Wildcard
      (NULL-role) fields COUNT here: `role IS NULL` means "no seeding mechanism reached
      this row", so the slot exists even though its type is unknown.

    **A plain-text field eliminates NOTHING, on purpose.** Any content-bearing role can
    hold text, so excluding on a text field would be excluding on absence of evidence.
    This is why §5.3's "12 frames" count text leaves `sgs/brand-strip` standing and
    comes out as an honest per-field skip instead: the unmatched field is a RESOLUTION
    gap, not a contradiction of any declared fact.

    Nothing is ever promoted and nothing is scored. A roster scan that ranked by shared
    vocabulary would put a compact card above the PDP it summarises — the same failure
    Stage A's §4.3 rejects for the same reason.
    """
    content_roles = content_bearing_roles(conn)
    candidates = tuple(roster) if roster is not None else seeded_roster(conn)
    content_fields, _ = prefilter(group)

    survivors: list[str] = []
    excluded: list[tuple[str, str]] = []
    wildcard_dependent: set[str] = set()

    for cand in candidates:
        if len(content_fields) > len(cand.fields):
            excluded.append((cand.name, (
                f"capacity: {len(content_fields)} content field(s) exceed the "
                f"{len(cand.fields)} field(s) {cand.name} declares")))
            continue

        used: set[str] = set()
        used_wildcard = False
        reason = ""
        for f in _assignment_order(content_fields):
            shape = _shape_of(f)
            targets = [t for t in _receivable_by(f, cand, content_roles) if t[0] not in used]
            if shape not in _SHAPE_COMPATIBLE_ROLES:
                # Plain text (E1 does not apply). It still consumes a slot for E2, but
                # a role-compatible slot is preferred so a distinctive field later in
                # the group is not starved of the only field that could take it.
                claim = targets[0][0] if targets else next(
                    (k for k, _r, _o in cand.fields if k not in used), None)
                if claim is None:
                    reason = f"capacity: no unclaimed field remains for '{f.key}'"
                    break
                used.add(claim)
                used_wildcard = used_wildcard or not targets
                continue
            if not targets:
                reason = (f"no field on {cand.name} can receive '{f.key}' — its value is "
                          f"{shape}-shaped and no unclaimed field is named for it or "
                          f"declares a compatible role")
                break
            used.add(targets[0][0])
        if reason:
            excluded.append((cand.name, reason))
            continue
        survivors.append(cand.name)
        if used_wildcard:
            wildcard_dependent.add(cand.name)

    return EliminationResult(
        roster=tuple(c.name for c in candidates),
        survivors=tuple(survivors),
        excluded=tuple(excluded),
        wildcard_dependent=frozenset(wildcard_dependent),
    )


# ---------------------------------------------------------------- §5.2 resolution

def _shared_formatter_roles(
    content_fields: Sequence[DraftField],
    resolved: dict[str, str],
    formatter: str,
) -> frozenset[str]:
    """§5.2 priority 2 — the roles a formatter's own already-resolved members occupy.

    The formatter NAME is never mapped to a meaning (that would be the hardcoded dict
    R-31-1 forbids, and `gbp`->price is one draft's convention, not a framework fact).
    What it carries is an EQUIVALENCE: fields sharing a named formatter share a type, so
    once any member resolves, its role constrains the rest. With no resolved member it
    constrains nothing.
    """
    return frozenset(
        resolved[f.key] for f in content_fields
        if f.formatter and f.formatter == formatter and f.key in resolved
    )


def _shape_of(draft_field: DraftField) -> str:
    if _is_media_reference(draft_field.value):
        return SHAPE_MEDIA
    return classify_value_shape(draft_field.value)


def _assignment_order(fields: Sequence[DraftField]) -> tuple[DraftField, ...]:
    """Distinctive shapes first, plain text last — an ORDER fix, not a preference.

    Greedy assignment in draft order let a plain-text field claim the candidate's only
    `image-object` slot (nothing narrows a text value, so every content role is a legal
    target for it), starving a genuinely media-shaped field later in the same item and
    excluding a candidate that could in fact hold the group. Measured on the real
    `bagItems` shape, which eliminated the ENTIRE roster for that reason alone. A field
    with a narrower set of legal targets is placed before one with a wider set; the
    result is order-independent within a shape class. Stable, so draft order still
    breaks ties among equals.
    """
    return tuple(sorted(
        fields, key=lambda f: 0 if _shape_of(f) in _SHAPE_COMPATIBLE_ROLES else 1))


def _resolution_order(
    fields: Sequence[DraftField], candidate: Candidate
) -> tuple[DraftField, ...]:
    """`_assignment_order` with a stronger first pass: STRONGEST SIGNAL FIRST.

    A field with an exact key-name match on this candidate is placed before one relying
    on a weaker §5.2 signal, so the weaker signal can never steal a slot the stronger one
    owns. Measured on the real `reasons` item against `sgs/card-grid.items`: processed in
    draft order, `no` (resolved only by priority 5) took `title`, pushing the draft's own
    `title` — an exact name match — into `subtitle` and `body` into `badge`. Every field
    still resolved, so nothing looked wrong; the whole item was simply shifted by one.
    """
    named = {f.key for f in fields
             if any(_names_match(f.key, k) for k, _r, _o in candidate.fields)}
    return tuple(sorted(
        _assignment_order(fields), key=lambda f: 0 if f.key in named else 1))


def _tag_class(tag: str) -> str:
    tag = (tag or "").strip().lower()
    if tag in _LONG_FORM_TAGS:
        return "long"
    if tag in _SHORT_FORM_TAGS:
        return "short"
    return ""


def resolve_fields(
    conn: sqlite3.Connection,
    group: DraftItemGroup,
    candidate: Candidate,
) -> tuple[FieldResolution, ...]:
    """§5.2 — field-level resolution against ONE narrowed candidate, in priority order.

    Priority 1 (action) is applied in `prefilter` before anything else, because an
    action is not a content field at all. Priorities 2-5 are FILTERS over the fields
    that could receive a draft field, applied in order, each only narrowing what the
    previous left. The first priority that leaves exactly one target wins; a priority
    that would empty the set is skipped rather than allowed to eliminate everything
    (a corroborating check must never be able to fail a field on its own). If more than
    one target survives all five, the field is SKIPPED as ambiguous — §10's negative
    control: it falls to review, never a guessed slot.
    """
    content_roles = content_bearing_roles(conn)
    content_fields, decided = prefilter(group)

    # Resolved in assignment order (distinctive shapes first, see `_assignment_order`),
    # but EMITTED in the draft's own field order: the conservation record is read
    # against the draft, so reordering it would make a per-field disposition harder to
    # check than the thing it is recording.
    by_key: dict[str, FieldResolution] = {d.draft_key: d for d in decided}
    used: set[str] = set()
    resolved_roles: dict[str, str] = {}
    item_tag_classes = {c for c in (_tag_class(f.tag) for f in content_fields) if c}

    for f in _resolution_order(content_fields, candidate):
        targets = [t for t in _receivable_by(f, candidate, content_roles) if t[0] not in used]
        if not targets:
            by_key[f.key] = FieldResolution(
                f.key, SKIPPED,
                reason=f"no declared field on {candidate.name} can receive it",
                considered=tuple(k for k, _r, _o in candidate.fields))
            continue

        exact = [t for t in targets if _names_match(f.key, t[0])]
        if len(exact) == 1:
            key, role, _o = exact[0]
            used.add(key)
            if role:
                resolved_roles[f.key] = role
            by_key[f.key] = FieldResolution(f.key, TRANSFERRED, field_key=key,
                                            matched_by="direct-key")
            continue

        matched_by = "shape"
        if len(targets) > 1 and f.formatter:
            roles = _shared_formatter_roles(content_fields, resolved_roles, f.formatter)
            narrowed = [t for t in targets if t[1] in roles]
            if narrowed:
                targets, matched_by = narrowed, f"shared-formatter:{f.formatter}"

        if len(targets) > 1:
            # Priority 3 — JS field names as English words, CORROBORATING ONLY: a
            # shared word token, not an identity. Skipped when it would empty the set.
            want = _tokens(f.key)
            narrowed = [t for t in targets if want & _tokens(t[0])]
            if narrowed:
                targets, matched_by = narrowed, "name-token"

        if len(targets) > 1:
            shape = classify_value_shape(f.value)
            compatible = _SHAPE_COMPATIBLE_ROLES.get(shape)
            if compatible:
                narrowed = [t for t in targets if t[1] in compatible]
                if narrowed and len(narrowed) < len(targets):
                    targets, matched_by = narrowed, f"value-shape:{shape}"

        if len(targets) > 1:
            # Priority 5 — the weakest, and doubly constrained.
            #
            # It is structurally incapable of picking a title: it reads ONLY long-form
            # vs short-form (Finding 2b), never which tag is a heading (Finding 2a) —
            # `<h3>` and `<span>` are the same class to it.
            #
            # And it fires ONLY when this item's own fields genuinely SPLIT into both
            # classes. Without that guard it resolved every tie the moment a tag was
            # present, by taking the lowest `field_order` — positional guessing dressed
            # as a signal, and it made §10's "no rule can resolve it" outcome
            # unreachable for any field that happens to carry a tag. A tie-breaker with
            # nothing to compare against must stay silent and let the field fall to
            # review.
            klass = _tag_class(f.tag)
            if klass and item_tag_classes == {"long", "short"}:
                pick = max if klass == "long" else min
                targets, matched_by = [pick(targets, key=lambda t: t[2])], "tag-shape-order"

        if len(targets) != 1:
            by_key[f.key] = FieldResolution(
                f.key, SKIPPED,
                reason="ambiguous: no rule in §5.2's priority order resolves it to one "
                       "field — falls to review rather than a guessed slot",
                considered=tuple(k for k, _r, _o in targets))
            continue

        key, role, _o = targets[0]
        used.add(key)
        if role:
            resolved_roles[f.key] = role
        by_key[f.key] = FieldResolution(f.key, TRANSFERRED, field_key=key,
                                        matched_by=matched_by)

    return tuple(by_key[f.key] for f in group.fields if f.key in by_key)


# ---------------------------------------------------------------- §5 entry point

def recognise_by_db_elimination(
    draft_group: DraftItemGroup,
    client_slug: str,
    stage_a_result: Any = None,
    conn: sqlite3.Connection | None = None,
) -> SchemaMatchResult:
    """§5's entry point. Runs ONLY when Stage A reached no known shape.

    `stage_a_result` is Stage A's own `RenderMatchResult` (or None when Stage A was not
    run at all — a legitimate standalone call). A matched Stage A result returns
    `ran=False` with the precondition named, so the §5 condition is enforced here rather
    than trusted to every future caller.

    ⚠ `client_slug` is threaded and recorded but UNUSED by Stage B's logic, exactly as
    in Stage A. FR-44-1(b)'s per-client first-look against the §7 audit log is Task 4's
    build; it is carried so that task needs no signature change, and it deliberately
    influences nothing here.
    """
    empty = EliminationResult((), (), ())
    if stage_a_result is not None and getattr(stage_a_result, "matched", False):
        return SchemaMatchResult(
            ran=False, matched=False, block_slug=None, array_attr=None,
            match_quality=NONE, client_slug=client_slug, elimination=empty,
            notes=("Stage A reached a known shape — §5's precondition is not met, "
                   "so Stage B did not run",))

    owns_conn = conn is None
    conn = conn or open_db()
    try:
        roster = seeded_roster(conn)
        if not roster:
            return SchemaMatchResult(
                ran=True, matched=False, block_slug=None, array_attr=None,
                match_quality=NONE, client_slug=client_slug, elimination=empty,
                notes=("array_item_schema is empty — an unseeded table, not a proven "
                       "absence of candidates",))

        elimination = eliminate_candidates(conn, draft_group, roster)
        notes: list[str] = []

        if not elimination.survivors:
            return SchemaMatchResult(
                ran=True, matched=False, block_slug=None, array_attr=None,
                match_quality=NONE, client_slug=client_slug, elimination=elimination,
                fields=prefilter(draft_group)[1],
                notes=("no seeded array item schema can account for this group — an "
                       "honest no-match, which §5.4 names as expected for a group that "
                       "is no SGS block's shape",))

        if len(elimination.survivors) > 1:
            # FR-44-1(a): more than one survivor is not a match, however good it looks.
            return SchemaMatchResult(
                ran=True, matched=False, block_slug=None, array_attr=None,
                match_quality=NONE, client_slug=client_slug, elimination=elimination,
                fields=prefilter(draft_group)[1],
                ambiguous_candidates=elimination.survivors,
                notes=("DB-fact elimination did not reach one candidate; no field-level "
                       "resolution was run, and no candidate was tie-broken",))

        name = elimination.survivors[0]
        winner = next(c for c in roster if c.name == name)
        resolutions = resolve_fields(conn, draft_group, winner)

        unresolved = [r for r in resolutions if r.disposition == SKIPPED]
        quality = EXACT if not unresolved else PARTIAL
        if unresolved:
            notes.append(f"{len(unresolved)} field(s) did not transfer; each carries its "
                         "own reason (§4.4's per-field conservation record)")
        if name in elimination.wildcard_dependent:
            notes.append("this candidate survived elimination only via field(s) with no "
                         "declared role — a weak survival, not a strong one: a NULL role "
                         "cannot prove incompatibility and is never a resolution target")

        return SchemaMatchResult(
            ran=True, matched=True, block_slug=winner.block_slug,
            array_attr=winner.array_attr, match_quality=quality, client_slug=client_slug,
            elimination=elimination, fields=resolutions, notes=tuple(notes))
    finally:
        if owns_conn:
            conn.close()
