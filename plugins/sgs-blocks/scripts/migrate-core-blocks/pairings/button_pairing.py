#!/usr/bin/env python3
"""core/button -> sgs/button transformer (Track C pairing module).

Ground truth (button/block.json + render.php read 2026-07-16):
  supports.color        {background:true, text:true, link:false, skipSerialization}
  supports.spacing      {margin:true, padding:true, skipSerialization}
  supports.__experimentalBorder {radius:true, skipSerialization}
  attributes: label, url, linkTarget, rel, download, isSubmit, inheritStyle
              (enum primary|secondary|outline|custom), widthType, customWidth,
              customWidthUnit, colourText/colourBackground/colourBorder (+Hover),
              fontWeight/fontStyle/textTransform/textDecoration/fontSize/
              lineHeight/letterSpacing (+ Tablet/Mobile + Unit companions),
              borderStyle, borderWidth (object), boxShadow(+Hover), icon*,
              ariaLabel, anchor, className. NO "fontFamily" is actually READ by
              render.php despite being declared (grepped 2026-07-16) — a
              migrated fontFamily would pass the gate but silently do nothing.

THE SCHEMA TRAP: core/button does NOT source label/url/linkTarget/rel/title from
the JSON delimiter attrs at all -- they are `source: attribute`/`rich-text`
fields extracted from the rendered `<a class="wp-block-button__link" href=...
target=... rel=...>Label</a>` markup. `node.attrs` (the JSON dict the driver's
gate inspects) never contains these keys, so the anti-silent-discard gate's
per-source-attr accounting requirement does not apply to them -- but we still
must extract them correctly from the HTML or lose the button's destination and
label entirely. That extraction happens BEFORE the JSON-attrs accounting loop.

is-style-outline is a CORE BLOCK STYLE (serialised as `className:"is-style-
outline"`), not a passthrough class -- mapped to inheritStyle:"outline" per
the CLAUDE.md-documented D338 class of mistake. Any other `is-style-*` value
has no sgs/button equivalent and is refused.
"""

import functools
import json
import re
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from block_parser import serialize_comment  # noqa: E402

_THEME_JSON = pathlib.Path(__file__).resolve().parents[5] / 'theme' / 'sgs-theme' / 'theme.json'


@functools.lru_cache(maxsize=1)
def _button_preset_backgrounds():
    """Map a resolved background hex -> preset name, from theme.json.

    Theme-driven (R-31-1), not hardcoded: reads settings.color.palette to
    resolve slugs/`var(--wp--preset--color--X)` to hex, then keys each
    settings.custom.buttonPresets entry by its resolved background. Only
    solid-background presets are matchable (a transparent-background preset
    like secondary/outline can't be inferred from a coloured core button).
    """
    try:
        data = json.loads(_THEME_JSON.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return {}
    palette = {c['slug']: str(c['color']).lower()
               for c in data.get('settings', {}).get('color', {}).get('palette', [])}

    def resolve(v):
        if not v:
            return None
        v = str(v).strip().lower()
        m = re.match(r'var\(\s*--wp--preset--color--([a-z0-9-]+)', v)
        if m:
            v = m.group(1)
        return palette.get(v, v)

    out = {}
    presets = data.get('settings', {}).get('custom', {}).get('buttonPresets', {})
    for name, spec in presets.items():
        bg = resolve(spec.get('background'))
        if bg and bg != 'transparent':
            out.setdefault(bg, name)
    return out


def _match_button_preset(bg_slug, text_slug):
    """Return the preset name whose background matches this core button, or None.

    Matched on BACKGROUND only — it is the distinguishing feature of a solid
    preset, and the preset then supplies its own (near-identical) text colour.
    A background with no solid-preset match returns None -> the caller keeps the
    exact custom colours.
    """
    if bg_slug is None:
        return None
    palette_map = _button_preset_backgrounds()
    if not palette_map:
        return None
    # Resolve the core slug the same way (slug -> hex; else the raw value).
    data = json.loads(_THEME_JSON.read_text(encoding='utf-8'))
    palette = {c['slug']: str(c['color']).lower()
               for c in data.get('settings', {}).get('color', {}).get('palette', [])}
    resolved = palette.get(str(bg_slug).lower(), str(bg_slug).lower())
    return palette_map.get(resolved)
from contract import GapError, TransformResult  # noqa: E402
from pairings.typography_common import split_length  # noqa: E402

# style groups sgs/button declares as skip-serialised native supports.
PASSTHROUGH_STYLE_GROUPS = ('spacing', 'color', 'border')

ANCHOR_RE = re.compile(r'<a\b([^>]*)>(.*?)</a>', re.S)
ATTR_RE = re.compile(r'([a-zA-Z-]+)\s*=\s*"([^"]*)"')

# core `layout.justifyContent`/CSS keyword enums the sgs typography mapper
# below validates against -- kept local (button's typed number/unit contract
# differs from heading/paragraph's raw-string fontSize, so typography_common's
# full map_typography() cannot be reused wholesale; only split_length is).
_FONT_STYLE_ENUM = ('normal', 'italic')
_TEXT_TRANSFORM_ENUM = ('none', 'uppercase', 'lowercase', 'capitalize')
_TEXT_DECORATION_ENUM = ('none', 'underline', 'line-through')


def _map_button_typography(typo, out, detail):
    """Map core `style.typography` onto sgs/button's TYPED number+unit attrs.

    Unlike heading (fontSize accepts ["number","string"]), sgs/button's
    fontSize/lineHeight/letterSpacing are STRICT `number` attrs with a
    separate *Unit companion attr (fontSizeUnit/lineHeightUnit/
    letterSpacingUnit) -- verified against block.json. A raw CSS length
    string like "1.125rem" must be numerically split, never passed through
    as a string (that would fail rest_validate_value_from_schema and WP
    would silently fall back to the default -- the D291 coercion class).

    Returns a list of unmapped keys; caller MUST refuse (never silent drop).
    """
    unmapped = []
    for key, value in (typo or {}).items():
        if key == 'fontWeight':
            out['fontWeight'] = str(value)
        elif key == 'fontStyle':
            if value not in _FONT_STYLE_ENUM:
                unmapped.append(f'fontStyle:{value!r}')
                continue
            out['fontStyle'] = value
        elif key == 'textTransform':
            if value not in _TEXT_TRANSFORM_ENUM:
                unmapped.append(f'textTransform:{value!r}')
                continue
            out['textTransform'] = value
        elif key == 'textDecoration':
            if value not in _TEXT_DECORATION_ENUM:
                unmapped.append(f'textDecoration:{value!r}')
                continue
            out['textDecoration'] = value
        elif key == 'letterSpacing':
            parsed = split_length(value)
            if not parsed or not parsed[1]:
                # letter-spacing needs an explicit unit; a bare number is not
                # valid CSS and split_length returning '' means it couldn't
                # find one (or the source was genuinely unitless, which
                # letter-spacing never legitimately is).
                unmapped.append(f'letterSpacing:{value!r}')
                continue
            out['letterSpacing'], out['letterSpacingUnit'] = parsed
        elif key == 'lineHeight':
            parsed = split_length(value)
            if not parsed:
                unmapped.append(f'lineHeight:{value!r}')
                continue
            # Core line-height is idiomatically unitless ("1.6") -- split_length
            # returns unit='' in that case, which render.php's
            # `$line_height_unit` consumer treats as a bare number (no
            # 'unitless'-sentinel decode needed; '' already round-trips fine
            # through the isset()/sanitize_text_field() chain in render.php).
            out['lineHeight'], out['lineHeightUnit'] = parsed
        elif key == 'fontSize':
            parsed = split_length(value)
            if not parsed or not parsed[1]:
                # font-size needs an explicit unit (and clamp()/min()/max()
                # cannot be decomposed by split_length at all -- both are
                # genuine gaps, not guesses).
                unmapped.append(f'fontSize:{value!r}')
                continue
            out['fontSize'], out['fontSizeUnit'] = parsed
        elif key == 'fontFamily':
            unmapped.append(
                'fontFamily (declared in block.json but NOT read by render.php '
                '2026-07-16 -- mapping would pass the gate yet silently no-op)')
        else:
            unmapped.append(key)
    return unmapped


def transform(node, text):
    attrs_in = node.attrs or {}
    span = node.inner_html_span()
    inner = text[span[0]:span[1]] if span else ''

    # ---- HTML-sourced fields (never present in node.attrs; see module docstring) ----
    m = ANCHOR_RE.search(inner)
    if not m:
        raise GapError('no <a> in inner HTML -- cannot extract url/label (manual review; '
                        'a <button>-shaped core/button save output is not handled)')
    anchor_attrs = dict(ATTR_RE.findall(m.group(1)))
    label = m.group(2).strip()
    if not label:
        raise GapError('anchor has no visible text content -- cannot derive label '
                        '(possibly an icon-only button; manual review)')

    out = {'label': label}
    notes = []

    href = anchor_attrs.get('href', '').strip()
    if href:
        out['url'] = href

    target = anchor_attrs.get('target', '').strip()
    if target:
        out['linkTarget'] = target

    rel = anchor_attrs.get('rel', '').strip()
    if rel:
        out['rel'] = rel

    title = anchor_attrs.get('title', '').strip()
    if title:
        notes.append(f'gap-note: <a title="{title}"> has no sgs/button equivalent '
                      f'(only ariaLabel exists, a different semantic) -- dropped, register entry')

    # ---- JSON-attrs accounting loop (this IS what the gate checks) ----
    accounting = {}

    # Colours are decided AFTER the loop: a core button whose background matches
    # an SGS button PRESET (theme.json settings.custom.buttonPresets) should use
    # that preset — Bean's design system — not a bypassing `custom` emit. Only a
    # background with no matching preset stays custom. Collect, then resolve.
    core_bg = attrs_in.get('backgroundColor')
    core_text = attrs_in.get('textColor')

    for key, value in attrs_in.items():
        if key in ('backgroundColor', 'textColor'):
            continue  # resolved after the loop
        elif key == 'gradient':
            raise GapError('gradient background has no sgs/button equivalent -- '
                            'supports.color declares background+text only, no gradients')
        elif key == 'fontSize':
            raise GapError('top-level fontSize (preset slug string, e.g. "medium") has no safe '
                            'sgs/button mapping -- fontSize is a strict `number` attr (block.json), '
                            'not a string/enum; a preset slug would fail schema validation and WP '
                            'would silently coerce to the default (D291 class)')
        elif key == 'className':
            tokens = value.split()
            style_tokens = [t for t in tokens if t.startswith('is-style-')]
            other_tokens = [t for t in tokens if not t.startswith('is-style-')]
            if len(style_tokens) > 1:
                raise GapError(f'multiple is-style-* tokens {style_tokens} on one button -- '
                                f'ambiguous, manual review')
            detail = []
            if style_tokens:
                style_token = style_tokens[0]
                if style_token == 'is-style-outline':
                    if 'backgroundColor' in attrs_in or 'textColor' in attrs_in:
                        raise GapError(
                            'is-style-outline combined with backgroundColor/textColor -- '
                            'ambiguous which colour system should win (the outline preset '
                            'vs an explicit custom colour); manual review')
                    out['inheritStyle'] = 'outline'
                    detail.append('is-style-outline is a CORE BLOCK STYLE, not a passthrough '
                                   'class -> inheritStyle:"outline"')
                else:
                    raise GapError(f'block style "{style_token}" has no sgs/button inheritStyle '
                                    f'equivalent (only outline is mapped) -- manual review')
            if other_tokens:
                out['className'] = ' '.join(other_tokens)
                detail.append(f'passthrough custom class(es): {other_tokens}')
            if not detail:
                detail.append('className was only is-style-* token(s), fully consumed')
            accounting[key] = ('mapped', '; '.join(detail))
        elif key == 'width':
            # Known-good: render.php lines 55-57 accept customWidthUnit "%" verbatim;
            # core's `width` is always a percentage (25/50/75/100).
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                raise GapError(f'width {value!r} is not numeric -- refusing to guess')
            out['widthType'] = 'custom'
            out['customWidth'] = value
            out['customWidthUnit'] = '%'
            accounting[key] = ('mapped', 'widthType:"custom" + customWidth + customWidthUnit:"%"')
        elif key == 'style':
            detail = []
            style_out = {}
            for group, group_value in (value or {}).items():
                if group == 'color' and isinstance(group_value, dict) and 'gradient' in group_value:
                    raise GapError('style.color.gradient has no sgs/button equivalent '
                                    '(color support declares background+text only)')
                if group in PASSTHROUGH_STYLE_GROUPS:
                    style_out[group] = group_value
                    detail.append(f'style.{group} 1:1 (skip-serialised native support)')
                elif group == 'typography':
                    unmapped = _map_button_typography(group_value, out, detail)
                    if unmapped:
                        raise GapError(f'style.typography keys {unmapped} have no sgs/button mapping')
                    detail.append('style.typography -> typed number+unit attrs')
                else:
                    raise GapError(f'style.{group} has no sgs/button mapping -- extend before swapping')
            if style_out:
                out['style'] = style_out
            accounting[key] = ('mapped', '; '.join(detail) or 'empty style')
        elif key in ('anchor', 'lock'):
            out[key] = value
            accounting[key] = ('mapped', f'{key} passthrough (native)')
        elif key == 'metadata':
            bindings = (value or {}).get('bindings') or {}
            unsupported = [k for k in bindings if k not in ('url', 'linkTarget', 'rel')]
            if unsupported:
                # core/button also allows binding `text`; sgs/button's label attr is
                # `label`, and the filter registers ['url','label','linkTarget','rel'].
                # A binding left under a name sgs/button doesn't have renders nothing.
                raise GapError(
                    f'metadata.bindings on {unsupported} has no verified sgs/button target '
                    f'(core `text` -> sgs `label` needs remapping + live proof first) — '
                    f'refusing rather than binding to an attr that renders nothing.')
            out['metadata'] = value
            accounting[key] = (
                'mapped',
                'metadata passthrough; bindings on url/linkTarget/rel keep their names on '
                'sgs/button and resolve via the sgs block-bindings filter registered this '
                'session (includes/class-sgs-block-bindings-support.php)'
                if bindings else 'metadata passthrough (no bindings)')
        elif key in ('url', 'linkTarget', 'rel', 'text', 'title', 'placeholder'):
            # Defensive: on some WP versions/legacy content these may ALSO appear as a
            # JSON mirror. This module reads url/label/linkTarget/rel from the rendered
            # <a> tag (the authoritative source per block.json's `source: attribute` /
            # `rich-text` fields), so a JSON-mirror copy is redundant, never authoritative.
            accounting[key] = ('dropped',
                                'already extracted from the rendered <a> tag (this is the '
                                'block.json-declared source for url/label/linkTarget/rel; a '
                                'JSON-attrs mirror, if present, is never authoritative)')
        else:
            raise GapError(f'source attr "{key}" not handled by this module -- extend the mapping')

    # ---- colour resolution: prefer a matching SGS button PRESET over custom ----
    # A core button whose BACKGROUND matches an sgs/button preset IS that preset
    # button (Bean's design system) — emit the preset so it gets the preset's
    # padding / min-height / designed hover, instead of a `custom` emit that
    # bypasses all of that. Only a background with no matching preset stays custom.
    if 'inheritStyle' not in out and (core_bg is not None or core_text is not None):
        preset = _match_button_preset(core_bg, core_text)
        if preset:
            out['inheritStyle'] = preset
            detail = f'backgroundColor:{core_bg!r} matches the "{preset}" preset ' \
                     f'(theme.json settings.custom.buttonPresets) -> inheritStyle:"{preset}", ' \
                     f'so the button uses the preset\'s padding/min-height/hover'
            if core_bg is not None:
                accounting['backgroundColor'] = ('mapped', detail)
            if core_text is not None:
                accounting['textColor'] = (
                    'dropped',
                    f'the "{preset}" preset supplies the text colour; core textColor:'
                    f'{core_text!r} resolves near-identically (verify live)')
        else:
            out['inheritStyle'] = 'custom'
            if core_bg is not None:
                out['colourBackground'] = core_bg
                accounting['backgroundColor'] = (
                    'mapped', 'colourBackground (no matching preset -> inheritStyle:"custom", '
                              'preserves the exact colour via sgs_colour_value)')
            if core_text is not None:
                out['colourText'] = core_text
                accounting['textColor'] = (
                    'mapped', 'colourText (custom; no matching preset)')

    replacement = serialize_comment('sgs/button', out, void=True)
    return TransformResult(replacement, out, 'sgs/button', accounting, notes)
