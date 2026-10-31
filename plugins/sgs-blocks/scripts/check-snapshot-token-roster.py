#!/usr/bin/env python3
"""check-snapshot-token-roster.py: every client snapshot keeps the framework's picker slots valued from its draft's scale
(Spec 32 FR-32-29; the rule lives in `snapshot_token_roster.py`).

Applied to every `sites/*/theme-snapshot.json` alike. Where `sites/<client>/handoff/tokens/*.css` exists the snapshot is
also checked against the draft: a carried token the draft does not declare, or a slot whose size differs from the token's
value, fails.

USAGE
    python check-snapshot-token-roster.py --check       exit 1 on any finding
    python check-snapshot-token-roster.py --self-test   negative controls: proves it can fail
"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "theme-extractor"))
import snapshot_token_roster as roster  # noqa: E402

ROOT = roster.REPO_ROOT


def draft_tokens(handoff: Path) -> dict[str, str] | None:
    import token_files
    found = token_files.read_token_files(handoff)
    if found is None:
        return None
    aliases = {a.lstrip("-").lower() for a in found.get("aliases") or ()}
    return {k.lstrip("-").lower(): str(v).strip() for k, v in found["tokens"].items() if k.lstrip("-").lower() not in aliases}


def scan(repo: Path) -> dict[str, list[str]]:
    slots = roster.framework_slots(repo / "theme" / "sgs-theme" / "theme.json")
    out = {}
    for path in sorted((repo / "sites").glob("*/theme-snapshot.json")):
        snap = json.loads(path.read_text(encoding="utf-8"))
        found = roster.problems(snap, slots)
        tokens = draft_tokens(path.parent / "handoff")
        if tokens is not None:
            found += roster.draft_problems(snap, tokens)
        out[path.parent.name] = found
    return out


def run_check(repo: Path) -> int:
    print("[check-snapshot-token-roster]\n")
    failures = 0
    for label, found in scan(repo).items():
        for msg in found:
            failures += 1
            print("  %s: %s" % (label, msg))
    if not failures:
        print("[check-snapshot-token-roster] PASS")
        return 0
    print("\n[check-snapshot-token-roster] FAILED: %d finding(s)." % failures)
    return 1


def run_self_test() -> int:
    print("[check-snapshot-token-roster --self-test]\n")
    slots = {"fontSizes": ["small", "regular"], "spacing": ["10", "20"]}
    base = {"settings": {"typography": {"fontSizes": [{"slug": "small", "size": "13px"}, {"slug": "regular", "size": "16px"}]},
                         "spacing": {"spacingSizes": [{"slug": "10", "size": "6px"}, {"slug": "20", "size": "8px"}]},
                         "custom": {"presetTokens": {"fontSizes": {"small": "fs-s", "regular": "fs-b"}, "spacing": {"10": "gap-1"}},
                                    "defaultTokens": ["fs-b"]}}}
    tokens = {"fs-s": "13px", "fs-b": "16px", "gap-1": "6px"}
    failures: list[str] = []

    def check(label: str, cond: bool) -> None:
        print("  %s  %s" % ("PASS" if cond else "FAIL", label))
        if not cond:
            failures.append(label)

    def mutate(fn) -> dict:
        snap = copy.deepcopy(base)
        fn(snap["settings"])
        return snap

    check("a snapshot with no presetTokens (a starter) is not measured", not roster.problems({"settings": {}}, slots))
    check("a complete snapshot passes", not roster.problems(base, slots) and not roster.draft_problems(base, tokens))
    check("a scale that does not ascend strictly FAILS", bool(roster.problems(mutate(lambda s: s["spacing"]["spacingSizes"][1].update(size="6px")), slots)))
    check("a smaller slot after a larger one FAILS (large below regular)",
          bool(roster.problems(mutate(lambda s: s["typography"]["fontSizes"][0].update(size="20px")), slots)))
    check("a null presetTokens entry (a literal-valued slot) is allowed",
          not roster.problems(mutate(lambda s: s["custom"]["presetTokens"]["spacing"].update({"20": None})), slots))
    check("a missing framework slot FAILS", bool(roster.problems(mutate(lambda s: s["spacing"]["spacingSizes"].pop()), slots)))
    check("a leftover tokenRoles FAILS",
          bool(roster.problems(mutate(lambda s: s["custom"].update(tokenRoles={"spacing": {"10": "x"}})), slots)))
    check("one token on two slots FAILS (a token is written once)",
          bool(roster.problems(mutate(lambda s: s["custom"]["presetTokens"]["fontSizes"].update(small="fs-b")), slots)))
    check("a presetTokens slot that is no framework slot FAILS",
          bool(roster.problems(mutate(lambda s: s["custom"]["presetTokens"]["spacing"].update({"99": "gap-9"})), slots)))
    check("a carried token the draft lacks FAILS",
          bool(roster.draft_problems(mutate(lambda s: s["custom"]["presetTokens"]["spacing"].update({"10": "gap-9"})), tokens)))
    check("a slot size that differs from the carried token's value FAILS",
          bool(roster.draft_problems(mutate(lambda s: s["spacing"]["spacingSizes"][0].update(size="7px")), tokens)))
    check("a default token the draft lacks FAILS",
          bool(roster.draft_problems(mutate(lambda s: s["custom"].update(defaultTokens=["nope"])), tokens)))
    check("an over-long picker list FAILS", bool(roster.problems(mutate(lambda s: s["typography"]["fontSizes"].extend(
        {"slug": f"x{i}", "size": "1px"} for i in range(8))), slots)))
    check("a malformed token name is refused",
          bool(roster.problems(mutate(lambda s: s["custom"]["presetTokens"]["spacing"].update({"10": "a;b"})), slots)))
    if failures:
        print("\n[check-snapshot-token-roster --self-test] FAILED: %d" % len(failures))
        return 1
    print("\n[check-snapshot-token-roster --self-test] PASS")
    return 0


def main(argv: list[str]) -> int:
    if "--self-test" in argv:
        return run_self_test()
    if "--check" in argv:
        return run_check(ROOT)
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
