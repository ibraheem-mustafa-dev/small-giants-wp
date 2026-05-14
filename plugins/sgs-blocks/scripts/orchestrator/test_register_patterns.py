"""Spec 15 Phase 6 Step 0 -- register_patterns.py contract tests.

Tests 1-7: register_run() happy path, idempotency, skips, canonical-DB isolation.
Test 8:    visual_qa_capture.stub_capture() return-shape contract.
Tests 9-10: pure-function unit tests for _section_class_to_slug +
            _composed_inner_blocks.

All DB assertions target ephemeral tmp copies -- the canonical
sgs-framework.db and ui-ux-pro-max.db are never touched.

UK English in comments and assertion messages.
"""
from __future__ import annotations

import importlib.util
import json
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent

# ---------------------------------------------------------------------------
# Load register_patterns (hyphenated dir name → must use importlib)
# ---------------------------------------------------------------------------
_rp_spec = importlib.util.spec_from_file_location(
    "register_patterns", HERE / "register_patterns.py"
)
mod = importlib.util.module_from_spec(_rp_spec)
sys.modules["register_patterns"] = mod
_rp_spec.loader.exec_module(mod)

# ---------------------------------------------------------------------------
# Load visual_qa_capture (needed for test 8)
# ---------------------------------------------------------------------------
_vqc_spec = importlib.util.spec_from_file_location(
    "visual_qa_capture", HERE / "visual_qa_capture.py"
)
vqc = importlib.util.module_from_spec(_vqc_spec)
sys.modules["visual_qa_capture"] = vqc
_vqc_spec.loader.exec_module(vqc)


# ---------------------------------------------------------------------------
# Canonical DB paths (used in test 7 to prove they are NOT written to)
# ---------------------------------------------------------------------------
CANONICAL_SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
CANONICAL_UIMAX_DB = Path.home() / ".agents" / "skills" / "ui-ux-pro-max" / "scripts" / "ui-ux-pro-max.db"

# SGS-framework patterns schema (mirrors canonical CREATE TABLE)
SGS_PATTERNS_SCHEMA = """
CREATE TABLE patterns (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    blocks_used TEXT NOT NULL,
    file_path TEXT NOT NULL,
    industry TEXT,
    is_auto_generated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    source TEXT,
    block_composition TEXT
);
"""

# uimax patterns schema (mirrors canonical CREATE TABLE - minimal columns needed)
UIMAX_PATTERNS_SCHEMA = """
CREATE TABLE patterns (
    slug TEXT,
    name TEXT,
    category TEXT,
    title TEXT,
    description TEXT,
    source TEXT,
    equivalent_implementations TEXT,
    is_canonical_for_sgs_drafts INTEGER DEFAULT 0,
    primary_class TEXT,
    created_at TEXT
);
"""


def _make_sgs_db(path: Path) -> Path:
    """Create a minimal sgs-framework.db with the patterns table."""
    con = sqlite3.connect(str(path))
    con.executescript(SGS_PATTERNS_SCHEMA)
    con.commit()
    con.close()
    return path


def _make_uimax_db(path: Path) -> Path:
    """Create a minimal uimax db with the patterns table (Rosetta Stone columns)."""
    con = sqlite3.connect(str(path))
    con.executescript(UIMAX_PATTERNS_SCHEMA)
    con.commit()
    con.close()
    return path


def _minimal_extract(section_id: str = "sgs-featured-product",
                     status: str = "deferred-composed-pattern") -> dict:
    """Synthetic stage-4 extract artefact with one section."""
    block_markup = (
        "<!-- wp:sgs/container -->\n"
        "<div class=\"wp-block-sgs-container\">\n"
        "<!-- wp:core/heading {\"level\":2} -->\n"
        "<h2>Test heading</h2>\n"
        "<!-- /wp:core/heading -->\n"
        "<!-- wp:core/paragraph -->\n"
        "<p>Test paragraph content.</p>\n"
        "<!-- /wp:core/paragraph -->\n"
        "<!-- wp:sgs/button {\"text\":\"Click here\"} -->\n"
        "<div class=\"wp-block-sgs-button\">Click here</div>\n"
        "<!-- /wp:sgs/button -->\n"
        "<!-- wp:sgs/container -->\n"
        "<!-- /wp:sgs/container -->\n"
        "</div>\n"
        "<!-- /wp:sgs/container -->"
    )
    return {
        "output": {
            "per_section_results": [
                {
                    "section_id": section_id,
                    "status": status,
                    "block_markup": block_markup,
                }
            ]
        }
    }


# ---------------------------------------------------------------------------
# Test 1 -- register_run() writes a PHP pattern file
# ---------------------------------------------------------------------------
def test_register_run_writes_php_pattern_file(tmp_path: Path) -> None:
    patterns_dir = tmp_path / "patterns"
    sgs_db = _make_sgs_db(tmp_path / "sgs.db")
    uimax_db = _make_uimax_db(tmp_path / "uimax.db")

    extract = _minimal_extract()
    result = mod.register_run(
        run_id="run-test-1",
        extract_artefact=extract,
        patterns_dir=patterns_dir,
        sgs_db=sgs_db,
        uimax_db=uimax_db,
    )

    assert result.registered_count == 1, (
        f"Expected 1 registered pattern, got {result.registered_count}. "
        f"Errors: {result.errors}. Skipped: {[s.skipped_reason for s in result.skipped]}"
    )
    php_file = patterns_dir / "featured-product.php"
    assert php_file.exists(), f"PHP pattern file not written at {php_file}"

    content = php_file.read_text(encoding="utf-8")
    assert "Title:" in content, "PHP file missing 'Title:' header comment"
    assert "Slug: sgs/featured-product" in content, "PHP file missing correct Slug header"

    # Verify block_markup is embedded verbatim
    raw_markup = extract["output"]["per_section_results"][0]["block_markup"]
    assert raw_markup.rstrip() in content, "PHP file does not contain the original block_markup verbatim"

    print("  PASS  test_register_run_writes_php_pattern_file")


# ---------------------------------------------------------------------------
# Test 2 -- register_run() inserts a row into sgs-framework.db
# ---------------------------------------------------------------------------
def test_register_run_inserts_sgs_db_row(tmp_path: Path) -> None:
    patterns_dir = tmp_path / "patterns"
    sgs_db = _make_sgs_db(tmp_path / "sgs.db")
    uimax_db = _make_uimax_db(tmp_path / "uimax.db")

    extract = _minimal_extract()
    result = mod.register_run(
        run_id="run-test-2",
        extract_artefact=extract,
        patterns_dir=patterns_dir,
        sgs_db=sgs_db,
        uimax_db=uimax_db,
    )

    assert result.registered_count == 1, (
        f"Expected 1 registered, got {result.registered_count}. Errors: {result.errors}"
    )
    reg = result.registered[0]
    assert reg.sgs_db_inserted, "sgs_db_inserted flag is False - row not inserted"

    con = sqlite3.connect(str(sgs_db))
    try:
        row = con.execute(
            "SELECT slug, is_auto_generated, source FROM patterns WHERE slug = ?",
            ("sgs/featured-product",),
        ).fetchone()
    finally:
        con.close()

    assert row is not None, "No row with slug='sgs/featured-product' found in sgs-db"
    assert row[1] == 1, f"is_auto_generated expected 1, got {row[1]}"
    assert row[2] == "sgs-clone-pipeline", f"source expected 'sgs-clone-pipeline', got {row[2]}"

    print("  PASS  test_register_run_inserts_sgs_db_row")


# ---------------------------------------------------------------------------
# Test 3 -- register_run() inserts a row into uimax with Rosetta Stone payload
# ---------------------------------------------------------------------------
def test_register_run_inserts_uimax_row(tmp_path: Path) -> None:
    patterns_dir = tmp_path / "patterns"
    sgs_db = _make_sgs_db(tmp_path / "sgs.db")
    uimax_db = _make_uimax_db(tmp_path / "uimax.db")

    extract = _minimal_extract()
    result = mod.register_run(
        run_id="run-test-3",
        extract_artefact=extract,
        patterns_dir=patterns_dir,
        sgs_db=sgs_db,
        uimax_db=uimax_db,
    )

    assert result.registered_count == 1, (
        f"Expected 1 registered, got {result.registered_count}. Errors: {result.errors}"
    )
    reg = result.registered[0]
    assert reg.uimax_inserted, "uimax_inserted flag is False - row not inserted"

    con = sqlite3.connect(str(uimax_db))
    try:
        row = con.execute(
            "SELECT slug, equivalent_implementations FROM patterns WHERE slug = ?",
            ("sgs/featured-product",),
        ).fetchone()
    finally:
        con.close()

    assert row is not None, "No row with slug='sgs/featured-product' found in uimax db"
    equiv = json.loads(row[1])
    assert "sgs_block" in equiv, (
        f"equivalent_implementations missing 'sgs_block' key. Got: {equiv}"
    )
    assert "html_css" in equiv, (
        f"equivalent_implementations missing 'html_css' key. Got: {equiv}"
    )

    print("  PASS  test_register_run_inserts_uimax_row")


# ---------------------------------------------------------------------------
# Test 4 -- idempotency: second run skips existing pattern
# ---------------------------------------------------------------------------
def test_register_run_idempotency(tmp_path: Path) -> None:
    patterns_dir = tmp_path / "patterns"
    sgs_db = _make_sgs_db(tmp_path / "sgs.db")
    uimax_db = _make_uimax_db(tmp_path / "uimax.db")
    extract = _minimal_extract()

    result1 = mod.register_run(
        run_id="run-test-4a",
        extract_artefact=extract,
        patterns_dir=patterns_dir,
        sgs_db=sgs_db,
        uimax_db=uimax_db,
    )
    assert result1.registered_count == 1, (
        f"First run: expected 1 registered, got {result1.registered_count}"
    )
    assert result1.skipped_count == 0, (
        f"First run: expected 0 skipped, got {result1.skipped_count}"
    )

    result2 = mod.register_run(
        run_id="run-test-4b",
        extract_artefact=extract,
        patterns_dir=patterns_dir,
        sgs_db=sgs_db,
        uimax_db=uimax_db,
    )
    assert result2.registered_count == 0, (
        f"Second run: expected 0 registered, got {result2.registered_count}"
    )
    assert result2.skipped_count == 1, (
        f"Second run: expected 1 skipped, got {result2.skipped_count}"
    )

    skip = result2.skipped[0]
    assert skip.skipped_reason, "Second run: skipped_reason should not be empty"
    # The skip reason should reference the existing file
    assert "already exists" in skip.skipped_reason.lower(), (
        f"Second run: expected 'already exists' in skipped_reason, got {skip.skipped_reason!r}"
    )

    print("  PASS  test_register_run_idempotency")


# ---------------------------------------------------------------------------
# Test 5 -- invalid slug is skipped (not registered)
# ---------------------------------------------------------------------------
def test_register_run_skips_invalid_slug(tmp_path: Path) -> None:
    patterns_dir = tmp_path / "patterns"
    sgs_db = _make_sgs_db(tmp_path / "sgs.db")
    uimax_db = _make_uimax_db(tmp_path / "uimax.db")

    # section_id starts with a digit - fails ^[a-z][a-z0-9-]*$ after slug derivation
    extract = _minimal_extract(section_id="123-invalid-section")
    result = mod.register_run(
        run_id="run-test-5",
        extract_artefact=extract,
        patterns_dir=patterns_dir,
        sgs_db=sgs_db,
        uimax_db=uimax_db,
    )

    assert result.registered_count == 0, (
        f"Expected 0 registered for invalid slug, got {result.registered_count}"
    )
    assert result.skipped_count == 1, (
        f"Expected 1 skipped for invalid slug, got {result.skipped_count}"
    )
    skip = result.skipped[0]
    reason = skip.skipped_reason.lower()
    assert "invalid" in reason and "slug" in reason, (
        f"Expected skipped_reason to mention 'invalid' + 'slug', got {skip.skipped_reason!r}"
    )

    print("  PASS  test_register_run_skips_invalid_slug")


# ---------------------------------------------------------------------------
# Test 6 -- only deferred-composed-pattern sections are registered
# ---------------------------------------------------------------------------
def test_register_run_skips_non_composed_sections(tmp_path: Path) -> None:
    patterns_dir = tmp_path / "patterns"
    sgs_db = _make_sgs_db(tmp_path / "sgs.db")
    uimax_db = _make_uimax_db(tmp_path / "uimax.db")

    complete_section = {
        "section_id": "sgs-hero",
        "status": "complete",
        "block_markup": "<!-- wp:sgs/hero --><div></div><!-- /wp:sgs/hero -->",
    }
    deferred_section = _minimal_extract()["output"]["per_section_results"][0].copy()
    deferred_section["section_id"] = "sgs-about-us"

    extract = {
        "output": {
            "per_section_results": [complete_section, deferred_section]
        }
    }

    result = mod.register_run(
        run_id="run-test-6",
        extract_artefact=extract,
        patterns_dir=patterns_dir,
        sgs_db=sgs_db,
        uimax_db=uimax_db,
    )

    assert result.registered_count == 1, (
        f"Expected only 1 registered (deferred section), got {result.registered_count}"
    )
    registered_slug = result.registered[0].slug
    assert registered_slug == "about-us", (
        f"Expected registered slug 'about-us', got {registered_slug!r}"
    )
    # The 'complete' sgs-hero section must not appear in registered or skipped
    all_slugs = [r.slug for r in result.registered + result.skipped]
    assert "hero" not in all_slugs, (
        f"Completed section 'sgs-hero' should not appear in output; got slugs: {all_slugs}"
    )

    print("  PASS  test_register_run_skips_non_composed_sections")


# ---------------------------------------------------------------------------
# Test 7 -- canonical DBs are NEVER written to
# ---------------------------------------------------------------------------
def test_register_run_canonical_dbs_untouched(tmp_path: Path) -> None:
    """Canonical sgs-framework.db and ui-ux-pro-max.db must not gain a test row."""
    patterns_dir = tmp_path / "patterns"
    sgs_db = _make_sgs_db(tmp_path / "sgs.db")
    uimax_db = _make_uimax_db(tmp_path / "uimax.db")

    # Use a unique slug that we can probe the canonical DBs for afterwards
    test_slug = "canonicalguard-test-7-xyzzy"
    extract = _minimal_extract(section_id=f"sgs-{test_slug}")

    mod.register_run(
        run_id="run-test-7",
        extract_artefact=extract,
        patterns_dir=patterns_dir,
        sgs_db=sgs_db,
        uimax_db=uimax_db,
    )

    # Probe canonical sgs-framework.db
    if CANONICAL_SGS_DB.exists():
        con = sqlite3.connect(str(CANONICAL_SGS_DB))
        try:
            row = con.execute(
                "SELECT 1 FROM patterns WHERE slug = ?",
                (f"sgs/{test_slug}",),
            ).fetchone()
        finally:
            con.close()
        assert row is None, (
            f"CANONICAL sgs-framework.db was polluted with test slug 'sgs/{test_slug}'"
        )

    # Probe canonical uimax db
    if CANONICAL_UIMAX_DB.exists():
        con = sqlite3.connect(str(CANONICAL_UIMAX_DB))
        try:
            row = con.execute(
                "SELECT 1 FROM patterns WHERE slug = ?",
                (f"sgs/{test_slug}",),
            ).fetchone()
        finally:
            con.close()
        assert row is None, (
            f"CANONICAL ui-ux-pro-max.db was polluted with test slug 'sgs/{test_slug}'"
        )

    print("  PASS  test_register_run_canonical_dbs_untouched")


# ---------------------------------------------------------------------------
# Test 8 -- stub_capture returns the expected clean-diff shape
# ---------------------------------------------------------------------------
def test_stub_capture_returns_clean_diff() -> None:
    result = vqc.stub_capture(1440)
    assert isinstance(result, dict), f"Expected dict, got {type(result)}"
    assert "diff_ratio" in result, f"Missing 'diff_ratio' key. Keys: {list(result.keys())}"
    assert "screenshot_path" in result, f"Missing 'screenshot_path' key. Keys: {list(result.keys())}"
    assert "regions" in result, f"Missing 'regions' key. Keys: {list(result.keys())}"
    assert result["diff_ratio"] == 0.0, (
        f"Expected diff_ratio=0.0 for stub_capture, got {result['diff_ratio']}"
    )
    assert isinstance(result["regions"], list), (
        f"Expected 'regions' to be a list, got {type(result['regions'])}"
    )
    print("  PASS  test_stub_capture_returns_clean_diff")


# ---------------------------------------------------------------------------
# Test 9 -- _section_class_to_slug handles prefix stripping and casing
# ---------------------------------------------------------------------------
def test_section_class_to_slug() -> None:
    fn = mod._section_class_to_slug

    result_with_prefix = fn("sgs-featured-product")
    assert result_with_prefix == "featured-product", (
        f"'sgs-featured-product' should map to 'featured-product', got {result_with_prefix!r}"
    )

    result_no_prefix = fn("featured-product")
    assert result_no_prefix == "featured-product", (
        f"'featured-product' should remain 'featured-product', got {result_no_prefix!r}"
    )

    # Case-insensitive on the sgs- prefix; output must always be lowercase
    result_mixed_case = fn("SGS-Header")
    # "SGS-Header" does NOT start with lowercase "sgs-", so the prefix is not stripped
    # but .lower() is applied - result is "sgs-header"
    assert result_mixed_case == result_mixed_case.lower(), (
        f"Output must be lowercase, got {result_mixed_case!r}"
    )

    print("  PASS  test_section_class_to_slug")


# ---------------------------------------------------------------------------
# Test 10 -- _composed_inner_blocks returns sorted unique list
# ---------------------------------------------------------------------------
def test_composed_inner_blocks_lists_uniquely() -> None:
    fn = mod._composed_inner_blocks

    markup = (
        "<!-- wp:sgs/container -->\n"
        "<!-- wp:core/heading {\"level\":2} --><h2>Title</h2><!-- /wp:core/heading -->\n"
        "<!-- wp:sgs/container -->\n"  # second occurrence - must be deduplicated
        "<!-- /wp:sgs/container -->\n"
        "<!-- /wp:sgs/container -->"
    )
    result = fn(markup)
    assert isinstance(result, list), f"Expected list, got {type(result)}"
    assert result == ["core/heading", "sgs/container"], (
        f"Expected sorted unique list ['core/heading', 'sgs/container'], got {result}"
    )
    # Verify deduplication
    assert result.count("sgs/container") == 1, (
        "Duplicate 'sgs/container' entries should have been deduplicated"
    )

    print("  PASS  test_composed_inner_blocks_lists_uniquely")


# ---------------------------------------------------------------------------
# pytest entry-points (tmp_path fixtures passed automatically by pytest)
# ---------------------------------------------------------------------------
def test_1(tmp_path):
    test_register_run_writes_php_pattern_file(tmp_path)


def test_2(tmp_path):
    test_register_run_inserts_sgs_db_row(tmp_path)


def test_3(tmp_path):
    test_register_run_inserts_uimax_row(tmp_path)


def test_4(tmp_path):
    test_register_run_idempotency(tmp_path)


def test_5(tmp_path):
    test_register_run_skips_invalid_slug(tmp_path)


def test_6(tmp_path):
    test_register_run_skips_non_composed_sections(tmp_path)


def test_7(tmp_path):
    test_register_run_canonical_dbs_untouched(tmp_path)


def test_8():
    test_stub_capture_returns_clean_diff()


def test_9():
    test_section_class_to_slug()


def test_10():
    test_composed_inner_blocks_lists_uniquely()


def test_uimax_idempotency_without_unique_constraint(tmp_path: Path) -> None:
    """Regression test for Sonnet QC panel concern: the canonical uimax
    patterns table has NO UNIQUE constraint on `slug`. The implementation
    must NOT rely on `ON CONFLICT DO NOTHING`; an explicit SELECT-then-INSERT
    must prevent a duplicate row on the second call to _insert_uimax_pattern.

    Exercises the private helper directly twice with the same slug and
    asserts row-count stays at 1.
    """
    uimax_db = _make_uimax_db(tmp_path / "uimax-test.db")

    # First insert: row count should go 0 -> 1
    inserted1 = mod._insert_uimax_pattern(
        slug="duplicate-test",
        title="Duplicate Test",
        blocks_used=["sgs/container", "core/heading"],
        section_class="duplicate-test",
        db_path=uimax_db,
    )
    assert inserted1 is True, "first insert should report True"

    # Second insert: must NOT add a duplicate row
    inserted2 = mod._insert_uimax_pattern(
        slug="duplicate-test",
        title="Duplicate Test",
        blocks_used=["sgs/container", "core/heading"],
        section_class="duplicate-test",
        db_path=uimax_db,
    )
    assert inserted2 is False, (
        "second insert returned True; the SELECT pre-check is failing OR the "
        "function is appending duplicates on a no-UNIQUE-constraint table"
    )

    # Hard assertion: exactly ONE row exists for the slug
    con = sqlite3.connect(str(uimax_db))
    row_count = con.execute(
        "SELECT COUNT(*) FROM patterns WHERE slug = ?", ("sgs/duplicate-test",)
    ).fetchone()[0]
    con.close()
    assert row_count == 1, (
        f"expected exactly 1 row for sgs/duplicate-test; got {row_count}. "
        "The SELECT pre-check in _insert_uimax_pattern is broken or the "
        "fixture schema has changed."
    )
    print("  PASS  uimax-idempotency-without-unique-constraint")


def test_11():
    """pytest wrapper for the uimax-idempotency regression test."""
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        test_uimax_idempotency_without_unique_constraint(Path(tmp))


# ---------------------------------------------------------------------------
# Test 12 — Phase 6 v2 Step 5: compliant payload routes through the validator
# and lands in uimax.patterns
# ---------------------------------------------------------------------------

def test_compliant_payload_routes_through_validator_and_writes(tmp_path: Path) -> None:
    """Validate-and-write happy path: compliant payload INSERTs a row.

    Asserts:
      - row appears in patterns
      - equivalent_implementations is stored as JSON containing sgs_block + html_css
      - source = 'sgs-clone-pipeline'
      - is_canonical_for_sgs_drafts = 1
    """
    uimax_db = _make_uimax_db(tmp_path / "uimax.db")
    inserted = mod._insert_uimax_pattern(
        slug="hero-split",
        title="Hero Split",
        blocks_used=["sgs/hero", "sgs/button"],
        section_class="sgs-hero-split",
        db_path=uimax_db,
    )
    assert inserted is True, "compliant payload should INSERT"

    con = sqlite3.connect(str(uimax_db))
    try:
        row = con.execute(
            "SELECT slug, title, category, source, equivalent_implementations, "
            "is_canonical_for_sgs_drafts, primary_class FROM patterns WHERE slug=?",
            ("sgs/hero-split",),
        ).fetchone()
    finally:
        con.close()
    assert row is not None, "row missing after compliant insert"
    slug_val, title_val, category_val, source_val, ei_val, canon_val, primary_val = row
    assert slug_val == "sgs/hero-split"
    assert title_val == "Hero Split"
    assert category_val == "sgs"
    assert source_val == "sgs-clone-pipeline"
    assert canon_val == 1
    assert primary_val == ".sgs-hero-split"
    ei = json.loads(ei_val)
    assert ei["sgs_block"] == "sgs/hero,sgs/button", f"sgs_block mismatch: {ei}"
    assert ei["html_css"] == "sgs-hero-split", f"html_css mismatch: {ei}"
    print("  PASS  compliant-payload routes through validator + writes row")


def test_12():
    """pytest wrapper for the compliant-payload regression test."""
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        test_compliant_payload_routes_through_validator_and_writes(Path(tmp))


# ---------------------------------------------------------------------------
# Test 13 — Phase 6 v2 Step 5: non-compliant payload is rejected by the
# validator and NO row is written
# ---------------------------------------------------------------------------

def test_non_compliant_payload_rejected_no_row_written(tmp_path: Path) -> None:
    """Short-circuit fallback path (NOT the validator subprocess path).

    Empty blocks_used + a table schema without a `gap_candidate` column means
    _insert_uimax_pattern returns False at the schema-check gate BEFORE
    calling _uimax_write(). Test 14 exercises the actual validator-subprocess
    row-213 rejection path; this test covers the orchestrator-side guard
    that prevents a malformed payload from ever reaching the chokepoint.
    """
    uimax_db = _make_uimax_db(tmp_path / "uimax.db")
    inserted = mod._insert_uimax_pattern(
        slug="orphan-section",
        title="Orphan Section",
        blocks_used=[],                     # null sgs_block path
        section_class="orphan-section",
        db_path=uimax_db,
    )
    assert inserted is False, "non-compliant payload must NOT insert"
    con = sqlite3.connect(str(uimax_db))
    try:
        count = con.execute(
            "SELECT COUNT(*) FROM patterns WHERE slug=?",
            ("sgs/orphan-section",),
        ).fetchone()[0]
    finally:
        con.close()
    assert count == 0, "table must remain empty after rejected write"
    print("  PASS  non-compliant payload rejected; zero rows persisted")


def test_13():
    """pytest wrapper for the non-compliant-rejection regression test."""
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        test_non_compliant_payload_rejected_no_row_written(Path(tmp))


# ---------------------------------------------------------------------------
# Test 14 — Phase 6 v2 Step 5: validator-subprocess row-213 rejection
# (a null sgs_block without gap_candidate=true MUST raise ValidationError).
# Test 13 covers the orchestrator-side short-circuit; this test exercises
# the chokepoint itself so we have coverage on the live subprocess path.
# ---------------------------------------------------------------------------

def test_null_sgs_block_without_gap_candidate_raises_validation_error(tmp_path: Path) -> None:
    """Direct validate_and_write call with null sgs_block + no gap_candidate
    must raise ValidationError (row 213). Asserts:
      - ValidationError raised
      - exc.errors mentions row-213
      - no row persisted to disk
    """
    uimax_db = _make_uimax_db(tmp_path / "uimax.db")
    uw = mod._uimax_write()
    bad_payload = {
        "slug": "sgs/no-mapping",
        "title": "No Mapping",
        "category": "sgs",
        "description": "null sgs_block without gap_candidate",
        "source": "sgs-clone-pipeline",
        # null sgs_block; no gap_candidate field at all — must reject.
        "equivalent_implementations": {"sgs_block": None, "html_css": "no-mapping"},
    }
    raised = False
    try:
        uw.validate_and_write(str(uimax_db), "patterns", bad_payload)
    except uw.ValidationError as exc:
        raised = True
        assert any("row-213" in e for e in exc.errors), (
            f"expected row-213 error, got {exc.errors}"
        )
    assert raised, "null sgs_block without gap_candidate must raise ValidationError"

    con = sqlite3.connect(str(uimax_db))
    try:
        count = con.execute("SELECT COUNT(*) FROM patterns").fetchone()[0]
    finally:
        con.close()
    assert count == 0, "row-213 rejection must leave table empty"
    print("  PASS  null sgs_block without gap_candidate raises row-213 ValidationError")


def test_14():
    """pytest wrapper for the row-213 validator-subprocess regression test."""
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        test_null_sgs_block_without_gap_candidate_raises_validation_error(Path(tmp))


if __name__ == "__main__":
    print("Spec 15 Phase 6 Step 0 + v2 Step 5 -- register_patterns contract tests")
    import tempfile
    for name, fn in [
        ("test_register_run_writes_php_pattern_file", test_register_run_writes_php_pattern_file),
        ("test_register_run_inserts_sgs_db_row", test_register_run_inserts_sgs_db_row),
        ("test_register_run_inserts_uimax_row", test_register_run_inserts_uimax_row),
        ("test_register_run_idempotency", test_register_run_idempotency),
        ("test_register_run_skips_invalid_slug", test_register_run_skips_invalid_slug),
        ("test_register_run_skips_non_composed_sections", test_register_run_skips_non_composed_sections),
        ("test_register_run_canonical_dbs_untouched", test_register_run_canonical_dbs_untouched),
        ("test_uimax_idempotency_without_unique_constraint", test_uimax_idempotency_without_unique_constraint),
        ("test_compliant_payload_routes_through_validator_and_writes",
         test_compliant_payload_routes_through_validator_and_writes),
        ("test_non_compliant_payload_rejected_no_row_written",
         test_non_compliant_payload_rejected_no_row_written),
        ("test_null_sgs_block_without_gap_candidate_raises_validation_error",
         test_null_sgs_block_without_gap_candidate_raises_validation_error),
    ]:
        with tempfile.TemporaryDirectory() as tmp:
            fn(Path(tmp))
    test_stub_capture_returns_clean_diff()
    test_section_class_to_slug()
    test_composed_inner_blocks_lists_uniquely()
    print("\nREGISTER-PATTERNS-PHASE-6+V2-STEP-5: PASS (14/14)")
    sys.exit(0)
