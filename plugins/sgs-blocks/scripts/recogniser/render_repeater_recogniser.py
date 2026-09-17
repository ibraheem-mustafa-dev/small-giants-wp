"""Stage A recognition for a repeated, classless draft group — Spec 44 §3.1/§4.1/§4.3/§4.4.

The consumer half of the pair whose writer is `render_repeater_seeder.py`: that module
puts a block's REAL rendered per-item structure into `block_render_repeaters`; this one
matches a draft group's structure against it.

INERT BY DESIGN (2026-09-17): nothing here is wired into `sgs-clone-orchestrator.py`, and
Stage B (§5, DB-fact elimination) is a separate, later build. A `none` result from this
module is the complete, correct Stage A answer for a group Stage A cannot place — it is
the normal trigger for Stage B, never an error and never a guess.

TWO THINGS THIS MODULE REFUSES TO DO, both because the spec's own history says so (§0.2):

1. **It never leaf-matches against the full roster.** `sgs/buybox` and `sgs/product-card`
   render a deliberately identical thumbnail strip — measured, not assumed: both seed the
   role sequence `action-trigger, current-state-indicator, label`. Three revisions of this
   spec failed by comparing leaf shape first. Step 0 (`narrow_candidates`) runs before any
   leaf work, and `RenderMatchResult.narrowing.survivors` records exactly which blocks the
   leaf shape was ever compared against, so the guarantee is auditable rather than asserted.

2. **It never reports a partial match as exact.** §3.1: every structural marker present in
   one side must have a counterpart in the other. The unmatched markers on BOTH sides are
   carried on the result, so "partial" can be read rather than taken on trust.

THE `source_file` CAVEAT (load-bearing — read `render_repeater_seeder`'s DISCLOSED LIMITS).
`role_order` is ONE CONTINUOUS counter across ALL of a block's repeaters, and the table's PK
carries no repeater index. So rows are grouped by `source_file` here before any comparison —
`sgs/buybox`'s merged sequence spans a value ladder in `render.php` AND the thumbnail strip
in `gallery-col.php`, a shape that exists on no rendered item. Per-file grouping is the
finest cut the shipped table supports: where ONE file holds TWO repeaters (`sgs/product-card`
does), the per-file sequence is still merged, so a match is sought over contiguous WINDOWS of
that sequence and any window short of the whole file is flagged `merged_shape_hypothesis`.

UK English throughout.
"""
from __future__ import annotations

import sqlite3
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Sequence

_SCRIPTS_DIR = Path(__file__).resolve().parents[1]
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from converter.services import repeated_sibling_detector as _rsd  # noqa: E402
from recogniser import render_repeater_seeder as _seeder  # noqa: E402

SGS_DB = _seeder.SGS_DB  # one source for the DB path, never a second literal

SINGLETON = "singleton"
REPEATED = "repeated"
UNKNOWN = "unknown"

EXACT = "exact"
PARTIAL = "partial"
NONE = "none"

_QUALITY_RANK = {EXACT: 0, PARTIAL: 1, NONE: 2}


class RecogniserDataError(RuntimeError):
    """A DB precondition Stage A cannot proceed without — raised, never guessed past."""


# ---------------------------------------------------------------- inputs

@dataclass(frozen=True)
class ParentContext:
    """§4.3 Step 0's two signals, as facts about the group's own PARENT element.

    `repetition` comes from `repeated_sibling_detector` (reused unchanged — see
    `parent_repetition_context`). `required_capabilities` is the parent's declared
    composite shape: capability phrases the parent DEMONSTRABLY provides, which a
    matching block must therefore be able to provide too (e.g. `add-to-cart` for a
    PDP-shaped parent, `cta-url` for a compact card that links away).

    Each phrase is matched against `block_attributes` by TOKEN, never by block name
    (R-31-1): a candidate satisfies `add-to-cart` when it declares any attribute whose
    name tokenises to a superset of {add, to, cart} — `sgs/buybox`'s `addToCartLabel`
    does, and `sgs/product-card` declares no such attribute at all.
    """

    repetition: str = UNKNOWN
    required_capabilities: frozenset[str] = frozenset()
    required_composed_children: frozenset[str] = frozenset()
    """Front C Task 4 — mirrors `required_capabilities` exactly: exclusion-only, a
    candidate missing ANY named child from `block_render_composition` is excluded.
    Same disclosed limit as `required_capabilities` — nothing derives this from draft
    markup yet (`classless_draft_adapter.build_stage_a_group` always leaves it empty),
    so an empty set narrows nothing. Kept because Spec 45 Tier 3 (§9.2) and a future
    draft-side detector both have a real slot to populate."""


@dataclass(frozen=True)
class DraftGroup:
    """A repeated, classless draft group, reduced to what Stage A compares.

    `roles` is the per-ITEM structural-role sequence in document order, in the same
    vocabulary the seeder derives from block PHP (`render_repeater_seeder.ROLE_*`) —
    §3.1's rendered-STRUCTURE match, never a field-name match.

    `static_roles` (Front C Task 4, additive) is the group's BOUNDARY's own
    non-repeated content, in the same role vocabulary — compared against
    `block_render_singletons` as informational corroboration only (see
    `classless_trust_gate.py`'s docstring: it never contributes to FR-44-1(a)).
    """

    roles: tuple[str, ...]
    static_roles: tuple[str, ...] = ()
    parent: ParentContext = field(default_factory=ParentContext)
    label: str = ""


# ---------------------------------------------------------------- outputs

@dataclass(frozen=True)
class NarrowingResult:
    """What Step 0 did, in full — the audit trail for "the full roster was never leaf-matched"."""

    roster: tuple[str, ...]
    survivors: tuple[str, ...]
    excluded: tuple[tuple[str, str], ...]  # (slug, reason)
    repetition_conclusive: bool
    capability_conclusive: bool
    composition_conclusive: bool = False  # Front C Task 4, additive — see ParentContext

    @property
    def sole_survivor(self) -> bool:
        return len(self.survivors) == 1


@dataclass(frozen=True)
class LeafMatch:
    """One candidate's best per-item structural comparison."""

    block_slug: str
    source_file: str
    candidate_roles: tuple[str, ...]
    window: tuple[int, int]
    quality: str
    unmatched_draft_roles: tuple[str, ...]
    unmatched_candidate_roles: tuple[str, ...]
    merged_shape_hypothesis: bool

    @property
    def unmatched_total(self) -> int:
        return len(self.unmatched_draft_roles) + len(self.unmatched_candidate_roles)

    @property
    def shared_count(self) -> int:
        return len(self.candidate_roles) - len(self.unmatched_candidate_roles)

    @property
    def rank(self) -> tuple[int, int, int]:
        """Ordering key: quality first, then MOST shared markers, then fewest unmatched.

        Shared-count outranks unmatched-count deliberately. Without it a one-role window
        (`label` alone, off a three-`label` value ladder) ties the real three-role
        thumbnail item on unmatched-count and wins on position — a trivially short window
        reported as the block's per-item shape.
        """
        return (_QUALITY_RANK[self.quality], -self.shared_count, self.unmatched_total)


@dataclass(frozen=True)
class RenderMatchResult:
    """§4.4's return value. `matched` is identification, NOT auto-completion.

    FR-44-1's trust gate (a partial match, or more than one surviving candidate, never
    auto-completes; plus the per-client first-look check `client_slug` exists for) is a
    LATER task's job. This result reports quality honestly and leaves that decision to it.
    """

    matched: bool
    block_slug: str | None
    match_quality: str
    client_slug: str
    narrowing: NarrowingResult
    leaf: LeafMatch | None
    ambiguous_candidates: tuple[str, ...] = ()
    notes: tuple[str, ...] = ()
    static_leaf: LeafMatch | None = None
    """Front C Task 4 — the draft boundary's static content vs `block_render_singletons`,
    computed for the WINNING candidate only (never for a rejected/ambiguous one — there is
    no "winner" to corroborate in those cases). INFORMATIONAL ONLY: never read by
    `classless_trust_gate._clause_a()`, only by `_stage_a_signal()` for the review page."""


# ---------------------------------------------------------------- DB access

def open_db(path: Path | str | None = None) -> sqlite3.Connection:
    """Read-only connection to the live framework DB (the reporter convention)."""
    db = Path(path) if path else SGS_DB
    if not db.exists():
        raise RecogniserDataError(f"sgs-framework.db not found at {db}")
    return sqlite3.connect(f"file:{db}?mode=ro", uri=True)


def repeater_roster(conn: sqlite3.Connection) -> tuple[str, ...]:
    """Every block with a seeded render-time repeater — the only blocks a repeated group
    can match at all. Empty means unseeded, not "no block has one"."""
    rows = conn.execute(
        "SELECT DISTINCT block_slug FROM block_render_repeaters ORDER BY block_slug"
    ).fetchall()
    return tuple(r[0] for r in rows)


def candidate_role_sequences(conn: sqlite3.Connection, slug: str) -> dict[str, tuple[str, ...]]:
    """Per-item role sequences for `slug`, GROUPED BY `source_file`.

    The grouping is the whole point — see this module's docstring. Never read the
    block's rows as one sequence.
    """
    rows = conn.execute(
        "SELECT source_file, role FROM block_render_repeaters "
        "WHERE block_slug = ? ORDER BY source_file, role_order",
        (slug,),
    ).fetchall()
    out: dict[str, list[str]] = {}
    for source_file, role in rows:
        out.setdefault(source_file, []).append(role)
    return {f: tuple(r) for f, r in out.items()}


def singleton_role_sequences(conn: sqlite3.Connection, slug: str) -> dict[str, tuple[str, ...]]:
    """Front C Task 4 — `block_render_singletons`'s per-file role sequences for `slug`,
    shaped identically to `candidate_role_sequences()` so `match_leaf()` (below) can
    compare against either table with zero changes to its own logic."""
    rows = conn.execute(
        "SELECT source_file, role FROM block_render_singletons "
        "WHERE block_slug = ? ORDER BY source_file, role_order",
        (slug,),
    ).fetchall()
    out: dict[str, list[str]] = {}
    for source_file, role in rows:
        out.setdefault(source_file, []).append(role)
    return {f: tuple(r) for f, r in out.items()}


def composes_child(conn: sqlite3.Connection, slug: str, child_slug: str) -> bool:
    """Front C Task 4 — does `slug` compose `child_slug` at render time
    (`block_render_composition`)? The Step-0 counterpart of `satisfies_capability()`."""
    row = conn.execute(
        "SELECT 1 FROM block_render_composition WHERE block_slug = ? AND child_slug = ? "
        "LIMIT 1",
        (slug, child_slug),
    ).fetchone()
    return row is not None


def attribute_token_sets(conn: sqlite3.Connection, slug: str) -> tuple[frozenset[str], ...]:
    rows = conn.execute(
        "SELECT attr_name FROM block_attributes WHERE block_slug = ?", (slug,)
    ).fetchall()
    return tuple(tokenise(r[0]) for r in rows if r[0])


def _structural_facts(conn: sqlite3.Connection, slug: str) -> tuple[str | None, str | None]:
    """(composition_role, parent_block) — the DB's only real statements about where a
    block can structurally occur."""
    row = conn.execute(
        "SELECT composition_role FROM block_composition WHERE block_slug = ?", (slug,)
    ).fetchone()
    composition_role = row[0] if row else None
    row = conn.execute("SELECT parent_block FROM blocks WHERE slug = ?", (slug,)).fetchone()
    parent_block = (row[0] or None) if row else None
    return composition_role, parent_block


# ---------------------------------------------------------------- tokens

def tokenise(name: str) -> frozenset[str]:
    """`addToCartLabel` -> {add, to, cart, label}. camelCase, snake_case and hyphens."""
    out: list[str] = []
    current: list[str] = []
    for ch in name:
        if ch in "-_ .":
            if current:
                out.append("".join(current))
                current = []
            continue
        if ch.isupper() and current and not current[-1].isupper():
            out.append("".join(current))
            current = [ch]
            continue
        current.append(ch)
    if current:
        out.append("".join(current))
    return frozenset(t.lower() for t in out if t)


def satisfies_capability(attr_tokens: Iterable[frozenset[str]], capability: str) -> bool:
    """True when ANY single declared attribute carries every token of `capability`.

    Per-attribute, not per-block: `sgs/product-card` declares `add`-free `ctaText` and a
    `cartPadding`-free vocabulary, so a block-wide token union would let an unrelated
    `add` and an unrelated `cart` on two different attributes fake a cart capability.
    """
    wanted = tokenise(capability)
    if not wanted:
        return False
    return any(wanted <= tokens for tokens in attr_tokens)


# ---------------------------------------------------------------- Step 0 (§4.3)

def parent_repetition_context(parent: Any, parent_siblings: Sequence[Any]) -> str:
    """Signal (i): is the group's own parent a singleton, or one of many repeated siblings?

    `repeated_sibling_detector` is reused AS IS — its `detect_repeater_groups(siblings)`
    partitions a sibling list and drops groups under its own disclosed
    `REPEATER_MIN_GROUP_SIZE`. The parent is REPEATED when it lands in a surviving group.
    """
    if not parent_siblings:
        return SINGLETON
    for group in _rsd.detect_repeater_groups(list(parent_siblings)):
        if any(member is parent for member in group.members):
            return REPEATED
    return SINGLETON


def narrow_candidates(
    conn: sqlite3.Connection,
    roster: Sequence[str],
    parent: ParentContext,
) -> NarrowingResult:
    """§4.3 Step 0. Runs BEFORE any leaf comparison; both signals are exclusion-only.

    Neither signal ever PROMOTES a candidate — a filter with no evidence narrows nothing
    and says so (`*_conclusive` False), rather than ranking the roster on a popularity
    score. That matters here: a compact product card shares nearly all of a PDP's
    vocabulary (price, rating, brand, image), so scoring by shared tokens would have
    ranked `sgs/product-card` ABOVE `sgs/buybox` on the very draft this spec is built
    from. Only the capability the other candidate cannot provide at all discriminates.
    """
    excluded: list[tuple[str, str]] = []
    survivors: list[str] = []
    repetition_hits = 0
    capability_hits = 0
    composition_hits = 0

    for slug in roster:
        composition_role, parent_block = _structural_facts(conn, slug)

        if parent.repetition == REPEATED and composition_role == "section-root":
            excluded.append((slug, "repetition: section-root is never one of many repeated siblings"))
            repetition_hits += 1
            continue
        if parent.repetition == SINGLETON and parent_block:
            excluded.append((slug, f"repetition: only occurs inside {parent_block}, not as a singleton"))
            repetition_hits += 1
            continue

        if parent.required_capabilities:
            attr_tokens = attribute_token_sets(conn, slug)
            missing = sorted(
                cap for cap in parent.required_capabilities
                if not satisfies_capability(attr_tokens, cap)
            )
            if missing:
                excluded.append((slug, f"composite shape: declares no {', '.join(missing)} attribute"))
                capability_hits += 1
                continue

        if parent.required_composed_children:
            missing_children = sorted(
                child for child in parent.required_composed_children
                if not composes_child(conn, slug, child)
            )
            if missing_children:
                excluded.append((slug, f"composition: does not compose {', '.join(missing_children)}"))
                composition_hits += 1
                continue

        survivors.append(slug)

    return NarrowingResult(
        roster=tuple(roster),
        survivors=tuple(survivors),
        excluded=tuple(excluded),
        repetition_conclusive=repetition_hits > 0,
        capability_conclusive=capability_hits > 0,
        composition_conclusive=composition_hits > 0,
    )


# ---------------------------------------------------------------- leaf match (§3.1)

def _compare(draft: Sequence[str], window: Sequence[str]) -> tuple[str, tuple[str, ...], tuple[str, ...]]:
    if tuple(draft) == tuple(window):
        return EXACT, (), ()
    draft_counts, window_counts = Counter(draft), Counter(window)
    if not (draft_counts & window_counts):
        return NONE, tuple(draft), tuple(window)
    return (
        PARTIAL,
        tuple(sorted((draft_counts - window_counts).elements())),
        tuple(sorted((window_counts - draft_counts).elements())),
    )


def match_leaf(
    slug: str,
    draft_roles: Sequence[str],
    sequences: dict[str, tuple[str, ...]],
) -> LeafMatch | None:
    """Best per-item structural comparison for ONE candidate, over every `source_file`.

    An EXACT match is sequence equality — §3.1 names the element-role SEQUENCE, so order
    is part of the structure, not a detail. Contiguous windows are searched because a
    single `source_file` can hold two repeaters whose rows the shipped table's PK cannot
    separate; a window short of the whole file is returned flagged, never silently.
    """
    best: LeafMatch | None = None
    best_key: tuple[int, int, int, int, int] | None = None

    for source_file, roles in sorted(sequences.items()):
        for start in range(len(roles)):
            for end in range(start + 1, len(roles) + 1):
                window = roles[start:end]
                quality, unmatched_draft, unmatched_candidate = _compare(draft_roles, window)
                if quality == NONE:
                    continue
                candidate = LeafMatch(
                    block_slug=slug,
                    source_file=source_file,
                    candidate_roles=window,
                    window=(start, end),
                    quality=quality,
                    unmatched_draft_roles=unmatched_draft,
                    unmatched_candidate_roles=unmatched_candidate,
                    merged_shape_hypothesis=(start, end) != (0, len(roles)),
                )
                key = (*candidate.rank, start, end)
                if best_key is None or key < best_key:
                    best_key, best = key, candidate
    return best


# ---------------------------------------------------------------- §4.4 entry point

def recognise_render_time_repeater(
    draft_group: DraftGroup,
    client_slug: str,
    conn: sqlite3.Connection | None = None,
) -> RenderMatchResult:
    """§4.4. Takes `client_slug`, not a candidate list — Step 0 narrows internally.

    ⚠ `client_slug` is threaded and recorded but UNUSED by Stage A's matching logic. Its
    real job is FR-44-1(b)'s per-client first-look check against the §7 audit log, which
    is Task 4's build. It is carried on the result so that task has it without changing
    this signature; it deliberately influences nothing here.
    """
    owns_conn = conn is None
    conn = conn or open_db()
    try:
        roster = repeater_roster(conn)
        notes: list[str] = []
        if not roster:
            return RenderMatchResult(
                matched=False,
                block_slug=None,
                match_quality=NONE,
                client_slug=client_slug,
                narrowing=NarrowingResult((), (), (), False, False),
                leaf=None,
                notes=("block_render_repeaters is empty — run render_repeater_seeder --seed; "
                       "this is an unseeded table, not a proven absence of candidates",),
            )

        narrowing = narrow_candidates(conn, roster, draft_group.parent)
        if not narrowing.survivors:
            notes.append("Step 0 excluded every candidate — no leaf comparison was run")
            return RenderMatchResult(
                matched=False,
                block_slug=None,
                match_quality=NONE,
                client_slug=client_slug,
                narrowing=narrowing,
                leaf=None,
                notes=tuple(notes),
            )

        matches = [
            m for m in (
                match_leaf(slug, draft_group.roles, candidate_role_sequences(conn, slug))
                for slug in narrowing.survivors
            ) if m is not None
        ]
        if not matches:
            return RenderMatchResult(
                matched=False,
                block_slug=None,
                match_quality=NONE,
                client_slug=client_slug,
                narrowing=narrowing,
                leaf=None,
                notes=tuple(notes + ["no surviving candidate shares a structural marker "
                                     "with the draft group — Stage B's case (§5)"]),
            )

        best_rank = min(m.rank for m in matches)
        tied = [m for m in matches if m.rank == best_rank]
        best = tied[0]

        if len(tied) > 1:
            # FR-44-1(a): more than one surviving candidate is not a match, however good
            # the shape looks. Reported as ambiguous rather than tie-broken arbitrarily.
            notes.append("leaf shape is indistinguishable across surviving candidates")
            return RenderMatchResult(
                matched=False,
                block_slug=None,
                match_quality=best.quality,
                client_slug=client_slug,
                narrowing=narrowing,
                leaf=best,
                ambiguous_candidates=tuple(sorted(m.block_slug for m in tied)),
                notes=tuple(notes),
            )

        if best.merged_shape_hypothesis:
            notes.append(f"{best.source_file} holds more than one repeater; the matched window "
                         "is a per-item hypothesis (role_order carries no repeater index)")
        if best.quality == PARTIAL:
            notes.append("PARTIAL: unmatched markers on both sides are recorded — does not "
                         "satisfy FR-44-1(a)")

        static_leaf = None
        if draft_group.static_roles:
            # Front C Task 4 — computed for the WINNING candidate only, and only ever
            # informational: it is never fed back into the narrowing/leaf logic above.
            static_leaf = match_leaf(
                best.block_slug, draft_group.static_roles,
                singleton_role_sequences(conn, best.block_slug))

        return RenderMatchResult(
            matched=True,
            block_slug=best.block_slug,
            match_quality=best.quality,
            client_slug=client_slug,
            narrowing=narrowing,
            leaf=best,
            notes=tuple(notes),
            static_leaf=static_leaf,
        )
    finally:
        if owns_conn:
            conn.close()
