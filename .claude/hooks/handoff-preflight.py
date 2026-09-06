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

This script is the missing mechanical layer. Nine checks, machine evidence only, no prose.

2026-08-06 (doc-size gate): added checks 8 and 9, `check_decisions_size` and
`check_memory_size`. parking.md credited this script with "mechanically enforcing the size
discipline" for decisions.md and MEMORY.md. It did not: the CHECKS tuple had seven entries,
none of which read either file, and `CAP_BYTES` had exactly one consumer
(`check_ledger_size`). decisions.md had meanwhile grown to ~1.03MB / ~6,750 lines entirely
unobserved, under a gate that read green — the same shape of failure as the 38,799-byte
LEDGER above. CAP_BYTES is deliberately NOT reused for decisions.md: 24KB is a LEDGER
number for a replace-not-append doc, whereas decisions.md is an append-only log that is
legitimately large. It is gated on GROWTH SINCE A RECORDED BASELINE
(`.claude/hooks/doc-size-baseline.json`), which is change-keyed, with an absolute fallback
cap the file already exceeds so a missing baseline fails CLOSED rather than open.

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

# --- decisions.md / MEMORY.md size discipline (added 2026-08-06) -------------------
# parking.md credited this script with "mechanically enforcing the size discipline".
# It was not: CAP_BYTES had exactly ONE consumer (check_ledger_size), and no check read
# decisions.md or MEMORY.md at all. decisions.md had grown to ~1.03MB / ~6,750 lines
# entirely unobserved under a gate that read green.
#
# CAP_BYTES is deliberately NOT reused for decisions.md. 24KB is a LEDGER number — the
# LEDGER is a replace-not-append living-status doc. decisions.md is an APPEND-ONLY
# architectural log that is legitimately large and is already an order of magnitude past
# any sane absolute number, so an absolute cap alone would just block /handoff forever.
#
# So decisions.md is gated on GROWTH SINCE THE LAST RECORDED SIZE, which is change-keyed:
# a normal handoff appending a decision or two passes; an unswept accumulation trips it.
# The recorded size lives in DOC_SIZE_BASELINE. An ABSENT or unreadable baseline falls
# back to DECISIONS_ABS_CAP_BYTES — a cap the file ALREADY EXCEEDS — so the gate can
# never fail open on missing state.
DECISIONS_GROWTH_BUDGET = 65536      # 64KB of growth between sweeps/re-baselines
DECISIONS_ABS_CAP_BYTES = 262144     # 256KB fallback; decisions.md is ~4x this today
MEMORY_CAP_BYTES = 24576             # MEMORY.md's own documented cap (.claude/CLAUDE.md)
DOC_SIZE_BASELINE = _CLAUDE / "hooks" / "doc-size-baseline.json"

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
            # encoding='utf-8' is LOAD-BEARING, not tidiness. `text=True` alone decodes with the
            # Windows locale codec (cp1252), and this repo's docs are full of the characters that
            # codec cannot represent. The UnicodeDecodeError is raised inside subprocess's READER
            # THREAD, so `run()` returns returncode 0 with stdout=None and the except clause below
            # never fires — the failure is invisible to normal error handling.
            prev_text = subprocess.run(
                ["git", "show", "HEAD:.claude/STOP-CATALOGUE.md"],
                cwd=_REPO, capture_output=True, text=True,
                encoding="utf-8", errors="replace", timeout=15,
            ).stdout
        except (OSError, subprocess.SubprocessError):
            prev_text = ""
    if prev_text is None:
        # ⛔ Do NOT silently coerce to "" here. An empty previous catalogue makes every STOP entry
        # look NEW and none look DROPPED, so the D101 carry-forward check would pass trivially and
        # for ever — a gate that cannot fail. Fail loudly instead; this branch means the read broke.
        return Result(
            "stop-carry-forward",
            False,
            "could not read the previous STOP-CATALOGUE from git (stdout was None — usually a "
            "decode failure in subprocess's reader thread, which returns rc=0 and is invisible "
            "to except). Refusing to compare against an empty baseline: that would make every "
            "entry look NEW and none look DROPPED, so this check would pass trivially for ever.",
            "Re-run; if it persists, check the git show call's encoding= argument.",
        )
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


def _load_size_baseline() -> dict:
    """Recorded accepted sizes. Missing/corrupt returns {} — callers must fail CLOSED."""
    try:
        data = json.loads(DOC_SIZE_BASELINE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data.get("sizes", {}) if isinstance(data, dict) else {}


def check_decisions_size(size: int | None = None, baseline: int | None = None) -> Result:
    """8 — decisions.md may not grow past its recorded size by more than the budget.

    Growth-keyed, not absolute: decisions.md is an append-only architectural log that is
    legitimately large. An absolute cap would block every handoff until someone swept,
    which is why the FALLBACK cap only applies when no baseline has been recorded — the
    gate then fails closed rather than open.
    """
    path = _CLAUDE / "decisions.md"
    if size is None:
        if not path.exists():
            return Result("decisions-size", True, "no decisions.md")
        size = path.stat().st_size
    if baseline is None:
        baseline = _load_size_baseline().get("decisions.md")

    if not isinstance(baseline, int) or baseline < 0:
        # No recorded size: fall back to an absolute cap the file already breaches.
        if size <= DECISIONS_ABS_CAP_BYTES:
            return Result("decisions-size", True,
                          f"{size:,} bytes, no recorded baseline, under the "
                          f"{DECISIONS_ABS_CAP_BYTES:,} fallback cap")
        return Result(
            "decisions-size", False,
            f"decisions.md is {size:,} bytes and there is NO recorded baseline in "
            f"{DOC_SIZE_BASELINE.name}; the fallback absolute cap is "
            f"{DECISIONS_ABS_CAP_BYTES:,} (over by {size - DECISIONS_ABS_CAP_BYTES:,})",
            "Sweep retired/superseded/non-load-bearing entries to "
            ".claude/memory/decisions-archive.md, then record the new accepted size in "
            f"{DOC_SIZE_BASELINE.name}. An absent baseline fails CLOSED on purpose.",
        )

    ceiling = baseline + DECISIONS_GROWTH_BUDGET
    if size <= ceiling:
        note = ""
        if size > DECISIONS_ABS_CAP_BYTES:
            note = (f"; informational only — {size / DECISIONS_ABS_CAP_BYTES:.1f}x the "
                    f"{DECISIONS_ABS_CAP_BYTES:,}-byte fallback cap, which doesn't apply "
                    f"while a baseline is recorded (not a blocker; see doc-size-baseline.json)")
        return Result("decisions-size", True,
                      f"{size:,} bytes, baseline {baseline:,}, grown {size - baseline:,} "
                      f"of {DECISIONS_GROWTH_BUDGET:,} budget{note}")
    return Result(
        "decisions-size", False,
        f"decisions.md is {size:,} bytes, {size - baseline:,} more than the recorded "
        f"baseline {baseline:,} — over the {DECISIONS_GROWTH_BUDGET:,}-byte growth budget "
        f"by {size - ceiling:,}",
        "Sweep retired/superseded/non-load-bearing entries to "
        ".claude/memory/decisions-archive.md, then record the post-sweep size in "
        f"{DOC_SIZE_BASELINE.name}. Do NOT just raise the baseline to silence this — the "
        "baseline records a size that was ACCEPTED after a sweep, not merely the current one.",
    )


def _find_memory_files() -> list[Path]:
    """Locate MEMORY.md: repo-local first, then the Claude Code per-project memory dir.

    The CC memory dir is keyed by a slug of the MAIN repo path, so a worktree checkout
    resolves to the same slug — matched by suffix on the repo directory name rather than
    by reimplementing CC's slugifier, which would drift silently if that format changed.
    """
    found: list[Path] = []
    local = _CLAUDE / "MEMORY.md"
    if local.exists():
        found.append(local)

    repo = _REPO
    parts = repo.as_posix().split("/.claude/worktrees/")
    main_repo_name = Path(parts[0]).name if parts else repo.name
    projects = Path.home() / ".claude" / "projects"
    if projects.is_dir():
        for slug_dir in sorted(projects.iterdir()):
            if not slug_dir.is_dir() or not slug_dir.name.endswith(main_repo_name):
                continue
            candidate = slug_dir / "memory" / "MEMORY.md"
            if candidate.exists():
                found.append(candidate)
    return found


def check_memory_size(sizes: dict[str, int] | None = None) -> Result:
    """9 — MEMORY.md must stay under its own documented cap.

    `.claude/CLAUDE.md` states `MEMORY.md <= 24,576 bytes -> MEMORY-archive.md`. Nothing
    enforced it. An oversized MEMORY.md silently drops autoload rules — the exact failure
    the doc-balloon rule exists to prevent.
    """
    if sizes is None:
        sizes = {p.as_posix(): p.stat().st_size for p in _find_memory_files()}
    if not sizes:
        return Result("memory-size", True,
                      "no MEMORY.md found (repo .claude/ or ~/.claude/projects/*/memory/)")
    over = {name: size for name, size in sizes.items() if size > MEMORY_CAP_BYTES}
    if not over:
        biggest = max(sizes.values())
        return Result("memory-size", True,
                      f"{len(sizes)} MEMORY.md file(s), largest {biggest:,} / "
                      f"{MEMORY_CAP_BYTES:,} bytes "
                      f"({MEMORY_CAP_BYTES - biggest:,} bytes of headroom)")
    detail = "; ".join(
        f"{name} is {size:,} (over by {size - MEMORY_CAP_BYTES:,})"
        for name, size in sorted(over.items())
    )
    return Result(
        "memory-size", False,
        f"{len(over)} MEMORY.md file(s) over the {MEMORY_CAP_BYTES:,}-byte cap: {detail}",
        "Sweep the oldest one-line index entries to MEMORY-archive.md, keeping the index "
        "itself. An oversized MEMORY.md silently drops autoload rules.",
    )


def check_decisions_no_duplicate_ids(text: str | None = None) -> Result:
    """10 — two entries must never share a D-number.

    WHY THIS EXISTS: `decisions.md` is an append-only file written by CONCURRENT tracks with
    no locking, and that produces two opposite failures, neither visible on a read-through.
    D581 note 8 records the first: "decisions.md has no write coordination between concurrent
    tracks - a 5-entry version of this writeup was lost whole." On 2026-08-21 the same
    mechanism produced the mirror image - `## D636` appeared TWICE, byte-identical, and sat
    there for five days until an unrelated QC pass tripped over it. A lost entry looks like
    nothing happened; a doubled one looks like a formatting slip. Both are silent.

    ANCHORED on the heading (`^## D<n>`) deliberately. The unanchored `D[0-9]+` reported
    D5557 on 2026-08-01 - that was the hex colour `#0D5557` on line 412, while the true
    ceiling was D453. A gate that reads a wrong number confidently is worse than no gate.
    """
    path = _CLAUDE / "decisions.md"
    if text is None:
        if not path.exists():
            return Result("decisions-no-duplicate-ids", True, "no decisions.md")
        text = _read(path)

    seen: dict[str, int] = {}
    for m in re.finditer(r"^## (D\d+)\b", text, re.M):
        seen[m.group(1)] = seen.get(m.group(1), 0) + 1
    dupes = sorted((d for d, n in seen.items() if n > 1), key=lambda d: int(d[1:]))
    if not dupes:
        return Result(
            "decisions-no-duplicate-ids", True,
            f"{len(seen)} D-entries, all unique",
        )
    detail = ", ".join(f"{d} x{seen[d]}" for d in dupes[:8])
    return Result(
        "decisions-no-duplicate-ids", False,
        f"{len(dupes)} duplicated D-number(s): {detail}",
        "DIFF THE FULL BODIES BEFORE REMOVING EITHER - the fix depends on which case it is. "
        "Byte-identical bodies = a concurrent-write duplication; delete the second copy. "
        "DIFFERENT bodies = two real decisions that collided on one number; renumber the "
        "later one to the current ceiling+1 and leave both. Deleting a colliding entry "
        "destroys a decision.",
    )


CHECKS = (
    check_ledger_size,
    check_stop_carry_forward,
    check_parking_status,
    check_parking_no_closed,
    check_no_tombstones,
    check_no_dangling_links,
    check_citations_resolve,
    check_decisions_size,
    check_memory_size,
    check_decisions_no_duplicate_ids,
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
        ("decisions-no-duplicate-ids",
         lambda: check_decisions_no_duplicate_ids(
             "## D1 - a\nbody\n\n## D1 - a\nbody\n"),
         lambda: check_decisions_no_duplicate_ids(
             "## D1 - a\nbody\n\n## D2 - b\nbody\n")),
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
        ("decisions-size",
         # bad: grown past the recorded baseline by more than the budget.
         lambda: check_decisions_size(
             size=1_000_000 + DECISIONS_GROWTH_BUDGET + 1, baseline=1_000_000),
         # good: grown, but within budget — the normal append-a-decision handoff.
         lambda: check_decisions_size(size=1_000_000 + 1, baseline=1_000_000)),
        ("decisions-size-no-baseline",
         # baseline=-1 is the explicit "no recorded baseline" sentinel: passing None
         # here would silently read the REAL baseline file and test nothing.
         # bad: no recorded baseline AND over the fallback cap -> must fail CLOSED.
         lambda: check_decisions_size(size=DECISIONS_ABS_CAP_BYTES + 1, baseline=-1),
         # good: no recorded baseline but comfortably under the fallback cap.
         lambda: check_decisions_size(size=1024, baseline=-1)),
        ("memory-size",
         lambda: check_memory_size({"synthetic/MEMORY.md": MEMORY_CAP_BYTES + 1}),
         lambda: check_memory_size({"synthetic/MEMORY.md": MEMORY_CAP_BYTES - 1})),
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
                    "resolution, decisions.md growth, MEMORY.md size).")
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
