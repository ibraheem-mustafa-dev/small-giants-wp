"""
ledger.coverage_check — F5 pipeline-close coverage-conservation gate (UNACCOUNTED leg).

Spec ref:
  specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md §12.2.1 (ledger keystone)
  plans/2026-06-18-f4-excluded-properties-design.md §3 (coverage-conservation invariant)

WHAT THIS MODULE DOES (the UNACCOUNTED leg)
-------------------------------------------
Computes the coverage-conservation invariant:

    UNACCOUNTED = draft_declarations − (bucketed ∪ excluded)

where:
  • draft_declarations  = every non-shadowed box-css / custom-prop / inline-style
                          declaration produced by F2 (ledger.declare_input) for a fixture.
  • bucketed            = every (selector, property) the css_router placed in ANY of
                          its four buckets: D0 / D1 / D2 / D3. A declaration is BUCKETED
                          when its (selector, property) pair appears in at least one bucket
                          (D2 and D0 are re-parsed from raw CSS text to recover granularity).
  • excluded            = every css_property in the F4 `excluded_properties` DB table.

UNACCOUNTED > 0 means a declaration was silently dropped — the gate FAILS on any
new UNACCOUNTED key not already in the baseline.

SCOPE — what "accounted" does and does NOT prove (read before trusting)
----------------------------------------------------------------------
This gate proves css_router's COVERAGE-CONSERVATION invariant: every draft
declaration lands in at least one css_router bucket (D0/D1/D2/D3) or is
excluded-with-reason. That is the §12.2.1 instrument and it is sound (the join is
keyed on full declaration identity incl. responsive tier/media — D240).

It does NOT yet prove the declaration was TRANSFERRED CORRECTLY by convert.py:
today convert.py (Stage 4) does not consume css_router's D1 (the merge was deleted
2026-05-27), so "bucketed" means "css_router dispositioned it", not "the converter
emitted a landed attr for it". Closing that gap is (a) the LANDED leg below and
(b) the rebuild's MF-2 decision to rewire convert.py onto css_router. Failure
direction is SAFE: when a declaration is NOT bucketed it is reported UNACCOUNTED
(loud), never silently passed — inline `style=""` declarations (which css_router
cannot bucket) therefore surface as UNACCOUNTED rather than being hidden; SGS-BEM
drafts transfer via classes, so a draft with inline styles is a Stage-0 lint error,
not this gate's transfer surface.

THE LANDED LEG — ARMED 2026-07-23 (was deferred)
-------------------------------------------------
Checking that a *transferred* attr actually RENDERS correctly on the live clone
requires the F3 render-oracle RUNTIME. That runtime now exists
(`oracle/batch_runner.py`) and the fixture corpus is deployed as per-fixture
canary pages (`oracle/provision_fixture_canaries.py`), so `check_landed()`
below is IMPLEMENTED: it reads the oracle's per-fixture `.landed.json`
verdicts and reports them as findings.

It is OPT-IN via `--with-landed`. Left always-on, a stale or never-run oracle
would resolve every cell to NOT-RENDERED and fail the gate for every session —
which is precisely why this leg stayed unwired until the canary pages existed.

STOP-14 BASELINE-AGAINST-CURRENT
---------------------------------
On first run (`--update-baseline`), whatever is UNACCOUNTED today (the legacy
converter drops things — expected mid-rebuild) is baselined. --check is GREEN
immediately after baselining and only fails on NEW UNACCOUNTED keys introduced
by a subsequent converter change (a regression). The baseline SHRINKS as the
stage-rebuild fixes drops.

Usage
-----
    python ledger/coverage_check.py --report          # print all findings, exit 0
    python ledger/coverage_check.py --check           # exit 1 on NEW unaccounted key
    python ledger/coverage_check.py --update-baseline # write baseline, exit 0

Baseline file: ledger/coverage-baseline.json  (alongside this file)
DB path: ~/.claude/skills/sgs-wp-engine/sgs-framework.db
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import sys
from pathlib import Path
from typing import TYPE_CHECKING

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Path constants
# ---------------------------------------------------------------------------

_HERE = Path(__file__).resolve().parent                     # scripts/ledger/
_SCRIPTS_DIR = _HERE.parent                                 # scripts/
_FIXTURES_PHASE_F_DIR = _SCRIPTS_DIR / "tests" / "fixtures" / "phase-f"
_CONFORMANCE_DIR = _SCRIPTS_DIR / "tests" / "fixtures" / "conformance"
_DB_PATH = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "sgs-framework.db"
_BASELINE_PATH = _HERE / "coverage-baseline.json"

# ---------------------------------------------------------------------------
# Lazy imports (keep declare_input and css_router independent until runtime)
# ---------------------------------------------------------------------------

def _import_declare_input():
    """Lazy import of ledger.declare_input to preserve the independence contract."""
    if str(_SCRIPTS_DIR) not in sys.path:
        sys.path.insert(0, str(_SCRIPTS_DIR))
    from ledger.declare_input import declare_input
    from ledger.models import DeclKind
    return declare_input, DeclKind


def _import_css_router():
    """Lazy import of orchestrator.css_router."""
    if str(_SCRIPTS_DIR) not in sys.path:
        sys.path.insert(0, str(_SCRIPTS_DIR))
    from orchestrator.css_router import route_css
    return route_css


# ---------------------------------------------------------------------------
# HTML → CSS extraction (mirrors css_router's input, without importing it)
# ---------------------------------------------------------------------------

def _extract_css_from_html(html: str) -> str:
    """Extract all <style> block text from raw HTML, concatenated."""
    blocks = re.findall(r"<style[^>]*>(.*?)</style>", html, re.DOTALL | re.IGNORECASE)
    return "\n".join(blocks)


# ---------------------------------------------------------------------------
# D2/D0 re-parse: recover (selector, property) pairs from raw CSS text
# ---------------------------------------------------------------------------

def _extract_sel_props_from_raw_css(raw_css_lines: list[str]) -> set[tuple[str, str, str | None]]:
    """Parse raw CSS text lines from D0/D2 buckets and recover (selector, property, media) triples.

    css_router emits D0 and D2 as raw CSS *strings* (one rule per entry), losing
    per-property granularity. This function re-parses them so we can mark
    individual declarations as BUCKETED.

    The media component is the enclosing @media condition verbatim (e.g.
    '(max-width: 767px)'), or None for rules that are not wrapped in @media.
    Preserving it means that a Base declaration and a 600px declaration of the
    SAME (selector, property) are distinct bucketed entries — FIX 1.

    Uses a lightweight regex-based approach (not tinycss2) to avoid a circular
    import and to keep this module self-contained.
    """
    result: set[tuple[str, str, str | None]] = set()
    for rule_text in raw_css_lines:
        # Extract the enclosing @media condition verbatim (if any).
        media_match = re.match(
            r"@(?:media|supports)\s*([^{]+)\{(.*)\}\s*$",
            rule_text.strip(),
            flags=re.DOTALL,
        )
        if media_match:
            media_condition: str | None = media_match.group(1).strip()
            inner_css = media_match.group(2).strip()
        else:
            media_condition = None
            inner_css = rule_text

        # Match: selector { declaration; declaration; ... }
        matches = re.findall(
            r"([^{]+)\{([^}]*)\}",
            inner_css,
            re.DOTALL,
        )
        for raw_sel, raw_decls in matches:
            selector = raw_sel.strip()
            for decl in raw_decls.split(";"):
                decl = decl.strip()
                if ":" in decl:
                    prop = decl.split(":", 1)[0].strip().lower()
                    if prop:
                        result.add((selector, prop, media_condition))
    return result


# ---------------------------------------------------------------------------
# Bucketed set extraction from css_router result
# ---------------------------------------------------------------------------

def _norm_selector(sel: str) -> str:
    """Collapse internal whitespace in a selector so both sides of the join agree.

    css_router stores a rule's selector VERBATIM (newlines/tabs from the source
    CSS included); `declare_input` serialises via tinycss2 and only `.strip()`s
    each member, so a descendant selector written across lines (`.a\\n  .b`)
    keeps its internal whitespace there. Normalising ONE side only would be a
    join defect in its own right (it would silently over-report UNACCOUNTED),
    so this helper is applied to BOTH the bucketed set and the declared row
    (2026-07-23, Spec 31 unit C1b — §12.2.1 requires comparing like with like).
    """
    return " ".join(sel.split())


def _bucketed_sel_props(router_result: dict) -> set[tuple[str, str, str | None]]:
    """Collect every (selector, property, media) triple that landed in ANY css_router bucket.

    The media component is the enclosing @media condition verbatim (same as
    InputDecl.media), or None for base (no enclosing @media).  Adding the media
    axis means a Base declaration and a breakpoint declaration of the SAME
    (selector, property) are DISTINCT bucketed entries — FIX 1 (tier/media-blind
    join bug).

    D1: per-property entries keyed by '<block_slug>:<selector>' → attr_path dicts.
        Each entry carries 'css_prop', 'media', and the original selector is
        recoverable from the section_key split.
    D3: per-property dicts with 'source_class', 'css_property', and 'media'.
        Note: source_class is the class *name*, not the full selector — we normalise
        to '.{source_class}' to match the declare_input selector format.
    D0/D2: raw CSS text strings — re-parsed for (selector, property, media) triples.
    """
    bucketed: set[tuple[str, str, str | None]] = set()

    def _split_selector_list(sel: str) -> list[str]:
        """Split a CSS selector LIST into its members, matching declare_input.

        css_router stores a comma-separated rule's selector VERBATIM as one
        string (newlines included); declare_input emits one row per member. The
        join is keyed on the selector, so a list-scoped rule could never match
        without this expansion. Commas inside brackets/parens are NOT separators
        (`[data-x="a,b"]`, `:is(.a, .b)`), so track depth rather than str.split.
        """
        out: list[str] = []
        buf: list[str] = []
        depth = 0
        in_q: str | None = None
        for ch in sel:
            if in_q:
                buf.append(ch)
                if ch == in_q:
                    in_q = None
                continue
            if ch in "\"'":
                in_q = ch
                buf.append(ch)
            elif ch in "([":
                depth += 1
                buf.append(ch)
            elif ch in ")]":
                depth = max(0, depth - 1)
                buf.append(ch)
            elif ch == "," and depth == 0:
                out.append("".join(buf).strip())
                buf = []
            else:
                buf.append(ch)
        if buf:
            out.append("".join(buf).strip())
        # Collapse internal whitespace via the SHARED normaliser (the same one
        # the membership test applies to the declared row) so both sides agree.
        return [_norm_selector(s) for s in out if s.strip()]

    def _norm_media(m: str | None) -> str | None:
        """Normalise a media condition to declare_input's format.

        css_router's D1 and D3 store the condition VERBATIM including the
        leading ``@media `` keyword, while ``declare_input`` (and the D0/D2
        re-parse below) store the bare condition ``(max-width: 768px)``. The
        join compares literally, so an un-normalised entry could never match a
        declared row — which silently produced 6 of the 14 baselined
        UNACCOUNTED rows even where css_router HAD dispositioned the
        declaration (2026-07-23, Spec 31 unit C1b). Normalising here (rather
        than changing the router's stored value) keeps this accounting-only:
        zero pipeline behaviour change.
        """
        if m is None:
            return None
        s = m.strip()
        # css_router builds the label as f"@{node.at_keyword} {condition}"
        # (css_router.py:188), so the prefix is NOT always '@media' — an
        # '@supports (...)' rule would keep its prefix and could never match a
        # declared row. Today such rules divert to D2 before reaching D1, but
        # that invariant is not structurally enforced, so strip ANY leading
        # at-keyword rather than depending on it (qc-council finding, ~55 conf,
        # 2026-07-23 unit C1b — fails in the safe direction either way).
        if s.startswith("@"):
            _, _, rest = s.partition(" ")
            s = rest.strip()
        return s or None

    # D1 — the richest bucket: exact (selector, property, media) info preserved.
    for section_key, attrs in router_result.get("d1", {}).items():
        # section_key format: '<block_slug>:<selector>'
        # selector is everything after the first ':'
        _, _, selector = section_key.partition(":")
        for _attr_path, info in attrs.items():
            prop = info.get("css_prop", "").lower()
            # D1 carries the media condition verbatim (None = base) — normalise
            # off the leading '@media ' so it can match a declared row.
            media: str | None = _norm_media(info.get("media", None))
            if selector and prop:
                # A selector LIST is ONE entry here but N rows in declare_input
                # (which splits on commas), so the join could never match a
                # list-scoped rule — e.g. the trust-bar's
                # `.sgs-trust-bar__badge[hidden], .sgs-trust-bar__badge[data-pending="true"]
                # { display:none }` produced the last 2 of the 14 baselined
                # UNACCOUNTED rows even though css_router HAD bucketed it into
                # D1. Expand to one triple per member (2026-07-23, unit C1b).
                for member in _split_selector_list(selector):
                    bucketed.add((member, prop, media))

    # D3 — gap candidates: property-level info and media preserved.
    for entry in router_result.get("d3", []):
        src_cls = entry.get("source_class", "")
        prop = entry.get("css_property", "").lower()
        media = _norm_media(entry.get("media", None))
        if src_cls and prop:
            # source_class is the bare class name (e.g. 'sgs-hero'); normalise to selector.
            selector = f".{src_cls}"
            bucketed.add((selector, prop, media))

    # D0 — global/reset rules (raw CSS text) — re-parsed with media extracted.
    d0_sel_props = _extract_sel_props_from_raw_css(router_result.get("d0", []))
    bucketed.update(d0_sel_props)

    # D2 — scoped wrapper CSS (raw CSS text) — re-parsed with media extracted.
    d2_sel_props = _extract_sel_props_from_raw_css(router_result.get("d2", []))
    bucketed.update(d2_sel_props)

    return bucketed


# ---------------------------------------------------------------------------
# F4 excluded_properties DB query
# ---------------------------------------------------------------------------

def _load_excluded_properties(db_path: Path) -> set[str]:
    """Return the set of CSS property names from the F4 excluded_properties table.

    The table ships EMPTY (F4 design doc §2). If the table does not exist yet
    (pre-migration), returns an empty set and logs a warning — the coverage
    gate is still valid (an empty excluded set is the conservative choice:
    nothing is excused, so all unrouted declarations are UNACCOUNTED).
    """
    if not db_path.exists():
        print(
            f"  [coverage_check] WARNING: DB not found at {db_path}. "
            "Treating excluded_properties as empty — this is the safe/conservative choice.",
            file=sys.stderr,
        )
        return set()

    try:
        conn = sqlite3.connect(str(db_path))
        try:
            cur = conn.execute("SELECT css_property FROM excluded_properties")
            return {row[0].lower() for row in cur.fetchall()}
        except sqlite3.OperationalError:
            # Table does not exist yet (F4 migration not yet run).
            print(
                "  [coverage_check] WARNING: excluded_properties table not found in DB. "
                "Treating as empty (conservative — nothing excused).",
                file=sys.stderr,
            )
            return set()
        finally:
            conn.close()
    except Exception as exc:
        print(
            f"  [coverage_check] WARNING: DB query failed ({exc}). "
            "Treating excluded_properties as empty.",
            file=sys.stderr,
        )
        return set()


# ---------------------------------------------------------------------------
# LANDED leg placeholder (DEFERRED — F3 runtime not yet landed)
# ---------------------------------------------------------------------------

# Directory holding the F3 oracle's per-fixture verdict artefacts, written by
# oracle/batch_runner.py (`<stem>.landed.json`, the frozen §6 contract).
_RENDER_ORACLE_DIR = _FIXTURES_PHASE_F_DIR / "_render-oracle"

# Cell verdicts the LANDED leg treats as a HARD FAIL (Spec 31 §12.2.2:
# "WRITTEN-not-LANDED count >0 = hard fail"). Every OTHER non-LANDED verdict
# (UNVERIFIED / NOT-RENDERED / GUARD-FAIL) is reported as a non-passing
# observation but is NOT a converter regression — §7b requires those be shown
# explicitly and never silently counted as LANDED.
_LANDED_HARD_FAIL_VERDICTS = frozenset({"WRITTEN-not-LANDED"})


def check_landed(fixture_stem: str, router_result: dict | None = None) -> list[dict]:
    """The LANDED leg of the coverage gate — ARMED 2026-07-23.

    Verifies that a *transferred* attr (placed in D1 by css_router) actually
    RENDERS on the live clone: the value round-trips through the converter and
    is present in the live DOM with the expected computed style.

    This does NOT re-probe the browser. It READS the F3 render-oracle's
    per-fixture verdict artefact (``_render-oracle/<stem>.landed.json``,
    produced by ``oracle/batch_runner.py`` against the deployed canary pages)
    and translates its per-cell verdicts into coverage-gate findings. Keeping
    the probe in the oracle and the *judgement* here preserves one verdict
    engine (R-31-9) — this module never re-implements guard or verdict logic.

    Returns a list of finding dicts, each with a ``kind``:

      ``WRITTEN-not-LANDED``   — the hard-fail class (§12.2.2). An attr WAS
                                 emitted but the live computed style does not
                                 match the draft: a wrong-layer / wrong-attr
                                 transfer the UNACCOUNTED leg cannot see.
      ``NOT-LANDED-OTHER``     — UNVERIFIED / NOT-RENDERED / GUARD-FAIL cells.
                                 Reported explicitly, never counted as LANDED
                                 (§7b), but not attributed as a regression.
      ``MISSING-ORACLE-ARTEFACT`` — no artefact for this fixture. This is an
                                 UNVERIFIED surface, NOT a pass — returning an
                                 empty list here would make the check vacuous
                                 (it would "pass" precisely when the LANDED
                                 leg had never run).
      ``NOT-PROBED``           — an artefact exists but the fixture was never
                                 genuinely probed live (``oracle_status`` is
                                 SKIPPED-NO-LIVE-URL / SKIPPED-NO-PLAYWRIGHT /
                                 ERROR / NO-SECTIONS). Also not a pass.

    Severity is deliberately the CALLER's decision, not this function's: the
    F5 gate blocks on ``WRITTEN-not-LANDED`` only under ``--with-landed``, so
    an un-run oracle can never fail every other session's commit gate (the
    exact reason this leg was left unwired until the canary pages existed).

    ``router_result`` is accepted for call-signature compatibility with the
    UNACCOUNTED leg and is currently unused — the oracle artefact already
    carries the per-cell WRITTEN flag that css_router's D1 bucket informs.

    Spec ref: Spec 31 §12.2.2 (WRITTEN vs LANDED) + §7b (false-win guards).
    """
    artefact = _RENDER_ORACLE_DIR / f"{fixture_stem}.landed.json"
    if not artefact.exists():
        return [{
            "kind": "MISSING-ORACLE-ARTEFACT",
            "fixture": fixture_stem,
            "detail": (
                f"no {artefact.name} — run oracle/batch_runner.py to produce it. "
                "An unmeasured fixture is UNVERIFIED, never COVERED (Spec 31 §7b)."
            ),
        }]

    try:
        report = json.loads(artefact.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [{
            "kind": "MISSING-ORACLE-ARTEFACT",
            "fixture": fixture_stem,
            "detail": f"artefact unreadable ({exc}) — treated as UNVERIFIED, not a pass.",
        }]

    findings: list[dict] = []
    status = report.get("oracle_status", "UNKNOWN")
    if status != "LIVE-PROBED":
        findings.append({
            "kind": "NOT-PROBED",
            "fixture": fixture_stem,
            "detail": (
                f"oracle_status={status} — the fixture was not genuinely probed "
                "against a live canary page, so no cell can be LANDED."
            ),
        })

    for section in report.get("sections", []):
        for cell in section.get("cells", []):
            verdict = cell.get("verdict")
            if verdict == "LANDED":
                continue
            findings.append({
                "kind": (
                    "WRITTEN-not-LANDED"
                    if verdict in _LANDED_HARD_FAIL_VERDICTS
                    else "NOT-LANDED-OTHER"
                ),
                "fixture": fixture_stem,
                "section_id": section.get("section_id"),
                "block_slug": section.get("block_slug"),
                "property": cell.get("property"),
                "tier": cell.get("tier"),
                "draft_value": cell.get("draft_value"),
                "computed_value": cell.get("computed_value"),
                "verdict": verdict,
            })
    return findings


# ---------------------------------------------------------------------------
# Stable baseline key
# ---------------------------------------------------------------------------

def _decl_key(fixture_stem: str, selector: str, prop: str, tier: str) -> str:
    """Build a stable, deterministic key for a single UNACCOUNTED declaration.

    Format: '<fixture>|<selector>|<property>|<tier>'

    The key identifies the *logical* declaration identity across runs. It does NOT
    include the value (values can legitimately change when the fixture is updated
    without changing what is dropped). It does NOT include source_index (parse
    order is unstable across CSS refactors).
    """
    return f"{fixture_stem}|{selector}|{prop}|{tier}"


# ---------------------------------------------------------------------------
# Per-fixture coverage analysis
# ---------------------------------------------------------------------------

def _analyse_fixture(
    fixture_stem: str,
    raw_html: str,
    excluded_props: set[str],
    declare_input_fn,
    DeclKind_cls,
    route_css_fn,
) -> tuple[list[dict], list[dict]]:
    """Run the UNACCOUNTED analysis for a single fixture.

    Returns:
        (unaccounted_entries, all_relevant_decls)

    Each unaccounted_entry is a dict:
        {
          'key': str,        # stable baseline key
          'fixture': str,
          'selector': str,
          'property': str,
          'value': str,
          'tier': str,
          'media': str | None,
        }
    """
    # Step 1: DRAFT — all non-shadowed, non-structural declarations.
    all_rows = declare_input_fn(raw_html, fixture_stem)

    # Relevant kinds: box-css, custom-prop, inline-style.
    # Structural at-rules (keyframes/fontface/import/at-other) are excluded_candidates
    # by definition and never counted as DRAFT for this gate.
    relevant_rows = [
        r for r in all_rows
        if not r.shadowed
        and r.kind in (
            DeclKind_cls.box_css,
            DeclKind_cls.custom_prop,
            DeclKind_cls.inline_style,
        )
    ]

    # Step 2: BUCKETED — run css_router on extracted CSS and collect (selector, property).
    css_text = _extract_css_from_html(raw_html)
    router_result = route_css_fn(css_text, {}, {}, f"coverage-check-{fixture_stem}")
    bucketed = _bucketed_sel_props(router_result)

    # Step 3: EXCLUDED — from F4 DB table (passed in).
    # A declaration is excluded if its property is in the excluded set.

    # Step 4: UNACCOUNTED = DRAFT − (BUCKETED ∪ EXCLUDED).
    # FIX 1: join on (selector, property, media) so a Base declaration and a
    # breakpoint declaration of the same (sel, prop) are distinct keys on both
    # sides.  Conservative rule: if the draft row's media is None (Base) we also
    # accept a bucketed entry with media=None; if the media is set, only an entry
    # with the SAME media string counts as a bucket hit.  This means a breakpoint
    # declaration that is only bucketed at base (or at a different breakpoint) will
    # be reported UNACCOUNTED — a false-positive is acceptable; a false-PASS is
    # the bug being fixed.
    unaccounted: list[dict] = []
    for row in relevant_rows:
        sel = row.selector
        prop = row.property

        # Normalise the DECLARED selector with the same helper the bucketed set
        # uses — normalising one side only would silently over-report (C1b).
        is_bucketed = (_norm_selector(sel), prop, row.media) in bucketed
        is_excluded = prop in excluded_props

        if not is_bucketed and not is_excluded:
            key = _decl_key(fixture_stem, sel, prop, row.tier)
            unaccounted.append({
                "key": key,
                "fixture": fixture_stem,
                "selector": sel,
                "property": prop,
                "value": row.value,
                "tier": row.tier,
                "media": row.media,
            })

    return unaccounted, relevant_rows


# ---------------------------------------------------------------------------
# Corpus runner
# ---------------------------------------------------------------------------

def run_corpus(
    fixtures_phase_f_dir: Path,
    conformance_dir: Path | None,
    db_path: Path,
) -> dict:
    """Run the UNACCOUNTED analysis over the full fixture corpus.

    Returns a summary dict:
        {
          'per_fixture': {
              '<stem>': {
                  'relevant_count': int,
                  'bucketed_count': int,
                  'excluded_count': int,
                  'unaccounted_count': int,
                  'unaccounted': [entry, ...],
              }
          },
          'total_relevant': int,
          'total_unaccounted': int,
          'all_unaccounted_keys': [str, ...],
        }
    """
    declare_input_fn, DeclKind_cls = _import_declare_input()
    route_css_fn = _import_css_router()
    excluded_props = _load_excluded_properties(db_path)

    # Collect fixture files:
    #   • phase-f *.draft.html
    #   • conformance *.html (if the dir exists)
    fixture_files: list[tuple[str, Path]] = []

    if fixtures_phase_f_dir.exists():
        for fpath in sorted(fixtures_phase_f_dir.glob("*.draft.html")):
            stem = fpath.stem
            if stem.endswith(".draft"):
                stem = stem[: -len(".draft")]
            fixture_files.append((stem, fpath))
    else:
        print(
            f"  [coverage_check] WARNING: phase-f fixtures dir not found: {fixtures_phase_f_dir}",
            file=sys.stderr,
        )

    if conformance_dir and conformance_dir.exists():
        for fpath in sorted(conformance_dir.glob("*.html")):
            stem = fpath.stem
            fixture_files.append((stem, fpath))

    per_fixture: dict[str, dict] = {}
    all_unaccounted_keys: list[str] = []
    integration_error_stems: list[str] = []
    total_relevant = 0
    total_unaccounted = 0

    for stem, fpath in fixture_files:
        try:
            raw_html = fpath.read_text(encoding="utf-8")
        except Exception as exc:
            print(
                f"  [coverage_check] ERROR reading {fpath}: {exc}",
                file=sys.stderr,
            )
            continue

        try:
            unaccounted, relevant_rows = _analyse_fixture(
                stem, raw_html, excluded_props,
                declare_input_fn, DeclKind_cls, route_css_fn,
            )
        except Exception as exc:
            print(
                f"  [coverage_check] ERROR analysing fixture {stem!r}: {exc}",
                file=sys.stderr,
            )
            # FIX 3: track integration_error fixtures explicitly so --check can
            # fail on them.  A fixture that cannot be analysed is an UNVERIFIED
            # surface, not a pass.  Assign a stable baseline key so genuinely
            # expected errors can be grandfathered via --update-baseline.
            error_key = f"__integration_error__|{stem}"
            per_fixture[stem] = {
                "relevant_count": 0,
                "bucketed_count": 0,
                "excluded_count": 0,
                "unaccounted_count": 0,
                "unaccounted": [],
                "integration_error": str(exc),
                "integration_error_key": error_key,
            }
            integration_error_stems.append(stem)
            continue

        # Count excluded declarations (for reporting — does not change UNACCOUNTED).
        excluded_in_fixture = sum(
            1 for r in relevant_rows
            if r.property in excluded_props
        )
        bucketed_count = len(relevant_rows) - len(unaccounted) - excluded_in_fixture

        per_fixture[stem] = {
            "relevant_count": len(relevant_rows),
            "bucketed_count": max(0, bucketed_count),
            "excluded_count": excluded_in_fixture,
            "unaccounted_count": len(unaccounted),
            "unaccounted": unaccounted,
        }
        all_unaccounted_keys.extend(e["key"] for e in unaccounted)
        total_relevant += len(relevant_rows)
        total_unaccounted += len(unaccounted)

    return {
        "per_fixture": per_fixture,
        "total_relevant": total_relevant,
        "total_unaccounted": total_unaccounted,
        "all_unaccounted_keys": sorted(set(all_unaccounted_keys)),
        "integration_error_stems": integration_error_stems,
    }


# ---------------------------------------------------------------------------
# Baseline helpers (mirrors excluded-gate pattern — FIX 2: hash protection)
# ---------------------------------------------------------------------------

def _compute_hash(keys: list[str]) -> str:
    """SHA-256 of the sorted, newline-joined key list.

    Mirrors excluded-gate/run.py _compute_hash — any hand-edit to the baseline
    JSON that alters the 'keys' list without recomputing the hash is caught by
    --check (self-blessing protection).
    """
    payload = "\n".join(sorted(keys)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _load_baseline() -> tuple[set[str], str | None]:
    """Return (baseline_keys, stored_hash).

    stored_hash is None if the baseline file does not exist, is malformed, or
    was written in the legacy plain-list format (pre-FIX-2).  The caller MUST
    check the hash before trusting the key set.
    """
    if not _BASELINE_PATH.exists():
        return set(), None
    try:
        data = json.loads(_BASELINE_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            keys = set(data.get("keys", []))
            stored_hash: str | None = data.get("hash")
            return keys, stored_hash
        # Legacy plain-list format written before FIX-2 — treat as no hash.
        if isinstance(data, list):
            return set(data), None
    except Exception:
        pass
    return set(), None


def _save_baseline(keys: set[str]) -> None:
    """Write the baseline in the hashed format.

    Format: {"hash": "<sha256>", "keys": [...sorted...]}
    The ONLY legitimate way to update the baseline is via --update-baseline,
    which calls this function.  Any hand-edit that changes 'keys' without
    recomputing 'hash' will be caught on the next --check run.
    """
    sorted_keys = sorted(keys)
    data = {
        "hash": _compute_hash(sorted_keys),
        "keys": sorted_keys,
    }
    _BASELINE_PATH.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


# ---------------------------------------------------------------------------
# Report formatting
# ---------------------------------------------------------------------------

def _print_report(summary: dict, baseline: set[str]) -> None:
    """Print a plain-English per-fixture + total UNACCOUNTED report."""
    per_fixture = summary["per_fixture"]
    total_relevant = summary["total_relevant"]
    total_unaccounted = summary["total_unaccounted"]
    all_keys = set(summary["all_unaccounted_keys"])

    new_keys = all_keys - baseline
    baselined_keys = all_keys & baseline

    print("=" * 70)
    print("  F5 Coverage-Conservation Gate — UNACCOUNTED leg")
    print("  Spec 31 §12.2.1 — draft_declarations − (bucketed ∪ excluded)")
    print("=" * 70)
    print()
    print(
        "  LANDED leg: ARMED (2026-07-23) but NOT run in this invocation.\n"
        "  Pass --with-landed to read the F3 oracle artefacts and (with --check)\n"
        "  fail on any WRITTEN-not-LANDED cell. Spec ref: Spec 31 §12.2.2.\n"
    )
    print(f"  Total relevant declarations: {total_relevant}")
    print(f"  Total UNACCOUNTED:           {total_unaccounted}")
    print(f"    — NEW (not in baseline):   {len(new_keys)}")
    print(f"    — Baselined (known):       {len(baselined_keys)}")
    print()

    for stem in sorted(per_fixture):
        fdata = per_fixture[stem]
        if "integration_error" in fdata:
            print(f"  [{stem}]  INTEGRATION ERROR: {fdata['integration_error']}")
            continue

        n = fdata["unaccounted_count"]
        r = fdata["relevant_count"]
        tag = "OK" if n == 0 else f"UNACCOUNTED={n}"
        new_in_fixture = [e for e in fdata["unaccounted"] if e["key"] not in baseline]
        new_tag = f" ({len(new_in_fixture)} NEW)" if new_in_fixture else ""
        print(f"  [{stem}]  relevant={r}  {tag}{new_tag}")

        if n > 0:
            for entry in fdata["unaccounted"]:
                is_new = entry["key"] not in baseline
                tag2 = "[NEW]" if is_new else "[baselined]"
                print(
                    f"    {tag2}  {entry['selector']}  |  {entry['property']}  "
                    f"|  tier={entry['tier']}  |  value={entry['value']!r}"
                )

    print()
    if total_unaccounted == 0:
        print("  GATE: GREEN — 0 UNACCOUNTED declarations.")
    else:
        print(
            f"  GATE (UNACCOUNTED leg): {total_unaccounted} declaration(s) not in any bucket or excluded table."
        )
        if new_keys:
            print(
                f"  {len(new_keys)} NEW (not in baseline) — these are REGRESSIONS."
            )
        if baselined_keys:
            print(
                f"  {len(baselined_keys)} baselined — known legacy drops; "
                "shrink by fixing the pipeline."
            )
    print()


def _print_landed_report(summary: dict) -> list[dict]:
    """Print the LANDED leg per fixture. Returns the hard-fail findings only.

    Spec 31 §12.2.2 — WRITTEN-not-LANDED is the hard-fail class. Everything
    else non-LANDED is shown explicitly so an unmeasured or guard-blocked
    surface can never read as a pass (§7b).
    """
    stems = sorted(summary["per_fixture"])
    hard_fails: list[dict] = []
    kind_totals: dict[str, int] = {}

    print("=" * 70)
    print("  F5 Coverage-Conservation Gate — LANDED leg (Spec 31 §12.2.2)")
    print("  Source: tests/fixtures/phase-f/_render-oracle/<stem>.landed.json")
    print("=" * 70)
    print()

    for stem in stems:
        findings = check_landed(stem)
        for f in findings:
            kind_totals[f["kind"]] = kind_totals.get(f["kind"], 0) + 1
        fixture_fails = [f for f in findings if f["kind"] == "WRITTEN-not-LANDED"]
        hard_fails.extend(fixture_fails)

        if not findings:
            print(f"  [{stem}]  LANDED — all probed cells match the draft.")
            continue
        kinds = sorted({f["kind"] for f in findings})
        print(f"  [{stem}]  {len(findings)} finding(s): {', '.join(kinds)}")
        for f in fixture_fails:
            print(
                f"    [WRITTEN-not-LANDED]  {f['property']} [{f['tier']}]  "
                f"draft={f['draft_value']!r}  live={f['computed_value']!r}  "
                f"({f['block_slug']} / {f['section_id']})"
            )

    print()
    for kind, n in sorted(kind_totals.items()):
        print(f"  {kind:26s} {n}")
    print()
    if hard_fails:
        print(f"  LANDED leg: {len(hard_fails)} WRITTEN-not-LANDED cell(s) — HARD FAIL class.")
    else:
        print("  LANDED leg: 0 WRITTEN-not-LANDED cells.")
        if kind_totals:
            print(
                "  NOTE: non-LANDED observations above are UNVERIFIED surfaces, "
                "NOT passes (Spec 31 §7b)."
            )
    print()
    return hard_fails


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "F5 Coverage-Conservation Gate (UNACCOUNTED leg). "
            "Computes UNACCOUNTED = draft − (bucketed ∪ excluded) per fixture."
        )
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--report",
        action="store_true",
        default=False,
        help="Print all findings and exit 0 (default when no flag given).",
    )
    mode.add_argument(
        "--check",
        action="store_true",
        default=False,
        help=(
            "Exit 1 if any UNACCOUNTED key is NOT in the baseline file. "
            "Fails only on NEW drops introduced since the last --update-baseline."
        ),
    )
    mode.add_argument(
        "--update-baseline",
        action="store_true",
        default=False,
        help=(
            "Write all current UNACCOUNTED keys to the baseline file and exit 0. "
            "Run this after the first run or after accepting new legacy drops. "
            "Do NOT blindly baseline without understanding each finding."
        ),
    )
    parser.add_argument(
        "--fixtures-dir",
        type=Path,
        default=None,
        help="Path to tests/fixtures/phase-f/ (auto-detected if omitted).",
    )
    parser.add_argument(
        "--conformance-dir",
        type=Path,
        default=None,
        help="Path to tests/fixtures/conformance/ (auto-detected if omitted).",
    )
    parser.add_argument(
        "--no-conformance",
        action="store_true",
        default=False,
        help="Skip conformance fixtures (phase-f only).",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=None,
        help="Path to sgs-framework.db (auto-detected if omitted).",
    )
    parser.add_argument(
        "--with-landed",
        action="store_true",
        default=False,
        help=(
            "Also run the LANDED leg (Spec 31 §12.2.2) from the F3 oracle "
            "artefacts in tests/fixtures/phase-f/_render-oracle/. With --check "
            "this makes any WRITTEN-not-LANDED cell a hard failure. OFF by "
            "default so a stale/absent oracle run cannot fail every commit — "
            "run oracle/batch_runner.py first, then gate with this flag."
        ),
    )
    args = parser.parse_args(argv)

    # Default mode is --report.
    if not args.check and not args.update_baseline:
        args.report = True

    fixtures_dir = args.fixtures_dir or _FIXTURES_PHASE_F_DIR
    conformance_dir = None
    if not args.no_conformance:
        conformance_dir = args.conformance_dir or _CONFORMANCE_DIR
    db_path = args.db or _DB_PATH

    summary = run_corpus(fixtures_dir, conformance_dir, db_path)

    # FIX 2: _load_baseline now returns (keys, hash) tuple.
    baseline, stored_hash = _load_baseline()

    if args.update_baseline:
        # Include both UNACCOUNTED declaration keys AND integration_error keys so
        # genuinely expected errors can be grandfathered (FIX 3 + FIX 2).
        error_keys: set[str] = {
            fdata["integration_error_key"]
            for fdata in summary["per_fixture"].values()
            if "integration_error_key" in fdata
        }
        new_baseline = set(summary["all_unaccounted_keys"]) | error_keys
        _save_baseline(new_baseline)
        print(
            f"[F5] Baseline updated — {len(new_baseline)} key(s) written to {_BASELINE_PATH}"
        )
        return 0

    _print_report(summary, baseline)

    landed_hard_fails: list[dict] = []
    if args.with_landed:
        landed_hard_fails = _print_landed_report(summary)

    if args.check:
        if args.with_landed and landed_hard_fails:
            print(
                f"\n[F5] GATE FAILED (LANDED leg) — {len(landed_hard_fails)} "
                "WRITTEN-not-LANDED cell(s).\n"
                "  An attr was emitted but the LIVE computed style does not match the draft.\n"
                "  This is a wrong-layer / wrong-attr transfer the UNACCOUNTED leg cannot see.\n"
                "  Spec ref: Spec 31 §12.2.2."
            )
            return 1

        # FIX 2: Hash integrity check — catches hand-edited baselines (self-blessing protection).
        if baseline and stored_hash is not None:
            expected_hash = _compute_hash(sorted(baseline))
            if expected_hash != stored_hash:
                print(
                    "\n[F5] GATE FAILED — baseline file has been TAMPERED.\n"
                    f"  Stored hash:   {stored_hash}\n"
                    f"  Expected hash: {expected_hash}\n"
                    "  The 'keys' list was modified without recomputing the hash.\n"
                    "  This is the self-blessing protection.  Run --update-baseline\n"
                    "  to produce a legitimate baseline from the current output.\n"
                    "  Do NOT hand-edit the baseline JSON."
                )
                return 1

        # FIX 3: Fail on any unbaselined integration_error fixture.
        # A fixture that cannot be analysed is an UNVERIFIED surface, not a pass.
        integration_error_stems = summary.get("integration_error_stems", [])
        new_integration_errors = [
            stem for stem in integration_error_stems
            if f"__integration_error__|{stem}" not in baseline
        ]
        if new_integration_errors:
            print(
                f"\n[F5] GATE FAILED — {len(new_integration_errors)} fixture(s) could not be "
                "analysed (integration_error) and are not in the baseline.\n"
                "  An unanalysable fixture is an UNVERIFIED surface — it cannot count as a pass.\n"
                "  Fix the underlying error (preferred) or run --update-baseline to grandfather it.\n"
                f"  Fixtures: {new_integration_errors}"
            )
            return 1

        all_keys = set(summary["all_unaccounted_keys"])
        new_keys = all_keys - baseline
        if new_keys:
            print(
                f"[F5] GATE FAILED — {len(new_keys)} NEW unaccounted declaration(s).\n"
                "  These declarations are not in any css_router bucket or the excluded_properties table.\n"
                "  Either fix the pipeline (preferred) or run --update-baseline to accept as known.\n"
                "  Do NOT blindly baseline — each new entry is a real pipeline drop."
            )
            return 1
        total = summary["total_unaccounted"]
        if total > 0:
            print(
                f"[F5] Gate passed — all {total} unaccounted declaration(s) are baselined. "
                "Shrink the baseline by fixing the pipeline."
            )
        else:
            print("[F5] Gate passed — 0 UNACCOUNTED declarations.")
        return 0

    # --report: always exit 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
