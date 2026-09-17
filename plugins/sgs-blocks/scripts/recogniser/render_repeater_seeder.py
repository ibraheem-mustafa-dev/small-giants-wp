"""Seed `block_render_repeaters` — Spec 44 §4.2/§4.3 Steps 1-2 (2026-09-17).

A RENDER-TIME repeater is a `foreach` in a block's own PHP that iterates a plain,
non-attribute-backed array and EMITS markup per iteration. It has no `block.json`
attribute behind it, so `array_item_schema` — which is deleted and rebuilt from
`items.properties` on every `/sgs-update` — can never hold it (§4.2). This is the
sibling table, and this module is its only writer.

Rows record STRUCTURAL roles (§3.1: action-trigger / image-or-fallback /
current-state-indicator / label), never literal field names: the source is
PHP-rendered structure, not a declared schema.

Both facts are derived from the block's real PHP via
`converter.services.render_emits`' own source-resolution path (R-31-1: no
hand-typed Python dict of "which blocks have repeaters"). Structural scanning runs
over a MASK in which HTML regions, comments, strings and heredocs are blanked, so a
`{` in inline CSS or a `?>` inside a string cannot be mistaken for PHP structure;
role signals are read from the original text, where the markup actually lives.

FAIL-LOUD (matching `_populate_emit_shape`'s discipline): a block whose `foreach`
structure cannot be delimited is printed as a loud WARN and left UNSEEDED — never
silently recorded as "no repeater".

DISCLOSED LIMITS (stated, not silent — a reader must know what a clean run means):
  - attribute-backing follows ONE alias hop (`$v = $attributes['x']`), the same
    depth `render_emits._immediate_vars` follows; a two-hop alias reads as
    non-attribute-backed.
  - `image-or-fallback` fires on an `<img>` co-occurring with a conditional
    alternative anywhere in the SAME loop body; it does not prove the branch
    encloses that specific image.
  - a repeater reached only through a helper this block calls but does not
    `require` is invisible, exactly as it is to `render_emits`.
  - `role_order` is ONE CONTINUOUS counter across ALL of a block's repeaters and
    source_files — the spec's own PK is `(block_slug, role, role_order)` with no
    `source_file` in it. A block with two separate repeaters (sgs/buybox has
    exactly this: a value ladder in `render.php`, a thumbnail strip in
    `gallery-col.php`) gets one sequence spanning both, so a consumer comparing
    PER-ITEM shape MUST group by `source_file` first or it compares a MERGED shape
    that exists on no real rendered item.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import sys
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parents[1]
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from converter.services import render_emits as _re_mod  # noqa: E402

BLOCKS_DIR = _re_mod._BLOCKS_DIR
INCLUDES_DIR = _re_mod._INCLUDES_DIR
SGS_DB = Path.home() / ".agents" / "skills" / "sgs-wp-engine" / "sgs-framework.db"

ROLE_ACTION = "action-trigger"
ROLE_IMAGE = "image-or-fallback"
ROLE_CURRENT = "current-state-indicator"
ROLE_LABEL = "label"

_STATE_ATTRS = ("aria-current", "aria-selected", "aria-pressed", "aria-expanded")
_ALTERNATIVE_RE = re.compile(r"(\}\s*else\b|\belse\s*:|\belseif\b|\bendif\b|<\?php\s+else)", re.I)
_IMAGE_RE = re.compile(r"<\s*img\b|sgs_render_media|wp_get_attachment_image", re.I)


class RepeaterParseError(RuntimeError):
    """A `foreach` whose body cannot be delimited — flagged, never assumed absent."""


# ---------------------------------------------------------------- source access

def resolve_sources(slug: str) -> list[tuple[str, str]]:
    """render.php + its require'd .php helpers, kept PER FILE.

    `render_emits._render_source` concatenates the same set; a row needs the
    filename its repeater actually lives in (`source_file`), so the resolution is
    reused here rather than the concatenation.
    """
    bd = BLOCKS_DIR / _re_mod._short(slug)
    rp = bd / "render.php"
    if not rp.exists():
        return []
    src = rp.read_text(encoding="utf-8", errors="replace")
    out = [("render.php", src)]
    for m in _re_mod._REQUIRE_RE.finditer(src):
        base = m.group(1).split("/")[-1]
        for cand in [bd / base, INCLUDES_DIR / base, *list(INCLUDES_DIR.rglob(base))[:1]]:
            if cand.exists():
                out.append((base, cand.read_text(encoding="utf-8", errors="replace")))
                break
    return out


def source_sha(slug: str) -> str:
    """sha256 of the resolved source via render_emits' own path (§4.2)."""
    return hashlib.sha256(_re_mod._render_source(slug).encode("utf-8")).hexdigest()


# ---------------------------------------------------------------- PHP masking

def mask_php(src: str, comments_out: list[tuple[int, int]] | None = None) -> str:
    """Blank HTML, comments, strings and heredocs to spaces, preserving offsets.

    `comments_out`, when given, is filled with the `(start, end)` span of every
    region this walk classified as a PHP COMMENT. It is the single source of
    comment truth: the walk already knows it is inside `<?php ... ?>` and outside
    any string/heredoc, which a standalone regex over the raw source does not.
    `markup_view` consumes it rather than re-scanning (see its own note).
    """
    out = list(src)
    n = len(src)
    i = 0
    in_php = False

    def blank(a: int, b: int) -> None:
        for k in range(a, min(b, n)):
            if out[k] != "\n":
                out[k] = " "

    while i < n:
        if not in_php:
            nxt = src.find("<?", i)
            if nxt == -1:
                blank(i, n)
                break
            blank(i, nxt)
            i = nxt + (5 if src.startswith("<?php", nxt) else 3 if src.startswith("<?=", nxt) else 2)
            blank(nxt, i)
            in_php = True
            continue
        ch = src[i]
        if src.startswith("?>", i):
            blank(i, i + 2)
            i += 2
            in_php = False
        elif ch in "'\"":
            j = i + 1
            while j < n and src[j] != ch:
                j += 2 if src[j] == "\\" else 1
            blank(i, min(j + 1, n))
            i = j + 1
        elif src.startswith("//", i) or ch == "#":
            j = src.find("\n", i)
            j = n if j == -1 else j
            blank(i, j)
            if comments_out is not None:
                comments_out.append((i, j))
            i = j
        elif src.startswith("/*", i):
            j = src.find("*/", i + 2)
            j = n if j == -1 else j + 2
            blank(i, j)
            if comments_out is not None:
                comments_out.append((i, j))
            i = j
        elif src.startswith("<<<", i):
            m = re.match(r"<<<\s*['\"]?([A-Za-z_]\w*)['\"]?\r?\n", src[i:])
            if not m:
                i += 3
                continue
            end = re.search(r"^\s*" + m.group(1) + r"\b", src[i + m.end():], re.M)
            j = n if not end else i + m.end() + end.end()
            blank(i, j)
            i = j
        else:
            i += 1
    return "".join(out)


def markup_view(src: str) -> str:
    """The inverse of `mask_php`: keep HTML regions, string literals and heredoc
    bodies; blank PHP code and comments. Markup — and therefore every role signal —
    only ever lives in one of the kept regions, so scanning this view stops PHP
    operators and identifiers (`$a < $b`, `wp_get_attachment_image_url`) reading as
    rendered markup. Offsets are preserved, so a signal found here can be evaluated
    against the original text.
    """
    comments: list[tuple[int, int]] = []
    masked = mask_php(src, comments_out=comments)
    out = []
    for k, ch in enumerate(src):
        # mask_php blanked it => it is HTML, a string, a comment or a heredoc.
        blanked = masked[k] != ch and not ch.isspace()
        out.append(ch if (blanked or ch.isspace()) else " ")
    # Comments were blanked by mask_php too, so the loop above just restored them.
    # Re-blank the EXACT spans mask_php classified as comments — never a fresh regex
    # over the raw source. That regex ran unscoped and read the `//` in a markup URL
    # (`href="http://…"`) as a line-comment opener, silently blanking the rest of that
    # line — including any real `data-*` action-trigger attribute sitting after it.
    # mask_php's walk already knows it is inside <?php ... ?> and outside any
    # string/heredoc, which is exactly the context a standalone regex cannot see.
    for start, end in comments:
        for k in range(start, end):
            if not src[k].isspace():
                out[k] = " "
    return "".join(out)


def _match_pair(mask: str, start: int, open_ch: str, close_ch: str) -> int:
    depth = 0
    for k in range(start, len(mask)):
        if mask[k] == open_ch:
            depth += 1
        elif mask[k] == close_ch:
            depth -= 1
            if depth == 0:
                return k
    raise RepeaterParseError(f"unbalanced {open_ch}{close_ch} from offset {start}")


_KW_RE = re.compile(r"\b(foreach|endforeach)\b", re.I)


def _parse_foreach(mask: str, at: int) -> tuple[int, int, int, int]:
    """(head_open, head_close, body_start, body_end) for the `foreach` token at `at`."""
    op = mask.find("(", at)
    if op == -1 or mask[at + 7:op].strip():
        raise RepeaterParseError(f"no head parenthesis for foreach at {at}")
    cl = _match_pair(mask, op, "(", ")")
    k = cl + 1
    while k < len(mask) and mask[k].isspace():
        k += 1
    if k >= len(mask):
        raise RepeaterParseError(f"foreach at {at} has no body")
    if mask[k] == ":":
        cur = k + 1
        while True:
            m = _KW_RE.search(mask, cur)
            if not m:
                raise RepeaterParseError(f"foreach at {at} has no matching endforeach")
            if m.group(1).lower() == "endforeach":
                return op, cl, k + 1, m.start()
            cur = _parse_foreach(mask, m.start())[3] + 1
    if mask[k] == "{":
        return op, cl, k, _match_pair(mask, k, "{", "}")
    end = mask.find(";", k)
    if end == -1:
        raise RepeaterParseError(f"foreach at {at} has an undelimited single-statement body")
    return op, cl, k, end


# ---------------------------------------------------------------- role signals

def _tag_open_end(text: str, start: int) -> int:
    """End of an opening tag, skipping `>` that belongs to an embedded `?>`."""
    k = start
    while k < len(text):
        if text.startswith("<?", k):
            j = text.find("?>", k)
            k = len(text) if j == -1 else j + 2
            continue
        if text[k] == ">":
            return k
        k += 1
    return len(text)


def _attr_value(text: str, eq: int) -> str:
    q = text.find('"', eq)
    if q == -1:
        return ""
    k = q + 1
    while k < len(text):
        if text.startswith("<?", k):
            j = text.find("?>", k)
            k = len(text) if j == -1 else j + 2
            continue
        if text[k] == '"':
            return text[q + 1:k]
        k += 1
    return ""


def derive_roles(markup: str, original: str, loop_vars: tuple[str, ...]) -> list[tuple[str, int]]:
    """Structural roles in the loop body, as (role, document offset) — §4.3 Step 2.

    Signals are Thread 1's proven set reapplied to the block's OWN rendered markup
    (`.claude/reports/2026-09-14-claude-design-draft-field-identity-schema.md`):
    a `data-*` attribute on a click target = action-trigger; a toggled
    `aria-current`-family attribute = current-state-indicator; a conditional
    image-vs-text render = image-or-fallback.

    `markup` is the markup-only view (offsets shared with `original`), so PHP code
    can never supply a signal. The one rule that must span both — a loop field
    echoed as element text — reads `original`, where the PHP variable survives.
    """
    found: list[tuple[str, int]] = []

    for m in re.finditer(r"<\s*(button|a)\b", markup, re.I):
        tag = markup[m.start():_tag_open_end(markup, m.start())]
        if re.search(r"\bdata-[a-z][\w-]*\s*=|\bonclick\s*=", tag, re.I):
            found.append((ROLE_ACTION, m.start()))

    for name in _STATE_ATTRS:
        for m in re.finditer(r"\b" + name + r"\s*=", markup, re.I):
            value = _attr_value(markup, m.end() - 1)
            # A toggled state — a hardcoded value is chrome, not a per-item indicator.
            if "<?" in value or "{{" in value:
                found.append((ROLE_CURRENT, m.start()))

    for m in re.finditer(r"\b(aria-label|title)\s*=", markup, re.I):
        found.append((ROLE_LABEL, m.start()))
    for var in loop_vars:
        # `(?<!\?)` so the `>` closing a `?>` is never read as a closing tag.
        for m in re.finditer(r"(?<!\?)>\s*<\?(?:php\s+echo|=)[^?]*" + re.escape(var) + r"\b",
                             original):
            found.append((ROLE_LABEL, m.start()))

    img = _IMAGE_RE.search(markup)
    if img and _ALTERNATIVE_RE.search(original):
        found.append((ROLE_IMAGE, img.start()))

    found.sort(key=lambda r: r[1])
    return found


# ---------------------------------------------------------------- detection

def _blank_nested(body: str, body_start: int, spans: list[tuple[int, int, int, int]]) -> str:
    """Blank (offset-preserving) any foreach span strictly inside this body."""
    end = body_start + len(body)
    out = list(body)
    for op, _cl, bs, be in spans:
        if op <= body_start or be > end:
            continue
        for k in range(op - body_start, min(be, end) - body_start):
            if not out[k].isspace():
                out[k] = " "
    return "".join(out)


def _attribute_backed(head: str, full_src: str) -> bool:
    subject = head.split(" as ")[0] if " as " in head else head
    if "$attributes" in subject:
        return True
    aliases = {
        m.group(1) for m in re.finditer(
            r"(\$[A-Za-z_]\w*)\s*=\s*[^\n;]*\$attributes\s*\[", full_src)
    }
    return any(re.search(re.escape(a) + r"\b", subject) for a in aliases)


def _loop_vars(head: str) -> tuple[str, ...]:
    if " as " not in head:
        return ()
    tail = head.split(" as ", 1)[1]
    return tuple(m.group(0) for m in re.finditer(r"\$[A-Za-z_]\w*", tail))


def detect_repeaters(slug: str, sources: list[tuple[str, str]] | None = None) -> tuple[list[dict], list[str]]:
    """(repeaters, parse warnings) for one block. A repeater = a non-attribute-backed
    `foreach` that emits markup AND yields at least one structural role.

    `sources` overrides the on-disk resolution so a self-test can drive MUTATED real
    source through this exact code path.
    """
    sources = resolve_sources(slug) if sources is None else sources
    if not sources:
        return [], []
    full = "\n".join(t for _f, t in sources)
    repeaters: list[dict] = []
    warnings: list[str] = []
    for fname, text in sources:
        mask, view = mask_php(text), markup_view(text)
        spans = []
        for m in re.finditer(r"\bforeach\b", mask, re.I):
            try:
                spans.append(_parse_foreach(mask, m.start()))
            except RepeaterParseError as exc:
                warnings.append(f"{slug}: {fname}: {exc}")
        for op, cl, bs, be in spans:
            head = text[op + 1:cl]
            if _attribute_backed(head, full):
                continue  # an editor attribute — array_item_schema's territory, §4.2
            # A NESTED loop's markup belongs to that loop's own item, not this one's;
            # counting it here would seed the same `<a>` twice and misstate both shapes.
            body = _blank_nested(text[bs:be], bs, spans)
            body_markup = _blank_nested(view[bs:be], bs, spans)
            if not re.search(r"<\s*[a-zA-Z][\w-]*[\s/>]", body_markup):
                continue  # emits no markup: a value/class-list builder, not a repeater
            roles = derive_roles(body_markup, body, _loop_vars(head))
            if roles:
                repeaters.append({"source_file": fname, "roles": roles})
    return repeaters, warnings


# ---------------------------------------------------------------- DB writer

def _live_slugs() -> list[str]:
    out = []
    for d in sorted(BLOCKS_DIR.iterdir()):
        bj = d / "block.json"
        if not d.is_dir() or not bj.exists():
            continue
        try:
            slug = json.loads(bj.read_text(encoding="utf-8")).get("name", f"sgs/{d.name}")
        except (ValueError, OSError):
            slug = f"sgs/{d.name}"
        if slug.startswith("sgs/"):
            out.append(slug)
    return out


def ensure_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """CREATE TABLE IF NOT EXISTS block_render_repeaters (
            block_slug   TEXT NOT NULL,
            role         TEXT NOT NULL,
            role_order   INTEGER NOT NULL,
            source_file  TEXT NOT NULL,
            source_sha   TEXT NOT NULL,
            PRIMARY KEY (block_slug, role, role_order)
        )"""
    )


def seed_render_repeaters(
    conn: sqlite3.Connection,
    slugs: list[str] | None = None,
    dry_run: bool = False,
    detector=detect_repeaters,
    sha_fn=source_sha,
) -> dict:
    """Delete-then-insert per on-disk block (the `block_selectors` writer's shape),
    plus a prune of rows for slugs with no block.json left (its Task-2b shape).

    `detector`/`sha_fn` are injectable so a self-test can drive MUTATED real source
    through the same code path — never to let it silently read the real tree instead.
    """
    c = conn.cursor()
    if not dry_run:
        ensure_table(conn)  # a survey must not mutate the DB, not even its schema
    table_exists = bool(c.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='block_render_repeaters'"
    ).fetchone())
    full_run = slugs is None
    targets = slugs if slugs is not None else _live_slugs()
    counts = {"scanned": 0, "blocks_with_repeaters": 0, "rows": 0,
              "flagged": 0, "stale_reseeded": 0, "pruned": 0}

    for slug in targets:
        counts["scanned"] += 1
        repeaters, warnings = detector(slug)
        for w in warnings:
            counts["flagged"] += 1
            print(f"[render_repeaters] WARN {w} — NOT seeded (suspected parse failure; "
                  f"review the PHP, do not read this as 'no repeater').")
        if warnings:
            continue

        sha = sha_fn(slug)
        stored = c.execute(
            "SELECT DISTINCT source_sha FROM block_render_repeaters WHERE block_slug = ?",
            (slug,),
        ).fetchall() if table_exists else []
        if stored and any(row[0] != sha for row in stored):
            counts["stale_reseeded"] += 1
            print(f"[render_repeaters] WARN {slug}: source_sha changed since seeding "
                  f"({stored[0][0][:12]} -> {sha[:12]}) — reseeding.")

        rows = []
        # role_order is ONE CONTINUOUS counter across ALL of this block's repeaters and
        # source_files (the PK is (block_slug, role, role_order) — the spec's own DDL has
        # no source_file in it). sgs/buybox really has two separate repeaters (render.php's
        # value ladder, gallery-col.php's thumbnail strip) and they share one sequence — so
        # a consumer comparing PER-ITEM shape MUST group by source_file first, or it
        # compares a MERGED shape that exists on no real rendered item.
        order = 0
        for rep in repeaters:
            for role, _offset in rep["roles"]:
                rows.append((slug, role, order, rep["source_file"], sha))
                order += 1
        if rows:
            counts["blocks_with_repeaters"] += 1
            counts["rows"] += len(rows)
        if dry_run:
            for r in rows:
                print(f"[dry-run render_repeaters] {r[0]}: {r[1]}#{r[2]} ({r[3]})")
            continue
        c.execute("DELETE FROM block_render_repeaters WHERE block_slug = ?", (slug,))
        c.executemany(
            "INSERT INTO block_render_repeaters "
            "(block_slug, role, role_order, source_file, source_sha) VALUES (?, ?, ?, ?, ?)",
            rows,
        )

    if full_run and not dry_run:
        live = set(targets)
        stale = [r[0] for r in c.execute(
            "SELECT DISTINCT block_slug FROM block_render_repeaters "
            "WHERE block_slug LIKE 'sgs/%'").fetchall() if r[0] not in live]
        if stale:
            c.executemany("DELETE FROM block_render_repeaters WHERE block_slug = ?",
                          [(s,) for s in stale])
        counts["pruned"] = len(stale)

    if not dry_run:
        conn.commit()
    return counts


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # cp1252 consoles mangle § and —
    ap = argparse.ArgumentParser(description="Seed block_render_repeaters (Spec 44 §4.2).")
    ap.add_argument("--survey", action="store_true", help="report without writing")
    ap.add_argument("--seed", action="store_true", help="write rows to sgs-framework.db")
    ap.add_argument("--block", help="limit to one slug, e.g. sgs/buybox")
    args = ap.parse_args(argv)
    if not (args.survey or args.seed):
        ap.error("pass --survey or --seed")
    slugs = [args.block] if args.block else None
    conn = sqlite3.connect(str(SGS_DB))
    try:
        counts = seed_render_repeaters(conn, slugs=slugs, dry_run=args.survey)
    finally:
        conn.close()
    print(f"render_repeaters: scanned={counts['scanned']}, "
          f"blocks_with_repeaters={counts['blocks_with_repeaters']}, rows={counts['rows']}, "
          f"flagged={counts['flagged']}, stale_reseeded={counts['stale_reseeded']}, "
          f"pruned={counts['pruned']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
