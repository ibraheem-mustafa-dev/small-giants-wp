#!/usr/bin/env python3
"""
Spec 35 — REGENERATION GUARD for Bean-ruled reclassified setting keys.

THE PROBLEM (parking P-SPEC35-UPSTREAM-REGISTRY-DRIFT).
`setting-registry.json` is the hand-curated golden master. Some of its rows carry
an explicit Bean ruling that RECLASSIFIED a setting key away from what the
automated Phase-1 pass concluded — e.g. `css:stroke` is a decoration toggle, not
a colour; `css:percentage` was absorbed into the max-width capability.

Those rulings live ONLY in the golden master. The upstream Phase-1 artefacts
(`setting-types.json`, `setting-registry-css.json`) still carry the ORIGINAL
classification, because nothing ever rewrote them. There is no live
inconsistency today *because the golden master is not currently regenerated from
them* — but that is a property of nobody having run the regeneration, not a
property of the system. The moment someone rebuilds the registry from Phase-1
data, every ruling silently reverts, with no error and no failing test.

WHAT THIS GUARD DOES.
Derives the protected key list FROM the golden master's own `bean_rulings_*`
metadata (never a hardcoded dict — R-31-1 / blub.db 260), then reports every
upstream artefact that still carries one of those keys. It is the tripwire that
makes a silent revert loud.

DELIBERATELY INFORMATIONAL, not blocking. The drift it reports is pre-existing
and expected right now — the upstream artefacts were never rewritten. Making it
blocking today would fail the build on a known, accepted state, which trains
people to ignore gates. It becomes meaningful the moment a regeneration is
attempted: the operator sees exactly which rulings are about to be lost.

Exit codes: 0 always in default (report) mode. With --check, exits 1 when drift
is present, so a future regeneration workflow can gate on it explicitly.

Usage:
    python check-reclassified-keys.py            # report (exit 0)
    python check-reclassified-keys.py --check    # gate  (exit 1 on drift)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

_HERE = Path(__file__).parent
_GOLDEN = _HERE / "setting-registry.json"

# Upstream Phase-1 artefacts a regeneration could read FROM.
_UPSTREAM = (
    _HERE / "setting-types.json",
    _HERE / "setting-registry-css.json",
)

# A ruling line looks like:  "css:stroke -> reclassified (accentStroke is ...)"
# Capture the key on the left of the arrow.
_RULING_KEY_RE = re.compile(r"^\s*([a-z]+:[a-z0-9-]+)\s*->\s*(.+)$", re.IGNORECASE)


def load_rulings(golden_path: Path) -> list[tuple[str, str, str]]:
    """Return (ruling_set_name, setting_key, ruling_text) from the golden master.

    Reads every `_meta` key matching `bean_rulings*`, so rulings added in a later
    session are picked up with no code change here.
    """
    data = json.loads(golden_path.read_text(encoding="utf-8"))
    meta = data.get("_meta", {})
    out: list[tuple[str, str, str]] = []
    for meta_key, lines in meta.items():
        if not meta_key.lower().startswith("bean_rulings"):
            continue
        if not isinstance(lines, list):
            continue
        for line in lines:
            if not isinstance(line, str):
                continue
            match = _RULING_KEY_RE.match(line)
            if match:
                out.append((meta_key, match.group(1), match.group(2).strip()))
    return out


def keys_present_in(path: Path, keys: set[str]) -> dict[str, int]:
    """Count occurrences of each protected key as a `setting_key` value in a file.

    Matches the JSON value form (`"setting_key": "css:stroke"`) rather than a bare
    substring, so a key mentioned inside a prose `notes` field is not miscounted
    as an independent upstream row.
    """
    text = path.read_text(encoding="utf-8")
    found: dict[str, int] = {}
    for key in sorted(keys):
        pattern = re.compile(
            r'"setting_key"\s*:\s*"' + re.escape(key) + r'"'
        )
        count = len(pattern.findall(text))
        if count:
            found[key] = count
    return found


def main() -> int:
    check_mode = "--check" in sys.argv

    if not _GOLDEN.exists():
        print(f"[check-reclassified-keys] SKIP — golden master not found: {_GOLDEN}")
        return 0

    rulings = load_rulings(_GOLDEN)
    if not rulings:
        print(
            "[check-reclassified-keys] SKIP — no `bean_rulings*` metadata found in "
            f"{_GOLDEN.name}. Nothing to protect (this guard derives its key list "
            "from those rulings, so an empty result means no rulings exist yet, "
            "NOT that the check passed)."
        )
        return 0

    ruled_keys = {key for _, key, _ in rulings}
    ruling_text = {key: text for _, key, text in rulings}

    print(
        f"[check-reclassified-keys] {len(ruled_keys)} Bean-ruled key(s) derived from "
        f"{_GOLDEN.name}: {', '.join(sorted(ruled_keys))}"
    )

    drift: list[tuple[str, str, int]] = []
    for path in _UPSTREAM:
        if not path.exists():
            print(f"[check-reclassified-keys] upstream absent (fine): {path.name}")
            continue
        for key, count in keys_present_in(path, ruled_keys).items():
            drift.append((path.name, key, count))

    if not drift:
        print(
            "[check-reclassified-keys] OK — no ruled key is still carried as an "
            "independent row in any upstream Phase-1 artefact. A regeneration "
            "would not revert a ruling."
        )
        return 0

    print()
    print("DRIFT — these Bean rulings would SILENTLY REVERT if the golden master")
    print("were regenerated from the Phase-1 artefacts below:")
    print()
    for filename, key, count in sorted(drift):
        print(f"  {filename}: {key} ({count} row reference(s))")
        print(f"      ruling: {key} -> {ruling_text[key]}")
    print()
    print("FIX (either is acceptable):")
    print("  (a) reclassify the key upstream so the artefacts agree with the ruling; or")
    print("  (b) carry the ruling forward explicitly in whatever regenerates the")
    print("      golden master, so the curated classification always wins.")
    print()
    print(
        "Do NOT 'fix' this by deleting the ruling from the golden master — the "
        "ruling is the decision; the upstream artefact is the stale copy."
    )

    if check_mode:
        print()
        print(f"[check-reclassified-keys] FAIL (--check) — {len(drift)} drifted reference(s).")
        return 1

    print(f"[check-reclassified-keys] {len(drift)} drifted reference(s) — informational, not blocking.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
