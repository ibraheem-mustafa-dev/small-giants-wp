#!/usr/bin/env python3
"""migrate-font-size-ladder.py — rehome theme font-size preset slugs after a ladder change.

D1007 retired `medium` (18px) and `x-small` (12px) from the SGS type ladder and added
`regular` (16px). Every hand-authored reference to a retired slug in the theme's patterns,
templates and parts has to move somewhere, or WordPress resolves
`var(--wp--preset--font-size--medium)` to an UNDEFINED custom property and the declaration
is silently dropped — the element falls back to its inherited size with no error anywhere.

⛔ This is deliberately NOT a blind find/replace. Where a slug lands depends on what the
declaration is FOR, and that is decided by the owning block (and, for `sgs/business-info`,
by its `displayType`):

  sgs/heading + medium        -> large    (20px) — a sub-heading should stay above body size
  sgs/text + medium           -> regular  (16px) — body copy
  sgs/business-info + medium  -> regular  (16px) — contact content

  footer body content + small -> regular  (16px) — D1007: the footer renders body text and
      should read like body text. Measured 13.0082px live on real footer nav links before
      this change, because `small` was the one preset whose `fluid: false` opt-out was never
      applied. `displayType` in DISPLAY_TYPES_BODY.

  copyright / attribution     -> KEEP small — fine print at 14px is a universal convention.
      Bean's objection was to readable footer CONTENT being shrunk, not to the legal line.

  x-small                     -> small — `x-small` had zero uses anywhere; the mapping exists
      so a stray authoring cannot dangle.

`display` IS retired, and there is no automatic mapping for it — `--check` fails on any
authoring so a human writes explicit values instead.

It had exactly one use, `templates/404.html`'s giant numeral. That was first read as a reason
to KEEP the preset; Bean's correction is that one use is a reason to write an explicit value,
not to carry a permanent row in every client's font-size picker forever. He was right, and the
argument for keeping it was weaker than it looked: the Spec 33 extractor does not emit
per-client values for `display` anyway, so holding it as a token bought no per-client scaling.

Removing it also fixed a regression D1007 had introduced. `display` previously carried
`fluid: {min: 56px, max: 120px}`, so it rendered 56px on a phone. Setting every preset
`fluid: false` without adding `display` to the media-query overrides left it at a flat 120px at
EVERY width — measured live at 375px. The 404 now carries
`{"desktop":120,"tablet":80,"mobile":56}` on the block itself, which restores the old mobile
size exactly and adds the tablet step it never had.

Usage:
    python scripts/migrate-font-size-ladder.py --survey
    python scripts/migrate-font-size-ladder.py --fix            # dry run, prints the diff
    python scripts/migrate-font-size-ladder.py --fix --apply    # write
    python scripts/migrate-font-size-ladder.py --check          # gate: exit 1 on any retired slug
    python scripts/migrate-font-size-ladder.py --self-test
"""
from __future__ import annotations

import argparse
import io
import pathlib
import re
import sys

RETIRED = ("medium", "x-small", "display")

# `sgs/business-info` displayTypes that render READABLE CONTENT, as opposed to fine print.
DISPLAY_TYPES_BODY = ("description", "address", "phone", "email", "hours")
DISPLAY_TYPES_FINE_PRINT = ("copyright", "attribution")

# One serialised block comment: `<!-- wp:sgs/<name> {json} /-->` or `<!-- wp:sgs/<name> {json} -->`.
_BLOCK_RE = re.compile(r"<!--\s*wp:(sgs/[a-z0-9-]+)\s+(\{.*?\})\s*/?-->", re.DOTALL)
_DESKTOP_FS_RE = re.compile(r'("fontSize"\s*:\s*\{[^{}]*?"desktop"\s*:\s*")([a-z-]+)(")')
_DISPLAY_TYPE_RE = re.compile(r'"displayType"\s*:\s*"([a-z-]+)"')


def target_slug(block: str, attrs_json: str, current: str) -> str | None:
    """The slug this declaration should carry, or None to leave it alone.

    Pure function of (block, attrs, current slug) so it is testable without the filesystem.
    """
    if current == "x-small":
        return "small"

    if current == "medium":
        if block == "sgs/heading":
            return "large"
        return "regular"

    if current == "small":
        # Only footer-style body content moves; fine print stays small.
        if block == "sgs/business-info":
            m = _DISPLAY_TYPE_RE.search(attrs_json)
            dtype = m.group(1) if m else ""
            if dtype in DISPLAY_TYPES_BODY:
                return "regular"
            return None  # copyright / attribution / socials / map — leave it
        return None

    return None


def rewrite(text: str) -> tuple[str, list[tuple[str, str, str]]]:
    """Return (new_text, [(block, from_slug, to_slug), ...])."""
    changes: list[tuple[str, str, str]] = []

    def _block_sub(bm: re.Match) -> str:
        block, attrs = bm.group(1), bm.group(2)

        def _fs_sub(fm: re.Match) -> str:
            current = fm.group(2)
            tgt = target_slug(block, attrs, current)
            if tgt is None or tgt == current:
                return fm.group(0)
            changes.append((block, current, tgt))
            return f"{fm.group(1)}{tgt}{fm.group(3)}"

        new_attrs = _DESKTOP_FS_RE.sub(_fs_sub, attrs)
        return bm.group(0).replace(attrs, new_attrs, 1) if new_attrs != attrs else bm.group(0)

    return _BLOCK_RE.sub(_block_sub, text), changes


def theme_files(root: pathlib.Path):
    base = root / "theme" / "sgs-theme"
    yield from sorted(base.glob("patterns/*.php"))
    yield from sorted(base.glob("templates/*.html"))
    yield from sorted(base.glob("parts/*.html"))


def repo_root() -> pathlib.Path:
    return pathlib.Path(__file__).resolve().parents[3]


def run(mode: str, apply: bool) -> int:
    root = repo_root()
    total = 0
    touched = 0
    retired_left: list[str] = []

    for f in theme_files(root):
        text = io.open(f, encoding="utf-8").read()
        new, changes = rewrite(text)

        if mode == "check":
            for slug in RETIRED:
                if re.search(r'"desktop"\s*:\s*"%s"' % re.escape(slug), text):
                    retired_left.append(f"{f.relative_to(root)}: still authors retired slug {slug!r}")
            continue

        if not changes:
            continue
        total += len(changes)
        touched += 1
        rel = f.relative_to(root)
        if mode == "survey":
            for block, a, b in changes:
                print(f"  {rel}: {block}  {a} -> {b}")
        else:
            print(f"  {rel}: {len(changes)} change(s)")
            if apply:
                io.open(f, "w", encoding="utf-8", newline="").write(new)

    if mode == "check":
        if retired_left:
            print("FAIL — retired font-size slugs still authored:")
            for line in retired_left:
                print("  " + line)
            return 1
        print("PASS — no retired font-size slug authored in any theme pattern/template/part.")
        return 0

    verb = "applied" if apply else "would change"
    print(f"\n{total} declaration(s) {verb} across {touched} file(s).")
    if not apply and mode == "fix":
        print("Dry run. Re-run with --apply to write.")
    return 0


def self_test() -> int:
    checks = 0

    def eq(got, want, label):
        nonlocal checks
        checks += 1
        assert got == want, f"{label}: got {got!r}, want {want!r}"

    # routing by block
    eq(target_slug("sgs/heading", "{}", "medium"), "large", "heading medium -> large")
    eq(target_slug("sgs/text", "{}", "medium"), "regular", "text medium -> regular")
    eq(target_slug("sgs/business-info", "{}", "medium"), "regular", "business-info medium")
    eq(target_slug("sgs/text", "{}", "x-small"), "small", "x-small -> small")

    # footer body vs fine print — the judgement this script exists to encode
    eq(target_slug("sgs/business-info", '{"displayType":"phone"}', "small"), "regular", "phone -> regular")
    eq(target_slug("sgs/business-info", '{"displayType":"address"}', "small"), "regular", "address -> regular")
    eq(target_slug("sgs/business-info", '{"displayType":"copyright"}', "small"), None, "copyright stays")
    eq(target_slug("sgs/business-info", '{"displayType":"attribution"}', "small"), None, "attribution stays")
    eq(target_slug("sgs/business-info", '{"displayType":"socials"}', "small"), None, "socials stays")

    # NEGATIVE CONTROLS — a slug that is not retired must never move.
    eq(target_slug("sgs/heading", "{}", "hero"), None, "hero untouched")
    # `display` is RETIRED but has no automatic mapping — there is no equivalent preset, so
    # --check must FAIL on it and a human writes explicit tier values (as templates/404.html
    # now does). Returning None here is the correct behaviour, not an oversight.
    eq(target_slug("sgs/heading", "{}", "display"), None, "display has no auto-mapping")
    eq(target_slug("sgs/text", "{}", "regular"), None, "regular untouched")
    eq(target_slug("sgs/text", "{}", "large"), None, "large untouched")

    # end-to-end rewrite, and proof it does NOT touch a tablet/mobile key or another property
    src = ('<!-- wp:sgs/heading {"content":"Hi","fontSize":{"desktop":"medium"}} /-->\n'
           '<!-- wp:sgs/text {"fontSize":{"desktop":"medium"},"lineHeight":{"desktop":"medium"}} /-->\n'
           '<!-- wp:sgs/business-info {"displayType":"copyright","fontSize":{"desktop":"small"}} /-->\n')
    out, ch = rewrite(src)
    eq(len(ch), 2, "two changes only")
    assert '"fontSize":{"desktop":"large"}' in out, "heading did not become large"
    assert '"fontSize":{"desktop":"regular"}' in out, "text did not become regular"
    assert '"lineHeight":{"desktop":"medium"}' in out, "lineHeight must NOT be touched"
    assert '"displayType":"copyright","fontSize":{"desktop":"small"}' in out, "copyright must stay small"
    checks += 4

    # a non-sgs block must be ignored entirely
    core = '<!-- wp:paragraph {"fontSize":{"desktop":"medium"}} /-->'
    out2, ch2 = rewrite(core)
    eq(ch2, [], "core block untouched")
    eq(out2, core, "core block text unchanged")

    print(f"self-test: {checks} assertions passed")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--survey", action="store_true")
    g.add_argument("--fix", action="store_true")
    g.add_argument("--check", action="store_true")
    g.add_argument("--self-test", action="store_true")
    ap.add_argument("--apply", action="store_true", help="with --fix, write the changes")
    a = ap.parse_args()

    if a.self_test:
        return self_test()
    if a.survey:
        return run("survey", False)
    if a.check:
        return run("check", False)
    return run("fix", a.apply)


if __name__ == "__main__":
    sys.exit(main())
