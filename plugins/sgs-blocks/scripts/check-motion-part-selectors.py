#!/usr/bin/env python3
"""check-motion-part-selectors.py - every declared motion part reaches an element (Spec 38A section 6.2, FR-38A-16).

THE RULE: `includes/motion/class-sgs-motion-targets.php::Sgs_Motion_Targets::resolve` turns a part of a motion block
(`supports.sgs.motion` truthy, parts in `supports.sgs.elements`) into a selector. A part with a declared `selector`
uses it; any other part uses `.sgs-<slug>__<part>`. A part with neither a selector nor an element carrying that class
matches nothing, so a motion layer on it is silently lost.

HOW A PART RESOLVES (a part keyed `root`, or with `isWrapper: true`, is the root and is skipped)
  excluded    the part is marked `"motion": false`: an element the block does not print itself (an InnerBlocks child,
              a state of another element, a pseudo-element, a styling-only grouping, an element built at run time by
              JS, third-party markup, or markup printed outside the block root). Spec 38A section 6.2: it is not a
              target, and the renderer (Sgs_Motion_Targets::parts), seed_motion_fields.py, check-motion-db-rows.py and
              TargetPicker.js all leave it out
  declared    the part has a `selector` key (one compound class, or classes joined by descendant spaces)
  bem         the class `sgs-<slug>__<part>` appears literally in the block's render source (render.php and the
              own-folder partials it requires, read through scripts/lib/block_source_files.py, then every other .php
              file in the block folder, which holds the require_once partials; a static block with no
              render.php is read from save.js) or in a shared include that names this block's class; or the part is
              `content-band` and the render calls SGS_Container_Wrapper::render, which prints the band with
              `sgs-<slug>__content-band` (built from the block name, so it is never a literal) as the root's direct
              child. The band is guaranteed because the wrapper forces it whenever sgsMotion names `content-band` or
              `inner` (`Sgs_Motion_Targets::names_band`), unless the caller passes `wrap_inner` false (hero's split
              layout); without that force in the wrapper source the band does not count and the part is unresolved
  unresolved  none of these; --survey prints the candidate real classes (a class the source emits whose element name
              holds the part name, or a word of its label)

MODES
  --survey [--json]  every part with how it resolves, and the counts
  --check            exit 1 on any unresolved part not in the allow-list, on a `motion` value other than false, and on a
                     declared selector that is not a class selector, or whose last class neither the block's render
                     source, a shared include, a helper that builds it from a BEM root argument (BUILT), nor the
                     container wrapper's band class prints (a whole class token: not after a dot, which is a CSS
                     selector, and not part of a longer class name)
  --self-test        plants (in temp copies) a part with no selector and no class (caught), a declared selector (passes),
                     a BEM-class part (passes), a declared selector naming a class the block never emits (caught), an
                     excluded part (passes), a `motion` value other than false (caught), a wrapper block's content-band
                     (passes), the same without the wrapper's motion band force (caught), a declared selector naming the
                     wrapper's band class (passes), a declared class that is only a prefix of a printed class (caught)
                     and a declared class printed only after a dot, in a CSS selector string (caught)

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
WRAPPER_CALL = "SGS_Container_Wrapper::render"
WRAPPER_PART = "content-band"
WRAPPER_FILE = "class-sgs-container-wrapper.php"
WRAPPER_FORCE = "Sgs_Motion_Targets::names_band"
# Parts whose real class is not the kebab-case of the part key, each confirmed by reading the element in the render
# source (the element is emitted once, its tag is the text the part's label names): `block:part` -> element class.
CONFIRMED = {
    "testimonial:quote-text": "sgs-testimonial__quote",
    "testimonial:reviewer-name": "sgs-testimonial__name",
    "testimonial:reviewer-role": "sgs-testimonial__role",
}
# Classes a shared helper builds from a BEM root argument, so the whole class is never a literal: class -> (helper, the
# class template the helper prints). `helper_built` proves each one: the helper is defined with that template and is
# called with the class's root as a literal argument.
BUILT = {
    "sgs-nav-bar-menu__badge": ("sgs_nav_shared_badge_html", 'class="%1$s__badge"'),
    "sgs-nav-drawer-menu__badge": ("sgs_nav_shared_badge_html", 'class="%1$s__badge"'),
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


def prints_class(text: str, cls: str) -> bool:
    """Whether `cls` appears in `text` as a whole class token, by the rule `emitted_elements` uses: not after a dot (a
    CSS selector or a comment about one) and not part of a longer class name."""
    return re.search(r"(?<![.\w-])" + re.escape(cls) + r"(?![\w-])", text) is not None


def helper_built(texts: list[str], cls: str) -> bool:
    """Whether a `BUILT` class is printed: its helper is defined with the template and called with the class's root."""
    if cls not in BUILT:
        return False
    helper, template = BUILT[cls]
    root = cls.split("__", 1)[0]
    defined = any(f"function {helper}(" in t and template in t for t in texts)
    called = any(re.search(re.escape(helper) + r"\([^\n]*'" + re.escape(root) + r"'", t) for t in texts)
    return defined and called


def wrapper_forces_band(includes: Path) -> bool:
    """Whether the container wrapper prints the band whenever sgsMotion names a band part."""
    wrapper = includes / WRAPPER_FILE
    return wrapper.is_file() and WRAPPER_FORCE in wrapper.read_text(encoding="utf-8", errors="replace")


def wrapper_band(text: str, slug: str, forced: bool) -> str:
    """The band class SGS_Container_Wrapper::render prints for this block (`sgs-<slug>__content-band`), or ''."""
    return f"sgs-{slug}__{WRAPPER_PART}" if forced and WRAPPER_CALL in text else ""


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
    forced = wrapper_forces_band(includes)
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
            if "motion" in spec:
                row["motion"] = spec["motion"]
            if spec.get("motion") is False:
                row["how"] = "excluded"
            elif "selector" in spec:
                row["how"], row["selector"] = "declared", spec["selector"]
            elif part in emitted or any(part in emitted_elements(t, slug) for t in shared_hit) or (
                    part == WRAPPER_PART and wrapper_band(text, slug, forced)):
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


def declared_problems(rows: list[dict], blocks: Path, includes: Path) -> list[str]:
    """A `motion` key is only ever false; a declared selector is a class selector whose last class something prints.

    The last class must appear as a whole class token (`prints_class`) in the block's render source or in a shared
    include (the cart panel, value ladder and nav markup helpers print classes for several blocks), be built by a shared
    helper from a BEM root argument (`BUILT`, proved by `helper_built`), or be the container wrapper's band class.
    """
    problems = []
    shared = include_text(includes)
    forced = wrapper_forces_band(includes)
    for r in rows:
        if "motion" in r and r["motion"] is not False:
            problems.append(f"{r['block']}:{r['part']} has \"motion\": {r['motion']!r}; the only allowed value is false")
        if r["how"] != "declared":
            continue
        sel = r["selector"]
        if not isinstance(sel, str) or not SELECTOR_OK.match(sel):
            problems.append(f"{r['block']}:{r['part']} declared selector {sel!r} is not a class selector (classes joined by single spaces)")
            continue
        last = sel.split(" ")[-1][1:]
        text = source_text(blocks / r["block"])
        if not prints_class(text, last) and not any(prints_class(s, last) for s in shared) and not helper_built([text, *shared], last) and last != wrapper_band(text, r["block"], forced):
            problems.append(f"{r['block']}:{r['part']} declared selector {sel!r}: neither the block's render source nor a shared include prints {last!r}")
    return problems


def evaluate(rows: list[dict], blocks: Path, includes: Path, allow: list[dict], allow_errors: list[str]) -> tuple[list[str], list[str]]:
    allowed = {e["pattern"] for e in allow}
    errors = [f"allow-list: {e}" for e in allow_errors] + declared_problems(rows, blocks, includes)
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
    return ", ".join(f"{h}={sum(1 for r in rows if r['how'] == h)}" for h in ("declared", "bem", "excluded", "unresolved")) + f", total={len(rows)}"


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
    errors, notes = evaluate(rows, blocks, includes, allow, allow_errors)
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


HELPER_DEF = "function sgs_nav_shared_badge_html( $badge, $root ) { return sprintf( '<span class=\"%1$s__badge\">%2$s</span>', $root, $badge ); }"


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
        _plant(tmp, "skipped", {"label": "Thing", "motion": False}, "<?php echo '<div></div>';")
        _plant(tmp, "badflag", {"label": "Thing", "motion": "no"}, "<?php echo '<i class=\"sgs-badflag__thing\"></i>';")
        _plant(tmp, "banded", {"label": "Thing", "selector": ".sgs-banded__content-band"}, "<?php echo SGS_Container_Wrapper::render( $a, $b, $c );")
        _plant(tmp, "shared", {"label": "Thing", "selector": ".sgs-helper__thing"}, "<?php echo sgs_helper_markup();")
        (empty_includes / "helper.php").write_text("<?php function sgs_helper_markup() { return '<i class=\"sgs-helper__thing\"></i>'; }", encoding="utf-8")
        _plant(tmp, "prefix", {"label": "Thing", "selector": ".sgs-cart__pan"}, "<?php echo '<ul class=\"sgs-cart__panel-items\"></ul>';")
        _plant(tmp, "cssonly", {"label": "Thing", "selector": ".sgs-cssonly__ghost"}, "<?php $css = '.' . $uid . ' .sgs-cssonly__ghost{color:red}'; echo '<i class=\"sgs-cssonly__other\"></i>';")
        (empty_includes / WRAPPER_FILE).write_text("<?php if ( Sgs_Motion_Targets::names_band( $attributes ) ) { $do_wrap = true; }", encoding="utf-8")
        band_dir = tmp / "bandpart"
        _plant(tmp, "bandpart", {"label": "Thing"}, "<?php echo SGS_Container_Wrapper::render( $a, $b, $c );")
        data = json.loads((band_dir / "block.json").read_text(encoding="utf-8"))
        data["supports"]["sgs"]["elements"] = {"content-band": {"label": "Content band"}}
        (band_dir / "block.json").write_text(json.dumps(data), encoding="utf-8")
        rows = {f"{r['block']}": r for r in survey(tmp, empty_includes)}
        problems = declared_problems(list(rows.values()), tmp, empty_includes)
        unforced_includes = tmp / "unforced"
        unforced_includes.mkdir()
        (unforced_includes / WRAPPER_FILE).write_text("<?php $do_wrap = $has_band_props;", encoding="utf-8")
        unforced = {r["block"]: r for r in survey(tmp, unforced_includes)}
        unforced_problems = declared_problems(list(unforced.values()), tmp, unforced_includes)
        cases = [
            ("no selector and no class is unresolved", rows["bare"]["how"] == "unresolved"),
            ("a part whose name matches no emitted class has no candidate", rows["bare"]["candidates"] == []),
            ("a declared selector passes", rows["chosen"]["how"] == "declared" and not any("chosen" in p for p in problems)),
            ("a BEM-class part passes", rows["classed"]["how"] == "bem"),
            ("a declared selector the block never emits is caught", any("dangling" in p for p in problems)),
            ("a part marked motion false is excluded, not unresolved", rows["skipped"]["how"] == "excluded" and not any(p.startswith("skipped:") for p in problems)),
            ("a motion value other than false is caught", any(p.startswith("badflag:") for p in problems)),
            ("a wrapper block's content-band resolves to the band class", rows["bandpart"]["how"] == "bem"),
            ("a declared selector naming the wrapper's band class passes", not any(p.startswith("banded:") for p in problems)),
            ("a declared selector a shared include prints passes", not any(p.startswith("shared:") for p in problems)),
            ("a declared class that is only a prefix of a printed class is caught", any(p.startswith("prefix:") for p in problems)),
            ("a declared class printed only after a dot (a CSS selector) is caught", any(p.startswith("cssonly:") for p in problems)),
            ("a content-band part without the wrapper's motion band force is unresolved", unforced["bandpart"]["how"] == "unresolved"),
            ("a declared band selector without the wrapper's motion band force is caught", any(p.startswith("banded:") for p in unforced_problems)),
            ("a helper-built class counts only when the helper is defined with its template and called with the root",
             helper_built([HELPER_DEF, "sgs_nav_shared_badge_html( $x, 'sgs-nav-bar-menu' );"], "sgs-nav-bar-menu__badge")
             and not helper_built([HELPER_DEF], "sgs-nav-bar-menu__badge")
             and not helper_built([HELPER_DEF, "sgs_nav_shared_badge_html( $x, 'sgs-nav-drawer-menu' );"], "sgs-nav-bar-menu__badge")),
        ]
        errors, _ = evaluate(list(rows.values()), tmp, empty_includes, [], [])
        cases.append(("evaluate fails on the bare part only", any("bare:thing" in e for e in errors) and not any("chosen" in e or "classed" in e or "skipped" in e for e in errors)))
        errors, notes = evaluate(list(rows.values()), tmp, empty_includes, [{"pattern": "bare:thing"}], [])
        cases.append(("an allow-listed part is a note, not an error", not any("bare:thing" in e for e in errors) and any("bare:thing" in n for n in notes)))
        errors, _ = evaluate(list(rows.values()), tmp, empty_includes, [{"pattern": "bare:thing"}, {"pattern": "gone:part"}], [])
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
