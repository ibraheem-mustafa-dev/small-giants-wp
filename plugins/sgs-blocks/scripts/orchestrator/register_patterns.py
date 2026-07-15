#!/usr/bin/env python3
"""register_patterns.py -- Spec 31 Phase 6 Step 0 +REGISTER tail.

After a successful clone run, walk the stage-9 artefact and register every
novel pattern surfaced:

    1. Write PHP pattern file at theme/sgs-theme/patterns/<slug>.php with
       header comment + body containing the composed block markup
       (theme reads via register_block_pattern())
    2. INSERT a row into sgs-framework.db patterns table
    3. INSERT a row into uimax-pro-max.db patterns table with Rosetta Stone
       equivalent_implementations payload (sgs_block + html_css fallback)

Idempotent at three gates: (a) PHP file existence check before write,
(b) sgs-db SELECT-then-INSERT pattern in `_insert_sgs_pattern`,
(c) uimax SELECT-then-INSERT pattern in `_insert_uimax_pattern`. The
canonical uimax patterns table has NO UNIQUE constraint on `slug`, so
the explicit pre-check is the only correct guard against duplicate rows.

Module-only -- no CLI. Called from sgs-clone-orchestrator.py after
orchestrator_main.run() returns outcome.overall == 'success'.

UK English in comments + output.
"""
from __future__ import annotations

import importlib.util as _ilu
import json
import re
import sqlite3
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

REPO = Path(__file__).resolve().parents[4]
PATTERNS_DIR = REPO / "theme" / "sgs-theme" / "patterns"
SGS_DB = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
UIMAX_DB = Path.home() / ".agents" / "skills" / "ui-ux-pro-max" / "scripts" / "ui-ux-pro-max.db"

# Rosetta Stone chokepoint -- ALL uimax writes route through uimax_write.
# Loaded lazily because uimax-tools sits at a hyphenated path that blocks
# normal package imports. The module exposes validate_and_write() +
# ValidationError; both are used by _insert_uimax_pattern.
_UIMAX_WRITE_PATH = (
    Path(__file__).resolve().parents[1] / "uimax-tools" / "uimax_write.py"
)
_uimax_write_mod = None


def _load_trace():
    """Lazy-load orchestrator.trace.Trace; soft-fail to a no-op if unavailable."""
    from pathlib import Path as _Path
    here = _Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        candidate = parent / "orchestrator" / "trace.py"
        if candidate.exists():
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
        candidate2 = parent / "trace.py"
        if candidate2.exists() and parent.name == "orchestrator":
            spec = _ilu.spec_from_file_location("orchestrator_trace", candidate2)
            mod = _ilu.module_from_spec(spec)
            try:
                spec.loader.exec_module(mod)
                return mod.Trace
            except Exception:
                return None
    return None


_Trace = _load_trace()


def _uimax_write():
    """Lazy-load the uimax_write module (single uimax write chokepoint).

    Raises FileNotFoundError if the module is missing — that condition
    indicates a broken framework install rather than a per-clone fault,
    so we surface it instead of soft-failing silently here.
    """
    global _uimax_write_mod
    if _uimax_write_mod is None:
        if not _UIMAX_WRITE_PATH.exists():
            raise FileNotFoundError(
                f"uimax_write.py missing at {str(_UIMAX_WRITE_PATH)}; "
                "framework install broken."
            )
        spec = _ilu.spec_from_file_location("sgs_uimax_write", _UIMAX_WRITE_PATH)
        if spec is None or spec.loader is None:
            raise ImportError(f"Cannot load uimax_write from {str(_UIMAX_WRITE_PATH)}")
        mod = _ilu.module_from_spec(spec)
        sys.modules["sgs_uimax_write"] = mod
        spec.loader.exec_module(mod)
        _uimax_write_mod = mod
    return _uimax_write_mod

_SLUG_RE = re.compile(r"^[a-z][a-z0-9-]*$")

# Pixel-diff closure gate (Sub-task E, 2026-05-24) REMOVED 2026-07-04.
# Pixel-diff scored an empty section as a false WIN and a reflowed-correct
# section as a false LOSS (Spec 20 problem statement) — it was never a
# reliable pattern-quality signal. Registration is unconditional again.


@dataclass
class PatternRegistration:
    slug: str
    title: str
    section_class: str
    blocks_used: list[str] = field(default_factory=list)
    php_path: str = ""
    sgs_db_inserted: bool = False
    uimax_inserted: bool = False
    skipped_reason: str = ""


@dataclass
class RegisterResult:
    run_id: str
    registered: list[PatternRegistration] = field(default_factory=list)
    skipped: list[PatternRegistration] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    @property
    def registered_count(self) -> int:
        return len(self.registered)

    @property
    def skipped_count(self) -> int:
        return len(self.skipped)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _humanise_title(slug: str) -> str:
    return slug.replace("-", " ").replace("_", " ").title()


def _section_class_to_slug(section_class: str) -> str:
    """Map 'sgs-featured-product' or 'featured-product' to a pattern slug.

    Prefix-strip is case-insensitive so SGS-Header / sgs-Header / sgs-header
    all resolve to 'header'. Output is always lowercase + hyphen-only per
    Spec 00 §3.1 slug regex (lowercase plus hyphen).
    """
    s = section_class.strip()
    if s.lower().startswith("sgs-"):
        s = s[4:]
    return s.lower()


def _composed_inner_blocks(block_markup: str) -> list[str]:
    """Extract registered block names used inside the composed markup."""
    return sorted(set(re.findall(r"<!-- wp:([a-z0-9/_-]+)", block_markup)))


def _log_recognition_event(
    slug: str,
    status: str,
    section_id: str,
    run_id: str,
    reason: str = "",
    uimax_db: Path = UIMAX_DB,
) -> None:
    """Write one row to uimax.recognition_log for this INSERT attempt.

    status in: inserted | rejected_other
    Per Sub-task E spec: log every attempt (pass or fail).
    Soft-fail — never raises; uimax is catalogue layer, not a runtime gate.

    Note (2026-07-04): the pixel-diff gate this once fed (Stage 11) has been
    removed — pixel-diff scored an empty section as a false WIN and a
    reflowed-correct section as a false LOSS (Spec 20 problem statement).
    Pattern registration is unconditional again; computed-parity (Stage 11.6)
    is soft-fail observability only and is never wired as a build gate
    (Spec 20 "Out of scope" list).
    """
    if not uimax_db.exists():
        return
    try:
        con = sqlite3.connect(str(uimax_db), timeout=10.0)
    except sqlite3.Error:
        return
    try:
        # Check the table exists and has the minimal columns we need.
        has_table = con.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='recognition_log'"
        ).fetchone()
        if not has_table:
            return

        cols = {r[1] for r in con.execute("PRAGMA table_info(recognition_log)").fetchall()}

        proposed = (
            f"pattern_gate slug=sgs/{slug} status={status} "
            f"run_id={run_id} section={section_id}"
            + (f" reason={reason}" if reason else "")
        )

        payload: dict = {}
        if "clone_run_id" in cols:
            payload["clone_run_id"] = run_id
        if "bucket_type" in cols:
            payload["bucket_type"] = "pattern_gate"
        if "selector" in cols:
            payload["selector"] = f".sgs-{section_id}"
        if "proposed_action" in cols:
            payload["proposed_action"] = proposed
        if "severity" in cols:
            payload["severity"] = "high" if "rejected" in status else "info"
        if "created_at" in cols:
            payload["created_at"] = _now_iso()

        if not payload:
            return

        cols_sql = ", ".join(payload.keys())
        placeholders = ", ".join("?" for _ in payload)
        con.execute(
            f"INSERT INTO recognition_log ({cols_sql}) VALUES ({placeholders})",
            list(payload.values()),
        )
        con.commit()
    except sqlite3.Error:
        pass  # soft-fail per contract
    finally:
        con.close()


def _emit_php(slug: str, title: str, category: str, description: str,
              block_markup: str, source_run_id: str) -> str:
    """Render the PHP pattern file body."""
    sluggified = slug.lower().strip()
    if not _SLUG_RE.match(sluggified):
        raise ValueError(f"invalid pattern slug {sluggified!r}")
    # Strip the title's surrounding quotes if present, escape for PHP comment block
    safe_title = title.replace("*/", "* /")
    safe_desc = description.replace("*/", "* /")
    header = (
        "<?php\n"
        "/**\n"
        f" * Title: {safe_title}\n"
        f" * Slug: sgs/{sluggified}\n"
        f" * Categories: {category}\n"
        f" * Description: {safe_desc}\n"
        " *\n"
        " * Auto-generated by sgs-clone pipeline +REGISTER tail.\n"
        f" * Source clone run: {source_run_id}\n"
        f" * Generated: {_now_iso()}\n"
        " * Edits to this file may be overwritten on the next clone run --\n"
        " * author the source mockup instead.\n"
        " *\n"
        " * @package SGS\\Theme\n"
        " */\n"
        "?>\n\n"
    )
    return header + block_markup.rstrip() + "\n"


def _section_results_with_composed_pattern(extract_artefact: dict) -> list[dict]:
    """Filter the per-section extract results to those the pipeline composed.

    A "novel pattern" candidate is any per-section result whose status is
    `deferred-composed-pattern` (matched to core/group, fell through to the
    composer in stage 4). Already-known composite blocks (sgs/hero etc.)
    skip the pattern-registration path -- they ARE the pattern.
    """
    out = (extract_artefact or {}).get("output") or extract_artefact or {}
    results = out.get("per_section_results") or []
    return [r for r in results if r.get("status") == "deferred-composed-pattern"
            and r.get("block_markup")]


def _insert_sgs_pattern(slug: str, title: str, description: str,
                       blocks_used: list[str], file_path: str,
                       category: str = "sgs",
                       block_composition: list[str] | None = None,
                       db_path: Path = SGS_DB) -> bool:
    """INSERT OR IGNORE into sgs-framework.db patterns. Returns True on insert."""
    if not db_path.exists():
        return False
    con = sqlite3.connect(str(db_path), timeout=10.0)
    try:
        cur = con.execute(
            "SELECT 1 FROM patterns WHERE slug = ?",
            (f"sgs/{slug}",),
        )
        if cur.fetchone():
            return False
        con.execute(
            """INSERT INTO patterns
                 (slug, title, category, description, blocks_used, file_path,
                  is_auto_generated, source, block_composition, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 1, 'sgs-clone-pipeline', ?, ?)""",
            (
                f"sgs/{slug}",
                title,
                category,
                description,
                ",".join(blocks_used),
                file_path,
                json.dumps(block_composition or blocks_used, ensure_ascii=False),
                _now_iso(),
            ),
        )
        con.commit()
        return True
    finally:
        con.close()


def _insert_uimax_pattern(slug: str, title: str, blocks_used: list[str],
                          section_class: str,
                          db_path: Path = UIMAX_DB) -> bool:
    """INSERT into uimax patterns via the uimax_write validate-then-write chokepoint.

    Phase 6 v2 Step 5 — Rosetta Stone discipline fix. Replaces the previous
    direct sqlite3 INSERT path so every /sgs-clone uimax write is gated by
    uimax-write-validator (row 213 Rosetta Stone — every artefact-table row
    carries an SGS-block mapping in equivalent_implementations).

    Returns True on insert. Soft-fail: DB unavailable, table missing, or
    validator rejection returns False without raising — uimax is the
    catalogue layer, not a runtime gate. The dedupe pre-check on `slug` is
    preserved because the canonical uimax patterns table has no UNIQUE
    constraint.
    """
    if not db_path.exists():
        return False
    # Open a short-lived read-only connection to inspect schema + dedupe.
    # Close it BEFORE validate_and_write opens its own connection (the
    # validator subprocess does not touch the DB; only the writer does).
    try:
        con = sqlite3.connect(str(db_path), timeout=10.0)
    except sqlite3.Error:
        return False
    try:
        has_table = con.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='patterns'"
        ).fetchone()
        if not has_table:
            return False
        existing = con.execute(
            "SELECT 1 FROM patterns WHERE slug = ?", (f"sgs/{slug}",)
        ).fetchone()
        if existing:
            return False
        cols = [r[1] for r in con.execute("PRAGMA table_info(patterns)").fetchall()]
    finally:
        con.close()

    # Rosetta Stone discipline requires equivalent_implementations; without
    # that column the catalogue row can't carry the SGS-block mapping, so
    # skip the write rather than persist a row that violates row 213.
    if "equivalent_implementations" not in cols:
        return False

    has_sgs_block = bool(blocks_used)
    equivalents: dict = {
        "sgs_block": ",".join(blocks_used) if has_sgs_block else None,
        "html_css": section_class,
    }

    payload: dict = {
        "slug": f"sgs/{slug}",
        "title": title,
        "category": "sgs",
        "description": f"Auto-registered from sgs-clone of .{section_class}",
        # Pass the dict directly — validate_and_write JSON-encodes dict/list
        # values for SQLite text storage. Encoding here would double-stringify.
        "equivalent_implementations": equivalents,
    }
    if not has_sgs_block:
        # Validator row 213: null sgs_block must be paired with
        # gap_candidate=true. If the table has no gap_candidate column we
        # can't satisfy the rule, so skip the write rather than violate it.
        if "gap_candidate" not in cols:
            return False
        payload["gap_candidate"] = 1
    if "source" in cols:
        payload["source"] = "sgs-clone-pipeline"
    if "is_canonical_for_sgs_drafts" in cols:
        payload["is_canonical_for_sgs_drafts"] = 1
    if "primary_class" in cols:
        payload["primary_class"] = f".sgs-{slug}"

    # Drop any key the actual table can't accept. INSERT would fail otherwise.
    usable = {k: v for k, v in payload.items() if k in cols}
    if "slug" not in usable or "equivalent_implementations" not in usable:
        # Cannot identify the row or satisfy Rosetta Stone -- skip.
        return False

    try:
        uw = _uimax_write()
    except Exception:  # noqa: BLE001 - lazy-load can raise SyntaxError /
        # AttributeError / module-init exceptions in addition to the obvious
        # FileNotFoundError + ImportError. Soft-fail per the catalogue-not-
        # gate contract so a broken framework install never aborts the
        # clone pipeline mid-run.
        return False
    try:
        uw.validate_and_write(str(db_path), "patterns", usable)
        return True
    except uw.ValidationError:
        # Row 213 reject -- expected when a payload is malformed (e.g. null
        # sgs_block without gap_candidate). Soft-fail per the module's
        # catalogue-not-gate contract.
        return False
    except (sqlite3.Error, FileNotFoundError, RuntimeError):
        return False


def register_run(
    run_id: str,
    extract_artefact: dict,
    boundary_artefact: dict | None = None,
    patterns_dir: Path = PATTERNS_DIR,
    sgs_db: Path = SGS_DB,
    uimax_db: Path = UIMAX_DB,
    run_dir: Path | None = None,
) -> RegisterResult:
    """Register every novel pattern produced by a successful clone run.

    Args:
      run_id: the clone-pipeline run identifier (used for traceability)
      extract_artefact: the stage-4 dict (output.per_section_results carries
        the composed-pattern entries that need registration)
      boundary_artefact: the stage-1 dict (used to enrich pattern metadata
        with the original class signature where available)
      patterns_dir: where the PHP files land (default theme/sgs-theme/patterns/)
      sgs_db / uimax_db: catalogue paths (defaults to canonical locations)
      run_dir: optional pipeline-state run directory for trace writes; derived
        from run_id when not supplied (soft-fails to disabled if dir absent)
    """
    # Resolve trace writer. Derive run_dir from run_id when not supplied;
    # Trace.for_run() returns a disabled no-op if the directory does not exist.
    if run_dir is None:
        run_dir = Path("pipeline-state") / "sgs-clone" / run_id
    tr = (_Trace.for_run(run_dir) if _Trace else None)
    result = RegisterResult(run_id=run_id)
    boundary_by_id: dict[str, dict] = {}
    if boundary_artefact:
        for b in boundary_artefact.get("boundaries", []):
            boundary_by_id[b.get("boundary_id", "")] = b

    composed = _section_results_with_composed_pattern(extract_artefact)
    if not composed:
        return result

    patterns_dir.mkdir(parents=True, exist_ok=True)

    for entry in composed:
        section_id = entry.get("section_id") or ""
        boundary_id = entry.get("boundary_id") or ""
        section_class = section_id or boundary_id
        slug = _section_class_to_slug(section_class)

        reg = PatternRegistration(
            slug=slug,
            title=_humanise_title(slug),
            section_class=section_class,
            blocks_used=_composed_inner_blocks(entry.get("block_markup") or ""),
        )

        if not _SLUG_RE.match(slug):
            reg.skipped_reason = f"invalid pattern slug derived: {slug!r}"
            result.skipped.append(reg)
            continue

        php_path = patterns_dir / f"{slug}.php"
        if php_path.exists():
            reg.skipped_reason = "PHP pattern file already exists -- preserved"
            result.skipped.append(reg)
            # Call-site 19 — +REGISTER dedup skip (trace map §19).
            if tr:
                try:
                    tr.event(
                        stage="register_pattern_skipped",
                        run_id=run_id,
                        slug=f"sgs/{reg.slug}",
                        skipped_reason=reg.skipped_reason,
                    )
                except Exception:
                    pass
            continue

        description = (
            f"Auto-registered from the .{section_class} section of a clone run. "
            f"Inner blocks: {', '.join(reg.blocks_used)}."
        )

        try:
            php_body = _emit_php(
                slug=slug,
                title=reg.title,
                category="sgs",
                description=description,
                block_markup=entry["block_markup"],
                source_run_id=run_id,
            )
            php_path.write_text(php_body, encoding="utf-8")
            resolved_php = php_path.resolve()
            try:
                reg.php_path = str(resolved_php.relative_to(REPO))
            except ValueError:
                # patterns_dir lives outside the repo (test fixture path).
                # Fall back to the absolute path; sgs-db stores file_path
                # verbatim and a callable test treats both forms equally.
                reg.php_path = str(resolved_php)
        except (OSError, ValueError) as exc:
            result.errors.append(f"PHP write failed for {slug}: {exc}")
            reg.skipped_reason = f"PHP write failed: {exc}"
            result.skipped.append(reg)
            continue

        try:
            reg.sgs_db_inserted = _insert_sgs_pattern(
                slug=slug,
                title=reg.title,
                description=description,
                blocks_used=reg.blocks_used,
                file_path=reg.php_path,
                block_composition=reg.blocks_used,
                db_path=sgs_db,
            )
        except sqlite3.Error as exc:
            result.errors.append(f"sgs-db insert failed for {slug}: {exc}")

        try:
            reg.uimax_inserted = _insert_uimax_pattern(
                slug=slug,
                title=reg.title,
                blocks_used=reg.blocks_used,
                section_class=section_class,
                db_path=uimax_db,
            )
        except sqlite3.Error as exc:
            result.errors.append(f"uimax insert failed for {slug}: {exc}")

        # Log successful INSERT to recognition_log.
        _log_recognition_event(
            slug=slug,
            status="inserted",
            section_id=section_id,
            run_id=run_id,
            uimax_db=uimax_db,
        )

        result.registered.append(reg)

        # Call-site 18 — +REGISTER pattern INSERT (trace map §18).
        if tr:
            try:
                tr.event(
                    stage="register_pattern_inserted",
                    run_id=run_id,
                    slug=f"sgs/{reg.slug}",
                    title=reg.title,
                    blocks_used=reg.blocks_used,
                    php_path=reg.php_path,
                    sgs_db_inserted=reg.sgs_db_inserted,
                    uimax_inserted=reg.uimax_inserted,
                )
            except Exception:
                pass

    return result


def summarise(result: RegisterResult) -> str:
    """Plain-text summary for stdout."""
    lines = [
        f"[+REGISTER] run_id={result.run_id} "
        f"registered={result.registered_count} skipped={result.skipped_count}"
    ]
    for r in result.registered:
        lines.append(
            f"  + sgs/{r.slug}  blocks={','.join(r.blocks_used)}  "
            f"php={r.php_path}  sgs_db={'+' if r.sgs_db_inserted else 'skip'}  "
            f"uimax={'+' if r.uimax_inserted else 'skip'}"
        )
    for r in result.skipped:
        lines.append(f"  - sgs/{r.slug}  skipped: {r.skipped_reason}")
    for err in result.errors:
        lines.append(f"  ! {err}")
    return "\n".join(lines)
