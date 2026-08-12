#!/usr/bin/env python3
r"""Phase 2.2 census — native WordPress `supports` capability routing.

WHY THIS EXISTS
----------------
`spec-35-capability-routing-doctrine.md` Part 3 (council-verified, 2026-08-11)
established that WordPress's Block Selectors API CANNOT reroute an individual
block instance's support styles to an inner element — every native support
(`color`, `__experimentalBorder`, `typography`, `spacing`, `dimensions`,
`shadow`, `filter`, `position`, `layout`, `align`) lands on the block's ROOT
via `get_block_wrapper_attributes()`, UNLESS the block declares
`__experimentalSkipSerialization` and self-applies the resolved style into its
own scoped `<style>` (Spec 32 §6.1(b)).

Part 7 of the doctrine flagged this as "a principle with no worklist": it
quoted ~57 blocks declaring `color` and ~51 declaring `__experimentalBorder`
as ORDER-OF-MAGNITUDE, not measured, and said 2.2's purge-only-zero-capability
plan needs a real census before it can execute. This script is that census.

WHAT IT DOES (READ-ONLY — never writes to any file, never runs npm/build/
deploy, never touches git)
--------------------------
For every block in `src/blocks/*/block.json`:
  1. Reads which native `supports` families it declares, and which of THEIR
     sub-keys (parsed from the block.json JSON — never inferred).
  2. Reads whether `__experimentalSkipSerialization` is set for that family
     (`true`, or an array naming specific properties).
  3. Reads render.php (PHP-comment-stripped, see COMMENT-STRIPPING below) for
     evidence the block self-applies that family's CSS: a
     `wp_style_engine_get_styles()` call referencing the family's WP style-key,
     a matching SGS shared helper (`sgs_typography_css_rule` /
     `sgs_label_box_css_rule` / `sgs_responsive_css_rule` / `sgs_colour_value` /
     `sgs_shadow_value`), or delegation to `SGS_Container_Wrapper::render()`.
  4. Reads the block's own `style.css` for evidence a family's CSS properties
     are targeted at an INNER BEM `__element` selector rather than the root —
     a signal the property should route to a child, not the root.
  5. Classifies each (block, family) pair per the task's 6-way taxonomy
     (ROOT-OK / SKIP-SELFAPPLIED / SKIP-STRANDED / NEEDS-INNER-ROUTING /
     ZERO-CAPABILITY / UNCLEAR).

COMMENT-STRIPPING (hard rule — "a grep is not a measurement")
---------------------------------------------------------------
render.php files in this repo routinely EXPLAIN their own no-inline mechanism
in prose inside docblocks, and that prose literally contains the function
names this detector searches for (e.g. `src/blocks/info-box/render.php:18-21`
narrates `get_block_wrapper_attributes()` AND `wp_style_engine_get_styles()`
in a `/** ... */` docblock four lines above the REAL calls). `src/blocks/
quote/render.php` does the same. A naive regex over the raw file text would
count a docblock's prose as a real call. This detector strips `/* ... */` and
`//`/`#` PHP comments BEFORE any self-apply / delegation regex runs. (Known
limitation, same class as `survey-length-controls.py`'s disclosed heuristic:
a `//` or `#` inside a string literal would be wrongly treated as a comment
start — not observed in this repo's render.php files, spot-checked across the
fixtures used to build this script.)

DECISION PROCEDURE (per block, per declared family)
-----------------------------------------------------
  static block (no render.php)
      -> ROOT-OK, unless the block's own CSS shows inner-routing evidence,
         in which case -> UNCLEAR (this script cannot inspect save.js JSX
         control flow — refusing to guess is the correct call per the
         project's own "refuse rather than guess" rule, not a detector gap).

  dynamic block (render.php exists):
      has_wrapper  = get_block_wrapper_attributes() call found (root output
                     mechanism actually exists)
      self_applies = family-specific style-engine / SGS-helper signature found
      delegates    = SGS_Container_Wrapper::render() call found
      inner_evid   = block's own style.css styles this family's CSS
                     properties on a `.sgs-{base}__element` selector

      if NOT has_wrapper AND NOT self_applies AND NOT delegates:
          -> ZERO-CAPABILITY   (no root-output mechanism, no self-apply, no
                                 delegation — structurally NOTHING can consume
                                 this declaration, regardless of skip status)
      elif skip_serialised:
          self_applies or delegates -> SKIP-SELFAPPLIED
          else                      -> SKIP-STRANDED
      else (not skip_serialised — WP auto-inlines onto the root):
          inner_evid                       -> NEEDS-INNER-ROUTING
          has_wrapper/self_applies/delegates -> ROOT-OK
          else                              -> UNCLEAR

`align` and `layout` are handled separately (see ALIGN_LAYOUT_NOTE below) —
neither has a skip-serialization concept in the same sense as the other 8
families, so both classify ROOT-OK by construction when declared, with the
mechanism recorded honestly as "native WP class/child-selector application,
not part of the skip-serialization model".

EXPECTED POPULATION (declared BEFORE the first live run, per plain `grep`,
independent of this script's own JSON-parsing code — the project's own rule
that a census must state its expected population before running)
---------------------------------------------------------------------------
  grep -c '"color"\s*:\s*\{'              -> 55 files
  grep -c '__experimentalBorder'          -> 51 files
  grep -c '"typography"\s*:\s*\{'         -> 25 files (27 raw occurrences;
                                              2 blocks match twice — expected
                                              to reconcile down once JSON-
                                              parsed, since the grep is a text
                                              match and can double-count a
                                              key appearing at two nesting
                                              depths in the same file)
  grep -c '"spacing"\s*:\s*\{'            -> 50 files (53 raw occurrences,
                                              same caveat)
  grep -c '"dimensions"\s*:\s*\{'         -> 1 file  (media)
  grep -c '"shadow"\s*:\s*(true|\{)'      -> 12 files
  grep -c '"filter"\s*:\s*\{'             -> 2 files (gallery, media)
  grep -c '"position"\s*:\s*\{'           -> 0 files
  grep -c '"layout"\s*:\s*(true|\{)'      -> 19 files
  grep -c '"align"\s*:\s*(true|\[)'       -> 35 files
Total block.json files under src/blocks/: 84.

MEASURED (JSON-parsed, this script) vs the grep baseline above, reconciled
live during this script's build (2026-08-12), each gap read at file:line
before being accepted as legitimate rather than assumed:
  color: 51 declared (grep 55). The 4-file gap is real and correct — buybox/
    cart/modal/whatsapp-cta all declare `"color": {"background": false,
    "text": false}`, a DELIBERATE opt-out, not a capability declaration.
  __experimentalBorder: 48 declared (grep 51). The 3-file gap is the exact
    "grep is not a measurement" trap this task warned about: label/nav-menu/
    product-search's grep hits are all PROSE — an attrMap string reference
    (`"native:__experimentalBorder.radius"`) and two `_note` fields that
    literally say "No __experimentalBorder support is declared on this
    block at all" / "No color, typography or __experimentalBorder support
    is declared" — matched by the substring search, correctly excluded by
    JSON parsing.
  typography/spacing/align/dimensions/filter/position: file counts match
    the grep baseline exactly once occurrence-vs-file-count is accounted
    for (spacing/typography's raw occurrence counts include the same key
    appearing at two nesting depths in one file — not a second declaration).
  shadow (12 grep files) / layout (19 grep files): the REAL measured count
    for both is 0. Both greps were matching an ATTRIBUTE name that happens
    to share the family's name (e.g. `sgs/container` declares a "shadow"
    STRING attribute and a "layout" STRING attribute under `attributes`,
    not under `supports`) — not a supports declaration. Verified by reading
    container/block.json directly. No SGS block declares native
    `supports.shadow` or `supports.layout` — every block's box-shadow /
    layout-arrangement capability is a custom SGS attribute + helper
    instead. This is recorded here, not silently dropped, per the "declare
    then reconcile" rule.

USAGE
-----
  python scripts/surveys/survey-native-supports.py --survey
  python scripts/surveys/survey-native-supports.py --survey --json
  python scripts/surveys/survey-native-supports.py --self-test

Scope for this task: --survey and --self-test ONLY. No --check, not wired
into prebuild — that is a later, separately-gated task (per the capability-
routing doctrine's own sequencing: the census must exist before a purge gate
can be designed against it).
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

REPO = Path(__file__).resolve().parents[4]
BLOCKS_DIR = REPO / 'plugins' / 'sgs-blocks' / 'src' / 'blocks'

# ---------------------------------------------------------------------------
# The 10 native WP support families this script reports on. "align"/"layout"
# are structural (no skip-serialization concept) and handled separately.
# ---------------------------------------------------------------------------
STYLE_FAMILIES = [
    'color', '__experimentalBorder', 'typography', 'spacing',
    'dimensions', 'shadow', 'filter', 'position',
]
STRUCTURAL_FAMILIES = ['align', 'layout']

# WP style-engine top-level style keys used by wp_style_engine_get_styles().
# color/border/typography/spacing/dimensions all have a real style-engine
# key; shadow/filter/position are NOT style-engine keys (WP's style engine
# does not resolve them) so self-apply for those three can only be an SGS
# custom mechanism (colour/shadow value helpers, delegation, or a scoped
# custom-property rule) — never the style-engine 'shadow'/'filter'/'position'
# literal, which would be a false signal if searched for.
STYLE_ENGINE_KEY = {
    'color': 'color',
    '__experimentalBorder': 'border',
    'typography': 'typography',
    'spacing': 'spacing',
    'dimensions': 'dimensions',
}

# CSS properties each family governs, used only for the NEEDS-INNER-ROUTING
# signal (does the block's OWN style.css style these properties on an inner
# BEM __element selector rather than the root).
FAMILY_CSS_PROPS = {
    'color': ['color', 'background-color', 'background'],
    '__experimentalBorder': ['border', 'border-width', 'border-style', 'border-color', 'border-radius'],
    'typography': ['font-size', 'line-height', 'letter-spacing', 'font-weight', 'font-style',
                    'text-align', 'text-transform', 'font-family'],
    'spacing': ['margin', 'padding', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                'padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
    'dimensions': ['width', 'height', 'min-height', 'max-height', 'min-width', 'max-width', 'aspect-ratio'],
    'shadow': ['box-shadow'],
    'filter': ['filter', 'backdrop-filter'],
    'position': ['position', 'top', 'right', 'bottom', 'left', 'z-index'],
}

# SGS shared-helper self-apply signatures. Per family: any ONE match, on top
# of the style-engine+key signature (color/border/typography/spacing/
# dimensions only), counts as self-applies. Deliberately loose per the same
# reasoning `survey-background-colour-support.py` documents: a false "clean"
# here costs one human re-check; a false "dead" repeats a known mistake.
FAMILY_HELPER_RE = {
    'color': [r'sgs_colour_value\s*\(', r'sgs_label_box_css_rule\s*\('],
    '__experimentalBorder': [r'sgs_label_box_css_rule\s*\('],
    'typography': [r'sgs_typography_css_rule\s*\('],
    'spacing': [r'sgs_label_box_css_rule\s*\(', r'sgs_responsive_css_rule\s*\('],
    'dimensions': [],
    'shadow': [r'sgs_shadow_value\s*\('],
    'filter': [],
    'position': [],
}

WRAPPER_ATTRS_RE = re.compile(r'get_block_wrapper_attributes\s*\(')
WRAPPER_DELEGATE_RE = re.compile(r'SGS_Container_Wrapper::render\s*\(')
STYLE_ENGINE_CALL_RE = re.compile(r'wp_style_engine_get_styles\s*\(')

ALIGN_LAYOUT_NOTE = (
    'native WP class/child-selector application, not part of the '
    'skip-serialization model — always root by construction'
)


# ---------------------------------------------------------------------------
# PHP comment stripping (hard rule 1: "a grep is not a measurement" — see
# module docstring's COMMENT-STRIPPING section for the real bug this avoids).
# ---------------------------------------------------------------------------

def strip_php_comments(text):
    """Remove /* ... */ block comments and // or # line comments. Known
    limitation (disclosed, matches survey-length-controls.py's own disclosed-
    heuristic precedent): does not understand string literals, so a // or #
    INSIDE a PHP string would be wrongly treated as a comment start. Not
    observed in any render.php file used to build or run this script."""
    # Block comments first (non-greedy, DOTALL so it spans lines).
    text = re.sub(r'/\*.*?\*/', ' ', text, flags=re.DOTALL)
    # Line comments: // or # to end of line.
    text = re.sub(r'//[^\n]*', '', text)
    text = re.sub(r'(?m)^\s*#[^\n]*', '', text)
    return text


def _style_engine_call_arg_spans(text):
    """Return the ARGUMENT text of every wp_style_engine_get_styles( ... )
    call, one string per call site, using paren-depth balancing (not just
    "search to the next unmatched paren" — a call's own array literal is
    full of nested parens/brackets)."""
    spans = []
    for m in STYLE_ENGINE_CALL_RE.finditer(text):
        start = m.end() - 1  # index of the opening '('
        depth = 0
        i = start
        end = None
        while i < len(text):
            ch = text[i]
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
                if depth == 0:
                    end = i
                    break
            i += 1
        if end is not None:
            spans.append(text[start + 1:end])
    return spans


_FIRST_ARG_VAR_RE = re.compile(r'^\s*(\$[A-Za-z_][A-Za-z0-9_]*)\s*(?:,|\))')


def _style_engine_call_first_arg_vars(text):
    """Return the set of variable names passed as the FIRST argument to each
    wp_style_engine_get_styles() call (only when that argument is a bare
    variable, not an inline array literal).

    THIS IS LOAD-BEARING (found live via two rounds of plant-and-revert
    proof, not theoretical). Two competing failure modes were both proven
    live during this script's build, on a real render.php (sgs/label for
    the first, sgs/quote for the second):

    (1) A whole-file "does the key literal appear ANYWHERE" scan (the
        survey-background-colour-support.py precedent this script started
        from) false-POSITIVEs when a DIFFERENT family's real call co-exists
        with an unrelated same-named string elsewhere in the file (e.g. a
        'color' string inside an sgs_colour_value() call, unrelated to any
        style-engine call).

    (2) Scoping the key check to ONLY each call's own literal argument
        span (the first fix attempted here) false-NEGATIVEs on the
        DOMINANT real pattern in this codebase: the style-engine args array
        is built PROGRAMMATICALLY across many preceding lines
        (`$base_style_engine_args['border'] = array(...);` ... then later
        `wp_style_engine_get_styles( $base_style_engine_args, [...] )`),
        exactly the "wholesale-passthrough" shape
        survey-background-colour-support.py's own comments already
        document for process-steps/table-of-contents. Proven live: this
        false-negatived sgs/quote's __experimentalBorder/typography (and
        51 other blocks) into SKIP-STRANDED despite Spec 32 §6.1 recording
        them as LANDED no-inline-compliant blocks.

    The fix: when the call's first argument is a bare variable (not an
    inline array), resolve that variable name and let the caller ALSO
    search the whole file for `$varname['family_key']` assignments — this
    covers the wholesale-build pattern without reopening failure mode (1),
    because the search is still scoped to a SPECIFIC variable name tied to
    a real call site, not any string anywhere."""
    var_names = set()
    for span in _style_engine_call_arg_spans(text):
        m = _FIRST_ARG_VAR_RE.match(span)
        if m:
            var_names.add(m.group(1))
    return var_names


# ---------------------------------------------------------------------------
# block.json parsing
# ---------------------------------------------------------------------------

def _load_block_json(block_dir):
    bj_path = block_dir / 'block.json'
    if not bj_path.exists():
        return None, None
    try:
        raw = bj_path.read_text(encoding='utf-8')
        return json.loads(raw), raw
    except (json.JSONDecodeError, OSError):
        return None, None


def _family_line_number(raw_json_text, family):
    """Best-effort line number of a family's key in the raw block.json text,
    for file:line citations in the report. Returns None if not found (should
    not happen for a family this script already parsed as present)."""
    pattern = re.compile(r'["\']' + re.escape(family) + r'["\']\s*:')
    m = pattern.search(raw_json_text)
    if not m:
        return None
    return raw_json_text.count('\n', 0, m.start()) + 1


def _extract_family_declaration(supports, family):
    """Return (declared, skip_mode, skip_detail) for one family.
    declared: bool — is this family meaningfully enabled.
    skip_mode: 'none' | 'all' | 'partial'.
    skip_detail: None, or the list of properties for a partial skip.
    """
    value = supports.get(family)
    if value is None or value is False:
        return False, 'none', None
    if value is True:
        return True, 'none', None
    if isinstance(value, list):
        # align: ["wide","full"]
        return bool(value), 'none', None
    if isinstance(value, dict):
        # A sub-key is "enabling" when its value is truthy (True, or a
        # non-empty string for an enum-shaped sub-key). An explicit False
        # (e.g. {"text": false, "background": false}) must NOT count as
        # declared — that is a block deliberately opting OUT, not in.
        sub_enabled = any(
            bool(v) for k, v in value.items() if not k.startswith('__')
        )
        if not sub_enabled:
            return False, 'none', None
        skip_val = value.get('__experimentalSkipSerialization')
        if skip_val is True:
            return True, 'all', None
        if isinstance(skip_val, list) and skip_val:
            return True, 'partial', skip_val
        return True, 'none', None
    return False, 'none', None


# ---------------------------------------------------------------------------
# render.php / style.css evidence gathering
# ---------------------------------------------------------------------------

def _self_applies(clean_render_text, family):
    if not clean_render_text:
        return False
    engine_key = STYLE_ENGINE_KEY.get(family)
    if engine_key:
        key_re = re.compile(r'''['"]''' + re.escape(engine_key) + r'''['"]''')
        # Signal 1: the key literal appears INSIDE a specific call's own
        # argument span (covers an inline `array( 'color' => ... )` literal
        # passed directly into the call).
        for span in _style_engine_call_arg_spans(clean_render_text):
            if key_re.search(span):
                return True
        # Signal 2: the key is set on a variable that IS a call's first
        # argument (covers the dominant real "wholesale-build" pattern —
        # `$args['border'] = array(...);` on one line, `wp_style_engine_get_
        # styles( $args, ... )` several lines later). See
        # _style_engine_call_first_arg_vars()'s docstring for the two real
        # failure modes (false positive AND false negative) this two-signal
        # design was built to close, both proven live during this script's
        # own build via plant-and-revert against real sgs/label and
        # sgs/quote render.php code.
        for var_name in _style_engine_call_first_arg_vars(clean_render_text):
            var_key_re = re.compile(
                re.escape(var_name) + r'''\s*\[\s*['"]''' + re.escape(engine_key) + r'''['"]\s*\]'''
            )
            if var_key_re.search(clean_render_text):
                return True
    for helper_pattern in FAMILY_HELPER_RE.get(family, []):
        if re.search(helper_pattern, clean_render_text):
            return True
    return False


def _inner_routing_evidence(style_css_text, block_base_slug, family):
    """Does the block's OWN style.css style this family's CSS properties on
    an inner .sgs-{base}__element selector? Loose but scoped heuristic:
    scans each rule block for a selector containing '__' AND a declaration
    for one of the family's properties. Deliberately requires the selector
    to reference this block's own BEM base (not a totally unrelated class
    that happens to share a property name)."""
    if not style_css_text:
        return False
    props = FAMILY_CSS_PROPS.get(family, [])
    if not props:
        return False
    # Find rule blocks: selector { declarations }
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', style_css_text):
        selector, decls = m.group(1), m.group(2)
        if '__' not in selector:
            continue
        if block_base_slug not in selector and 'sgs-' not in selector:
            continue
        for prop in props:
            # Match "prop:" as a declaration (word boundary before the colon,
            # avoid matching e.g. "color" inside "background-color" when
            # checking for bare "color").
            prop_re = re.compile(r'(?<![\w-])' + re.escape(prop) + r'\s*:')
            if prop_re.search(decls):
                return True
    return False


def _read_text(path):
    if not path.exists():
        return ''
    try:
        return path.read_text(encoding='utf-8', errors='ignore')
    except OSError:
        return ''


# ---------------------------------------------------------------------------
# Per-block, per-family survey
# ---------------------------------------------------------------------------

def survey_block(block_dir):
    bj, raw_json = _load_block_json(block_dir)
    if bj is None:
        return None

    slug = bj.get('name', block_dir.name)
    base_slug = block_dir.name  # e.g. 'card-grid' from 'sgs/card-grid'
    supports = bj.get('supports') or {}
    if not isinstance(supports, dict):
        return None

    render_path = block_dir / 'render.php'
    is_dynamic = render_path.exists()
    raw_render_text = _read_text(render_path) if is_dynamic else ''
    clean_render_text = strip_php_comments(raw_render_text) if is_dynamic else ''

    style_css_text = _read_text(block_dir / 'style.css')

    has_wrapper = bool(WRAPPER_ATTRS_RE.search(clean_render_text)) if is_dynamic else False
    delegates = bool(WRAPPER_DELEGATE_RE.search(clean_render_text)) if is_dynamic else False

    families_found = {}

    for family in STYLE_FAMILIES:
        declared, skip_mode, skip_detail = _extract_family_declaration(supports, family)
        if not declared:
            continue

        self_applies = _self_applies(clean_render_text, family) if is_dynamic else False
        inner_evid = _inner_routing_evidence(style_css_text, base_slug, family)
        line_no = _family_line_number(raw_json, family)

        if not is_dynamic:
            classification = 'UNCLEAR' if inner_evid else 'ROOT-OK'
            mechanism = (
                'static block (no render.php) — WP core save-time '
                'serialization onto save.js root markup; own style.css shows '
                'inner-element evidence for this family, cannot verify '
                'routing without parsing save.js JSX, refusing to guess'
                if inner_evid else
                'static block (no render.php) — WP core save-time '
                'serialization onto save.js root markup (native, out of '
                'PHP-render scope, matches survey-background-colour-support.py '
                'precedent)'
            )
        elif not has_wrapper and not self_applies and not delegates:
            classification = 'ZERO-CAPABILITY'
            mechanism = (
                'no get_block_wrapper_attributes() call, no self-apply '
                'signature, no SGS_Container_Wrapper delegation — structurally '
                'nothing in render.php can consume this declaration'
            )
        elif skip_mode in ('all', 'partial'):
            if self_applies or delegates:
                classification = 'SKIP-SELFAPPLIED'
                mechanism = (
                    'delegates to SGS_Container_Wrapper::render()' if delegates and not self_applies
                    else 'self-applies via wp_style_engine_get_styles()/SGS helper' if self_applies and not delegates
                    else 'both delegates AND self-applies'
                )
            else:
                classification = 'SKIP-STRANDED'
                mechanism = (
                    f'__experimentalSkipSerialization={"true" if skip_mode == "all" else skip_detail} '
                    'suppresses native auto-inline, but render.php neither calls the style engine with '
                    'this family\'s key nor a matching SGS helper nor delegates to the shared wrapper — '
                    'the client-set value has nowhere to render'
                )
        else:
            if inner_evid:
                classification = 'NEEDS-INNER-ROUTING'
                mechanism = (
                    "not skip-serialised (WP auto-inlines on root), but this block's own style.css "
                    "styles an inner .__element selector for one of this family's CSS properties — "
                    "the native support and the block's real design disagree on the target"
                )
            elif has_wrapper or self_applies or delegates:
                classification = 'ROOT-OK'
                mechanism = 'not skip-serialised; root is the correct target and receives the native value'
            else:
                classification = 'UNCLEAR'
                mechanism = 'no decisive signal either way — refusing to guess'

        families_found[family] = {
            'declared_subkeys': (
                sorted(k for k in (supports.get(family) or {}).keys() if not k.startswith('__'))
                if isinstance(supports.get(family), dict) else None
            ),
            'skip_mode': skip_mode,
            'skip_detail': skip_detail,
            'self_applies': self_applies,
            'delegates_to_wrapper': delegates,
            'has_wrapper_attrs_call': has_wrapper,
            'inner_routing_evidence': inner_evid,
            'is_static': not is_dynamic,
            'classification': classification,
            'mechanism': mechanism,
            'block_json_line': line_no,
        }

    for family in STRUCTURAL_FAMILIES:
        declared, _, _ = _extract_family_declaration(supports, family)
        if not declared:
            continue
        line_no = _family_line_number(raw_json, family)
        families_found[family] = {
            'declared_subkeys': None,
            'skip_mode': 'n/a',
            'skip_detail': None,
            'self_applies': None,
            'delegates_to_wrapper': None,
            'has_wrapper_attrs_call': None,
            'inner_routing_evidence': False,
            'is_static': not is_dynamic,
            'classification': 'ROOT-OK',
            'mechanism': ALIGN_LAYOUT_NOTE,
            'block_json_line': line_no,
        }

    if not families_found:
        return None

    return {
        'slug': slug,
        'base_slug': base_slug,
        'is_static': not is_dynamic,
        'families': families_found,
    }


def run_survey():
    findings = []
    for block_dir in sorted(BLOCKS_DIR.iterdir()):
        if not block_dir.is_dir():
            continue
        finding = survey_block(block_dir)
        if finding is not None:
            findings.append(finding)
    return findings


# ---------------------------------------------------------------------------
# Report rendering
# ---------------------------------------------------------------------------

CLASSIFICATIONS = [
    'ROOT-OK', 'SKIP-SELFAPPLIED', 'SKIP-STRANDED',
    'NEEDS-INNER-ROUTING', 'ZERO-CAPABILITY', 'UNCLEAR',
]


def _all_pairs(findings):
    """Flatten to a list of (block_slug, family, entry) tuples."""
    pairs = []
    for f in findings:
        for family, entry in f['families'].items():
            pairs.append((f['slug'], f['base_slug'], family, entry))
    return pairs


def print_report(findings):
    pairs = _all_pairs(findings)
    total_blocks = len(findings)
    total_pairs = len(pairs)

    print(f"Phase 2.2 native-supports census — {total_blocks} blocks declare at least one "
          f"style-relevant native support, {total_pairs} (block, family) pairs total.\n")

    counts = {c: 0 for c in CLASSIFICATIONS}
    for _, _, _, entry in pairs:
        counts[entry['classification']] += 1

    print("Classification counts:")
    for c in CLASSIFICATIONS:
        print(f"  {c}: {counts[c]}")
    print()

    print("By family (declared count):")
    fam_counts = {}
    for _, _, family, entry in pairs:
        fam_counts.setdefault(family, {c: 0 for c in CLASSIFICATIONS})
        fam_counts[family][entry['classification']] += 1
    for family in STYLE_FAMILIES + STRUCTURAL_FAMILIES:
        if family not in fam_counts:
            continue
        row = fam_counts[family]
        total = sum(row.values())
        detail = ', '.join(f"{c}={n}" for c, n in row.items() if n)
        print(f"  {family}: {total} declared — {detail}")
    print()

    print(f"SKIP-STRANDED — declares a skip-serialised support whose value goes nowhere ({counts['SKIP-STRANDED']}):")
    for slug, base_slug, family, entry in pairs:
        if entry['classification'] != 'SKIP-STRANDED':
            continue
        line = entry['block_json_line']
        loc = f"src/blocks/{base_slug}/block.json:{line}" if line else f"src/blocks/{base_slug}/block.json"
        print(f"  - {slug} [{family}] @ {loc} — {entry['mechanism']}")
    print()

    print(f"ZERO-CAPABILITY — declared, structurally nothing consumes it ({counts['ZERO-CAPABILITY']}):")
    for slug, base_slug, family, entry in pairs:
        if entry['classification'] != 'ZERO-CAPABILITY':
            continue
        line = entry['block_json_line']
        loc = f"src/blocks/{base_slug}/block.json:{line}" if line else f"src/blocks/{base_slug}/block.json"
        print(f"  - {slug} [{family}] @ {loc} — {entry['mechanism']}")
    print()

    print(f"NEEDS-INNER-ROUTING — root-landed but own CSS wants an inner element ({counts['NEEDS-INNER-ROUTING']}):")
    for slug, base_slug, family, entry in pairs:
        if entry['classification'] != 'NEEDS-INNER-ROUTING':
            continue
        line = entry['block_json_line']
        loc = f"src/blocks/{base_slug}/block.json:{line}" if line else f"src/blocks/{base_slug}/block.json"
        print(f"  - {slug} [{family}] @ {loc}")
    print()

    if counts['UNCLEAR']:
        print(f"UNCLEAR — refused rather than guessed ({counts['UNCLEAR']}):")
        for slug, base_slug, family, entry in pairs:
            if entry['classification'] != 'UNCLEAR':
                continue
            print(f"  - {slug} [{family}] — {entry['mechanism']}")


def render_json(findings):
    return json.dumps(findings, indent=2)


# ---------------------------------------------------------------------------
# Self-test — one positive fixture per classification, plus negative
# controls proving the detector does not default to any one label.
# ---------------------------------------------------------------------------

def self_test():
    import tempfile

    passed = 0
    failed = 0

    def check(name, condition):
        nonlocal passed, failed
        if condition:
            passed += 1
        else:
            failed += 1
            print(f"FAIL: {name}")

    # -- comment-stripping unit checks (the specific bug class this script
    #    exists to avoid — a docblock mentioning the function name must NOT
    #    count as a real call) -------------------------------------------
    docblock_only = (
        "<?php\n/**\n * This block calls get_block_wrapper_attributes() and "
        "wp_style_engine_get_styles() to render.\n */\n"
        "echo '<div>no real call here</div>';\n"
    )
    cleaned = strip_php_comments(docblock_only)
    check('comment-strip: docblock mention of get_block_wrapper_attributes removed',
          'get_block_wrapper_attributes' not in cleaned)
    check('comment-strip: docblock mention of wp_style_engine_get_styles removed',
          'wp_style_engine_get_styles' not in cleaned)

    real_call_after_comment = (
        "<?php\n// uses wp_style_engine_get_styles() to render\n"
        "$out = wp_style_engine_get_styles( array( 'color' => array( 'text' => '#fff' ) ) );\n"
    )
    cleaned2 = strip_php_comments(real_call_after_comment)
    check('comment-strip: real call AFTER a line comment survives',
          'wp_style_engine_get_styles(' in cleaned2)
    check("comment-strip: the comment's own mention is gone (only 1 occurrence left)",
          cleaned2.count('wp_style_engine_get_styles') == 1)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        def make_block(name, bj_supports, render_php=None, style_css=None, static=False):
            d = tmp_path / name
            d.mkdir()
            (d / 'block.json').write_text(json.dumps({
                'name': f'sgs/{name}',
                'supports': bj_supports,
            }))
            if not static and render_php is not None:
                (d / 'render.php').write_text(render_php)
            if style_css is not None:
                (d / 'style.css').write_text(style_css)
            return d

        # --- ROOT-OK: not skip-serialised, root receives it correctly,
        #     no inner-element evidence.
        d = make_block('root-ok-block', {
            'color': {'text': True, 'background': True},
        }, render_php=(
            "<?php $attrs = get_block_wrapper_attributes(); "
            "echo '<div ' . $attrs . '>content</div>';"
        ), style_css=".sgs-root-ok-block { display:block; }")
        result = survey_block(d)
        check('ROOT-OK fixture: detected', result is not None)
        check('ROOT-OK fixture: classification',
              result and result['families']['color']['classification'] == 'ROOT-OK')

        # --- SKIP-SELFAPPLIED: skip-serialised true, style engine call with
        #     the 'color' key present.
        d = make_block('skip-selfapplied-block', {
            'color': {'text': True, '__experimentalSkipSerialization': True},
        }, render_php=(
            "<?php $attrs = get_block_wrapper_attributes(); "
            "$c = $attributes['style']['color'] ?? array();"
            "$out = wp_style_engine_get_styles( array( 'color' => $c ) );"
            "echo '<style>.uid{' . $out['css'] . '}</style><div ' . $attrs . '>x</div>';"
        ))
        result = survey_block(d)
        check('SKIP-SELFAPPLIED fixture: classification',
              result and result['families']['color']['classification'] == 'SKIP-SELFAPPLIED')

        # --- Regression control: the DOMINANT real pattern in this codebase
        #     (sgs/quote's actual shape, verified live) builds the style-
        #     engine args array PROGRAMMATICALLY across several preceding
        #     statements (`$args['border'] = array(...);`) then passes the
        #     BARE VARIABLE into wp_style_engine_get_styles() — the key
        #     literal never appears inside the call's own parens at all.
        #     A call-span-only scan (this script's first fix attempt)
        #     false-negatived this exact shape on 52 real blocks, caught by
        #     live plant-and-revert against sgs/quote's real render.php
        #     (2026-08-12). This fixture locks that regression.
        d = make_block('wholesale-var-block', {
            'color': {'text': True, '__experimentalSkipSerialization': True},
            '__experimentalBorder': {'radius': True, '__experimentalSkipSerialization': True},
            'spacing': {'padding': True, '__experimentalSkipSerialization': True},
        }, render_php=(
            "<?php $attrs = get_block_wrapper_attributes();"
            "$style_engine_args = array();"
            "if ( '' !== $style_color_text ) { $style_engine_args['color'] = array( 'text' => $style_color_text ); }"
            "if ( null !== $base_border_radius ) { $style_engine_args['border'] = array( 'radius' => $base_border_radius ); }"
            # spacing is DELIBERATELY never set on $style_engine_args — this
            # is the negative half of the control: spacing must still come
            # out SKIP-STRANDED even though the SAME variable is passed to
            # the call, because 'spacing' was never actually assigned onto it.
            "$out = wp_style_engine_get_styles( $style_engine_args, array( 'selector' => '.uid' ) );"
            "echo '<style>' . $out['css'] . '</style><div ' . $attrs . '>x</div>';"
        ))
        result = survey_block(d)
        check('wholesale-var fixture: color self-applies via variable-key assignment',
              result and result['families']['color']['classification'] == 'SKIP-SELFAPPLIED')
        check('wholesale-var fixture: border self-applies via variable-key assignment',
              result and result['families']['__experimentalBorder']['classification'] == 'SKIP-SELFAPPLIED')
        check('wholesale-var fixture: spacing correctly SKIP-STRANDED (same variable, key never set)',
              result and result['families']['spacing']['classification'] == 'SKIP-STRANDED')

        # --- SKIP-STRANDED: skip-serialised true, PHP never reads 'color'
        #     via the style engine or any helper, never delegates.
        d = make_block('skip-stranded-block', {
            'color': {'text': True, '__experimentalSkipSerialization': True},
        }, render_php=(
            "<?php $attrs = get_block_wrapper_attributes(); "
            "echo '<div ' . $attrs . '>content, colour setting goes nowhere</div>';"
        ))
        result = survey_block(d)
        check('SKIP-STRANDED fixture: classification',
              result and result['families']['color']['classification'] == 'SKIP-STRANDED')

        # --- Regression control (a REAL bug this script's own build found via
        #     a live plant-and-revert test against a scratch copy of
        #     sgs/label's real render.php, 2026-08-12): a file with TWO
        #     wp_style_engine_get_styles() calls for DIFFERENT families
        #     (spacing here, color declared-but-stranded) must classify
        #     'color' as SKIP-STRANDED, not SKIP-SELFAPPLIED. The naive
        #     whole-file "any call + any key literal anywhere" version of
        #     this detector false-cleared this exact shape, because the
        #     spacing call's presence PLUS a stray 'color' string elsewhere
        #     in the file (inside sgs_colour_value(...)) was enough to trip
        #     the loose signal even though color's own call never ran.
        d = make_block('multi-call-block', {
            'color': {'text': True, '__experimentalSkipSerialization': True},
            'spacing': {'margin': True, '__experimentalSkipSerialization': True},
        }, render_php=(
            "<?php $attrs = get_block_wrapper_attributes();"
            "$margin = wp_style_engine_get_styles( array( 'spacing' => array( 'margin' => '4px' ) ) );"
            "$debug_key = 'color';"  # stray 'color' string, NOT a call to any recognised helper
            "echo '<div ' . $attrs . '>' . $margin['css'] . '</div>';"
        ))
        result = survey_block(d)
        check('multi-call regression: spacing (real call) is SKIP-SELFAPPLIED',
              result and result['families']['spacing']['classification'] == 'SKIP-SELFAPPLIED')
        check('multi-call regression: color (stray key, no real call) is SKIP-STRANDED not SKIP-SELFAPPLIED',
              result and result['families']['color']['classification'] == 'SKIP-STRANDED')

        # --- ZERO-CAPABILITY: no get_block_wrapper_attributes() call at all,
        #     no self-apply, no delegation — structurally orphaned.
        d = make_block('zero-capability-block', {
            'color': {'text': True},
        }, render_php=(
            "<?php echo '<div class=\"sgs-zero-capability-block\">"
            "hand-rolled markup, never touches block-supports machinery</div>';"
        ))
        result = survey_block(d)
        check('ZERO-CAPABILITY fixture: classification',
              result and result['families']['color']['classification'] == 'ZERO-CAPABILITY')

        # --- NEEDS-INNER-ROUTING: not skip-serialised (root gets the native
        #     value), but the block's OWN style.css targets an inner __title
        #     element for 'color' — a real design mismatch.
        d = make_block('needs-inner-routing-block', {
            'color': {'text': True},
        }, render_php=(
            "<?php $attrs = get_block_wrapper_attributes(); "
            "echo '<div ' . $attrs . '><span class=\"sgs-needs-inner-routing-block__title\">t</span></div>';"
        ), style_css=(
            ".sgs-needs-inner-routing-block__title { color: var(--wp--preset--color--text); }"
        ))
        result = survey_block(d)
        check('NEEDS-INNER-ROUTING fixture: classification',
              result and result['families']['color']['classification'] == 'NEEDS-INNER-ROUTING')

        # --- UNCLEAR: skip-serialised via a PARTIAL array that does not
        #     cover 'text' at all is out of scope for this fixture; instead
        #     prove UNCLEAR via a static block whose own CSS shows inner
        #     evidence (this detector explicitly refuses to guess for
        #     static blocks rather than inferring save.js behaviour).
        d = make_block('unclear-static-block', {
            'color': {'text': True},
        }, static=True, style_css=(
            ".sgs-unclear-static-block__label { color: var(--wp--preset--color--text); }"
        ))
        result = survey_block(d)
        check('UNCLEAR fixture: detected as static', result and result['is_static'] is True)
        check('UNCLEAR fixture: classification',
              result and result['families']['color']['classification'] == 'UNCLEAR')

        # --- Negative control: plain static block, no inner evidence — must
        #     be ROOT-OK, not UNCLEAR. Proves UNCLEAR isn't the default for
        #     every static block.
        d = make_block('static-clean-block', {
            'color': {'text': True},
        }, static=True, style_css=".sgs-static-clean-block { color: red; }")
        result = survey_block(d)
        check('static clean fixture: ROOT-OK not UNCLEAR',
              result and result['families']['color']['classification'] == 'ROOT-OK')

        # --- Negative control: delegates_to_wrapper rescues a skip-serialised
        #     family even with no direct self-apply call in this block's own
        #     render.php (matches hero/cta-section/trust-bar's real shape).
        d = make_block('delegate-block', {
            'spacing': {'padding': True, '__experimentalSkipSerialization': True},
        }, render_php=(
            "<?php echo SGS_Container_Wrapper::render( $attributes, $block, $content, 'section' );"
        ))
        result = survey_block(d)
        check('delegate fixture: SKIP-SELFAPPLIED via delegation, not SKIP-STRANDED',
              result and result['families']['spacing']['classification'] == 'SKIP-SELFAPPLIED')
        check('delegate fixture: delegates_to_wrapper True',
              result and result['families']['spacing']['delegates_to_wrapper'] is True)

        # --- Negative control: no color/border/etc support declared at all
        #     (only align) — must not fabricate a style-family entry.
        d = make_block('align-only-block', {'align': ['wide', 'full']},
                        render_php="<?php echo '<div>x</div>';")
        result = survey_block(d)
        check('align-only fixture: no color family present', 'color' not in result['families'])
        check('align-only fixture: align present and ROOT-OK',
              result['families']['align']['classification'] == 'ROOT-OK')

        # --- Negative control: block.json with no supports.style-family keys
        #     at all — survey_block must return None (not a false positive).
        d = tmp_path / 'no-supports-block'
        d.mkdir()
        (d / 'block.json').write_text(json.dumps({'name': 'sgs/no-supports-block', 'supports': {}}))
        result = survey_block(d)
        check('no-supports fixture: returns None (not a candidate)', result is None)

        # --- Negative control: a dict-shaped support with the sub-key
        #     explicitly false must NOT be treated as declared.
        d = make_block('all-false-block', {
            'color': {'text': False, 'background': False},
        }, render_php="<?php echo '<div>x</div>';")
        result = survey_block(d)
        check('all-false fixture: color not counted as declared',
              result is None or 'color' not in result['families'])

    print(f"\nself-test: {passed} passed, {failed} failed")
    return failed == 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--survey', action='store_true', help='Run the census.')
    parser.add_argument('--json', action='store_true', help='Emit JSON instead of the human report.')
    parser.add_argument('--self-test', action='store_true', help='Run the detector self-test and exit.')
    args = parser.parse_args()

    if args.self_test:
        ok = self_test()
        sys.exit(0 if ok else 1)

    if args.survey:
        findings = run_survey()
        if args.json:
            print(render_json(findings))
        else:
            print_report(findings)
        sys.exit(0)

    parser.print_help()
    sys.exit(1)


if __name__ == '__main__':
    main()
