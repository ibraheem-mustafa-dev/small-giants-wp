"""seed-render-singletons.py — write `block_render_singletons` (Spec 31 §13.10).

A STATIC/SINGLETON structural element is content that renders EXACTLY ONCE — not
inside a `foreach` (that's `block_render_repeaters`, Spec 44 §4.2) and not a child
block composed at render time via `render_block()` (that's `block_render_composition`,
Spec 31 §13.9) — but still carries a real, matchable structural role (§3.1:
action-trigger / image-or-fallback / current-state-indicator / label).

Concrete proven case: `sgs/buybox`'s main product image
(`plugins/sgs-blocks/src/blocks/buybox/gallery-col.php`) sits OUTSIDE its thumbnail
`foreach` loop and OUTSIDE its one `render_block()` call to `sgs/option-picker`, yet
has a genuine `image-or-fallback` conditional (a real `<img>` vs. an SVG placeholder).
It is invisible to both sibling tables today, and for a minimal single-image/
single-variant product, buybox's thumbnail gallery AND price-ladder AND axis-picker
composition all degrade to empty/absent — meaning the static parts are the ONLY
reliably-present signal for the most common real case.

DETECTION, REUSE-NOT-REIMPLEMENT (R-31-1: no hand-typed block-to-role dict):
this module builds NO new PHP masking or role-detection logic. It calls the two
sibling detectors to learn which byte spans they already claimed —
`render_repeater_seeder.detect_repeaters()`'s `foreach` body spans (via its
additive `spans_out` parameter — ALL of them, including attribute-backed ones
excluded from `block_render_repeaters` itself, because that markup is still
"repeated, not static") and this module's own `render_block()` call spans (found
via the reused `_match_pair()` primitive over the reused `mask_php()` mask, so a
paren inside a string-literal argument can never be miscounted as call structure)
— blanks those spans (offset-preserving, spaces only) out of BOTH the file's
`markup_view()` and its original text, and runs the reused `derive_roles()` on
what's left with an EMPTY `loop_vars` tuple: there is no loop to bind an
item-variable from at top level, so the echoed-loop-var label signal simply
never fires here, which is correct, not a bug to work around.

FAIL-LOUD (matching both siblings' discipline): if EITHER sibling detector
already flagged a WARN for this block, singleton seeding is skipped too and the
equivalent WARN is printed — a block whose repeater/composition spans are
already known-unreliable must never have its "everything else" region guessed
at, because "everything else" is only correct when the two subtractions were.

DISCLOSED LIMITS (stated, not silent):
  - inherits every disclosed limit of `render_repeater_seeder.detect_repeaters()`
    and `seed-render-composition.py::detect_composition()` transitively, since
    this module's own correctness depends on both being right about what they
    claim.
  - `role_order` is ONE CONTINUOUS counter across ALL of a block's singletons and
    source_files, identical to `block_render_repeaters`' own PK shape — a
    consumer comparing per-file shape MUST group by `source_file` first.
  - inherits `render_repeater_seeder.resolve_sources()`'s own duplicate-basename
    limit: 3 real live blocks (`sgs/gallery`, `sgs/hero`, `sgs/post-grid`) each
    list `render-helpers.php` twice in their resolved source list. Harmless
    today only because that file carries zero role signals for those blocks
    (verified: 0 rows) — if it ever gained a real signal, that duplication
    could theoretically double-seed a role for one of those three blocks.

Usage:
    python plugins/sgs-blocks/scripts/seed-render-singletons.py --survey
    python plugins/sgs-blocks/scripts/seed-render-singletons.py --seed
    python plugins/sgs-blocks/scripts/seed-render-singletons.py --seed --block sgs/buybox
"""
from __future__ import annotations

import argparse
import importlib.util
import sqlite3
import sys
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parent
_RECOGNISER_DIR = _SCRIPTS_DIR / "recogniser"
if str(_RECOGNISER_DIR) not in sys.path:
    sys.path.insert(0, str(_RECOGNISER_DIR))

import render_repeater_seeder as _rrs  # noqa: E402 — reused primitives, not duplicated

SGS_DB = _rrs.SGS_DB


def _load_composition_module():
    """Dynamically load `seed-render-composition.py` — its filename is hyphenated,
    so it cannot be a plain `import` target. Mirrors the exact pattern
    `sgs-update-v2.py` already uses for its own hyphenated-filename imports
    (`spec_from_file_location` + `module_from_spec` + `exec_module`).
    """
    path = _SCRIPTS_DIR / "seed-render-composition.py"
    spec = importlib.util.spec_from_file_location("sgs_seed_render_composition", str(path))
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


_comp = _load_composition_module()


def _render_block_call_spans(text: str) -> list[tuple[int, int]]:
    """(start, end) for EVERY `render_block()` call in `text` — end is one past the
    call's own matching close paren. Uses `_match_pair()` (reused from
    `render_repeater_seeder`) over `mask_php()`'s own mask (reused too — strings are
    blanked there, so a paren inside a string-literal argument, e.g. a URL, can never
    be miscounted as call structure). Finds ALL calls, not just the ones with a
    literal `blockName` that `detect_composition()` turns into rows — a call this
    module's own fail-loud gate has already let through (no warnings) still occupies
    real PHP code that must not read as static markup.
    """
    mask = _rrs.mask_php(text)
    spans: list[tuple[int, int]] = []
    for m in _comp._RENDER_BLOCK_CALL_RE.finditer(mask):
        open_paren = m.end() - 1  # the regex itself ends on the call's own '('
        try:
            close_paren = _rrs._match_pair(mask, open_paren, "(", ")")
        except _rrs.RepeaterParseError as exc:
            # Fail-loud per call site, matching both sibling detectors' own
            # discipline — WARN and skip just this call, never abort the whole run.
            print(f"[render_singletons] WARN render_block() call at offset "
                  f"{m.start()} unparseable ({exc}) — NOT counted as a claimed "
                  f"span; continuing.")
            continue
        spans.append((m.start(), close_paren + 1))
    return spans


def _blank_spans(text: str, spans: list[tuple[int, int]]) -> str:
    """Blank (offset-preserving, spaces only) every given span in `text` — the same
    discipline `mask_php`/`markup_view`/`_blank_nested` already use."""
    out = list(text)
    n = len(out)
    for start, end in spans:
        for k in range(max(start, 0), min(end, n)):
            if out[k] != "\n":
                out[k] = " "
    return "".join(out)


def detect_singletons(
    slug: str, sources: list[tuple[str, str]] | None = None
) -> tuple[list[dict], list[str]]:
    """(singleton rows, parse warnings) for one block.

    `sources` overrides on-disk resolution so a self-test can drive MUTATED real
    source through this exact code path — never to let it silently read the real
    tree instead.
    """
    sources = _rrs.resolve_sources(slug) if sources is None else sources
    if not sources:
        return [], []

    spans_by_file: dict[str, list[tuple[int, int]]] = {}
    _repeaters, rep_warnings = _rrs.detect_repeaters(slug, sources=sources, spans_out=spans_by_file)
    _comp_rows, comp_warnings = _comp.detect_composition(slug, sources=sources)
    warnings = list(rep_warnings) + list(comp_warnings)
    if warnings:
        # A sibling detector's own boundaries are unreliable for this block — guessing
        # what's "left over" from an unreliable subtraction is worse than staying silent.
        return [], warnings

    rows: list[dict] = []
    for fname, text in sources:
        view = _rrs.markup_view(text)
        claimed = list(spans_by_file.get(fname, [])) + _render_block_call_spans(text)
        remaining_markup = _blank_spans(view, claimed)
        remaining_original = _blank_spans(text, claimed)
        roles = _rrs.derive_roles(remaining_markup, remaining_original, loop_vars=())
        if roles:
            rows.append({"source_file": fname, "roles": roles})
    return rows, []


# ---------------------------------------------------------------- DB writer

def ensure_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS block_render_singletons (
            block_slug   TEXT NOT NULL,
            role         TEXT NOT NULL,
            role_order   INTEGER NOT NULL,
            source_file  TEXT NOT NULL,
            source_sha   TEXT NOT NULL,
            PRIMARY KEY (block_slug, role, role_order)
        )"""
    )


def seed_render_singletons(
    conn: sqlite3.Connection,
    slugs: list[str] | None = None,
    dry_run: bool = False,
    detector=detect_singletons,
    sha_fn=_rrs.source_sha,
) -> dict:
    """Delete-then-insert per on-disk block, plus a prune of rows for slugs with no
    block.json left — the same shape both sibling seeders already use.

    `detector`/`sha_fn` are injectable so a self-test can drive MUTATED real source
    through the same code path — never to let it silently read the real tree instead.
    """
    c = conn.cursor()
    if not dry_run:
        ensure_table(conn)  # a survey must not mutate the DB, not even its schema
    table_exists = bool(c.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='block_render_singletons'"
    ).fetchone())
    full_run = slugs is None
    targets = slugs if slugs is not None else _rrs._live_slugs()
    counts = {"scanned": 0, "blocks_with_singletons": 0, "rows": 0,
              "flagged": 0, "stale_reseeded": 0, "pruned": 0}

    for slug in targets:
        counts["scanned"] += 1
        singles, warnings = detector(slug)
        for w in warnings:
            counts["flagged"] += 1
            print(f"[render_singletons] WARN {w} — NOT seeded (a sibling detector's "
                  f"foreach/render_block() boundaries are unreliable here; review the "
                  f"PHP, do not read this as 'no static content').")
        if warnings:
            continue

        sha = sha_fn(slug)
        stored = c.execute(
            "SELECT DISTINCT source_sha FROM block_render_singletons WHERE block_slug = ?",
            (slug,),
        ).fetchall() if table_exists else []
        if stored and any(row[0] != sha for row in stored):
            counts["stale_reseeded"] += 1
            print(f"[render_singletons] WARN {slug}: source_sha changed since seeding "
                  f"({stored[0][0][:12]} -> {sha[:12]}) — reseeding.")

        rows = []
        # role_order is ONE CONTINUOUS counter across ALL of this block's singletons
        # and source_files — identical PK shape to block_render_repeaters, so a
        # consumer comparing PER-FILE shape MUST group by source_file first.
        order = 0
        for single in singles:
            for role, _offset in single["roles"]:
                rows.append((slug, role, order, single["source_file"], sha))
                order += 1
        if rows:
            counts["blocks_with_singletons"] += 1
            counts["rows"] += len(rows)
        if dry_run:
            for r in rows:
                print(f"[dry-run render_singletons] {r[0]}: {r[1]}#{r[2]} ({r[3]})")
            continue
        c.execute("DELETE FROM block_render_singletons WHERE block_slug = ?", (slug,))
        c.executemany(
            "INSERT INTO block_render_singletons "
            "(block_slug, role, role_order, source_file, source_sha) VALUES (?, ?, ?, ?, ?)",
            rows,
        )

    if full_run and not dry_run:
        live = set(targets)
        stale = [r[0] for r in c.execute(
            "SELECT DISTINCT block_slug FROM block_render_singletons "
            "WHERE block_slug LIKE 'sgs/%'").fetchall() if r[0] not in live]
        if stale:
            c.executemany("DELETE FROM block_render_singletons WHERE block_slug = ?",
                          [(s,) for s in stale])
        counts["pruned"] = len(stale)

    if not dry_run:
        conn.commit()
    return counts


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # cp1252 consoles mangle § and —
    ap = argparse.ArgumentParser(description="Seed block_render_singletons (Spec 31 §13.10).")
    ap.add_argument("--survey", action="store_true", help="report without writing")
    ap.add_argument("--seed", action="store_true", help="write rows to sgs-framework.db")
    ap.add_argument("--block", help="limit to one slug, e.g. sgs/buybox")
    args = ap.parse_args(argv)
    if not (args.survey or args.seed):
        ap.error("pass --survey or --seed")
    slugs = [args.block] if args.block else None
    conn = sqlite3.connect(str(SGS_DB))
    try:
        counts = seed_render_singletons(conn, slugs=slugs, dry_run=args.survey)
    finally:
        conn.close()
    print(f"render_singletons: scanned={counts['scanned']}, "
          f"blocks_with_singletons={counts['blocks_with_singletons']}, rows={counts['rows']}, "
          f"flagged={counts['flagged']}, stale_reseeded={counts['stale_reseeded']}, "
          f"pruned={counts['pruned']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
