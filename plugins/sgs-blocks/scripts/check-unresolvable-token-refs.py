#!/usr/bin/env python3
"""check-unresolvable-token-refs.py — advisory scan for var(--name) references
in emitted block-attribute values that cannot resolve on the target WordPress
document.

THE DEFECT THIS EXISTS TO CATCH
----------------------------------------------------------------------------------------
When an attribute's classification is missing (or a resolver skips colour
resolution — proven this session on GRID/per-area/overlay CSS branches, see
converter/services/token_resolution_check.py's module docstring), the
converter can emit a draft's raw CSS value VERBATIM. A draft-local custom
property like `var(--primary)` is defined only in the DRAFT's own `:root`
block — it does not exist on the rendered WordPress page — so the browser
silently falls back (to the var()'s own fallback argument, or to the
property's CSS-initial value when there is none). `border-color: var(--sgs-
btn-border, transparent)` paints **transparent**. Nothing errors, nothing
logs, and it looks entirely correct reading the source markup.

The class generalises beyond colour: it's any emitted value that is
syntactically valid CSS but references a NAME absent from the target
document's known token set — colour custom properties, but also spacing,
font-size, gradient, or any other `var(--x)` shape a future resolver might
emit un-resolved.

WHAT THIS SCRIPT DOES (DETECTION ONLY)
----------------------------------------------------------------------------------------
This is the standalone/offline half of the check — see converter/services/
token_resolution_check.py's module docstring for the LIVE half (wired into
converter/services/assembly.py's build_block_markup, the one chokepoint where
every resolver's CSS Write and every content ScalarLift have already merged
into the final emitted attrs). Both halves share the identical
find_var_references / is_resolvable logic in that module — this script does
not re-implement the check, it re-uses it against artefacts that already
exist on disk, without running the converter:

  1. Golden fixture JSON files (Gate A's conformance corpus) — each carries
     an already-emitted `block_markup` string (WP block comments with JSON
     attrs). This script parses every `<!-- wp:slug {...} -->` comment out
     of that markup and runs the SAME check the live pipeline runs.
  2. Any other JSON clone artefact matching `--extra-json` that carries a
     `block_markup` key (e.g. a captured `convert_section()` result, or a
     Stage-4 per-section results file) — same parse path.

Never mutates a fixture, never fails the build, never deletes an "offending"
override. A prior session proved that deleting an unresolved var() override
can SILENTLY substitute a different, still-plausible colour (the
`var(--border)` case: the outline preset's own default happens to be
`border-subtle`) — the fix belongs with whoever owns the resolver that
produced the value, decided with the real draft context in hand, not with
this script. This is advisory: it reports, it does not gate a build (no CI
wiring is added by this task; wire a fail-closed gate only after a human has
reviewed a first advisory run and confirmed the findings are real bugs, not
false positives from an incomplete known-token set).

USAGE
----------------------------------------------------------------------------------------
    python plugins/sgs-blocks/scripts/check-unresolvable-token-refs.py
    python plugins/sgs-blocks/scripts/check-unresolvable-token-refs.py --json
    python plugins/sgs-blocks/scripts/check-unresolvable-token-refs.py --self-test
    python plugins/sgs-blocks/scripts/check-unresolvable-token-refs.py --fixtures-dir <dir>

--self-test: proves the checker can both fail (plants a known-bad
`var(--draft-local-plant)` reference into a synthetic block_markup string and
confirms the plant landed in the string BEFORE trusting the detector's
verdict on it — the "confirm a negative/positive control landed" discipline)
and pass clean (a `var(--wp--preset--color--primary)` reference, and a
bare custom property this repo's own CSS genuinely defines).
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys

_REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]   # small-giants-wp/
_SCRIPTS_ROOT = _REPO_ROOT / "plugins" / "sgs-blocks" / "scripts"
if str(_SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_ROOT))

from converter.services import token_resolution_check as tok  # noqa: E402

# ---------------------------------------------------------------------------
# block_markup → [(slug, attrs)] harvester — same brace-depth scanner
# converter/entry.py uses internally (kept independent here so this script
# has zero converter-runtime dependency beyond the check module itself).
# ---------------------------------------------------------------------------

_SLUG_RE = re.compile(r"<!-- wp:([\w/\-]+)\s+(\{)", re.DOTALL)


def harvest_block_attrs(markup: str) -> list[tuple[str, dict]]:
    results: list[tuple[str, dict]] = []
    if not markup:
        return results
    for m in _SLUG_RE.finditer(markup):
        slug = m.group(1)
        brace_start = m.start(2)
        depth = 0
        for i, ch in enumerate(markup[brace_start:], start=brace_start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    raw_json = markup[brace_start:i + 1]
                    try:
                        results.append((slug, json.loads(raw_json)))
                    except ValueError:
                        pass
                    break
    return results


# ---------------------------------------------------------------------------
# Fixture discovery
# ---------------------------------------------------------------------------

_DEFAULT_FIXTURE_DIRS = [
    _SCRIPTS_ROOT / "tests" / "fixtures" / "conformance" / "goldens",
    _SCRIPTS_ROOT / "tests" / "fixtures" / "conformance",
]

# golden_id / filename prefix → sites/<client> slug, for the per-client
# theme-snapshot.json known-token set. The site-agnostic sgs-*.golden.json
# fixtures (top-level conformance/ dir) carry no client — framework theme.json
# tokens only, which is the correct behaviour for a client-agnostic draft
# fixture (Spec 31 §13 — SGS is a standalone framework, no client hardcoded).
_CLIENT_PREFIX_MAP = {
    "mamas-munches": "mamas-munches",
    "mamas-trust-bar-real": "mamas-munches",
}


def _client_for_fixture(path: pathlib.Path, golden_id: str) -> str:
    stem = path.stem.replace(".golden", "")
    for prefix, client in _CLIENT_PREFIX_MAP.items():
        if stem.startswith(prefix) or golden_id.startswith(prefix):
            return client
    return ""


def iter_fixture_findings(fixture_dirs: list[pathlib.Path]) -> list[dict]:
    all_findings: list[dict] = []
    for fdir in fixture_dirs:
        if not fdir.exists():
            continue
        for path in sorted(fdir.glob("*.golden.json")):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            markup = data.get("block_markup", "")
            if not markup:
                continue
            golden_id = data.get("golden_id", path.stem)
            client_slug = _client_for_fixture(path, golden_id)
            tok.configure_token_resolution_from_run(client_slug, _REPO_ROOT)
            for slug, attrs in harvest_block_attrs(markup):
                for finding in tok.check_attrs(attrs, slug, css_rules=None):
                    finding["fixture"] = str(path.relative_to(_REPO_ROOT))
                    finding["golden_id"] = golden_id
                    finding["client_slug"] = client_slug or "(framework, no client)"
                    all_findings.append(finding)
    return all_findings


def iter_extra_json_findings(paths: list[pathlib.Path]) -> list[dict]:
    all_findings: list[dict] = []
    for path in paths:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            print(f"[unresolvable-token-refs] SKIP unreadable/invalid JSON: {path}", file=sys.stderr)
            continue
        # Accept either a single result dict or a list of them (a per-section
        # results array, as produced by sgs-clone-orchestrator.py runs).
        records = data if isinstance(data, list) else [data]
        tok.configure_token_resolution_from_run("", _REPO_ROOT)
        for rec in records:
            if not isinstance(rec, dict):
                continue
            markup = rec.get("block_markup", "")
            if not markup:
                continue
            for slug, attrs in harvest_block_attrs(markup):
                for finding in tok.check_attrs(attrs, slug, css_rules=None):
                    finding["fixture"] = str(path)
                    finding["golden_id"] = rec.get("boundary_id") or rec.get("section_id") or ""
                    finding["client_slug"] = "(unknown — extra-json input)"
                    all_findings.append(finding)
    return all_findings


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def print_report(findings: list[dict]) -> None:
    if not findings:
        print("[unresolvable-token-refs] 0 findings — every var(--name) reference in the "
              "scanned fixtures resolves against theme.json / theme-snapshot.json / a "
              "genuinely-defined bare custom property, or is a var(--wp--*) core token.")
        return
    print(f"[unresolvable-token-refs] {len(findings)} finding(s) — ADVISORY ONLY, "
          f"nothing was changed. Each names the block, attribute, reference, and (best-"
          f"effort) the draft rule it came from. Fix in the resolver that produced the "
          f"value — never by deleting the override (see module docstring: two presets "
          f"can share a colour, making a deletion look correct while silently swapping "
          f"in the WRONG one).\n")
    by_fixture: dict[str, list[dict]] = {}
    for f in findings:
        by_fixture.setdefault(f.get("fixture", "?"), []).append(f)
    for fixture, items in sorted(by_fixture.items()):
        print(f"  {fixture}  ({len(items)} finding(s))")
        for f in items:
            origin = f.get("origin_rule") or "(not traced to a single draft CSS rule)"
            print(f"    - block={f['block']}  attr={f['attribute']}  ref={f['reference']}")
            print(f"      value={f['value']!r}")
            print(f"      client={f.get('client_slug', '?')}  golden={f.get('golden_id', '?')}")
            print(f"      draft rule: {origin}")
        print()


# ---------------------------------------------------------------------------
# --self-test — proves both the fail case and the pass case, with the plant
# CONFIRMED before it is trusted (prove-the-cause-before-fix discipline).
# ---------------------------------------------------------------------------

def _self_test() -> int:
    failures: list[str] = []
    tok.configure_token_resolution_from_run("mamas-munches", _REPO_ROOT)

    # --- Case 1: planted UNRESOLVABLE draft-local var() must be flagged ----
    planted_markup = (
        '<!-- wp:sgs/container {"align":"full","style":{"border":{"color":'
        '"var(--draft-local-plant)"}}} -->\n<!-- /wp:sgs/container -->'
    )
    # Confirm the plant actually landed in the string before trusting the
    # detector's verdict on it (verification-before-trust discipline).
    if "var(--draft-local-plant)" not in planted_markup:
        print("[unresolvable-token-refs --self-test] FAIL — the plant did not land in "
              "the synthetic markup string; the case below would be vacuous.")
        return 1
    print("[unresolvable-token-refs --self-test] plant confirmed in source string — OK")

    bad_findings: list[dict] = []
    for slug, attrs in harvest_block_attrs(planted_markup):
        bad_findings.extend(tok.check_attrs(attrs, slug, css_rules=None))
    if any(f["reference"] == "var(--draft-local-plant)" for f in bad_findings):
        print("[unresolvable-token-refs --self-test] planted draft-local var() flagged "
              "as a finding — OK")
    else:
        failures.append("planted var(--draft-local-plant) was NOT flagged (false negative)")

    # --- Case 2: a real var(--wp--*) core token must NOT be flagged --------
    good_markup_wp = (
        '<!-- wp:sgs/container {"style":{"color":{"background":'
        '"var(--wp--preset--color--primary)"}}} -->\n<!-- /wp:sgs/container -->'
    )
    good_findings_wp: list[dict] = []
    for slug, attrs in harvest_block_attrs(good_markup_wp):
        good_findings_wp.extend(tok.check_attrs(attrs, slug, css_rules=None))
    if not good_findings_wp:
        print("[unresolvable-token-refs --self-test] var(--wp--preset--color--primary) "
              "correctly NOT flagged — OK")
    else:
        failures.append(f"var(--wp--preset--color--primary) was WRONGLY flagged: {good_findings_wp}")

    # --- Case 3: a real bare custom property this repo's own CSS defines ---
    # must NOT be flagged (e.g. an SGS block's own component-scoped token).
    bare_known = tok.bare_defined_custom_properties(_REPO_ROOT)
    if not bare_known:
        print("[unresolvable-token-refs --self-test] SKIP case 3 — no bare custom "
              "property found in theme/sgs-theme or plugins/sgs-blocks CSS to test "
              "against (not a failure; nothing to prove pass-through on).")
    else:
        sample = min(bare_known)
        good_markup_bare = (
            '<!-- wp:sgs/container {"style":{"color":{"text":'
            f'"var(--{sample})"' + '}}} -->\n<!-- /wp:sgs/container -->'
        )
        good_findings_bare: list[dict] = []
        for slug, attrs in harvest_block_attrs(good_markup_bare):
            good_findings_bare.extend(tok.check_attrs(attrs, slug, css_rules=None))
        if not good_findings_bare:
            print(f"[unresolvable-token-refs --self-test] var(--{sample}) (a real "
                  f"bare custom property genuinely defined in this repo's own CSS) "
                  f"correctly NOT flagged — OK")
        else:
            failures.append(f"var(--{sample}) was WRONGLY flagged: {good_findings_bare}")

    if failures:
        print(f"\n[unresolvable-token-refs --self-test] FAIL — {len(failures)} case(s) unproven:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\n[unresolvable-token-refs --self-test] PASS — planted unresolvable reference "
          "is caught, a real wp--* core token passes clean, a real bare-defined SGS "
          "custom property passes clean.")
    return 0


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Advisory scan for var(--name) references that cannot resolve on "
                    "the target WordPress document. Detection only — never mutates a "
                    "fixture or fails a build.")
    parser.add_argument("--fixtures-dir", action="append", default=None,
                        help="Directory of *.golden.json fixtures to scan. Repeatable. "
                             "Defaults to both known conformance fixture directories.")
    parser.add_argument("--extra-json", action="append", default=None,
                        help="Additional JSON file (a captured convert_section() result, "
                             "or a list of them) carrying a block_markup key. Repeatable.")
    parser.add_argument("--json", action="store_true", default=False,
                        help="Emit the findings as a JSON array instead of the human report.")
    parser.add_argument("--self-test", action="store_true", default=False,
                        help="Prove the checker fails on a planted unresolvable reference "
                             "and passes clean on a resolvable one. Exits 1 on any unproven case.")
    # --check completes this repo's standard gate contract
    # (default report | --check | --json). It was MISSING on first build, so the
    # script exited 2 with an argparse usage error when invoked the way every
    # other gate here is invoked. That is the exact trap found in sgs-update
    # Stage 13 earlier the same day: check-fx-list-drift.py was given a flag its
    # parser rejected, produced no output, and the caller read that emptiness as
    # "0 findings" — the scanner had never run. A gate that cannot be invoked by
    # the house convention is a gate that will one day be silently skipped.
    # Currently ADVISORY: it reports and still exits 0, because the roster has a
    # known backlog and this project promotes a rule to fail-closed only once its
    # backlog reaches zero. Flip the return below to `1 if findings else 0`.
    parser.add_argument("--check", action="store_true", default=False,
                        help="Gate mode (currently ADVISORY: reports findings, still exits 0).")
    args = parser.parse_args()

    if args.self_test:
        return _self_test()

    fixture_dirs = (
        [pathlib.Path(d) for d in args.fixtures_dir]
        if args.fixtures_dir else _DEFAULT_FIXTURE_DIRS
    )
    findings = iter_fixture_findings(fixture_dirs)
    if args.extra_json:
        findings.extend(iter_extra_json_findings([pathlib.Path(p) for p in args.extra_json]))

    if args.json:
        print(json.dumps(findings, indent=2))
    else:
        print_report(findings)
    return 0  # advisory — never fails the build (see module docstring)


if __name__ == "__main__":
    sys.exit(main())
