"""seed-render-composition.py — write `block_render_composition` (Spec 31 §13.9).

A block's render.php can compose ANOTHER registered block at render time by calling
WordPress's own `render_block(['blockName' => '<slug>', ...])` — distinct from
`block_composition.accepts_allowed_blocks`, which only knows about a child block the
EDITOR stored (InnerBlocks). Three real, confirmed instances today: `sgs/buybox` ->
`sgs/option-picker` (one axis-picker per WooCommerce variation axis), `sgs/card-grid`
-> `sgs/product-card` (twice — collection-mode and wc-product-mode branches),
`sgs/product-card` -> `sgs/option-picker` (one axis-picker per visible axis).

This table is the sibling to `block_composition` Bean asked for during the Spec 44
re-verification session (2026-09-17) — a genuinely general, framework-wide fact
about the block composition graph, not something Spec 44 owns. Spec 44's Stage A
and Spec 45's Tier 3 (nested child-block matching) both consume it; neither builds
it. Spec 31 §13.9 is the canonical description.

DETECTION, source-derived (R-31-1: no hand-typed block-to-block dict):
a `render_block()` call is read straight out of the block's real PHP — its
`resolve_sources()`/`mask_php()` primitives are REUSED from `recogniser.
render_repeater_seeder` rather than re-implemented, so a masking bug fixed once
fixes both consumers. Only a LITERAL `'blockName' => '<slug>'` string counts; a
`render_block()` call whose block name is built from a variable or expression is
flagged (WARN, never silently skipped or guessed) — the same fail-loud discipline
`render_repeater_seeder.py` already applies to an unparseable `foreach`.

A call's `call_order` is its position among registered `render_block()` calls IN THE
FILE it was found in (offset-sorted) — this lets `sgs/card-grid`'s two separate calls
to `sgs/product-card`, in two different branches of the same file, coexist as two
distinct, individually-stale-checkable rows.

Usage:
    python plugins/sgs-blocks/scripts/seed-render-composition.py --survey
    python plugins/sgs-blocks/scripts/seed-render-composition.py --seed
"""
from __future__ import annotations

import argparse
import re
import sqlite3
import sys
from pathlib import Path

_RECOGNISER_DIR = Path(__file__).resolve().parent / "recogniser"
if str(_RECOGNISER_DIR) not in sys.path:
    sys.path.insert(0, str(_RECOGNISER_DIR))

import render_repeater_seeder as _rrs  # noqa: E402 — reused primitives, not duplicated

SGS_DB = _rrs.SGS_DB

# A registered WP block slug: 'namespace/block-name'. Anchors the literal-string
# requirement — if the text after 'blockName' => isn't one of these, it's a
# variable/expression and the call is flagged, not guessed at.
_BLOCKNAME_RE = re.compile(
    r"\brender_block\s*\(\s*(?:array\s*\(|\[)\s*"
    r"['\"]blockName['\"]\s*=>\s*"
    r"(['\"])([a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*)\1",
    re.I,
)
_RENDER_BLOCK_CALL_RE = re.compile(r"\brender_block\s*\(", re.I)


class CompositionParseError(RuntimeError):
    """A render_block() call whose blockName isn't a literal — flagged, never guessed."""


def _code_view(src: str) -> str:
    """Original text with only PHP COMMENT spans blanked (offsets preserved).

    Neither of render_repeater_seeder's two views fits: `mask_php` also blanks
    string literals (so the blockName string itself would vanish); `markup_view`
    blanks PHP code entirely. This is the third view — real code AND real string
    literals survive, only comments (which have produced false 'render_block()'
    hits in this very codebase — see below) are removed.
    """
    comments: list[tuple[int, int]] = []
    _rrs.mask_php(src, comments_out=comments)
    out = list(src)
    for start, end in comments:
        for k in range(start, end):
            if not src[k].isspace():
                out[k] = " "
    return "".join(out)


def detect_composition(slug: str, sources: list[tuple[str, str]] | None = None) -> tuple[list[dict], list[str]]:
    """(composed-child rows, parse warnings) for one block.

    `sources` overrides on-disk resolution so a self-test can drive real, mutated
    source through this exact code path.
    """
    sources = _rrs.resolve_sources(slug) if sources is None else sources
    if not sources:
        return [], []
    rows: list[dict] = []
    warnings: list[str] = []
    for fname, text in sources:
        code = _code_view(text)
        order = 0
        for m in _RENDER_BLOCK_CALL_RE.finditer(code):
            window = code[m.start():m.start() + 400]
            # _BLOCKNAME_RE anchors at this call's own start (via pos=m.start()) so a
            # LATER render_block() call inside the 400-char window is never mistaken
            # for this one's blockName.
            lit = _BLOCKNAME_RE.match(code, m.start())
            if lit is None:
                if "'blockName'" in window or '"blockName"' in window:
                    warnings.append(
                        f"{slug}: {fname}: render_block() at offset {m.start()} has a "
                        f"non-literal blockName — NOT seeded (review the PHP, do not "
                        f"read this as 'no composition')."
                    )
                # else: a render_block() call with no blockName key nearby (e.g. a
                # WP_Block object form) — not this mechanism's concern, skip quietly.
                continue
            rows.append({
                "child_slug": lit.group(2),
                "call_order": order,
                "source_file": fname,
                "offset": m.start(),
            })
            order += 1
    rows.sort(key=lambda r: r["offset"])
    for i, r in enumerate(rows):
        r["call_order"] = i
    return rows, warnings


def ensure_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS block_render_composition (
            block_slug   TEXT NOT NULL,
            child_slug   TEXT NOT NULL,
            call_order   INTEGER NOT NULL,
            source_file  TEXT NOT NULL,
            source_sha   TEXT NOT NULL,
            PRIMARY KEY (block_slug, child_slug, source_file, call_order)
        )"""
    )


def seed_render_composition(
    conn: sqlite3.Connection,
    slugs: list[str] | None = None,
    dry_run: bool = False,
    detector=detect_composition,
    sha_fn=_rrs.source_sha,
) -> dict:
    c = conn.cursor()
    if not dry_run:
        ensure_table(conn)
    full_run = slugs is None
    targets = slugs if slugs is not None else _rrs._live_slugs()
    counts = {"scanned": 0, "blocks_composing": 0, "rows": 0, "flagged": 0, "pruned": 0}

    for slug in targets:
        counts["scanned"] += 1
        rows, warnings = detector(slug)
        for w in warnings:
            counts["flagged"] += 1
            print(f"[render_composition] WARN {w}")
        if warnings:
            continue

        sha = sha_fn(slug)
        if rows:
            counts["blocks_composing"] += 1
            counts["rows"] += len(rows)
        if dry_run:
            for r in rows:
                print(f"[dry-run render_composition] {slug} -> {r['child_slug']}"
                      f"#{r['call_order']} ({r['source_file']})")
            continue
        c.execute("DELETE FROM block_render_composition WHERE block_slug = ?", (slug,))
        c.executemany(
            "INSERT INTO block_render_composition "
            "(block_slug, child_slug, call_order, source_file, source_sha) VALUES (?, ?, ?, ?, ?)",
            [(slug, r["child_slug"], r["call_order"], r["source_file"], sha) for r in rows],
        )

    if full_run and not dry_run:
        live = set(targets)
        stale = [r[0] for r in c.execute(
            "SELECT DISTINCT block_slug FROM block_render_composition "
            "WHERE block_slug LIKE 'sgs/%'").fetchall() if r[0] not in live]
        if stale:
            c.executemany("DELETE FROM block_render_composition WHERE block_slug = ?",
                          [(s,) for s in stale])
        counts["pruned"] = len(stale)

    if not dry_run:
        conn.commit()
    return counts


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="Seed block_render_composition (Spec 31 §13.9).")
    ap.add_argument("--survey", action="store_true", help="report without writing")
    ap.add_argument("--seed", action="store_true", help="write rows to sgs-framework.db")
    ap.add_argument("--block", help="limit to one slug, e.g. sgs/buybox")
    args = ap.parse_args(argv)
    if not (args.survey or args.seed):
        ap.error("pass --survey or --seed")
    slugs = [args.block] if args.block else None
    conn = sqlite3.connect(str(SGS_DB))
    try:
        counts = seed_render_composition(conn, slugs=slugs, dry_run=args.survey)
    finally:
        conn.close()
    print(f"render_composition: scanned={counts['scanned']}, "
          f"blocks_composing={counts['blocks_composing']}, rows={counts['rows']}, "
          f"flagged={counts['flagged']}, pruned={counts['pruned']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
