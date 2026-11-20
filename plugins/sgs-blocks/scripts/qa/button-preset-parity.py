#!/usr/bin/env python3
"""button-preset-parity.py: prove a change to the button preset code renders byte for byte as before.

Renders a matrix of blocks (sgs/button, sgs/product-card, sgs/form) and of helper calls (the WooCommerce preset rule, the
pressed rules, the focus border, the buy box class) with the real render files of two checkouts, `--before` and `--after`,
under the real theme snapshots of every site in `sites/*/theme-snapshot.json`, in three settings per snapshot:

  off          the snapshot as the site holds it (no `namedButtonPresets`): the switch is off
  on-starters  the switch on, the snapshot cut to the three starter presets without a shadow token: nothing in it asks for
               a name or a shadow beyond what the starters always had
  off+extra    the switch off, with a fifth preset added: a name the site never opted in to

Exit 0 only when every pair of outputs is identical. `--plant-difference` changes one `after` output so the check must report it
(the negative control). No site is contacted: the harness (scripts/qa/lib/render-css-harness.php) runs render.php standalone.

  python plugins/sgs-blocks/scripts/qa/button-preset-parity.py --before <checkout> --after <checkout>
"""
from __future__ import annotations

import argparse
import copy
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

STARTERS = ("primary", "secondary", "outline")
SHADOW_ROLES = ("shadow", "hover-shadow")

BLOCK_CASES = []
for style in ("primary", "secondary", "outline", "link", "custom", "zzz", None):
    attrs = {"label": "Go", "url": "/x"}
    if style is not None:
        attrs["inheritStyle"] = style
    BLOCK_CASES.append(("sgs/button", f"button {style}", attrs))
BLOCK_CASES.append(("sgs/button", "button signature focus", {"label": "Go", "url": "/x", "inheritStyle": "outline", "focusStyle": "signature"}))
BLOCK_CASES.append(("sgs/button", "button own border", {"label": "Go", "url": "/x", "inheritStyle": "secondary", "borderStyle": "dashed"}))
BLOCK_CASES.append(("sgs/button", "button a fifth name", {"label": "Go", "url": "/x", "inheritStyle": "gold"}))
for cta, cta2 in (("primary", "secondary"), ("outline", "outline"), ("zzz", "zzz"), ("gold", "gold")):
    BLOCK_CASES.append(("sgs/product-card", f"card {cta}/{cta2}", {"ctaText": "Buy", "ctaUrl": "/b", "ctaStyle": cta, "cta2Text": "More", "cta2Style": cta2}))
for style in ("primary", "accent", "success", "gold"):
    BLOCK_CASES.append(("sgs/form", f"form submit {style}", {"submitStyle": style}))

HELPER_SNIPPETS = [
    ("woo preset css primary", 'echo sgs_button_preset_css( ".x", "primary" );'),
    ("woo preset css secondary", 'echo sgs_button_preset_css( ".x", "secondary", false, false );'),
    ("woo preset css outline", 'echo sgs_button_preset_css( ".x", "outline" );'),
    ("woo preset css a fifth name", 'echo sgs_button_preset_css( ".x", "gold" );'),
    ("press by variant", 'echo sgs_button_press_rules_by_variant( "u" );'),
    ("press rule per variant", 'foreach ( array( "primary", "secondary", "outline", "link", "custom", "gold" ) as $v ) { echo sgs_button_press_rule_for( ".u.u.sgs-button", $v ); }'),
    ("focus host border", 'foreach ( array( "primary", "secondary", "outline", "link", "custom", "gold" ) as $v ) { echo sgs_button_focus_host_border( array( "", "", "", "" ), "", $v ), "|"; }'),
    ("buybox class", 'require ABSPATH . "src/blocks/buybox/extras.php"; foreach ( array( "", "primary", "secondary", "outline", "zzz", "gold" ) as $v ) { echo sgs_buybox_add_to_cart_class( $v ), "|"; }'),
]


UID = re.compile(r"sgs-btn-[0-9a-f]{8}")


def garbage(name: str) -> bool:
    """A case whose stored value no preset names while the switch is off (so the old attribute list dropped it)."""
    return "zzz" in name or "fifth name" in name or " gold" in name


def settings_variants(snapshot: dict) -> list:
    custom = copy.deepcopy(snapshot.get("settings", {}).get("custom", {}))
    custom.pop("namedButtonPresets", None)
    out = [("off", {"custom": custom})]
    starters = {k: {r: v for r, v in roles.items() if r not in SHADOW_ROLES} for k, roles in (custom.get("buttonPresets") or {}).items() if k in STARTERS or k == "default"}
    on = copy.deepcopy(custom)
    on["buttonPresets"] = starters
    on["namedButtonPresets"] = True
    out.append(("on-starters", {"custom": on}))
    extra = copy.deepcopy(custom)
    extra["buttonPresets"] = dict(extra.get("buttonPresets") or {}, gold={"background": "#c90", "text": "#000", "shadow": "0 1px 2px #000"})
    out.append(("off+extra", {"custom": extra}))
    return out


def wp_validated(checkout: Path, slug: str, attrs: dict) -> dict:
    """The attributes as WordPress hands them to render.php: a value outside its attribute's `enum` is dropped to the default
    (WP_Block_Type::prepare_attributes_for_render), which the harness does not do."""
    meta = json.loads((checkout / "plugins/sgs-blocks/src/blocks" / slug.split("/")[1] / "block.json").read_text(encoding="utf-8"))
    out = dict(attrs)
    for name, spec in (meta.get("attributes") or {}).items():
        if name in out and isinstance(spec.get("enum"), list) and out[name] not in spec["enum"]:
            if "default" in spec:
                out[name] = spec["default"]
            else:
                del out[name]
    return out


def harness(checkout: Path, slug: str, attrs: dict, settings: dict, tmp: Path) -> str:
    attrs = wp_validated(checkout, slug, attrs)
    a, s = tmp / "attrs.json", tmp / "settings.json"
    a.write_text(json.dumps(attrs), encoding="utf-8")
    s.write_text(json.dumps(settings), encoding="utf-8")
    cmd = ["php", str(checkout / "plugins/sgs-blocks/scripts/qa/lib/render-css-harness.php"), "--slug", slug,
           "--attrs-file", str(a), "--global-settings-file", str(s)]
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8").stdout


def snippet(checkout: Path, code: str, settings: dict, tmp: Path) -> str:
    root = (checkout / "plugins/sgs-blocks").as_posix() + "/"
    script = tmp / "snippet.php"
    script.write_text(
        "<?php\ndefine( 'ABSPATH', " + json.dumps(root) + " );\ndefine( 'SGS_BLOCKS_PATH', ABSPATH );\ndefine( 'SGS_BLOCKS_VERSION', 't' );\n"
        "require ABSPATH . 'scripts/qa/lib/wp-stubs.php';\nrequire ABSPATH . 'includes/render-helpers.php';\n"
        "require ABSPATH . 'includes/helpers-button-preset.php';\nrequire ABSPATH . 'includes/helpers-button-press.php';\n"
        "require ABSPATH . 'includes/helpers-button-focus.php';\n"
        "$GLOBALS['sgs_qa_global_settings'] = json_decode( " + json.dumps(json.dumps(settings)) + ", true );\n" + code + "\n",
        encoding="utf-8")
    return subprocess.run(["php", str(script)], capture_output=True, text=True, encoding="utf-8").stdout


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--before", required=True)
    ap.add_argument("--after", required=True)
    ap.add_argument("--sites", default="", help="comma list of site folders under sites/ (default: every one with buttonPresets)")
    ap.add_argument("--plant-difference", action="store_true", help="alter one after output: the run must then fail")
    a = ap.parse_args()
    before, after = Path(a.before), Path(a.after)
    snapshots = {}
    for f in sorted((after / "sites").glob("*/theme-snapshot.json")):
        if a.sites and f.parent.name not in a.sites.split(","):
            continue
        d = json.loads(f.read_text(encoding="utf-8"))
        if (d.get("settings", {}).get("custom", {}) or {}).get("buttonPresets"):
            snapshots[f.parent.name] = d
    compared = differ = 0
    planted = False
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        for site, snap in snapshots.items():
            for label, settings in settings_variants(snap):
                runs = [(f"{slug} {name}", lambda c, slug=slug, attrs=attrs: harness(c, slug, attrs, settings, tmp)) for slug, name, attrs in BLOCK_CASES]
                runs += [(name, lambda c, code=code: snippet(c, code, settings, tmp)) for name, code in HELPER_SNIPPETS]
                for name, run in runs:
                    b, x = run(before), run(after)
                    if a.plant_difference and not planted:
                        x, planted = x + " ", True
                    compared += 1
                    if garbage(name):
                        # The block's scope class is a hash of its attributes. WordPress drops a value outside the old enum before
                        # render.php sees it, so `before` hashes the default and `after` hashes the stored value: same markup, other hash.
                        b, x = UID.sub("sgs-btn-UID", b), UID.sub("sgs-btn-UID", x)
                    is_block = not name.startswith(("woo ", "press ", "focus ", "buybox "))
                    if b != x or (is_block and not b.strip()):
                        differ += 1
                        print(f"DIFFERENT  {site} / {label} / {name}")
            print(f"checked {site}: {compared} comparisons so far")
    print(f"{compared} comparison(s), {differ} different, {len(snapshots)} snapshot(s): " + ", ".join(snapshots))
    return 1 if differ or not compared else 0


if __name__ == "__main__":
    sys.exit(main())
