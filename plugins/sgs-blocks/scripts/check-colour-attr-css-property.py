#!/usr/bin/env python3
"""D962-adjacent gate: no colour attribute may reach the DB with a NULL/empty
`css_property` and go unnoticed.

WHY THIS EXISTS (root cause, 2026-09-05). `block_attributes.css_property` is
DERIVED by `behavioural-analyser/extract-signatures.py` (the classifier) plus
the hand-authored `attr-classification-overrides.json` layer, applied by
`sgs-update-v2.py` Stage 1 sub-step C. Nine real colour-painting attributes
were seeded with `css_property` NULL because the classifier's per-block,
per-shape scan structurally could not see them:

  - sgs/multi-button childBtnBackground/childBtnTextColour: emitted as a
    custom property on THIS block's own wrapper, but only ever CONSUMED
    (resolved to a real CSS property) inside sgs/button's style.css — a
    cross-block custom-property hand-off the classifier's per-block CSS scan
    never crosses.
  - sgs/product-card pickerLabelColour/pickerPillBgColour/pickerPillTextColour/
    pickerPillBorderColour: forwarded via render_block('sgs/option-picker', ...)
    under a RENAMED key; the real CSS emission happens inside option-picker's
    own render.php, invisible to a scan of product-card alone.
  - sgs/pricing-table toggleLabelHoverColour: built via
    sgs_background_paint_decl() — a real shared helper with a VALUE-in/
    decl-out signature the classifier's Shape D helper registry
    (prefix+selector shaped helpers only) never recognised.
  - sgs/timeline rowStripeColourA/rowStripeColourB: the block ships
    `style.scss`, not `style.css` — the classifier hardcoded the `.css`
    filename and silently skipped the whole per-block CSS-consumption pass.
    FIXED AT THE DECLARATION in extract-signatures.py (falls back to
    `style.scss` when `style.css` is absent) so this class of gap cannot
    recur for any current or future block using that naming convention.

Each of these silently degraded `colour-codemod/survey.js`'s census into a
named-but-unexplained REFUSED:no-css_property verdict — undercounting the
framework's true colour conformance and hiding 9 real gaps behind a generic
bucket nobody was alerted to. This gate makes that bucket a hard, visible
failure instead of a silent one.

SCOPE. Deliberately narrow (Bean's own registration rule): this gate does
NOT re-derive "what counts as a colour attribute" — `role='color'` in
block_attributes is a much broader, noisier set (243 rows, mostly fx:*
motion-effect colour PARAMETERS that are correctly never assigned a
css_property — same "not every attribute drives a css_property" ruling as
unit attrs) that would red the build for reasons having nothing to do with
this fix. The correct-scope population is exactly the one survey.js already
treats as "an in-scope colour row" (258 rows / 65 blocks, built from the
golden-colour-control census + emission-capability check) — this gate
DELEGATES to that authoritative source (`node colour-codemod/survey.js
--json`) rather than reimplementing its classification, and asserts its
own REFUSED:no-css_property bucket is empty.

Run:
  python check-colour-attr-css-property.py --check       # GUARD: exit 1 if
      survey.js reports any REFUSED:no-css_property row, 0 otherwise.
  python check-colour-attr-css-property.py --self-test   # proves the gate
      can fail: injects a fixture row shaped exactly like the real gap
      (a colour verdict of REFUSED:no-css_property) and confirms --check's
      underlying logic flags it, then confirms a clean list passes.
"""
import argparse
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SURVEY_SCRIPT = ROOT / "colour-codemod" / "survey.js"
REFUSED_VERDICT = "REFUSED:no-css_property"


def _run_survey() -> list[dict]:
    """Invoke the authoritative colour-conformance census and return its rows.

    Never reimplements survey.js's row-selection logic — that logic lives in
    `colour-codemod/survey.js` (a file this gate's author is explicitly
    forbidden from editing, and which changes independently of this gate's
    own concern). Delegating via subprocess is the correct boundary: this
    gate owns "is the no-css_property bucket empty", survey.js owns "what is
    a colour row".
    """
    result = subprocess.run(
        ["node", str(SURVEY_SCRIPT), "--json"],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"survey.js exited {result.returncode} — cannot evaluate the gate.\n"
            f"stderr: {result.stderr[-2000:]}"
        )
    data = json.loads(result.stdout)
    rows = data.get("rows")
    if not isinstance(rows, list):
        raise RuntimeError("survey.js --json returned no 'rows' list — unexpected shape.")
    return rows


def _refused_rows(rows: list[dict]) -> list[dict]:
    return [r for r in rows if r.get("verdict") == REFUSED_VERDICT]


def cmd_check() -> int:
    rows = _run_survey()
    refused = _refused_rows(rows)
    if refused:
        print(f"FAIL: {len(refused)} colour attribute(s) reached the DB with no css_property:")
        for r in refused:
            block = r.get("block_slug") or r.get("block") or "?"
            attr = r.get("attr_name") or r.get("attr") or "?"
            print(f"  - {block}.{attr}")
        print(
            "\nFix at the DECLARATION, not with a raw DB UPDATE (it will not survive a "
            "reseed): either correct the classifier "
            "(behavioural-analyser/extract-signatures.py) if it is a scanning-shape gap, "
            "or add a hand-authored entry to attr-classification-overrides.json if the "
            "value is a genuine source-truth correction the heuristic cannot derive. "
            "Then re-run: python sgs-update-v2.py --stage 1"
        )
        return 1
    print(f"PASS: 0 colour attributes with no css_property (of {len(rows)} colour rows surveyed).")
    return 0


def cmd_self_test() -> int:
    """Prove the gate can fail. Never trust a check that has only ever been seen
    green — inject a fixture shaped exactly like the real 9-row gap, confirm the
    detection logic flags it, then confirm a clean list passes."""
    failures = []

    dirty_fixture = [
        {"block_slug": "sgs/fixture-block", "attr_name": "fixtureColour", "verdict": REFUSED_VERDICT},
        {"block_slug": "sgs/fixture-block", "attr_name": "fixtureBg", "verdict": "CONFORMANT"},
    ]
    dirty_refused = _refused_rows(dirty_fixture)
    if len(dirty_refused) != 1:
        failures.append(
            f"expected exactly 1 REFUSED:no-css_property row in the dirty fixture, got {len(dirty_refused)} "
            "— the detection logic did not flag the injected gap."
        )

    clean_fixture = [
        {"block_slug": "sgs/fixture-block", "attr_name": "fixtureColour", "verdict": "CONFORMANT"},
        {"block_slug": "sgs/fixture-block", "attr_name": "fixtureBg", "verdict": "AUTOFIXABLE:wire-state-emitter"},
    ]
    clean_refused = _refused_rows(clean_fixture)
    if clean_refused:
        failures.append(
            f"expected 0 REFUSED:no-css_property rows in the clean fixture, got {len(clean_refused)} "
            "— a false positive on rows that carry a real css_property elsewhere."
        )

    if failures:
        print(f"SELF-TEST FAILED ({len(failures)} assertion(s)):")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("SELF-TEST PASSED (2 assertions: dirty fixture flagged, clean fixture passes).")
    return 0


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="gate: exit 1 if any colour row is REFUSED:no-css_property")
    parser.add_argument("--self-test", action="store_true", help="exit 1 if any assertion fails")
    args = parser.parse_args()

    if args.self_test:
        sys.exit(cmd_self_test())
    if args.check:
        sys.exit(cmd_check())

    # No flag = check, matching the sibling gate scripts' documented default.
    sys.exit(cmd_check())


if __name__ == "__main__":
    main()
