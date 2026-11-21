#!/usr/bin/env python3
"""check-script-strategy.py - no SGS front-end script blocks the page.

THE RULE (plan plans/archive/2026-11-19-css-delivery.md Open 3; release cd9718b2a): a classic script SGS enqueues or registers for the
front end (`wp_enqueue_script` / `wp_register_script` with a file) carries a loading `strategy` (`defer` or `async`) in
its fifth argument. A bare `true` / `false` fifth argument, or none, prints a plain `<script src>` that stops the
browser parsing the page until it has downloaded and run.

A call is
  PASS        its fifth argument is an array naming `strategy`
  NO-FILE     its source is `false` / '' (an inline-data handle: nothing to download), or it names only a handle
              (enqueues one registered elsewhere, which is checked where it is registered)
  ADMIN       the function holding it is hooked, in the same file, only to an admin, editor, customiser or login hook
  EXCEPTION   listed in EXCEPTIONS below with its reason
  BLOCKING    anything else: a front-end or unresolved call without a strategy (fails --check)

The hook of a call is read from the innermost function body around it: for a named function, an
`add_action( '<hook>', … '<name>' )` in the same file (any callable spelling that ends in the name); for a closure, the
hook it is passed to directly. A call at file level, or one whose hook cannot be read, counts as front end. Comments
are read through the shared PHP tokeniser (scripts/lib/identity_scan.py::php_tokens), so a `//` or `#` inside a string
is not taken for a comment.

MODES
  --survey [--json]  every call with its verdict
  --check            exit 1 on any BLOCKING call
  --self-test        a planted blocking front-end enqueue (caught), the same with a strategy (passes), an admin-hooked
                     one (passes), an inline-data handle (passes), an excepted one (passes)

Run from the plugin folder or the repo root: python plugins/sgs-blocks/scripts/check-script-strategy.py --check
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "lib"))
from identity_scan import php_tokens  # noqa: E402  (the shared string-aware PHP tokeniser)

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[3]
SCAN = [ROOT / "plugins" / "sgs-blocks", ROOT / "theme" / "sgs-theme"]
SKIP_PARTS = {"node_modules", "vendor", "build", "stackable", "tests", "scripts", ".phpunit.cache"}

ADMIN_HOOKS = {
    "admin_enqueue_scripts",
    "enqueue_block_editor_assets",
    "customize_controls_enqueue_scripts",
    "customize_controls_print_scripts",
    "customize_controls_print_footer_scripts",
    "customize_preview_init",
    "admin_init",
    "admin_head",
    "admin_footer",
    "admin_print_scripts",
    "admin_print_footer_scripts",
    "login_enqueue_scripts",
    "load-post.php",
    "load-post-new.php",
}

# (repo-relative file, handle as written in the call) -> why it may load without a strategy.
EXCEPTIONS: dict[tuple[str, str], str] = {
    ("plugins/sgs-blocks/includes/woocommerce/checkout-delivery-cards.php", "'sgs-checkout-delivery-cards'"):
        "WooCommerce Blocks checkout helper: it extends the checkout's wp-data store, and WooCommerce's own checkout scripts it depends on print without a strategy, so it must run in their order (css-delivery plan Open 3).",
    ("plugins/sgs-blocks/includes/woocommerce/checkout-payment-loading.php", "'sgs-checkout-payment-loading'"):
        "WooCommerce Blocks checkout helper: subscribes to the checkout's wp-data store in WooCommerce's script order (css-delivery plan Open 3).",
    ("plugins/sgs-blocks/includes/commerce-blocks/class-commerce-blocks-assets.php", "self::HANDLE"):
        "WooCommerce Blocks basket and checkout helper: it adds itself as a dependency of wc-cart-block-frontend and wc-checkout-block-frontend, which WooCommerce prints without a strategy, so WordPress would drop a defer anyway; it must run before them (css-delivery plan Open 3).",
    ("plugins/sgs-blocks/includes/gift-card/class-gift-card-checkout-assets.php", "'sgs-gift-card-checkout'"):
        "WooCommerce Blocks checkout helper: registers a checkout plugin against wc-blocks-checkout, which WooCommerce prints without a strategy; only on basket and checkout pages of a shop that sells gift cards (css-delivery plan Open 3).",
    ("plugins/sgs-blocks/includes/motion/motion-defs-script.php", "'sgs-motion-defs'"):
        "Editor-only handle: registered on init and loaded only as a dependency of block editor scripts (src/components/motion/motion-defs.js); never enqueued on the front end.",
    ("plugins/sgs-blocks/includes/stripe-settings.php", "'stripe-js'"):
        "Stripe.js on sgs/form payment pages: Stripe's own script, which must load as Stripe documents it before the card field mounts; only on pages holding a payment form (css-delivery plan Open 3).",
}


def php_files() -> list[Path]:
    out = []
    for base in SCAN:
        for folder, dirs, files in os.walk(base):
            dirs[:] = [d for d in dirs if d not in SKIP_PARTS]
            out.extend(Path(folder) / f for f in files if f.endswith(".php"))
    return sorted(out)


def strip_comments(src: str) -> str:
    """The file with its comments and `<?php` tags blanked and its strings kept, offsets and line numbers unchanged.

    Reads the file through the shared PHP tokeniser (scripts/lib/identity_scan.py::php_tokens), so a `//` or `#` inside a
    string (a URL, a colour) is never taken for a comment."""
    out = [c if c == "\n" else " " for c in src]
    for tok in php_tokens(src):
        if tok.kind == "code":
            end = tok.pos + len(tok.text)
        elif tok.pos < len(src) and src[tok.pos] in "'\"":
            quote, end = src[tok.pos], tok.pos + 1
            while end < len(src) and src[end] != quote:
                end += 2 if src[end] == "\\" else 1
            end += 1
        else:
            continue  # raw HTML outside <?php ?> or a heredoc body: never a call
        out[tok.pos:end] = src[tok.pos:end]
    return "".join(out)


def enclosing_function(code: str, pos: int) -> tuple[str | None, int | None]:
    """The innermost function body around `pos`: (its name, or None for a closure; the offset of its `function` keyword).
    (None, None) when the call sits at file level."""
    best: tuple[str | None, int | None] = (None, None)
    for f in re.finditer(r"\bfunction\s*&?\s*(\w+)?\s*\(", code[:pos]):
        brace = code.find("{", f.end())
        if brace < 0 or brace > pos:
            continue
        depth, k = 0, brace
        while k < pos:
            if code[k] == "{":
                depth += 1
            elif code[k] == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        if depth > 0:  # pos is inside this body; a later match inside it is nested deeper
            best = (f.group(1), f.start())
    return best


def split_args(src: str, start: int) -> tuple[list[str], int]:
    """Top-level arguments of the call whose '(' is at start; returns (args, index after ')')."""
    depth, i, args, cur = 0, start, [], ""
    quote = ""
    while i < len(src):
        c = src[i]
        if quote:
            cur += c
            if c == "\\":
                cur += src[i + 1]
                i += 1
            elif c == quote:
                quote = ""
        elif c in "'\"":
            quote = c
            cur += c
        elif c in "([{":
            depth += 1
            if depth > 1:
                cur += c
        elif c in ")]}":
            depth -= 1
            if depth == 0:
                if cur.strip():
                    args.append(cur.strip())
                return args, i + 1
            cur += c
        elif c == "," and depth == 1:
            args.append(cur.strip())
            cur = ""
        else:
            cur += c
        i += 1
    return args, i


def has_strategy(arg: str, before: str) -> bool:
    """The fifth argument names a strategy, directly or through a variable last assigned an array that does."""
    if re.search(r"['\"]strategy['\"]\s*=>", arg):
        return True
    var = re.fullmatch(r"\$\w+", arg.strip())
    if not var:
        return False
    assigns = list(re.finditer(re.escape(var.group(0)) + r"\s*=\s*(array\s*\(|\[)", before))
    if not assigns:
        return False
    tail = before[assigns[-1].start():]
    body, _ = split_args(tail, assigns[-1].end() - assigns[-1].start() - 1)
    return any(re.search(r"['\"]strategy['\"]\s*=>", b) for b in body)


def hooks_for(src: str, name: str) -> set[str]:
    hooks = set()
    for m in re.finditer(r"add_action\s*\(\s*['\"]([\w./-]+)['\"]\s*,([^;]*?)\)\s*;", src, re.S):
        if re.search(r"['\"][^'\"]*?\b" + re.escape(name) + r"['\"]", m.group(2)):
            hooks.add(m.group(1))
    return hooks


def classify(path: Path, src: str) -> list[dict]:
    rel = path.relative_to(ROOT).as_posix()
    code = strip_comments(src)
    out = []
    for m in re.finditer(r"\\?\bwp_(enqueue|register)_script\s*\(", code):
        args, _ = split_args(code, m.end() - 1)
        line = code.count("\n", 0, m.start()) + 1
        handle = args[0] if args else ""
        row = {"file": rel, "line": line, "call": f"wp_{m.group(1)}_script", "handle": handle}
        if len(args) < 2 or args[1].strip().lower() in ("false", "''", '""', "null"):
            row["verdict"] = "NO-FILE"
        elif len(args) >= 5 and has_strategy(args[4], code[: m.start()]):
            row["verdict"] = "PASS"
        else:
            fn, at = enclosing_function(code, m.start())
            if fn:
                hooks = hooks_for(code, fn)
            elif at is not None:
                # A closure: the hook it is passed to directly, `add_action( '<hook>', function () { … } )`.
                lead = re.search(r"add_action\s*\(\s*['\"]([\w./-]+)['\"]\s*,\s*(?:static\s+)?$", code[:at])
                hooks = {lead.group(1)} if lead else set()
            else:
                hooks = set()
            row["function"] = fn
            row["hooks"] = sorted(hooks)
            if hooks and hooks <= ADMIN_HOOKS:
                row["verdict"] = "ADMIN"
            elif (rel, handle) in EXCEPTIONS:
                row["verdict"] = "EXCEPTION"
                row["reason"] = EXCEPTIONS[(rel, handle)]
            else:
                row["verdict"] = "BLOCKING"
        out.append(row)
    return out


def survey() -> list[dict]:
    rows = []
    for p in php_files():
        src = p.read_text(encoding="utf-8", errors="replace")
        if "_script" in src:
            rows.extend(classify(p, src))
    return rows


def self_test() -> int:
    cases = {
        "blocking": ("<?php\nfunction sgs_x_assets() {\n\twp_enqueue_script( 'sgs-x', 'x.js', array(), '1', true );\n}\nadd_action( 'wp_enqueue_scripts', 'sgs_x_assets' );\n", "BLOCKING"),
        "deferred": ("<?php\nfunction sgs_x_assets() {\n\twp_enqueue_script( 'sgs-x', 'x.js', array(), '1', array( 'in_footer' => true, 'strategy' => 'defer' ) );\n}\nadd_action( 'wp_enqueue_scripts', 'sgs_x_assets' );\n", "PASS"),
        "admin": ("<?php\nclass A { public function boot() { add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) ); }\n\tpublic function assets() { wp_enqueue_script( 'sgs-a', 'a.js', array(), '1', true ); } }\n", "ADMIN"),
        "via-variable": ("<?php\nfunction sgs_v() {\n\t$opt = array( 'strategy' => 'defer', 'in_footer' => true );\n\twp_register_script( 'sgs-v', 'v.js', array(), '1', $opt );\n}\nadd_action( 'wp_enqueue_scripts', 'sgs_v' );\n", "PASS"),
        "variable-no-strategy": ("<?php\nfunction sgs_w() {\n\t$opt = array( 'in_footer' => true );\n\twp_register_script( 'sgs-w', 'w.js', array(), '1', $opt );\n}\nadd_action( 'wp_enqueue_scripts', 'sgs_w' );\n", "BLOCKING"),
        "no-file": ("<?php\nfunction sgs_y() { wp_register_script( 'sgs-y', false, array(), null, false ); }\nadd_action( 'wp_enqueue_scripts', 'sgs_y' );\n", "NO-FILE"),
        "unresolved": ("<?php\nfunction sgs_z() { wp_enqueue_script( 'sgs-z', 'z.js' ); }\n", "BLOCKING"),
        "commented": ("<?php\n// wp_enqueue_script( 'sgs-c', 'c.js', array(), '1', true );\n", None),
        "url-source": ("<?php\nfunction sgs_u() { wp_enqueue_script( 'sgs-u', 'https://maps.example.com/api.js#x', array(), '1', true ); }\nadd_action( 'wp_enqueue_scripts', 'sgs_u' );\n", "BLOCKING"),
        "closure-front-end": ("<?php\nfunction sgs_boot() { add_action( 'wp_enqueue_scripts', function () { wp_enqueue_script( 'sgs-q', 'q.js', array(), '1', true ); } ); }\nadd_action( 'admin_init', 'sgs_boot' );\n", "BLOCKING"),
        "closure-admin": ("<?php\nadd_action( 'admin_enqueue_scripts', static function () { wp_enqueue_script( 'sgs-r', 'r.js', array(), '1', true ); } );\n", "ADMIN"),
        "file-level-after-function": ("<?php\nfunction sgs_a() {}\nadd_action( 'admin_init', 'sgs_a' );\nwp_enqueue_script( 'sgs-t', 't.js', array(), '1', true );\n", "BLOCKING"),
    }
    fails = []
    with tempfile.TemporaryDirectory() as tmp:
        for name, (src, want) in cases.items():
            p = ROOT / "plugins" / "sgs-blocks" / "includes" / f"__selftest_{name}.php"
            rows = classify(p, src)
            got = rows[0]["verdict"] if rows else None
            if got != want:
                fails.append(f"{name}: expected {want}, got {got}")
        # an exception entry turns the planted blocking call into EXCEPTION
        key = ("plugins/sgs-blocks/includes/__selftest_blocking.php", "'sgs-x'")
        EXCEPTIONS[key] = "self-test"
        got = classify(ROOT / key[0], cases["blocking"][0])[0]["verdict"]
        del EXCEPTIONS[key]
        if got != "EXCEPTION":
            fails.append(f"exception: expected EXCEPTION, got {got}")
    # every exception still names a call that exists
    real = {(r["file"], r["handle"]) for r in survey()}
    for key in EXCEPTIONS:
        if key not in real:
            fails.append(f"stale exception: {key} matches no call")
    for f in fails:
        print("FAIL", f)
    print("self-test:", "FAIL" if fails else "PASS (13 cases)")
    return 1 if fails else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--survey", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    rows = survey()
    if a.json:
        print(json.dumps(rows, indent=1))
    elif a.survey:
        for r in rows:
            extra = r.get("reason") or (",".join(r.get("hooks", [])) if r["verdict"] in ("ADMIN", "BLOCKING") else "")
            print(f"{r['verdict']:<9} {r['file']}:{r['line']} {r['handle']} {extra}")
    blocking = [r for r in rows if r["verdict"] == "BLOCKING"]
    if a.check:
        for r in blocking:
            print(f"BLOCKING {r['file']}:{r['line']} {r['call']}( {r['handle']} ) has no loading strategy "
                  f"(hooks: {', '.join(r['hooks']) or 'unresolved'}). Add array( 'in_footer' => true, 'strategy' => 'defer' ), "
                  "or name it in EXCEPTIONS with the reason it must block.")
        print(f"check-script-strategy: {len(rows)} calls, {len(blocking)} blocking")
        return 1 if blocking else 0
    if not (a.survey or a.json):
        ap.print_help()
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
