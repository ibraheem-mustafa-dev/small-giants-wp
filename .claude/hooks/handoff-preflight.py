#!/usr/bin/env python
"""handoff-preflight.py — mechanical enforcement of the doc-hygiene rules /handoff CLAIMS.

Why this exists (2026-07-28 docs audit):
Five rules were documented as "enforced every /handoff" and enforced NOWHERE. They were
prose the model was asked to obey, and — as `autopilot/SKILL.md` puts it — "a prose rule
the agent can skip is not a gate". The evidence they were being skipped:
  * LEDGER.md reached 38,799 bytes against a 24,576 cap that only existed as a sentence;
  * a 2026-05-09 `CONVERSATION-HANDOFF.md` sat at a live path being copied to OpenClaw
    every session while the "no tombstones at live paths" rule read as satisfied;
  * `.claude/CLAUDE.md` asserted "Enforce every /handoff" for the parking archive-on-resolve
    rule against a command containing no such gate;
  * parking.md carried TWO `Status:` syntaxes, so any regex written against one silently
    passed the other ~68% of entries;
  * the D101 STOP carry-forward count-check — the defence that stops captured failure
    patterns evaporating — was asserted in four docs and machine-checked in zero.

This script is the missing mechanical layer. Seven checks, machine evidence only, no prose.

2026-07-31 (a56d… STOP-CATALOGUE recovery): added check 7, `check_citations_resolve` — the
citation guard that was the actual gap behind the phantom-STOP incident. `check_no_dangling_links`
only ever matched markdown `[text](path.md)` links; a bare-text citation like `STOP-29` or
`P-SOME-SLUG` in prose was invisible to every check. That is exactly how ~27+ numeric STOP
citations went phantom — cited everywhere, defined nowhere, with a passing gate throughout. Also
fixed `check_stop_carry_forward` (STOP-2 in this file's own terms): it compared SET SIZES, not
set membership, so deleting N entries and adding N different ones in the same commit read GREEN.
It now compares identifier sets against a baseline that is the union of the previous commit AND a
committed floor file (`.claude/stop-floor.json`), so a rename/squash can't reset the floor to zero.
Unresolved phantom numbers Step 1's 30-minute recovery timebox could not reach are recorded,
dated, with a reason, in `.claude/stop-citation-allowlist.json` — never silently skipped.

USAGE
  python .claude/hooks/handoff-preflight.py            # report, exit 0 always
  python .claude/hooks/handoff-preflight.py --check    # gate mode: exit 1 on any violation
  python .claude/hooks/handoff-preflight.py --self-test # prove each check can FAIL *and* PASS

DESIGN NOTES
  * REPORT-only by default so it can be run any time without wedging anything; `--check`
    is the gating form /handoff calls.
  * It NEVER edits a file. Detection and remediation only — the same rule ledger-rotate.py
    follows, and for the same reason (a hook that rewrites a doc the agent just wrote
    fights the agent).
  * Each failure names the file, the measured value and the fix. A gate that fails
    illegibly gets switched off.
  * `--self-test` exists because a check that cannot fail is worse than no check
    (STOP-NEGATIVE-CONTROL-OR-THE-TEST-IS-VACUOUS). It is a TWO-SIDED control: for every
    check it injects a synthetic violation and asserts rejection, AND feeds clean input and
    asserts acceptance — a check hardcoded to always return ok=False would pass a
    negative-only self-test forever while failing every real clean tree.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parents[2]
_CLAUDE = _REPO / ".claude"

# The byte cap used repo-wide for LEDGER.md / MEMORY.md (see .claude/CLAUDE.md).
# Mirrors ledger-rotate.py's _THRESHOLD_BYTES deliberately: the Stop hook snapshots at
# this size, this gate refuses to close a handoff above it.
CAP_BYTES = 24576

# parking.md's four permitted Status values (Bean-locked 2026-06-02, D150).
LEGAL_STATUS = ("OPEN", "PARTIAL", "BLOCKED", "DEFERRED")
# Values that mean the entry is finished and belongs in memory/parking-archive.md.
TERMINAL_STATUS = ("CLOSED", "RESOLVED", "DROPPED", "SUPERSEDED", "DONE", "COMPLETE")

# BOTH Status syntaxes found live in parking.md: `**Status:** OPEN` and `**Status: OPEN**`.
# A regex covering only the first form sees 32% of entries. This one covers both.
STATUS_RE = re.compile(
    r"\*\*Status:\s*(?:\*\*)?\s*([A-Z-]+)",
)
# Entry headings, both regimes: `### P-SLUG` and `**P-SLUG**` / `> **P-SLUG**`.
ENTRY_RE = re.compile(r"^\s*>?\s*(?:###\s+(P-[A-Z0-9-]+)|\*\*(P-[A-Z0-9-]+)\*\*)", re.M)

# Paths that must NOT exist: each was collapsed into LEDGER.md or archived. A file here is
# a tombstone at a live path — the failure mode where a stale doc reads as current.
TOMBSTONE_PATHS = (
    ".claude/state.md",
    ".claude/handoff.md",
    ".claude/next-session-prompt.md",
    ".claude/plan.md",
    "CONVERSATION-HANDOFF.md",
    "NEXT-SESSION-PROMPT.md",
)
TOMBSTONE_GLOBS = (".claude/next-session-prompt-*.md",)

# Docs whose outbound .md links must resolve. These are the session-start reads: a dangling
# link here is a broken read for every future session.
LINK_SOURCES = (
    ".claude/CLAUDE.md",
    ".claude/specs/README.md",
    ".claude/LEDGER.md",
)
LINK_RE = re.compile(r"\]\(([^)\s#]+\.md)(?:#[^)]*)?\)")

# The STOP-CATALOGUE's OWN documented count command, so this gate's number always matches
# the receipts written into that file's section D. re.M is load-bearing: without it `^`
# anchors to the start of the STRING, the count silently reads 0 on any real file, and the
# check then passes everything. The --self-test caught exactly that on first run.
STOP_RE = re.compile(r"^\s*-\s+\*\*(STOP-[A-Z0-9]+(?:-[A-Z0-9]+)*)", re.M)

# Committed floor of the max-ever STOP-id set (check 2's ratchet) and the dated allowlist of
# phantom STOP-N numbers Step 1's recovery could not resolve (check 7). Both are read-only
# inputs the script never writes — see module docstring "NEVER edits a file".
STOP_FLOOR_PATH = _CLAUDE / "stop-floor.json"
STOP_ALLOWLIST_PATH = _CLAUDE / "stop-citation-allowlist.json"

# check 7 — bare-text citation extraction. Deliberately separate from STOP_RE: STOP_RE finds
# *definitions* (must be at the start of a `- **STOP-X**` bullet); this finds *citations*
# anywhere in running prose, including inline parentheticals like "(STOP-4/21/44)".
#
# Scoped to NUMERIC STOP citations only (`STOP-` followed by a digit): the task this guard was
# built for is the phantom NUMERIC-STOP incident specifically ("STOP-N numerics"). A first
# version matched ANY `STOP-[A-Z0-9]+` and immediately produced ~459 false/out-of-scope hits on
# the real tree: it matched the filename reference "STOP-CATALOGUE.md" as a citation of an
# entry literally named "STOP-CATALOGUE", matched the literal placeholder token "STOP-N" used
# in this file's own prose to mean "a STOP number" generically, and — correctly, but far outside
# this session's scope/timebox — surfaced a SEPARATE, much larger backlog of undefined bare-text
# NAMED-slug citations (e.g. "STOP-A-GREP-PATTERN-THAT-CANNOT-MATCH") that predates this build
# and was never part of the numeric-STOP recovery task. Requiring the first citation segment to
# be digits sidesteps all three: catalogue filenames and the "STOP-N" placeholder never match,
# and named-slug citations (which never start with a digit) are left to a future, separately
# scoped guard rather than silently swept into this one's blast radius.
_STOP_CITATION_RE = re.compile(r"STOP-(\d+(?:-[A-Z0-9]+)*)")
_PARKING_CITATION_RE = re.compile(r"\bP-[A-Z0-9][A-Z0-9-]*\b")


class Result:
    """One check's verdict. `ok` False means a real violation, not a warning."""

    def __init__(self, name: str, ok: bool, detail: str, fix: str = ""):
        self.name = name
        self.ok = ok
        self.detail = detail
        self.fix = fix


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _count_stops(text: str) -> int:
    return len({m.group(1) for m in STOP_RE.finditer(text)})


def _defined_stop_ids(text: str) -> set[str]:
    """The set of STOP identifiers actually DEFINED in a catalogue text (not cited)."""
    return {m.group(1) for m in STOP_RE.finditer(text)}


def _load_stop_floor() -> set[str]:
    if not STOP_FLOOR_PATH.exists():
        return set()
    try:
        data = json.loads(_read(STOP_FLOOR_PATH))
    except (OSError, ValueError):
        return set()
    return set(data.get("ids", []))


def _load_full_allowlist() -> dict[str, dict]:
    """Both allowlist sections: `stop` (phantom numeric STOPs) and `parking` (documented
    self-referential P-slug examples, e.g. the ones STOP-A-A-CITED-SLUG-MAY-NOT-EXIST cites
    AS EVIDENCE of the incident it describes — those are deliberately never real entries)."""
    if not STOP_ALLOWLIST_PATH.exists():
        return {}
    try:
        data = json.loads(_read(STOP_ALLOWLIST_PATH))
    except (OSError, ValueError):
        return {}
    return {"stop": data.get("stop", {}), "parking": data.get("parking", {})}


def _strip_fenced_blocks(text: str) -> str:
    """Blank out ``` fenced blocks, preserving offsets.

    parking.md documents its own entry format in a fenced markdown example whose body
    contains a literal `### P-SLUG` heading with a valid Status line. Without this, the
    template is counted as a real entry — a phantom that inflates the count and would let a
    malformed example pass as conforming data. Offsets are preserved (content replaced with
    spaces, newlines kept) so every caller's slicing stays valid.
    """
    out, in_fence = [], False
    for line in text.splitlines(keepends=True):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
            out.append(" " * (len(line) - 1) + "\n" if line.endswith("\n") else " " * len(line))
            continue
        if in_fence:
            out.append(" " * (len(line) - 1) + "\n" if line.endswith("\n") else " " * len(line))
        else:
            out.append(line)
    return "".join(out)


def _parking_entries(text: str) -> list[tuple[str, int, int]]:
    """Return [(slug, start_offset, end_offset)] for every parking entry."""
    scan = _strip_fenced_blocks(text)
    matches = [(m.group(1) or m.group(2), m.start()) for m in ENTRY_RE.finditer(scan)]
    out = []
    for i, (slug, start) in enumerate(matches):
        end = matches[i + 1][1] if i + 1 < len(matches) else len(text)
        out.append((slug, start, end))
    return out


# --------------------------------------------------------------------------- checks


def check_ledger_size(ledger_text: str | None = None) -> Result:
    """1 — LEDGER.md must stay under the byte cap its own header declares."""
    path = _CLAUDE / "LEDGER.md"
    if ledger_text is None:
        if not path.exists():
            return Result("ledger-size", True, "no LEDGER.md (not a LEDGER-mode project)")
        size = path.stat().st_size
    else:
        size = len(ledger_text.encode("utf-8"))
    if size <= CAP_BYTES:
        return Result("ledger-size", True, f"{size:,} / {CAP_BYTES:,} bytes")
    return Result(
        "ledger-size",
        False,
        f"LEDGER.md is {size:,} bytes, cap is {CAP_BYTES:,} (over by {size - CAP_BYTES:,})",
        "Sweep closed narrative to .claude/memory/session-YYYY-MM-DD*.md and REPLACE the "
        "living-status section. Keep current fronts + standing constraints + pointers.",
    )


def check_stop_carry_forward(
    now_text: str | None = None,
    prev_text: str | None = None,
    floor_ids: set[str] | None = None,
) -> Result:
    """2 — D101: the STOP catalogue may only grow. A drop needs a recorded justification.

    FIXED 2026-07-31: the original built `{m.group(1) for m in STOP_RE.finditer(text)}` and
    then immediately threw the set away, keeping only `len(...)`. That is a CARDINALITY check
    wearing a carry-forward check's clothes: delete 27 named entries and add 27 DIFFERENT ones
    in the same commit and `now >= prev` reads True — count unchanged, every one of the 27
    original defences gone, gate green throughout. This is the exact mechanism that let the
    STOP-CATALOGUE 2026-07-17 collapse drop ~27+ numeric STOPs without ever tripping D101.

    Now compares IDENTIFIER SETS: fails when `baseline_ids - now_ids` is non-empty and prints
    exactly which tokens went missing. The baseline is also no longer just `git show HEAD:` —
    that alone gives no durable floor across a rename or squash (HEAD could itself already be
    post-collapse). Baseline = `prev_ids | floor_ids`, where `floor_ids` comes from the
    committed `.claude/stop-floor.json` (the max-ever-seen identifier set). This script never
    writes that file (see module docstring); bumping it to the current superset is a manual
    step at the point a STOP is deliberately and legitimately added.
    """
    path = _CLAUDE / "STOP-CATALOGUE.md"
    if now_text is None:
        if not path.exists():
            return Result("stop-carry-forward", True, "no STOP-CATALOGUE.md")
        now_text = _read(path)
    now_ids = _defined_stop_ids(now_text)

    if prev_text is None:
        try:
            prev_text = subprocess.run(
                ["git", "show", "HEAD:.claude/STOP-CATALOGUE.md"],
                cwd=_REPO, capture_output=True, text=True, timeout=15,
            ).stdout
        except (OSError, subprocess.SubprocessError):
            prev_text = ""
    prev_ids = _defined_stop_ids(prev_text) if prev_text.strip() else set()

    if floor_ids is None:
        floor_ids = _load_stop_floor()

    baseline_ids = prev_ids | floor_ids
    if not baseline_ids:
        return Result("stop-carry-forward", True,
                       f"{len(now_ids)} STOPs (no committed baseline — git HEAD empty and no stop-floor.json)")

    missing = baseline_ids - now_ids
    if not missing:
        beyond_floor = now_ids - floor_ids
        note = (f"; {len(beyond_floor)} beyond the committed floor — bump stop-floor.json to lock them in"
                 if floor_ids and beyond_floor else "")
        return Result("stop-carry-forward", True,
                       f"{len(now_ids)} STOPs, baseline of {len(baseline_ids)} fully carried forward{note}")
    return Result(
        "stop-carry-forward",
        False,
        f"{len(missing)} defence(s) DROPPED vs baseline: {', '.join(sorted(missing)[:8])}",
        "D101: carry every STOP forward verbatim. Restore the dropped entries, or record an "
        "inline justification in the catalogue's count-check receipt (section D) and re-run.",
    )


def check_parking_status(text: str | None = None) -> Result:
    """3 — every parking entry carries a Status, and it is one of the four legal values."""
    path = _CLAUDE / "parking.md"
    if text is None:
        if not path.exists():
            return Result("parking-status", True, "no parking.md")
        text = _read(path)
    missing, illegal = [], []
    entries = _parking_entries(text)
    for slug, start, end in entries:
        m = STATUS_RE.search(text[start:end])
        if not m:
            missing.append(slug)
        elif m.group(1) not in LEGAL_STATUS and m.group(1) not in TERMINAL_STATUS:
            illegal.append(f"{slug}={m.group(1)}")
    if not missing and not illegal:
        return Result("parking-status", True, f"{len(entries)} entries, all carry a legal Status")
    parts = []
    if missing:
        parts.append(f"{len(missing)} with NO Status: {', '.join(missing[:8])}")
    if illegal:
        parts.append(f"{len(illegal)} with an unrecognised Status: {', '.join(illegal[:8])}")
    return Result(
        "parking-status", False, "; ".join(parts),
        "Every entry needs `**Status:** OPEN|PARTIAL|BLOCKED|DEFERRED` within its body.",
    )


def check_parking_no_closed(text: str | None = None) -> Result:
    """4 — a finished entry belongs in the archive, not in parking.md (D150)."""
    path = _CLAUDE / "parking.md"
    if text is None:
        if not path.exists():
            return Result("parking-no-closed", True, "no parking.md")
        text = _read(path)
    closed = []
    for slug, start, end in _parking_entries(text):
        m = STATUS_RE.search(text[start:end])
        if m and m.group(1) in TERMINAL_STATUS:
            closed.append(f"{slug}={m.group(1)}")
    if not closed:
        return Result("parking-no-closed", True, "zero finished entries left in parking.md")
    return Result(
        "parking-no-closed", False,
        f"{len(closed)} finished entr(y/ies) still in parking.md: {', '.join(closed[:8])}",
        "Move each VERBATIM to .claude/memory/parking-archive.md under a dated pass heading, "
        "with the completion date and why it closed.",
    )


def check_no_tombstones(extra: list[str] | None = None) -> Result:
    """5 — no retired doc may sit at a live path pretending to be current."""
    found = list(extra or [])
    for rel in TOMBSTONE_PATHS:
        if (_REPO / rel).exists():
            found.append(rel)
    for pattern in TOMBSTONE_GLOBS:
        parent = _REPO / Path(pattern).parent
        if parent.is_dir():
            found += [
                str(p.relative_to(_REPO)).replace("\\", "/")
                for p in parent.glob(Path(pattern).name)
            ]
    if not found:
        return Result("no-tombstones", True, "no retired doc at a live path")
    return Result(
        "no-tombstones", False,
        f"{len(found)} tombstone(s) at live path(s): {', '.join(sorted(set(found)))}",
        "These were collapsed into LEDGER.md or archived. Move each to "
        ".claude/memory/archived-YYYY-MM-DD-<name>.md with a dated header, or delete it.",
    )


def check_no_dangling_links(overrides: dict[str, str] | None = None) -> Result:
    """6 — every .md link out of a session-start doc must resolve."""
    dangling = []
    checked = 0
    for rel in LINK_SOURCES:
        src = _REPO / rel
        if overrides and rel in overrides:
            text = overrides[rel]
        elif src.exists():
            text = _read(src)
        else:
            continue
        for m in LINK_RE.finditer(text):
            target = m.group(1)
            checked += 1
            if target.startswith(("http://", "https://")):
                continue
            candidates = [src.parent / target, _REPO / target, _CLAUDE / target]
            if not any(c.exists() for c in candidates):
                dangling.append(f"{rel} -> {target}")
    if not dangling:
        return Result("no-dangling-links", True, f"{checked} links checked, all resolve")
    return Result(
        "no-dangling-links", False,
        f"{len(dangling)} dangling link(s): {'; '.join(dangling[:8])}",
        "Repoint at the doc that now owns that content, or at its archived path.",
    )


def _extract_stop_citations(text: str) -> list[str]:
    """Every bare-text STOP-N / STOP-SLUG citation in `text`, including slash-list shorthand.

    Two shapes seen live in this repo: `(STOP-16)` / `(STOP-A-SOME-SLUG)` single citations,
    and `(STOP-4/21/44)` shorthand lists where only the first token carries the `STOP-` prefix.
    The second form is expanded to `STOP-4`, `STOP-21`, `STOP-44` — each checked independently.
    """
    tokens = []
    for m in _STOP_CITATION_RE.finditer(text):
        ident = m.group(1)
        tokens.append(f"STOP-{ident}")
        if ident.isdigit():
            pos = m.end()
            while True:
                m2 = re.match(r"/(\d+)\b", text[pos:])
                if not m2:
                    break
                tokens.append(f"STOP-{m2.group(1)}")
                pos += m2.end()
    return tokens


def _extract_parking_citations(text: str) -> list[str]:
    return [m.group(0) for m in _PARKING_CITATION_RE.finditer(_strip_fenced_blocks(text))]


def _parking_aliases(text: str) -> set[str]:
    """P-slugs that are legitimate ALTERNATE names for an entry ENTRY_RE only half-captures.

    Two real shapes in parking.md: a compound heading `### SLUG-A / SLUG-B — title` (ENTRY_RE
    captures only SLUG-A as the entry's primary id) and a body line `**Also known as:** SLUG-C,
    SLUG-D`. Both name the SAME entry under a second citable slug. Without this, a citation of
    the file's OWN documented alias reads as dangling — found live: `P-DRAFT-CSSVAR-SEED-READD`,
    `P-PAGE8-QC-BATCH-9`, `P-CANARY-SHARED-DEPLOY-RACE` and 3 more were all real aliases, not
    phantoms, on the first `--check` run against the real tree.
    """
    aliases: set[str] = set()
    for line in _strip_fenced_blocks(text).splitlines():
        stripped = line.lstrip()
        if stripped.startswith(("#", ">")) or "Also known as" in line:
            aliases.update(m.group(0) for m in _PARKING_CITATION_RE.finditer(line))
    return aliases


#  citation source scope for check 7. Mirrors LINK_SOURCES (check 6)'s "session-start reads"
#  scoping deliberately, PLUS the two docs that are this guard's own resolution targets — not a
#  blanket .claude/**/*.md walk. A first version scanned every living .md/.py under .claude/ and
#  surfaced ~379 unresolved P-slug citations sitting in `decisions.md` alone: that file is a
#  D-numbered ARCHITECTURAL LOG (per `.claude/CLAUDE.md`'s own table), an append-only historical
#  narrative that legitimately references now-archived/renamed parking items in retrospective
#  prose — the same reason `check_no_dangling_links` never scanned it either. Scanning it as if
#  it were a live citation index conflates "the log once said X" with "X is a currently open
#  citation that must resolve", which is a different, much larger, pre-existing backlog outside
#  this session's scope. `specs/*.md` were excluded for the same reason: they cite retired STOPs
#  in "why we built this" prose (e.g. Spec 31's own historical STOP-28 note). If a specific spec
#  or the decisions log needs live citation hygiene later, extend this tuple deliberately with
#  its own scoping rationale — do not silently widen it back to a blanket walk.
CITATION_SOURCES = LINK_SOURCES + (
    ".claude/STOP-CATALOGUE.md",
    ".claude/parking.md",
)


def _citation_source_files() -> list[tuple[str, Path]]:
    return [(rel, _CLAUDE.parent / rel) for rel in CITATION_SOURCES]


def check_citations_resolve(
    stop_catalogue_text: str | None = None,
    parking_text: str | None = None,
    parking_archive_text: str | None = None,
    source_overrides: dict[str, str] | None = None,
    allowlist: dict[str, dict] | None = None,
) -> Result:
    """7 — every bare-text STOP-N / STOP-SLUG and P-SLUG citation resolves to a real entry.

    Built 2026-07-31 as the actual gap behind the phantom-STOP incident: check 6
    (`check_no_dangling_links`) only ever matched markdown `[text](path.md)` link syntax. A
    bare-text citation like "STOP-29" or "P-SOME-SLUG" sitting in prose — which is how every
    STOP citation in this codebase is actually written — was invisible to every check. ~27+
    numeric STOP citations went phantom under exactly that blind spot.

    Resolution rule is EXACT-TOKEN ONLY, never substring/startswith. `STOP-67` and
    `STOP-67-GATE-ANOMALY` are two DIFFERENT catalogue entries that both legitimately exist; a
    prefix-matching resolver would silently bind a `STOP-67` citation to the wrong entry (or
    vice versa) and hide a real citation-site defect. A bare `STOP-N` citation is judged
    resolved ONLY if `STOP-N` itself is a defined entry — if the author meant the longer
    suffixed slug, that is a citation-site defect to fix (cite the full slug), not something
    this gate auto-expands.

    Unresolved STOP-N numbers that survive from the 2026-07-31 recovery timebox are recorded,
    dated, with a reason, in `.claude/stop-citation-allowlist.json` under `"stop"` — checked
    exact-token, same as the catalogue. A parallel `"parking"` section covers the small, genuine
    exception for P-slugs: STOP-A-A-CITED-SLUG-MAY-NOT-EXIST cites 4 P-slugs AS EVIDENCE of the
    phantom-citation incident it documents — those are deliberately never real parking.md
    entries. Every OTHER P-slug citation is expected to resolve against parking.md (open) or
    memory/parking-archive.md (closed/archived), or its documented alias (`### SLUG-A / SLUG-B`
    compound headings, `**Also known as:**` lines — see `_parking_aliases`), with no exceptions.
    """
    cat_path = _CLAUDE / "STOP-CATALOGUE.md"
    park_path = _CLAUDE / "parking.md"
    archive_path = _CLAUDE / "memory" / "parking-archive.md"

    cat_text = stop_catalogue_text if stop_catalogue_text is not None else (
        _read(cat_path) if cat_path.exists() else "")
    park_text = parking_text if parking_text is not None else (
        _read(park_path) if park_path.exists() else "")
    archive_text = parking_archive_text if parking_archive_text is not None else (
        _read(archive_path) if archive_path.exists() else "")

    defined_stops = _defined_stop_ids(cat_text)
    defined_parking = (
        {slug for slug, _, _ in _parking_entries(park_text)}
        | {slug for slug, _, _ in _parking_entries(archive_text)}
        | _parking_aliases(park_text)
        | _parking_aliases(archive_text)
    )
    allow_data = allowlist if allowlist is not None else _load_full_allowlist()
    allow_stop = allow_data.get("stop", {})
    allow_parking = allow_data.get("parking", {})

    if source_overrides is not None:
        sources: list[tuple[str, str]] = list(source_overrides.items())
    else:
        sources = [(rel, _read(p)) for rel, p in _citation_source_files() if p.exists()]

    dangling = []
    checked = 0
    for rel, text in sources:
        for token in _extract_stop_citations(text):
            checked += 1
            if token in defined_stops or token in allow_stop:
                continue
            dangling.append(f"{rel}: {token}")
        for token in _extract_parking_citations(text):
            checked += 1
            if token in defined_parking or token in allow_parking:
                continue
            dangling.append(f"{rel}: {token}")

    if not dangling:
        return Result(
            "citations-resolve", True,
            f"{checked} STOP-N/P-slug citations checked, all resolve "
            f"({len(allow_stop)} allowlisted STOP phantom(s), {len(allow_parking)} allowlisted "
            f"P-slug example(s))",
        )
    return Result(
        "citations-resolve", False,
        f"{len(dangling)} unresolved citation(s): {'; '.join(dangling[:8])}"
        + (f" (+{len(dangling) - 8} more)" if len(dangling) > 8 else ""),
        "Add the missing STOP-CATALOGUE.md/parking.md entry, fix the citation to the exact "
        "defined token, or add a dated reason to stop-citation-allowlist.json.",
    )


CHECKS = (
    check_ledger_size,
    check_stop_carry_forward,
    check_parking_status,
    check_parking_no_closed,
    check_no_tombstones,
    check_no_dangling_links,
    check_citations_resolve,
)


# ------------------------------------------------------------------------ self-test


def self_test() -> int:
    """Two-sided control: prove each check REJECTS a violation AND ACCEPTS clean input.

    A gate that cannot fail is indistinguishable from no gate at all, and reads as a PASS
    forever (STOP-A-GATE-THAT-CANNOT-FAIL-READS-GREEN-FOREVER). But a negative-control-only
    self-test has its own vacuity mode: a check hardcoded to `return Result(ok=False, ...)`
    would pass every one of the original 6 negative-only cases and then fail `--check` on
    every clean tree forever. Each case below is now a (bad_fn, good_fn) pair; both directions
    must hold for the check to be considered proven.
    """
    cases = [
        ("ledger-size",
         lambda: check_ledger_size("x" * (CAP_BYTES + 1)),
         lambda: check_ledger_size("short file\n")),
        ("stop-carry-forward",
         lambda: check_stop_carry_forward(
             now_text="- **STOP-ONLY-ONE** — x\n",
             prev_text="- **STOP-A** — x\n- **STOP-B** — y\n",
             floor_ids=set()),
         lambda: check_stop_carry_forward(
             now_text="- **STOP-A** — x\n- **STOP-B** — y\n- **STOP-C** — z\n",
             prev_text="- **STOP-A** — x\n- **STOP-B** — y\n",
             floor_ids=set())),
        ("parking-status",
         lambda: check_parking_status("### P-NO-STATUS — t\nbody\n"),
         lambda: check_parking_status("### P-GOOD — t\n**Status:** OPEN\nbody\n")),
        ("parking-no-closed",
         lambda: check_parking_no_closed("### P-DONE — t\n**Status:** RESOLVED\n"),
         lambda: check_parking_no_closed("### P-OPEN — t\n**Status:** OPEN\n")),
        ("no-tombstones",
         lambda: check_no_tombstones(extra=["SYNTHETIC-TOMBSTONE.md"]),
         lambda: check_no_tombstones(extra=[])),
        ("no-dangling-links",
         lambda: check_no_dangling_links(
             overrides={".claude/CLAUDE.md": "[x](does-not-exist-xyz.md)"}),
         lambda: check_no_dangling_links(
             overrides={".claude/CLAUDE.md": "no links here\n"})),
        ("citations-resolve",
         lambda: check_citations_resolve(
             stop_catalogue_text="- **STOP-16** — x\n", parking_text="", parking_archive_text="",
             source_overrides={"fake.md": "See STOP-99 for details.\n"}, allowlist={}),
         lambda: check_citations_resolve(
             stop_catalogue_text="- **STOP-16** — x\n",
             parking_text="### P-GOOD\n**Status:** OPEN\n", parking_archive_text="",
             source_overrides={"fake.md": "See STOP-16 and P-GOOD.\n"}, allowlist={})),
    ]
    failures = 0
    print("Two-sided control — each check must REJECT a violation AND ACCEPT clean input:\n")
    for name, bad_fn, good_fn in cases:
        bad, good = bad_fn(), good_fn()
        bad_ok, good_ok = (not bad.ok), good.ok
        v_bad = "PASS (correctly rejected)" if bad_ok else "BROKEN (accepted bad input) "
        v_good = "PASS (correctly accepted)" if good_ok else "BROKEN (rejected clean input)"
        print(f"  [{v_bad:28}] {name} (bad):  {bad.detail}")
        print(f"  [{v_good:28}] {name} (good): {good.detail}")
        if not (bad_ok and good_ok):
            failures += 1
    print()
    if failures:
        print(f"SELF-TEST FAILED - {failures} of {len(cases)} check(s) failed a control direction.")
        return 1
    print(f"SELF-TEST PASSED - all {len(cases)} checks reject their violation AND accept clean "
          f"input. The gate is not vacuous in either direction.")
    return 0


# ----------------------------------------------------------------------------- main


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Mechanical doc-hygiene gate for /handoff (LEDGER size, D101 STOP "
                    "carry-forward, parking Status conformance, archive-on-resolve, "
                    "tombstones at live paths, dangling links, STOP-N/P-slug citation "
                    "resolution).")
    ap.add_argument("--check", action="store_true",
                    help="gate mode: exit 1 if any check fails")
    ap.add_argument("--self-test", action="store_true",
                    help="prove each check can fail (negative control)")
    args = ap.parse_args()

    if args.self_test:
        return self_test()

    results = [c() for c in CHECKS]
    failed = [r for r in results if not r.ok]

    print("=" * 70)
    print("  handoff-preflight - doc-hygiene gate")
    print("=" * 70)
    for r in results:
        print(f"  [{'PASS' if r.ok else 'FAIL'}] {r.name}: {r.detail}")
        if not r.ok and r.fix:
            for line in r.fix.split(". "):
                if line.strip():
                    print(f"         fix: {line.strip().rstrip('.')}.")
    print("-" * 70)
    if failed:
        print(f"  {len(failed)} of {len(results)} checks FAILED.")
        if args.check:
            print("  Gate mode: handoff BLOCKED until these are fixed.")
            return 1
        print("  Report mode: not blocking. Re-run with --check to gate.")
        return 0
    print(f"  All {len(results)} checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
