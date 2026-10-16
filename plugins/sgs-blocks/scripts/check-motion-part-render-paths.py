#!/usr/bin/env python3
"""check-motion-part-render-paths.py - every offered motion part reaches an element on every render path (Spec 38A
section 6.2, FR-38A-16).

THE RULE: `Sgs_Motion_Targets::resolve` turns a part into ONE selector, and the renderer uses it for every layer. A block
that prints different markup on different render paths (attribute sets that select another branch: a typed versus a
live product card, a split versus a standard hero, an icon versus a text separator) must print an element that selector
matches on each of them, or the layer silently does nothing there. check-motion-part-selectors.py asks only whether the
class appears somewhere in the block's source; this gate renders each path and asks the rendered HTML.

HOW
  The paths are data, in plugins/sgs-blocks/tests/fixtures/motion/render-paths.json (curated: which attribute sets
  select a different branch is read from each render.php, not derivable from block.json). Every motion block with an
  offered part (not the root, not `"motion": false`) has an entry: either `single` (a reason: one render path, or only
  bail-out / notice paths that print none of the block's parts, so the static gate covers it) or `paths`. Each path
  renders the REAL render.php through scripts/qa/lib/render-css-harness.php --motion-targets with the entry's `base`
  attributes, the path's `attrs`, and a hover layer on every offered part (a layer on `inner` / `content-band` is what
  makes the container wrapper print its band, so the band is only reachable when a layer asks for it). The harness
  returns each part's selector from the real resolver; the HTML is parsed and the selector is matched on class tokens
  inside the block root (the first tag after any leading style or script, as Sgs_Motion_Markup finds it).
  A path may instead declare `delegatesTo` (`{"block": "<slug>", "paths": [...]}`): the block hands its items to that
  child block, so each part in its `supports.sgs.motionDelegate.parts` must reach the mapped child part on those child
  paths; a part the map leaves out is not offered in that mode. A path the harness cannot render declares `unrendered`
  with the reason; it still counts as a path id. A path may list `unexercised` parts (`{"<part>": "<reason>"}`): the
  element exists on that path but only for content the harness cannot supply (a taxonomy term, a product meta value);
  they are notes, and an unexercised part that does match is a failure (stale).

ABSENT BY DESIGN
  `supports.sgs.elements.<part>.absentIn: ["<path id>", ...]` in block.json says the part's element does not exist on
  that path by design (the part's `absentWhy` says why). The gate skips those, and fails an `absentIn` that names a path
  the fixture does not declare, one that names a path where the part does match (stale), one covering every path (the
  part is never reachable: mark it `"motion": false`), and one without an `absentWhy`.

MODES
  --check      exit 1 on any failure above, a motion block with no fixture entry, an entry for a block that is not a
               motion block, or a path whose render fails
  --survey     every block and path with each part's verdict
  --self-test  planted controls on synthetic renders (no PHP): a modifier-only class (caught), a part printed on one
               path but not another (caught), an absentIn naming an unknown path (caught), a stale absentIn (caught), an
               absentIn on every path (caught), an absentIn with no reason (caught), an unexercised part that matches (caught), a band part reached only as a
               direct child (a grandchild is caught), a descendant selector whose ancestor is missing (caught), a
               delegated part the child misses (caught), and the matching positives

Run from the repo root:  python plugins/sgs-blocks/scripts/check-motion-part-render-paths.py --check|--survey|--self-test
"""
from __future__ import annotations

import argparse
import copy
import json
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
SCRIPTS = Path(__file__).resolve().parent
PLUGIN = SCRIPTS.parent
REPO = PLUGIN.parents[1]
BLOCKS = PLUGIN / "src" / "blocks"
FIXTURE = PLUGIN / "tests" / "fixtures" / "motion" / "render-paths.json"
HARNESS = SCRIPTS / "qa" / "lib" / "render-css-harness.php"
SCOPE = ".sgs-qa-scope"
LAYER = {"hover": {"state": {"source": "root", "values": {"scale": 1.02}}}}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "param"}
SKIP_ROOT = {"style", "script", "link", "template", "noscript"}


class Node:
    __slots__ = ("tag", "classes", "children", "parent")

    def __init__(self, tag: str, classes: set[str], parent: "Node | None") -> None:
        self.tag, self.classes, self.children, self.parent = tag, classes, [], parent


class Tree(HTMLParser):
    """The rendered HTML as a tree of elements (tag and class tokens). SVG and foreign elements are kept."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.top = Node("#document", set(), None)
        self.cur = self.top

    def handle_starttag(self, tag, attrs):
        classes = set()
        for k, v in attrs:
            if k == "class" and v:
                classes |= set(v.split())
        node = Node(tag, classes, self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.cur.tag == tag:
            self.cur = self.cur.parent

    def handle_endtag(self, tag):
        node = self.cur
        while node is not None and node.tag != tag:
            node = node.parent
        if node is not None and node.parent is not None:
            self.cur = node.parent


def block_root(html: str) -> Node | None:
    tree = Tree()
    tree.feed(html)
    tree.close()
    for node in tree.top.children:
        if node.tag not in SKIP_ROOT:
            return node
    return None


def descendants(node: Node):
    for child in node.children:
        yield child
        yield from descendants(child)


def parse_selector(selector: str) -> list[tuple[str, set[str]]] | None:
    """`.sgs-qa-scope > .a.b .c` -> [(">", {a, b}), (" ", {c})], relative to the root; None for an unsupported form."""
    if not selector.startswith(SCOPE):
        return None
    rest = selector[len(SCOPE):].split()
    steps, comb = [], " "
    for token in rest:
        if token == ">":
            comb = ">"
            continue
        if not token.startswith("."):
            return None
        steps.append((comb, set(token[1:].split("."))))
        comb = " "
    return steps


def matches(root: Node, selector: str) -> bool:
    """Whether any element inside `root` matches `selector` (descendant and child combinators over class compounds)."""
    steps = parse_selector(selector)
    if steps is None:
        return False
    if not steps:
        return True
    frontier = [root]
    for comb, classes in steps:
        found: list[Node] = []
        seen: set[int] = set()
        for anchor in frontier:
            pool = anchor.children if comb == ">" else descendants(anchor)
            for node in pool:
                if classes <= node.classes and id(node) not in seen:
                    seen.add(id(node))
                    found.append(node)
        if not found:
            return False
        frontier = found
    return True


def motion_blocks(blocks: Path) -> dict[str, dict]:
    """slug -> block.json, for every block whose `supports.sgs.motion` is truthy."""
    out = {}
    for block_json in sorted(blocks.glob("*/block.json")):
        data = json.loads(block_json.read_text(encoding="utf-8"))
        if ((data.get("supports") or {}).get("sgs") or {}).get("motion"):
            out[data["name"].split("/", 1)[-1]] = data
    return out


def offered_parts(data: dict) -> dict[str, dict]:
    """part -> spec for each part that is a motion target and not the root."""
    elements = ((data.get("supports") or {}).get("sgs") or {}).get("elements") or {}
    return {p: (s or {}) for p, s in elements.items()
            if p != "root" and not (s or {}).get("isWrapper") and (s or {}).get("motion") is not False}


def deep_merge(base: dict, over: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in over.items():
        out[k] = deep_merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else copy.deepcopy(v)
    return out


def path_attrs(entry: dict, path: dict, parts: dict[str, dict]) -> dict:
    attrs = deep_merge(entry.get("base") or {}, path.get("attrs") or {})
    layers = {p: copy.deepcopy(LAYER) for p in parts}
    motion = attrs.get("sgsMotion") if isinstance(attrs.get("sgsMotion"), dict) else {}
    attrs["sgsMotion"] = deep_merge({"elements": layers}, motion)
    return attrs


def php_render(slug: str, attrs: dict, path: dict, workdir: Path) -> dict:
    """The harness result ({ok, html, targets} or {ok: false, error})."""
    files = {"attrs-file": attrs}
    for key, flag in (("product", "product-file"), ("post", "post-file"), ("context", "context-file"),
                      ("innerBlocks", "inner-blocks-file"), ("attachments", "attachments-file"),
                      ("globalSettings", "global-settings-file")):
        if key in path:
            files[flag] = path[key]
    cmd = ["php", str(HARNESS), "--slug", f"sgs/{slug}", "--motion-targets"]
    for flag, value in files.items():
        f = workdir / f"{slug}-{abs(hash(json.dumps(path, sort_keys=True)))}-{flag}.json"
        f.write_text(json.dumps(value), encoding="utf-8")
        cmd += [f"--{flag}", str(f)]
    if "content" in path:
        cmd += ["--content", path["content"]]
    if path.get("stubWoocommerce"):
        cmd += ["--stub-woocommerce"]
    done = subprocess.run(cmd, cwd=PLUGIN, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120)
    start = done.stdout.find('{"ok"')
    try:
        return json.loads(done.stdout[start:]) if start >= 0 else {"ok": False, "error": (done.stdout + done.stderr).strip()[-400:]}
    except json.JSONDecodeError:
        return {"ok": False, "error": done.stdout[-400:]}


def render_all(fixture: dict, blocks: dict[str, dict]) -> dict[str, dict[str, dict]]:
    """slug -> path id -> harness result, for every rendered path."""
    jobs = []
    for slug, entry in (fixture.get("blocks") or {}).items():
        if slug not in blocks:
            continue
        for pid, path in (entry.get("paths") or {}).items():
            if "delegatesTo" in path or "unrendered" in path:
                continue
            jobs.append((slug, pid, path_attrs(entry, path, offered_parts(blocks[slug])), path))
    workdir = Path(tempfile.mkdtemp(prefix="motion-render-paths-"))
    results: dict[str, dict[str, dict]] = {}
    try:
        with ThreadPoolExecutor(max_workers=8) as pool:
            for (slug, pid, _a, _p), res in zip(jobs, pool.map(lambda j: php_render(j[0], j[2], j[3], workdir), jobs)):
                results.setdefault(slug, {})[pid] = res
    finally:
        shutil.rmtree(workdir, ignore_errors=True)
    return results


def part_hits(result: dict, parts: dict[str, dict]) -> dict[str, bool | None]:
    """part -> whether its resolved selector matches inside the root (None: the resolver offers no selector)."""
    root = block_root(result.get("html") or "")
    targets = result.get("targets") or {}
    out = {}
    for part in parts:
        target = targets.get(part)
        if not target:
            out[part] = None
            continue
        out[part] = root is not None and matches(root, target["selector"])
    return out


def evaluate(fixture: dict, blocks: dict[str, dict], results: dict[str, dict[str, dict]]) -> tuple[list[str], list[str], list[dict]]:
    """(errors, notes, rows): rows are {block, path, part, verdict} for --survey."""
    errors: list[str] = []
    notes: list[str] = []
    rows: list[dict] = []
    entries = fixture.get("blocks") or {}
    hits: dict[str, dict[str, dict[str, bool | None]]] = {}
    for slug, data in blocks.items():
        parts = offered_parts(data)
        if not parts:
            continue
        entry = entries.get(slug)
        if entry is None:
            errors.append(f"[{slug}] motion block with offered parts has no entry in {FIXTURE.relative_to(REPO).as_posix()} (declare its `paths`, or `single` with the reason it has one)")
            continue
        for slug_path, res in (results.get(slug) or {}).items():
            if not res.get("ok"):
                errors.append(f"[{slug}] path {slug_path!r} did not render: {res.get('error')}")
            else:
                hits.setdefault(slug, {})[slug_path] = part_hits(res, parts)
    for slug in entries:
        if slug.startswith("_"):
            continue
        if slug not in blocks or not offered_parts(blocks[slug]):
            errors.append(f"[{slug}] fixture entry names a block that is not a motion block with offered parts")
    for slug, entry in entries.items():
        if slug not in blocks or not offered_parts(blocks[slug]):
            continue
        parts = offered_parts(blocks[slug])
        paths = entry.get("paths") or {}
        single = entry.get("single")
        if bool(single) == bool(paths):
            errors.append(f"[{slug}] fixture entry needs exactly one of `single` (a reason) or `paths`")
        for part, spec in parts.items():
            absent = spec.get("absentIn")
            if absent is None:
                continue
            if not isinstance(absent, list) or not all(isinstance(a, str) for a in absent):
                errors.append(f"[{slug}:{part}] absentIn must be a list of path ids")
                continue
            if not str(spec.get("absentWhy") or "").strip():
                errors.append(f"[{slug}:{part}] absentIn without an absentWhy saying why the element does not exist there")
            for a in absent:
                if a not in paths:
                    errors.append(f"[{slug}:{part}] absentIn names {a!r}, which is not a render path of the block in the fixture (paths: {sorted(paths) or 'none, the entry is single'})")
            if paths and set(paths) <= set(absent):
                errors.append(f"[{slug}:{part}] absentIn covers every render path: the part is never reachable, so mark it \"motion\": false")
        for pid, path in paths.items():
            if "unrendered" in path:
                notes.append(f"[{slug}] path {pid!r} not rendered: {path['unrendered']}")
                continue
            if "delegatesTo" in path:
                errors += delegate_problems(slug, pid, path["delegatesTo"], blocks, hits, rows)
                continue
            unexercised = path.get("unexercised") or {}
            for part in unexercised:
                if part not in parts:
                    errors.append(f"[{slug}] path {pid!r} unexercised names {part!r}, which is not an offered part")
            for part, hit in (hits.get(slug, {}).get(pid) or {}).items():
                absent = pid in (parts[part].get("absentIn") or [])
                if absent and part in unexercised:
                    errors.append(f"[{slug}:{part}] path {pid!r} is both absentIn (by design) and unexercised (fixture content): pick one")
                if part in unexercised and not hit:
                    verdict = "unexercised"
                    notes.append(f"[{slug}:{part}] path {pid!r} unexercised: {unexercised[part]}")
                elif part in unexercised:
                    verdict = "stale-unexercised"
                    errors.append(f"[{slug}:{part}] path {pid!r} lists the part as unexercised, but its selector matches an element there (stale)")
                else:
                    verdict = "absent" if absent and not hit else ("stale-absent" if absent else ("ok" if hit else ("no-target" if hit is None else "MISS")))
                rows.append({"block": slug, "path": pid, "part": part, "verdict": verdict})
                if verdict == "MISS":
                    errors.append(f"[{slug}:{part}] path {pid!r}: the selector matches no element in the rendered HTML")
                elif verdict == "stale-absent":
                    errors.append(f"[{slug}:{part}] absentIn names {pid!r} but the part's selector matches an element there (stale)")
    return errors, notes, rows


def delegate_problems(slug: str, pid: str, spec: dict, blocks: dict[str, dict], hits: dict, rows: list[dict]) -> list[str]:
    problems = []
    data = blocks[slug]
    delegate = ((data.get("supports") or {}).get("sgs") or {}).get("motionDelegate") or {}
    child = str(spec.get("block") or "")
    if f"sgs/{child}" != delegate.get("block"):
        return [f"[{slug}] path {pid!r} delegatesTo {child!r}, but supports.sgs.motionDelegate.block is {delegate.get('block')!r}"]
    child_parts = offered_parts(blocks.get(child) or {})
    for part, child_part in (delegate.get("parts") or {}).items():
        if part not in offered_parts(data) or child_part == "root":
            continue
        for cpid in spec.get("paths") or []:
            cres = (hits.get(child) or {}).get(cpid)
            if cres is None:
                problems.append(f"[{slug}] path {pid!r} delegates to {child} path {cpid!r}, which the fixture does not render")
                continue
            absent = cpid in ((child_parts.get(child_part) or {}).get("absentIn") or [])
            hit = cres.get(child_part)
            verdict = "absent" if absent and not hit else ("ok" if hit else "MISS")
            rows.append({"block": slug, "path": f"{pid}->{child}:{cpid}", "part": part, "verdict": verdict})
            if verdict == "MISS":
                problems.append(f"[{slug}:{part}] path {pid!r}: delegated to {child} part {child_part!r}, whose selector matches no element on {child} path {cpid!r}")
    return problems


def load_fixture(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def run(mode: str, blocks_dir: Path, fixture_path: Path) -> int:
    blocks = motion_blocks(blocks_dir)
    fixture = load_fixture(fixture_path)
    results = render_all(fixture, blocks)
    errors, notes, rows = evaluate(fixture, blocks, results)
    if mode == "survey":
        for r in rows:
            print(f"{r['verdict']:<12} {r['block']}:{r['part']}  [{r['path']}]")
    for n in notes:
        print(f"note: {n}")
    for e in errors:
        print(f"FAIL: {e}")
    rendered = sum(len(v) for v in results.values())
    print(f"check-motion-part-render-paths: {'FAIL' if errors else 'OK'} ({rendered} paths rendered, {len(rows)} part-path rows, {sum(1 for r in rows if r['verdict'] == 'absent')} absent by design, {len(errors)} failure(s))")
    return 1 if errors and mode == "check" else 0


def self_test() -> int:
    def block(parts: dict) -> dict:
        return {"name": "sgs/t", "supports": {"sgs": {"motion": True, "elements": {"box": {"isWrapper": True}, **parts}}}}

    def res(html: str, targets: dict) -> dict:
        return {"ok": True, "html": html, "targets": {p: {"selector": s} for p, s in targets.items()}}

    t = {"thing": f"{SCOPE} .sgs-t__thing"}
    cases: list[tuple[str, bool]] = []

    def run_case(parts: dict, paths: dict, results: dict) -> list[str]:
        return evaluate({"blocks": {"t": {"paths": paths}}}, {"t": block(parts)}, results)[0]

    one = {"a": {}}
    two = {"a": {}, "b": {}}
    e = run_case({"thing": {}}, one, {"t": {"a": res('<div class="sgs-t"><i class="sgs-t__thing--big"></i></div>', t)}})
    cases.append(("a modifier-only class (sgs-t__thing--big) does not match the part", any("t:thing" in x and "'a'" in x for x in e)))
    e = run_case({"thing": {}}, one, {"t": {"a": res('<style>.x{}</style><div class="sgs-t"><i class="x sgs-t__thing"></i></div>', t)}})
    cases.append(("the part's class on an element inside the root passes (leading style skipped)", e == []))
    e = run_case({"thing": {}}, one, {"t": {"a": res('<div class="sgs-t sgs-t__thing"></div>', t)}})
    cases.append(("the class on the root itself does not satisfy a descendant selector", any("t:thing" in x for x in e)))
    e = run_case({"thing": {}}, two, {"t": {"a": res('<div><i class="sgs-t__thing"></i></div>', t), "b": res('<div><i class="other"></i></div>', t)}})
    cases.append(("a part printed on one path but not another fails on that path only", any("'b'" in x for x in e) and not any("'a'" in x for x in e)))
    e = run_case({"thing": {"absentIn": ["b"], "absentWhy": "no such element in b"}}, two, {"t": {"a": res('<div><i class="sgs-t__thing"></i></div>', t), "b": res('<div><i></i></div>', t)}})
    cases.append(("an absentIn with a reason on the path that lacks the element passes", e == []))
    e = run_case({"thing": {"absentIn": ["zzz"], "absentWhy": "r"}}, one, {"t": {"a": res('<div><i class="sgs-t__thing"></i></div>', t)}})
    cases.append(("an absentIn naming an unknown path is caught", any("'zzz'" in x and "not a render path" in x for x in e)))
    e = run_case({"thing": {"absentIn": ["a"], "absentWhy": "r"}}, two, {"t": {"a": res('<div><i class="sgs-t__thing"></i></div>', t), "b": res('<div><i class="sgs-t__thing"></i></div>', t)}})
    cases.append(("a stale absentIn (the part matches there) is caught", any("stale" in x for x in e)))
    e = run_case({"thing": {"absentIn": ["a", "b"], "absentWhy": "r"}}, two, {"t": {"a": res('<div></div>', t), "b": res('<div></div>', t)}})
    cases.append(("an absentIn covering every path is caught", any("every render path" in x for x in e)))
    e = run_case({"thing": {"absentIn": ["b"]}}, two, {"t": {"a": res('<div><i class="sgs-t__thing"></i></div>', t), "b": res('<div></div>', t)}})
    cases.append(("an absentIn without an absentWhy is caught", any("absentWhy" in x for x in e)))
    band = {"thing": f"{SCOPE} > .sgs-t__band"}
    e = run_case({"thing": {}}, one, {"t": {"a": res('<div><div class="sgs-t__band"></div></div>', band)}})
    cases.append(("a band part as a direct child of the root passes", e == []))
    e = run_case({"thing": {}}, one, {"t": {"a": res('<div><p><div class="sgs-t__band"></div></p></div>', band)}})
    cases.append(("a band part reached only as a grandchild is caught", any("t:thing" in x for x in e)))
    desc = {"thing": f"{SCOPE} .sgs-t__wrap .sgs-t__thing"}
    e = run_case({"thing": {}}, one, {"t": {"a": res('<div><i class="sgs-t__thing"></i></div>', desc)}})
    cases.append(("a descendant selector whose ancestor is missing is caught", any("t:thing" in x for x in e)))
    e = run_case({"thing": {}}, one, {"t": {"a": res('<div><b class="sgs-t__wrap"><svg><path class="sgs-t__thing"/></svg></b></div>', desc)}})
    cases.append(("a descendant selector with its ancestor (an SVG self-closing leaf) passes", e == []))
    child = {"name": "sgs/c", "supports": {"sgs": {"motion": True, "elements": {"img": {}}}}}
    parent_parts = {"thing": {}}
    deleg_block = block(parent_parts)
    deleg_block["supports"]["sgs"]["motionDelegate"] = {"block": "sgs/c", "parts": {"thing": "img"}}
    paths = {"own": {}, "products": {"delegatesTo": {"block": "c", "paths": ["live"]}}}
    fixture = {"blocks": {"t": {"paths": paths}, "c": {"paths": {"live": {}}}}}
    miss = {"t": {"own": res('<div><i class="sgs-t__thing"></i></div>', t)}, "c": {"live": res('<div><i class="other"></i></div>', {"img": f"{SCOPE} .sgs-c__img"})}}
    e = evaluate(fixture, {"t": deleg_block, "c": child}, miss)[0]
    cases.append(("a delegated part whose child part misses on the child path is caught", any("delegated to c part 'img'" in x for x in e)))
    hit = {"t": {"own": res('<div><i class="sgs-t__thing"></i></div>', t)}, "c": {"live": res('<div><i class="sgs-c__img"></i></div>', {"img": f"{SCOPE} .sgs-c__img"})}}
    e = evaluate(fixture, {"t": deleg_block, "c": child}, hit)[0]
    cases.append(("a delegated part the child reaches passes", e == []))
    e = run_case({"thing": {}}, {"a": {"unexercised": {"thing": "needs a term"}}}, {"t": {"a": res('<div><i></i></div>', t)}})
    cases.append(("an unexercised part that misses is a note, not a failure", e == []))
    e = run_case({"thing": {}}, {"a": {"unexercised": {"thing": "needs a term"}}}, {"t": {"a": res('<div><i class="sgs-t__thing"></i></div>', t)}})
    cases.append(("an unexercised part that matches is caught (stale)", any("unexercised" in x and "stale" in x for x in e)))
    e = evaluate({"blocks": {}}, {"t": block({"thing": {}})}, {})[0]
    cases.append(("a motion block with no fixture entry is caught", any("no entry" in x for x in e)))
    e = evaluate({"blocks": {"t": {"single": "one path", "paths": {"a": {}}}}}, {"t": block({"thing": {}})}, {"t": {"a": res('<div><i class="sgs-t__thing"></i></div>', t)}})[0]
    cases.append(("an entry with both single and paths is caught", any("exactly one" in x for x in e)))
    e = evaluate({"blocks": {"t": {"paths": {"a": {}}}}}, {"t": block({"thing": {}})}, {"t": {"a": {"ok": False, "error": "boom"}}})[0]
    cases.append(("a path whose render fails is caught", any("did not render" in x for x in e)))
    failures = 0
    for label, ok in cases:
        failures += 0 if ok else 1
        print(f"  {'ok  ' if ok else 'MISS'} {label}")
    print(f"self-test: {'FAIL' if failures else 'OK'}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true", help="exit 1 on any part that misses on a render path")
    group.add_argument("--survey", action="store_true", help="print every part's verdict on every path")
    group.add_argument("--self-test", action="store_true", help="planted failures must be caught; the controls must pass")
    parser.add_argument("--blocks", type=Path, default=BLOCKS)
    parser.add_argument("--fixture", type=Path, default=FIXTURE)
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    return run("survey" if args.survey else "check", args.blocks, args.fixture)


if __name__ == "__main__":
    sys.exit(main())
