#!/usr/bin/env python3
"""deploy_minify.py - minify the hand-written CSS a deploy ships.

The theme's ``assets/css`` and the plugin's ``assets/`` stylesheets are written with long comments, which would
otherwise reach every visitor; webpack already minifies ``build/``. This step replaces each such file's bytes in the payload with ``minify-css.mjs``'s output (csso, no
restructuring, so the cascade is unchanged) before the payload is hashed against the live tree; the source in git keeps
its comments. The theme's root ``style.css`` is never touched: WordPress reads the theme's name from its header comment.

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

SCRIPT = Path(__file__).resolve().parent / "minify-css.mjs"
# Server paths (keys of the payload) whose .css files are minified.
PREFIXES = ("themes/sgs-theme/assets/", "plugins/sgs-blocks/assets/")


def minifiable(path: str) -> bool:
    return path.endswith(".css") and not path.endswith(".min.css") and path.startswith(PREFIXES)


def has_rules(css: bytes) -> bool:
    """True when the stylesheet holds anything but comments and whitespace (a comment-only file minifies to nothing)."""
    return bool(re.sub(rb"/\*.*?\*/", b"", css, flags=re.S).strip())


def run_node(files: dict[str, str]) -> tuple[int, str, str]:
    r = subprocess.run(["node", str(SCRIPT)], input=json.dumps(files), capture_output=True, text=True,
                       encoding="utf-8")
    return r.returncode, r.stdout, r.stderr


def minify_payload(payload: dict[str, Entry], runner=run_node) -> tuple[dict[str, Entry], int, int]:
    """The payload with every minifiable stylesheet minified; also the raw byte total before and after.

    Raises RuntimeError when the minifier fails or returns a different file set, so a deploy never ships a mix.
    A file the minifier would make larger (none today) keeps its source bytes.
    """
    sources = {p: e.data.decode("utf-8") for p, e in payload.items() if minifiable(p)}
    if not sources:
        return payload, 0, 0
    code, out, errtext = runner(sources)
    if code != 0:
        raise RuntimeError(f"minify-css.mjs failed (exit {code}): {errtext.strip()}")
    try:
        minified = json.loads(out)
    except ValueError as exc:
        raise RuntimeError(f"minify-css.mjs returned unreadable output: {exc}") from exc
    if set(minified) != set(sources):
        raise RuntimeError("minify-css.mjs returned a different file set than it was given")
    result = dict(payload)
    before = after = 0
    for path, text in minified.items():
        data = text.encode("utf-8")
        src = payload[path]
        if not data.strip() and has_rules(src.data):
            raise RuntimeError(f"minify-css.mjs emptied {path}")
        if len(data) >= len(src.data):
            data = src.data
        before += len(src.data)
        after += len(data)
        result[path] = Entry(data, hashlib.sha256(data).hexdigest(), src.mtime)
    return result, before, after


def self_test() -> list[str]:
    failures: list[str] = []
    css = b"/* a long comment */\n.a {\n\tcolor: red;\n}\n/*! licence */\n.b { content: \"/* kept */\"; }\n"
    payload = {
        "themes/sgs-theme/assets/css/x.css": Entry(css, hashlib.sha256(css).hexdigest(), 5),
        "themes/sgs-theme/style.css": Entry(b"/*\nTheme Name: SGS\n*/\n", "s", 5),
        "plugins/sgs-blocks/assets/css/sub/y.css": Entry(css, hashlib.sha256(css).hexdigest(), 5),
        "plugins/sgs-blocks/build/blocks/z/style-index.css": Entry(css, "b", 5),
        "plugins/sgs-blocks/assets/js/a.js": Entry(b"/* js */", "j", 5),
        "plugins/sgs-blocks/assets/css/empty.css": Entry(b"/* only a note */\n", "e", 5),
    }
    try:
        out, before, after = minify_payload(payload)
    except RuntimeError as exc:
        return [f"minify: the real minifier failed: {exc}"]
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
    for kept in ("themes/sgs-theme/style.css", "plugins/sgs-blocks/build/blocks/z/style-index.css",
                 "plugins/sgs-blocks/assets/js/a.js"):
        if out[kept] is not payload[kept]:
            failures.append(f"minify: {kept} must ship untouched")
    if out["plugins/sgs-blocks/assets/css/empty.css"].data.strip():
        failures.append("minify: a comment-only stylesheet should ship empty")
    if not (before > after > 0):
        failures.append(f"minify: byte totals are wrong ({before} -> {after})")
    # Planted faults: a failing minifier, a dropped file and an emptied file must each refuse, never ship a mix.
    for name, fake in (("a non-zero exit", lambda f: (1, "", "boom")),
                       ("a dropped file", lambda f: (0, json.dumps(dict(list(f.items())[:1])), "")),
                       ("an emptied file", lambda f: (0, json.dumps({k: "" for k in f}), ""))):
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
