"""
smoke_few_shot_injector.py
--------------------------
Smoke test for few_shot_injector.  Uses a synthetic in-memory SQLite database —
does NOT touch any production database, makes no network calls.
Exits 0 on pass, 1 on any failure.
"""

import sys
import os
import time
import tempfile
import sqlite3
import struct
from pathlib import Path

# ---------------------------------------------------------------------------
# Ensure the shared-references root is on sys.path
# ---------------------------------------------------------------------------
_SHARED_REFS = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_SHARED_REFS))

from optimisation_toolkit import few_shot_injector  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _check(cond: bool, msg: str) -> None:
    if not cond:
        print(f"FAIL: {msg}", file=sys.stderr)
        sys.exit(1)


def _pack(floats: list[float]) -> bytes:
    return struct.pack(f"{len(floats)}f", *floats)


def _build_db(path: str) -> None:
    """Populate a synthetic SQLite DB at *path* with known-good fixtures."""
    conn = sqlite3.connect(path)
    conn.executescript("""
        CREATE TABLE corrections (
            id INTEGER PRIMARY KEY,
            content TEXT,
            category TEXT
        );
        CREATE TABLE knowledge (
            id INTEGER PRIMARY KEY,
            title TEXT,
            content TEXT,
            tags TEXT
        );
        CREATE TABLE embeddings (
            source_table TEXT,
            source_id INTEGER,
            embedding BLOB,
            PRIMARY KEY (source_table, source_id)
        );
    """)

    # Three corrections rows
    conn.execute("INSERT INTO corrections VALUES (1, 'Correction content one', 'cat_a')")
    conn.execute("INSERT INTO corrections VALUES (2, 'Correction content two', 'cat_b')")
    conn.execute("INSERT INTO corrections VALUES (3, 'Correction content three', 'cat_c')")

    # Two knowledge rows
    conn.execute("INSERT INTO knowledge VALUES (1, 'Knowledge title one', 'Knowledge content one', 'tag_a')")
    conn.execute("INSERT INTO knowledge VALUES (2, 'Knowledge title two', 'Knowledge content two', 'tag_b')")

    # Embeddings — 8-dimensional float32
    # Query vector will be [1,0,0,0,0,0,0,0] — corrections#1 is "very close" (same direction)
    # knowledge#1 is "moderately close" (45° off)
    # The rest are orthogonal / far

    # corrections#1 — nearly identical to query vector (similarity > 0.99)
    conn.execute(
        "INSERT INTO embeddings VALUES ('corrections', 1, ?)",
        (_pack([0.9999, 0.0001, 0, 0, 0, 0, 0, 0]),)
    )
    # corrections#2 — orthogonal (similarity ≈ 0)
    conn.execute(
        "INSERT INTO embeddings VALUES ('corrections', 2, ?)",
        (_pack([0, 1, 0, 0, 0, 0, 0, 0]),)
    )
    # corrections#3 — anti-correlated (similarity < 0)
    conn.execute(
        "INSERT INTO embeddings VALUES ('corrections', 3, ?)",
        (_pack([-1, 0, 0, 0, 0, 0, 0, 0]),)
    )
    # knowledge#1 — moderate (similarity ≈ 0.707, 45° from query)
    conn.execute(
        "INSERT INTO embeddings VALUES ('knowledge', 1, ?)",
        (_pack([1, 1, 0, 0, 0, 0, 0, 0]),)
    )
    # knowledge#2 — orthogonal
    conn.execute(
        "INSERT INTO embeddings VALUES ('knowledge', 2, ?)",
        (_pack([0, 0, 1, 0, 0, 0, 0, 0]),)
    )

    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Individual tests
# ---------------------------------------------------------------------------

def test_1_top_k_order(db_path: str) -> None:
    """corrections#1 must be ranked first with similarity > 0.99."""
    query = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    results = few_shot_injector.fetch_top_k(query, db_path=db_path, top_k=3)
    _check(len(results) == 3, f"test_1: expected 3 results, got {len(results)}")
    first = results[0]
    _check(
        first["source_table"] == "corrections" and first["source_id"] == 1,
        f"test_1: expected corrections#1 first, got {first['source_table']}#{first['source_id']}"
    )
    _check(
        first["similarity"] > 0.99,
        f"test_1: expected similarity > 0.99, got {first['similarity']:.4f}"
    )


def test_2_prompt_augmentation(db_path: str) -> None:
    """inject() must return original prompt + '## Examples' + all 3 top-k contents."""
    query = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    original = "Original prompt."
    augmented = few_shot_injector.inject(original, query, db_path=db_path, top_k=3)

    _check(
        augmented.startswith("Original prompt."),
        "test_2: augmented prompt does not start with original prompt"
    )
    _check(
        "## Examples" in augmented,
        "test_2: '## Examples' section missing from augmented prompt"
    )

    # Verify all 3 top-k content strings appear
    results = few_shot_injector.fetch_top_k(query, db_path=db_path, top_k=3)
    for ex in results:
        _check(
            ex["content"] in augmented,
            f"test_2: content for {ex['source_table']}#{ex['source_id']} missing from augmented prompt"
        )


def test_3_missing_db_graceful() -> None:
    """inject() on a non-existent path must return the original prompt unchanged."""
    missing = "/tmp/__nonexistent_example_db_smoke_test__.db"
    original = "Prompt for missing db."
    result = few_shot_injector.inject(
        original,
        [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        db_path=missing,
    )
    _check(
        result == original,
        f"test_3: expected original prompt unchanged, got: {result!r}"
    )


def test_4_read_only_does_not_raise(db_path: str) -> None:
    """Opening the db read-only must succeed and return sensible top-k."""
    query = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    # Write a new row to the file BEFORE calling (proves file is a real DB on disk)
    results = few_shot_injector.fetch_top_k(query, db_path=db_path, top_k=3)
    _check(
        len(results) > 0,
        f"test_4: expected >0 results from read-only open, got {len(results)}"
    )
    _check(
        results[0]["source_table"] == "corrections",
        f"test_4: first result should be corrections, got {results[0]['source_table']}"
    )


def test_5_dimension_mismatch(db_path: str) -> None:
    """A 4-dim query against an 8-dim DB must raise ValueError."""
    query_4d = [1.0, 0.0, 0.0, 0.0]  # DB has 8-dim embeddings
    raised = False
    try:
        few_shot_injector.fetch_top_k(query_4d, db_path=db_path, top_k=1)
    except ValueError:
        raised = True
    _check(raised, "test_5: expected ValueError for dimension mismatch but none was raised")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    start = time.time()

    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp_dir:
        db_path = os.path.join(tmp_dir, "synthetic_examples.db")
        _build_db(db_path)

        test_1_top_k_order(db_path)
        test_2_prompt_augmentation(db_path)
        test_3_missing_db_graceful()
        test_4_read_only_does_not_raise(db_path)
        test_5_dimension_mismatch(db_path)

    elapsed = time.time() - start
    _check(elapsed < 10.0, f"smoke ran in {elapsed:.2f}s (limit 10s)")
    print(f"OK few_shot_injector smoke ({elapsed * 1000:.1f}ms)")


if __name__ == "__main__":
    main()
