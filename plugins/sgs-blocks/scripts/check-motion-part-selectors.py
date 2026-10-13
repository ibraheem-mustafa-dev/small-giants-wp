#!/usr/bin/env python3
"""check-motion-part-selectors.py - every declared motion part reaches an element (Spec 38A section 6.2, FR-38A-16).

THE RULE: `includes/motion/class-sgs-motion-targets.php::Sgs_Motion_Targets::resolve` turns a part of a motion block
(`supports.sgs.motion` truthy, parts in `supports.sgs.elements`) into a selector. A part with a declared `selector`
uses it; any other part uses `.sgs-<slug>__<part>`. A part with neither a selector nor an element carrying that class
matches nothing, so a motion layer on it is silently lost.

HOW A PART RESOLVES (a part keyed `root`, or with `isWrapper: true`, is the root and is skipped)
  declared    the part has a `selector` key (one compound class, or classes joined by descendant spaces)
  bem         the class `sgs-<slug>__<part>` appears literally in the block's render source (render.php and the
              own-folder partials it requires, read through scripts/lib/block_source_files.py, then every other .php
              file in the block folder, which holds the require_once partials; a static block with no
              render.php is read from save.js) or in a shared include that names this block's class
  unresolved  neither; --survey prints the candidate real classes (a class the source emits whose element name holds
              the part name, or a word of its label)

MODES
  --survey [--json]  every part with how it resolves, and the counts
  --check            exit 1 on any unresolved part not in the allow-list, and on a declared selector that is not a class
                     selector, or whose last class the block never emits
  --self-test        plants (in temp copies) a part with no selector and no class (caught), a declared selector (passes),
                     a BEM-class part (passes), a declared selector naming a class the block never emits (caught)

EXCEPTIONS live in plugins/sgs-blocks/scripts/data/motion-gate-allowlist.json (gate "motion-part-selectors"; pattern is
`<block slug>:<part>`). An entry that matches no unresolved part is an error, and so is one whose delete_in_unit landed.

Run from the repo root:  python plugins/sgs-blocks/scripts/check-motion-part-selectors.py --survey|--check|--self-test
"""
from __future__ import annotations

import argparse
import subprocess
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(SCRIPTS / "lib"))
import motion_gate_allowlist as allowlist  # noqa: E402
import block_source_files as bsf  # noqa: E402

REPO = SCRIPTS.parents[2]
BLOCKS = REPO / "plugins" / "sgs-blocks" / "src" / "blocks"
INCLUDES = REPO / "plugins" / "sgs-blocks" / "includes"
GATE = "motion-part-selectors"
# Parts whose real class is not the kebab-case of the part key, each confirmed by reading the element in the render
# source (the element is emitted once, its tag is the text the part's label names): `block:part` -> element class.
CONFIRMED = {
    "testimonial:quote-text": "sgs-testimonial__quote",
    "testimonial:reviewer-name": "sgs-testimonial__name",
    "testimonial:reviewer-role": "sgs-testimonial__role",
}
SELECTOR_OK = re.compile(r"^\.[A-Za-z][A-Za-z0-9_-]*(?: \.[A-Za-z][A-Za-z0-9_-]*)*$")


def source_text(block_dir: Path) -> str:
    """The block's render source; a block with no render.php is read from save.js."""
    if (block_dir / "render.php").is_file():
        first = bsf.render_files(block_dir)
        files = first + [f for f in bsf.block_php_files(block_dir) if f not in first]
        return "\n".join(f.read_text(encoding="utf-8", errors="replace") for f in files)
    save = block_dir / "save.js"
    return save.read_text(encoding="utf-8", errors="replace") if save.is_file() else ""


def include_text(includes: Path) -> list[str]:
    return [p.read_text(encoding="utf-8", errors="replace") for p in sorted(includes.rglob("*.php"))] if includes.is_dir() else []


def emitted_elements(text: str, slug: str) -> set[str]:
    """Element names of `sgs-<slug>__<element>` classes literally present in `text`, outside CSS selectors."""
    # A class written after a dot is a CSS selector or a comment about one, not an element carrying it.
    return set(re.findall(r"(?<![.\w-])sgs-" + re.escape(slug) + r"__([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)", text))


def kebab(part: str) -> str:
    return re.sub(r"(?<=[a-z0-9])([A-Z])", r"-\1", part).lower()


def candidates(part: str, label: str, elements: set[str]) -> list[str]:
    words = {w for w in re.split(r"[^a-z0-9]+", (label or "").lower()) if len(w) > 2}
    part_l = part.lower()
    found = sorted(e for e in elements if part_l in e.lower() or e.lower() in part_l or kebab(part) in e.lower()
                   or any(w in e.lower().split("-") for w in words))
    return found


def survey(blocks: Path, includes: Path) -> list[dict]:
    rows: list[dict] = []
    shared = include_text(includes)
    for block_json in sorted(blocks.glob("*/block.json")):
        data = json.loads(block_json.read_text(encoding="utf-8"))
        sgs = (data.get("supports") or {}).get("sgs") or {}
        if not sgs.get("motion"):
            continue
        slug = data["name"].split("/", 1)[-1]
        text = source_text(block_json.parent)
        shared_hit = [t for t in shared if f"sgs-{slug}__" in t]
        emitted = emitted_elements(text, slug)
        for part, spec in (sgs.get("elements") or {}).items():
            spec = spec or {}
            if part == "root" or spec.get("isWrapper"):
                continue
            cls = f"sgs-{slug}__{part}"
            row = {"block": slug, "part": part, "label": spec.get("label") or "", "file": block_json.as_posix(), "candidates": []}
            if "selector" in spec:
                row["how"], row["selector"] = "declared", spec["selector"]
            elif part in emitted or any(part in emitted_elements(t, slug) for t in shared_hit):
                row["how"] = "bem"
            else:
                row["how"] = "unresolved"
                row["candidates"] = candidates(part, row["label"], emitted)
                row["exact"] = f"sgs-{slug}__{kebab(part)}" if kebab(part) in emitted and kebab(part) != part else None
                confirmed = CONFIRMED.get(f"{slug}:{part}")
                if confirmed and confirmed.split("__", 1)[1] in emitted:
                    row["exact"] = confirmed
            rows.append(row)
    return rows


def declared_problems(rows: list[dict], blocks: Path) -> list[str]:
    """A declared selector must be a class selector, and its last class must be one the block emits."""
    problems = []
    for r in rows:
        if r["how"] != "declared":
            continue
        sel = r["selector"]
        if not isinstance(sel, str) or not SELECTOR_OK.match(sel):
            problems.append(f"{r['block']}:{r['part']} declared selector {sel!r} is not a class selector (classes joined by single spaces)")
            continue
        last = sel.split(" ")[-1][1:]
        block_dir = blocks / r["block"]
        if last not in source_text(block_dir):
            problems.append(f"{r['block']}:{r['part']} declared selector {sel!r}: the block's render source never emits {last!r}")
    return problems


def evaluate(rows: list[dict], blocks: Path, allow: list[dict], allow_errors: list[str]) -> tuple[list[str], list[str]]:
    allowed = {e["pattern"] for e in allow}
    errors = [f"allow-list: {e}" for e in allow_errors] + declared_problems(rows, blocks)
    notes: list[str] = []
    keys = set()
    for r in rows:
        if r["how"] != "unresolved":
            continue
        key = f"{r['block']}:{r['part']}"
        keys.add(key)
        line = f"[{key}] part {r['part']!r} ({r['label']}) has no selector and no class sgs-{r['block']}__{r['part']}; candidates: {r['candidates'] or 'none'}"
        (notes if key in allowed else errors).append(("allowed " if key in allowed else "") + line)
    errors += [f"allow-list: pattern {p!r} matches no unresolved part" for p in sorted(allowed - keys)]
    return errors, notes


def counts(rows: list[dict]) -> str:
    return ", ".join(f"{h}={sum(1 for r in rows if r['how'] == h)}" for h in ("declared", "bem", "unresolved")) + f", total={len(rows)}"


def run_survey(blocks: Path, includes: Path, as_json: bool) -> int:
    rows = survey(blocks, includes)
    if as_json:
        print(json.dumps(rows, indent=1))
        return 0
    for r in rows:
        extra = f" selector={r['selector']}" if r["how"] == "declared" else (f" candidates={r['candidates']}" if r["how"] == "unresolved" else "")
        print(f"{r['how']:<10} {r['block']}:{r['part']}{extra}")
    print(f"survey: {counts(rows)}")
    return 0


def run_check(blocks: Path, includes: Path) -> int:
    rows = survey(blocks, includes)
    allow, allow_errors = allowlist.load(REPO, GATE)
    errors, notes = evaluate(rows, blocks, allow, allow_errors)
    for n in notes:
        print(f"note: {n}")
    for e in errors:
        print(f"FAIL: {e}")
    print(f"check-motion-part-selectors: {'FAIL' if errors else 'OK'} ({counts(rows)})")
    return 1 if errors else 0


def insert_selector(text: str, part: str, selector: str) -> str | None:
    """`text` with `"selector"` added as the first key of the part's entry inside `elements`, or None when the entry is not found exactly once."""
    head = re.search(r'"elements"[ \t]*:[ \t]*\{[ \t]*\r?\n([ \t]*)', text)
    if head is None:
        return None
    start, child_indent = head.start(), head.group(1)
    hits = list(re.finditer(r'^(' + re.escape(child_indent) + r')"' + re.escape(part) + r'"[ \t]*:[ \t]*\{[ \t]*\r?\n([ \t]*)', text[start:], re.M))
    if len(hits) != 1:
        return None
    m = hits[0]
    eol = "\r\n" if "\r\n" in text else "\n"
    at = start + m.end(2)
    return text[:at] + f'"selector": "{selector}",{eol}{m.group(2)}' + text[at:]


def run_fix(blocks: Path, includes: Path, apply: bool) -> int:
    """Add a selector to every fixable part. One read and one atomic write per block.json; a file with uncommitted changes is skipped."""
    by_file: dict[str, list[dict]] = {}
    for r in survey(blocks, includes):
        if r["how"] == "unresolved" and r.get("exact"):
            by_file.setdefault(r["file"], []).append(r)
    done = skipped = 0
    for file, parts in by_file.items():
        path = Path(file)
        if subprocess.run(["git", "diff", "--quiet", "--", str(path)], cwd=REPO).returncode != 0:
            for r in parts:
                print(f"SKIP dirty {path.parent.name}/block.json {r['block']}:{r['part']}")
            skipped += len(parts)
            continue
        with open(path, encoding="utf-8", newline="") as fh:
            text = fh.read()
        expected = json.loads(text)
        for r in parts:
            selector = "." + r["exact"]
            expected["supports"]["sgs"]["elements"][r["part"]]["selector"] = selector
            edited = insert_selector(text, r["part"], selector)
            if edited is None:
                print(f"REFUSE {r['block']}:{r['part']} (entry not found exactly once)")
                skipped += 1
                continue
            text = edited
            print(f"{'WRITE' if apply else 'would write'} {r['block']}:{r['part']} -> {selector}")
            done += 1
        if json.loads(text) != expected:
            print(f"REFUSE {path.parent.name}/block.json: the edit changed more than the selector keys")
            skipped += len(parts)
            continue
        if apply:
            tmp = path.with_suffix(".json.tmp")
            with open(tmp, "w", encoding="utf-8", newline="") as fh:
                fh.write(text)
            tmp.replace(path)
    print(f"fix: {done} part(s) {'written' if apply else 'would be written'}, {skipped} skipped")
    return 0


def _plant(root: Path, name: str, part_spec: dict, render: str) -> None:
    folder = root / name
    folder.mkdir(parents=True)
    block = {"name": f"sgs/{name}", "supports": {"sgs": {"motion": True, "elements": {
        "box": {"label": "Box", "isWrapper": True}, "thing": part_spec}}}}
    (folder / "block.json").write_text(json.dumps(block), encoding="utf-8")
    (folder / "render.php").write_text(render, encoding="utf-8")


def self_test() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="motion-part-sel-"))
    failures = 0
    try:
        empty_includes = tmp / "includes"
        empty_includes.mkdir()
        _plant(tmp, "bare", {"label": "Thing"}, "<?php echo '<div class=\"sgs-bare__other\"></div>';")
        _plant(tmp, "chosen", {"label": "Thing", "selector": ".sgs-chosen__real"}, "<?php echo '<i class=\"sgs-chosen__real\"></i>';")
        _plant(tmp, "classed", {"label": "Thing"}, "<?php echo '<i class=\"sgs-classed__thing\"></i>';")
        _plant(tmp, "dangling", {"label": "Thing", "selector": ".sgs-dangling__gone"}, "<?php echo '<i class=\"sgs-dangling__other\"></i>';")
        rows = {f"{r['block']}": r for r in survey(tmp, empty_includes)}
        problems = declared_problems(list(rows.values()), tmp)
        cases = [
            ("no selector and no class is unresolved", rows["bare"]["how"] == "unresolved"),
            ("a part whose name matches no emitted class has no candidate", rows["bare"]["candidates"] == []),
            ("a declared selector passes", rows["chosen"]["how"] == "declared" and not any("chosen" in p for p in problems)),
            ("a BEM-class part passes", rows["classed"]["how"] == "bem"),
            ("a declared selector the block never emits is caught", any("dangling" in p for p in problems)),
        ]
        errors, _ = evaluate(list(rows.values()), tmp, [], [])
        cases.append(("evaluate fails on the bare part only", any("bare:thing" in e for e in errors) and not any("chosen" in e or "classed" in e for e in errors)))
        errors, notes = evaluate(list(rows.values()), tmp, [{"pattern": "bare:thing"}], [])
        cases.append(("an allow-listed part is a note, not an error", not any("bare:thing" in e for e in errors) and any("bare:thing" in n for n in notes)))
        errors, _ = evaluate(list(rows.values()), tmp, [{"pattern": "bare:thing"}, {"pattern": "gone:part"}], [])
        cases.append(("a stale allow-list entry is an error", any("gone:part" in e for e in errors)))
        for label, ok in cases:
            failures += 0 if ok else 1
            print(f"  {'ok  ' if ok else 'MISS'} {label}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"self-test: {'FAIL' if failures else 'OK'}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--survey", action="store_true", help="print how every declared part resolves")
    group.add_argument("--fix", action="store_true", help="add a selector where the camelCase part has exactly one kebab-case class of the same name (diff only without --apply)")
    group.add_argument("--check", action="store_true", help="exit 1 on an unresolved part not in the allow-list")
    group.add_argument("--self-test", action="store_true", help="planted failures must be caught; the controls must pass")
    parser.add_argument("--apply", action="store_true", help="with --fix: write the files")
    parser.add_argument("--json", action="store_true", help="with --survey: JSON output")
    parser.add_argument("--blocks", type=Path, default=BLOCKS, help="blocks folder (default: the plugin's src/blocks)")
    parser.add_argument("--includes", type=Path, default=INCLUDES, help="shared includes folder")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.fix:
        return run_fix(args.blocks, args.includes, args.apply)
    if args.survey:
        return run_survey(args.blocks, args.includes, args.json)
    return run_check(args.blocks, args.includes)


if __name__ == "__main__":
    sys.exit(main())
