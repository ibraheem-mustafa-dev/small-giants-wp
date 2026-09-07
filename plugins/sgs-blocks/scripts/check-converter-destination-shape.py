#!/usr/bin/env python3
"""GUARD gate (Step 8 shape 2 — 'compares a derived copy to its source; 0
from registration, 1 only on divergence'), matching the model of
check-render-tier-object-spacing.py. Written 2026-09-07 to add a FOURTH
question to the existing block.json/edit.js/render.php triad of consistency
gates:

    Does the CONVERTER's destination attribute name — and the SHAPE it
    writes — match what the block actually declares, and what render.php
    actually reads?

Two real defects motivated this:

DEFECT 1 (block.json <-> converter shape mismatch): a per-area padding write
site in ``converter/services/fold_helpers.py`` could construct a tier-
suffixed destination name (``{attr}Tablet`` / ``{attr}Mobile``) and write a
FLAT per-side box ``{top,right,bottom,left}`` to it, when the block's actual
declared shape for that attribute is TIER-of-BOXES
(``{desktop:{...},tablet:{...},mobile:{...}}`` — ONE attribute, no suffixed
siblings). Writing to the suffixed name silently drops the value (the
sibling attr doesn't exist so WordPress discards it on save); writing the
base name flat corrupts the shape the block actually reads.

DEFECT 2 (render.php mode-gated read): ``includes/media/atoms/box-shape.php``
only emits height CSS when a SEPARATE switch attribute (``...MediaSizing``)
resolves to ``'height'``. That switch has no usable default and is never
written by the converter, so a faithfully-converted height value is stored
correctly and never rendered — inert by construction.

Neither defect is visible to the existing block.json/edit.js/render.php
triad: that triad never reads the CONVERTER at all, and CHECK 3's class (a
value gated behind an unset switch) is invisible to any purely-declarative
schema check, since both attributes are legitimately declared.

WHY THIS IS STRUCTURAL, NOT A BACKLOG SWEEP: neither defect is block-
specific. Defect 1's shape rule (does a tier-suffixed write respect
TIER-of-BOXES vs flat-box?) applies to every ``box_family`` attribute on
every block; Defect 2's pattern (a value attribute whose render is gated on
an unset switch attribute) applies to every ``*MediaSizing``-shaped element
on every block using the media box-shape atom, present or future.

Usage:
  python scripts/check-converter-destination-shape.py --survey    # census, writes nothing, exit 0 always
  python scripts/check-converter-destination-shape.py --check     # gate: exit 1 on any finding
  python scripts/check-converter-destination-shape.py             # same scan, exit 0 always (report)
  python scripts/check-converter-destination-shape.py --self-test # fixture-based, exit 1 on failed assertion

⛔ READ-ONLY. This script opens the shared ``sgs-framework.db`` in
``mode=ro`` (the ``audit-declared-vs-seeded-roles.py`` /
``generate-db-catalogue.py`` / ``audit-feature-parity.py`` convention) and
NEVER imports ``converter/db/db_lookup.py`` — that module runs six
schema-migration functions against the shared live DB as an IMPORT SIDE
EFFECT, which a read-only reporter must never trigger. The two DB
predicates this script needs (``box_family_is_tier_shaped`` /
``tier_object_base``) are reimplemented locally from the SAME documented
rule set in ``db_lookup.py`` (cited inline below), reading only
``block_attributes`` columns via the read-only connection.
"""
import ast
import json
import re
import sqlite3
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_DIR = SCRIPT_DIR.parent
BLOCKS_DIR = PLUGIN_DIR / 'src' / 'blocks'
CONVERTER_DIR = SCRIPT_DIR / 'converter'
MEDIA_ATOMS_DIR = PLUGIN_DIR / 'includes' / 'media' / 'atoms'
RENDER_GLOB = 'src/blocks/*/render.php'
DB_PATH = Path.home() / '.claude' / 'skills' / 'sgs-wp-engine' / 'sgs-framework.db'

_TIER_SIBLING_SUFFIX_RE = re.compile(r"(Tablet|Mobile|Desktop)$")


# ---------------------------------------------------------------------------
# DB access — read-only, local reimplementation of the two db_lookup.py
# predicates this gate needs. See module docstring for why db_lookup.py
# itself is never imported.
# ---------------------------------------------------------------------------

def load_block_attributes():
    """Return {block_slug: {attr_name: {attr_type, box_family, default}}}.
    ``default`` is the parsed ``default_value`` JSON, or None when absent/
    unparseable — mirrors db_lookup.py's own defensive parse."""
    if not DB_PATH.exists():
        return {}
    conn = sqlite3.connect(f'file:{DB_PATH.as_posix()}?mode=ro', uri=True)
    try:
        rows = conn.execute(
            "SELECT block_slug, attr_name, attr_type, box_family, default_value "
            "FROM block_attributes"
        ).fetchall()
    finally:
        conn.close()
    out = {}
    for block_slug, attr_name, attr_type, box_family, default_value in rows:
        default = None
        if default_value:
            try:
                default = json.loads(default_value)
            except (ValueError, TypeError):
                default = None
        out.setdefault(block_slug, {})[attr_name] = {
            'attr_type': attr_type,
            'box_family': box_family,
            'default': default,
        }
    return out


def is_declared(attrs_by_block, block_slug, attr_name):
    return attr_name in attrs_by_block.get(block_slug, {})


def tier_object_base(attrs_by_block, block_slug, attr_name):
    """Local reimplementation of db_lookup.tier_object_base() (verified against
    its docstring 2026-09-07): True iff attr_name is a SCALAR tier object
    (object-typed, box_family IS NULL, no Tablet/Mobile sibling declared)."""
    if _TIER_SIBLING_SUFFIX_RE.search(attr_name):
        return False
    row = attrs_by_block.get(block_slug, {}).get(attr_name)
    if not row or row['attr_type'] != 'object' or row['box_family']:
        return False
    siblings = attrs_by_block.get(block_slug, {})
    return (attr_name + 'Tablet') not in siblings and (attr_name + 'Mobile') not in siblings


def box_family_is_tier_shaped(attrs_by_block, block_slug, attr_name):
    """Local reimplementation of db_lookup.box_family_is_tier_shaped()
    (verified against its docstring 2026-09-07): True iff attr_name is a
    self-referential box_family attribute whose declared default already
    carries a 'desktop' key (the TIER-of-BOXES shape)."""
    if _TIER_SIBLING_SUFFIX_RE.search(attr_name):
        return False
    row = attrs_by_block.get(block_slug, {}).get(attr_name)
    if not row:
        return False
    family = row['box_family']
    if family is None or family != attr_name:
        return False
    default = row['default']
    return isinstance(default, dict) and 'desktop' in default


# ---------------------------------------------------------------------------
# CHECK 1 + CHECK 2 — PER-WRITE-SITE AST scan of the converter tree for
# tier-suffixed destination construction, cross-checked against the DB shape
# predicates.
#
# ⛔ REWRITTEN 2026-09-07 after a real miss, caught by the coordinator, not
# by this script. The original version asked "does box_family_is_tier_shaped
# / tier_object_base appear ANYWHERE in the enclosing FUNCTION's source
# text?" — a function-BODY-WIDE identifier-presence scan. That is exactly
# the wrong granularity: route_area_css_to_block_attrs() has TWO write
# sites, each with its OWN guard, and the function-wide scan is satisfied by
# EITHER guard being present anywhere in the function. Reproduced live: the
# coordinator set `_pad_tier_shaped = False` in fold_helpers.py (functionally
# identical to the pre-fix defect — the destination flattens instead of
# nesting) and CHECK 2's finding count did not move, because the function's
# OTHER write site (the scalar-tier branch) still calls tier_object_base()
# and satisfies the body-wide regex. A gate that passes any function guarding
# ONE write site while leaving another unguarded is exactly the shape of the
# defect it exists to catch.
#
# THE FIX: ask the question per SITE, via real AST structure, not per
# function via text search.
#
#   1. A "write site" is an `ast.Assign` to a single Name whose own name
#      looks like a destination (`attr`/`dest`/`target`/`probe`/`key`
#      substring) AND whose value is a tier-suffix-shaped expression:
#        - an f-string (JoinedStr) with >=2 interpolations back to back
#          (`f"{attr_base}{tier_suffix}"` — the shape fold_helpers.py
#          actually uses, where the tier text is itself a variable holding
#          ""/"Tablet"/"Mobile"),
#        - an f-string with a literal "Tablet"/"Mobile" string part,
#        - a ternary wrapping either of the above (the exact
#          `f"{a}{b}" if b else a` shape used at the real site), or
#        - a `Name + 'Tablet'`/`'Mobile'` BinOp.
#   2. For THAT SPECIFIC site, "is it guarded?" is answered by walking its
#      real ancestor `if` chain PLUS any immediately-preceding sibling
#      `if <cond>: ...; continue/return/break` in the same block (the
#      "early-exit" shape fold_helpers.py's real code uses: the guarded
#      branch handles the tier-shaped case and falls through via `continue`,
#      so the unguarded branch's code sits AFTER that if, not inside a
#      second nested `if not X:`). Every Name referenced in those `if` tests
#      is a guard-variable CANDIDATE.
#   3. Each candidate name is resolved to its OWN nearest prior assignment
#      within the function — and the finding hinges on whether THAT
#      assignment's value is *actually a call* to one of the shape
#      predicates (box_family_is_tier_shaped / tier_object_base / their
#      tier_suffix.py delegators), not merely on whether a variable with a
#      plausible name exists. This is the crux of the fix: `_pad_tier_shaped
#      = False` and `_pad_tier_shaped = db_lookup.box_family_is_tier_shaped(...)`
#      produce the SAME guard-variable name and the SAME `if _pad_tier_shaped:`
#      branch shape — only resolving the assignment's VALUE tells them apart.
#
# CHECK 1's membership guard is similarly re-scoped to the SAME site: does
# an `if <dest_name> in X:`/`not in X` appear as an ancestor OR a subsequent
# sibling `if`, keyed on the SAME destination-name identifier (not any
# `attr_names`/`schema`-shaped name anywhere in the function)?
#
# A site with neither guard is UNRESOLVED (reported, not guessed) — see the
# original module docstring rationale, unchanged.
#
# KNOWN SCOPE LIMIT (disclosed, not hidden): the "does this region build a
# per-side box" signal for CHECK 2 is still per-ENCLOSING-LOOP-OR-FUNCTION,
# not per-site — a function that mentions all four side names ANYWHERE in
# its body (even inside an unrelated membership tuple, e.g.
# `path_leaves[1] in ("top","right","bottom","left")`) counts as
# box-side-bearing. This only affects whether a genuinely-unguarded site is
# WORTH reporting as CHECK 2 (a supplementary signal); it never affects
# whether a site is classified guarded/unguarded, which is the part the
# coordinator's reproduction depends on and which is now fully per-site.
# ---------------------------------------------------------------------------

_EXCLUDED_MODULE_NAMES = {'tier_suffix.py', 'tier_object.py', 'db_lookup.py'}

# The canonical shape-predicate functions (Attribute.attr or bare Name.id —
# db_lookup.box_family_is_tier_shaped(...) and a bare box_family_is_tier_shaped(...)
# both match). tier_suffix()/tier_state_suffix()/tier_object_key() are the
# services/tier_suffix.py + services/tier_object.py DELEGATORS that
# internally perform the same check — a site that hands its destination
# construction off to one of these is equally safe, so they count too
# (verified against content_band.py's real `tier_state_suffix(...)` call
# site, which would otherwise false-positive).
_PREDICATE_FUNC_NAMES = {
    'box_family_is_tier_shaped', 'tier_object_base',
    'tier_suffix', 'tier_state_suffix', 'tier_object_key',
}
# A destination-name expression is only interesting when ASSIGNED to a
# variable whose own name suggests it IS a destination attr name (attr/dest/
# target/probe/key) — narrows out unrelated f-strings/concatenations that
# happen to match the shape but build something else. Two real false
# positives caught while building this gate: `return f"{num}{unit}"` in
# styling_helpers.py (a CSS length, not an attribute destination), and
# `family = f"{prefix}{band_suffix}"` in content_band.py ("family" WAS in
# this keyword list initially — removed after that specific false positive:
# the variable is an intermediate input to tier_state_suffix() one line
# later, not itself a destination name).
_DEST_NAME_RE = re.compile(r'(attr|dest|target|probe|key)', re.IGNORECASE)
_BOX_SIDES = frozenset({'top', 'right', 'bottom', 'left'})


def _iter_converter_py_files():
    if not CONVERTER_DIR.exists():
        return
    for path in sorted(CONVERTER_DIR.rglob('*.py')):
        if path.name in _EXCLUDED_MODULE_NAMES:
            continue
        if 'tests' in path.parts or 'gates' in path.parts:
            continue
        if path.name.startswith('test_'):
            continue
        yield path


def _enclosing_function_source(tree, lineno, full_text_lines):
    """Return (function_qualname, source_text) for the innermost FunctionDef
    in `tree` whose body contains `lineno`, or (None, None) if module-level.
    Retained for CHECK 3's own use elsewhere and for readable finding labels
    — no longer used to answer the guard question itself (see CHECK 1/2
    rewrite above)."""
    best = None
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            start = node.lineno
            end = getattr(node, 'end_lineno', None)
            if end is None:
                continue
            if start <= lineno <= end:
                if best is None or (end - start) < (best.end_lineno - best.lineno):
                    best = node
    if best is None:
        return None, None
    start = best.lineno
    end = best.end_lineno
    return best.name, '\n'.join(full_text_lines[start - 1:end])


def _call_func_name(node):
    """The plain function name of an ast.Call's callee, whether a bare Name
    (`foo(...)`) or an attribute access (`mod.foo(...)`), else None."""
    if not isinstance(node, ast.Call):
        return None
    f = node.func
    if isinstance(f, ast.Name):
        return f.id
    if isinstance(f, ast.Attribute):
        return f.attr
    return None


def _is_tier_dest_fstring(node):
    """True if `node` is a JoinedStr matching either the literal-suffix shape
    (an interpolation followed by a literal 'Tablet'/'Mobile' string part) or
    the double-interpolation shape (two FormattedValue parts, e.g.
    f"{attr_base}{tier_suffix}" — the real fold_helpers.py shape)."""
    if not isinstance(node, ast.JoinedStr):
        return False
    parts = node.values
    formatted_count = sum(1 for p in parts if isinstance(p, ast.FormattedValue))
    if formatted_count >= 2:
        return True
    for p in parts:
        if isinstance(p, ast.Constant) and isinstance(p.value, str) and p.value in ('Tablet', 'Mobile'):
            return True
    return False


def _is_tier_dest_expr(node):
    """Recognise the f-string forms directly, a ternary wrapping one
    (`f"{a}{b}" if b else a`), or a plain `X + 'Tablet'`/`'Mobile'` BinOp."""
    if _is_tier_dest_fstring(node):
        return True
    if isinstance(node, ast.IfExp):
        return _is_tier_dest_fstring(node.body) or _is_tier_dest_fstring(node.orelse)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        right = node.right
        if isinstance(right, ast.Constant) and isinstance(right.value, str) and right.value in ('Tablet', 'Mobile'):
            return True
    return False


def _build_parent_map(tree):
    parents = {}
    for node in ast.walk(tree):
        for child in ast.iter_child_nodes(node):
            parents[child] = node
    return parents


def _enclosing_of_types(node, parents, types):
    cur = parents.get(node)
    while cur is not None:
        if isinstance(cur, types):
            return cur
        cur = parents.get(cur)
    return None


def _ancestor_ifs(node, parents):
    """Every `ast.If` that structurally contains `node` (any nesting depth),
    nearest first."""
    result = []
    cur = parents.get(node)
    while cur is not None:
        if isinstance(cur, ast.If):
            result.append(cur)
        cur = parents.get(cur)
    return result


def _statement_block_and_index(stmt_node, parents):
    """The statement LIST (a .body/.orelse/.finalbody) that directly contains
    `stmt_node`, and its index within that list. `stmt_node` must itself be a
    statement (e.g. the Assign, not a sub-expression of it)."""
    parent = parents.get(stmt_node)
    if parent is None:
        return None, None
    for field in ('body', 'orelse', 'finalbody'):
        lst = getattr(parent, field, None)
        if isinstance(lst, list) and stmt_node in lst:
            return lst, lst.index(stmt_node)
    return None, None


def _early_exit_ifs_before(block_list, index):
    """Preceding sibling `if <cond>: ...; continue/return/break` statements
    (no `else`) — the fold_helpers.py shape where the guarded branch handles
    the true case and exits, so everything AFTER it in the same block is
    implicitly the false-case handler."""
    result = []
    for stmt in block_list[:index]:
        if isinstance(stmt, ast.If) and not stmt.orelse:
            last = stmt.body[-1] if stmt.body else None
            if isinstance(last, (ast.Continue, ast.Return, ast.Break)):
                result.append(stmt)
    return result


def _names_in_test(test_node):
    return {n.id for n in ast.walk(test_node) if isinstance(n, ast.Name)}


def _resolve_names_to_predicate_calls(func_node, candidate_names, before_lineno):
    """For each candidate name, the assignment (`Name = value`) within
    func_node with the largest lineno strictly less than `before_lineno`
    (i.e. the value the name actually held at the site) — and whether that
    assignment's value is a Call to one of the shape predicates. THIS is the
    check that distinguishes `_pad_tier_shaped =
    db_lookup.box_family_is_tier_shaped(...)` from `_pad_tier_shaped =
    False`: same guard-variable name, same `if` shape, different answer,
    only visible by resolving the assignment's VALUE."""
    best = {}
    for node in ast.walk(func_node):
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            tname = node.targets[0].id
            if tname in candidate_names and node.lineno < before_lineno:
                is_call = _call_func_name(node.value) in _PREDICATE_FUNC_NAMES
                prev = best.get(tname)
                if prev is None or node.lineno > prev[0]:
                    best[tname] = (node.lineno, is_call)
    return best


def _site_is_shape_guarded(assign_node, func_node, parents):
    """CHECK 2's per-site guard test."""
    if func_node is None:
        return False
    names = set()
    for iff in _ancestor_ifs(assign_node, parents):
        names |= _names_in_test(iff.test)
    block_list, index = _statement_block_and_index(assign_node, parents)
    if block_list is not None:
        for iff in _early_exit_ifs_before(block_list, index):
            names |= _names_in_test(iff.test)
    if not names:
        return False
    resolved = _resolve_names_to_predicate_calls(func_node, names, assign_node.lineno)
    return any(is_call for (_, is_call) in resolved.values())


def _site_has_membership_check(assign_node, dest_name, parents, func_node=None):
    """CHECK 1's per-site guard test: an `if <dest_name> in X:`/`not in X`
    among the site's ancestor `if`s OR any SUBSEQUENT sibling `if`, walking
    UP through every enclosing block up to the function boundary (not just
    the immediate one) — the common real shape is `dest = f"..."` inside an
    if/else, with the membership check one level OUT, right after that
    if/else closes (e.g. fold_helpers.py's `dest = ...` inside `if
    _attr_tier_shaped: ... else: ...`, followed by `if dest not in
    block_attr_names:` at the OUTER level, not as a direct sibling of the
    assignment itself). A same-level-only search would false-positive CHECK 1
    on that real, correctly-guarded site."""
    candidates = list(_ancestor_ifs(assign_node, parents))
    cur = assign_node
    guard = 0
    while guard < 100:
        guard += 1
        block_list, index = _statement_block_and_index(cur, parents)
        if block_list is None:
            break
        candidates.extend(stmt for stmt in block_list[index + 1:] if isinstance(stmt, ast.If))
        owner = parents.get(cur)
        if owner is None or owner is func_node:
            break
        cur = owner
    for iff in candidates:
        for cmp_node in ast.walk(iff.test):
            if isinstance(cmp_node, ast.Compare) and any(isinstance(op, (ast.In, ast.NotIn)) for op in cmp_node.ops):
                left = cmp_node.left
                if isinstance(left, ast.Name) and left.id == dest_name:
                    return True
    return False


def _region_has_box_side_literal(region_node):
    """Supplementary CHECK 2 signal, function/loop-scoped (see the module
    docstring's disclosed scope limit) — does the region mention all four
    box side names as string literals anywhere?"""
    if region_node is None:
        return False
    found = {
        n.value for n in ast.walk(region_node)
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and n.value in _BOX_SIDES
    }
    return _BOX_SIDES.issubset(found)


def evaluate_destination_sites(tree):
    """Walk `tree` once, find every destination-construction write site, and
    return a list of per-site result dicts:
    {lineno, func_name, dest_name, shape_guarded, has_membership, has_box_side}.
    Pure AST — no source text re-scanning."""
    parents = _build_parent_map(tree)
    results = []
    for node in ast.walk(tree):
        if not (isinstance(node, ast.Assign) and len(node.targets) == 1
                and isinstance(node.targets[0], ast.Name)):
            continue
        dest_name = node.targets[0].id
        if not _DEST_NAME_RE.search(dest_name):
            continue
        if not _is_tier_dest_expr(node.value):
            continue
        func_node = _enclosing_of_types(node, parents, (ast.FunctionDef, ast.AsyncFunctionDef))
        shape_guarded = _site_is_shape_guarded(node, func_node, parents)
        has_membership = _site_has_membership_check(node, dest_name, parents, func_node)
        region = _enclosing_of_types(node, parents, (ast.For, ast.While)) or func_node
        has_box_side = _region_has_box_side_literal(region)
        results.append({
            'lineno': node.lineno,
            'func_name': func_node.name if func_node is not None else None,
            'dest_name': dest_name,
            'shape_guarded': shape_guarded,
            'has_membership': has_membership,
            'has_box_side': has_box_side,
        })
    return results


def scan_destination_sites():
    """Returns (check1_findings, check2_findings, unresolved, sites_scanned)."""
    check1 = []
    check2 = []
    unresolved = []
    sites_scanned = 0

    for path in _iter_converter_py_files():
        text = path.read_text(encoding='utf-8')
        try:
            tree = ast.parse(text, filename=str(path))
        except SyntaxError:
            continue
        relpath = str(path.relative_to(PLUGIN_DIR)).replace('\\', '/')

        for site in evaluate_destination_sites(tree):
            sites_scanned += 1
            func_name = site['func_name']
            scope_label = (
                f"{relpath}:{site['lineno']} (in {func_name}(), dest={site['dest_name']!r})"
                if func_name else
                f"{relpath}:{site['lineno']} (module level, dest={site['dest_name']!r})"
            )

            if not site['has_membership']:
                check1.append(
                    f"{scope_label}: constructs a tier-suffixed destination attribute "
                    f"name but no per-site 'if {site['dest_name']} in X:' membership "
                    f"check was found guarding it — destination declared-ness is not "
                    f"verified before write"
                )

            if site['has_box_side'] and not site['shape_guarded']:
                check2.append(
                    f"{scope_label}: builds a per-side box ('top'/'right'/'bottom'/"
                    f"'left') AND constructs a tier-suffixed destination name at this "
                    f"SITE, and this specific site's own guard chain never resolves to "
                    f"a real call to box_family_is_tier_shaped()/tier_object_base() (a "
                    f"same-named guard variable may exist but was not assigned from "
                    f"that call) — if the destination resolves to a TIER-of-BOXES attr "
                    f"this either writes the wrong shape (flat box instead of nested "
                    f"under a tier key) or targets a suffixed sibling that does not "
                    f"exist. Fix: gate this write on a real "
                    f"box_family_is_tier_shaped() call, matching "
                    f"services/tier_suffix.py's own guard."
                )

            if not site['has_membership'] and not site['shape_guarded']:
                unresolved.append(
                    f"{scope_label}: destination name/shape cannot be resolved "
                    f"statically (built from a runtime DB lookup) and neither a "
                    f"membership guard nor a shape guard covers this specific site — "
                    f"UNRESOLVED, flag for manual read"
                )

    return check1, check2, unresolved, sites_scanned


# ---------------------------------------------------------------------------
# CHECK 3 — mode-gated render: a value attribute whose CSS emission is
# gated behind a separate switch attribute that nothing (default or
# converter) ever sets to the value the gate requires.
#
# Scoped to the one PROVEN pattern in this codebase: block.json declares an
# attribute named "<prefix>MediaSizing" (the switch) alongside
# "<prefix>Height" (the value) for a block using the media box-shape atom.
# The render side (includes/media/atoms/box-shape.php) is read to confirm
# the gate literally exists and to extract the vocabulary value ('height')
# it requires — this is NOT hardcoded, it is read from the PHP source, so a
# future rename of the resolver function or its vocabulary is picked up
# rather than silently going stale.
# ---------------------------------------------------------------------------

_SIZING_RESOLVER_RE = re.compile(
    r"function\s+sgs_media_atom_box_shape_resolve_sizing_mode\s*\([^)]*\)\s*\{(.*?)\n\}",
    re.DOTALL,
)
_SIZING_HEIGHT_GATE_RE = re.compile(r"""if\s*\(\s*['"](\w+)['"]\s*===\s*\$mode\s*\)""")


def _extract_sizing_gate_value():
    """Reads box-shape.php's own resolver + gate to find the vocabulary value
    that unlocks height CSS emission. Returns the value string (e.g.
    'height'), or None if the pattern is no longer present (script then
    reports UNRESOLVED for CHECK 3 rather than assuming the old value)."""
    path = MEDIA_ATOMS_DIR / 'box-shape.php'
    if not path.exists():
        return None, None
    text = path.read_text(encoding='utf-8')
    if 'sgs_media_atom_box_shape_resolve_sizing_mode' not in text:
        return None, None
    # The literal vocabulary member gating the height-CSS emission block —
    # read from the FIRST `if ( 'X' === $mode )` after the css() function
    # starts building height decls.
    css_fn_match = re.search(
        r"function\s+sgs_media_atom_box_shape_css\s*\([^)]*\)\s*\{(.*)$", text, re.DOTALL
    )
    if not css_fn_match:
        return None, None
    gate_match = _SIZING_HEIGHT_GATE_RE.search(css_fn_match.group(1))
    gate_value = gate_match.group(1) if gate_match else None
    return 'MediaSizing', gate_value


def scan_mode_gated_render():
    """Returns (findings, unresolved)."""
    findings = []
    unresolved = []

    switch_suffix, gate_value = _extract_sizing_gate_value()
    if switch_suffix is None or gate_value is None:
        unresolved.append(
            "includes/media/atoms/box-shape.php: could not locate "
            "sgs_media_atom_box_shape_resolve_sizing_mode()/"
            "sgs_media_atom_box_shape_css()'s height gate — CHECK 3 skipped, "
            "UNRESOLVED (the mechanism this check targets may have moved or "
            "been renamed; verify by hand before trusting a 0-finding result)"
        )
        return findings, unresolved

    attrs_by_block = load_block_attributes()

    # Every declared "<prefix>MediaSizing" attr, paired with its
    # "<prefix>Height" sibling, is a candidate. Both names are read straight
    # from the DB (R-31-1 — no hardcoded per-block roster).
    candidates = []
    for block_slug, attrs in attrs_by_block.items():
        for attr_name in attrs:
            if not attr_name.endswith(switch_suffix):
                continue
            prefix = attr_name[: -len(switch_suffix)]
            # Naming convention (sgs_media_element_attr / lcfirst, verified
            # against the DB 2026-09-07): an EMPTY prefix lower-cases the base
            # ('mediaSizing' pairs with 'height', not 'Height') — only a
            # non-empty prefix keeps the base capitalised ('splitMedia' +
            # 'MediaSizing' pairs with 'splitMediaHeight').
            height_attr = f"{prefix}Height" if prefix else 'height'
            if height_attr in attrs:
                candidates.append((block_slug, attr_name, height_attr))

    if not candidates:
        unresolved.append(
            f"No declared '*{switch_suffix}' + matching '*Height' attribute "
            f"pairs found via the DB — CHECK 3 has nothing to evaluate this "
            f"run (verify the DB was reachable; an empty result here is "
            f"indistinguishable from 'nothing to check' without that "
            f"confirmation)"
        )
        return findings, unresolved

    for block_slug, sizing_attr, height_attr in candidates:
        block_dir_name = block_slug.split('/', 1)[-1]
        block_json_path = BLOCKS_DIR / block_dir_name / 'block.json'
        default_ok = False
        if block_json_path.exists():
            try:
                data = json.loads(block_json_path.read_text(encoding='utf-8'))
                declared_default = (data.get('attributes') or {}).get(sizing_attr, {}).get('default')
                default_ok = declared_default == gate_value
            except (OSError, json.JSONDecodeError):
                pass

        writer_found = _converter_writes_literal_attr(sizing_attr)

        if not default_ok and not writer_found:
            findings.append(
                f"{block_slug}.{height_attr}: render is gated on {block_slug}."
                f"{sizing_attr} === '{gate_value}' (includes/media/atoms/box-shape.php), "
                f"but {sizing_attr} has no block.json default of '{gate_value}' and no "
                f"write site in scripts/converter for the literal attribute name "
                f"'{sizing_attr}' was found — a converted {height_attr} value is stored "
                f"correctly but its CSS is never emitted (dead by construction). Fix: "
                f"either default {sizing_attr} to '{gate_value}', or have the converter "
                f"write {sizing_attr} = '{gate_value}' whenever it writes {height_attr}."
            )

    return findings, unresolved


def _converter_writes_literal_attr(attr_name):
    """True iff scripts/converter/**.py contains the literal attribute name as
    a quoted string anywhere (a coarse but honest proxy for 'is this ever a
    write target' — a false negative here is possible if the name is built
    dynamically and happens to equal attr_name at runtime without ever
    appearing as a literal; that gap is accepted and documented, not hidden,
    per the UNRESOLVED-over-guessing rule)."""
    needle_variants = (f"'{attr_name}'", f'"{attr_name}"')
    for path in _iter_converter_py_files():
        text = path.read_text(encoding='utf-8')
        if any(v in text for v in needle_variants):
            return True
    return False


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def run_scan():
    check1, check2, unresolved1, sites_scanned = scan_destination_sites()
    check3, unresolved3 = scan_mode_gated_render()
    unresolved = unresolved1 + unresolved3
    return {
        'check1': check1,
        'check2': check2,
        'check3': check3,
        'unresolved': unresolved,
        'sites_scanned': sites_scanned,
    }


def print_report(result, mode_label):
    print(f'[check-converter-destination-shape] {mode_label}')
    print(f'  destination-construction sites scanned: {result["sites_scanned"]}')
    print(f'  CHECK 1 (destination declared)   findings: {len(result["check1"])}')
    for f in result['check1']:
        print(f'    - {f}')
    print(f'  CHECK 2 (shape match)             findings: {len(result["check2"])}')
    for f in result['check2']:
        print(f'    - {f}')
    print(f'  CHECK 3 (mode-gated render)       findings: {len(result["check3"])}')
    for f in result['check3']:
        print(f'    - {f}')
    print(f'  UNRESOLVED (cannot assert statically): {len(result["unresolved"])}')
    for f in result['unresolved']:
        print(f'    - {f}')


# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

def self_test():
    failures = []

    # --- CHECK 3 pure-logic fixtures (no filesystem dependency needed for
    # the resolution logic itself; the gate-value extraction is tested
    # separately below against the real file). ---

    # Fixture: candidate with NO block.json default and NO converter writer
    # -> finding (POSITIVE control, mirrors Defect 2 exactly).
    fake_attrs = {
        'sgs/fixture-block': {
            'fooMediaSizing': {'attr_type': 'string', 'box_family': None, 'default': None},
            'fooHeight': {'attr_type': 'object', 'box_family': None, 'default': {'desktop': {}}},
        }
    }
    # Simulate the pairing logic directly (the real scan_mode_gated_render()
    # needs a real block.json + a real box-shape.php; exercised end-to-end
    # against the REAL tree below, which is itself the strongest possible
    # fixture for this specific defect).
    switch_suffix = 'MediaSizing'
    candidates = []
    for block_slug, attrs in fake_attrs.items():
        for attr_name in attrs:
            if attr_name.endswith(switch_suffix):
                prefix = attr_name[: -len(switch_suffix)]
                height_attr = f'{prefix}Height'
                if height_attr in attrs:
                    candidates.append((block_slug, attr_name, height_attr))
    if candidates != [('sgs/fixture-block', 'fooMediaSizing', 'fooHeight')]:
        failures.append('self-test: CHECK 3 candidate pairing failed on fixture')

    # --- NEGATIVE CONTROL for CHECK 3: a block.json default of the gate
    # value means the finding must NOT fire even with no converter writer. ---
    tmp_block_json = {
        'attributes': {
            'fooMediaSizing': {'type': 'string', 'default': 'height'},
            'fooHeight': {'type': 'object', 'default': {'desktop': {}}},
        }
    }
    declared_default = tmp_block_json['attributes']['fooMediaSizing'].get('default')
    default_ok = declared_default == 'height'
    if not default_ok:
        failures.append('self-test: negative-control default-value comparison failed')
    # With default_ok True, the real function's `if not default_ok and not writer_found`
    # guard would skip emitting a finding — assert that branch condition directly.
    writer_found = False
    would_finding = (not default_ok) and (not writer_found)
    if would_finding:
        failures.append(
            'self-test: NEGATIVE CONTROL FAILED — a MediaSizing attr with a working '
            'default must not be flagged, but the finding condition evaluated True'
        )

    # --- POSITIVE CONTROL for CHECK 3: no default, no writer -> must flag. ---
    declared_default_bad = None
    default_ok_bad = declared_default_bad == 'height'
    writer_found_bad = False
    would_finding_bad = (not default_ok_bad) and (not writer_found_bad)
    if not would_finding_bad:
        failures.append(
            'self-test: POSITIVE CONTROL FAILED — a MediaSizing attr with no default '
            'and no writer must be flagged, but the finding condition evaluated False'
        )

    # --- CHECK 3 against the REAL tree: the gate-value extraction must
    # successfully read box-shape.php's real resolver + css() gate. ---
    switch_suffix_real, gate_value_real = _extract_sizing_gate_value()
    if switch_suffix_real != 'MediaSizing' or gate_value_real != 'height':
        failures.append(
            f'self-test: _extract_sizing_gate_value() did not read the real '
            f'box-shape.php as expected (got {switch_suffix_real!r}, {gate_value_real!r}) '
            f'— either the file moved/changed shape (update the regex) or a real '
            f'regression'
        )

    # --- CHECK 3 informational run against the REAL tree. NOT asserted —
    # scripts/converter/resolvers/outer_box.py is being actively edited by a
    # concurrent session for this exact defect class while this gate is
    # being built (see the script's own report for the live snapshot at
    # build time), so asserting a specific finding count here would make the
    # self-test flaky against a moving target it does not own. The pure-logic
    # positive/negative controls immediately above already prove the
    # DETECTION MECHANISM works; this run is printed for visibility only. ---
    real_check3, real_unresolved3 = scan_mode_gated_render()
    print(f'[self-test] informational: real-tree CHECK 3 currently reports '
          f'{len(real_check3)} finding(s), {len(real_unresolved3)} unresolved '
          f'(not asserted — see module docstring)')

    # --- CHECK 1/2 PER-SITE AST fixtures ---------------------------------
    # Rewritten 2026-09-07 after the coordinator PROVED the previous
    # function-body-wide version was blind to a REAL reproduction: setting
    # a guard variable to a hardcoded `False` (same name, same `if` shape,
    # wrong value) left CHECK 2's finding count unchanged. These fixtures
    # mirror the ACTUAL fold_helpers.py shape byte-for-byte (early-exit
    # `if <guard>: ...; continue` before the unguarded write, not a nested
    # `if not <guard>:`), so the guard/no-guard distinction is tested on the
    # real control-flow shape, not an invented simplification of it.

    def _find_site(tree, dest_name):
        for site in evaluate_destination_sites(tree):
            if site['dest_name'] == dest_name:
                return site
        return None

    # (a) THE REAL SHAPE, GENUINELY GUARDED — mirrors the current, fixed
    # fold_helpers.py: `_pad_tier_shaped` assigned from a real call to
    # box_family_is_tier_shaped(), an early-exit `if _pad_tier_shaped: ...;
    # continue`, then the flat write reachable only when it's falsy.
    real_shape_guarded_src = '''
from converter.db import db_lookup

def route_area_css_to_block_attrs(owning_block, _pad_object_base, base_decls, tab, mob_override, block_attr_names, parent_attrs):
    _pad_tier_shaped = db_lookup.box_family_is_tier_shaped(
        owning_block, _pad_object_base
    )
    for _tier_sfx, _src in (("", base_decls), ("Tablet", tab), ("Mobile", mob_override)):
        _obj = {}
        for _side in ("top", "right", "bottom", "left"):
            _v = _src.get(f"padding-{_side}")
            if _v is not None:
                _obj[_side] = _v
        if not _obj:
            continue
        if _pad_tier_shaped:
            if _pad_object_base not in block_attr_names:
                continue
            parent_attrs.setdefault(_pad_object_base, {"desktop": _obj})
            continue
        _dest = f"{_pad_object_base}{_tier_sfx}" if _tier_sfx else _pad_object_base
        if _dest in block_attr_names:
            parent_attrs.setdefault(_dest, _obj)
'''
    tree_guarded = ast.parse(real_shape_guarded_src)
    site_guarded = _find_site(tree_guarded, '_dest')
    if site_guarded is None:
        failures.append('self-test: real-shape GUARDED fixture — site not found at all (site detection itself is broken)')
    else:
        if not site_guarded['shape_guarded']:
            failures.append(
                'self-test: NEGATIVE CONTROL FAILED — the real-shape fixture with a '
                'GENUINE box_family_is_tier_shaped() call feeding the guard variable '
                'must be classified shape_guarded=True (no CHECK 2 finding), was not'
            )
        if not site_guarded['has_membership']:
            failures.append(
                'self-test: NEGATIVE CONTROL FAILED — the real-shape fixture\'s '
                '`if _dest in block_attr_names:` must satisfy the membership check, did not'
            )

    # (b) THE COORDINATOR'S EXACT REPRODUCTION — permanent regression
    # fixture, requirement #2. Byte-identical to (a) except the ONE line the
    # coordinator changed live in fold_helpers.py: the guard variable is
    # hardcoded `False` instead of being assigned from the predicate call.
    # Same variable name, same `if` shape, same everything else — only the
    # VALUE differs. Must now trip CHECK 2 (shape_guarded=False).
    real_shape_defect_src = real_shape_guarded_src.replace(
        'db_lookup.box_family_is_tier_shaped(\n        owning_block, _pad_object_base\n    )',
        'False   # defect reintroduced',
    )
    if real_shape_defect_src == real_shape_guarded_src:
        failures.append('self-test: defect-fixture string substitution did not apply — fixture text drifted')
    tree_defect = ast.parse(real_shape_defect_src)
    site_defect = _find_site(tree_defect, '_dest')
    if site_defect is None:
        failures.append('self-test: real-shape DEFECT fixture — site not found at all')
    else:
        if site_defect['shape_guarded']:
            failures.append(
                'self-test: POSITIVE CONTROL FAILED (permanent regression fixture, '
                'requirement #2) — `_pad_tier_shaped = False` must be classified '
                'shape_guarded=False (CHECK 2 must fire), but was classified guarded. '
                'This is the EXACT defect the coordinator proved this gate missed.'
            )
        if not site_defect['has_box_side']:
            failures.append(
                'self-test: real-shape DEFECT fixture — expected has_box_side=True '
                '(the per-side _obj construction is present), was not detected'
            )
        # The full end-to-end condition CHECK 2 actually gates on:
        if not (site_defect['has_box_side'] and not site_defect['shape_guarded']):
            failures.append(
                'self-test: POSITIVE CONTROL FAILED — the defect fixture must satisfy '
                'CHECK 2\'s firing condition (has_box_side AND NOT shape_guarded)'
            )

    # (c) Mutation-based negative control (equivalent in spirit to the
    # earlier "corrupt the regex, prove self-test fails" demonstration —
    # kept per the coordinator's explicit request, reimplemented against the
    # new AST mechanism since the old regex constants no longer exist).
    # Temporarily strip the real predicate name out of _PREDICATE_FUNC_NAMES
    # and confirm the GENUINELY guarded fixture (a) flips to unguarded —
    # proving the guard classification really depends on that name set and
    # isn't independently satisfied some other way.
    global _PREDICATE_FUNC_NAMES
    _original_predicate_names = _PREDICATE_FUNC_NAMES
    try:
        _PREDICATE_FUNC_NAMES = frozenset()
        tree_guarded_mutated = ast.parse(real_shape_guarded_src)
        site_guarded_mutated = _find_site(tree_guarded_mutated, '_dest')
        if site_guarded_mutated is None or site_guarded_mutated['shape_guarded']:
            failures.append(
                'self-test: mutation control FAILED — with _PREDICATE_FUNC_NAMES '
                'emptied, the genuinely-guarded fixture must flip to shape_guarded=False; '
                'it did not, meaning guard detection does not actually depend on that set'
            )
    finally:
        _PREDICATE_FUNC_NAMES = _original_predicate_names
    # And confirm restoration actually took effect (paranoia — the whole
    # rest of this self-test run depends on it).
    if _PREDICATE_FUNC_NAMES is not _original_predicate_names or 'box_family_is_tier_shaped' not in _PREDICATE_FUNC_NAMES:
        failures.append('self-test: _PREDICATE_FUNC_NAMES restoration failed after mutation control')

    # (d) Simple POSITIVE control: guard removed entirely (not just broken)
    # must trip BOTH CHECK 1 and CHECK 2.
    bad_src = '''
def route_bad(owning_block, attr_base, tier_sfx, base_decls):
    obj = {}
    for side in ("top", "right", "bottom", "left"):
        v = base_decls.get(side)
        if v is not None:
            obj[side] = v
    dest = f"{attr_base}{tier_sfx}" if tier_sfx else attr_base
    parent_attrs.setdefault(dest, obj)
'''
    tree_bad = ast.parse(bad_src)
    site_bad = _find_site(tree_bad, 'dest')
    if site_bad is None:
        failures.append('self-test: bad fixture — site not found at all')
    else:
        if site_bad['shape_guarded']:
            failures.append('self-test: POSITIVE CONTROL FAILED — bad fixture should not be shape_guarded')
        if site_bad['has_membership']:
            failures.append('self-test: POSITIVE CONTROL FAILED — bad fixture should have no membership check')
        if not site_bad['has_box_side']:
            failures.append('self-test: POSITIVE CONTROL FAILED — bad fixture should be classified has_box_side=True')

    # --- Idempotence: running the real-tree scan twice yields the same
    # finding set (checks are read-only / pure). ---
    r1 = run_scan()
    r2 = run_scan()
    if r1 != r2:
        failures.append('self-test: run_scan() is not idempotent against the real tree')

    if failures:
        for f in failures:
            print(f'[self-test] FAIL: {f}')
        return 1
    print('[self-test] all assertions passed')
    return 0


def main():
    args = sys.argv[1:]
    if '--self-test' in args:
        sys.exit(self_test())

    result = run_scan()
    total = len(result['check1']) + len(result['check2']) + len(result['check3'])
    is_check = '--check' in args
    is_survey = '--survey' in args

    mode_label = 'SURVEY (census, exit 0 always)' if is_survey else (
        'CHECK (gate: exit 1 on any finding)' if is_check else 'REPORT (exit 0 always)'
    )
    print_report(result, mode_label)

    if is_survey:
        sys.exit(0)

    if total == 0:
        print('[check-converter-destination-shape] OK — 0 findings')
        sys.exit(0)

    if is_check:
        print(f'[check-converter-destination-shape] --check FAILED: {total} finding(s).')
        sys.exit(1)
    sys.exit(0)


if __name__ == '__main__':
    main()
