"""FR-44-1's trust gate, §7's audit log, and the end-of-run summary — Spec 44 Task 4.

FR-44-1(b) REAL HUMAN APPROVAL (Front C Task 1, closes a real hole the 2026-09-17
`/adversarial-council` re-verification converged on). Before this, `pattern_precedent()`
was satisfied by ANY prior row for the (client, block, match_type) triple — including the
run's OWN "forced to review once" row, which `evaluate()` writes unconditionally via
`append_decision()`. Nothing about that write involves a person: the pipeline's own log
call satisfied the gate that exists specifically to force a person to look. §3(b)'s text
("a one-time human look") was true in prose and false in code.

Fixed by splitting the log into two ROW KINDS. `KIND_DECISION` (unchanged) is what
`evaluate()`/`append_decision()` write every run — a record of what happened, never proof
anyone looked. `KIND_APPROVAL` is a NEW row kind, written ONLY by `record_human_approval()`,
which is never called from `evaluate()` or anywhere else in the automated path — the only
caller is this module's own `--approve` CLI action, invoked by a person. `pattern_precedent()`
now requires an APPROVAL row for the (client, block, match_type) triple, not merely a decision
row. A run can still write any number of decision rows for a pattern; none of them open the
gate on their own.

The integration layer for the three inert modules built before it: Task 1's seeder
writes `block_render_repeaters`, Task 2's Stage A matches a draft group's structure
against it, Task 3's Stage B falls back to `array_item_schema`. None of them decides
anything — each reports identification and quality honestly and says, in its own
docstring, that the DECISION is this module's job. This is that decision, plus the
durable record it is made from.

WHAT "RECOGNISED" DELIVERS HERE — the scope call, stated rather than assumed.
Stage A and Stage B both answer "which block, which field" (identity). Neither
answers "what is the value" (extraction), and Spec 44 §2 scopes no extraction into
this spec at all. §4.4 says why that is CORRECT for Stage A and only Stage A: the
recognised composite "is emitted NORMALLY, with whatever real attributes it already
takes — the render-time repeater itself needs no attribute, because the block already
renders it from live data with no block-side input." There is genuinely nothing to
extract, so emitting the bare block IS the complete, faithful result.

⛔ **That reasoning does NOT carry to Stage B, and this module therefore never
auto-completes a Stage B match.** Stage B resolves a draft field to a DECLARED
`array_item_schema` field — an editor attribute that the block renders FROM, and
which nothing in this spec fills. Emitting the block on a Stage B match would emit it
EMPTY: a silently content-free section that passes every structural check, which is
Rule 4's "never silently dropped" inverted. A Stage B match is identification routed
to review, with its per-field conservation record attached, and the missing
value-extraction path is named as a NEW deferred item — not quietly assumed solved.

THE FR-44-1(b) SNAPSHOT RULE (a real hole, closed deliberately). §7's scan is "a prior
row with the same `client_slug` and the same (block, match-type) pattern". Read
literally against a log this run is itself appending to, the FIRST occurrence in a run
writes its forced-to-review row and the SECOND occurrence in the SAME run then finds
that row and auto-completes — the "one-time human look" having happened to nobody.
`read_precedent()` therefore snapshots the log ONCE, at run start, and the gate is
evaluated only against that snapshot. The human looks BETWEEN runs, which is what
"forced to review once" has to mean for the gate to be a gate at all.

THE `source` FILTER (v2.3.1, for Spec 45 §10.3). Spec 45's Tier 4 writes to this same
log from a classifier capped at 0.5 confidence and always review-pending. Its rows
carry `source: "tier4-domshape"` and MUST never satisfy this spec's own first-look
gate, however many times they repeat for a client. A row with NO `source` key is read
as `"spec44"` for forward-compatibility; every row written here carries it explicitly.

UK English throughout.
"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

_HERE = Path(__file__).resolve().parent
_SCRIPTS_DIR = _HERE.parent
for _p in (str(_HERE), str(_SCRIPTS_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import array_schema_eliminator as _stage_b  # noqa: E402
import render_repeater_recogniser as _stage_a  # noqa: E402

EXACT = _stage_a.EXACT
PARTIAL = _stage_a.PARTIAL
NONE = _stage_a.NONE

LOG_PATH = _HERE / "classless-recognition-log.jsonl"

SOURCE_SPEC44 = "spec44"
SOURCE_TIER4 = "tier4-domshape"

KIND_DECISION = "decision"
KIND_APPROVAL = "approval"

MATCH_TYPE_RENDER_REPEATER = "render-repeater"
MATCH_TYPE_ARRAY_SCHEMA = "array-item-schema"

STAGE_A = "A"
STAGE_B = "B"
STAGE_NONE = "none"

OUTCOME_AUTO = "auto-completed"
OUTCOME_REVIEW = "review"
OUTCOME_NO_MATCH = "no-match"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------- §7 audit log

def read_log(path: Path | str | None = None) -> tuple[dict, ...]:
    """Every parseable row of the append-only log. A missing file is an empty log.

    A malformed line is SKIPPED rather than raised on: the log is append-only and
    git-tracked, so a half-written line from an interrupted run must not be able to
    stop every later run from reading the rows above it.
    """
    p = Path(path) if path else LOG_PATH
    if not p.exists():
        return ()
    rows: list[dict] = []
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue
        if isinstance(row, dict):
            rows.append(row)
    return tuple(rows)


def row_source(row: dict) -> str:
    """v2.3.1: a row with no `source` key is `spec44` (forward-compatibility only —
    every row this module writes states it explicitly)."""
    value = row.get("source")
    return value if isinstance(value, str) and value else SOURCE_SPEC44


def row_kind(row: dict) -> str:
    """A row with no `kind` key predates the approval split and is a decision row —
    the only kind ever written before this field existed."""
    value = row.get("kind")
    return value if isinstance(value, str) and value else KIND_DECISION


def pattern_precedent(
    rows: Sequence[dict],
    client_slug: str,
    block_slug: str,
    match_type: str,
) -> bool:
    """FR-44-1(b): has a HUMAN already approved this (block, match-type) pattern for
    THIS client — not merely "has the pipeline logged it before".

    Requires a `KIND_APPROVAL` row, which only `record_human_approval()` writes and
    which nothing in the automated recognise/evaluate path ever calls. A `KIND_DECISION`
    row — including the run's own "forced to review once" write — does NOT satisfy this,
    however many times it repeats; satisfying "one-time human look" from the pipeline's
    own log write was the exact hole this split closes.

    The `source` filter is still load-bearing — a `tier4-domshape` row is a
    ≤0.5-confidence classifier annotation from a different spec and can never stand
    in for this spec's forced first look, no matter how often it repeats.
    """
    if not (client_slug and block_slug and match_type):
        return False
    for row in rows:
        if row_source(row) != SOURCE_SPEC44:
            continue
        if row_kind(row) != KIND_APPROVAL:
            continue
        if not row.get("approved"):
            continue
        if (
            row.get("client_slug") == client_slug
            and row.get("block") == block_slug
            and row.get("match_type") == match_type
        ):
            return True
    return False


def record_human_approval(
    client_slug: str,
    block_slug: str,
    match_type: str,
    approver: str,
    note: str = "",
    path: Path | str | None = None,
) -> dict:
    """The ONLY way a `KIND_APPROVAL` row is ever written. Never called by `evaluate()`
    or `recognise_classless_group()` — this is a deliberately separate action, invoked
    by a person via this module's `--approve` CLI, so its existence in the log IS the
    proof a human looked. Fails loud (raises) rather than silently accepting an
    unattributed approval — an approval with no named approver is not one.
    """
    if not (client_slug and block_slug and match_type and approver and approver.strip()):
        raise ValueError(
            "record_human_approval requires client_slug, block_slug, match_type and a "
            "non-empty approver — an approval with no named human is not an approval")
    row = {
        "ts": _now(),
        "source": SOURCE_SPEC44,
        "kind": KIND_APPROVAL,
        "client_slug": client_slug,
        "block": block_slug,
        "match_type": match_type,
        "approved": True,
        "approver": approver.strip(),
        "note": note,
    }
    p = Path(path) if path else LOG_PATH
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    return row


def read_precedent(path: Path | str | None = None) -> tuple[dict, ...]:
    """The ONE snapshot a whole run's FR-44-1(b) checks are evaluated against.

    Call once per run and thread the result; see this module's docstring for why a
    live re-read would let a run satisfy its own first-look gate.
    """
    return read_log(path)


def append_decision(decision: "ClasslessDecision", path: Path | str | None = None) -> dict:
    """Append ONE §7 row. Append-only: the file is never rewritten or truncated."""
    p = Path(path) if path else LOG_PATH
    row = decision.to_log_row()
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    return row


# ---------------------------------------------------------------- the decision

@dataclass(frozen=True)
class ClasslessDecision:
    """One classless-group decision — the unit of both §7's log and §7's review page."""

    client_slug: str
    boundary_id: str = ""
    run_id: str = ""
    stage: str = STAGE_NONE
    block: str | None = None
    match_type: str | None = None
    match_quality: str = NONE
    outcome: str = OUTCOME_NO_MATCH
    clause_a: bool = False
    clause_b: bool = False
    signal: str = ""          # the structural evidence, in the operator's words
    reasons: tuple[str, ...] = ()
    fields: tuple[str, ...] = ()   # Stage B's per-field conservation record
    block_markup: str = ""

    @property
    def auto_completed(self) -> bool:
        return self.outcome == OUTCOME_AUTO

    @property
    def needs_review(self) -> bool:
        return self.outcome == OUTCOME_REVIEW

    def to_log_row(self) -> dict:
        return {
            "ts": _now(),
            "source": SOURCE_SPEC44,
            "kind": KIND_DECISION,
            "client_slug": self.client_slug,
            "run_id": self.run_id,
            "boundary_id": self.boundary_id,
            "stage": self.stage,
            "block": self.block,
            "match_type": self.match_type,
            "match_quality": self.match_quality,
            "outcome": self.outcome,
            "clause_a": self.clause_a,
            "clause_b": self.clause_b,
            "signal": self.signal,
            "reasons": list(self.reasons),
            "fields": list(self.fields),
        }


def emit_block_markup(block_slug: str) -> str:
    """§4.4's corrected emission: the recognised composite, with nothing invented.

    A render-time repeater needs no attribute — the block renders it from live data —
    so the correct markup carries none. `sourceMode` is NOT emitted (buybox declares
    no such attribute; inventing one would be the undeclared-attribute trap).
    """
    return f"<!-- wp:{block_slug.lstrip('/')} /-->"


MIN_DISTINCT_ROLES = 2
"""Front C Task 2 — the match-diversity floor. Ship-PM's `/adversarial-council` finding
(2026-09-17): a plain three-line paragraph (heading + subheading + body, each read as
`label`) can present the identical role SEQUENCE as a real repeater whose every item
happens to share one role — the shape `('label', 'label', 'label')` is reachable both
ways, and an exact-length, exact-role match cannot tell them apart from sequence alone.
Requiring at least `MIN_DISTINCT_ROLES` distinct role KINDS in the matched window means a
single-role-repeated sequence (whatever its length) is never, on its own, "exact
structural match" evidence — it takes a second, different kind of structural marker
(an action-trigger, an image-or-fallback, a current-state indicator) alongside the labels
before FR-44-1(a) will trust the match. `sgs/buybox`'s real thumbnail-strip sequence
(`action-trigger, current-state-indicator, label`) clears this with 3 distinct kinds;
a bare 3-label sequence does not, regardless of length."""


def _clause_a(result: _stage_a.RenderMatchResult) -> tuple[bool, list[str]]:
    """FR-44-1(a): a genuine, parent-narrowed EXACT match against ONE survivor, with a
    minimum diversity of structural-role KINDS (Task 2 — see MIN_DISTINCT_ROLES).

    ⛔ Front C Task 4's `result.static_leaf` (singleton-content corroboration) is
    DELIBERATELY NEVER read here — Bean's own steer was "choose depending on
    testing", so this stays informational-only (surfaced via `_stage_a_signal()`
    for the review page) until a real measurement earns it a role in the gate.
    """
    reasons: list[str] = []
    if not result.matched:
        return False, ["(a) Stage A reached no known shape"]
    if result.ambiguous_candidates:
        reasons.append("(a) more than one surviving candidate: "
                       + ", ".join(result.ambiguous_candidates))
    if result.match_quality != EXACT:
        reasons.append(f"(a) leaf match is {result.match_quality}, not exact")
    if not result.narrowing.sole_survivor:
        reasons.append("(a) Step 0 left "
                       f"{len(result.narrowing.survivors)} candidates, not one")
    if result.leaf is not None and result.leaf.merged_shape_hypothesis:
        # Task 2's disclosed limit: where one source_file holds two repeaters, an
        # EXACT window match is still only a hypothesis about the per-item shape.
        # A hypothesis is not the "genuine exact structural match" (a) asks for.
        reasons.append("(a) matched window is a merged-shape hypothesis "
                       f"({result.leaf.source_file} holds more than one repeater)")
    if result.leaf is not None:
        distinct = set(result.leaf.candidate_roles)
        if len(distinct) < MIN_DISTINCT_ROLES:
            reasons.append(
                f"(a) matched role sequence has only {len(distinct)} distinct role "
                f"kind(s) {sorted(distinct)} among {list(result.leaf.candidate_roles)} — "
                f"needs at least {MIN_DISTINCT_ROLES} distinct kinds to trust as an "
                "exact structural match (Task 2 diversity floor)")
    return (not reasons), reasons


def evaluate(
    stage_a_result: _stage_a.RenderMatchResult | None,
    stage_b_result: _stage_b.SchemaMatchResult | None,
    client_slug: str,
    precedent: Sequence[dict],
    auto_complete_enabled: bool,
    boundary_id: str = "",
    run_id: str = "",
    signal: str = "",
) -> ClasslessDecision:
    """FR-44-1, applied to whatever Stage A and Stage B reported. Never raises.

    Order matters and is the spec's: (a) is a property of the match, (b) is a
    property of this client's history. A failure of either routes to review with
    every failing reason recorded — never one reason standing in for the rest.
    """
    reasons: list[str] = []

    if stage_a_result is not None and stage_a_result.matched:
        ok_a, why = _clause_a(stage_a_result)
        reasons.extend(why)
        block = stage_a_result.block_slug
        ok_b = pattern_precedent(precedent, client_slug, block or "",
                                 MATCH_TYPE_RENDER_REPEATER)
        if not ok_b:
            reasons.append(f"(b) first occurrence of ({block}, "
                           f"{MATCH_TYPE_RENDER_REPEATER}) for client '{client_slug}' — "
                           "forced to review once")
        if not auto_complete_enabled:
            reasons.append("--classless-auto-complete is off (§9 rollout); "
                           "identification recorded, nothing emitted")
        auto = ok_a and ok_b and auto_complete_enabled
        return ClasslessDecision(
            client_slug=client_slug,
            boundary_id=boundary_id,
            run_id=run_id,
            stage=STAGE_A,
            block=block,
            match_type=MATCH_TYPE_RENDER_REPEATER,
            match_quality=stage_a_result.match_quality,
            outcome=OUTCOME_AUTO if auto else OUTCOME_REVIEW,
            clause_a=ok_a,
            clause_b=ok_b,
            signal=signal or _stage_a_signal(stage_a_result),
            reasons=tuple(reasons + list(stage_a_result.notes)),
            block_markup=emit_block_markup(block) if auto and block else "",
        )

    if stage_b_result is not None and stage_b_result.matched:
        block = stage_b_result.block_slug
        ok_b = pattern_precedent(precedent, client_slug, block or "",
                                 MATCH_TYPE_ARRAY_SCHEMA)
        # Never auto-completed — see this module's docstring. Clause (a) is reported
        # False because Stage B performs no parent-narrowed leaf match at all; saying
        # otherwise would claim an audit trail Stage B never produced.
        reasons.append("Stage B resolves field IDENTITY only; no value-extraction "
                       "path exists for a classless-matched boundary, so emitting "
                       "this block would emit it empty — routed to review by design")
        if not ok_b:
            reasons.append(f"(b) first occurrence of ({block}, "
                           f"{MATCH_TYPE_ARRAY_SCHEMA}) for client '{client_slug}'")
        return ClasslessDecision(
            client_slug=client_slug,
            boundary_id=boundary_id,
            run_id=run_id,
            stage=STAGE_B,
            block=block,
            match_type=MATCH_TYPE_ARRAY_SCHEMA,
            match_quality=stage_b_result.match_quality,
            outcome=OUTCOME_REVIEW,
            clause_a=False,
            clause_b=ok_b,
            signal=signal or f"{block}.{stage_b_result.array_attr} via DB-fact elimination",
            reasons=tuple(reasons + list(stage_b_result.notes)),
            fields=tuple(str(f) for f in stage_b_result.fields),
        )

    notes: list[str] = []
    if stage_a_result is not None:
        notes.extend(stage_a_result.notes)
        if stage_a_result.ambiguous_candidates:
            notes.append("Stage A ambiguous across: "
                         + ", ".join(stage_a_result.ambiguous_candidates))
    if stage_b_result is not None:
        notes.extend(stage_b_result.notes)
        if stage_b_result.ambiguous_candidates:
            notes.append("Stage B ambiguous across: "
                         + ", ".join(stage_b_result.ambiguous_candidates))
    return ClasslessDecision(
        client_slug=client_slug,
        boundary_id=boundary_id,
        run_id=run_id,
        stage=STAGE_NONE,
        outcome=OUTCOME_NO_MATCH,
        signal=signal,
        reasons=tuple(notes),
    )


def _stage_a_signal(result: _stage_a.RenderMatchResult) -> str:
    leaf = result.leaf
    if leaf is None:
        return "no leaf comparison"
    base = (f"{leaf.block_slug} / {leaf.source_file}: draft roles vs "
            f"{list(leaf.candidate_roles)}"
            + (f"; draft-only {list(leaf.unmatched_draft_roles)}"
               if leaf.unmatched_draft_roles else "")
            + (f"; block-only {list(leaf.unmatched_candidate_roles)}"
               if leaf.unmatched_candidate_roles else ""))
    # Front C Task 4 — informational only (never read by _clause_a). Appended to the
    # SAME signal string rather than a separate field so a review-page reader sees it
    # right beside the repeater evidence it's corroborating, not in a column they'd
    # have to know to look for.
    sl = result.static_leaf
    if sl is not None:
        base += (f"; static-shape corroboration ({sl.source_file}): {sl.quality} on "
                 f"{list(sl.candidate_roles)}")
    return base


# ---------------------------------------------------------------- A then B

def recognise_classless_group(
    stage_a_group: _stage_a.DraftGroup,
    stage_b_group: _stage_b.DraftItemGroup,
    client_slug: str,
    precedent: Sequence[dict],
    auto_complete_enabled: bool = False,
    boundary_id: str = "",
    run_id: str = "",
    conn: Any = None,
) -> ClasslessDecision:
    """§4.4 then §5, then FR-44-1. ONE connection is shared across both stages.

    Stage B enforces §5's own precondition internally (it refuses to run when Stage A
    matched), so both are called unconditionally and the sequencing stays in one
    place rather than being re-asserted by every caller.
    """
    owns_conn = conn is None
    conn = conn or _stage_a.open_db()
    try:
        a = _stage_a.recognise_render_time_repeater(stage_a_group, client_slug, conn=conn)
        b = _stage_b.recognise_by_db_elimination(
            stage_b_group, client_slug, stage_a_result=a, conn=conn)
    finally:
        if owns_conn:
            conn.close()
    return evaluate(
        a, b, client_slug, precedent, auto_complete_enabled,
        boundary_id=boundary_id, run_id=run_id,
    )


# ---------------------------------------------------------------- §7 summary

def summary_lines(decisions: Sequence[ClasslessDecision]) -> list[str]:
    """The end-of-run stdout block. Printed AND written (`classless-summary.md`)
    because terminal scrollback is not a record a later /handoff can read."""
    auto = [d for d in decisions if d.auto_completed]
    review = [d for d in decisions if d.needs_review]
    nomatch = [d for d in decisions if d.outcome == OUTCOME_NO_MATCH]
    lines = [
        "[classless] Spec 44 classless-group recognition",
        f"[classless]   auto-completed: {len(auto)}",
        f"[classless]   review queue:   {len(review)}",
        f"[classless]   no match:       {len(nomatch)} (unchanged path — "
        "the existing dom_shape / sc_var gates still apply)",
    ]
    for d in auto:
        lines.append(f"[classless]   AUTO  {d.boundary_id} -> {d.block} "
                     f"(stage {d.stage}, {d.match_quality})")
    for d in review:
        first = d.reasons[0] if d.reasons else "no reason recorded"
        lines.append(f"[classless]   REVIEW {d.boundary_id} -> {d.block or '?'} "
                     f"(stage {d.stage}, {d.match_quality}): {first}")
    return lines


def write_classless_summary(
    run_dir: Path,
    decisions: Sequence[ClasslessDecision],
) -> Path:
    """§7's `pipeline-state/<run>/classless-summary.md`."""
    out = Path(run_dir) / "classless-summary.md"
    auto = [d for d in decisions if d.auto_completed]
    review = [d for d in decisions if d.needs_review]
    nomatch = [d for d in decisions if d.outcome == OUTCOME_NO_MATCH]

    body = [
        f"# Classless recognition — {Path(run_dir).name}",
        "",
        "Spec 44 (`.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md`), FR-44-1 + §7.",
        "",
        f"- Auto-completed: **{len(auto)}**",
        f"- Fell to review: **{len(review)}** — see `operator-review.html`",
        f"- No match: **{len(nomatch)}** (left on the existing conversion path, unchanged)",
        "",
    ]
    if auto:
        body += ["## Auto-completed", "",
                 "| Boundary | Block | Stage | Quality | Signal |",
                 "|---|---|---|---|---|"]
        body += [f"| `{d.boundary_id}` | `{d.block}` | {d.stage} | {d.match_quality} "
                 f"| {d.signal} |" for d in auto]
        body.append("")
    if review:
        body += ["## Fell to review (FR-44-1)", "",
                 "| Boundary | Candidate | Stage | Quality | Why it did not clear FR-44-1 |",
                 "|---|---|---|---|---|"]
        body += [f"| `{d.boundary_id}` | `{d.block or '—'}` | {d.stage} | {d.match_quality} "
                 f"| {'; '.join(d.reasons) or '—'} |" for d in review]
        body.append("")
    if not decisions:
        body += ["_No classless group reached the Spec 44 path on this run._", ""]
    out.write_text("\n".join(body), encoding="utf-8")
    return out


def decisions_to_json(decisions: Sequence[ClasslessDecision]) -> list[dict]:
    """The shape `simple_html_review_report.py --classless` consumes."""
    return [
        {
            "boundary_id": d.boundary_id,
            "stage": d.stage,
            "block": d.block,
            "match_type": d.match_type,
            "match_quality": d.match_quality,
            "outcome": d.outcome,
            "clause_a": d.clause_a,
            "clause_b": d.clause_b,
            "signal": d.signal,
            "reasons": list(d.reasons),
            "fields": list(d.fields),
        }
        for d in decisions
    ]


# ---------------------------------------------------------------- --approve CLI

def _cli(argv: list[str] | None = None) -> int:
    """The one human-facing surface for `record_human_approval()`. There is no
    programmatic caller anywhere in this codebase — a person runs this by hand,
    naming themselves, after actually looking at the review page for the pattern
    they are approving. That is what makes the resulting log row proof of a look."""
    import argparse

    parser = argparse.ArgumentParser(
        prog="classless_trust_gate.py",
        description="Spec 44 FR-44-1(b) — record a human's one-time approval of a "
                     "(client, block, match-type) classless-recognition pattern.")
    parser.add_argument("--approve", action="store_true", required=True,
                        help="Record the approval (the only supported action today).")
    parser.add_argument("--client", required=True, help="client_slug, e.g. eye-care-ward-end")
    parser.add_argument("--block", required=True, help="block slug, e.g. sgs/buybox")
    parser.add_argument("--match-type", required=True,
                        choices=[MATCH_TYPE_RENDER_REPEATER, MATCH_TYPE_ARRAY_SCHEMA])
    parser.add_argument("--approver", required=True,
                        help="Your name — required, and recorded verbatim in the log.")
    parser.add_argument("--note", default="", help="Optional context for the review trail.")
    args = parser.parse_args(argv)

    row = record_human_approval(
        args.client, args.block, args.match_type, args.approver, args.note)
    print(f"[classless] APPROVED {row['block']} / {row['match_type']} for client "
          f"'{row['client_slug']}' by {row['approver']} at {row['ts']}")
    print(f"[classless] written to {LOG_PATH}")
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(_cli())
