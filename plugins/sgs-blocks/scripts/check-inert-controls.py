#!/usr/bin/env python3
"""Find block attributes that are OVERWRITTEN in render.php before being used.

WHY THIS EXISTS
---------------
An inert control is an editor control a client changes that has NO EFFECT on the
rendered page: the attribute has a control in edit.js (or a shared controls
component) AND is declared in block.json, but render.php UNCONDITIONALLY or
CONDITIONALLY rewrites it with a hardcoded literal before passing it to rendering
logic (the wrapper, inline CSS, or a template).

Unlike dead controls (control exists, attr never consumed), these make the user
believe they are changing something they are not. The control is visible, the
editor reflects the change, the live page is unaffected — an invisible inert state.

DEFECT CLASSES
---------------
1. **UNCONDITIONAL**: $attributes['x'] = literal; on every code path that renders.
   Severity: HIGH — attribute is ALWAYS overwritten, every user edit is discarded.

2. **CONDITIONAL**: $attributes['x'] = literal; inside an if/else branch, so some
   code paths preserve the user value and others discard it. Client has no way to
   know which path their page takes.
   Severity: MEDIUM — user edits work sometimes, fail mysteriously other times.

3. **LOCAL-VARIABLE FALLBACK** (NOT flagged — legitimate): A PHP local assigned
   from the attribute with a fallback default (e.g. `$mode = $attributes['x'] ?? 'default'`
   or `$mode = isset($attributes['x']) ? ... : 'fallback';`). This is normalisation,
   not an overwrite — the attribute is read and its value respected, with a fallback
   for the missing/invalid case.

DETECTION METHOD
----------------
Scans every src/blocks/*/render.php for patterns matching:
  $attributes['KEY'] = LITERAL;

For each match, verifies:
  1. The KEY is declared in that block's block.json.
  2. The block's edit.js or a shared controls component (ContainerWrapperControls)
     has a control for KEY (textual pattern match — not exhaustive, but sufficient).
  3. The assignment is NOT a legitimate local-variable fallback (excluded by pattern).
  4. The assignment is NOT inside a PHP comment.

Classifies each finding as UNCONDITIONAL or CONDITIONAL by checking whether the
assignment is inside an if/else/switch branch.

SCOPE / LIMITS
--------------
Only src/blocks/*/render.php (the canonical render surface). Does not scan
view.js (frontend interactivity) or save.js (client-side save hook) — those
live on the editor/frontend boundary and are lower-priority than render.php
mutations. Does not scan theme templates/patterns (static markup, different
gate). Does not scan hook callbacks or external PHP (lower priority).

EXPECTED FINDINGS (2026-08-19)
------------------------------
Predicted: 1
Actual: 1 (feature-grid/render.php:156)
Reconciliation: EXACT MATCH — the one known instance, no others found.

`--check` exits 1 on any finding (wire into prebuild). Default run reports only.
"""

import json
import os
import pathlib
import re
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'
INCLUDES_DIR = REPO / 'plugins' / 'sgs-blocks' / 'includes'
SHARED_CONTROLS_JS = BLOCKS_DIR / 'container' / 'components' / 'ContainerWrapperControls.js'


def load_block_schemas() -> dict:
    """Load all block.json files, return {block_name: declared_attrs_set}."""
    out = {}
    for bj in BLOCKS_DIR.glob('*/block.json'):
        try:
            d = json.loads(bj.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            continue
        if 'name' in d:
            attrs = set(d.get('attributes', {}).keys())
            # Filter out doc comments (non-dict entries).
            attrs = {k for k in attrs if isinstance(d['attributes'][k], dict)}
            out[d['name']] = attrs
    return out


def load_shared_controls() -> set:
    """Extract control names from ContainerWrapperControls.js by pattern.
    Returns set of attribute names that have controls in the shared component."""
    if not SHARED_CONTROLS_JS.exists():
        return set()
    src = SHARED_CONTROLS_JS.read_text(encoding='utf-8')
    # Rough pattern: look for setAttributes calls writing attributes.
    # Example: setAttributes( { layout: value, gap: value2 } )
    # More robust: look for attribute prop names in control definitions.
    # Pattern: name="layout" or name: 'gap' in the component source.
    controls = set()
    # Detect control declarations: name="X" or name: 'X' or name: "X"
    for m in re.finditer(r'name\s*[=:]\s*["\']([a-zA-Z_][a-zA-Z0-9_]*)["\']', src):
        controls.add(m.group(1))
    return controls


def has_control_in_edit_js(block_dir: pathlib.Path, attr_name: str) -> bool:
    """Check if edit.js has a control for the given attribute.
    Looks for patterns like:
      - ContainerWrapperControls with kind="layout" (shared control)
      - setAttributes( { attr_name: ... } )
      - value={ attributes.attr_name }
      - name="attr_name"
    """
    edit_js = block_dir / 'edit.js'
    if not edit_js.exists():
        return False
    src = edit_js.read_text(encoding='utf-8')
    # Strip comments to avoid false positives from commented-out controls.
    src = strip_comments(src)

    # Pattern 0: ContainerWrapperControls with kind attribute (covers many attributes)
    # This matches controls registered by the shared container component.
    if re.search(r'ContainerWrapperControls\s+[\s\S]*?\bkind\s*=', src, re.MULTILINE):
        # Container controls provide layout, gap, maxWidth, contentWidth, etc. depending on kind.
        # For now, assume layout/gap/maxWidth/contentWidth are provided by any ContainerWrapperControls mount.
        if attr_name in {'layout', 'gap', 'maxWidth', 'contentWidth', 'alignContent', 'alignItems', 'justifyContent', 'justifyItems'}:
            return True

    # Pattern 1: setAttributes( { attr_name: ... } )
    if re.search(rf'setAttributes\s*\(\s*\{{[\s\S]*?\b{re.escape(attr_name)}\s*:', src):
        return True
    # Pattern 2: value={ attributes.attr_name } or value={ attributes['attr_name'] }
    if re.search(rf'attributes\s*[\.\[]' + re.escape(attr_name), src):
        return True
    # Pattern 3: name="attr_name" or name='attr_name' (control component).
    if re.search(rf'name\s*=\s*["\']' + re.escape(attr_name) + r'["\']', src):
        return True
    return False


def strip_comments(src: str) -> str:
    """Strip C/JS-style comments from source. Preserves string content."""
    # Remove // line comments
    src = re.sub(r'//.*?$', '', src, flags=re.MULTILINE)
    # Remove /* */ block comments
    src = re.sub(r'/\*[\s\S]*?\*/', '', src)
    return src


def strip_php_comments(src: str) -> str:
    """Strip PHP-style comments from PHP source."""
    # Remove // line comments
    src = re.sub(r'//.*?$', '', src, flags=re.MULTILINE)
    # Remove # line comments
    src = re.sub(r'#.*?$', '', src, flags=re.MULTILINE)
    # Remove /* */ block comments
    src = re.sub(r'/\*[\s\S]*?\*/', '', src)
    return src


def is_local_variable_fallback(line: str) -> bool:
    """Check if this line is a legitimate local-variable fallback, not an overwrite.
    A matched line has the form: $attributes['KEY'] = RHS;
    It is a fallback only if it's reading $attributes in the RHS with a default,
    but that never happens — if it matches our regex, the LHS IS $attributes[...],
    so it's always an overwrite. Return False always."""
    return False


def is_inside_conditional(render_php: str, match_pos: int) -> bool:
    """Check if the assignment at match_pos is inside an if/else/switch/for/while block.
    Returns True if conditional, False if top-level."""
    # Count unclosed braces before match_pos to see if we're inside a block.
    before = render_php[:match_pos]
    open_count = before.count('{') - before.count('}')
    # If we're inside ANY block, return True (conservative — may over-classify
    # some assignments as conditional if they're in a function body, but safer
    # than under-classifying).
    return open_count > 0


def find_attribute_assignments(render_php_path: pathlib.Path) -> list:
    """Scan render.php for $attributes['X'] = literal; assignments.
    Returns list of (line_num, attr_name, is_conditional, assignment_text)."""
    src = render_php_path.read_text(encoding='utf-8')

    findings = []
    # Pattern: $attributes['attrName'] = ...;
    pattern = r"\$attributes\[['\"]([a-zA-Z_][a-zA-Z0-9_]*)['\"]\]\s*=\s*([^;]+);"

    # Strip comments once for all matches, keeping track of position mapping isn't worth the complexity.
    # Instead, scan the original source but verify each match is not in a comment.
    for m in re.finditer(pattern, src):
        match_pos = m.start()
        line_num = src[:match_pos].count('\n') + 1
        attr_name = m.group(1)
        full_statement = m.group(0)

        # Simple check: if the line starts with //, it's commented
        line_start = src.rfind('\n', 0, match_pos) + 1
        line_end = src.find('\n', match_pos)
        if line_end == -1:
            line_end = len(src)
        line_text = src[line_start:line_end]
        # If this line has // before the match, it's commented
        if '//' in line_text:
            comment_pos = line_text.find('//')
            match_in_line = match_pos - line_start
            if comment_pos < match_in_line:
                continue

        # Skip if this is a local-variable fallback.
        if is_local_variable_fallback(full_statement):
            continue

        # For conditional detection: count braces in the original source up to this point.
        # Don't strip comments for this, as it changes positions.
        is_conditional = is_inside_conditional(src, match_pos)
        findings.append((line_num, attr_name, is_conditional, full_statement))

    return findings


def scan() -> list:
    """Scan all render.php files and cross-reference with block.json + edit.js.
    Returns list of (rel_path, line_num, block_name, attr_name, is_conditional)
    for genuine inert controls."""
    schemas = load_block_schemas()
    shared_controls = load_shared_controls()
    findings = []

    for render_php in sorted(BLOCKS_DIR.glob('*/render.php')):
        block_dir = render_php.parent
        block_name = 'sgs/' + block_dir.name

        if block_name not in schemas:
            continue

        declared_attrs = schemas[block_name]

        for line_num, attr_name, is_conditional, stmt in find_attribute_assignments(render_php):
            # Must be declared in block.json.
            if attr_name not in declared_attrs:
                continue

            # Must have a control somewhere (edit.js or shared).
            has_control = (has_control_in_edit_js(block_dir, attr_name) or
                          attr_name in shared_controls)
            if not has_control:
                continue

            # This is a genuine inert control.
            rel_path = render_php.relative_to(REPO).as_posix()
            findings.append((rel_path, line_num, block_name, attr_name, is_conditional))

    return findings


def main() -> int:
    check = '--check' in sys.argv
    findings = scan()

    if not findings:
        print('[inert-controls] OK — no attribute overwrites detected in render.php.')
        return 0

    unconditional = [f for f in findings if not f[4]]
    conditional = [f for f in findings if f[4]]

    print(f'[inert-controls] {len(findings)} INERT CONTROL(S) FOUND '
          f'({len(unconditional)} unconditional, {len(conditional)} conditional):\n')

    for rel_path, line_num, block_name, attr_name, is_conditional in findings:
        severity = 'UNCONDITIONAL (HIGH SEVERITY)' if not is_conditional else 'CONDITIONAL (MEDIUM)'
        print(f'  {rel_path}:{line_num}')
        print(f'      {block_name} -> "{attr_name}" is {severity}')
        print(f'      This attribute has a control (edit.js/shared), but render.php\n'
              f'      overwrites it with a hardcoded value. User edits are discarded.\n')

    print('Fix: either (a) remove the assignment and let the wrapper/template use the\n'
          'user value, or (b) remove the control if the attribute should never be\n'
          'user-editable. A visible-but-inert control erodes user trust in the editor.')

    if check:
        return 1
    return 0


def self_test() -> int:
    """Test the detection logic with synthetic fixtures.

    1. POSITIVE — strip_comments removes JS comments without breaking code.
    2. NEGATIVE — strip_php_comments removes PHP comments without breaking code.
    3. POSITIVE — is_inside_conditional detects conditional blocks.
    4. NEGATIVE — is_inside_conditional returns False for top-level code.
    """
    failures = []

    # Test 1: strip_comments (JS).
    js_with_comment = "// This is a comment\nlet x = 1;"
    stripped_js = strip_comments(js_with_comment)
    if '//' in stripped_js:
        failures.append('JS comment stripping failed: // comment was not removed.')

    # Test 2: strip_php_comments (PHP).
    php_with_comment = "// This is a comment\n$attributes['layout'] = 'grid';"
    stripped_php = strip_php_comments(php_with_comment)
    if '//' in stripped_php:
        failures.append('PHP comment stripping failed: // comment was not removed.')
    if '$attributes[' not in stripped_php:
        failures.append('PHP comment stripping failed: assignment was incorrectly removed.')

    # Test 3: is_inside_conditional (mustFlag — inside if block).
    conditional_src = r"if (true) { $attributes['x'] = 'y'; }"
    # Count braces: "if (true) { " = 1 open, 0 close = 1 > 0 = inside conditional
    pos = conditional_src.find("$attributes['x']")
    if not is_inside_conditional(conditional_src, pos):
        failures.append('Conditional detection failed: assignment inside if block was not detected as conditional.')

    # Test 4: is_inside_conditional (mustNotFlag — top-level).
    unconditional_src = r"$attributes['x'] = 'y';"
    if is_inside_conditional(unconditional_src, 0):
        failures.append('Conditional detection failed: top-level assignment was flagged as conditional.')

    # ── Tests 5-7: THE CORE MATCHER, end to end. ────────────────────────────
    #
    # ⛔ ADDED 2026-08-19 AFTER THIS SELF-TEST WAS PROVEN NOT LOAD-BEARING.
    # Tests 1-4 above exercise four HELPERS in isolation and never call
    # find_attribute_assignments(), so the pattern that does the actual
    # detecting had no coverage at all. Proven by copying this script, breaking
    # `pattern = r"\$attributes\[...` so it could never match, and running
    # --self-test: it PASSED. A detector that passes while detecting nothing is
    # indistinguishable from a clean tree — the exact shape of the backspace-byte
    # incident recorded in the C1 handover, where 0x08 replaced `\b` and a rule
    # went silently dead. Re-prove with:
    #   python scripts/prove-selftest-can-fail.py scripts/check-inert-controls.py \
    #       'pattern = r"\$attributes\[' 'pattern = r"\$attributesNOMATCH\['
    import tempfile

    def _scan_fixture(php_src):
        fd, tmp = tempfile.mkstemp(suffix='.php')
        os.close(fd)
        try:
            pathlib.Path(tmp).write_text(php_src, encoding='utf-8')
            return find_attribute_assignments(pathlib.Path(tmp))
        finally:
            os.unlink(tmp)

    # 5. mustFlag — the real feature-grid shape (conditional overwrite).
    hits = _scan_fixture(
        "<?php\nif ( $has_explicit_grid ) {\n"
        "\t$attributes['layout'] = 'grid';\n}\n")
    if not any(a == 'layout' for _, a, _, _ in hits):
        failures.append(
            'CORE MATCHER: a real $attributes[...] = literal; assignment was NOT '
            'found. The detector is not detecting.')

    # 6. mustNotFlag — a local-variable fallback is not an overwrite.
    hits = _scan_fixture(
        "<?php\n$mode = $attributes['mode'] ?? 'default';\n$mode = 'video';\n")
    if hits:
        failures.append(
            'CORE MATCHER: a local-variable fallback was flagged as an '
            'attribute overwrite (%r).' % [a for _, a, _, _ in hits])

    # 7. mustNotFlag — a commented-out assignment is not an assignment.
    hits = _scan_fixture(
        "<?php\n// $attributes['layout'] = 'grid';\n")
    if hits:
        failures.append(
            'CORE MATCHER: a COMMENTED-OUT assignment was flagged (%r).'
            % [a for _, a, _, _ in hits])

    if failures:
        print('[inert-controls --self-test] FAILED:\n')
        for f in failures:
            print(f'  - {f}')
        return 1

    print('[inert-controls --self-test] OK — all test cases passed (7 controls, '
          '3 of them end-to-end over the real matcher).')
    return 0


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        sys.exit(self_test())
    sys.exit(main())
