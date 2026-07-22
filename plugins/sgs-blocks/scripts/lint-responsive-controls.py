#!/usr/bin/env python3
"""
lint-responsive-controls.py — FR-36-24 structural gate (R-31-9 for responsive controls).

Purpose
-------
FR-36-24(b) (Spec 36 §2, `.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`) requires:

    "No piece invents a parallel per-device control — a structural guard
    (a `lint-responsive-controls.py`-style gate) enforces R-31-9: every
    responsive-worthy attr routes through `ResponsiveControl`, never a
    bespoke per-tier control."

This script enforces that. It scans every block's `edit.js` (the block's
inspector-control UI) for the tell-tale SHAPE of a hand-rolled device-tier
switcher, and fails if one is found outside the two sanctioned SGS
responsive primitives.

Two sanctioned primitives (per DB-first rule R-31-1, this is the ONE
permitted structural constant — analogous to `SKIP_TOP_LEVEL_TAGS` — because
it names the framework's own canonical architecture, not a business-domain
lookup):

    - components/ResponsiveControl.js  (the WP-native-device-preview-synced
      switcher, quoted by name in FR-36-24 itself)
    - components/ResponsiveOverride.js (the SGS-owned {desktop,tablet,mobile}
      inherit-tier switcher used by the §S9 header/footer/nav row blocks,
      FR-S9-6)

Everything else that counts as "legitimate" is DISCOVERED, not hardcoded:
any component exported from `src/components/index.js` whose own source
imports one of the two primitives above is automatically treated as a
sanctioned wrapper (e.g. ResponsiveBoxControl, ResponsiveBoxControls,
ResponsiveBorderRadiusControl, TypographyControls today — the list is never
cached here, it is re-derived from the live source tree on every run).

Detection signature (a "bespoke per-tier control")
---------------------------------------------------
A block's `edit.js` is flagged when it shows the SHAPE of a device-tier
switcher built from scratch, i.e. BOTH of:

  1. It does NOT import any sanctioned responsive component (primitive or
     discovered wrapper) from `../../components` (or a relative path into
     `components/`).
  2. It contains at least one of:
       a. a direct import of the desktop+tablet+mobile icon TRIO from
          `@wordpress/icons` (that triple import is the same signature the
          two primitives themselves use internally to build their tab UI —
          a block importing all three itself is reimplementing that UI); or
       b. a local `useState` seeded with the literal device-tier value
          `'desktop'` (or `"desktop"`) that keeps its own tier state,
          instead of reading tier from the shared primitive's render-prop.

  This intentionally does NOT flag the DEVICE-VISIBILITY (show/hide per
  device) extension (`extensions/responsive-visibility.js`,
  `universal-extensions/DeviceVisibilityPanel.js`) or its consumers — that
  is FR-36-24(a), a DIFFERENT ownership line (whole-piece show/hide, not a
  per-tier SETTING VALUE), and it is out of scope for R-31-9 by the spec's
  own wording. Excluded from the scan: `src/components/**` (framework
  infrastructure — where the switchers themselves legitimately live) and
  `src/blocks/extensions/**` (the shared device-visibility extension).

Also intentionally does NOT flag arbitrary CSS breakpoints (`min-width:600px`,
WP's 781px column stack, etc.) — those are never editor CONTROLS, so they
never appear in this scan's file set (`edit.js`) or its detection signature
at all. Device-tier (Mobile/Tablet/Desktop editor controls) and arbitrary
visual breakpoints (a CSS rule) are different concepts; see CLAUDE.md
"Responsive breakpoint discipline".

DB-first (R-31-1)
------------------
No block name, attribute name, or count is hardcoded. Detection is pure
code-shape analysis of the live source tree. The optional `--db-context`
report annotation (which blocks have DB-registered responsive-worthy attrs)
is queried live via the canonical `sgs-db.py sql` CLI on every run — never
cached in this file.

Usage
-----
    python lint-responsive-controls.py                 # scan + report, exit 1 on any finding
    python lint-responsive-controls.py --db-context     # also annotate findings with live DB attr counts
    python lint-responsive-controls.py --self-test      # prove the gate can fail AND pass (negative control)
    python lint-responsive-controls.py --quiet          # findings only, no discovery/summary preamble
"""

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]  # .../small-giants-wp
BLOCKS_SRC = REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "blocks"
COMPONENTS_SRC = REPO_ROOT / "plugins" / "sgs-blocks" / "src" / "components"
COMPONENTS_INDEX = COMPONENTS_SRC / "index.js"
SGS_DB_CLI = Path.home() / ".claude" / "skills" / "sgs-wp-engine" / "scripts" / "sgs-db.py"

# The two canonical primitives — named explicitly in FR-36-24 / FR-S9-6.
# This is the ONE permitted structural constant (R-31-1 exception, same
# tier as SKIP_TOP_LEVEL_TAGS): it names the framework's OWN architecture,
# not a business-domain block/attribute lookup.
PRIMITIVE_FILES = {"ResponsiveControl.js", "ResponsiveOverride.js"}

# Directories excluded from the scan entirely — framework infrastructure,
# not a "piece" that could invent a parallel per-device control.
EXCLUDED_DIR_PARTS = {"extensions", "universal-extensions"}

IMPORT_FROM_RE = re.compile(
    r"import\s*(?:\{([^}]*)\}|(\w+))\s*from\s*['\"]([^'\"]+)['\"]", re.MULTILINE
)
ICON_TRIO_RE = re.compile(
    r"import\s*\{([^}]*)\}\s*from\s*['\"]@wordpress/icons['\"]"
)
USE_STATE_DESKTOP_RE = re.compile(
    r"useState\(\s*['\"]desktop['\"]\s*\)"
)


# ─────────────────────────────────────────────────────────────────────────
# Discovery: which component names are "sanctioned responsive" components?
# ─────────────────────────────────────────────────────────────────────────

def discover_sanctioned_components() -> set:
    """
    Return the set of exported-from-components/index.js identifier names
    that are legitimate responsive-tier controls: the two primitives
    themselves, plus any component whose own source file imports one of
    the two primitives. Re-derived from the live source tree every run —
    nothing here is cached or hardcoded.
    """
    sanctioned = set()

    if not COMPONENTS_INDEX.exists():
        # Fall back to the two primitives by their own export name — still
        # zero hardcoded block/attr data, just the two named-in-spec files.
        return {"ResponsiveControl", "ResponsiveOverride"}

    index_src = COMPONENTS_INDEX.read_text(encoding="utf-8")

    # Parse `export { default as Name, other as Other2 } from './File.js'`
    # and `export { default as Name } from './File'` shapes.
    export_re = re.compile(
        r"export\s*\{([^}]*)\}\s*from\s*['\"]\./([\w./-]+)['\"]"
    )
    for names_blob, rel_module in export_re.finditer(index_src) and export_re.findall(index_src) or []:
        pass  # placeholder, replaced by loop below (kept for clarity of intent)

    for match in export_re.finditer(index_src):
        names_blob, rel_module = match.group(1), match.group(2)
        module_file = COMPONENTS_SRC / (rel_module if rel_module.endswith(".js") else rel_module + ".js")

        # Extract the local (imported-as) identifier names this export line
        # introduces, e.g. "default as ResponsiveBoxControl, ResponsiveBorderRadiusControl".
        local_names = []
        for piece in names_blob.split(","):
            piece = piece.strip()
            if not piece:
                continue
            if " as " in piece:
                local_names.append(piece.split(" as ")[-1].strip())
            else:
                local_names.append(piece.strip())

        if module_file.name in PRIMITIVE_FILES:
            sanctioned.update(local_names)
            continue

        if not module_file.exists():
            continue

        module_src = module_file.read_text(encoding="utf-8")
        # Require an ACTUAL import statement of the primitive, not merely a
        # comment mentioning it (e.g. "mirrors the ResponsiveControl idiom" —
        # seen in StateToggleControl.js, which does NOT import it).
        if any(
            re.search(
                rf"^\s*import\b.*from\s*['\"][^'\"]*{re.escape(prim.replace('.js', ''))}['\"]",
                module_src,
                re.MULTILINE,
            )
            for prim in PRIMITIVE_FILES
        ):
            sanctioned.update(local_names)

    # Always include the primitives' own export names even if index.js is
    # ever restructured.
    sanctioned.update({"ResponsiveControl", "ResponsiveOverride"})
    return sanctioned


def is_excluded(path: Path) -> bool:
    parts = set(path.parts)
    return bool(parts & EXCLUDED_DIR_PARTS) or (COMPONENTS_SRC in path.parents)


# ─────────────────────────────────────────────────────────────────────────
# Per-file analysis
# ─────────────────────────────────────────────────────────────────────────

def imports_sanctioned_component(src: str, sanctioned: set) -> bool:
    for match in IMPORT_FROM_RE.finditer(src):
        named_blob, default_name, module_path = match.group(1), match.group(2), match.group(3)
        if "components" not in module_path and not module_path.startswith("./Responsive"):
            continue
        names = []
        if named_blob:
            for piece in named_blob.split(","):
                piece = piece.strip()
                if not piece:
                    continue
                if " as " in piece:
                    names.append(piece.split(" as ")[-1].strip())
                else:
                    names.append(piece)
        if default_name:
            names.append(default_name)
        if any(n in sanctioned for n in names):
            return True
    return False


def find_bespoke_signature(src: str):
    """Return a list of (reason, snippet) tuples for bespoke-switcher signatures."""
    findings = []

    icon_match = ICON_TRIO_RE.search(src)
    if icon_match:
        imported = {n.strip() for n in icon_match.group(1).split(",") if n.strip()}
        # Strip "X as Y" down to the local name for matching.
        local_names = {n.split(" as ")[-1].strip() for n in imported}
        if {"desktop", "tablet", "mobile"}.issubset(local_names):
            findings.append((
                "imports the desktop+tablet+mobile icon trio directly from "
                "@wordpress/icons (the same signature ResponsiveControl / "
                "ResponsiveOverride use internally to build their own tab UI)",
                icon_match.group(0).strip(),
            ))

    state_match = USE_STATE_DESKTOP_RE.search(src)
    if state_match:
        findings.append((
            "keeps its own device-tier useState seeded with 'desktop' "
            "instead of reading the tier from a shared primitive's render-prop",
            state_match.group(0).strip(),
        ))

    return findings


def line_of(src: str, needle: str) -> int:
    idx = src.find(needle)
    if idx == -1:
        return 0
    return src.count("\n", 0, idx) + 1


# ─────────────────────────────────────────────────────────────────────────
# DB context (best-effort, never required, never cached)
# ─────────────────────────────────────────────────────────────────────────

def db_tiered_attr_count(block_slug: str):
    if not SGS_DB_CLI.exists():
        return None
    query = (
        "SELECT COUNT(*) FROM block_attributes WHERE block_slug='"
        + block_slug.replace("'", "''")
        + "' AND (attr_name LIKE '%Tablet' OR attr_name LIKE '%Mobile' OR is_responsive=1)"
    )
    try:
        out = subprocess.run(
            [sys.executable, str(SGS_DB_CLI), "sql", query],
            capture_output=True, text=True, timeout=20,
        )
        if out.returncode != 0:
            return None
        # Table output: header row, separator row, one data row with the count.
        lines = [l for l in out.stdout.splitlines() if l.strip()]
        if len(lines) >= 3:
            last = lines[-1].strip()
            if last.isdigit():
                return int(last)
    except Exception:
        return None
    return None


# ─────────────────────────────────────────────────────────────────────────
# Scan
# ─────────────────────────────────────────────────────────────────────────

def scan(blocks_src: Path, sanctioned: set, use_db_context: bool):
    findings = []
    files_scanned = 0

    for edit_js in sorted(blocks_src.glob("*/edit.js")):
        try:
            rel = edit_js.relative_to(REPO_ROOT)
        except ValueError:
            rel = edit_js
        if is_excluded(edit_js):
            continue
        files_scanned += 1
        src = edit_js.read_text(encoding="utf-8", errors="replace")

        if imports_sanctioned_component(src, sanctioned):
            continue  # routes through a sanctioned primitive somewhere in the file

        signatures = find_bespoke_signature(src)
        if not signatures:
            continue

        block_slug = "sgs/" + edit_js.parent.name
        db_count = db_tiered_attr_count(block_slug) if use_db_context else None

        for reason, snippet in signatures:
            findings.append({
                "file": str(rel),
                "line": line_of(src, snippet),
                "snippet": snippet,
                "reason": reason,
                "block_slug": block_slug,
                "db_tiered_attrs": db_count,
            })

    return findings, files_scanned


def report(findings, files_scanned, sanctioned, quiet):
    if not quiet:
        print(f"lint-responsive-controls.py — FR-36-24 structural gate (R-31-9)")
        print(f"Sanctioned responsive components (discovered, not hardcoded): "
              f"{', '.join(sorted(sanctioned))}")
        print(f"Scanned {files_scanned} block edit.js file(s) under {BLOCKS_SRC.relative_to(REPO_ROOT)}")
        print()

    if not findings:
        print("PASS — no bespoke per-tier control signature found. "
              "Every scanned block routes responsive settings through a "
              "sanctioned ResponsiveControl/ResponsiveOverride-derived component.")
        return 0

    print(f"FAIL — {len(findings)} bespoke per-device control signature(s) found:\n")
    for f in findings:
        print(f"  {f['file']}:{f['line']}")
        print(f"    Block: {f['block_slug']}")
        print(f"    Reason: {f['reason']}")
        print(f"    Code:   {f['snippet']}")
        if f["db_tiered_attrs"] is not None:
            print(f"    DB context: {f['db_tiered_attrs']} tiered/responsive attr(s) "
                  f"registered for this block in block_attributes")
        print(f"    Fix: route this control through the shared `ResponsiveControl` "
              f"(or `ResponsiveOverride` for the {{desktop,tablet,mobile}} object "
              f"model) from `src/components` instead of building a per-device "
              f"switcher inline. See plugins/sgs-blocks/src/components/ResponsiveControl.js.")
        print()

    return 1


# ─────────────────────────────────────────────────────────────────────────
# Self-test (negative control) — proves the gate can actually fail
# ─────────────────────────────────────────────────────────────────────────

VIOLATION_FIXTURE = """\
import { useState } from '@wordpress/element';
import { ButtonGroup, Button, PanelBody, RangeControl } from '@wordpress/components';
import { desktop, tablet, mobile } from '@wordpress/icons';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';

// Deliberately bespoke: this block invents its own device-tier switcher
// instead of using the shared ResponsiveControl component (FR-36-24 violation fixture).
export default function Edit( { attributes, setAttributes } ) {
	const [ tier, setTier ] = useState( 'desktop' );
	const blockProps = useBlockProps();

	const attrKey = tier === 'desktop' ? 'columns' : tier === 'tablet' ? 'columnsTablet' : 'columnsMobile';

	return (
		<div { ...blockProps }>
			<InspectorControls>
				<PanelBody title="Columns (per device)">
					<ButtonGroup>
						<Button icon={ desktop } onClick={ () => setTier( 'desktop' ) } />
						<Button icon={ tablet } onClick={ () => setTier( 'tablet' ) } />
						<Button icon={ mobile } onClick={ () => setTier( 'mobile' ) } />
					</ButtonGroup>
					<RangeControl
						value={ attributes[ attrKey ] }
						onChange={ ( v ) => setAttributes( { [ attrKey ]: v } ) }
					/>
				</PanelBody>
			</InspectorControls>
		</div>
	);
}
"""

CLEAN_FIXTURE = """\
import { PanelBody } from '@wordpress/components';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { ResponsiveControl } from '../../components';

// Legitimate: routes through the shared ResponsiveControl primitive.
export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();

	return (
		<div { ...blockProps }>
			<InspectorControls>
				<PanelBody title="Columns (per device)">
					<ResponsiveControl label="Columns">
						{ ( breakpoint ) => (
							<span>{ breakpoint }</span>
						) }
					</ResponsiveControl>
				</PanelBody>
			</InspectorControls>
		</div>
	);
}
"""


def self_test() -> int:
    sanctioned = discover_sanctioned_components()
    print("=== SELF-TEST: negative control for lint-responsive-controls.py ===\n")

    with tempfile.TemporaryDirectory() as tmp:
        fixture_root = Path(tmp) / "blocks"
        fixture_block_dir = fixture_root / "self-test-fixture-block"
        fixture_block_dir.mkdir(parents=True)
        fixture_file = fixture_block_dir / "edit.js"

        # --- Step 1: violating fixture must FAIL the gate --------------
        fixture_file.write_text(VIOLATION_FIXTURE, encoding="utf-8")
        findings, scanned = scan(fixture_root, sanctioned, use_db_context=False)
        print(f"[1/2] Violating fixture written to {fixture_file}")
        code_fail = report(findings, scanned, sanctioned, quiet=True)
        step1_ok = code_fail == 1 and len(findings) >= 1
        print(f"      Gate exit code: {code_fail} (expected 1) — "
              f"{'PASS' if step1_ok else 'FAIL'} (gate correctly flagged the violation)"
              if step1_ok else
              f"      Gate exit code: {code_fail} (expected 1) — FAIL "
              f"(gate did NOT catch the deliberate violation — the gate is vacuous)")
        print()

        # --- Step 2: same fixture removed / replaced with clean version -
        fixture_file.write_text(CLEAN_FIXTURE, encoding="utf-8")
        findings2, scanned2 = scan(fixture_root, sanctioned, use_db_context=False)
        print(f"[2/2] Fixture replaced with a ResponsiveControl-based clean version")
        code_pass = report(findings2, scanned2, sanctioned, quiet=True)
        step2_ok = code_pass == 0 and len(findings2) == 0
        print(f"      Gate exit code: {code_pass} (expected 0) — "
              f"{'PASS' if step2_ok else 'FAIL'} (gate correctly cleared the fix)")
        print()

    overall_ok = step1_ok and step2_ok
    print(f"=== SELF-TEST RESULT: {'PASS' if overall_ok else 'FAIL'} ===")
    if not overall_ok:
        print("The gate failed its own negative control — it would not be "
              "trustworthy as a structural guard. Do not rely on it until fixed.")
    return 0 if overall_ok else 1


# ─────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--self-test", action="store_true", help="Run the negative-control self-test and exit.")
    parser.add_argument("--db-context", action="store_true", help="Annotate findings with live DB tiered-attr counts.")
    parser.add_argument("--quiet", action="store_true", help="Suppress the discovery/summary preamble.")
    args = parser.parse_args()

    if args.self_test:
        sys.exit(self_test())

    sanctioned = discover_sanctioned_components()
    findings, files_scanned = scan(BLOCKS_SRC, sanctioned, args.db_context)
    exit_code = report(findings, files_scanned, sanctioned, args.quiet)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
