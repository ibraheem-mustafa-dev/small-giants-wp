#!/usr/bin/env python3
"""
check-custom-colour-survives.py — a custom colour picked in the editor must reach the live page.

Every SGS colour control lets the client pick a palette swatch OR any colour, and the editor
previews either. A render path that treats the value as a palette NAME drops a custom colour
silently: `sanitize_html_class( '#123456' )` returns `123456`, which becomes
`var(--wp--preset--color--123456)` (a variable that does not exist), and
`sgs_resolve_palette_hex()` returns '' for anything that is not a slug, so the WCAG foreground
maths never runs. Nothing else detects this (census-colour-paint-route.py counts which helper
paints, not whether a custom value survives).

Two checks:

  static   (a) `sanitize_html_class( $attributes['<colour attr>'] )`; WordPress's own slug-only
               attributes (textColor, backgroundColor, borderColor, gradient) are exempt, because
               core stores a custom colour in `style.color` instead.
           (b) `sgs_resolve_palette_hex()` called with anything but a fixed slug, outside its own
               definition files. Resolve an attribute through `sgs_colour_hex_for_contrast()`.
           (c) a colour attribute written straight into a CSS declaration through a text sanitiser
               (`'--x:' . sanitize_text_field( $attributes['<colour attr>'] )`): a palette slug lands as
               an invalid bare word and a `;}` breakout passes. Paint through `sgs_colour_value()`.
  render   Every flat colour attribute (framework DB, plus a wide walk of every block.json) is fed
           a palette slug and, separately, a raw hex through the real render.php
           (scripts/qa/lib/render-css-harness.php). Slug reaches the output but the hex does not:
           DROPPED. Neither reaches it: NOT REACHED (the harness cannot render that element with
           default attributes), which is listed as the check's bound, never as a pass.

Usage: python scripts/check-custom-colour-survives.py [--survey] [--json] [--check] [--self-test]
       ... --survey --live <ssh-host> [--menu <menu term id>]   also probes, through real WordPress on the
       canary, every attribute the offline harness cannot reach (a survey mode, never the gate)
Exit 1 (--check) on any static finding or DROPPED attribute.
"""
from __future__ import annotations

import concurrent.futures as cf
import json
import os
import re
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from block_source_files import render_files  # noqa: E402

PLUGIN = Path(__file__).resolve().parents[1]
assert (PLUGIN.parents[1] / ".claude" / "THE-MIGRATION-METHOD.md").exists(), "repo anchor missing"
BLOCKS = PLUGIN / "src" / "blocks"
HARNESS = PLUGIN / "scripts" / "qa" / "lib" / "render-css-harness.php"
DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
SKIP_PARTS = {"node_modules", "vendor", "build", "tests", "fixtures"}

CORE_SLUG_ATTRS = {"textColor", "backgroundColor", "borderColor", "gradient"}
PALETTE_HEX_HOME = {"includes/helpers-colour-wcag.php", "includes/helpers-colour-parse.php"}
FLAT_PROPS = re.compile(
    r"^(background-color|color|color-link|fill|stroke|outline-color|box-shadow-color|scrollbar-color"
    r"|border(-(top|right|bottom|left))?-color)$"
)
NAME_RE = re.compile(r"(Colou?r|Bg|Background|Fill|Stroke)(Hover|Active|Selected|Focus|Open|Current|Checked)?$")

SANITIZE_RE = re.compile(r"(sanitize_html_class|sanitize_key)\(\s*(?:\(\s*string\s*\)\s*)?\$\w+\[\s*['\"](\w+)['\"]\s*\]")
# A CSS declaration ending in "<prop>:" (or a custom property) concatenated with a text-sanitised attribute.
RAW_DECL_RE = re.compile(
    r"[-\w]+:\s*['\"]\s*\.\s*(sanitize_text_field|esc_attr|wp_strip_all_tags|trim)\(\s*"
    r"(?:\(\s*string\s*\)\s*)?\$\w+\[\s*['\"](\w+)['\"]\s*\]"
)
HAND_VAR_RE = re.compile(r"""var\(--wp--preset--color--(?:['"]\s*\.|%s)""")
# Files allowed to build a palette var by hand, each because every non-slug value is refused or
# passed through before the concatenation.
HAND_VAR_OK = {
    "includes/helpers-tokens.php": "sgs_colour_value()'s slug branch, reached only after sgs_is_css_colour()",
    "includes/class-button-preset-control.php": "lists the theme palette's own slugs, never an attribute value",
    "includes/fx-cursor-field.php": "a hex returns before the [a-z0-9-] slug branch",
    "includes/shape-dividers.php": "sgs_sanitise_colour(): a '#' or '(' value never matches its slug pattern",
}
PALETTE_CALL_RE = re.compile(r"sgs_resolve_palette_hex\(\s*([^,)]*)")


def strip_comments(text: str) -> str:
    """Blank /* */ and // comments (not '#', which a hex string contains), keeping newlines."""
    def blank(m: re.Match) -> str:
        return re.sub(r"[^\n]", " ", m.group(0))
    return re.sub(r"/\*.*?\*/|(?<![:'\"])//[^\n]*", blank, text, flags=re.S)


def static_findings(text: str, rel: str, colour_names: set[str]) -> list[dict]:
    code = strip_comments(text)
    out = []
    for m in SANITIZE_RE.finditer(code):
        func, name = m.group(1), m.group(2)
        if (name in colour_names or NAME_RE.search(name)) and name not in CORE_SLUG_ATTRS:
            out.append({"file": rel, "line": code.count("\n", 0, m.start()) + 1, "rule": func,
                        "detail": f"colour value '{name}' read through {func} (strips the #)"})
    for m in RAW_DECL_RE.finditer(code):
        func, name = m.group(1), m.group(2)
        if (name in colour_names or NAME_RE.search(name)) and name not in CORE_SLUG_ATTRS:
            out.append({"file": rel, "line": code.count("\n", 0, m.start()) + 1, "rule": "raw-colour-declaration",
                        "detail": f"colour value '{name}' written into CSS through {func} (a slug is not resolved); use sgs_colour_value()"})
    if rel not in HAND_VAR_OK:
        for m in HAND_VAR_RE.finditer(code):
            out.append({"file": rel, "line": code.count("\n", 0, m.start()) + 1, "rule": "hand-built-palette-var",
                        "detail": "var(--wp--preset--color--…) built by hand turns a custom colour into a missing variable; use sgs_colour_value()"})
    if rel not in PALETTE_HEX_HOME:
        for m in PALETTE_CALL_RE.finditer(code):
            arg = m.group(1).strip()
            if re.fullmatch(r"'[a-z0-9-]+'|\"[a-z0-9-]+\"", arg):
                continue
            out.append({"file": rel, "line": code.count("\n", 0, m.start()) + 1, "rule": "slug-only-lookup",
                        "detail": f"sgs_resolve_palette_hex( {arg} ) returns '' for a custom colour; use sgs_colour_hex_for_contrast()"})
    return out


def php_files() -> list[Path]:
    files = [p for p in (PLUGIN / "includes").rglob("*.php")]
    for render in BLOCKS.glob("*/render.php"):
        files += render_files(render.parent)
    return sorted(p for p in files if not (SKIP_PARTS & set(p.relative_to(PLUGIN).parts)))


def colour_attrs() -> dict[str, dict[str, dict]]:
    """{block_dir: {attr: {'default':..., 'source':'db'|'disk'|'both'}}} for flat string colour attrs."""
    if not DB.exists():
        raise SystemExit(f"[check-custom-colour-survives] framework DB missing: {DB}")
    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    db_rows = con.execute(
        "SELECT block_slug, attr_name, css_property FROM block_attributes WHERE source='sgs' AND attr_type='string'"
    ).fetchall()
    con.close()
    db = {}
    for slug, attr, prop in db_rows:
        if prop and any(FLAT_PROPS.match(p.strip()) for p in prop.split(",")):
            db.setdefault(slug.split("/", 1)[1], set()).add(attr)
    out: dict[str, dict[str, dict]] = {}
    for bj in sorted(BLOCKS.glob("*/block.json")):
        name = bj.parent.name
        meta = json.loads(bj.read_text(encoding="utf-8"))
        attrs = meta.get("attributes", {})
        disk = {a for a, s in attrs.items()
                if isinstance(s, dict) and s.get("type") == "string" and "enum" not in s and "radient" not in a
                and (NAME_RE.search(a) or f"{a}Gradient" in attrs)}
        for a in (disk | db.get(name, set())) - CORE_SLUG_ATTRS:
            if a not in attrs:
                continue
            src = "both" if a in disk and a in db.get(name, set()) else ("disk" if a in disk else "db")
            out.setdefault(name, {})[a] = {"source": src}
    return out


TEXTY = re.compile(r"(text|title|heading|label|content|name|quote|subtitle|description|caption|message|summary"
                   r"|role|org|body|excerpt|eyebrow|badge|headline|subline|tagline)$", re.I)
NOT_TEXTY = re.compile(r"(colou?r|url|link|icon|tag|anchor|align|style|size|weight|font|family|position|type)", re.I)


def block_defaults(block: str) -> dict:
    """block.json defaults, plus sample copy in every empty text-like attribute so elements render."""
    meta = json.loads((BLOCKS / block / "block.json").read_text(encoding="utf-8"))
    out = {}
    for k, v in meta.get("attributes", {}).items():
        if not isinstance(v, dict):
            continue
        if "default" in v:
            out[k] = v["default"]
        if (v.get("type") == "string" and "enum" not in v and not out.get(k)
                and TEXTY.search(k) and not NOT_TEXTY.search(k.replace("Text", "").replace("text", "") or k)):
            out[k] = "Probe copy"
    return out


def render(block: str, attrs: dict) -> tuple[bool, str]:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as fh:
        json.dump(attrs, fh)
    try:
        proc = subprocess.run(["php", "-d", "error_reporting=0", str(HARNESS), "--slug", f"sgs/{block}",
                               "--attrs-file", fh.name,
                               "--content", '<p class="sgs-probe-inner">Probe inner content</p>'], capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=60)
        data = json.loads(proc.stdout[proc.stdout.find("{"):]) if "{" in proc.stdout else {}
    except (subprocess.TimeoutExpired, json.JSONDecodeError):
        data = {}
    finally:
        os.unlink(fh.name)
    return bool(data.get("ok")), (data.get("html") or "") + "\n" + (data.get("css") or "")


def probe_values(i: int) -> tuple[str, str]:
    return f"sgsprobe-{i:03d}", f"#0a1b{i:02x}"


def classify(slug_out: str, hex_out: str, i: int) -> str:
    slug, hexv = probe_values(i)
    slug_hit = re.search(re.escape(slug) + r"(?![0-9a-z])", slug_out) is not None
    hex_hit = re.search(re.escape(hexv) + r"(?![0-9a-f])", hex_out, re.I) is not None
    if hex_hit:
        return "PASS"
    return "DROPPED" if slug_hit else "NOT REACHED"


def render_block_probe(block: str, attrs: list[str]) -> dict[str, str]:
    """Batch render (all attrs at once), then confirm any DROPPED attr on its own."""
    base = block_defaults(block)
    slug_attrs = dict(base, **{a: probe_values(i)[0] for i, a in enumerate(attrs)})
    hex_attrs = dict(base, **{a: probe_values(i)[1] for i, a in enumerate(attrs)})
    ok1, slug_out = render(block, slug_attrs)
    ok2, hex_out = render(block, hex_attrs)
    if not (ok1 and ok2):
        return {a: "NOT RUN" for a in attrs}
    verdicts = {a: classify(slug_out, hex_out, i) for i, a in enumerate(attrs)}
    for i, a in enumerate(attrs):
        if verdicts[a] == "DROPPED":
            _, s_out = render(block, dict(base, **{a: probe_values(i)[0]}))
            _, h_out = render(block, dict(base, **{a: probe_values(i)[1]}))
            verdicts[a] = classify(s_out, h_out, i)
    return verdicts


LIVE_PROBE = PLUGIN / "scripts" / "qa" / "lib" / "live-colour-probe.php"
LIVE_WP = "domains/sandybrown-nightingale-600381.hostingersite.com/public_html"
INNER = '<p class="sgs-probe-inner">Probe inner content</p>'


def live_render(jobs: list[dict], host: str) -> dict[str, str]:
    """Render jobs through real WordPress over SSH (wp eval-file); {job id: html}."""
    remote = "/tmp/sgs-colour-probe"
    payload = json.dumps(jobs)
    subprocess.run(["ssh", host, f"mkdir -p {remote} && cat > {remote}/probe.php"],
                   input=LIVE_PROBE.read_text(encoding="utf-8"), text=True, encoding="utf-8", check=True)
    subprocess.run(["ssh", host, f"cat > {remote}/payload.json"], input=payload, text=True, encoding="utf-8", check=True)
    proc = subprocess.run(["ssh", host, f"cd {LIVE_WP} && wp eval-file {remote}/probe.php {remote}/payload.json "
                           f"--skip-themes=0 2>/dev/null; rm -rf {remote}"],
                          capture_output=True, text=True, encoding="utf-8", errors="replace")
    out = proc.stdout
    return json.loads(out[out.find("{"):]) if "{" in out else {}


def live_survey(pending: dict[str, list[str]], host: str, menu: int) -> dict[str, dict[str, str]]:
    """The slug-vs-hex differential through real WordPress for blocks the offline harness cannot reach."""
    def jobs_for(block: str, pairs: list[tuple[int, str]], tag: str) -> list[dict]:
        base = block_defaults(block)
        if "ref" in base:
            base["ref"] = menu
        return [{"id": f"{block}|{tag}|{kind}", "block": f"sgs/{block}", "content": INNER,
                 "attrs": dict(base, **{a: probe_values(i)[k] for i, a in pairs})}
                for k, kind in ((0, "slug"), (1, "hex"))]
    jobs = [j for b, attrs in pending.items() for j in jobs_for(b, list(enumerate(attrs)), "all")]
    got = live_render(jobs, host)
    verdicts: dict[str, dict[str, str]] = {}
    confirm = []
    for b, attrs in pending.items():
        s_out, h_out = got.get(f"{b}|all|slug"), got.get(f"{b}|all|hex")
        for i, a in enumerate(attrs):
            v = "NOT RUN" if s_out is None or h_out is None else classify(s_out, h_out, i)
            verdicts.setdefault(b, {})[a] = v
            if v == "DROPPED":
                confirm += jobs_for(b, [(i, a)], a)
    if confirm:
        got = live_render(confirm, host)
        for b, attrs in pending.items():
            for i, a in enumerate(attrs):
                if verdicts[b][a] == "DROPPED":
                    verdicts[b][a] = classify(got.get(f"{b}|{a}|slug", ""), got.get(f"{b}|{a}|hex", ""), i)
    return verdicts


def self_test() -> int:
    fails = []
    bad = ("<?php $x = isset( $attributes['drawerBg'] ) ? sanitize_html_class( $attributes['drawerBg'] ) : '';\n"
           "$h = sgs_resolve_palette_hex( $x, '' );\n$y = sanitize_html_class( (string) $attributes['iconBackground'] );\n"
           "$r = sanitize_key( $plan['ribbonColour'] ?? 'accent' );\n$c = 'color:var(--wp--preset--color--' . $slug . ')';")
    ok = ("<?php $w = '#fff'; $t = sanitize_html_class( $attributes['textColor'] ); $h = sgs_resolve_palette_hex( 'text', '#1A202C' );\n"
          "// sanitize_html_class( $attributes['drawerBg'] )\n$i = sanitize_key( $plan['iconName'] );")
    if len(static_findings(bad, "src/blocks/x/render.php", {"drawerBg", "iconBackground"})) != 5:
        fails.append("static: missed a sanitize_html_class/sanitize_key read, a slug-only lookup or a hand-built var")
    if static_findings(ok, "src/blocks/x/render.php", {"drawerBg", "textColor"}):
        fails.append("static: flagged a core slug attribute, a literal slug, a non-colour field or a comment")
    if static_findings("<?php $h = sgs_resolve_palette_hex( $slug );", "includes/helpers-colour-parse.php", set()):
        fails.append("static: flagged the palette helper's own home")
    if static_findings("<?php $v = 'var(--wp--preset--color--' . $slug . ')';", "includes/helpers-tokens.php", set()):
        fails.append("static: flagged an allow-listed hand-built var")
    # A '#' earlier on the line must not hide the read behind it.
    if len(static_findings("<?php $d = '#fff'; $b = sanitize_html_class( $attributes['drawerBg'] );", "x.php", {"drawerBg"})) != 1:
        fails.append("static: a hex string earlier on the line hid a finding")
    raw = ("<?php $c .= '--sgs-x-focus:' . sanitize_text_field( $attributes['focusRingColour'] ) . ';';\n"
           "$d = 'color:' . esc_attr( (string) $attributes['textColourHover'] );")
    if len(static_findings(raw, "src/blocks/x/render.php", set())) != 2:
        fails.append("static: missed a colour written into a declaration through a text sanitiser")
    good = ("<?php $c = '--sgs-x-focus:' . sgs_colour_value( $attributes['focusRingColour'] ) . ';';\n"
            "$t = 'content:' . sanitize_text_field( $attributes['label'] );")
    if static_findings(good, "x.php", set()):
        fails.append("static: flagged a resolved colour or a non-colour declaration")
    if classify("x sgsprobe-003 y", "var(--wp--preset--color--0a1b03)", 3) != "DROPPED":
        fails.append("render: a hex turned into a fake preset var was not DROPPED")
    if classify("sgsprobe-003", "background:#0A1B03", 3) != "PASS":
        fails.append("render: an upper-case hex did not PASS")
    if classify("nothing", "nothing", 3) != "NOT REACHED":
        fails.append("render: an unrendered element was not NOT REACHED")
    if classify("sgsprobe-0031", "#0a1b031", 3) != "NOT REACHED":
        fails.append("render: a longer probe value matched a shorter one")
    for f in fails:
        print(f"[check-custom-colour-survives] SELF-TEST FAILED: {f}", file=sys.stderr)
    if not fails:
        print("[check-custom-colour-survives] self-test OK (10 cases)", file=sys.stderr)
    return 1 if fails else 0


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    if self_test():
        return 1
    stale = [rel for rel in HAND_VAR_OK if not (PLUGIN / rel).exists()]
    if stale:
        print(f"[check-custom-colour-survives] FAIL — HAND_VAR_OK names missing file(s): {', '.join(stale)}")
        return 1
    catalogue = colour_attrs()
    names = {a for attrs in catalogue.values() for a in attrs}
    static = []
    for p in php_files():
        static += static_findings(p.read_text(encoding="utf-8", errors="replace"), p.relative_to(PLUGIN).as_posix(), names)
    renderable = {b: sorted(a) for b, a in catalogue.items() if (BLOCKS / b / "render.php").exists()}
    results: dict[str, dict[str, str]] = {}
    with cf.ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
        futures = {pool.submit(render_block_probe, b, a): b for b, a in renderable.items()}
        for fut in cf.as_completed(futures):
            results[futures[fut]] = fut.result()
    if "--live" in sys.argv:
        host = sys.argv[sys.argv.index("--live") + 1]
        menu = int(sys.argv[sys.argv.index("--menu") + 1]) if "--menu" in sys.argv else 0
        pending = {b: [a for a, v in r.items() if v in ("NOT REACHED", "NOT RUN")] for b, r in results.items()}
        pending = {b: a for b, a in pending.items() if a}
        for b, r in live_survey(pending, host, menu).items():
            for a, v in r.items():
                results[b][a] = v if v != "NOT RUN" else results[b][a]
    rows = [{"block": f"sgs/{b}", "attr": a, "verdict": v, "source": catalogue[b][a]["source"]}
            for b in sorted(results) for a, v in sorted(results[b].items())]
    tally = {k: sum(1 for r in rows if r["verdict"] == k) for k in ("PASS", "DROPPED", "NOT REACHED", "NOT RUN")}
    no_render = sorted(f"sgs/{b}" for b in catalogue if b not in renderable)
    if "--json" in sys.argv:
        print(json.dumps({"static": static, "render": rows, "tally": tally, "static_blocks": no_render}, indent=2))
        return 0
    print(f"[check-custom-colour-survives] {len(rows)} colour attributes on {len(results)} blocks probed: "
          + ", ".join(f"{k} {v}" for k, v in tally.items()))
    for f in static:
        print(f"  STATIC {f['file']}:{f['line']}  {f['detail']}")
    for r in rows:
        if r["verdict"] == "DROPPED" or ("--survey" in sys.argv and r["verdict"] != "PASS"):
            print(f"  {r['verdict']:<11} {r['block']}.{r['attr']}")
    if "--survey" in sys.argv:
        print(f"  (no render.php, not probed: {', '.join(no_render) or 'none'})")
    bad = len(static) + tally["DROPPED"]
    if bad:
        print(f"[check-custom-colour-survives] FAIL — {len(static)} static finding(s), {tally['DROPPED']} dropped custom colour(s).")
        return 1
    print("[check-custom-colour-survives] OK — every probed custom colour reaches the output.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
