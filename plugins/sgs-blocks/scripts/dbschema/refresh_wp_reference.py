#!/usr/bin/env python3
"""Refresh the WordPress reference corpus (`hooks` + `docs`) — and DROP stale rows.

WHY
---
`hooks` and `docs` were imported once, in April 2026, from the ``wp-devdocs-mcp``
index and never refreshed. Stale reference data here is not merely useless, it is
WRONG: ``sgs-update-v2.py:2846`` uses the table as an existence gate
(``SELECT 1 FROM hooks WHERE name=? AND source='native_wp'``), so a row for a hook
WordPress has since removed makes that gate answer "yes" incorrectly.

THE SOURCE WAS NEVER LOST — only its database was. ``wp-devdocs-mcp`` is still
installed as a global npm package exposing a ``wp-hooks`` CLI. It does not scrape
a website: it parses the actual SOURCE of WordPress, Gutenberg and WooCommerce
from GitHub, so the corpus is authoritative and pinned to a real revision.

    wp-hooks quick-add-all      # rebuilds ~/.wp-devdocs-mcp/hooks.db (~1 min)
    python refresh_wp_reference.py            # DRY RUN — shows the diff
    python refresh_wp_reference.py --apply    # writes it

Its 8 presets map 1:1 onto the ``source_id`` values the original migrator
recorded (1 wp-core · 2 gutenberg-source · 3 gutenberg-docs · 4 plugin-handbook ·
5 rest-api-handbook · 6 wp-cli-handbook · 7 admin-handbook · 8 woocommerce),
which is what confirms the provenance chain.

WHAT THIS DOES THAT THE ORIGINAL IMPORT DID NOT
------------------------------------------------
The retired ``phase1-migrate-hooks.py`` used ``INSERT OR IGNORE`` — purely
additive. Re-running it would add new hooks and leave every dead one in place,
which is exactly the problem. This script RECONCILES: rows that no longer exist
upstream are DELETED.

⛔ SAFETY: reconciliation touches ONLY imported rows (``source`` in native_wp /
third_party). Rows with ``source='sgs'`` are this framework's own and are NEVER
inserted, updated or deleted here. The `--apply` path asserts the SGS counts are
unchanged afterwards and rolls back if they are not.
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from sandbox import live_db_paths  # noqa: E402

FRESH_DB = Path.home() / ".wp-devdocs-mcp" / "hooks.db"

# source_id -> the label used in sgs-framework.db (matches the original import)
SOURCE_MAP = {
    1: "native_wp",       # wp-core
    2: "native_wp",       # gutenberg-source
    3: "native_wp",       # gutenberg-docs
    4: "native_wp",       # plugin-handbook
    5: "native_wp",       # rest-api-handbook
    6: "native_wp",       # wp-cli-handbook
    7: "native_wp",       # admin-handbook
    8: "third_party",     # woocommerce
}
IMPORTED_SOURCES = ("native_wp", "third_party")
PROTECTED_SOURCE = "sgs"

# The index records SIX hook types; `hooks.hook_type` in sgs-framework.db carries
# `CHECK(hook_type IN ('action','filter'))`, so the other four are rejected
# outright — 290 rows on the 2026-08-02 index. This is almost certainly why the
# original import logged warnings and silently dropped them.
#
# `*_ref_array` is the same hook mechanism with by-reference args
# (do_action_ref_array / apply_filters_ref_array), and `js_*` are the JS-side
# @wordpress/hooks equivalents — live already holds plenty of those (the
# `native.*` and `blocks.*` names), so they were previously normalised this way
# too. Normalising preserves that behaviour and keeps all 290 rather than
# discarding them.
TYPE_MAP = {
    "action": "action",
    "filter": "filter",
    "action_ref_array": "action",
    "filter_ref_array": "filter",
    "js_action": "action",
    "js_filter": "filter",
}


def _ro(db: Path) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def read_fresh(protected: set[tuple[str, str]] | None = None) -> tuple[dict, dict]:
    """Return ({hook_name: row}, {doc_slug: row}) from the freshly built index.

    ``protected`` is the set of ``(name, hook_type)`` pairs already owned by
    ``source='sgs'``. Those are EXCLUDED from the import set — see below.
    """
    protected = protected or set()
    if not FRESH_DB.exists():
        raise SystemExit(
            f"No index at {FRESH_DB}.\n"
            "Build it first:  wp-hooks quick-add-all"
        )
    con = _ro(FRESH_DB)
    try:
        hooks: dict[str, dict] = {}
        for r in con.execute(
            "SELECT source_id, name, type, params, docblock, file_path "
            "FROM hooks WHERE status = 'active'"
        ):
            # A hook can be declared in several files; first occurrence wins,
            # matching the original import's INSERT-OR-IGNORE-on-name behaviour.
            if r["name"] in hooks:
                continue
            hook_type = TYPE_MAP.get(r["type"])
            if hook_type is None:
                continue  # unknown type the CHECK would reject anyway
            # ⛔ COLLISION GUARD. `hooks` carries UNIQUE(name, hook_type), so an
            # INSERT OR REPLACE for a pair the SGS scanner already owns would
            # OVERWRITE that row and flip its source to native_wp — silently
            # destroying framework-owned data under a script that promises never
            # to touch it. Real, not hypothetical: the repo scanner has picked up
            # `example_action`, `example_filter` and `hook` from example code,
            # and all three also appear in the fresh index.
            if (r["name"], hook_type) in protected:
                continue
            hooks[r["name"]] = {
                "name": r["name"],
                "hook_type": hook_type,
                "parameters": r["params"],
                "file_path": r["file_path"],
                "source": SOURCE_MAP.get(r["source_id"], "native_wp"),
                "docblock": r["docblock"],
                "type": hook_type,
            }
        docs: dict[str, dict] = {}
        for r in con.execute(
            "SELECT source_id, file_path, slug, title, doc_type, category, content "
            "FROM docs WHERE status = 'active'"
        ):
            if r["slug"] in docs:
                continue
            docs[r["slug"]] = {
                "source": SOURCE_MAP.get(r["source_id"], "native_wp"),
                "file_path": r["file_path"],
                "slug": r["slug"],
                "title": r["title"],
                "doc_type": r["doc_type"],
                "category": r["category"],
                "content": r["content"],
            }
        return hooks, docs
    finally:
        con.close()


def read_current(db: Path) -> tuple[set[str], set[str], int, int]:
    con = _ro(db)
    try:
        hooks = {
            r[0] for r in con.execute(
                "SELECT name FROM hooks WHERE source IN (?, ?)", IMPORTED_SOURCES)
        }
        docs = {
            r[0] for r in con.execute(
                "SELECT slug FROM docs WHERE source IN (?, ?)", IMPORTED_SOURCES)
        }
        sgs_h = con.execute(
            "SELECT COUNT(*) FROM hooks WHERE source = ?", (PROTECTED_SOURCE,)).fetchone()[0]
        sgs_d = con.execute(
            "SELECT COUNT(*) FROM docs WHERE source = ?", (PROTECTED_SOURCE,)).fetchone()[0]
        return hooks, docs, sgs_h, sgs_d
    finally:
        con.close()


def protected_keys(db: Path) -> tuple[set[tuple[str, str]], set[str]]:
    """The (name, hook_type) pairs and doc slugs owned by source='sgs'."""
    con = _ro(db)
    try:
        pairs = {
            (r[0], r[1]) for r in con.execute(
                "SELECT name, hook_type FROM hooks WHERE source = ?", (PROTECTED_SOURCE,))
        }
        slugs = {
            r[0] for r in con.execute(
                "SELECT slug FROM docs WHERE source = ?", (PROTECTED_SOURCE,))
        }
        return pairs, slugs
    finally:
        con.close()


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--db", type=Path, default=live_db_paths()[0])
    ap.add_argument("--apply", action="store_true",
                    help="write the changes (default is a dry run)")
    args = ap.parse_args()

    prot_pairs, prot_slugs = protected_keys(args.db)
    fresh_hooks, fresh_docs = read_fresh(prot_pairs)
    # docs has no composite key, but a slug owned by SGS must not be replaced.
    for slug in prot_slugs & set(fresh_docs):
        del fresh_docs[slug]
    cur_hooks, cur_docs, sgs_h_before, sgs_d_before = read_current(args.db)

    new_hooks = sorted(set(fresh_hooks) - cur_hooks)
    stale_hooks = sorted(cur_hooks - set(fresh_hooks))
    new_docs = sorted(set(fresh_docs) - cur_docs)
    stale_docs = sorted(cur_docs - set(fresh_docs))

    print(f"target : {args.db}")
    print(f"source : {FRESH_DB}\n")
    print(f"  hooks  fresh={len(fresh_hooks):>5}  current(imported)={len(cur_hooks):>5}"
          f"   +{len(new_hooks)} new  -{len(stale_hooks)} stale")
    print(f"  docs   fresh={len(fresh_docs):>5}  current(imported)={len(cur_docs):>5}"
          f"   +{len(new_docs)} new  -{len(stale_docs)} stale")
    print(f"\n  PROTECTED (never touched): source='sgs' — "
          f"{sgs_h_before} hooks, {sgs_d_before} docs")

    if stale_hooks:
        print(f"\n  stale hooks to DROP (first 10 of {len(stale_hooks)}):")
        for n in stale_hooks[:10]:
            print(f"    - {n}")
    if stale_docs:
        print(f"\n  stale docs to DROP (first 10 of {len(stale_docs)}):")
        for n in stale_docs[:10]:
            print(f"    - {n}")
    if new_hooks:
        print(f"\n  new hooks to ADD (first 10 of {len(new_hooks)}):")
        for n in new_hooks[:10]:
            print(f"    + {n}")

    if not args.apply:
        print("\nDRY RUN — nothing written. Re-run with --apply to commit these changes.")
        return 0

    con = sqlite3.connect(str(args.db))
    try:
        con.execute("BEGIN")
        for row in fresh_hooks.values():
            con.execute(
                "INSERT OR REPLACE INTO hooks "
                "(name, hook_type, plugin_slug, parameters, file_path, source, docblock, type) "
                "VALUES (:name, :hook_type, NULL, :parameters, :file_path, :source, :docblock, :type)",
                row,
            )
        for row in fresh_docs.values():
            con.execute(
                "INSERT OR REPLACE INTO docs "
                "(source, file_path, slug, title, doc_type, category, content) "
                "VALUES (:source, :file_path, :slug, :title, :doc_type, :category, :content)",
                row,
            )
        # RECONCILE — the step the original additive import never had. Scoped to
        # imported sources so SGS-owned rows cannot be caught by it.
        if stale_hooks:
            con.executemany(
                "DELETE FROM hooks WHERE name = ? AND source IN (?, ?)",
                [(n, *IMPORTED_SOURCES) for n in stale_hooks],
            )
        if stale_docs:
            con.executemany(
                "DELETE FROM docs WHERE slug = ? AND source IN (?, ?)",
                [(s, *IMPORTED_SOURCES) for s in stale_docs],
            )

        sgs_h_after = con.execute(
            "SELECT COUNT(*) FROM hooks WHERE source = ?", (PROTECTED_SOURCE,)).fetchone()[0]
        sgs_d_after = con.execute(
            "SELECT COUNT(*) FROM docs WHERE source = ?", (PROTECTED_SOURCE,)).fetchone()[0]
        if (sgs_h_after, sgs_d_after) != (sgs_h_before, sgs_d_before):
            con.execute("ROLLBACK")
            print(
                f"\nROLLED BACK: SGS-owned rows changed "
                f"(hooks {sgs_h_before}->{sgs_h_after}, docs {sgs_d_before}->{sgs_d_after}). "
                f"This script must never touch them.",
                file=sys.stderr,
            )
            return 1
        con.execute("COMMIT")
    finally:
        con.close()

    after_h, after_d, _, _ = read_current(args.db)
    print(f"\nAPPLIED. imported hooks {len(cur_hooks)} -> {len(after_h)}, "
          f"docs {len(cur_docs)} -> {len(after_d)}")
    print(f"SGS-owned rows unchanged: {sgs_h_before} hooks, {sgs_d_before} docs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
