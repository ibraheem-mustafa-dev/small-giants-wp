#!/usr/bin/env python3
"""
check-nested-global-settings.py — reject nested-path wp_get_global_settings() reads.

`wp_get_global_settings( array( 'custom', 'dark' ) )` returns the WHOLE settings
array when that path is missing (WordPress passes the full array as
`_wp_array_get()`'s default). A missing key then reads as a large, truthy, wrong
value: on 2026-09-26 it loaded the dark-mode stylesheet, with a junk colour
mapping, on every site without a dark palette.

Read a key with `sgs_global_custom_setting()` (plugin,
includes/helpers-global-settings.php) or `SGS\\Theme\\global_custom_setting()`
(theme) instead. Core-defined paths (`color.palette`, `shadow.presets`) always exist in the
merged settings and are not reported; a `custom` path, even `array( 'custom' )`,
is.

Usage: python scripts/check-nested-global-settings.py [--check] [--self-test]
Exit 1 when any call site passes a path.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PLUGIN = Path(__file__).resolve().parents[1]
REPO = PLUGIN.parents[1]
ROOTS = [PLUGIN / "includes", PLUGIN / "src", REPO / "theme" / "sgs-theme"]
SKIP_PARTS = {"node_modules", "vendor", "build", "tests"}

# A path into settings.custom, as an array or a dotted string. Core-defined
# paths (color.palette, shadow.presets, spacing.spacingSizes, ...) always exist
# in the merged settings, so only client-optional `custom` keys can go missing.
CALL_RE = re.compile(r"wp_get_global_settings\s*\(\s*(?:array\(\s*|\[\s*)?['\"]custom[\s'\".,]", re.S)


def findings_in(text: str) -> list[tuple[int, str]]:
    out = []
    for m in CALL_RE.finditer(text):
        line = text.count("\n", 0, m.start()) + 1
        end = text.find("\n", m.start())
        out.append((line, " ".join(text[m.start(): end if end > 0 else None].split())))
    return out


def self_test() -> int:
    bad = "$x = wp_get_global_settings( array( 'custom', 'dark' ) );"
    ok = "$settings = wp_get_global_settings(); $p = wp_get_global_settings( array( 'color', 'palette' ) );"
    if not findings_in(bad):
        print("[check-nested-global-settings] SELF-TEST FAILED: the nested read was not caught")
        return 1
    if findings_in(ok):
        print("[check-nested-global-settings] SELF-TEST FAILED: the whole-tree read was flagged")
        return 1
    print("[check-nested-global-settings] self-test OK (catches a path read, passes a whole-tree read)")
    return 0


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    if self_test():
        return 1
    hits = []
    for root in ROOTS:
        for path in root.rglob("*.php"):
            if SKIP_PARTS & set(path.parts):
                continue
            for line, snippet in findings_in(path.read_text(encoding="utf-8", errors="replace")):
                hits.append(f"  {path.relative_to(REPO)}:{line}  {snippet}")
    if hits:
        print(f"[check-nested-global-settings] FAIL — {len(hits)} path read(s); a missing path returns the WHOLE settings array:")
        print("\n".join(hits))
        print("Use sgs_global_custom_setting() (plugin) or SGS\\Theme\\global_custom_setting() (theme).")
        return 1
    print("[check-nested-global-settings] OK — no nested-path wp_get_global_settings() reads.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
