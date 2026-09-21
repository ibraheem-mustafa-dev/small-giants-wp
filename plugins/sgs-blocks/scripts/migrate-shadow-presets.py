#!/usr/bin/env python3
"""
Shadow preset migration (U-1 commit 4f-1 step 6): the four old theme shadows are replaced by
one named set written against ONE site-wide shadow colour, and every reference to a renamed
slug moves with it.

    python scripts/migrate-shadow-presets.py --survey          census: what still names an old preset
    python scripts/migrate-shadow-presets.py --fix             dry run
    python scripts/migrate-shadow-presets.py --fix --apply     write it
    python scripts/migrate-shadow-presets.py --check           gate: exit 1 while anything is stale
    python scripts/migrate-shadow-presets.py --self-test       assertions + a negative control

Rename map: subtle -> whisper, raised -> soft (floating and glow keep their names, new values).
Presets are `color-mix()` layers over `var(--wp--custom--shadow-colour)`, so a rebrand recolours
every shadow at once (Glow uses the brand colour). Dark mode sets only the site colour.

What it edits (text splices, never a JSON re-serialise, so formatting is untouched):
  * theme.json: `settings.shadow.presets` and `settings.custom.shadowColour`
  * a CSS variable reference `--wp--preset--shadow--<old>` in block/theme CSS and PHP
  * a shadow-named JSON key, PHP array key or JS property whose value is an old slug
  * dark-mode.css: the per-preset overrides become one site-colour override
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PLUGIN = ROOT / "plugins" / "sgs-blocks"
THEME = ROOT / "theme" / "sgs-theme"
RENAME = {"subtle": "whisper", "raised": "soft"}
SITE = "var(--wp--custom--shadow-colour)"
BRAND = "var(--wp--preset--color--primary)"
# name, slug, layers [x, y, blur, spread, colour, opacity %, inset]
PRESETS = [
    ("Whisper", "whisper", [[0, 1, 2, 0, SITE, 10], [0, 0, 0, 1, SITE, 5]]),
    ("Soft", "soft", [[0, 1, 2, 0, SITE, 6], [0, 4, 12, 0, SITE, 10]]),
    ("Lifted", "lifted", [[0, 1, 2, 0, SITE, 5], [0, 4, 8, -2, SITE, 8], [0, 12, 24, -6, SITE, 12]]),
    ("Floating", "floating", [[0, 2, 4, 0, SITE, 4], [0, 8, 16, 0, SITE, 6], [0, 24, 48, -8, SITE, 12], [0, 48, 96, -16, SITE, 10]]),
    ("Crisp", "crisp", [[0, 1, 1, 0, SITE, 16], [0, 2, 4, -1, SITE, 14]]),
    ("Long", "long", [[0, 2, 1, 0, SITE, 9], [0, 4, 2, 0, SITE, 9], [0, 8, 4, 0, SITE, 9], [0, 16, 8, 0, SITE, 9], [0, 32, 16, 0, SITE, 9]]),
    ("Outline", "outline", [[0, 0, 0, 1, SITE, 14], [0, 2, 8, 0, SITE, 6]]),
    ("Grounded", "grounded", [[0, 20, 20, -14, SITE, 26], [0, 1, 2, 0, SITE, 6]]),
    ("Glow", "glow", [[0, 0, 16, 0, BRAND, 55], [0, 0, 40, 0, BRAND, 28]]),
    ("Pressed", "pressed", [[0, 2, 4, 0, SITE, 14, 1], [0, 0, 0, 1, SITE, 6, 1]]),
    ("Hard", "hard", [[4, 4, 0, 0, SITE, 100]]),
]
OLD = "|".join(RENAME)
VAR_REF = re.compile(r"(--wp--preset--shadow--)(%s)\b" % OLD)
# `"iconCircleShadow": "subtle"`, `'cardShadow' => 'raised'`, `cardShadow: 'raised'`, `"shadow": "raised"`
KEY_VALUE = re.compile(r"""((?:["']?[A-Za-z]*[Ss]hadow[A-Za-z]*["']?)\s*(?::|=>)\s*)(["'])(%s)\2""" % OLD)
# `"iconCircleShadow": { "type": "string", "default": "subtle" }` (the value sits on a later line)
JSON_DEFAULT = re.compile(r'(["\'][A-Za-z]*[Ss]hadow[A-Za-z]*["\']\s*:\s*\{[^{}]*?"default"\s*:\s*)"(%s)"' % OLD)
# `$attributes['iconCircleShadow'] ?? 'subtle'` and `isset(...) ? ... : 'subtle'`
PHP_FALLBACK = re.compile(r"""(\[\s*['"][A-Za-z]*[Ss]hadow[A-Za-z]*['"]\s*\][^;\n]*?(?:\?\?|:)\s*)(['"])(%s)\2""" % OLD)
SCAN_DIRS = [PLUGIN / "src", PLUGIN / "includes", THEME / "assets" / "css", THEME / "patterns", THEME / "parts", THEME / "templates"]
SCAN_EXT = {".css", ".php", ".js", ".json", ".html"}
SKIP_PARTS = {"build", "node_modules", "tests", "fixtures"}
DARK = THEME / "assets" / "css" / "dark-mode.css"


def layer_css(l):
    x, y, blur, spread, colour, pct = l[:6]
    inset = "inset " if len(l) > 6 and l[6] else ""
    paint = colour if pct >= 100 else "color-mix(in srgb, %s %s%%, transparent)" % (colour, pct)
    return "%s%spx %spx %spx %spx %s" % (inset, x, y, blur, spread, paint)


def preset_css(layers):
    return ", ".join(layer_css(l) for l in layers)


def presets_block():
    out = ['      "presets": [']
    for i, (name, slug, layers) in enumerate(PRESETS):
        out += ["        {", '          "name": "%s",' % name, '          "slug": "%s",' % slug,
                '          "shadow": "%s"' % preset_css(layers), "        }" + ("," if i < len(PRESETS) - 1 else "")]
    out.append("      ]")
    return "\n".join(out)


def scan_files():
    for base in SCAN_DIRS:
        for path in base.rglob("*"):
            if path.suffix in SCAN_EXT and path.is_file() and not (SKIP_PARTS & set(path.parts)) and path != DARK:
                yield path


def rewrite_text(text):
    """Apply the rename to one file's text. Returns (new_text, hit_count)."""
    new, n1 = VAR_REF.subn(lambda m: m.group(1) + RENAME[m.group(2)], text)
    new, n2 = KEY_VALUE.subn(lambda m: m.group(1) + m.group(2) + RENAME[m.group(3)] + m.group(2), new)
    new, n3 = JSON_DEFAULT.subn(lambda m: m.group(1) + '"' + RENAME[m.group(2)] + '"', new)
    new, n4 = PHP_FALLBACK.subn(lambda m: m.group(1) + m.group(2) + RENAME[m.group(3)] + m.group(2), new)
    return new, n1 + n2 + n3 + n4


def theme_json_text(text):
    """theme.json with the new presets and the site shadow colour (idempotent text splice)."""
    start = text.index('"shadow": {')
    p0 = text.index('"presets": [', start)
    p1 = text.index("\n      ]", p0) + len("\n      ]")
    text = text[:p0 - 6] + presets_block() + text[p1:]
    if '"shadowColour"' not in text:
        anchor = '    "custom": {\n'
        text = text.replace(anchor, anchor + '      "shadowColour": "var(--wp--preset--color--text)",\n', 1)
    return text


def dark_text(text):
    """dark-mode.css: per-preset overrides collapse to the site shadow colour."""
    return re.sub(r"(?m)^([ \t]*)--wp--preset--shadow--(?:subtle|raised|floating|glow):[^\n]*\n(?:[ \t]*--wp--preset--shadow--[^\n]*\n)*",
                  lambda m: m.group(1) + "--wp--custom--shadow-colour: #000000;\n", text)


def plan():
    edits = {}
    tj = THEME / "theme.json"
    raw = tj.read_text(encoding="utf-8")
    if theme_json_text(raw.replace("\r\n", "\n")) != raw.replace("\r\n", "\n"):
        edits[tj] = theme_json_text(raw.replace("\r\n", "\n"))
    if DARK.exists():
        d = DARK.read_text(encoding="utf-8").replace("\r\n", "\n")
        if dark_text(d) != d:
            edits[DARK] = dark_text(d)
    for path in scan_files():
        try:
            body = path.read_text(encoding="utf-8").replace("\r\n", "\n")
        except UnicodeDecodeError:
            continue
        new, hits = rewrite_text(body)
        if hits:
            edits[path] = new
    return edits


def cmd_survey(edits):
    for path in sorted(edits):
        print(" ", path.relative_to(ROOT).as_posix())
    print("%d file(s) need the migration" % len(edits))


def cmd_fix(edits, apply):
    for path, new in sorted(edits.items()):
        if apply:
            path.write_text(new, encoding="utf-8", newline="\n")
        print(("wrote " if apply else "would write ") + path.relative_to(ROOT).as_posix())
    if apply and (THEME / "theme.json").exists():
        json.loads((THEME / "theme.json").read_text(encoding="utf-8"))  # still valid JSON


def self_test():
    ok = True

    def eq(actual, expected, label):
        nonlocal ok
        if actual != expected:
            ok = False
            print("FAIL " + label + "\n  expected: " + repr(expected) + "\n  actual:   " + repr(actual))

    eq(rewrite_text("box-shadow: var(--wp--preset--shadow--raised);"), ("box-shadow: var(--wp--preset--shadow--soft);", 1), "css var")
    eq(rewrite_text('"iconCircleShadow": "subtle"')[0], '"iconCircleShadow": "whisper"', "json key")
    eq(rewrite_text("'cardShadow' => 'raised',")[0], "'cardShadow' => 'soft',", "php key")
    eq(rewrite_text("cardShadow: 'raised',")[0], "cardShadow: 'soft',", "js key")
    later = '"iconCircleShadow": {\n "type": "string",\n "default": "%s"\n}'
    eq(rewrite_text(later % "subtle")[0], later % "whisper", "json default on a later line")
    eq(rewrite_text("$a = isset( $attributes['iconCircleShadow'] ) ? (string) $attributes['iconCircleShadow'] : 'subtle';")[0].endswith(": 'whisper';"), True, "php fallback")
    eq(rewrite_text('"fooBar": { "default": "subtle" }')[1], 0, "a non-shadow default is untouched")
    eq(rewrite_text("'subtle' => array(")[1], 0, "an unrelated 'subtle' key is untouched")
    eq(rewrite_text("--wp--preset--shadow--floating")[1], 0, "floating keeps its name")
    eq(rewrite_text("--wp--preset--shadow--raisedish")[1], 0, "a longer slug is not matched")
    eq(rewrite_text(rewrite_text("var(--wp--preset--shadow--raised)")[0])[1], 0, "idempotent")
    eq(preset_css(PRESETS[10][2]), "4px 4px 0px 0px " + SITE, "a 100% layer has no color-mix")
    eq(preset_css(PRESETS[9][2]).startswith("inset 0px 2px 4px 0px color-mix(in srgb, " + SITE + " 14%"), True, "inset first")
    dark = "  --wp--preset--shadow--subtle: 0 1px 3px rgba(0,0,0,0.3);\n  --wp--preset--shadow--glow: 0 0 20px red;\n\n  color-scheme: dark;\n"
    eq(dark_text(dark), "  --wp--custom--shadow-colour: #000000;\n\n  color-scheme: dark;\n", "dark mode collapses")
    tj = '{\n  "settings": {\n    "shadow": {\n      "defaultPresets": false,\n      "presets": [\n        {"slug": "x"}\n      ]\n    },\n    "custom": {\n      "a": 1\n    }\n  }\n}\n'
    out = theme_json_text(tj)
    parsed = json.loads(out)
    eq([p["slug"] for p in parsed["settings"]["shadow"]["presets"]], [p[1] for p in PRESETS], "theme.json presets replaced")
    eq(parsed["settings"]["custom"]["shadowColour"], "var(--wp--preset--color--text)", "site colour added")
    eq(theme_json_text(out), out, "theme.json splice is idempotent")
    # Negative control: a check that only looked at var refs would miss a JS key.
    eq(KEY_VALUE.search("cardShadow: 'raised'") is not None, True, "negative control: the key rule can fire")
    print("Shadow preset migration self-test: " + ("PASS" if ok else "FAIL"))
    return ok


def main(argv):
    if "--self-test" in argv:
        return 0 if self_test() else 1
    edits = plan()
    if "--check" in argv:
        for path in sorted(edits):
            print("STALE", path.relative_to(ROOT).as_posix())
        print("Shadow presets: %d stale file(s)" % len(edits))
        return 1 if edits else 0
    if "--fix" in argv:
        cmd_fix(edits, "--apply" in argv)
        return 0
    cmd_survey(edits)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
