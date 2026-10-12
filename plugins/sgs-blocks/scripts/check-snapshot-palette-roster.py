#!/usr/bin/env python3
"""check-snapshot-palette-roster.py: every client snapshot carries the whole framework palette roster
and its key colour pairs are readable (Spec 32 FR-32-14, section 14.2 completeness rule).

A snapshot replaces `theme.json` wholesale at push, so a palette slug the snapshot lacks is DELETED
for that client. Two assertions, applied to every `sites/*/theme-snapshot.json` alike (no client is
named or excluded):

  1. Roster: the framework `theme/sgs-theme/theme.json` palette slugs are a subset of the snapshot's
     slugs. Extra slugs are allowed.
  2. Contrast, at least 4.5:1 per snapshot, on that snapshot's own resolved hex values:
     `section-text` on `section`, `link` on `surface`, `link-hover` on `surface`.
     An unresolvable value is reported as a failure, never skipped.

USAGE
    python check-snapshot-palette-roster.py --check       exit 1 on any finding
    python check-snapshot-palette-roster.py --survey      the census, always exit 0
    python check-snapshot-palette-roster.py --self-test   negative controls: proves it can fail
"""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import snapshot_palette_roster as roster  # noqa: E402

ROOT = roster.REPO_ROOT


def snapshots(repo: Path) -> list[Path]:
    return sorted((repo / "sites").glob("*/theme-snapshot.json"))


def evaluate(snapshot: dict, slugs: list[str]) -> dict:
    """The findings for one snapshot: missing roster slugs and failing contrast rows."""
    missing = roster.missing_roster_slugs(snapshot, slugs)
    rows = roster.contrast_report(snapshot)
    # a pair whose slug is missing is already reported under `missing`
    bad = [r for r in rows if r["status"] in ("low", "unresolvable")]
    return {"missing": missing, "rows": rows, "bad": bad}


def scan(repo: Path) -> tuple[list[str], dict[str, dict]]:
    slugs = roster.framework_roster(repo / "theme" / "sgs-theme" / "theme.json")
    out = {}
    for path in snapshots(repo):
        label = path.parent.name
        out[label] = evaluate(json.loads(path.read_text(encoding="utf-8")), slugs)
    return slugs, out


def run_check(repo: Path) -> int:
    slugs, result = scan(repo)
    print("[check-snapshot-palette-roster]\n")
    print("Framework roster: %d slugs   snapshots: %d\n" % (len(slugs), len(result)))
    failures = 0
    for label, r in result.items():
        for s in r["missing"]:
            failures += 1
            print("  %s: missing roster slug `%s`" % (label, s))
        for row in r["bad"]:
            failures += 1
            if row["status"] == "unresolvable":
                print("  %s: %s on %s is unresolvable (%s on %s)" % (label, row["fg"], row["bg"], row["fg_hex"], row["bg_hex"]))
            else:
                print("  %s: %s %s on %s %s is %s:1, below %s:1" % (
                    label, row["fg"], row["fg_hex"], row["bg"], row["bg_hex"], row["ratio"], roster.MIN_CONTRAST))
    if not failures:
        print("[check-snapshot-palette-roster] PASS")
        return 0
    print("\n[check-snapshot-palette-roster] FAILED: %d finding(s)." % failures)
    print("    A snapshot replaces theme.json wholesale, so a missing slug is deleted for that client at push.")
    return 1


def run_survey(repo: Path) -> int:
    slugs, result = scan(repo)
    print("[check-snapshot-palette-roster] SURVEY\n")
    print("Framework roster (%d): %s\n" % (len(slugs), ", ".join(slugs)))
    for label, r in result.items():
        print("%s   missing: %s" % (label, ", ".join(r["missing"]) or "none"))
        for row in r["rows"]:
            print("    %-12s on %-8s %-9s on %-9s %s  %s" % (row["fg"], row["bg"], row["fg_hex"], row["bg_hex"],
                                                         row["ratio"], row["status"]))
    return 0


def run_self_test() -> int:
    print("[check-snapshot-palette-roster --self-test]\n")
    failures = []

    def assert_(label, cond):
        print("  %s  %s" % ("PASS" if cond else "FAIL", label))
        if not cond:
            failures.append(label)

    def snap(slug_colours):
        return {"settings": {"color": {"palette": [{"slug": s, "color": c, "name": s} for s, c in slug_colours]}}}

    base = [("heading", "#111111"), ("link", "#0000AA"), ("link-hover", "#000066"), ("section", "#EEEEEE"),
            ("section-text", "#111111"), ("surface", "#FFFFFF")]
    slugs = [s for s, _ in base]
    good = evaluate(snap(base), slugs)
    assert_("a complete snapshot with readable pairs passes", not good["missing"] and not good["bad"])
    extra = evaluate(snap(base + [("client-only", "#123456")]), slugs)
    assert_("an extra slug is allowed", not extra["missing"] and not extra["bad"])
    gone = evaluate(snap([b for b in base if b[0] != "link-hover"]), slugs)
    assert_("a snapshot missing a roster slug FAILS and names it", gone["missing"] == ["link-hover"])
    low = evaluate(snap([("heading", "#111111"), ("link", "#E68A95"), ("link-hover", "#000066"), ("section", "#EEEEEE"),
                         ("section-text", "#111111"), ("surface", "#FBF3DC")]), slugs)
    assert_("a sub-4.5 pair FAILS", [r["fg"] for r in low["bad"]] == ["link"] and low["bad"][0]["ratio"] < 4.5)
    bad_value = evaluate(snap([("heading", "#111111"), ("link", "rebeccapurple"), ("link-hover", "#000066"),
                               ("section", "#EEEEEE"), ("section-text", "#111111"), ("surface", "#FFFFFF")]), slugs)
    assert_("an unresolvable value FAILS (never skipped)", [r["status"] for r in bad_value["bad"]] == ["unresolvable"])
    short = evaluate(snap([("heading", "#111"), ("link", "#00A"), ("link-hover", "#006"), ("section", "#EEE"),
                           ("section-text", "#111"), ("surface", "#FFF")]), slugs)
    assert_("3-digit hex is read", not short["bad"] and short["rows"][0]["ratio"] > 4.5)
    alpha = evaluate(snap([("heading", "#111111"), ("link", "#0000AAFF"), ("link-hover", "#000066"), ("section", "#EEEEEE"),
                           ("section-text", "#111111"), ("surface", "#FFFFFFFF")]), slugs)
    assert_("8-digit hex is read", not alpha["bad"])
    ref = evaluate(snap([("heading", "#111111"), ("link", "var(--wp--preset--color--primary)"), ("primary", "#0000AA"),
                         ("link-hover", "#000066"), ("section", "#EEEEEE"), ("section-text", "#111111"),
                         ("surface", "#FFFFFF")]), slugs)
    assert_("a palette entry that references another slug is resolved", not ref["bad"])

    # end to end on a temp repo: the complete snapshot passes, a broken copy fails
    tmp = Path(tempfile.mkdtemp(prefix="cspr-"))
    try:
        (tmp / "theme" / "sgs-theme").mkdir(parents=True)
        (tmp / "theme" / "sgs-theme" / "theme.json").write_text(json.dumps(snap(base)), encoding="utf-8")
        for name, data in (("ok", snap(base)), ("broken", snap(base[:-1]))):
            d = tmp / "sites" / name
            d.mkdir(parents=True)
            (d / "theme-snapshot.json").write_text(json.dumps(data), encoding="utf-8")
        shutil.rmtree(tmp / "sites" / "broken")
        assert_("end to end: a complete temp repo passes", run_check_quiet(tmp) == 0)
        d = tmp / "sites" / "broken"
        d.mkdir(parents=True)
        (d / "theme-snapshot.json").write_text(json.dumps(snap([b for b in base if b[0] != "section"])), encoding="utf-8")
        assert_("end to end: adding a snapshot missing `section` makes the gate fail", run_check_quiet(tmp) == 1)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print("\n[check-snapshot-palette-roster --self-test] " + ("ALL ASSERTIONS PASS." if not failures else "%d FAILURE(S)." % len(failures)))
    return 0 if not failures else 1


def run_check_quiet(repo: Path) -> int:
    import contextlib
    import io
    with contextlib.redirect_stdout(io.StringIO()):
        return run_check(repo)


def main() -> int:
    if "--self-test" in sys.argv:
        return run_self_test()
    if "--survey" in sys.argv:
        return run_survey(ROOT)
    return run_check(ROOT) if "--check" in sys.argv else run_survey(ROOT)


if __name__ == "__main__":
    sys.exit(main())
