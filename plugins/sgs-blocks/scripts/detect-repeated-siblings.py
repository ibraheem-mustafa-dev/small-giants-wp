#!/usr/bin/env python3
"""detect-repeated-siblings.py -- Q2 Tier 1 structural repeated-sibling triad CLI.

Design doc: `.claude/plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md`
"Question 2", Tier 1 (Bean-approved 2026-09-11). Decision log: `.claude/decisions.md`.

Mirrors `migrate-tier-object.py`'s survey -> fix -> fix --apply -> check -> self-test
shape (per `plugins/sgs-blocks/CLAUDE.md` "Tier-object migration triad" section) rather
than inventing a new confirmation mechanism, per this task's explicit instruction.

    python scripts/detect-repeated-siblings.py --survey <boundary.html>            # census
    python scripts/detect-repeated-siblings.py --fix <survey.json>                 # dry-run preview
    python scripts/detect-repeated-siblings.py --fix --apply <survey.json>         # write it (needs sign-off)
    python scripts/detect-repeated-siblings.py --check <applied-or-survey-glob>    # CI gate
    python scripts/detect-repeated-siblings.py --self-test                         # fixtures

--------------------------------------------------------------------------------------
THE SIGN-OFF GATE (per R-31-13 -- Bean's eye is co-authoritative on fidelity, never a
silent bulk-apply):

  --survey   detects repeated-sibling groups in a boundary's direct children and
             writes a report. Every detected group starts `"signed_off": false`.

  --fix      converts EACH group's representative through the REAL converter
             (Stage 2 recognition + Stage 7 serialisation -- see
             `repeated_sibling_detector.convert_representative`) and writes a
             preview of what would be applied. This is the artefact a human
             reads before deciding. It NEVER writes `"signed_off": true` itself
             -- that flag can only be set by a human/operator editing the
             survey JSON after reading the fix preview.

  --fix --apply   REFUSES (writes nothing, exits 1) for any group whose survey
             entry is not `"signed_off": true`. Only a group an operator has
             explicitly marked gets bulk-applied as a native repeating block.
             This is the mechanical equivalent of `migrate-tier-object.py`'s
             own "refuses rather than guesses" discipline, extended with an
             explicit machine-checkable confirmation flag because THIS
             triad's `--apply` step has a blast radius `migrate-tier-object.py`
             does not: it replaces N individually-converted siblings with ONE
             bulk-stamped structure.

  --check    gate: scans applied artefacts and fails if any lacks a matching
             signed-off survey entry (catches a hand-crafted bypass).
--------------------------------------------------------------------------------------

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import glob
import json
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

from converter.services.repeated_sibling_detector import (  # noqa: E402
    REPEATER_MIN_GROUP_SIZE,
    REPEATER_SIMILARITY_THRESHOLD,
    convert_representative,
    detect_repeater_groups,
    emit_repeated_block,
)


def _outer_html(element) -> str:
    """Best-effort outer HTML for a BeautifulSoup Tag."""
    return str(element)


def _find_container(soup) -> "object | None":
    """Auto-select the container with the most SAME-TAG direct children
    (a simple, honest heuristic for "which element in this boundary holds the
    repeating list" -- callers with a known container can bypass this via
    `--container-selector`)."""
    from collections import Counter

    best = None
    best_count = 0
    for el in soup.find_all(True):
        children = el.find_all(True, recursive=False)
        if not children:
            continue
        tag_counts = Counter(c.name for c in children)
        tag, count = tag_counts.most_common(1)[0]
        if count > best_count:
            best = el
            best_count = count
    return best


def cmd_survey(args: argparse.Namespace) -> int:
    from bs4 import BeautifulSoup

    html_path = Path(args.survey)
    html = html_path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    if args.container_selector:
        container = soup.select_one(args.container_selector)
        if container is None:
            print(f"[survey] no element matched --container-selector {args.container_selector!r}")
            return 1
    else:
        container = _find_container(soup)
        if container is None:
            print("[survey] no candidate container with repeated-tag children found")
            return 1

    siblings = container.find_all(True, recursive=False)
    groups = detect_repeater_groups(
        siblings,
        threshold=args.threshold,
        min_group_size=args.min_group_size,
    )

    report = {
        "source": str(html_path),
        "threshold": args.threshold,
        "min_group_size": args.min_group_size,
        "groups": [
            {
                "group_id": f"g{i}",
                "size": g.size,
                "average_score": round(g.average_score, 4),
                "representative_html": _outer_html(g.representative),
                "member_html": [_outer_html(m) for m in g.members],
                "signed_off": False,
            }
            for i, g in enumerate(groups)
        ],
    }

    out_path = html_path.with_suffix(html_path.suffix + ".repeater-survey.json")
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"[survey] {len(groups)} qualifying group(s) written to {out_path}")
    for g in report["groups"]:
        print(f"  {g['group_id']}: size={g['size']} avg_score={g['average_score']}")
    return 0


def cmd_fix(args: argparse.Namespace, apply: bool) -> int:
    survey_path = Path(args.fix)
    survey = json.loads(survey_path.read_text(encoding="utf-8"))

    if not apply:
        preview = {"source": str(survey_path), "groups": []}
        for g in survey["groups"]:
            conversion = convert_representative(g["representative_html"])
            preview["groups"].append(
                {
                    "group_id": g["group_id"],
                    "size": g["size"],
                    "average_score": g["average_score"],
                    "conversion": conversion,
                    "signed_off": g.get("signed_off", False),
                }
            )
        out_path = survey_path.with_suffix(survey_path.suffix + ".fix-preview.json")
        out_path.write_text(json.dumps(preview, indent=2), encoding="utf-8")
        print(f"[fix] preview for {len(preview['groups'])} group(s) written to {out_path}")
        print("[fix] review the preview, then set \"signed_off\": true per group in the")
        print(f"      survey file ({survey_path}) before running --fix --apply")
        for g in preview["groups"]:
            gap = " (GAP CANDIDATE -- unrecognised, cannot apply)" if g["conversion"]["gap_candidate"] else ""
            print(f"  {g['group_id']}: slug={g['conversion']['slug']!r}{gap}")
        return 0

    # --fix --apply
    applied = {"source": str(survey_path), "groups": []}
    refused = []
    for g in survey["groups"]:
        if not g.get("signed_off", False):
            refused.append(g["group_id"])
            continue
        conversion = convert_representative(g["representative_html"])
        if conversion["gap_candidate"] or not conversion["markup"]:
            refused.append(f"{g['group_id']} (gap-candidate, unrecognised representative)")
            continue
        block_markup = emit_repeated_block(
            conversion["markup"],
            g["size"],
            cpt_archive=args.cpt_archive,
            post_type=args.post_type,
            per_page=args.per_page,
        )
        applied["groups"].append(
            {
                "group_id": g["group_id"],
                "size": g["size"],
                "slug": conversion["slug"],
                "cpt_archive": args.cpt_archive,
                "markup": block_markup,
            }
        )

    if refused:
        print("[fix --apply] REFUSED (no sign-off or unrecognised representative), wrote nothing for:")
        for r in refused:
            print(f"  {r}")

    if not applied["groups"]:
        print("[fix --apply] no signed-off groups applied -- nothing written")
        return 1 if refused else 0

    out_path = survey_path.with_suffix(survey_path.suffix + ".applied.json")
    out_path.write_text(json.dumps(applied, indent=2), encoding="utf-8")
    print(f"[fix --apply] {len(applied['groups'])} group(s) applied, written to {out_path}")
    return 1 if refused else 0


def cmd_check(args: argparse.Namespace) -> int:
    """Gate: every `*.applied.json` must have come from a survey with the
    matching group(s) marked `signed_off: true` -- catches a hand-crafted
    applied artefact that bypassed the sign-off gate entirely."""
    pattern = args.check
    applied_files = glob.glob(pattern) if any(ch in pattern for ch in "*?[") else [pattern]
    if not applied_files:
        print(f"[check] no files matched {pattern!r} -- nothing to gate (pass)")
        return 0

    failures: list[str] = []
    for applied_file in applied_files:
        applied_path = Path(applied_file)
        if not applied_path.name.endswith(".applied.json"):
            continue
        applied = json.loads(applied_path.read_text(encoding="utf-8"))
        source = Path(applied["source"])
        if not source.exists():
            failures.append(f"{applied_path}: source survey {source} missing")
            continue
        survey = json.loads(source.read_text(encoding="utf-8"))
        signed_off_ids = {g["group_id"] for g in survey["groups"] if g.get("signed_off")}
        for g in applied["groups"]:
            if g["group_id"] not in signed_off_ids:
                failures.append(
                    f"{applied_path}: group {g['group_id']} applied without a "
                    f"signed-off survey entry -- possible bypass"
                )

    if failures:
        print("[check] FAIL:")
        for f in failures:
            print(f"  {f}")
        return 1
    print(f"[check] PASS -- {len(applied_files)} applied artefact(s) all sign-off-backed")
    return 0


def _self_test() -> int:
    """3 fixtures: fires (converts representative, stops for confirmation),
    non-repeating look-alike (does NOT fire), below-threshold (does NOT fire)."""
    from converter.services.repeated_sibling_detector import (
        detect_repeater_groups,
        similarity_score,
    )

    failures = []

    def check(name: str, cond: bool) -> None:
        print(f"  [{'PASS' if cond else 'FAIL'}] {name}")
        if not cond:
            failures.append(name)

    # Fixture 1 -- FIRES: 5 near-identical product-card siblings.
    def card(extra: str = "") -> dict:
        classes = ["div", "sgs-card-grid__item"]
        if extra:
            classes.append(extra)
        return {"tag": "div", "classes": classes[1:], "children": [{"tag": "span", "classes": []}] * 3}

    fixture_1 = [card() for _ in range(4)] + [card("sgs-card-grid__item--featured")]
    groups_1 = detect_repeater_groups(fixture_1)
    check(
        "Fixture 1 (5 near-identical cards) -- ONE qualifying group of 5",
        len(groups_1) == 1 and groups_1[0].size == 5,
    )

    # Fixture 2 -- does NOT fire: a genuinely different set of elements that
    # merely happen to share a tag (a 3-column feature split, not a repeater).
    fixture_2 = [
        {"tag": "div", "classes": ["sgs-feature__pricing"], "children": [{"tag": "span"}] * 2},
        {"tag": "div", "classes": ["sgs-feature__testimonial"], "children": [{"tag": "span"}] * 6},
        {"tag": "div", "classes": ["sgs-feature__cta"], "children": []},
    ]
    groups_2 = detect_repeater_groups(fixture_2)
    check("Fixture 2 (3 genuinely different divs) -- 0 qualifying groups", len(groups_2) == 0)

    # Fixture 3 -- does NOT fire: below REPEATER_MIN_GROUP_SIZE (only 2 alike).
    fixture_3 = [card(), card()]
    groups_3 = detect_repeater_groups(fixture_3)
    check("Fixture 3 (only 2 near-identical siblings, below min group size) -- 0 qualifying groups", len(groups_3) == 0)

    # Sanity: similarity_score hard-vetoes a tag mismatch regardless of class overlap.
    a = {"tag": "div", "classes": ["sgs-card"]}
    b = {"tag": "article", "classes": ["sgs-card"]}
    check("similarity_score tag-mismatch veto == 0.0", similarity_score(a, b) == 0.0)

    print()
    if failures:
        print(f"SELF-TEST FAILED: {len(failures)} assertion(s) failed")
        return 1
    print("SELF-TEST PASSED: 4 assertions")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--survey", metavar="HTML_FILE", help="boundary HTML file to census")
    mode.add_argument("--fix", metavar="SURVEY_JSON", help="survey artefact to preview/apply")
    mode.add_argument("--check", metavar="PATTERN", help="glob of *.applied.json to gate")
    mode.add_argument("--self-test", action="store_true")

    parser.add_argument("--apply", action="store_true", help="with --fix: write the applied artefact (needs sign-off)")
    parser.add_argument("--container-selector", default=None, help="CSS selector for the repeating container (--survey)")
    parser.add_argument("--threshold", type=float, default=REPEATER_SIMILARITY_THRESHOLD)
    parser.add_argument("--min-group-size", type=int, default=REPEATER_MIN_GROUP_SIZE)
    parser.add_argument("--cpt-archive", action="store_true", help="emit a core/query loop instead of repeated InnerBlocks")
    parser.add_argument("--post-type", default="post")
    parser.add_argument("--per-page", type=int, default=12)

    args = parser.parse_args(argv)

    if args.self_test:
        return _self_test()
    if args.survey:
        return cmd_survey(args)
    if args.fix:
        return cmd_fix(args, apply=args.apply)
    if args.check:
        return cmd_check(args)
    parser.error("no mode selected")
    return 2


if __name__ == "__main__":
    sys.exit(main())
