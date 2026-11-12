#!/usr/bin/env python3
"""deploy_minify.py - minify the hand-written CSS and JavaScript a deploy ships.

The theme's ``assets/`` and the plugin's ``assets/`` stylesheets and scripts are written with long comments, which would
otherwise reach every visitor; webpack already minifies ``build/``. This step replaces each such file's bytes in the
payload before the payload is hashed against the live tree; the source in git keeps its comments.

- ``.css``: ``minify-css.mjs`` (csso, no restructuring, so the cascade is unchanged).
- ``.js``: ``minify-js.mjs`` (terser with compress and mangle off: comments and whitespace only, so every name, global
  and statement stays as written).

Never touched: the theme's root ``style.css`` (WordPress reads the theme's name from its header comment), ``build/``,
and files already named ``.min.css`` / ``.min.js``.

Self-test: ``python plugins/sgs-blocks/scripts/deploy_minify.py --self-test`` (also run by ``build-deploy.py --self-test``).
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

from deploy_delta import Entry

HERE = Path(__file__).resolve().parent
SCRIPTS = {".css": HERE / "minify-css.mjs", ".js": HERE / "minify-js.mjs"}
# Server paths (keys of the payload) whose .css and .js files are minified.
PREFIXES = ("themes/sgs-theme/assets/", "plugins/sgs-blocks/assets/")


def kind(path: str) -> str | None:
    """'.css' or '.js' when the payload path is a hand-written file this step minifies, else None."""
    if not path.startswith(PREFIXES):
        return None
    for ext in SCRIPTS:
        if path.endswith(ext) and not path.endswith(".min" + ext):
            return ext
    return None


def minifiable(path: str) -> bool:
    return kind(path) is not None


def has_code(data: bytes, ext: str) -> bool:
    """True when the file holds anything but comments and whitespace (a comment-only file minifies to nothing)."""
    text = re.sub(rb"/\*.*?\*/", b"", data, flags=re.S)
    if ext == ".js":
        text = re.sub(rb"(?m)^\s*//.*$", b"", text)
    return bool(text.strip())


def run_node(ext: str, files: dict[str, str]) -> tuple[int, str, str]:
    r = subprocess.run(["node", str(SCRIPTS[ext])], input=json.dumps(files), capture_output=True, text=True,
                       encoding="utf-8")
    return r.returncode, r.stdout, r.stderr


def minify_payload(payload: dict[str, Entry], runner=run_node) -> tuple[dict[str, Entry], int, int]:
    """The payload with every minifiable stylesheet and script minified; also the raw byte total before and after.

    Raises RuntimeError when a minifier fails, returns a different file set or empties a file that held code, so a
    deploy never ships a mix. A file the minifier would make larger keeps its source bytes.
    """
    result = dict(payload)
    before = after = 0
    for ext, script in SCRIPTS.items():
        sources = {p: e.data.decode("utf-8") for p, e in payload.items() if kind(p) == ext}
        if not sources:
            continue
        code, out, errtext = runner(ext, sources)
        if code != 0:
            raise RuntimeError(f"{script.name} failed (exit {code}): {errtext.strip()}")
        try:
            minified = json.loads(out)
        except ValueError as exc:
            raise RuntimeError(f"{script.name} returned unreadable output: {exc}") from exc
        if set(minified) != set(sources):
            raise RuntimeError(f"{script.name} returned a different file set than it was given")
        for path, text in minified.items():
            data = text.encode("utf-8")
            src = payload[path]
            if not data.strip() and has_code(src.data, ext):
                raise RuntimeError(f"{script.name} emptied {path}")
            if len(data) >= len(src.data):
                data = src.data
            before += len(src.data)
            after += len(data)
            result[path] = Entry(data, hashlib.sha256(data).hexdigest(), src.mtime)
    return result, before, after


def self_test() -> list[str]:
    failures: list[str] = []
    css = b"/* a long comment */\n.a {\n\tcolor: red;\n}\n/*! licence */\n.b { content: \"/* kept */\"; }\n"
    module_js = (b"/**\n * A doc block.\n */\nimport { a } from './a.js';\n// a note\nexport function run( el ) {\n"
                 b"\tconst label = '/* not a comment */';\n\treturn a( el, label );\n}\n")
    classic_js = b"/* header */\nwindow.sgsThing = function sgsThing() {\n\t// note\n\treturn 1;\n};\n"
    payload = {
        "themes/sgs-theme/assets/css/x.css": Entry(css, hashlib.sha256(css).hexdigest(), 5),
        "themes/sgs-theme/style.css": Entry(b"/*\nTheme Name: SGS\n*/\n", "s", 5),
        "plugins/sgs-blocks/assets/css/sub/y.css": Entry(css, hashlib.sha256(css).hexdigest(), 5),
        "plugins/sgs-blocks/build/blocks/z/style-index.css": Entry(css, "b", 5),
        "plugins/sgs-blocks/build/blocks/z/view.js": Entry(module_js, "bj", 5),
        "plugins/sgs-blocks/assets/css/empty.css": Entry(b"/* only a note */\n", "e", 5),
        "themes/sgs-theme/assets/js/m.js": Entry(module_js, hashlib.sha256(module_js).hexdigest(), 5),
        "plugins/sgs-blocks/assets/js/c.js": Entry(classic_js, hashlib.sha256(classic_js).hexdigest(), 5),
        "plugins/sgs-blocks/assets/js/vendor.min.js": Entry(b"/* keep */ var v=1;", "v", 5),
    }
    try:
        out, before, after = minify_payload(payload)
    except RuntimeError as exc:
        return [f"minify: the real minifiers failed: {exc}"]
    x = out["themes/sgs-theme/assets/css/x.css"]
    text = x.data.decode()
    if "long comment" in text or "\n\t" in text:
        failures.append(f"minify: a theme assets stylesheet kept its comment or whitespace: {text!r}")
    if "/*! licence */" not in text or '"/* kept */"' not in text:
        failures.append(f"minify: a licence comment or a string holding /* was changed: {text!r}")
    if x.sha256 != hashlib.sha256(x.data).hexdigest() or x.mtime != 5:
        failures.append("minify: the minified entry's sha256 or mtime is wrong")
    if out["plugins/sgs-blocks/assets/css/sub/y.css"].data == css:
        failures.append("minify: a nested plugin assets stylesheet was not minified")
    m = out["themes/sgs-theme/assets/js/m.js"].data.decode()
    if "doc block" in m or "a note" in m or "export function run(" not in m:
        failures.append(f"minify: a module script kept its comments or lost its export: {m!r}")
    if "'/* not a comment */'" not in m and '"/* not a comment */"' not in m:
        failures.append(f"minify: a string holding /* in a module was changed: {m!r}")
    c = out["plugins/sgs-blocks/assets/js/c.js"].data.decode()
    if "header" in c or "note" in c or "window.sgsThing=function sgsThing()" not in c:
        failures.append(f"minify: a classic script kept its comments or lost a global or a name: {c!r}")
    for kept in ("themes/sgs-theme/style.css", "plugins/sgs-blocks/build/blocks/z/style-index.css",
                 "plugins/sgs-blocks/build/blocks/z/view.js", "plugins/sgs-blocks/assets/js/vendor.min.js"):
        if out[kept] is not payload[kept]:
            failures.append(f"minify: {kept} must ship untouched")
    if out["plugins/sgs-blocks/assets/css/empty.css"].data.strip():
        failures.append("minify: a comment-only stylesheet should ship empty")
    if not (before > after > 0):
        failures.append(f"minify: byte totals are wrong ({before} -> {after})")
    # A script that does not parse must stop the deploy.
    try:
        minify_payload({"plugins/sgs-blocks/assets/js/bad.js": Entry(b"function ( {", "x", 5)})
        failures.append("minify: a script that does not parse was not refused")
    except RuntimeError:
        pass
    # Planted faults: a failing minifier, a dropped file and an emptied file must each refuse, never ship a mix.
    for name, fake in (("a non-zero exit", lambda e, f: (1, "", "boom")),
                       ("a dropped file", lambda e, f: (0, json.dumps(dict(list(f.items())[:1])), "")),
                       ("an emptied file", lambda e, f: (0, json.dumps({k: "" for k in f}), ""))):
        try:
            minify_payload(payload, runner=fake)
            failures.append(f"minify: {name} from the minifier was not refused")
        except RuntimeError:
            pass
    return failures


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        fails = self_test()
        print("[SELF-TEST FAIL]\n  - " + "\n  - ".join(fails) if fails else "[SELF-TEST PASS] deploy_minify")
        sys.exit(1 if fails else 0)
    print(__doc__)
