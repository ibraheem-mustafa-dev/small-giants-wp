#!/usr/bin/env python3
"""
check_no_mirror.py — R-31-15 anti-mirror gate for the cloning converter.

ENFORCED GATE STATUS
====================
DEFAULT MODE       : --report           (informational, exits 0 always)
ENFORCE MODE       : --enforce          (exits non-zero on any NEW (a)/(b) violation)
BASELINE ENFORCE   : --enforce --baseline <path>
                      Grandfathers known legacy violations; only NEW violations
                      (keys absent from the baseline, OR whose count EXCEEDS the
                      baselined count) cause exit 1.
UPDATE BASELINE    : --update-baseline <path>
                      Writes the current violation counts to the baseline file and
                      exits 0.  This is the ONLY sanctioned way to change the
                      baseline.

BASELINE PATTERN (Spec 31 §12.6 step 1)
=========================================
The converter is mid-rebuild and still emits legacy draft-class violations.
Rather than blocking all enforce runs until the rebuild is 100 % complete, we
commit the known legacy violations as a baseline (see
check-no-mirror-baseline.json alongside this file).  --enforce --baseline then
fails ONLY on a NEW violation beyond that baseline (i.e. a key whose current
occurrence count exceeds the baselined max_allowed_count).

COUNT-AWARE BASELINE (soundness fix — STOP-15 2026-06-21)
==========================================================
The old baseline was a flat list of keys (set-membership check only).  This
allowed the converter to emit the SAME mirrored class on 50 block instances
(a real regression) while the gate still reported GREEN, because the key
already existed in the baseline.

The new baseline format is a count map: the gate fails if
current_count > baselined_count for any key.  A key absent from the baseline
has baselined_count = 0 (so any occurrence is NEW — preserving previous
behaviour for genuinely new keys).

Baseline file format:
  {
    "hash": "<sha256 of canonical serialisation>",
    "counts": {
      "a:sgs/container:sgs-brand__content": 1,
      "a:sgs/container:sgs-product-card__body": 3,
      ...
    }
  }

Self-blessing protection: the SHA-256 hash covers the sorted JSON of the
counts dict.  Any hand-edit that changes counts without recomputing the hash
fails with "baseline tampered" → exit 2.

Stable violation key format (deterministic, order-independent):
  Rule (a) → "a:{block_slug}:{violating_class}"
  Rule (b) → "b:{block_slug}:{sourceMode}"

WIRING NOTE (for pipeline-stage-gate.py)
=========================================
Wire into pipeline-stage-gate.py as a post-clone gate.  Look for the comment
"# R-31-15 WIRE POINT" in pipeline-stage-gate.py and add the call:

    subprocess.run(
        [sys.executable, CHECK_NO_MIRROR, run_dir,
         '--enforce', '--baseline', str(BASELINE_PATH)],
        check=True,
    )

NOTE on §12.7 "prebuild" wording: §12.7 lists this gate under "prebuild" but
"prebuild" (npm build) produces no clone run — there is no run_dir to inspect.
The gate validates converter OUTPUT (extract.json block_markup), which is only
produced post-clone.  The correct wire point is therefore AFTER a clone run
completes (pipeline-stage-gate.py), not in package.json prebuild.

WHAT THIS CHECKS (R-31-15, Bean-directed 2026-06-06)
=====================================================
(a) DRAFT-CLASS CONTAINER — any emitted block whose className carries a BEM
    ELEMENT class matching /sgs-[a-z0-9-]+__[a-z0-9-]+/ (with optional --modifier
    suffix). E.g. sgs-hero__ctas, sgs-trust-bar__badge, sgs-product-card__body.
    These mean the converter mirrored a draft wrapper instead of converting it.
    NOTE: a block's OWN root class (sgs-trust-bar on the trust-bar block) is fine —
    only ELEMENT classes (containing __) on ANY block are flagged.

(b) BOUND SOURCEMODE — any emitted block with sourceMode='bound'.
    EXCEPTION: wc-product / sgs-cpt blocks are legitimate live-data modes. Do NOT
    flag those. Only the converter echo-$content passthrough is the cheat.

(c) D2-STRANDED LAYOUT CSS (soft WARNING, best-effort) — layout properties
    (grid-template-columns, display, gap, etc.) appearing in variation-d0-d2.css
    under a .sgs- selector that maps to a block that HAS a native attribute
    destination. This is best-effort because the attribute→CSS mapping is not fully
    catalogued. Reported as WARNINGs only; never counted as hard violations.

EXIT CODES (--enforce mode)
===========================
0 — no NEW (a)/(b) violations found; baselined violations are grandfathered
1 — one or more NEW (a)/(b) violations found (key absent from baseline, or
    count exceeds baselined max_allowed_count)
2 — usage error (missing files, unreadable artefacts, tampered baseline)

EXIT CODES (--report mode, default)
====================================
Always 0. Violations printed for information only.

USAGE
=====
    # Report mode (default) — safe to run any time, never blocks
    python check_no_mirror.py [<run_dir>]
    python check_no_mirror.py [<run_dir>] --report

    # Enforce mode without baseline — blocks on ANY (a)/(b) violation
    python check_no_mirror.py [<run_dir>] --enforce

    # Enforce mode with baseline — blocks only on NEW/increased violations
    python check_no_mirror.py [<run_dir>] --enforce --baseline check-no-mirror-baseline.json

    # Update (regenerate) the baseline from the current run output
    python check_no_mirror.py [<run_dir>] --update-baseline check-no-mirror-baseline.json

    # <run_dir> defaults to the most-recent directory under pipeline-state/

UK English in all output.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = Path(__file__).parent
REPO_ROOT = HERE.parent.parent.parent.parent  # plugins/sgs-blocks/scripts/orchestrator → repo root
PIPELINE_STATE_DIR = REPO_ROOT / "pipeline-state"

# ---------------------------------------------------------------------------
# Layout CSS properties that belong in native block attributes (D1), NOT D2.
# Presence in D2 under a .sgs- selector is a soft WARNING.
# ---------------------------------------------------------------------------
D1_LAYOUT_PROPS = frozenset([
    "grid-template-columns",
    "grid-template-rows",
    "gap",
    "column-gap",
    "row-gap",
    "display",
    "max-width",
    "min-height",
    "flex-direction",
    "align-items",
    "justify-content",
    "flex-wrap",
    "grid-column",
    "grid-row",
])

# Legitimate sourceMode values — NOT the converter cheat
LEGIT_SOURCE_MODES = frozenset(["wc-product", "sgs-cpt", "typed"])

# ---------------------------------------------------------------------------
# BEM element class pattern
# Matches: sgs-<block>__<element>  or  sgs-<block>__<element>--<modifier>
# (anything with __ is an element class regardless of modifier suffix)
# ---------------------------------------------------------------------------
BEM_ELEMENT_RE = re.compile(r"^sgs-[a-z0-9-]+__[a-z0-9-]+(?:--[a-z0-9-]+)?$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def latest_run_dir(state_dir: Path) -> Path | None:
    """Return the most-recently-modified pipeline-state sub-directory."""
    candidates = [
        d for d in state_dir.iterdir()
        if d.is_dir() and not d.name.startswith(".")
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda d: d.stat().st_mtime)


def parse_block_markup(markup: str) -> list[tuple[str, dict]]:
    """Return list of (block_slug, attrs_dict) for every opening block comment."""
    # Match <!-- wp:slug {...} --> or <!-- wp:slug {} --> or <!-- wp:slug -->
    block_open_re = re.compile(
        r"<!--\s*wp:([\w/:-]+)\s*(\{.*?\})?\s*/?-->",
        re.DOTALL,
    )
    results: list[tuple[str, dict]] = []
    for m in block_open_re.finditer(markup):
        slug = m.group(1)
        attrs_raw = m.group(2) or "{}"
        try:
            attrs = json.loads(attrs_raw)
        except json.JSONDecodeError:
            attrs = {}
        results.append((slug, attrs))
    return results


def load_block_markup(run_dir: Path) -> tuple[str, str]:
    """Return (markup_string, source_filename). Prefer extract.patched.json."""
    for fname in ("extract.patched.json", "extract.json"):
        p = run_dir / fname
        if p.exists():
            data = json.loads(p.read_text(encoding="utf-8"))
            markup = data.get("block_markup", "")
            if markup:
                return markup, fname
    return "", ""


def check_a_draft_class_containers(blocks: list[tuple[str, dict]]) -> list[dict]:
    """
    Rule (a): flag any block whose className carries a BEM element class.
    Returns list of violation dicts.
    """
    violations: list[dict] = []
    for slug, attrs in blocks:
        cn = attrs.get("className", "") or ""
        for cls in cn.split():
            if BEM_ELEMENT_RE.match(cls):
                violations.append({
                    "rule": "(a) draft-class container",
                    "block": slug,
                    "className": cn,
                    "violating_class": cls,
                    "detail": (
                        f"wp:{slug} carries BEM element class '{cls}' — "
                        f"this is a mirrored draft wrapper, not a converted block."
                    ),
                })
                break  # one violation per block occurrence is enough
    return violations


def check_b_bound_source_mode(blocks: list[tuple[str, dict]]) -> list[dict]:
    """
    Rule (b): flag any block with sourceMode='bound' that is NOT a legit live-data mode.
    Returns list of violation dicts.
    """
    violations: list[dict] = []
    for slug, attrs in blocks:
        sm = attrs.get("sourceMode")
        if sm is None:
            continue
        if sm in LEGIT_SOURCE_MODES:
            continue
        if sm == "bound":
            violations.append({
                "rule": "(b) bound sourceMode",
                "block": slug,
                "sourceMode": sm,
                "className": attrs.get("className", ""),
                "detail": (
                    f"wp:{slug} has sourceMode='bound' — "
                    f"this is the echo-$content converter cheat, not a native conversion."
                ),
            })
    return violations


def check_c_d2_stranded_layout(run_dir: Path) -> list[dict]:
    """
    Rule (c): best-effort detection of layout CSS stranded in D2.
    Only flags .sgs- selectors (not .container or utility classes).
    Returns list of warning dicts (never hard violations).
    """
    warnings: list[dict] = []
    css_path = run_dir / "variation-d0-d2.css"
    if not css_path.exists():
        return warnings

    css = css_path.read_text(encoding="utf-8")

    # Locate D2 section (everything after the D2 comment marker)
    d2_marker = css.find("D2 —")
    if d2_marker == -1:
        d2_marker = css.find("D2 -")
    d2_css = css[d2_marker:] if d2_marker >= 0 else css

    # Parse CSS rules: selector { declarations }
    # Handles simple (non-nested) rules; @media blocks are partially handled
    rule_re = re.compile(r"([.#][\w\s,.:>#~\[\]=*-]+?)\{([^{}]+)\}")
    seen: set[tuple[str, str]] = set()

    for m in rule_re.finditer(d2_css):
        selector = m.group(1).strip()
        body = m.group(2)

        # Only flag selectors that mention a .sgs- class (BEM-scoped)
        if ".sgs-" not in selector:
            continue

        for prop in D1_LAYOUT_PROPS:
            if re.search(rf"\b{re.escape(prop)}\s*:", body):
                key = (selector, prop)
                if key in seen:
                    continue
                seen.add(key)
                # Extract the specific declaration
                decl_m = re.search(rf"{re.escape(prop)}\s*:[^;]+", body)
                decl = decl_m.group().strip() if decl_m else prop
                warnings.append({
                    "rule": "(c) D2-stranded layout CSS",
                    "selector": selector,
                    "property": prop,
                    "declaration": decl[:120],
                    "detail": (
                        f"Layout property '{prop}' is stranded in D2 CSS "
                        f"under selector '{selector.strip()[:80]}' — "
                        f"should be lifted to a native block attribute (D1)."
                    ),
                })

    return warnings


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------

def _hr(char: str = "─", width: int = 72) -> str:
    return char * width


def print_report(
    run_dir: Path,
    markup_source: str,
    violations_a: list[dict],
    violations_b: list[dict],
    warnings_c: list[dict],
    enforce: bool,
) -> None:
    total_hard = len(violations_a) + len(violations_b)
    status_label = "FAIL" if total_hard else "PASS"
    mode_label = "--enforce" if enforce else "--report (informational)"

    print(_hr("═"))
    print(f"  R-31-15 Anti-Mirror Gate — {status_label}")
    print(f"  Run dir : {run_dir.name}")
    print(f"  Mode    : {mode_label}")
    print(f"  Source  : {markup_source or '(not found)'}")
    print(_hr("═"))

    # --- Rule (a) ---
    print(f"\nRule (a) Draft-class containers : {len(violations_a)} violation(s)")
    if violations_a:
        print(_hr())
        # De-duplicate by violating_class for summary
        by_class: dict[str, list[str]] = {}
        for v in violations_a:
            by_class.setdefault(v["violating_class"], []).append(v["block"])
        for cls, slugs in by_class.items():
            unique_slugs = sorted(set(slugs))
            count = len(slugs)
            print(f"  [{count}×] class='{cls}'  blocks={unique_slugs}")
        print(_hr())
        print("  Full list:")
        for i, v in enumerate(violations_a, 1):
            print(f"  {i:3}. {v['detail']}")

    # --- Rule (b) ---
    print(f"\nRule (b) Bound sourceMode       : {len(violations_b)} violation(s)")
    if violations_b:
        print(_hr())
        for i, v in enumerate(violations_b, 1):
            print(f"  {i:3}. {v['detail']}")

    # --- Rule (c) ---
    print(f"\nRule (c) D2-stranded layout CSS : {len(warnings_c)} warning(s) [soft, informational]")
    if warnings_c:
        print(_hr())
        # Summarise by property
        by_prop: dict[str, int] = {}
        for w in warnings_c:
            by_prop[w["property"]] = by_prop.get(w["property"], 0) + 1
        for prop, cnt in sorted(by_prop.items(), key=lambda x: -x[1]):
            print(f"  {cnt:3}× {prop}")
        print(_hr())
        print("  Sample (first 10):")
        for w in warnings_c[:10]:
            print(f"       [{w['property']}] {w['selector'].strip()[:70]}")
            print(f"              → {w['declaration'][:90]}")

    # --- Summary ---
    print()
    print(_hr("─"))
    print(f"  SUMMARY: {total_hard} hard violation(s)  |  {len(warnings_c)} warning(s)")
    print(f"  Hard violations = rule (a) + (b).  Warnings (c) never block.")
    if not total_hard:
        print("  RESULT: PASS — no mirror-cheat violations detected.")
    else:
        if enforce:
            print("  RESULT: FAIL — violations found. Fix the converter before committing.")
        else:
            print("  RESULT: FAIL (report mode — exits 0, informational only).")
            print("  Run with --enforce once the converter is clean to hard-gate commits.")
    print(_hr("─"))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Baseline helpers
# ---------------------------------------------------------------------------

def violation_key_a(slug: str, violating_class: str) -> str:
    """Stable, deterministic key for a rule-(a) violation."""
    return f"a:{slug}:{violating_class}"


def violation_key_b(slug: str, source_mode: str) -> str:
    """Stable, deterministic key for a rule-(b) violation."""
    return f"b:{slug}:{source_mode}"


def collect_violation_counts(
    violations_a: list[dict],
    violations_b: list[dict],
) -> dict[str, int]:
    """Return a count map {stable_key: occurrence_count} for all hard violations.

    Unlike the old collect_violation_keys(), this preserves occurrence counts
    so the baseline can enforce per-key maximums (count-aware baseline).
    """
    counts: dict[str, int] = {}
    for v in violations_a:
        key = violation_key_a(v["block"], v["violating_class"])
        counts[key] = counts.get(key, 0) + 1
    for v in violations_b:
        key = violation_key_b(v["block"], v["sourceMode"])
        counts[key] = counts.get(key, 0) + 1
    return counts


def collect_violation_keys(
    violations_a: list[dict],
    violations_b: list[dict],
) -> list[str]:
    """Return a sorted, deduplicated list of stable violation keys.

    Kept for backward compatibility with existing callers (e.g. tests that
    call this directly).  Prefer collect_violation_counts() for new code.
    """
    return sorted(collect_violation_counts(violations_a, violations_b).keys())


# ---------------------------------------------------------------------------
# Count-aware baseline: {hash, counts}
# ---------------------------------------------------------------------------

def _compute_baseline_hash(counts: dict[str, int]) -> str:
    """SHA-256 over the canonical JSON serialisation of the counts dict.

    The canonical form is a JSON object with keys sorted and no trailing
    whitespace — identical to what json.dumps(..., sort_keys=True) produces.
    Mirrors the _compute_hash idiom in excluded-gate/run.py.
    """
    canonical = json.dumps(counts, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def load_baseline(path: Path) -> dict[str, int]:
    """Load a baseline JSON file and return a count map {key: max_allowed_count}.

    Accepted formats:
      • New (count-aware): {"hash": "...", "counts": {"key": N, ...}}
      • Legacy (flat list): ["key1", "key2", ...]  — migrated in-memory to
        {key: 1} for each entry (no hash verification possible).

    Raises ValueError on tampered new-format baselines (hash mismatch).
    """
    data = json.loads(path.read_text(encoding="utf-8"))

    # New count-aware format
    if isinstance(data, dict):
        stored_hash = data.get("hash")
        counts: dict[str, int] = data.get("counts", {})
        if not isinstance(counts, dict):
            raise ValueError(
                f"Baseline 'counts' field must be a JSON object: {path}"
            )
        if stored_hash is not None:
            expected = _compute_baseline_hash(counts)
            if stored_hash != expected:
                raise ValueError(
                    f"Baseline tampered: stored hash does not match computed hash.\n"
                    f"  Stored  : {stored_hash}\n"
                    f"  Computed: {expected}\n"
                    f"  File    : {path}\n"
                    f"Re-run --update-baseline to regenerate the baseline legitimately."
                )
        return {k: int(v) for k, v in counts.items()}

    # Legacy flat-list format — migrate to count map, treat each key as max 1.
    if isinstance(data, list):
        return {key: 1 for key in data}

    raise ValueError(
        f"Baseline file must be a JSON object (new format) or array (legacy): {path}"
    )


def write_baseline(path: Path, keys_or_counts: list[str] | dict[str, int]) -> None:
    """Write a count-aware baseline JSON file (new format).

    Accepts either:
      • A pre-built count dict {key: count}  (from collect_violation_counts)
      • A plain list of keys (each treated as count=1, for backward compat
        with in-memory tests that call write_baseline directly)
    """
    if isinstance(keys_or_counts, dict):
        counts = keys_or_counts
    else:
        # Plain list → count-1 map
        counts = {key: 1 for key in keys_or_counts}

    data = {
        "hash": _compute_baseline_hash(counts),
        "counts": dict(sorted(counts.items())),
    }
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Baseline-aware report printing
# ---------------------------------------------------------------------------

def print_report_with_baseline(
    run_dir: Path,
    markup_source: str,
    violations_a: list[dict],
    violations_b: list[dict],
    warnings_c: list[dict],
    enforce: bool,
    baseline_counts: dict[str, int] | None,
) -> tuple[list[dict], list[dict]]:
    """
    Print the full report and return (new_a, new_b) — the violations that
    exceed their baselined max_allowed_count (i.e. genuine regressions).

    When baseline_counts is None (no --baseline given), all violations are
    treated as "new" and the output matches the original print_report().
    When baseline_counts is provided, each violation is compared against its
    baselined count.  A violation key is "NEW/blocking" if its current count
    exceeds the baselined max_allowed_count for that key (a key absent from
    the baseline has max_allowed_count = 0).

    Count-aware logic (STOP-15 fix):
      baselined_count = baseline_counts.get(key, 0)
      current_count   = number of times this key appears in the run
      blocking = current_count > baselined_count

    This catches the regression where the SAME draft class is emitted on 50
    block instances when only 1 was baselined.
    """
    all_hard = violations_a + violations_b
    total_hard = len(all_hard)

    if baseline_counts is None:
        # Original behaviour — no baseline awareness.
        print_report(
            run_dir=run_dir,
            markup_source=markup_source,
            violations_a=violations_a,
            violations_b=violations_b,
            warnings_c=warnings_c,
            enforce=enforce,
        )
        return violations_a, violations_b

    # ---- Compute per-key current counts ----
    current_counts: dict[str, int] = collect_violation_counts(violations_a, violations_b)

    # ---- Partition rule-(a) violations into baselined vs new ----
    # We tag each violation instance individually; "old" = within baselined allowance,
    # "new" = the excess instances that push the count over the limit.
    # To keep the output readable we group by key and report count deltas.

    # Identify which keys are blocking (current > baselined)
    blocking_keys: set[str] = set()
    for key, current in current_counts.items():
        allowed = baseline_counts.get(key, 0)
        if current > allowed:
            blocking_keys.add(key)

    new_a: list[dict] = [
        v for v in violations_a
        if violation_key_a(v["block"], v["violating_class"]) in blocking_keys
    ]
    old_a: list[dict] = [
        v for v in violations_a
        if violation_key_a(v["block"], v["violating_class"]) not in blocking_keys
    ]

    new_b: list[dict] = [
        v for v in violations_b
        if violation_key_b(v["block"], v["sourceMode"]) in blocking_keys
    ]
    old_b: list[dict] = [
        v for v in violations_b
        if violation_key_b(v["block"], v["sourceMode"]) not in blocking_keys
    ]

    total_new = len(new_a) + len(new_b)
    total_baselined = len(old_a) + len(old_b)
    status_label = "FAIL" if (enforce and total_new) else "PASS"
    mode_label = "--enforce --baseline" if enforce else "--report (informational)"

    print(_hr("═"))
    print(f"  R-31-15 Anti-Mirror Gate — {status_label}")
    print(f"  Run dir  : {run_dir.name}")
    print(f"  Mode     : {mode_label}")
    print(f"  Source   : {markup_source or '(not found)'}")
    print(_hr("═"))

    # --- Rule (a) ---
    print(f"\nRule (a) Draft-class containers : {len(violations_a)} violation(s) "
          f"({total_baselined} within baseline, {total_new} NEW/blocking)")
    if violations_a:
        print(_hr())
        # Baselined group
        if old_a:
            print(f"  Baselined (legacy — grandfathered, {len(old_a)} instance(s)):")
            for v in old_a:
                key = violation_key_a(v["block"], v["violating_class"])
                allowed = baseline_counts.get(key, 0)
                current = current_counts.get(key, 0)
                print(
                    f"    · baselined: wp:{v['block']} carries '{v['violating_class']}' "
                    f"[{current}/{allowed} allowed]"
                )
        # New / blocking group
        if new_a:
            print(f"  NEW/blocking — count exceeded baseline ({len(new_a)} instance(s)):")
            # Deduplicate by key for the detailed message
            reported: set[str] = set()
            for v in new_a:
                key = violation_key_a(v["block"], v["violating_class"])
                if key in reported:
                    continue
                reported.add(key)
                cls = v["violating_class"]
                blk = v["block"]
                current = current_counts.get(key, 0)
                allowed = baseline_counts.get(key, 0)
                print(
                    f"  ✗ NEW mirror violation not in the baseline: "
                    f"wp:{blk} carries draft class '{cls}' "
                    f"[current={current}, allowed={allowed}]. "
                    f"The converter introduced a NEW draft-class container (or increased "
                    f"an existing one) — fix it or, if intended, regenerate the baseline "
                    f"with --update-baseline."
                )

    # --- Rule (b) ---
    total_b_new = len(new_b)
    total_b_old = len(old_b)
    print(f"\nRule (b) Bound sourceMode       : {len(violations_b)} violation(s) "
          f"({total_b_old} within baseline, {total_b_new} NEW/blocking)")
    if violations_b:
        print(_hr())
        for v in old_b:
            key = violation_key_b(v["block"], v["sourceMode"])
            allowed = baseline_counts.get(key, 0)
            current = current_counts.get(key, 0)
            print(
                f"    · baselined: wp:{v['block']} sourceMode='{v['sourceMode']}' "
                f"[{current}/{allowed} allowed]"
            )
        reported_b: set[str] = set()
        for v in new_b:
            key = violation_key_b(v["block"], v["sourceMode"])
            if key in reported_b:
                continue
            reported_b.add(key)
            blk = v["block"]
            sm = v["sourceMode"]
            current = current_counts.get(key, 0)
            allowed = baseline_counts.get(key, 0)
            print(
                f"  ✗ NEW mirror violation not in the baseline: "
                f"wp:{blk} has sourceMode='{sm}' "
                f"[current={current}, allowed={allowed}]. "
                f"The converter introduced a NEW bound sourceMode (or increased "
                f"an existing one) — fix it or, if intended, regenerate the baseline "
                f"with --update-baseline."
            )

    # --- Rule (c) ---
    print(f"\nRule (c) D2-stranded layout CSS : {len(warnings_c)} warning(s) [soft, informational]")
    if warnings_c:
        print(_hr())
        by_prop: dict[str, int] = {}
        for w in warnings_c:
            by_prop[w["property"]] = by_prop.get(w["property"], 0) + 1
        for prop, cnt in sorted(by_prop.items(), key=lambda x: -x[1]):
            print(f"  {cnt:3}× {prop}")
        print(_hr())
        print("  Sample (first 10):")
        for w in warnings_c[:10]:
            print(f"       [{w['property']}] {w['selector'].strip()[:70]}")
            print(f"              → {w['declaration'][:90]}")

    # --- Summary ---
    print()
    print(_hr("─"))
    print(
        f"  SUMMARY: {total_hard} total violation(s) "
        f"[{total_baselined} within baseline / {total_new} NEW/blocking]  "
        f"|  {len(warnings_c)} warning(s)"
    )
    print(f"  Hard violations = rule (a) + (b).  Warnings (c) never block.")
    if total_new == 0:
        print(f"  RESULT: PASS — {total_baselined} legacy violation(s) grandfathered; "
              f"no NEW mirror-cheat violations detected.")
    else:
        if enforce:
            print(
                f"  RESULT: FAIL — {total_new} NEW/blocking violation(s). "
                f"The current occurrence count exceeds the baselined maximum. "
                f"Fix the converter or run --update-baseline if the violation is intentional."
            )
        else:
            print(f"  RESULT: FAIL (report mode — exits 0, informational only).")
    print(_hr("─"))

    return new_a, new_b


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="R-31-15 anti-mirror gate: detect when the converter cheated.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "run_dir",
        nargs="?",
        default=None,
        help="Path to a pipeline-state/<run> directory. "
             "Defaults to the most recent run.",
    )
    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--report",
        action="store_true",
        default=True,
        help="Informational mode (default): print violations, always exit 0.",
    )
    mode_group.add_argument(
        "--enforce",
        action="store_true",
        default=False,
        help="Enforce mode: exit non-zero on NEW (a)/(b) violations not in --baseline. "
             "Without --baseline, ANY (a)/(b) violation triggers exit 1.",
    )
    parser.add_argument(
        "--baseline",
        metavar="PATH",
        default=None,
        help="Path to a baseline JSON file (list of stable violation keys). "
             "When given with --enforce, baselined keys are grandfathered; "
             "only NEW keys (absent from the baseline) cause exit 1.",
    )
    parser.add_argument(
        "--update-baseline",
        metavar="PATH",
        default=None,
        dest="update_baseline",
        help="Write the current violation keys to the given path as a sorted "
             "JSON array, then exit 0.  The ONLY sanctioned way to change the baseline.",
    )
    args = parser.parse_args(argv)

    enforce = args.enforce

    # Resolve run_dir
    if args.run_dir:
        run_dir = Path(args.run_dir)
        if not run_dir.is_dir():
            print(f"ERROR: run_dir not found: {run_dir}", file=sys.stderr)
            return 2
    else:
        run_dir = latest_run_dir(PIPELINE_STATE_DIR)
        if run_dir is None:
            print(
                f"ERROR: no pipeline-state runs found under {PIPELINE_STATE_DIR}",
                file=sys.stderr,
            )
            return 2

    # Load markup
    markup, markup_source = load_block_markup(run_dir)
    if not markup:
        print(
            f"ERROR: no block markup found in {run_dir} "
            f"(checked extract.patched.json + extract.json)",
            file=sys.stderr,
        )
        return 2

    # Parse blocks
    blocks = parse_block_markup(markup)

    # Run checks
    violations_a = check_a_draft_class_containers(blocks)
    violations_b = check_b_bound_source_mode(blocks)
    warnings_c = check_c_d2_stranded_layout(run_dir)

    # ---- --update-baseline mode ----
    if args.update_baseline:
        counts = collect_violation_counts(violations_a, violations_b)
        out_path = Path(args.update_baseline)
        write_baseline(out_path, counts)
        print(
            f"Wrote {len(counts)} baseline key(s) to {out_path} "
            f"(count-aware format with SHA-256 self-blessing hash)."
        )
        return 0

    # ---- Load baseline (if supplied) ----
    baseline_counts: dict[str, int] | None = None
    if args.baseline:
        baseline_path = Path(args.baseline)
        if not baseline_path.exists():
            print(
                f"ERROR: baseline file not found: {baseline_path}",
                file=sys.stderr,
            )
            return 2
        try:
            baseline_counts = load_baseline(baseline_path)
        except (json.JSONDecodeError, ValueError) as exc:
            print(f"ERROR: could not load baseline file: {exc}", file=sys.stderr)
            return 2

    # ---- Print report (baseline-aware) ----
    if baseline_counts is not None:
        new_a, new_b = print_report_with_baseline(
            run_dir=run_dir,
            markup_source=markup_source,
            violations_a=violations_a,
            violations_b=violations_b,
            warnings_c=warnings_c,
            enforce=enforce,
            baseline_counts=baseline_counts,
        )
        total_new = len(new_a) + len(new_b)
        if enforce and total_new:
            return 1
        return 0

    # ---- Original behaviour (no baseline) ----
    print_report(
        run_dir=run_dir,
        markup_source=markup_source,
        violations_a=violations_a,
        violations_b=violations_b,
        warnings_c=warnings_c,
        enforce=enforce,
    )

    total_hard = len(violations_a) + len(violations_b)

    if enforce and total_hard:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
