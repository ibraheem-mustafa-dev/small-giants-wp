"""
few_shot_injector.py
--------------------
Queries a SQLite example store's ``corrections`` and ``knowledge`` tables for
the top-k rows most semantically similar to a given task embedding (using the
``embeddings`` table) and injects them as few-shot examples into a prompt string.

``db_path`` must be supplied by the caller. With ``db_path=None`` every entry point
degrades to a no-op (empty example list / prompt returned unchanged).

Consumer hooks (wired in later phases):
  - /subagent-prompt criteria writing
"""

import os
import sqlite3
import struct
from pathlib import Path

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _unpack_embedding(blob: bytes) -> list[float]:
    """Unpack a BLOB stored as packed float32 values into a Python list."""
    n = len(blob) // 4  # float32 = 4 bytes each
    return list(struct.unpack(f"{n}f", blob))


def _cosine(a: list[float], b: list[float]) -> float:
    """Return cosine similarity between two equal-length float vectors."""
    if len(a) != len(b):
        raise ValueError(
            f"Embedding dimension mismatch: query has {len(a)} dims, "
            f"stored embedding has {len(b)} dims."
        )
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(x * x for x in b) ** 0.5
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


def _resolve_db(db_path: "str | os.PathLike") -> Path:
    """Expand user home shorthand and return a Path."""
    return Path(os.path.expanduser(str(db_path)))


def _open_readonly(path: Path) -> "sqlite3.Connection | None":
    """
    Open an existing SQLite database in read-only mode.
    Returns ``None`` if the file does not exist.
    """
    if not path.exists():
        return None
    uri = f"file:{path}?mode=ro"
    return sqlite3.connect(uri, uri=True)


def _fetch_content(conn: sqlite3.Connection, table: str, row_id: int) -> str:
    """Retrieve the content field for a given table/row_id pair."""
    if table == "corrections":
        row = conn.execute(
            "SELECT content FROM corrections WHERE id = ?", (row_id,)
        ).fetchone()
    elif table == "knowledge":
        # knowledge stores both title and content; combine for context.
        row = conn.execute(
            "SELECT title, content FROM knowledge WHERE id = ?", (row_id,)
        ).fetchone()
        if row:
            title, content = row
            return f"{title}\n{content}" if title else content
    else:
        row = None
    return row[0] if row else ""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def fetch_top_k(
    task_embedding: list[float],
    *,
    db_path: "str | os.PathLike | None" = None,
    top_k: int = 3,
) -> list[dict]:
    """
    Return the top-k rows from ``corrections`` and ``knowledge`` most similar
    to ``task_embedding``, ranked by cosine similarity (descending).

    Each returned dict has keys:
        source_table (str), source_id (int), content (str), similarity (float)

    Returns an empty list if ``db_path`` is None (no example store configured),
    or the database does not exist, is empty, or contains no embeddings. Never
    raises on missing/empty db.
    """
    if db_path is None:
        return []

    path = _resolve_db(db_path)
    conn = _open_readonly(path)
    if conn is None:
        return []

    try:
        rows = conn.execute(
            "SELECT source_table, source_id, embedding FROM embeddings"
        ).fetchall()
    except sqlite3.OperationalError:
        conn.close()
        return []

    if not rows:
        conn.close()
        return []

    scored: list[tuple[float, str, int]] = []
    for source_table, source_id, blob in rows:
        stored_vec = _unpack_embedding(blob)
        # Let ValueError propagate to the caller for dimension mismatches.
        sim = _cosine(task_embedding, stored_vec)
        scored.append((sim, source_table, source_id))

    scored.sort(key=lambda t: t[0], reverse=True)
    top = scored[:top_k]

    results = []
    for sim, table, row_id in top:
        content = _fetch_content(conn, table, row_id)
        results.append(
            {
                "source_table": table,
                "source_id": row_id,
                "content": content,
                "similarity": sim,
            }
        )

    conn.close()
    return results


def inject(
    prompt: str,
    task_embedding: list[float],
    *,
    db_path: "str | os.PathLike | None" = None,
    top_k: int = 3,
) -> str:
    """
    Return ``prompt`` augmented with a ``## Examples`` section containing the
    top-k semantically similar few-shot examples from the configured store.

    If ``db_path`` is None, the database does not exist, or it contains no
    embeddings, the original prompt is returned unchanged. Never raises on
    empty/missing db.
    """
    examples = fetch_top_k(task_embedding, db_path=db_path, top_k=top_k)

    if not examples:
        return prompt

    lines = ["\n\n## Examples\n"]
    for i, ex in enumerate(examples, start=1):
        table = ex["source_table"]
        row_id = ex["source_id"]
        sim = ex["similarity"]
        content = ex["content"]
        lines.append(
            f"### Example {i} (source: {table}#{row_id}, similarity={sim:.3f})\n"
            f"{content}"
        )

    return prompt + "\n".join(lines)
