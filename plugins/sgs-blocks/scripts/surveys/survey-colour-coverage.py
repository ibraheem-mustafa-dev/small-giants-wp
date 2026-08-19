#!/usr/bin/env python3
"""
survey-colour-coverage.py — census of which PAINTED colours across sgs/ blocks
have NO client-facing attribute behind them.

READ-ONLY. Never writes to any file, never runs npm/build/deploy, never
touches git, never proposes or applies a fix. Statically scans each block's
`style.css` (a real static CSS file) + the CSS the block's `render.php`
assembles at runtime (a PHP string-concatenation soup, reconstructed — see
KNOWN LIMITATION below), classifies every colour-valued declaration, and
joins it against `block_attributes` (role='color') to find two kinds of gap:

  base-colour-uncontrolled  — a HARDCODED colour in a BASE-state rule, on an
                               element with no colour attribute at all.
  state-colour-uncontrolled — the element HAS a base colour attribute, but a
                               hover/focus/active/disabled rule paints a
                               colour with no attribute governing THAT state
                               (priority finding — reported first).

Usage:
    python survey-colour-coverage.py               # human-readable report (--survey is default)
    python survey-colour-coverage.py --survey --json
    python survey-colour-coverage.py --check        # ADVISORY ONLY — see note below, always exit 0
    python survey-colour-coverage.py --self-test    # prove the detector can FAIL

Governing background: this script was commissioned to answer "which colours
does a block PAINT that the client cannot CHANGE?" The six hand-verified
targets that grounded its design (sgs/nav-menu's hardcoded [aria-current]
rule, sgs/accordion's open/hover gap, sgs/tabs' focus-visible gap,
sgs/mega-panel's hover/focus gap, sgs/option-picker's hover gap,
sgs/pricing-table's :checked gap, and sgs/form being the ONE block that
exposes a focus ring as a setting) are asserted directly in --self-test.

⛔ ADVISORY-ONLY --check (this is a deliberate, disclosed, temporary state).
This project's doctrine (D542, the survey/fix/check triad) forbids gating a
build on a rule the moment it is introduced — a brand-new detector has not
yet had its false positives triaged against the real tree. `--check` runs
the full census and PRINTS every finding but always exits 0. PROMOTION
TRIGGER: once a human has walked the `--survey` output at least once,
confirmed the false-positive rate is acceptable (i.e. every base/state
finding either got fixed or was explicitly accepted as an intentional
design choice), flip `--check`'s exit code to reflect real violations and
wire it into a gate. Do not flip it before that triage happens.

============================================================================
KNOWN LIMITATIONS (disclosed, not hidden)
============================================================================

1. CSS-IN-PHP EXTRACTION IS A RECONSTRUCTION, NOT A PARSE. `render.php`
   files build their scoped `<style>` block via `$css .= '...' . $var .
   '...';`-style string concatenation across many statements, not a single
   heredoc. This script tokenises each PHP statement of the shape
   `$var (.= or = or []=) EXPR;` (quote-aware, so a CSS `;` inside a string
   literal never truncates the PHP statement early), extracts the literal
   string fragments from EXPR, and stitches them into one "soup" string per
   file with a `\x00PHPVAR\x00` marker standing in for every non-literal
   PHP expression (a variable, function call, ternary, etc). The soup is
   then run through the SAME CSS-rule regex used on style.css. This
   correctly detects "this declaration is built from a PHP variable" (→
   DRIVEN) without needing to trace what the variable holds, but it does
   NOT reconstruct exact selectors when a selector itself spans a PHP
   variable (e.g. `$link_sel . ':hover'` — the PHPVAR marker sits where the
   selector base would be, so the element token is only recoverable from
   whatever literal BEM class text survives in the soup). It also cannot
   see CSS built inside a shared PHP helper function this script doesn't
   scan (e.g. `sgs_typography_css_rule()`, `sgs_container_wrapper_css()`) —
   those are invisible to this survey by construction, same class of gap
   `survey-colour-controls.py` already discloses for its own extension
   surface. Neither of the two self-test-mandatory targets (accordion,
   tabs) depends on this path — both live entirely in a real style.css —
   so this limitation does not threaten the hard correctness gate, but it
   does mean render.php-only findings (e.g. nav-menu, mega-panel) should be
   spot-checked by file:line before being treated as ground truth.

2. ELEMENT RESOLUTION IS A BEM-CLASS HEURISTIC, NOT A SCHEMA WALK. The
   target `css_element` is guessed from the RIGHTMOST `sgs-<block>__<elem>`
   BEM class token in a selector, normalised by: (a) exact match against
   this block's own `block_attributes.css_element` values, (b) stripping a
   trailing `-open`/`-close`/`-active`/`-hover`/`-selected` suffix and
   retrying, (c) a small disclosed ALIAS table for BEM-vs-DB naming drift
   observed live (`link`/`sublink` → `item`, the nav-menu shape). A
   selector with no BEM class at all (root/wrapper rules, `:root`) resolves
   to element=None, matched against `css_element IS NULL` rows. Anything
   that still doesn't resolve confidently is NOT asserted as a finding —
   it is reported in its own UNCLEAR bucket ("element could not be
   resolved") for manual triage. Per the false-positives-are-worse-than-
   false-negatives instruction, an unresolved element NEVER becomes a
   base/state finding by default.

3. STATE NAMING: this script's own vocabulary (base/hover/focus/active/
   disabled, from the selector shape) does not match `block_attributes`'
   OWN `css_state` vocabulary 1:1 — the DB was found (queried live,
   2026-08-14; renamed 'selected'->'current' 2026-08-19) to use only
   'hover' and 'current' for role='color' rows (never
   'focus'/'active'/'disabled'/'open'). This script's 'active'
   state (covering `[aria-current]`/`[aria-selected="true"]`/`.is-active`/
   `.is-current`/`.is-selected`/`[open]`/`.is-open`/`:checked`) is matched
   against DB `css_state='current'` — the closest existing DB concept for
   "the chosen/current one of a set". 'focus' and 'disabled' have no DB
   equivalent at all today, so any hardcoded focus/disabled-state colour on
   an element that has a base attribute is UNCONDITIONALLY a
   state-colour-uncontrolled finding (there is no DB row that could ever
   satisfy it) — this is exactly the shape of sgs/tabs' and sgs/accordion's
   own focus-visible / open-state gaps.

4. `outline` SHORTHAND is parsed for its colour component even though the
   task's base property list names only `outline-color`. Grepped live: no
   render.php/style.css in this plugin ever declares `outline-color`
   directly — every focus ring uses the `outline: <width> <style> <color>`
   shorthand (confirmed across accordion/tabs/option-picker/form). Skipping
   the shorthand would make this script blind to every real focus ring in
   the codebase, including both self-test-mandatory targets. The colour
   token is taken as the LAST var()/colour-shaped token in the shorthand
   value (CSS's own `outline` grammar puts colour last or first; this repo
   consistently puts it last after `<width> <style>`).

5. `box-shadow`/`text-shadow` colour extraction takes the LAST colour-shaped
   token in the value (offset-x offset-y blur [spread] color is the
   universal ordering; the colour is either absent, entirely first, or
   entirely last — never in the middle in valid CSS — so "last colour-
   shaped token" is a safe, simple extraction).

6. `transparent`/`inherit`/`initial`/`unset`/`none` are treated as neutral
   — not a colour "paint" a client would expect to customise — and are
   never reported as a finding of either kind, regardless of state.

7. A value is classified DRIVEN whenever it references a `--sgs-*` custom
   property AND that exact property name string is found anywhere in the
   block's own render.php (the block sets it from an attribute somewhere).
   This is a presence check, not a data-flow proof — a `--sgs-*` name that
   happens to appear in render.php as a COMMENT or unrelated string would
   false-classify as DRIVEN. Believed low-risk (SGS custom-property names
   are distinctive per-block, not generic English words) but not proven
   zero, same caveat class `survey-background-colour-support.py` documents
   for its own loose regex.
"""

import argparse
import json
import os
import re
import sqlite3
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# ---------------------------------------------------------------------------
# Paths (read-only). Never modified by this script.
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..', '..'))
BLOCKS_SRC = os.path.join(REPO_ROOT, 'plugins', 'sgs-blocks', 'src', 'blocks')
DB_PATH = os.path.join(
    os.path.expanduser('~'), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db'
)

PHPVAR_MARKER = '\x00PHPVAR\x00'

# ---------------------------------------------------------------------------
# Colour-valued CSS properties this survey tracks (task-scoped).
# ---------------------------------------------------------------------------

DIRECT_COLOUR_PROPERTIES = {
    'color', 'background-color', 'border-color',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'outline-color', 'fill', 'stroke', 'caret-color', 'text-decoration-color',
}
# Extracted specially (not a straight property:value colour token):
SPECIAL_PROPERTIES = {
    'background', 'background-image', 'outline', 'box-shadow', 'text-shadow',
}
TRACKED_PROPERTIES = DIRECT_COLOUR_PROPERTIES | SPECIAL_PROPERTIES

NEUTRAL_VALUES = {'transparent', 'inherit', 'initial', 'unset', 'none', 'currentcolor'}

COLOUR_TOKEN_RE = re.compile(
    r'#[0-9a-fA-F]{3,8}\b'
    r'|rgba?\([^)]*\)'
    r'|hsla?\([^)]*\)'
    r'|color-mix\([^)]*\)'
    r'|\bcurrentColor\b'
    r'|\bcurrentcolor\b'
    r'|\btransparent\b'
    r'|\b(?:white|black|red|green|blue|yellow|orange|purple|pink|grey|gray|'
    r'brown|cyan|magenta|navy|teal|maroon|olive|silver|gold|indigo|violet)\b',
    re.IGNORECASE,
)
VAR_NAME_RE = re.compile(r'var\(\s*(--[\w-]+)')

# ---------------------------------------------------------------------------
# State detection from a selector fragment.
# ---------------------------------------------------------------------------

STATE_MARKERS = [
    ('hover', [r':hover\b']),
    ('focus', [r':focus-visible\b', r':focus-within\b', r':focus\b']),
    ('active', [
        r'\[aria-selected=["\']?true["\']?\]', r'\[aria-current', r'\.is-active\b',
        r'\.is-current\b', r'\.is-selected\b', r'\[open\]', r'\.is-open\b', r':checked\b',
    ]),
    ('disabled', [r':disabled\b', r'\[aria-disabled']),
]

# DB block_attributes.css_state has ONLY ever been observed to carry 'hover'
# and 'current' for role='color' rows (verified live, 2026-08-14; renamed
# 'selected'->'current' 2026-08-19) — see module docstring limitation 3.
# 'focus'/'disabled' map to nothing, by design.
STATE_TO_DB_STATE = {
    'hover': {'hover'},
    'active': {'current'},
    'focus': set(),
    'disabled': set(),
}

# BEM-class-vs-DB-css_element naming drift observed live in this codebase.
ELEMENT_ALIASES = {
    'link': 'item',
    'sublink': 'item',
}
ELEMENT_SUFFIX_STRIP = ('-open', '-close', '-active', '-hover', '-selected')

BEM_ELEMENT_RE = re.compile(r'sgs-[\w-]*?__([a-z0-9-]+)')


def detect_states(selector_fragment):
    """Return the list of interaction states a single (non-comma) selector
    fragment carries. A fragment matching >1 category reports ALL of them
    (never collapsed) — the docstring/task rule for a rule that carries
    both e.g. :hover and :focus-visible together."""
    found = []
    for state_name, patterns in STATE_MARKERS:
        for pat in patterns:
            if re.search(pat, selector_fragment):
                found.append(state_name)
                break
    return found or ['base']


def resolve_element(selector_fragment):
    """Return the rightmost BEM element token in a selector fragment, or
    None if the selector carries no `sgs-<block>__<element>` class at all
    (root/wrapper-level selector)."""
    matches = BEM_ELEMENT_RE.findall(selector_fragment)
    if not matches:
        return None
    return matches[-1]


def match_element_to_db(element_guess, db_elements):
    """Resolve a raw BEM element guess to the css_element key it should be
    joined against. Returns (resolved_element, confidence) where confidence
    is one of 'exact' | 'alias' | 'suffix-stripped' | 'unverified'.

    element_guess=None (no BEM class in the selector at all) resolves to
    (None, 'exact') — matched against css_element IS NULL rows, a
    legitimate DB shape.

    Note: `db_elements` is the set of css_element values that ALREADY HAVE
    at least one colour attribute — by definition, a genuinely uncovered
    element can never be a member of it. So failing to find element_guess
    in db_elements does NOT mean "couldn't identify this element" (that
    would make a zero-coverage element permanently unresolvable, which
    defeats the whole point of this survey) — it means "this element has
    no DB row to normalise against", and the raw guess is used AS-IS
    ('unverified' confidence) as the join key. It will then correctly
    show zero attribute rows downstream, which IS the base-colour-
    uncontrolled signal. Confidence stays informational for reporting."""
    if element_guess is None:
        return None, 'exact'
    if element_guess in db_elements:
        return element_guess, 'exact'
    if element_guess in ELEMENT_ALIASES and ELEMENT_ALIASES[element_guess] in db_elements:
        return ELEMENT_ALIASES[element_guess], 'alias'
    for suffix in ELEMENT_SUFFIX_STRIP:
        if element_guess.endswith(suffix):
            stripped = element_guess[: -len(suffix)]
            if stripped in db_elements:
                return stripped, 'suffix-stripped'
    return element_guess, 'unverified'


# ---------------------------------------------------------------------------
# CSS rule extraction (works on both real style.css text and the PHP soup).
# ---------------------------------------------------------------------------

RULE_RE = re.compile(r'([^{}]+)\{([^{}]*)\}')


def extract_css_rules(css_text):
    """Yield (selector_text, declarations_text, char_offset) for every
    innermost `selector { declarations }` block. Works correctly inside
    @media wrappers because the regex only ever matches the INNERMOST
    (non-nested) brace pair — an @media header never gets a matching close
    brace before its first nested rule does, so it's skipped as unmatched
    leftover text, which is fine: we don't need media-query context."""
    for m in RULE_RE.finditer(css_text):
        selector_text = m.group(1)
        # Reject obvious non-CSS noise (an @keyframes percentage block, or
        # PHP/HTML soup fragments with no selector-shaped tail).
        tail = selector_text.strip().splitlines()[-1] if selector_text.strip() else ''
        if not tail:
            continue
        yield tail, m.group(2), m.start()


def split_top_level_commas(selector_text):
    """Split a selector list on top-level commas (none of these selectors
    use functional pseudo-classes with commas inside, so a plain split is
    safe and matches every real selector in this codebase)."""
    return [s.strip() for s in selector_text.split(',') if s.strip()]


# ---------------------------------------------------------------------------
# Declaration → colour-property extraction.
# ---------------------------------------------------------------------------

def split_declarations(decl_text):
    """Yield (property, value) for each `prop: value;` pair in a
    declaration block, skipping anything that isn't a tracked property."""
    for chunk in decl_text.split(';'):
        chunk = chunk.strip()
        if not chunk or ':' not in chunk:
            continue
        prop, _, value = chunk.partition(':')
        prop = prop.strip().lower()
        value = value.strip()
        if not value:
            continue
        yield prop, value


def extract_colour_declarations(prop, value):
    """Given one CSS declaration, yield (reported_property, colour_value)
    pairs for every colour component it carries. Most properties yield
    exactly one; gradients can yield several (one per stop)."""
    if prop in DIRECT_COLOUR_PROPERTIES:
        yield prop, value
        return

    if prop in ('background', 'background-image'):
        if 'gradient(' in value.lower():
            for stop in COLOUR_TOKEN_RE.finditer(value):
                yield 'background (gradient stop)', stop.group(0)
            for m in VAR_NAME_RE.finditer(value):
                # var()-based gradient stops: report the whole var() call,
                # not just the bare custom-property name.
                start = m.start()
                depth = 0
                end = start
                for i in range(m.end() - 1, len(value)):
                    if value[i] == '(':
                        depth += 1
                    elif value[i] == ')':
                        depth -= 1
                        if depth == 0:
                            end = i + 1
                            break
                yield 'background (gradient stop)', value[start:end]
        elif 'url(' not in value.lower():
            # A plain colour value used as the background shorthand.
            yield 'background-color', value
        return

    if prop == 'outline':
        # <width> <style> <color> — colour is the LAST colour-shaped token.
        tokens = COLOUR_TOKEN_RE.findall(value) or VAR_NAME_RE.findall(value)
        if tokens:
            yield 'outline-color', value
        return

    if prop in ('box-shadow', 'text-shadow'):
        if COLOUR_TOKEN_RE.search(value) or VAR_NAME_RE.search(value):
            yield f'{prop} (colour component)', value
        return


# ---------------------------------------------------------------------------
# Value classification: DRIVEN / THEME / HARDCODED / UNCLEAR.
# ---------------------------------------------------------------------------

def classify_value(value, php_source_text):
    """Classify one colour value. php_source_text is the block's own
    render.php content (may be '' if none), used to confirm a --sgs-*
    custom property is actually set somewhere by this block."""
    stripped = value.strip()

    if PHPVAR_MARKER in stripped:
        return 'DRIVEN', 'php-interpolated value'

    if stripped.lower() in NEUTRAL_VALUES:
        return 'THEME', 'neutral keyword (not a paint)'

    sgs_vars = re.findall(r'var\(\s*(--sgs-[\w-]+)', stripped)
    for v in sgs_vars:
        if php_source_text and re.search(re.escape(v), php_source_text):
            return 'DRIVEN', f'custom property {v} is set in this block\'s render.php'

    wp_vars = re.findall(r'var\(\s*(--wp--(?:preset|custom)--[\w-]+)', stripped)
    if wp_vars:
        return 'THEME', f'global design token {wp_vars[0]}'

    if sgs_vars:
        return 'UNCLEAR', (
            f'references {sgs_vars[0]} but this block\'s render.php never sets it — '
            'may be set by a shared helper this static scan does not follow'
        )

    if COLOUR_TOKEN_RE.search(stripped):
        return 'HARDCODED', 'literal colour value'

    return 'UNCLEAR', 'unrecognised value shape'


# ---------------------------------------------------------------------------
# PHP CSS-soup reconstruction (see module docstring limitation 1).
# ---------------------------------------------------------------------------

def _split_statements(php_text):
    """Quote-aware split of PHP source into top-level `;`-terminated
    statement chunks, each tagged with its 1-indexed start line. A `;`
    inside a single/double-quoted string never ends a statement early."""
    statements = []
    buf = []
    start_line = 1
    line = 1
    in_squote = False
    in_dquote = False
    i = 0
    n = len(php_text)
    while i < n:
        ch = php_text[i]
        if ch == '\n':
            line += 1
        if in_squote:
            buf.append(ch)
            if ch == '\\' and i + 1 < n:
                buf.append(php_text[i + 1])
                i += 2
                continue
            if ch == "'":
                in_squote = False
            i += 1
            continue
        if in_dquote:
            buf.append(ch)
            if ch == '\\' and i + 1 < n:
                buf.append(php_text[i + 1])
                i += 2
                continue
            if ch == '"':
                in_dquote = False
            i += 1
            continue
        if ch == "'":
            in_squote = True
            buf.append(ch)
            i += 1
            continue
        if ch == '"':
            in_dquote = True
            buf.append(ch)
            i += 1
            continue
        if ch == ';':
            statements.append((''.join(buf), start_line))
            buf = []
            start_line = line
            i += 1
            continue
        if not buf:
            start_line = line
        buf.append(ch)
        i += 1
    if buf and ''.join(buf).strip():
        statements.append((''.join(buf), start_line))
    return statements


ASSIGN_RE = re.compile(
    r'^\s*\$[A-Za-z_]\w*(?:\[[^\]]*\])?\s*(?:\.=|=)\s*(.+)$', re.DOTALL
)


def _literal_soup_from_expression(expr):
    """Given a PHP expression (the RHS of an assignment), extract its
    literal string-fragment contents concatenated with PHPVAR_MARKER
    standing in for every non-literal `.`-joined operand."""
    out = []
    buf = []
    in_squote = False
    in_dquote = False
    had_literal_since_marker = False
    i = 0
    n = len(expr)
    while i < n:
        ch = expr[i]
        if in_squote or in_dquote:
            quote = "'" if in_squote else '"'
            if ch == '\\' and i + 1 < n:
                buf.append(expr[i + 1])
                i += 2
                continue
            if ch == quote:
                out.append(''.join(buf))
                buf = []
                had_literal_since_marker = True
                in_squote = in_dquote = False
                i += 1
                continue
            buf.append(ch)
            i += 1
            continue
        if ch == "'":
            in_squote = True
            i += 1
            continue
        if ch == '"':
            in_dquote = True
            i += 1
            continue
        if ch == '.':
            i += 1
            continue
        i += 1
    # Anything encountered outside quotes (variables, function calls,
    # operators, whitespace) is summarised as a single marker per
    # statement — precise position isn't needed, only "a driven value
    # crosses through here somewhere".
    if not out:
        return ''
    return PHPVAR_MARKER.join(out) if len(out) > 1 else out[0]


def build_php_css_soup(php_text):
    """Return a list of (soup_fragment, line_number) pairs — one per
    `$var .= EXPR;` / `$var = EXPR;` statement whose RHS contains at least
    one string literal. Statements that assemble non-CSS content (HTML,
    JSON, etc.) are harmless noise here: extract_css_rules() only yields
    something for text shaped like `selector{declarations}`, so anything
    else is silently ignored downstream."""
    fragments = []
    for stmt_text, line_no in _split_statements(php_text):
        m = ASSIGN_RE.match(stmt_text)
        if not m:
            continue
        soup = _literal_soup_from_expression(m.group(1))
        if soup and ('{' in soup or PHPVAR_MARKER in soup):
            fragments.append((soup, line_no))
    return fragments


# ---------------------------------------------------------------------------
# DB loading.
# ---------------------------------------------------------------------------

def load_colour_attributes(db_path):
    """Query block_attributes for every sgs/ role='color' row. Returns a
    dict: block_slug -> list of {attr_name, css_element, css_property (list
    or None), css_state}."""
    conn = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            "SELECT block_slug, attr_name, css_element, css_property, css_state "
            "FROM block_attributes WHERE role='color' AND block_slug LIKE 'sgs/%' "
            "ORDER BY block_slug, attr_name"
        ).fetchall()
    finally:
        conn.close()

    by_block = defaultdict(list)
    for r in rows:
        props = None
        if r['css_property']:
            props = [p.strip() for p in r['css_property'].split(',') if p.strip()]
        by_block[r['block_slug']].append({
            'attr_name': r['attr_name'],
            'css_element': r['css_element'],
            'css_property': props,
            'css_state': r['css_state'],
        })
    return by_block


def db_elements_for_block(attrs):
    return {a['css_element'] for a in attrs if a['css_element'] is not None}


def element_has_any_attr(attrs, element):
    return any(a['css_element'] == element for a in attrs)


def element_has_base_property_attr(attrs, element, prop):
    for a in attrs:
        if a['css_element'] != element or a['css_state'] is not None:
            continue
        if a['css_property'] is None or prop in a['css_property']:
            return True
    return False


def element_has_state_property_attr(attrs, element, prop, state):
    db_states = STATE_TO_DB_STATE.get(state, set())
    if not db_states:
        return False
    for a in attrs:
        if a['css_element'] != element or a['css_state'] not in db_states:
            continue
        if a['css_property'] is None or prop in a['css_property']:
            return True
    return False


# ---------------------------------------------------------------------------
# Per-block collection.
# ---------------------------------------------------------------------------

def _read_text(path):
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            return fh.read()
    except (IOError, OSError):
        return None


def find_block_files(block_slug):
    dirname = block_slug.split('/', 1)[1]
    block_dir = os.path.join(BLOCKS_SRC, dirname)
    style_path = os.path.join(block_dir, 'style.css')
    render_path = os.path.join(block_dir, 'render.php')
    return (
        style_path if os.path.isfile(style_path) else None,
        render_path if os.path.isfile(render_path) else None,
    )


def collect_declarations_for_block(block_slug):
    """Return a list of raw declaration dicts for one block:
    {selector, property, value, state, file, line}. Sources both style.css
    (real line numbers) and the render.php PHP-CSS soup (approximate line
    numbers — the line of the statement that contributed the fragment)."""
    style_path, render_path = find_block_files(block_slug)
    declarations = []

    if style_path:
        text = _read_text(style_path)
        if text is not None:
            rel = os.path.relpath(style_path, REPO_ROOT).replace('\\', '/')
            line_starts = [0]
            for m in re.finditer('\n', text):
                line_starts.append(m.end())
            for selector_text, decl_text, offset in extract_css_rules(text):
                line_no = 1
                for idx, ls in enumerate(line_starts):
                    if ls <= offset:
                        line_no = idx + 1
                    else:
                        break
                for selector_fragment in split_top_level_commas(selector_text):
                    states = detect_states(selector_fragment)
                    element_guess = resolve_element(selector_fragment)
                    for prop, value in split_declarations(decl_text):
                        for reported_prop, colour_value in extract_colour_declarations(prop, value):
                            for state in states:
                                declarations.append({
                                    'selector': selector_fragment,
                                    'element_guess': element_guess,
                                    'property': reported_prop,
                                    'value': colour_value,
                                    'state': state,
                                    'file': rel,
                                    'line': line_no,
                                })

    if render_path:
        php_text = _read_text(render_path) or ''
        rel = os.path.relpath(render_path, REPO_ROOT).replace('\\', '/')
        for soup, line_no in build_php_css_soup(php_text):
            for selector_text, decl_text, _offset in extract_css_rules(soup):
                if PHPVAR_MARKER in selector_text and not BEM_ELEMENT_RE.search(selector_text):
                    # No recoverable BEM class at all in this fragment —
                    # still process (element resolves to None → root scope)
                    pass
                for selector_fragment in split_top_level_commas(selector_text):
                    states = detect_states(selector_fragment)
                    element_guess = resolve_element(selector_fragment)
                    for prop, value in split_declarations(decl_text):
                        for reported_prop, colour_value in extract_colour_declarations(prop, value):
                            for state in states:
                                declarations.append({
                                    'selector': selector_fragment,
                                    'element_guess': element_guess,
                                    'property': reported_prop,
                                    'value': colour_value,
                                    'state': state,
                                    'file': rel,
                                    'line': line_no,
                                })

    return declarations, (_read_text(render_path) if render_path else '') or ''


# ---------------------------------------------------------------------------
# Classification + join.
# ---------------------------------------------------------------------------

def classify_declaration(decl, php_source_text, attrs, db_elements):
    """Return a finding dict or None. Mutates nothing."""
    bucket, note = classify_value(decl['value'], php_source_text)

    resolved_element, confidence = match_element_to_db(decl['element_guess'], db_elements)

    base_result = {
        'block_slug': decl.get('block_slug'),
        'selector': decl['selector'],
        'property': decl['property'],
        'value': decl['value'],
        'state': decl['state'],
        'file': decl['file'],
        'line': decl['line'],
        'bucket': bucket,
        'note': note,
        'element_guess': decl['element_guess'],
    }

    if bucket == 'DRIVEN':
        return None  # fully covered, no finding

    if bucket == 'THEME' and note == 'neutral keyword (not a paint)':
        return None  # transparent/inherit/etc — not a real paint

    if bucket == 'UNCLEAR':
        base_result['kind'] = 'unclear-value'
        return base_result

    # bucket is HARDCODED or THEME (a real value with a resolved element).
    prop_for_join = decl['property']
    # Strip the descriptive suffix used for gradient/shadow reporting when
    # joining against the DB, which only knows the base property name.
    join_prop = prop_for_join.split(' ')[0]

    if decl['state'] == 'base':
        if bucket == 'THEME':
            return None  # legitimate global-palette choice at rest, no defect
        if element_has_base_property_attr(attrs, resolved_element, join_prop):
            return None  # DB says an attribute already governs this
        base_result['kind'] = 'base-colour-uncontrolled'
        return base_result

    # Non-base state.
    if not element_has_any_attr(attrs, resolved_element):
        # Zero coverage of any kind for this element — root cause is
        # "nothing controls this element's colour at all", which is the
        # base-colour-uncontrolled situation even though it surfaced via a
        # state selector (see module docstring reporting-gate rationale).
        if bucket == 'THEME':
            return None
        base_result['kind'] = 'base-colour-uncontrolled'
        return base_result

    if element_has_state_property_attr(attrs, resolved_element, join_prop, decl['state']):
        return None  # DB says this exact state+property is covered

    base_result['kind'] = 'state-colour-uncontrolled'
    return base_result


def build_report(db_path=DB_PATH):
    attrs_by_block = load_colour_attributes(db_path)

    block_dirs = sorted(
        d for d in os.listdir(BLOCKS_SRC)
        if os.path.isdir(os.path.join(BLOCKS_SRC, d))
    ) if os.path.isdir(BLOCKS_SRC) else []

    findings_base = []
    findings_state = []
    unclear = []
    blocks_with_findings = set()
    blocks_scanned = 0

    for dirname in block_dirs:
        block_slug = f'sgs/{dirname}'
        style_path, render_path = find_block_files(block_slug)
        if style_path is None and render_path is None:
            continue
        blocks_scanned += 1

        attrs = attrs_by_block.get(block_slug, [])
        db_elements = db_elements_for_block(attrs)

        declarations, php_source_text = collect_declarations_for_block(block_slug)
        for decl in declarations:
            decl['block_slug'] = block_slug

        for decl in declarations:
            result = classify_declaration(decl, php_source_text, attrs, db_elements)
            if result is None:
                continue
            if result['kind'] == 'base-colour-uncontrolled':
                findings_base.append(result)
                blocks_with_findings.add(block_slug)
            elif result['kind'] == 'state-colour-uncontrolled':
                findings_state.append(result)
                blocks_with_findings.add(block_slug)
            else:
                unclear.append(result)

    return {
        'blocks_scanned': blocks_scanned,
        'blocks_with_findings': sorted(blocks_with_findings),
        'blocks_clean': blocks_scanned - len(blocks_with_findings),
        'findings_state': findings_state,
        'findings_base': findings_base,
        'unclear': unclear,
    }


# ---------------------------------------------------------------------------
# Report rendering.
# ---------------------------------------------------------------------------

def _fmt_finding(f):
    return (
        f"  - {f['block_slug']} [{f['state']}] {f['property']} = `{f['value']}` "
        f"@ {f['file']}:{f['line']}  (selector: {f['selector']})"
    )


def render_human(report):
    lines = []
    lines.append('=' * 78)
    lines.append('COLOUR COVERAGE survey — which painted colours have no client control?')
    lines.append('=' * 78)
    lines.append(f"Blocks scanned (have style.css and/or render.php): {report['blocks_scanned']}")
    lines.append(f"Blocks with >=1 finding: {len(report['blocks_with_findings'])}")
    lines.append(f"Blocks with ZERO findings: {report['blocks_clean']}")
    lines.append('')

    by_state = defaultdict(int)
    for f in report['findings_state']:
        by_state[f['state']] += 1
    by_state_base = defaultdict(int)
    for f in report['findings_base']:
        by_state_base[f['state']] += 1

    lines.append('-' * 78)
    lines.append(f"STATE-COLOUR-UNCONTROLLED (priority) — {len(report['findings_state'])} finding(s)")
    lines.append('Element has a BASE colour attribute, but this hover/focus/active/disabled')
    lines.append('rule paints a colour no attribute governs.')
    lines.append('-' * 78)
    if by_state:
        lines.append('By state: ' + ', '.join(f'{k}={v}' for k, v in sorted(by_state.items())))
    per_block = defaultdict(list)
    for f in report['findings_state']:
        per_block[f['block_slug']].append(f)
    for block_slug in sorted(per_block):
        lines.append(f"\n[{block_slug}] ({len(per_block[block_slug])})")
        for f in per_block[block_slug]:
            lines.append(_fmt_finding(f))

    lines.append('')
    lines.append('-' * 78)
    lines.append(f"BASE-COLOUR-UNCONTROLLED — {len(report['findings_base'])} finding(s)")
    lines.append('Element has NO colour attribute at all for this property.')
    lines.append('-' * 78)
    if by_state_base:
        lines.append('By state: ' + ', '.join(f'{k}={v}' for k, v in sorted(by_state_base.items())))
    per_block_base = defaultdict(list)
    for f in report['findings_base']:
        per_block_base[f['block_slug']].append(f)
    for block_slug in sorted(per_block_base):
        lines.append(f"\n[{block_slug}] ({len(per_block_base[block_slug])})")
        for f in per_block_base[block_slug]:
            lines.append(_fmt_finding(f))

    lines.append('')
    lines.append('-' * 78)
    lines.append(f"UNCLEAR (element unresolved / value ambiguous) — {len(report['unclear'])} — NOT counted as a defect")
    lines.append('-' * 78)
    unclear_by_block = defaultdict(int)
    for u in report['unclear']:
        unclear_by_block[u['block_slug']] += 1
    for block_slug, count in sorted(unclear_by_block.items(), key=lambda kv: -kv[1])[:20]:
        lines.append(f"  - {block_slug}: {count}")
    if len(unclear_by_block) > 20:
        lines.append(f"  ... and {len(unclear_by_block) - 20} more block(s) with unclear entries")

    if not report['findings_state'] and not report['findings_base']:
        lines.append('')
        lines.append('Clean — no base or state colour-coverage findings.')

    return '\n'.join(lines)


def render_json(report):
    return json.dumps(report, indent=2)


# ---------------------------------------------------------------------------
# Self-test — proves the detector can FAIL.
# ---------------------------------------------------------------------------

def self_test():
    passed = 0
    failed = []

    def check(name, condition):
        nonlocal passed
        if condition:
            passed += 1
        else:
            failed.append(name)

    # --- POSITIVE CONTROL: a hardcoded :hover colour must be flagged -------
    fixture_attrs = [
        {'attr_name': 'titleColour', 'css_element': 'title', 'css_property': ['color'], 'css_state': None},
    ]
    fixture_db_elements = {'title'}
    hover_decl = {
        'block_slug': 'sgs/fixture', 'selector': '.sgs-fixture__title:hover',
        'element_guess': 'title', 'property': 'color', 'value': '#ff00ff',
        'state': 'hover', 'file': 'fixture.css', 'line': 10,
    }
    result = classify_declaration(hover_decl, '', fixture_attrs, fixture_db_elements)
    check(
        'POSITIVE: hardcoded hover colour with a base attr flags state-colour-uncontrolled',
        result is not None and result['kind'] == 'state-colour-uncontrolled',
    )

    # --- NEGATIVE CONTROL: theme-token value at BASE state is not a defect -
    base_decl = {
        'block_slug': 'sgs/fixture', 'selector': '.sgs-fixture__title',
        'element_guess': 'title', 'property': 'color',
        'value': 'var(--wp--preset--color--accent)',
        'state': 'base', 'file': 'fixture.css', 'line': 5,
    }
    result_theme = classify_declaration(base_decl, '', fixture_attrs, fixture_db_elements)
    check(
        'NEGATIVE: theme-token colour at BASE state is not flagged (element already has a base attr)',
        result_theme is None,
    )

    # --- SECOND NEGATIVE CONTROL: driven via a block-set --sgs-* custom
    # property is not flagged, even though it contains a literal fallback.
    php_source = "$css .= '.sgs-fixture__title{color:var(--sgs-fixture-title,' . $x . ');}';"
    driven_decl = {
        'block_slug': 'sgs/fixture', 'selector': '.sgs-fixture__title:hover',
        'element_guess': 'title', 'property': 'color',
        'value': 'var(--sgs-fixture-title, #ff00ff)',
        'state': 'hover', 'file': 'fixture.php', 'line': 20,
    }
    result_driven = classify_declaration(driven_decl, php_source, fixture_attrs, fixture_db_elements)
    check(
        'NEGATIVE: a hardcoded-looking value driven via a block-set --sgs-* custom property is not flagged',
        result_driven is None,
    )

    # --- BASE-COLOUR-UNCONTROLLED positive control --------------------------
    no_attr_decl = {
        'block_slug': 'sgs/fixture', 'selector': '.sgs-fixture__icon',
        'element_guess': 'icon', 'property': 'color', 'value': '#123456',
        'state': 'base', 'file': 'fixture.css', 'line': 30,
    }
    result_base = classify_declaration(no_attr_decl, '', fixture_attrs, fixture_db_elements)
    check(
        'POSITIVE: hardcoded base colour on an element with NO attribute at all flags base-colour-uncontrolled',
        result_base is not None and result_base['kind'] == 'base-colour-uncontrolled',
    )

    # --- classify_value unit checks ------------------------------------------
    b1, _ = classify_value('#ffffff', '')
    check('classify_value: bare hex is HARDCODED', b1 == 'HARDCODED')
    b2, _ = classify_value('var(--wp--preset--color--primary, #0f7e80)', '')
    check('classify_value: preset token (with fallback) is THEME', b2 == 'THEME')
    b3, _ = classify_value('transparent', '')
    check('classify_value: transparent is neutral THEME (not a paint)', b3 == 'THEME')
    b4, note4 = classify_value('var(--sgs-unknown-token, #ff0000)', '')
    check('classify_value: unresolved --sgs-* var (never set in render.php) is UNCLEAR', b4 == 'UNCLEAR')

    # --- state detection -----------------------------------------------------
    check('detect_states: :hover only', detect_states('.x:hover') == ['hover'])
    check(
        'detect_states: :hover + :focus-visible together reports BOTH, not collapsed',
        set(detect_states('.x:hover:focus-visible')) == {'hover', 'focus'},
    )
    check('detect_states: [open] maps to active', detect_states('.x[open]') == ['active'])
    check('detect_states: no pseudo maps to base', detect_states('.x') == ['base'])

    # --- element resolution ---------------------------------------------------
    check(
        'resolve_element: rightmost BEM class wins',
        resolve_element('.sgs-accordion-item__header:hover .sgs-accordion-item__icon-open') == 'icon-open',
    )
    el, conf = match_element_to_db('icon-open', {'icon'})
    check('match_element_to_db: suffix-stripped match', el == 'icon' and conf == 'suffix-stripped')
    el2, conf2 = match_element_to_db('link', {'item'})
    check('match_element_to_db: alias table (nav-menu link->item)', el2 == 'item' and conf2 == 'alias')
    el3, conf3 = match_element_to_db('totally-unknown-thing', {'item', 'icon'})
    check(
        'match_element_to_db: a real but uncovered element resolves to itself, unverified '
        '(zero DB rows is the base-uncontrolled signal, not an unresolvable name)',
        el3 == 'totally-unknown-thing' and conf3 == 'unverified',
    )

    # --- outline shorthand colour extraction ----------------------------------
    outline_hits = list(extract_colour_declarations(
        'outline', 'var(--wp--custom--focus-ring--width, 3px) solid var(--wp--custom--focus-ring--color-primary, rgba(31, 122, 122, 0.4))'
    ))
    check('extract_colour_declarations: outline shorthand yields an outline-color entry', len(outline_hits) == 1 and outline_hits[0][0] == 'outline-color')

    # --- REAL TREE assertions (the two hand-verified mandatory targets) ------
    if not os.path.isfile(DB_PATH):
        failed.append(f'REAL TREE: sgs-framework.db not found at {DB_PATH} — cannot run mandatory assertions')
    else:
        report = build_report(DB_PATH)
        accordion_hits = [
            f for f in (report['findings_state'] + report['findings_base'])
            if f['block_slug'] == 'sgs/accordion'
        ]
        check(
            'REAL TREE: sgs/accordion open/hover-state gap is found',
            any(f['state'] in ('active', 'hover') for f in accordion_hits),
        )
        tabs_hits = [
            f for f in (report['findings_state'] + report['findings_base'])
            if f['block_slug'] == 'sgs/tabs'
        ]
        check(
            'REAL TREE: sgs/tabs focus-visible gap is found',
            any(f['state'] == 'focus' for f in tabs_hits),
        )

    print(f'Self-test: {passed} passed, {len(failed)} failed')
    for f in failed:
        print(f'  FAIL: {f}')
    return len(failed) == 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Read-only census of colours painted by sgs/ blocks with no client-facing attribute.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('--survey', action='store_true', help='Run the census (default action).')
    parser.add_argument('--json', action='store_true', help='Emit machine-readable JSON instead of the human report.')
    parser.add_argument('--check', action='store_true', help='ADVISORY ONLY — prints findings, always exits 0. See module docstring.')
    parser.add_argument('--self-test', action='store_true', help='Run the detector self-test (proves it can FAIL) and exit.')
    parser.add_argument('--db-path', default=DB_PATH, help='Override the sgs-framework.db path (read-only).')
    args = parser.parse_args()

    if args.self_test:
        ok = self_test()
        sys.exit(0 if ok else 1)

    if not os.path.isfile(args.db_path):
        print(f'ERROR: sgs-framework.db not found at {args.db_path}', file=sys.stderr)
        sys.exit(2)

    report = build_report(args.db_path)

    if args.check:
        # ADVISORY ONLY (see module docstring) — always exits 0 on this
        # first version, regardless of findings.
        print(f"[survey-colour-coverage] ADVISORY — {len(report['findings_state'])} state + "
              f"{len(report['findings_base'])} base finding(s) across "
              f"{len(report['blocks_with_findings'])} block(s). Not gating yet — see module docstring "
              f"promotion trigger.")
        if args.json:
            print(render_json(report))
        sys.exit(0)

    if args.json:
        print(render_json(report))
    else:
        print(render_human(report))


if __name__ == '__main__':
    main()
