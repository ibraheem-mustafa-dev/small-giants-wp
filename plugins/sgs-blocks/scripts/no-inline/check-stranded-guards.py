#!/usr/bin/env python3
"""Anti-regression GATE for STRANDED inline-style guards (Spec 32).

WHAT IT GUARDS
--------------
SGS stylesheets historically carried fallback rules shaped

    .sgs-x__y:not([style*="color"]) { color: var(--wp--preset--color--text) }

The `:not([style*="…"])` guard means "apply this UNLESS an inline colour is
present on this element". It could only ever match INLINE output. The Spec 32
no-inline migration moved every block colour into a scoped `<style>` rule, so
no inline `style` property declaration is emitted any more — which STRANDS the
guard: it always matches, the fallback becomes unconditional, and two things
break.

  1. INHERITANCE IS BLOCKED. The element can never take a contextual colour.
     Measured 2026-08-06 on `sgs/icon-list`: dark text token painted inside a
     dark drawer -> rgb(58,46,38) on rgb(58,46,38), contrast 1:1, invisible,
     across 6 elements in 2 POC variants.

  2. THE GUARD OUT-RANKS THE OPERATOR. `:not()` takes the specificity of its
     most specific argument, and `[style*="color"]` is an attribute selector
     worth (0,1,0). So the guard ADDS specificity rather than removing it.
     Measured on `sgs/card-grid`: the guard
     `.sgs-card-grid--overlay .sgs-card-grid__title:not([style*="color"])` is
     (0,3,0), while render.php emits the operator's own colour at
     `.{uid} .sgs-card-grid__title` = (0,2,0). The fallback WON, with no
     `!important` available to break the tie.

THE RULE
--------
A `:not([style*=…])` guard is legitimate ONLY in a block that genuinely still
emits an inline `style` property declaration. Under Spec 32 essentially none
do, so essentially every such guard is a defect. This gate finds them.

Note the guard's OWNER is derived from the BEM class in the selector, not the
directory the stylesheet sits in: `accordion/style.css` carries guards on
`.sgs-accordion-item__header`, and the markup for that class lives in the
SEPARATE `accordion-item` block. Keying on the directory would check the wrong
block's render.php and pass vacuously.

WHY THIS GATE IS STATIC (unlike its sibling `check-no-inline.py`)
-----------------------------------------------------------------
The sibling gate hunts a defect PRODUCED AT RENDER TIME (WP serialising
supports inline), so only the rendered DOM is authoritative. A stranded guard
is the opposite: it is written LITERALLY into source and is a defect of the
source text. A static scan is the right and complete signal here, and it needs
no network.

Usage
-----
  python check-stranded-guards.py            # scan src/blocks
  python check-stranded-guards.py --selftest # negative-controlled detector proof
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import detect  # noqa: E402  (reuse its validated style-tag stripper)

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BLOCKS_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "blocks"

# BOTH quote styles — `timeline/style.scss` used single quotes and was missed by
# every double-quote-only sweep before 2026-08-06.
GUARD_RE = re.compile(r""":not\(\[style\*=(?:"|')[^\]]*?(?:"|')\]\)""")

# Where a guard may appear.
GUARD_FILES = ("style.css", "style.scss", "editor.css", "render.php", "view.js")
# Where an inline style= would be EMITTED from.
EMIT_FILES = ("render.php", "save.js")

# An inline style attribute carrying a real CSS PROPERTY declaration, e.g.
# style="color:…" / style="background: …". A `--var` value does not count: the
# guards sniff property names (`[style*="color"]`), which a custom property
# never satisfies.
INLINE_EMIT_RE = re.compile(
    r"""style\s*=\s*(?:"|'|\\"|\\')\s*(?!--)[^"'>]*?[a-zA-Z-]+\s*:""",
)

# Derive the OWNING block slug from the BEM class in the guard's selector.
BEM_RE = re.compile(r"\.sgs-([a-z0-9-]+?)__")


def strip_comments(text: str, is_php: bool) -> str:
    """Remove comments so a guard quoted in a docblock is not a finding, and a
    `style="color:…"` inside a comment is not counted as an emission.

    NOTE: `detect.py` provides `strip_style_tag_bodies()` but NOT a comment
    stripper, so the comment handling is implemented here rather than borrowed.

    CRITICAL: `strip_style_tag_bodies()` is deliberately NOT applied here. It is
    correct for the EMISSION check (a `style="…"` substring inside an emitted
    CSS rule string must not be read as an inline attribute) and it is applied
    there — but applying it to GUARD detection is actively wrong. Measured
    2026-08-06: `mega-panel/render.php` contains 4 `<style>`/`</style>` literal
    pairs with the PHP that BUILDS the CSS in between, so the DOTALL strip
    swallowed the real guard on line 433 and the gate reported clean. A guard
    inside a PHP-built CSS string is exactly the guard this gate exists to
    catch.
    """
    if is_php:
        text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
        text = re.sub(r"(?m)(?<!:)//.*$", "", text)
        text = re.sub(r"(?m)^\s*#(?!\[).*$", "", text)
    else:
        text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
        text = re.sub(r"(?m)(?<!:)//.*$", "", text)
    return text


def block_emits_inline(block_dir: Path) -> bool:
    """True if this block emits any inline `style=` PROPERTY declaration."""
    for name in EMIT_FILES:
        p = block_dir / name
        if not p.exists():
            continue
        body = p.read_text(encoding="utf-8", errors="replace")
        if p.suffix == ".php":
            # HERE the style-tag strip IS correct: it stops a `style="…"`
            # substring inside an emitted CSS rule string being mistaken for a
            # real inline attribute. (Never applied to guard detection — see
            # strip_comments().)
            body = detect.strip_style_tag_bodies(body)
        body = strip_comments(body, is_php=p.suffix == ".php")
        if INLINE_EMIT_RE.search(body):
            return True
    return False


def scan(blocks_dir: Path) -> list[str]:
    """Return one finding per stranded guard, as `block:file:line`."""
    findings: list[str] = []
    emits_cache: dict[str, bool] = {}

    for block_dir in sorted(p for p in blocks_dir.iterdir() if p.is_dir()):
        for name in GUARD_FILES:
            f = block_dir / name
            if not f.exists():
                continue
            raw = f.read_text(encoding="utf-8", errors="replace")
            clean = strip_comments(raw, is_php=f.suffix == ".php")
            if not GUARD_RE.search(clean):
                continue
            # Report real line numbers: only count a guard line that survives
            # comment-stripping.
            live = {l.strip() for l in clean.split("\n") if GUARD_RE.search(l)}
            for i, line in enumerate(raw.split("\n"), 1):
                if not GUARD_RE.search(line) or line.strip() not in live:
                    continue
                bem = BEM_RE.search(line)
                owner = bem.group(1) if bem else block_dir.name
                owner_dir = blocks_dir / owner
                if not owner_dir.is_dir():
                    owner, owner_dir = block_dir.name, block_dir
                if owner not in emits_cache:
                    emits_cache[owner] = block_emits_inline(owner_dir)
                if not emits_cache[owner]:
                    findings.append(
                        f"{block_dir.name}:{name}:{i}  (guards .sgs-{owner}__…, "
                        f"but sgs/{owner} emits NO inline style)"
                    )
    return findings


def run_scan(blocks_dir: Path = BLOCKS_DIR) -> int:
    findings = scan(blocks_dir)
    if findings:
        print(f"\n[check-stranded-guards] FAIL — {len(findings)} stranded "
              f":not([style*=…]) guard(s):")
        for f in findings:
            print(f"  X  {f}")
        print(
            "\nUnder Spec 32 no block emits an inline `style` property declaration,\n"
            "so these guards always match: the fallback is unconditional, it blocks\n"
            "contextual inheritance, and `[style*=…]` ADDS (0,1,0) so it can out-rank\n"
            "the operator's own `.{uid}` scoped rule.\n"
            "Fix: delete the rule if the value merely restates what the element\n"
            "inherits, or keep the declaration wrapped in :where() (specificity 0)."
        )
        return 1
    print("[check-stranded-guards] PASS — 0 stranded guards across "
          f"{sum(1 for p in blocks_dir.iterdir() if p.is_dir())} block(s).")
    return 0


def run_selftest() -> int:
    """Negative-controlled proof: the detector FIRES on an injected guard in a
    clean block, and STAYS SILENT for a block that genuinely inlines."""
    ok = True
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)

        # (1) NEGATIVE CONTROL — clean block, no guard: must not fire.
        clean = root / "cleanblock"
        clean.mkdir()
        (clean / "style.css").write_text(
            ".sgs-cleanblock__title { color: var(--wp--preset--color--text); }\n",
            encoding="utf-8")
        (clean / "render.php").write_text(
            "<?php $css = '.uid .sgs-cleanblock__title{color:red}';\n"
            "echo '<div class=\"sgs-cleanblock\"><style>' . $css . '</style></div>';\n",
            encoding="utf-8")
        if scan(root):
            print("  X selftest: clean block false-flagged"); ok = False
        else:
            print("  ok: clean block NOT flagged (baseline silent)")

        # (2) INJECT the defect into that same clean block -> must FAIL.
        (clean / "style.css").write_text(
            '.sgs-cleanblock__title:not([style*="color"]) '
            "{ color: var(--wp--preset--color--text); }\n",
            encoding="utf-8")
        hits = scan(root)
        if len(hits) != 1 or "cleanblock:style.css:1" not in hits[0]:
            print(f"  X selftest: injected guard NOT detected (got {hits})"); ok = False
        else:
            print(f"  ok: injected guard detected -> {hits[0]}")

        # (2b) SINGLE-QUOTE variant (the timeline/style.scss shape that every
        # double-quote-only sweep missed).
        (clean / "style.css").unlink()
        (clean / "style.scss").write_text(
            ".sgs-cleanblock__title:not([style*='color']) { color: red; }\n",
            encoding="utf-8")
        hits = scan(root)
        if len(hits) != 1 or "style.scss" not in hits[0]:
            print(f"  X selftest: single-quote guard NOT detected (got {hits})"); ok = False
        else:
            print("  ok: single-quote :not([style*='color']) detected in .scss")

        # (2c) A guard sitting inside a COMMENT must NOT fire (icon-list's
        # explanatory docblock quotes the shape it removed).
        (clean / "style.scss").write_text(
            '/* removed: .sgs-cleanblock__t:not([style*="color"]) {…} */\n'
            ".sgs-cleanblock__title { color: red; }\n", encoding="utf-8")
        if scan(root):
            print("  X selftest: guard inside a comment false-flagged"); ok = False
        else:
            print("  ok: guard quoted inside a comment NOT flagged")
        (clean / "style.scss").unlink()

        # (3) POSITIVE CONTROL — a block that GENUINELY emits an inline style
        # property declaration: its guard is legitimate, so exit 0.
        inliner = root / "inliner"
        inliner.mkdir()
        (inliner / "style.css").write_text(
            '.sgs-inliner__title:not([style*="color"]) { color: red; }\n',
            encoding="utf-8")
        (inliner / "render.php").write_text(
            "<?php echo '<p class=\"sgs-inliner__title\" "
            "style=\"color:' . $c . '\">x</p>';\n", encoding="utf-8")
        hits = [h for h in scan(root) if h.startswith("inliner")]
        if hits:
            print(f"  X selftest: legitimate guard on an inlining block flagged: {hits}")
            ok = False
        else:
            print("  ok: guard on a genuinely-inlining block NOT flagged")

        # (3b) PHP-BUILT GUARD BETWEEN <style> LITERALS — the exact blind spot
        # that hid mega-panel/render.php:433 from the first version of this
        # gate. The file has `<style>` … `</style>` literals with the CSS-
        # building PHP in between, so a DOTALL style-tag strip swallows the
        # guard. Guard detection must NOT strip style-tag bodies.
        phpguard = root / "phpguard"
        phpguard.mkdir()
        (phpguard / "render.php").write_text(
            "<?php echo '<style>';\n"
            "$css = $sel . ':not([style*=\"background\"]){background:red}';\n"
            "echo $css; echo '</style>';\n"
            "echo '<style>'; echo $more; echo '</style>';\n",
            encoding="utf-8")
        hits = [h for h in scan(root) if h.startswith("phpguard")]
        if not hits:
            print("  X selftest: PHP-built guard between <style> literals NOT detected")
            ok = False
        else:
            print("  ok: PHP-built guard between <style> literals detected "
                  "(style-tag strip correctly not applied to guard scanning)")

        # (4) CROSS-BLOCK OWNERSHIP — a guard in `parent/style.css` naming
        # `.sgs-parent-item__x` must be judged against the `parent-item` block.
        parent = root / "parent"
        parent.mkdir()
        (parent / "style.css").write_text(
            '.sgs-parent-item__header:not([style*="color"]) { color: red; }\n',
            encoding="utf-8")
        (parent / "render.php").write_text(
            "<?php echo '<div class=\"sgs-parent\" style=\"color:red\">x</div>';\n",
            encoding="utf-8")
        item = root / "parent-item"
        item.mkdir()
        (item / "render.php").write_text(
            "<?php echo '<summary class=\"sgs-parent-item__header\">x</summary>';\n",
            encoding="utf-8")
        hits = [h for h in scan(root) if h.startswith("parent:")]
        if not hits or "sgs/parent-item" not in hits[0]:
            print(f"  X selftest: cross-block ownership not resolved (got {hits})")
            ok = False
        else:
            print("  ok: guard attributed to the OWNING block sgs/parent-item, "
                  "not the stylesheet's own dir")

    if ok:
        print("\n[check-stranded-guards --selftest] PASS — fires on inject, "
              "silent on clean and on legitimately-inlining blocks.")
        return 0
    print("\n[check-stranded-guards --selftest] FAIL")
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Stranded inline-style guard gate (Spec 32).")
    ap.add_argument("--selftest", action="store_true",
                    help="negative-controlled detector proof (no filesystem deps)")
    args = ap.parse_args()
    return run_selftest() if args.selftest else run_scan()


if __name__ == "__main__":
    raise SystemExit(main())
