#!/usr/bin/env python3
"""check-enum-control-shape.py — the D812 enum control-shape GATE.

WHY THIS EXISTS
----------------
``surveys/survey-enum-control-shape.py`` is explicitly a CENSUS, not a gate (its
own module docblock says so): it resolves 129 of 282 declared enum attributes
(45%) and, for the resolved ones, measures the enum SLUG as a proxy for the
rendered label width. D812 (2026-08-26, ``decisions.md``) wrote the threshold
table the census exists to feed, and closed with:

    "The enforcing gate MUST measure the rendered label. A census may use the
    proxy; a gate may not. That is why this ships the threshold and
    deliberately no gate."

THIS script is that gate. It is a SEPARATE instrument from the census (not an
import of it, not a thin wrapper around it) — the two scripts answer different
questions with different correctness bars, and D812's own words are the reason
they must not share a resolver: a proxy that is fine for a census is exactly
what a gate is forbidden to use.

THE D812 THRESHOLD TABLE (Spec 35 SS3.1, ``decisions.md`` D812)
-----------------------------------------------------------
    2-5 options, longest RENDERED LABEL <= 12 chars  -> ToggleGroupControl
    2-5 options, longest RENDERED LABEL >  12 chars  -> SelectControl
    6-10 options                                     -> SelectControl
    >10 options                                      -> ComboboxControl

Only the 2-5 band needs a label at all -- the 6-10 and >10 bands are decided
by option COUNT alone. That is why this gate only attempts label extraction
for 2-5-option enums; asking harder for the other bands would be extra
machinery with nothing to spend it on.

RESOLUTION IN TWO STAGES, BOTH ABLE TO REFUSE
----------------------------------------------
Stage 1 (control binding) reuses the census's own proximity heuristic --
same window, same primitives, same "unresolved / shared / ambiguous" verdicts
-- because that heuristic is already proven against the corpus and re-deriving
it would just risk disagreeing with the census for no reason. A block whose
control cannot be bound is SKIPPED with a named reason. It is never counted
as compliant by omission.

Stage 2 (label extraction, 2-5 band only) reads the actual JSX around the
bound control for its RENDERED option text:
  * ``ToggleGroupControlOption ... label={ __( '...' ) }`` -- read directly.
  * ``SelectControl options={[ {label: __('...')}, ... ]}`` -- inline array,
    parsed from the JSX itself.
  * ``SelectControl options={IDENTIFIER}`` -- the identifier is a
    module-level ``const IDENTIFIER = [ ... ]`` elsewhere in the same file;
    resolved by name, not by guessing.
A control that resolves in stage 1 but whose labels cannot be found in either
shape is SKIPPED with reason ``label-extraction-failed`` -- never assumed
compliant just because *something* was found.

BASELINE / RATCHET
-------------------
The known-debt baseline (``check-enum-control-shape-baseline.json``, sibling
file) lists the pre-existing violations at the time this gate was built --
2-5-option enums with short labels currently rendering as SelectControl
instead of ToggleGroupControl (D812's own count: 85; this gate re-derives its
own count from the same corpus rather than trusting that figure -- see
``--survey`` output). ``--check`` fails ONLY on a violation NOT in the
baseline. Shrinking the baseline (fixing an entry) is always allowed; growing
it silently is not -- ``--check`` treats a baseline entry no longer reproduced
by a live scan as fine (it was fixed), and a brand new violation as a hard
fail.

USAGE
-----
    python scripts/check-enum-control-shape.py --survey      # default
    python scripts/check-enum-control-shape.py --json
    python scripts/check-enum-control-shape.py --check        # gate, ratcheted
    python scripts/check-enum-control-shape.py --self-test
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

PLUGIN = Path(__file__).resolve().parent.parent
BLOCKS = PLUGIN / "src" / "blocks"
BASELINE_PATH = Path(__file__).resolve().parent / "check-enum-control-shape-baseline.json"

# A scan that finds nothing must FAIL, never pass -- same anti-vacuity floor
# as the census this gate follows.
MIN_BLOCKS = 20
MIN_ENUMS = 100

PRIMITIVES = (
    "ToggleGroupControl",
    "ComboboxControl",
    "RadioControl",
    "FormTokenField",
    "SelectControl",
)

BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
LINE_COMMENT = re.compile(r"(?<![:'\"])//[^\n]*")

# Same proximity window as the census -- proven against the corpus already;
# re-deriving a different number here would just disagree with it for no
# reason.
WINDOW = 900

I18N_STRING = r"__\(\s*(['\"])(.*?)\1"
LABEL_KV_I18N = re.compile(r"label\s*:\s*" + I18N_STRING, re.S)
LABEL_KV_PLAIN = re.compile(r"label\s*:\s*(['\"])(.*?)\1", re.S)
TOGGLE_OPTION_LABEL = re.compile(
    r"<ToggleGroupControlOption\b[^>]*?label=\{\s*" + I18N_STRING, re.S
)
TOGGLE_OPTION_LABEL_PLAIN = re.compile(
    r"<ToggleGroupControlOption\b[^>]*?label=\"(.*?)\"", re.S
)


def strip_comments(text: str) -> str:
    """A docblock naming a component is not a mount (same rule as the census)."""
    return LINE_COMMENT.sub("", BLOCK_COMMENT.sub("", text))


def declared_enums() -> list[dict]:
    files = sorted(BLOCKS.glob("*/block.json"))
    if len(files) < MIN_BLOCKS:
        raise SystemExit(
            f"[enum-control-shape-gate] VACUOUS SCAN: {len(files)} block.json files, "
            f"expected >= {MIN_BLOCKS}."
        )
    out = []
    for f in files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for name, spec in (data.get("attributes") or {}).items():
            if isinstance(spec, dict) and isinstance(spec.get("enum"), list):
                opts = [str(o) for o in spec["enum"]]
                out.append({"block": f.parent.name, "attr": name, "count": len(opts)})
    if len(out) < MIN_ENUMS:
        raise SystemExit(
            f"[enum-control-shape-gate] VACUOUS SCAN: {len(out)} declared enums, "
            f"expected >= {MIN_ENUMS}."
        )
    return out


def find_marks(src: str, attr: str) -> list[int]:
    """Positions where `attr` is genuinely REFERENCED as an attribute (a
    variable, a destructure, `attributes.attr`, `value={ attr }`, `attr:`
    in a setAttributes call, ...) -- never where it merely appears as a
    quoted JSX PROP VALUE STRING, e.g. `kind="layout"` on
    <ContainerWrapperControls kind="layout" />. That exact shape was proven
    to false-bind sgs/card-grid's `layout` attribute to its wholly
    unrelated "Post type" SelectControl (queryPostType) 745 chars later --
    the only mark `\\blayout\\b` found in the file was the quoted prop
    value, and the proximity window then latched onto the nearest
    SelectControl of any kind. A quoted-string occurrence carries no
    binding information; excluding it is strictly more precise, never
    less -- it can only turn a false "violation"/"compliant" into a
    correctly-skipped "unresolved", never the reverse.

    A second, narrower exclusion: a SELF-FORWARDING prop, `attr={ attr` (a
    block passing its own attribute straight through to a CHILD component
    under the same name, e.g. `mediaType={ mediaType || 'image' }` handing
    off to <MediaPanelLayout>). Proven necessary: sgs/media's real
    `mediaType` control lives inside that child's own shared
    MediaTypeControl.js, invisible to this file-local scan; the ONLY marks
    `\\bmediaType\\b` found in media/edit.js were destructure/derived-const
    lines and this exact forwarding prop, and proximity to it wrongly bound
    the unrelated "Alignment" <SelectControl>. Excluding ONLY the `attr={
    attr` shape (not the reverse `X={ attr }` binding into a real local
    control, whose prop name differs from attr) keeps every genuine local
    `value={ attr }`-style binding intact.

    A THIRD exclusion: an OBJECT-LITERAL KEY (`attr: '',` -- a resetAll/
    default-value config entry) or a boolean PRESENCE CHECK (`!! attr` /
    `! attr`, an `isShown` test). Neither is control-binding evidence.
    Proven necessary: sgs/quote's real `attributionFontStyle` control lives
    inside the shared TypographyControls component (mounted with
    `prefix="attribution" showStyle`), invisible to this file-local scan;
    every mark in quote/edit.js was one of these two shapes, and proximity
    wrongly bound the unrelated "HTML tag" <SelectControl>."""
    # Exclude BOTH occurrences of a self-forwarding `attr={ attr` shape --
    # the prop-name position and the value-reference position immediately
    # after it (e.g. `mediaType={ mediaType || 'image' }` is two separate
    # `\battr\b` matches, and leaving the second one as a mark reintroduces
    # the exact false bind this exclusion exists to remove).
    excluded_starts: set[int] = set()
    for m in re.finditer(rf"\b{re.escape(attr)}\s*=\s*\{{\s*{re.escape(attr)}\b", src):
        excluded_starts.add(m.start())
        second_rel = m.group(0).rfind(attr)
        excluded_starts.add(m.start() + second_rel)

    marks = []
    for m in re.finditer(rf"\b{re.escape(attr)}\b", src):
        start, end = m.start(), m.end()
        if start in excluded_starts:
            continue
        before = src[start - 1] if start > 0 else ""
        after = src[end] if end < len(src) else ""
        if before in ("'", '"') and after in ("'", '"'):
            continue  # quoted string literal value, not a reference
        tail = src[end:end + 3].lstrip()
        if tail.startswith(":") and not tail.startswith("::"):
            continue  # object-literal key (default-value / resetAll config)
        head = src[max(0, start - 3):start]
        if head.rstrip().endswith("!"):
            continue  # boolean presence check (!attr / !!attr)
        marks.append(start)
    return marks


def resolve_control(src: str, attr: str) -> tuple[str, int | None]:
    """Same heuristic as the census. Returns (verdict, tag_start_pos).

    CLOSEST-MARK-WINS tie-break (added 2026-09-04, fixing the bug documented
    in check-enum-control-shape-baseline.json's timeline.datePosition entry).
    The original version did a bare `found[prim] = start` inside the loop --
    a plain dict assignment with no tie-break -- so whenever an attribute's
    marks fell within WINDOW of TWO same-primitive tag mounts in the same
    file, the LAST one encountered by re.finditer (i.e. the last occurrence
    in the file, not the nearest one) silently overwrote any earlier,
    closer match. That is exactly what happened to
    timeline.datePosition: its own destructure sits within WINDOW of both
    its real <SelectControl> and the unrelated, later milestoneSize
    <SelectControl>, and the function returned milestoneSize's position
    purely because it came later in the file. Tracking the minimum
    mark-to-tag distance per primitive makes the result deterministic and
    correct regardless of file layout."""
    if not src:
        return "unresolved", None
    marks = find_marks(src, attr)
    if not marks:
        return "unresolved", None
    found: dict[str, int] = {}
    best_dist: dict[str, int] = {}
    for prim in PRIMITIVES:
        for m in re.finditer(rf"<{prim}\b", src):
            start = m.start()
            in_window = [mk for mk in marks if start - WINDOW < mk < start + WINDOW]
            if not in_window:
                continue
            dist = min(abs(start - mk) for mk in in_window)
            if prim not in best_dist or dist < best_dist[prim]:
                best_dist[prim] = dist
                found[prim] = start
    if len(found) == 1:
        prim, pos = next(iter(found.items()))
        return prim, pos
    if len(found) > 1:
        return "ambiguous", None
    return "shared", None


def extract_toggle_labels(src: str, tag_start: int) -> list[str] | None:
    """Labels for every <ToggleGroupControlOption> inside the control starting
    at tag_start. Returns None if the closing tag or zero options are found."""
    close = src.find("</ToggleGroupControl>", tag_start)
    if close == -1:
        return None
    body = src[tag_start:close]
    labels = [m.group(2) for m in TOGGLE_OPTION_LABEL.finditer(body)]
    labels += [m.group(1) for m in TOGGLE_OPTION_LABEL_PLAIN.finditer(body)]
    return labels or None


def _balanced_array(src: str, open_bracket_pos: int) -> str | None:
    """Given the position of a '[' , return the balanced substring including
    both brackets, or None if unbalanced within a sane scan distance."""
    depth = 0
    for i in range(open_bracket_pos, min(len(src), open_bracket_pos + 20000)):
        ch = src[i]
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return src[open_bracket_pos : i + 1]
    return None


def extract_select_labels(src: str, tag_start: int) -> list[str] | None:
    """Labels for a <SelectControl>'s options -- inline array or a
    module-level const identifier resolved by name."""
    window_end = min(len(src), tag_start + 2000)
    forward = src[tag_start:window_end]

    m_inline = re.search(r"options=\{\s*(\[)", forward)
    if m_inline:
        abs_pos = tag_start + m_inline.start(1)
        arr = _balanced_array(src, abs_pos)
        if arr is None:
            return None
        labels = [g[1] for g in LABEL_KV_I18N.findall(arr)]
        labels += [g[1] for g in LABEL_KV_PLAIN.findall(arr)]
        return labels or None

    m_ident = re.search(r"options=\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}", forward)
    if m_ident:
        ident = m_ident.group(1)
        const_m = re.search(rf"\bconst\s+{re.escape(ident)}\s*=\s*(\[)", src)
        if not const_m:
            return None
        arr = _balanced_array(src, const_m.start(1))
        if arr is None:
            return None
        labels = [g[1] for g in LABEL_KV_I18N.findall(arr)]
        labels += [g[1] for g in LABEL_KV_PLAIN.findall(arr)]
        return labels or None

    return None


def recommend(count: int, longest: int | None) -> str:
    """The D812 table. longest is only consulted for the 2-5 band; it must be
    non-None there or the caller has a bug (2-5 rows always attempt label
    extraction before calling this)."""
    if count > 10:
        return "ComboboxControl"
    if 6 <= count <= 10:
        return "SelectControl"
    if 2 <= count <= 5:
        assert longest is not None, "2-5 band must resolve a label before recommending"
        return "ToggleGroupControl" if longest <= 12 else "SelectControl"
    return "unclassified"  # count 0/1 -- outside the table, never reached by --check


SKIP_REASONS = {
    "unresolved": "unresolved-binding",
    "shared": "shared-component",
    "ambiguous": "ambiguous-binding",
}


def evaluate(rows: list[dict], sources: dict[str, str]) -> list[dict]:
    out = []
    for row in rows:
        block, attr, count = row["block"], row["attr"], row["count"]
        src = sources.get(block, "")
        verdict, tag_start = resolve_control(src, attr)
        entry = {"block": block, "attr": attr, "count": count}

        if verdict in SKIP_REASONS:
            entry["status"] = "skip"
            entry["reason"] = SKIP_REASONS[verdict]
            out.append(entry)
            continue

        if count < 2:
            entry["status"] = "skip"
            entry["reason"] = "count-outside-table"
            out.append(entry)
            continue

        control = verdict  # a real primitive name
        entry["control"] = control

        if 2 <= count <= 5:
            labels: list[str] | None = None
            if control == "ToggleGroupControl":
                labels = extract_toggle_labels(src, tag_start)
            elif control == "SelectControl":
                labels = extract_select_labels(src, tag_start)
            else:
                # RadioControl / FormTokenField / ComboboxControl in the 2-5
                # band: not covered by the table's label-dependent branch;
                # they only get judged if the corpus ever produces one.
                entry["status"] = "skip"
                entry["reason"] = "control-type-not-covered-by-2-5-band"
                out.append(entry)
                continue
            if not labels:
                entry["status"] = "skip"
                entry["reason"] = "label-extraction-failed"
                out.append(entry)
                continue
            longest = max(len(l) for l in labels)
            entry["longestLabel"] = longest
            entry["recommended"] = recommend(count, longest)
        else:
            entry["recommended"] = recommend(count, None)

        entry["status"] = "compliant" if entry["recommended"] == control else "violation"
        out.append(entry)
    return out


def load_sources(rows: list[dict]) -> dict[str, str]:
    sources: dict[str, str] = {}
    for row in rows:
        block = row["block"]
        if block in sources:
            continue
        edit = BLOCKS / block / "edit.js"
        sources[block] = (
            strip_comments(edit.read_text(encoding="utf-8", errors="replace"))
            if edit.exists()
            else ""
        )
    return sources


def load_baseline() -> set[tuple[str, str]]:
    if not BASELINE_PATH.exists():
        return set()
    data = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    return {(e["block"], e["attr"]) for e in data.get("violations", [])}


def run_scan() -> list[dict]:
    rows = declared_enums()
    sources = load_sources(rows)
    return evaluate(rows, sources)


def cmd_survey(json_out: bool) -> int:
    results = run_scan()
    if json_out:
        print(json.dumps(results, indent=2))
        return 0

    import collections

    by_status = collections.Counter(r["status"] for r in results)
    print(f"\n  D812 ENUM CONTROL-SHAPE GATE -- {len(results)} declared enums\n")
    for k, v in by_status.most_common():
        print(f"    {k:<12}{v:>5}")

    judged = [r for r in results if r["status"] in ("compliant", "violation")]
    print(f"\n  JUDGED (label or count sufficed): {len(judged)} of {len(results)}")

    skipped = [r for r in results if r["status"] == "skip"]
    by_reason = collections.Counter(r["reason"] for r in skipped)
    print(f"  SKIPPED (blind spot, never counted as compliant): {len(skipped)}")
    for k, v in by_reason.most_common():
        print(f"    {k:<32}{v:>5}")

    violations = [r for r in results if r["status"] == "violation"]
    baseline = load_baseline()
    new_v = [r for r in violations if (r["block"], r["attr"]) not in baseline]
    known_v = [r for r in violations if (r["block"], r["attr"]) in baseline]
    print(f"\n  VIOLATIONS: {len(violations)} total "
          f"({len(known_v)} known-debt baseline, {len(new_v)} NEW)")
    for r in new_v:
        print(f"    NEW  {r['block']}.{r['attr']} -> {r['control']} "
              f"(recommend {r['recommended']}, longest={r.get('longestLabel')})")
    print()
    return 0


def cmd_check() -> int:
    results = run_scan()
    violations = [r for r in results if r["status"] == "violation"]
    baseline = load_baseline()
    new_v = [r for r in violations if (r["block"], r["attr"]) not in baseline]
    skipped = [r for r in results if r["status"] == "skip"]

    print(f"  [enum-control-shape-gate] {len(results)} enums, "
          f"{len(skipped)} skipped (blind spot), {len(violations)} violations "
          f"({len(violations) - len(new_v)} baselined, {len(new_v)} new).")

    if new_v:
        print("\n  NEW violations (not in baseline):")
        for r in new_v:
            print(f"    {r['block']}.{r['attr']}: renders {r['control']}, "
                  f"D812 table says {r['recommended']} "
                  f"(count={r['count']}, longestLabel={r.get('longestLabel')})")
        return 1

    print("  PASS -- no new violations beyond the seeded baseline.")
    return 0


def self_test() -> int:
    failures = []

    # [1] comment stripping.
    if "SelectControl" in strip_comments("/** uses SelectControl */ const x = 1;"):
        failures.append("[1] block comment not stripped")

    # [2] ToggleGroupControl resolves + its option labels are read from JSX.
    src = (
        "<ToggleGroupControl value={ closeStyle } "
        "onChange={ (v) => setAttributes({ closeStyle: v }) }>"
        "<ToggleGroupControlOption value=\"a\" label={ __( 'X icon', 'sgs-blocks' ) } />"
        "<ToggleGroupControlOption value=\"b\" label={ __( 'Close text', 'sgs-blocks' ) } />"
        "</ToggleGroupControl>"
    )
    verdict, pos = resolve_control(src, "closeStyle")
    if verdict != "ToggleGroupControl":
        failures.append(f"[2] failed to resolve ToggleGroupControl, got {verdict!r}")
    labels = extract_toggle_labels(src, pos) if pos is not None else None
    if labels != ["X icon", "Close text"]:
        failures.append(f"[2b] wrong toggle labels extracted: {labels!r}")

    # [3] SelectControl inline options array resolves labels.
    src2 = (
        "<SelectControl value={ align } "
        "options={ [ { label: __( 'Left', 'x' ), value: 'left' }, "
        "{ label: __( 'Aligned to the content column', 'x' ), value: 'wide' } ] } "
        "onChange={ (v) => setAttributes({ align: v }) } />"
    )
    verdict2, pos2 = resolve_control(src2, "align")
    if verdict2 != "SelectControl":
        failures.append(f"[3] failed to resolve SelectControl, got {verdict2!r}")
    labels2 = extract_select_labels(src2, pos2) if pos2 is not None else None
    if labels2 != ["Left", "Aligned to the content column"]:
        failures.append(f"[3b] wrong select labels extracted: {labels2!r}")

    # [4] SelectControl identifier-referenced options array resolves by name.
    src3 = (
        "const STYLE_OPTIONS = [ { label: __( 'Columns', 'x' ), value: 'columns' }, "
        "{ label: __( 'Cards', 'x' ), value: 'cards' } ];\n"
        "function Edit() { return (<SelectControl value={ style } "
        "options={STYLE_OPTIONS} onChange={ (v) => setAttributes({ style: v }) } />); }"
    )
    verdict3, pos3 = resolve_control(src3, "style")
    labels3 = extract_select_labels(src3, pos3) if pos3 is not None else None
    if labels3 != ["Columns", "Cards"]:
        failures.append(f"[4] identifier-referenced options not resolved: {labels3!r}")

    # [5] D812 table.
    for count, longest, want in ((3, 6, "ToggleGroupControl"), (3, 13, "SelectControl"),
                                  (7, None, "SelectControl"), (12, None, "ComboboxControl")):
        got = recommend(count, longest)
        if got != want:
            failures.append(f"[5] recommend({count},{longest}) = {got!r}, expected {want!r}")

    # [6] NEGATIVE CONTROL, watched failing per this session's own repeated
    # lesson (D810 case [8], add-control.js case [11]): a gate reverted to
    # SLUG-based measurement (the retired census proxy) must MISCLASSIFY the
    # one case the whole D812 table was built to catch -- a short slug with a
    # long rendered label. Prove the negative first, then prove the real path
    # gets it right.
    def _slug_based_longest(control_labels_by_slug: dict[str, str], slug_lengths: list[int]) -> int:
        return max(slug_lengths)  # the retired proxy: measures the SLUG, not the label

    slugs = ["wide"]  # 4 chars
    slug_lengths = [len(s) for s in slugs]
    real_rendered_label = "Aligned to the content column"  # 30 chars
    proxy_longest = _slug_based_longest({}, slug_lengths)
    proxy_verdict = recommend(2, proxy_longest)
    if proxy_verdict != "ToggleGroupControl":
        failures.append(
            "[6] negative-control setup itself is wrong: the slug-based proxy "
            f"was expected to WRONGLY recommend ToggleGroupControl, got {proxy_verdict!r}"
        )
    real_verdict = recommend(2, len(real_rendered_label))
    if real_verdict != "SelectControl":
        failures.append(
            f"[6b] label-based path failed the exact case the proxy gets wrong: {real_verdict!r}"
        )
    if proxy_verdict == real_verdict:
        failures.append(
            "[6c] negative control did not actually diverge from the real path -- "
            "the watched-failing case is not exercising anything"
        )

    # [7] unresolved / shared / ambiguous bindings are SKIPPED, never silently
    # counted as compliant.
    rows = [{"block": "__test__", "attr": "neverBound", "count": 3}]
    sources = {"__test__": "const x = 1;"}
    results = evaluate(rows, sources)
    if results[0]["status"] != "skip" or results[0]["reason"] != "unresolved-binding":
        failures.append(f"[7] unresolved control not skipped correctly: {results[0]!r}")

    # [8] a resolved control whose labels cannot be extracted is SKIPPED, not
    # assumed compliant.
    rows8 = [{"block": "__test__", "attr": "align", "count": 3}]
    sources8 = {
        "__test__": "<SelectControl value={ align } options={ MISSING_CONST } "
        "onChange={ (v) => setAttributes({ align: v }) } />"
    }
    results8 = evaluate(rows8, sources8)
    if results8[0]["status"] != "skip" or results8[0]["reason"] != "label-extraction-failed":
        failures.append(f"[8] unextractable labels not skipped correctly: {results8[0]!r}")

    # [10] END-TO-END real-corpus-shaped case: a ToggleGroupControl rendering
    # a genuinely long label must be a VIOLATION (the D812 table wants
    # SelectControl there). This is the exact defect class the census's own
    # slug-proxy would MISS -- a short slug can carry a long i18n label, and
    # only reading the actual JSX text catches it.
    rows10 = [{"block": "__test__", "attr": "layout", "count": 3}]
    sources10 = {
        "__test__": (
            "<ToggleGroupControl value={ layout } "
            "onChange={ (v) => setAttributes({ layout: v }) }>"
            "<ToggleGroupControlOption value=\"a\" label={ __( 'Aligned to the content column', 'x' ) } />"
            "<ToggleGroupControlOption value=\"b\" label={ __( 'Full width', 'x' ) } />"
            "</ToggleGroupControl>"
        )
    }
    results10 = evaluate(rows10, sources10)
    if results10[0]["status"] != "violation":
        failures.append(
            f"[10] a long-labelled ToggleGroupControl was not flagged as a violation: {results10[0]!r}"
        )

    # [9] the live scan must actually see the corpus (anti-vacuity floor).
    live_rows = declared_enums()
    if len(live_rows) < MIN_ENUMS:
        failures.append("[9] live scan below the anti-vacuity floor")

    # [11] REGRESSION: two <SelectControl> mounts in one file, both within
    # WINDOW of the attribute's own marks, closer one NOT last in the file
    # -- the exact shape that misattributed timeline.datePosition to
    # milestoneSize's SelectControl (see check-enum-control-shape-baseline
    # .json's entry + resolve_control's docstring). The CORRECT control
    # (datePosition's own) is FIRST in the file and genuinely close to the
    # marks; the WRONG control (milestoneSize's, an unrelated attribute)
    # is LAST in the file, farther away but still inside WINDOW. Before the
    # closest-mark-wins fix, resolve_control returned the last-iterated tag
    # (milestoneSize) regardless of distance.
    src11 = (
        "const { datePosition } = attributes;\n"
        "<SelectControl value={ datePosition } "
        "options={ [ { label: __( 'In its own column', 'x' ), value: 'column' }, "
        "{ label: __( 'Next to the title', 'x' ), value: 'inline' } ] } "
        "onChange={ (v) => setAttributes({ datePosition: v }) } />\n"
        + ("/* filler */ " * 40) +
        "\n<SelectControl value={ milestoneSize } "
        "options={ [ { label: __( 'Compact', 'x' ), value: 'compact' }, "
        "{ label: __( 'Full-height', 'x' ), value: 'full' } ] } "
        "onChange={ (v) => setAttributes({ milestoneSize: v }) } />"
    )
    verdict11, pos11 = resolve_control(strip_comments(src11), "datePosition")
    correct_tag_pos = strip_comments(src11).find("<SelectControl value={ datePosition }")
    if verdict11 != "SelectControl":
        failures.append(f"[11] failed to resolve SelectControl, got {verdict11!r}")
    elif pos11 != correct_tag_pos:
        wrong_tag_pos = strip_comments(src11).find("<SelectControl value={ milestoneSize }")
        got = "milestoneSize's control" if pos11 == wrong_tag_pos else f"position {pos11}"
        failures.append(
            f"[11] closest-mark-wins tie-break regressed: bound to {got} "
            f"instead of the closer datePosition control at {correct_tag_pos}"
        )

    for f in failures:
        print("  FAIL " + f)
    if failures:
        print(f"\n  self-test: {len(failures)} failure(s).")
        return 1
    print(f"  self-test: 11 case(s) passed, including a watched-failing negative "
          f"control and a closest-mark-wins regression case. "
          f"Corpus: {len(live_rows)} declared enums.")
    return 0


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    if "--check" in sys.argv:
        return cmd_check()
    return cmd_survey("--json" in sys.argv)


if __name__ == "__main__":
    sys.exit(main())
