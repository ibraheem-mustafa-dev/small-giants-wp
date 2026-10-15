#!/usr/bin/env python3
"""check-motion-style-writes.py - front-end motion scripts write custom properties only (Spec 38A FR-38A-47).

SCOPE: every .js file under `plugins/sgs-blocks/assets/js` and `plugins/sgs-blocks/src/shared/effects`, plus every block
frontend script under `plugins/sgs-blocks/src/blocks`: a file a `block.json` names in `viewScript`, `viewScriptModule` or
`script` (`file:./x.js`), any file named `view.js`, `view-*.js` or `*-view.js`, and every file those import by a relative
path (editor-only files such as `edit.js` and `preview-style.js` are not frontend scripts and are not scanned unless a
frontend script imports them). A file that imports `gsap`, `gsap/...` or `@sgs/gsap...` (statically or by `import()`) is
Tier G and exempt by file: its tweens write inline transforms on their own scope. A Tier G file that holds a channel write
is listed as a `note: tier-G exempt` line, so the exemption is visible in every run.
THE PROPERTIES: the channel properties the stylesheet composes (every `x-sgs-channels` entry of
`plugins/sgs-blocks/schemas/motion.schema.json` that is not a `::before`/`::after`/layers slot) plus the FR-38A-47 list
(transform, translate, rotate, scale, opacity, filter). A script that writes one of these inline overwrites the
contributions the stylesheet multiplies or adds.
A WRITE (comments are stripped first):
  el.style.transform = ...            el.style['opacity'] = ...         el.style.setProperty('filter', ...)
  Object.assign(el.style, ...)        el.style.cssText = ...            el.setAttribute('style', ...)
  el.style = '...'  (only when the receiver is a recognisable DOM element: a name such as el, elem, element, node,
                     target, card, slide, wrapper, body, or a local assigned from querySelector / getElementById /
                     createElement / closest / an event target; `cfg.style = 'outline'` is not judged)
  el.style[`opacity`] = ...         el.style['-webkit-transform'] = ...
  el.style.webkitTransform = ...      el?.style?.setProperty('opacity') el?.style.opacity = ...
  el.attributeStyleMap.set('transform', ...)
  const s = el.style; s.opacity = ...      (an alias is a local bound to `<expr>.style`; it is scoped to the
                                            innermost `{...}` block that holds the declaration, so an unrelated `s`
                                            in another function is not judged)
  const { style } = el; style.opacity = ... (destructuring; `style: s` renames the alias)
  el.style[p] = ...                         where `p = 'opacity'` assigns a channel-name literal in the same file
  el.animate({ opacity: 0 }, ...) / el.animate([{ transform: 'x' }], ...): a WAAPI frame LITERAL whose channel key holds
  anything other than a `var(`/`calc(` string. Only an object or array literal passed straight to animate( is judged;
  frames built in a variable (as motion-keyframes.js builds them from formula constants) are not resolved.
ALLOWED: `style.setProperty('--x', ...)`, `style.removeProperty('--x')`, and reads. A `setProperty` whose first
argument is not a string literal is not judged (it cannot be resolved without running the script).

EXCEPTIONS live in plugins/sgs-blocks/scripts/data/motion-gate-allowlist.json (gate "motion-style-writes"; pattern is
the file path relative to plugins/sgs-blocks, for example "assets/js/example.js"). An entry that matches no hit is an
error, and so is one whose delete_in_unit has landed.

--self-test plants, in a temporary tree, every write form above (all caught), the allowed forms (`setProperty('--x')`,
`removeProperty('--x')`, a read, a comment, a formula-valued animate() frame) and a Tier G file with a transform write
(exempt). It exits 0 only when every plant behaves.

Run from the repo root:  python plugins/sgs-blocks/scripts/check-motion-style-writes.py --check
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
import motion_gate_allowlist as allowlist  # noqa: E402

REPO = SCRIPTS.parents[2]
PLUGIN = REPO / "plugins" / "sgs-blocks"
SCHEMA = PLUGIN / "schemas" / "motion.schema.json"
SCAN_DIRS = ("assets/js", "src/shared/effects")
BLOCKS_DIR = "src/blocks"
BLOCK_JSON_SCRIPT_KEYS = ("viewScript", "viewScriptModule", "script")
VIEW_NAME = re.compile(r"^(?:view|view-.+|.+-view)\.js$")
RELATIVE_IMPORT = re.compile(r"""(?:from\s*|import\s*\(?\s*)['"](\.{1,2}/[^'"]+)['"]""")
GATE = "motion-style-writes"
FR_PROPERTIES = ("transform", "translate", "rotate", "scale", "opacity", "filter")
SLOT_COMPOSITIONS = ("slot", "layers")
TIER_G_IMPORT = re.compile(r"""(?:from\s*|import\s*\(?\s*|require\s*\(\s*)['"](?:gsap(?:/[^'"]*)?|@sgs/gsap[^'"]*)['"]""")
# One left-to-right pass, so a `//` comment that mentions `gsap/*` is consumed whole and never opens a block comment.
# A comment starts at a line start or after whitespace or punctuation (never after `:` or a word character), so
# `'http://x'` and `'gsap/*'` inside a string are left alone.
COMMENT = re.compile(r"(?:^|(?<=[\s;{}(),\[\]=?&|!+-]))(?://[^\n]*|/\*.*?\*/)", re.S | re.M)
ALIAS_DECL = re.compile(r"""(?<![\w.$])(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*=\s*[^;=\n]*?\.style\s*(?=[;\n,)]|$)""")
DESTRUCTURE_DECL = re.compile(r"(?:const|let|var)\s*\{([^}]*)\}\s*=")
ELEMENT_NAME = re.compile(r"^(?:el|els|elem|element|node|target|currentTarget|item|card|slide|wrapper|root|container|body|documentElement|[A-Za-z]+(?:El|Elem|Element|Node))$")
DOM_LOCAL = re.compile(r"""(?<![\w.$])([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*?(?:querySelector|getElementById|createElement|closest|\.target\b|\.currentTarget\b)""")
BARE_STYLE_ASSIGN = re.compile(r"([A-Za-z_$][\w$]*)\s*\??\.style\s*=(?!=)")
ANIMATE_CALL = re.compile(r"(?<![\w$])animate\s*\(\s*(?=[\[{])")
QUOTE = r"""['"`]"""


def camel(prop: str) -> str:
    return re.sub(r"-([a-z])", lambda m: m.group(1).upper(), prop)


def forbidden_properties(schema_path: Path) -> list[str]:
    props = set(FR_PROPERTIES)
    if schema_path.is_file():
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
        props |= {c["channel"] for c in schema.get("x-sgs-channels") or []
                  if c.get("composition") not in SLOT_COMPOSITIONS and not c["channel"].startswith("::")}
    return sorted(props)


def strip_comments(source: str) -> str:
    """Blank comments but keep line numbers."""
    return COMMENT.sub(lambda m: re.sub(r"[^\n]", " ", m.group(0)), source)


def name_alternations(props: list[str]) -> tuple[str, str]:
    """(camelCase incl. webkit-prefixed, kebab-case) regex alternations for the channel properties."""
    camels = {camel(p) for p in props}
    camels |= {"webkit" + c[:1].upper() + c[1:] for c in camels}
    names = "|".join(re.escape(n) for n in sorted(camels, key=len, reverse=True))
    kebab = "|".join(re.escape(p) for p in sorted(props, key=len, reverse=True))
    return names, kebab


def scope_end(text: str, pos: int) -> int:
    """End offset of the innermost `{...}` block holding `pos` (the end of the file at top level)."""
    opens: list[int] = []
    quote = ""
    i = 0
    while i < pos:
        ch = text[i]
        if quote:
            if ch == "\\":
                i += 1
            elif ch == quote:
                quote = ""
        elif ch in "'\"`":
            quote = ch
        elif ch == "{":
            opens.append(i)
        elif ch == "}" and opens:
            opens.pop()
        i += 1
    if not opens:
        return len(text)
    close = matching_close(text, opens[-1])
    return len(text) if close < 0 else close + 1


def aliases_of(clean: str) -> list[tuple[str, int, int]]:
    """(name, start, end) of locals bound to `<expr>.style`, or destructured as `style` / `style: name`.

    The range runs from the declaration to the end of its innermost enclosing block."""
    found: set[tuple[str, int, int]] = set()
    for m in ALIAS_DECL.finditer(clean):
        found.add((m.group(1), m.start(), scope_end(clean, m.start())))
    for m in DESTRUCTURE_DECL.finditer(clean):
        for part in m.group(1).split(","):
            bits = [b.strip() for b in part.split(":")]
            if bits[0] == "style":
                name = bits[-1].split("=")[0].strip() or "style"
                found.add((name, m.start(), scope_end(clean, m.start())))
    return sorted(found)


def element_receivers(clean: str) -> set[str]:
    """Locals assigned from a DOM lookup, so `<local>.style = ...` is known to write an element's style."""
    return {m.group(1) for m in DOM_LOCAL.finditer(clean)}


def key_variables(clean: str, names: str, kebab: str) -> list[str]:
    """Locals assigned a channel-name string literal, for `el.style[p] = ...` with a variable key."""
    pattern = re.compile(rf"""(?<![\w.$])([A-Za-z_$][\w$]*)\s*=\s*{QUOTE}(?:-webkit-)?(?:{names}|{kebab}){QUOTE}""")
    return sorted({m.group(1) for m in pattern.finditer(clean)})


def build_patterns(props: list[str], aliases: list[str] | None = None,
                   key_vars: list[str] | None = None) -> list[tuple[str, re.Pattern]]:
    names, kebab = name_alternations(props)
    assign = r"\s*(?:[-+*/|&]?=)(?!=)"
    alias_alt = "|".join(re.escape(a) for a in (aliases or []))
    # the object whose style is written: `<expr>.style`, `<expr>?.style`, or an alias local
    target = r"(?:\??\.style" + (rf"|(?<![\w.$])(?:{alias_alt})" if alias_alt else "") + r")"
    patterns = [
        ("direct assignment", re.compile(rf"{target}\s*\??\.(?:{names}){assign}")),
        ("bracket assignment", re.compile(rf"{target}\s*\??\.?\[\s*{QUOTE}(?:-webkit-)?(?:{names}|{kebab}){QUOTE}\s*\]{assign}")),
        ("setProperty", re.compile(rf"{target}\s*\??\.setProperty\s*\??\.?\(\s*{QUOTE}(?:-webkit-)?(?:{kebab}){QUOTE}")),
        ("Object.assign onto style", re.compile(rf"Object\.assign\(\s*(?:[\w.$\[\]?]*\.style|{alias_alt or '(?!)'})\s*,")),
        ("cssText", re.compile(rf"{target}\s*\??\.cssText\s*\+?=(?!=)")),
        ("style attribute", re.compile(rf"\??\.setAttribute\s*\??\.?\(\s*{QUOTE}style{QUOTE}")),
        ("attributeStyleMap", re.compile(rf"attributeStyleMap\s*\??\.(?:set|append)\s*\??\.?\(\s*{QUOTE}(?:-webkit-)?(?:{kebab}){QUOTE}")),
    ]
    if key_vars:
        var_alt = "|".join(re.escape(v) for v in key_vars)
        patterns.append(("bracket assignment (variable key)",
                         re.compile(rf"{target}\s*\??\.?\[\s*(?:{var_alt})\s*\]{assign}")))
    return patterns


def matching_close(text: str, start: int) -> int:
    """Index of the bracket closing the one at `start`, string-aware; -1 when unbalanced."""
    pairs = {"[": "]", "{": "}", "(": ")"}
    stack: list[str] = []
    quote = ""
    i = start
    while i < len(text):
        ch = text[i]
        if quote:
            if ch == "\\":
                i += 1
            elif ch == quote:
                quote = ""
        elif ch in "'\"`":
            quote = ch
        elif ch in pairs:
            stack.append(pairs[ch])
        elif stack and ch == stack[-1]:
            stack.pop()
            if not stack:
                return i
        i += 1
    return -1


def waapi_hits(clean: str, props: list[str]) -> list[int]:
    """Offsets of channel keys in an animate() frame literal whose value is not a var(/calc( formula string."""
    keys = "|".join(re.escape(n) for n in sorted({*props, *(camel(p) for p in props)}, key=len, reverse=True))
    key_re = re.compile(rf"""(?<![\w$.])(?:{QUOTE}(?:{keys}){QUOTE}|(?:{keys}))\s*:\s*""")
    offsets: list[int] = []
    for call in ANIMATE_CALL.finditer(clean):
        start = call.end()
        end = matching_close(clean, start)
        if end < 0:
            continue
        literal = clean[start:end + 1]
        for key in key_re.finditer(literal):
            value = literal[key.end():key.end() + 400]
            if not re.match(rf"""{QUOTE}[^'"`]*\b(?:var|calc)\(""", value):
                offsets.append(start + key.start())
    return offsets


def is_tier_g(source: str) -> bool:
    return bool(TIER_G_IMPORT.search(strip_comments(source)))


def resolve_import(base: Path, spec: str) -> Path | None:
    target = (base.parent / spec).resolve()
    for candidate in (target, target.with_name(target.name + ".js"), target / "index.js"):
        if candidate.is_file() and candidate.suffix == ".js":
            return candidate
    return None


def block_frontend_files(plugin: Path) -> set[Path]:
    """Block frontend scripts: block.json-declared view scripts, view-named files, and their relative imports."""
    root = plugin / BLOCKS_DIR
    if not root.is_dir():
        return set()
    seeds: set[Path] = {p.resolve() for p in root.rglob("*.js") if VIEW_NAME.match(p.name)}
    for manifest in root.rglob("block.json"):
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        for key in BLOCK_JSON_SCRIPT_KEYS:
            value = data.get(key)
            for ref in ([value] if isinstance(value, str) else value or []):
                if isinstance(ref, str) and ref.startswith("file:"):
                    path = (manifest.parent / ref[5:]).resolve()
                    if path.is_file() and path.suffix == ".js":
                        seeds.add(path)
    found: set[Path] = set()
    queue = sorted(seeds)
    root_resolved = root.resolve()
    while queue:
        path = queue.pop()
        if path in found:
            continue
        found.add(path)
        for spec in RELATIVE_IMPORT.findall(strip_comments(path.read_text(encoding="utf-8"))):
            target = resolve_import(path, spec)
            if target is not None and root_resolved in target.parents and target not in found:
                queue.append(target)
    return found


def scan_files(plugin: Path) -> list[Path]:
    files = {p.resolve() for rel_dir in SCAN_DIRS for p in (plugin / rel_dir).rglob("*.js")}
    return sorted(files | block_frontend_files(plugin))


def find_hits(plugin: Path, props: list[str], exempt: list | None = None) -> list[tuple[str, int, str, str]]:
    """(relative path, line, kind, source line) for every write in a non-Tier-G file.

    A Tier G file's writes are not hits; they are appended to `exempt` (when given) so the exemption can be reported."""
    names, kebab = name_alternations(props)
    hits: set[tuple[str, int, str, str]] = set()
    plugin_resolved = plugin.resolve()
    for path in scan_files(plugin):
        source = path.read_text(encoding="utf-8")
        tier_g = is_tier_g(source)
        if tier_g and exempt is None:
            continue
        rel = path.relative_to(plugin_resolved).as_posix()
        clean = strip_comments(source)
        lines = source.splitlines()
        key_vars = key_variables(clean, names, kebab)
        file_hits: set[tuple[str, int, str, str]] = set()

        def add(kind: str, offset: int) -> None:
            line = clean.count(chr(10), 0, offset) + 1
            file_hits.add((rel, line, kind, lines[line - 1].strip()))

        for kind, pattern in build_patterns(props, [], key_vars):
            for match in pattern.finditer(clean):
                add(kind, match.start())
        for name, start, end in aliases_of(clean):
            for kind, pattern in build_patterns(props, [name], key_vars):
                for match in pattern.finditer(clean, start, end):
                    add(kind, match.start())
        receivers = element_receivers(clean)
        for match in BARE_STYLE_ASSIGN.finditer(clean):
            if ELEMENT_NAME.match(match.group(1)) or match.group(1) in receivers:
                add("whole style string", match.start())
        for offset in waapi_hits(clean, props):
            add("animate() frame channel", offset)
        if tier_g:
            exempt.extend(sorted(file_hits))
        else:
            hits |= file_hits
    return sorted(hits)


def evaluate(hits: list, allow: list[dict], allow_errors: list[str]) -> tuple[list[str], list[str]]:
    allowed = {e["pattern"] for e in allow}
    errors = [f"allow-list: {e}" for e in allow_errors]
    notes: list[str] = []
    for rel, line, kind, text in hits:
        message = f"{rel}:{line} {kind}: {text}"
        if rel in allowed:
            notes.append(f"allowed {message}")
        else:
            errors.append(message)
    errors += [f"allow-list: pattern {p!r} matches no hit" for p in sorted(allowed - {h[0] for h in hits})]
    return errors, notes


def run_check(plugin: Path, schema: Path) -> int:
    props = forbidden_properties(schema)
    allow, allow_errors = allowlist.load(REPO, GATE)
    exempt: list = []
    hits = find_hits(plugin, props, exempt)
    errors, notes = evaluate(hits, allow, allow_errors)
    notes += [f"tier-G exempt {rel}:{line} {kind}: {text}" for rel, line, kind, text in exempt]
    for note in notes:
        print(f"note: {note}")
    for error in errors:
        print(f"FAIL: {error}")
    scanned = len(scan_files(plugin))
    print(f"check-motion-style-writes: {'FAIL' if errors else 'OK'} "
          f"({scanned} files scanned, {len(props)} channel properties, {len(hits)} hit(s))")
    return 1 if errors else 0


def plant(label: str, body: str, caught: bool) -> tuple[str, str, str, bool]:
    return (label, "assets/js/planted.js", body, caught)


PLANTS = [
    ("el.style.transform = 'x'", "assets/js/planted-a.js", "el.style.transform = 'x';\n", True),
    ("el.style.setProperty('opacity','0')", "assets/js/planted-b.js", "el.style.setProperty('opacity', '0');\n", True),
    ("Object.assign(el.style, ...)", "src/shared/effects/planted-c.js", "Object.assign( el.style, { filter: 'none' } );\n", True),
    ("el.style.cssText = ...", "src/shared/effects/planted-d.js", "el.style.cssText = 'opacity:0';\n", True),
    ("el.style['translate'] = ...", "assets/js/planted-e.js", "el.style['translate'] = '1px';\n", True),
    plant("alias: const s = el.style; s.transform =", "const s = el.style;\ns.transform = 'x';\n", True),
    plant("destructuring: const { style } = el; style.opacity =", "const { style } = el;\nstyle.opacity = '0';\n", True),
    plant("renamed destructuring: const { style: st } = el", "const { style: st } = el;\nst.opacity = '0';\n", True),
    plant("template key: el.style[`opacity`] =", "el.style[`opacity`] = '0';\n", True),
    plant("variable key: p = 'opacity'; el.style[p] =", "const p = 'opacity';\nel.style[p] = '0';\n", True),
    plant("template setProperty(`transform`)", "el.style.setProperty(`transform`, 'none');\n", True),
    plant("setAttribute('style', ...)", "el.setAttribute('style', 'opacity:0');\n", True),
    plant("setAttribute(`style`, ...)", "el.setAttribute(`style`, 'opacity:0');\n", True),
    plant("optional chain: el?.style?.setProperty('opacity')", "el?.style?.setProperty('opacity', '0');\n", True),
    plant("optional chain: el?.style.opacity =", "el?.style.opacity = '0';\n", True),
    plant("vendor bracket: el.style['-webkit-transform'] =", "el.style['-webkit-transform'] = 'none';\n", True),
    plant("vendor camel: el.style.webkitTransform =", "el.style.webkitTransform = 'none';\n", True),
    plant("whole string: el.style = '...'", "el.style = 'opacity:0';\n", True),
    plant("whole string on a DOM local", "const box = document.querySelector('.a');\nbox.style = 'opacity:0';\n", True),
    plant("alias in function a, unrelated s.opacity in function b",
          "function a( el ) {\n\tconst s = el.style;\n\ts.setProperty('--x', '1');\n}\nfunction b( s ) {\n\ts.opacity = 0;\n}\n", False),
    plant("alias written inside its own function", "function a( el ) {\n\tconst s = el.style;\n\ts.opacity = '0';\n}\n", True),
    plant("non-element object: cfg.style = 'outline'", "cfg.style = 'outline';\n", False),
    plant("schema-only channel: el.style.clipPath =", "el.style.clipPath = 'x';\n", True),
    plant("style.cssText via destructured alias", "const { style } = el;\nstyle.cssText = 'opacity:0';\n", True),
    plant("attributeStyleMap.set('transform')", "el.attributeStyleMap.set('transform', 'none');\n", True),
    plant("WAAPI literal frame with a raw opacity", "el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1 });\n", True),
    plant("WAAPI literal frame with a raw transform", "el.animate({ 'transform': 'translateX(4px)' }, 200);\n", True),
    plant("WAAPI formula frame", "el.animate([{ opacity: 'var(--a)' }, { transform: 'calc(1px * var(--b))' }], 1);\n", False),
    plant("WAAPI frame without a channel key", "el.animate([{ offset: 0 }, { offset: 1 }], 1);\n", False),
    ("setProperty('--sgs-tilt-x', ...)", "assets/js/planted-f.js",
     "el.style.setProperty('--sgs-tilt-x', '1deg');\nel.style.removeProperty('--sgs-tilt-x');\n", False),
    plant("custom properties through an alias", "const s = el.style;\ns.setProperty('--x', '1');\ns.removeProperty('--x');\n", False),
    plant("reads", "const o = el.style.opacity;\nconst t = el.style['transform'];\nif (el.style.opacity === '0') {}\n", False),
    ("a write inside a comment", "assets/js/planted-g.js", "// el.style.transform = 'x';\n/* el.style.opacity = 0 */\n", False),
    ("Tier G file with a write", "src/shared/effects/gsap/planted-h.js",
     "import { gsap } from 'gsap';\nel.style.transform = 'x';\n", False),
    ("block view.js with a transform write", "src/blocks/planted/view.js", "el.style.transform = 'x';\n", True),
    ("block view-carousel.js with an opacity write", "src/blocks/planted/view-carousel.js", "el.style.opacity = '0';\n", True),
    ("block notify-view.js with a filter write", "src/blocks/planted/notify-view.js", "el.style.setProperty('filter', 'none');\n", True),
    ("block script named only in block.json", "src/blocks/planted/guided.js",
     {"src/blocks/planted/block.json": '{"viewScriptModule": ["file:./view.js", "file:./guided.js"]}',
      "src/blocks/planted/guided.js": "el.style.transform = 'x';\n"}, True),
    ("block helper imported by a view script", "src/blocks/planted/helper.js",
     {"src/blocks/planted/view.js": "import { go } from './helper';\ngo();\n",
      "src/blocks/planted/helper.js": "export const go = ( el ) => { el.style.transform = 'x'; };\n"}, True),
    ("block editor file with a write (not a frontend script)", "src/blocks/planted/edit.js", "el.style.transform = 'x';\n", False),
    ("block view.js with custom-property and layout writes only", "src/blocks/planted/view.js",
     "el.style.setProperty('--sgs-x', '1');\nel.style.position = 'absolute';\n", False),
    ("Tier G block view whose comment mentions gsap/* before a dynamic import", "src/blocks/planted/view.js",
     "// webpack's `gsap/*` externals rewrite never runs here\nconst m = await import( /* webpackIgnore: true */ '@sgs/gsap-draggable' );\nel.style.opacity = '0';\n", False),
    ("block view.js with a // URL and a /* glob in strings, then a write", "src/blocks/planted/view.js",
     "const u = 'http://example.com/*';\nel.style.transform = 'x';\n", True),
]


def self_test(schema: Path) -> int:
    props = forbidden_properties(schema)
    failures = 0
    for label, rel, body, should_catch in PLANTS:
        with tempfile.TemporaryDirectory() as tmp:
            plugin = Path(tmp)
            for directory in SCAN_DIRS:
                (plugin / directory).mkdir(parents=True, exist_ok=True)
            for path, text in (body if isinstance(body, dict) else {rel: body}).items():
                target = plugin / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(text, encoding="utf-8")
            caught = any(hit[0] == rel for hit in find_hits(plugin, props))
        ok = caught == should_catch
        failures += 0 if ok else 1
        expected = "caught" if should_catch else "passes"
        print(f"  plant {label}: {'caught' if caught else 'passes'} ({'ok' if ok else 'WRONG, expected ' + expected})")
    print(f"self-test: {'FAIL' if failures else 'OK'}")
    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true", help="scan the front-end motion scripts; exit 1 on any inline channel write")
    group.add_argument("--self-test", action="store_true", help="planted writes must be caught; custom-property and Tier G plants must pass")
    parser.add_argument("--schema", type=Path, default=SCHEMA, help="motion.schema.json (default: the plugin's)")
    args = parser.parse_args()
    return self_test(args.schema) if args.self_test else run_check(PLUGIN, args.schema)


if __name__ == "__main__":
    sys.exit(main())
