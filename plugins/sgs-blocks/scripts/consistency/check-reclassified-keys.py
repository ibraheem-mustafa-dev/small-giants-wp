#!/usr/bin/env python3
"""
Spec 35 — REGENERATION GUARD for Bean-ruled reclassified setting keys.

THE PROBLEM (parking P-SPEC35-UPSTREAM-REGISTRY-DRIFT).
`setting-registry.json` is the hand-curated golden master. Some of its rows carry
an explicit Bean ruling that RECLASSIFIED a setting key away from what the
automated Phase-1 pass concluded — e.g. `css:stroke` is a decoration toggle, not
a colour; `css:background-image` is a background overlay, not a real image.

Those rulings live ONLY in the golden master. The upstream Phase-1 artefacts
(`setting-types.json`, `setting-registry-css.json`) still carry the ORIGINAL
classification, because nothing ever rewrote them. There is no live
inconsistency today *because the golden master is not currently regenerated from
them* — but that is a property of nobody having run the regeneration, not a
property of the system. The moment someone rebuilds the registry from Phase-1
data, every ruling silently reverts, with no error and no failing test.

WHAT THIS GUARD DOES.
Derives the protected key list FROM the golden master's own `bean_rulings_*`
metadata (never a hardcoded dict — R-31-1 / blub.db 260), counts how many rows
in each upstream artefact still carry each ruled key, and DIFFS that against the
accepted baseline in `reclassified-keys-baseline.json`.

WHY A BASELINE (and why this gate is now BLOCKING).
This guard used to be deliberately informational, because the drift it reports is
pre-existing and accepted — making it blocking would have failed every build on a
known-good state. But an informational gate is a tripwire with the alarm
disconnected: it printed the same eight-line failure into every green build for
weeks and nobody read it. The baseline resolves the conflict. The gate is now
BLOCKING, and it fails on any DIFFERENCE from the accepted state:

  * UNEXPECTED  (drift - accepted): a new (file, key) pair, or a HIGHER count for
    an already-accepted pair. Keying on COUNT rather than mere presence is what
    makes this change-keyed rather than state-keyed — a regeneration that adds a
    third `css:stroke` row to `setting-types.json` trips the gate even though the
    pair was already accepted.
  * STALE       (accepted - drift): an accepted line whose upstream references
    are gone or reduced, i.e. someone fixed the drift upstream. That line is now
    obsolete and must be deleted from the baseline. Without this direction the
    baseline rots into permanent blindness: it would keep excusing references
    that no longer exist and would silently re-accept them if they came back.

FAIL-LOUD BY DEFAULT. An ABSENT baseline file means an EMPTY accepted set, so
every drifted reference reads as unexpected and the gate fails. It never
fail-opens on a missing or unreadable baseline.

Exit codes: 0 when the drift exactly equals the baseline; 1 otherwise. Default
mode is blocking; `--check` is an accepted alias for the same behaviour, so the
existing `run-consistency-gates.py` call site needs no argument change.

Usage:
    python check-reclassified-keys.py              # gate (exit 1 on any difference)
    python check-reclassified-keys.py --check      # alias for the above
    python check-reclassified-keys.py --self-test  # two-sided control
"""
from __future__ import annotations

import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

_HERE = Path(__file__).parent
_GOLDEN = _HERE / "setting-registry.json"
_BASELINE = _HERE / "reclassified-keys-baseline.json"

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


def load_baseline(baseline_path: Path) -> tuple[dict[tuple[str, str], int], dict[tuple[str, str], str]]:
    """Return ({(file, key): count}, {(file, key): reason}) from the baseline file.

    An ABSENT baseline deliberately yields an EMPTY accepted set — every drifted
    reference then reads as unexpected and the gate fails loudly. It must never
    fail open on a missing file.
    """
    if not baseline_path.exists():
        return {}, {}
    data = json.loads(baseline_path.read_text(encoding="utf-8"))
    counts: dict[tuple[str, str], int] = {}
    reasons: dict[tuple[str, str], str] = {}
    for row in data.get("accepted", []):
        if not isinstance(row, dict):
            continue
        filename = row.get("file")
        key = row.get("key")
        count = row.get("count")
        if not isinstance(filename, str) or not isinstance(key, str):
            continue
        if not isinstance(count, int) or count < 1:
            continue
        counts[(filename, key)] = count
        reasons[(filename, key)] = str(row.get("reason", "")).strip()
    return counts, reasons


def run(
    golden_path: Path,
    upstream_paths: tuple[Path, ...],
    baseline_path: Path,
) -> tuple[int, list[str]]:
    """Pure core: returns (exit_code, output_lines). Injectable for --self-test."""
    out: list[str] = []

    def say(line: str = "") -> None:
        out.append(line)

    if not golden_path.exists():
        say(f"[check-reclassified-keys] SKIP — golden master not found: {golden_path}")
        return 0, out

    rulings = load_rulings(golden_path)
    if not rulings:
        say(
            "[check-reclassified-keys] SKIP — no `bean_rulings*` metadata found in "
            f"{golden_path.name}. Nothing to protect (this guard derives its key list "
            "from those rulings, so an empty result means no rulings exist yet, "
            "NOT that the check passed)."
        )
        return 0, out

    ruled_keys = {key for _, key, _ in rulings}
    ruling_text = {key: text for _, key, text in rulings}

    say(
        f"[check-reclassified-keys] {len(ruled_keys)} Bean-ruled key(s) derived from "
        f"{golden_path.name}: {', '.join(sorted(ruled_keys))}"
    )

    # ---- measure live drift ------------------------------------------------
    drift: dict[tuple[str, str], int] = {}
    for path in upstream_paths:
        if not path.exists():
            say(f"[check-reclassified-keys] upstream absent (fine): {path.name}")
            continue
        for key, count in keys_present_in(path, ruled_keys).items():
            drift[(path.name, key)] = count

    accepted, reasons = load_baseline(baseline_path)
    if not baseline_path.exists():
        say(
            f"[check-reclassified-keys] NO BASELINE at {baseline_path.name} — treating the "
            "accepted set as EMPTY (fail-loud by default; an absent baseline never "
            "means 'everything is fine')."
        )
    else:
        say(
            f"[check-reclassified-keys] baseline: {len(accepted)} accepted (file, key, count) "
            f"triple(s) from {baseline_path.name}"
        )

    # ---- diff, both directions --------------------------------------------
    unexpected: list[tuple[str, str, int, int]] = []   # file, key, actual, accepted
    stale: list[tuple[str, str, int, int]] = []        # file, key, accepted, actual

    for (filename, key), count in sorted(drift.items()):
        allowed = accepted.get((filename, key), 0)
        if count > allowed:
            unexpected.append((filename, key, count, allowed))

    for (filename, key), allowed in sorted(accepted.items()):
        actual = drift.get((filename, key), 0)
        if actual < allowed:
            stale.append((filename, key, allowed, actual))

    total_refs = sum(drift.values())

    if not unexpected and not stale:
        say(
            f"[check-reclassified-keys] OK — upstream drift ({total_refs} reference(s) across "
            f"{len(drift)} (file, key) pair(s)) matches the accepted baseline EXACTLY. "
            "No ruling is at risk, and no baseline line is obsolete."
        )
        return 0, out

    say()
    say("=" * 74)
    say("check-reclassified-keys — FAIL")
    say("=" * 74)

    if unexpected:
        say()
        say("UNEXPECTED DRIFT — these references are NEW or INCREASED versus the")
        say("accepted baseline. A Bean ruling is about to be silently reverted:")
        say()
        for filename, key, actual, allowed in unexpected:
            delta = actual - allowed
            if allowed == 0:
                say(f"  {filename}: {key} — {actual} row reference(s), NOT in the baseline at all")
            else:
                say(
                    f"  {filename}: {key} — {actual} row reference(s), baseline accepts "
                    f"{allowed} (+{delta})"
                )
            say(f"      ruling: {key} -> {ruling_text.get(key, '(ruling text not found)')}")
        say()
        say("FIX (either is acceptable):")
        say("  (a) reclassify the key upstream so the artefacts agree with the ruling; or")
        say("  (b) carry the ruling forward explicitly in whatever regenerates the")
        say("      golden master, so the curated classification always wins.")
        say()
        say(
            "Do NOT 'fix' this by deleting the ruling from the golden master — the "
            "ruling is the decision; the upstream artefact is the stale copy. And do "
            "NOT simply raise the baseline count to silence it: the baseline records "
            "drift that was ACCEPTED, not drift that is merely current."
        )

    if stale:
        say()
        say("OBSOLETE BASELINE LINE(S) — these accepted references are GONE or REDUCED")
        say("upstream. The drift was fixed; the baseline line is now excusing something")
        say("that no longer exists, which is how a baseline rots into permanent blindness:")
        say()
        for filename, key, allowed, actual in stale:
            say(
                f"  {filename}: {key} — baseline accepts {allowed}, upstream now has {actual}"
            )
            reason = reasons.get((filename, key), "")
            if reason:
                say(f"      recorded reason: {reason}")
        say()
        say("FIX: delete (or lower the count on) each line above in")
        say(f"     {baseline_path.name}. The upstream artefact is now correct;")
        say("     the baseline must stop excusing it, so that a future regeneration")
        say("     re-introducing the reference fails this gate loudly.")

    say()
    say(
        f"[check-reclassified-keys] FAIL — {len(unexpected)} unexpected, "
        f"{len(stale)} obsolete baseline line(s)."
    )
    return 1, out


# --------------------------------------------------------------------------- self-test


def _write_fixture(tmp: Path) -> None:
    """Copy the real golden master, upstream artefacts and baseline into `tmp`."""
    for src in (_GOLDEN, _BASELINE, *_UPSTREAM):
        if src.exists():
            shutil.copy2(src, tmp / src.name)


def _count_key(path: Path, key: str) -> int:
    pattern = re.compile(r'"setting_key"\s*:\s*"' + re.escape(key) + r'"')
    return len(pattern.findall(path.read_text(encoding="utf-8")))


def self_test() -> int:
    """Two-sided control on real fixtures.

    A gate that cannot fail reads green forever. Three cases, and every planted
    defect is VERIFIED PRESENT before its exit code is believed — a mutation that
    silently matched nothing would otherwise manufacture a fake PASS.
    """
    print("check-reclassified-keys --self-test")
    print("=" * 74)
    failures = 0

    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        _write_fixture(tmp)
        golden = tmp / _GOLDEN.name
        baseline = tmp / _BASELINE.name
        upstream = tuple(tmp / p.name for p in _UPSTREAM)
        types_json = tmp / "setting-types.json"
        css_json = tmp / "setting-registry-css.json"

        # --- case 1: clean — drift == baseline => 0 -------------------------
        rc, out = run(golden, upstream, baseline)
        ok = rc == 0
        print(f"  [{'PASS' if ok else 'BROKEN'}] case 1 (positive control): "
              f"untouched fixture => exit {rc}, expected 0")
        if not ok:
            failures += 1
            print("\n".join(f"        | {line}" for line in out))

        # --- case 2: NEGATIVE CONTROL — extra css:stroke row => 1 ----------
        before = _count_key(types_json, "css:stroke")
        text = types_json.read_text(encoding="utf-8")
        text = text.replace(
            '"setting_key": "css:stroke"',
            '"setting_key": "css:stroke", "_planted": true, "setting_key": "css:stroke"',
            1,
        )
        types_json.write_text(text, encoding="utf-8")
        after = _count_key(types_json, "css:stroke")
        plant_landed = after == before + 1
        print(f"  [{'PASS' if plant_landed else 'BROKEN'}] case 2 plant verification: "
              f"css:stroke rows in setting-types.json {before} -> {after} "
              f"(expected {before + 1})")
        if not plant_landed:
            failures += 1
            print("        planted defect did NOT land — the exit code below proves nothing.")
        rc, out = run(golden, upstream, baseline)
        named = any("css:stroke" in line and "setting-types.json" in line for line in out)
        ok = plant_landed and rc == 1 and named
        print(f"  [{'PASS' if ok else 'BROKEN'}] case 2 (negative control): "
              f"injected extra css:stroke row => exit {rc} (expected 1), "
              f"named in output: {named}")
        if not ok:
            failures += 1
            print("\n".join(f"        | {line}" for line in out))
        types_json.write_text(
            types_json.read_text(encoding="utf-8").replace(
                '"setting_key": "css:stroke", "_planted": true, ', "", 1
            ),
            encoding="utf-8",
        )
        assert _count_key(types_json, "css:stroke") == before, "case 2 restore failed"

        # --- case 3: accepted line removed upstream => 1 (obsolete) --------
        before = _count_key(css_json, "css:font-family")
        css_json.write_text(
            re.sub(
                r'"setting_key"\s*:\s*"css:font-family"',
                '"setting_key": "css:REMOVED-BY-SELFTEST"',
                css_json.read_text(encoding="utf-8"),
            ),
            encoding="utf-8",
        )
        after = _count_key(css_json, "css:font-family")
        plant_landed = before > 0 and after == 0
        print(f"  [{'PASS' if plant_landed else 'BROKEN'}] case 3 plant verification: "
              f"css:font-family rows in setting-registry-css.json {before} -> {after} "
              "(expected >0 -> 0)")
        if not plant_landed:
            failures += 1
            print("        planted defect did NOT land — the exit code below proves nothing.")
        rc, out = run(golden, upstream, baseline)
        named = any(
            "OBSOLETE BASELINE" in line for line in out
        ) and any(
            "css:font-family" in line and "setting-registry-css.json" in line for line in out
        )
        ok = plant_landed and rc == 1 and named
        print(f"  [{'PASS' if ok else 'BROKEN'}] case 3 (stale baseline): "
              f"accepted line's upstream reference removed => exit {rc} (expected 1), "
              f"named as obsolete: {named}")
        if not ok:
            failures += 1
            print("\n".join(f"        | {line}" for line in out))

    print("-" * 74)
    if failures:
        print(f"SELF-TEST FAILED — {failures} control(s) did not hold.")
        return 1
    print("SELF-TEST PASSED — the gate passes a clean tree, fails an injected extra "
          "reference, and fails an obsolete baseline line. It is not vacuous.")
    return 0


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()

    # `--check` is an accepted alias: default mode is already blocking, so the
    # existing run-consistency-gates.py call site needs no argument change.
    rc, out = run(_GOLDEN, _UPSTREAM, _BASELINE)
    print("\n".join(out))
    return rc


if __name__ == "__main__":
    sys.exit(main())
