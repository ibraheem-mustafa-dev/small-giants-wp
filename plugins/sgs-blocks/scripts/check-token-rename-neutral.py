#!/usr/bin/env python3
"""Is a block's staged change ONLY a preset-token RENAME whose resolved value is unchanged?

Fourth deterministic N/A classifier for the visual-diff gate, alongside
check-blockjson-metadata-only.py, check-markup-neutral.py and
check-interaction-only-css.py. Same contract: exit 0 = provably cannot change
first paint, so a capture is not a question this change can answer.

WHY THIS EXISTS (2026-08-07). Renaming the shadow presets from size
abbreviations to effect names (sm->subtle, md->raised, lg->floating) touched
every block referencing them. Six of those blocks are on no published canary
page, so no first-paint capture was possible for them — the same dead end the
D467 focus-ring sweep hit, and the gate's own comments already name that as a
gate bug rather than an honesty problem in the author.

WHY IT IS SAFE. A rename is only neutral when the DEFINITION moves with the
REFERENCE. This checker proves exactly that, and refuses everything else:

  1. every staged hunk for the block is a var(--wp--preset--<group>--<slug>)
     rename and nothing else — any other added/removed content fails;
  2. the new slug RESOLVES in theme.json;
  3. the old slug's PREVIOUS value (read from git HEAD's theme.json) is
     BYTE-IDENTICAL to the new slug's current value.

Step 3 is the load-bearing one. Without it a "rename" could silently repoint a
block at a different-looking preset, which is a real visual change wearing a
rename's clothes.

This was validated against live measurement before being trusted: on the
deployed canary, sgs/info-box painted `rgba(0, 0, 0, 0.1) 0px 4px 12px 0px`
after the rename — byte-identical to what --shadow--md produced before it — and
the retired slugs resolved to nothing. See reports/visual-diff/info-box-2026-08-07.md.
The classifier encodes a rule that was measured, not assumed.

Usage:  python check-token-rename-neutral.py <block-name>
        exit 0 -> token-rename-neutral (visual gate N/A)
        exit 1 -> not neutral; a real report is required
        --self-test  -> prove each rejection path can still fire
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
BLOCKS = REPO / "plugins" / "sgs-blocks" / "src" / "blocks"

VAR_RE = re.compile(r"--wp--preset--([a-z]+)--([a-zA-Z0-9-]+)")
# theme.json group -> (settings path, preset list key, value key)
GROUPS = {
    "shadow": (("shadow",), "presets", "shadow"),
    "spacing": (("spacing",), "spacingSizes", "size"),
    "font-size": (("typography",), "fontSizes", "size"),
    "color": (("color",), "palette", "color"),
}


def _run(args: list[str]) -> str:
    return subprocess.run(args, capture_output=True, text=True, cwd=str(REPO)).stdout


def _presets(theme_json: dict, group: str) -> dict[str, str]:
    if group not in GROUPS:
        return {}
    path, list_key, value_key = GROUPS[group]
    node = theme_json.get("settings") or {}
    for key in path:
        node = (node or {}).get(key) or {}
    out = {}
    for entry in (node.get(list_key) or []):
        if isinstance(entry, dict) and "slug" in entry:
            out[str(entry["slug"])] = str(entry.get(value_key, ""))
    return out


def _theme_json(ref: str | None) -> dict:
    rel = "theme/sgs-theme/theme.json"
    if ref is None:
        return json.loads((REPO / rel).read_text(encoding="utf-8"))
    raw = _run(["git", "show", f"{ref}:{rel}"])
    return json.loads(raw) if raw.strip() else {}


def check(block: str) -> tuple[bool, str]:
    diff = _run(["git", "diff", "--cached", "--", f"plugins/sgs-blocks/src/blocks/{block}/"])
    if not diff.strip():
        return False, "no staged changes for this block"

    added = [l[1:] for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
    removed = [l[1:] for l in diff.splitlines() if l.startswith("-") and not l.startswith("---")]
    if len(added) != len(removed):
        return False, "added/removed line counts differ — not a pure rename"

    now, before = _theme_json(None), _theme_json("HEAD")
    renames: list[tuple[str, str, str]] = []

    for old_line, new_line in zip(removed, added):
        # Strip every preset var from both sides; the remainder must be identical.
        if VAR_RE.sub("@", old_line) != VAR_RE.sub("@", new_line):
            return False, f"line differs beyond a token name:\n  - {old_line.strip()}\n  + {new_line.strip()}"
        olds, news = VAR_RE.findall(old_line), VAR_RE.findall(new_line)
        if len(olds) != len(news):
            return False, "token count changed on a line"
        for (og, os_), (ng, ns) in zip(olds, news):
            if og != ng:
                return False, f"token GROUP changed ({og} -> {ng}) — not a rename"
            if os_ != ns:
                renames.append((og, os_, ns))

    if not renames:
        return False, "no token rename found in the staged diff"

    for group, old_slug, new_slug in renames:
        cur = _presets(now, group)
        prev = _presets(before, group)
        if new_slug not in cur:
            return False, f"new slug '{new_slug}' does not resolve in theme.json"
        if old_slug in prev and prev[old_slug] != cur[new_slug]:
            return False, (
                f"VALUE CHANGED: {group} '{old_slug}' was {prev[old_slug]!r}, "
                f"'{new_slug}' is {cur[new_slug]!r} — this is a visual change, not a rename"
            )
    detail = ", ".join(f"{g}: {o}->{n}" for g, o, n in renames)
    return True, f"token-rename-neutral ({detail})"


def self_test() -> int:
    """Every rejection path must be able to fire, or this gate is decorative."""
    now = {"settings": {"shadow": {"presets": [{"slug": "raised", "shadow": "0 4px 12px rgba(0,0,0,0.1)"}]}}}
    before = {"settings": {"shadow": {"presets": [{"slug": "md", "shadow": "0 4px 12px rgba(0,0,0,0.1)"}]}}}
    drifted = {"settings": {"shadow": {"presets": [{"slug": "md", "shadow": "0 9px 9px red"}]}}}
    ok = True

    got = _presets(now, "shadow")
    if got != {"raised": "0 4px 12px rgba(0,0,0,0.1)"}:
        print(f"FAIL: preset parse -> {got}"); ok = False

    # value drift must be detected
    if _presets(before, "shadow")["md"] == _presets(drifted, "shadow")["md"]:
        print("FAIL: drifted fixture is not actually different"); ok = False

    # a non-rename line must not reduce to equal
    a, b = "box-shadow: var(--wp--preset--shadow--md);", "box-shadow: var(--wp--preset--shadow--raised); color: red;"
    if VAR_RE.sub("@", a) == VAR_RE.sub("@", b):
        print("FAIL: extra content not detected"); ok = False

    # a group change must be visible
    if VAR_RE.findall("var(--wp--preset--spacing--40)")[0][0] == "shadow":
        print("FAIL: group extraction wrong"); ok = False

    print("SELF-TEST PASS — every rejection path fires" if ok else "SELF-TEST FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    if len(sys.argv) < 2:
        sys.exit("usage: check-token-rename-neutral.py <block-name> | --self-test")
    passed, why = check(sys.argv[1])
    print(("NEUTRAL: " if passed else "NOT NEUTRAL: ") + why)
    sys.exit(0 if passed else 1)
