"""The framework theme's CSS and page frame, from theme.json and functions.php only."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import theme as T  # noqa: E402

REPO = Path(__file__).resolve().parents[5]
THEME_JSON = json.loads((REPO / 'theme' / 'sgs-theme' / 'theme.json').read_text(encoding='utf-8'))


def test_must_fail_every_palette_slug_and_font_size_has_its_custom_property():
    css = T.theme_css(REPO)
    slugs = [c['slug'] for c in THEME_JSON['settings']['color']['palette']]
    assert len(slugs) > 20
    for s in slugs:
        assert re.search(rf'--wp--preset--color--{re.escape(s)}:', css), s
        assert f'.has-{s}-background-color' in css
    for f in THEME_JSON['settings']['typography']['fontSizes']:
        assert f'--wp--preset--font-size--{f["slug"]}:{f["size"]}' in css
    for sp in THEME_JSON['settings']['spacing']['spacingSizes']:
        assert f'--wp--preset--spacing--{sp["slug"]}:{sp["size"]}' in css
    for sh in THEME_JSON['settings']['shadow']['presets']:
        assert f'--wp--preset--shadow--{sh["slug"]}:' in css


def test_must_fail_custom_settings_become_kebab_custom_properties():
    css = T.theme_css(REPO)
    assert '--wp--custom--shadow-colour:var(--wp--preset--color--text)' in css  # camelCase to kebab
    assert '--wp--custom--duration--fast:250ms' in css  # nested keys joined by --
    assert '--wp--custom--distance--2xl:48px' in css  # a digit after a letter keeps its place
    assert '--wp--custom--gutter--mobile:var(--wp--preset--spacing--40)' in css


def test_must_fail_layout_and_root_padding_properties_are_defined():
    css = T.theme_css(REPO)
    assert '--wp--style--global--content-size:1200px' in css and '--wp--style--global--wide-size:1400px' in css
    assert '--wp--style--root--padding-left:var(--wp--preset--spacing--40)' in css
    assert '--wp--style--block-gap:var(--wp--preset--spacing--40)' in css
    assert '.has-global-padding{padding-right:var(--wp--style--root--padding-right)' in css


def test_must_fail_styles_print_as_wordpress_does():
    css = T.theme_css(REPO)
    assert ':root :where(a:where(:not(.wp-element-button))){color:var(--wp--preset--color--link)}' in css
    assert ':root :where(.wp-element-button, .wp-block-button__link):hover{' in css
    assert ':root :where(h2){font-size:var(--wp--preset--font-size--xx-large)}' in css
    assert ':root :where(.wp-block-site-title a:where(:not(.wp-element-button))){' in css
    assert 'body{--wp--style--root--padding-top:0px' in css and 'background-color:var(--wp--preset--color--surface)' in css


def test_must_fail_the_theme_sheets_are_those_enqueued_for_every_page_in_order():
    names = [f.name for f in T.front_end_sheets(REPO / 'theme' / 'sgs-theme')]
    assert names == ['core-blocks-critical.css', 'core-blocks.css', 'focus.css', 'scrollbars.css', 'utilities.css', 'type-scale.css', 'layout-tokens.css']
    css = T.theme_css(REPO)
    layout_tokens = (REPO / 'theme/sgs-theme/assets/css/layout-tokens.css').read_text(encoding='utf-8')
    assert layout_tokens in css and css.index(layout_tokens) > css.index('--wp--preset--color--primary:')
    for skipped in ('woocommerce.css', 'dark-mode.css', 'choice-controls.css', 'selection.css', 'shop-load-more.css'):  # conditional
        assert skipped not in names


def test_sheet_finder_ignores_conditional_and_commented_enqueues(tmp_path):
    (tmp_path / 'functions.php').write_text(
        "<?php\nfunction enqueue_styles(): void {\n  // wp_enqueue_style('x', get_theme_file_uri( 'assets/css/commented.css' ));\n"
        "  wp_enqueue_style('a', get_theme_file_uri( 'assets/css/a.css' ));\n  if ( x() ) {\n    wp_enqueue_style('b', get_theme_file_uri( 'assets/css/b.css' ));\n  }\n"
        "  wp_enqueue_style('c', get_theme_file_uri( 'assets/css/c.css' ));\n}\nfunction other() { get_theme_file_uri( 'assets/css/z.css' ); }\n", encoding='utf-8')
    assert [f.name for f in T.front_end_sheets(tmp_path)] == ['a.css', 'c.css']


def test_must_fail_layout_values_at_the_three_widths():
    lay = T.layout(REPO)
    assert lay['contentSize'] == 1200.0 and lay['wideSize'] == 1400.0
    assert lay['rootPadding'] == {375: 24.0, 768: 24.0, 1440: 24.0}  # spacing 40 = 1.5rem on every tier


def test_must_fail_length_expressions_resolve_per_width():
    assert T.to_px('clamp(1rem, 5vw, 3rem)', 375) == 18.75
    assert T.to_px('clamp(1rem, 5vw, 3rem)', 200) == 16.0
    assert T.to_px('clamp(1rem, 5vw, 3rem)', 1440) == 48.0
    assert T.to_px('calc(100% - 2 * 1.5rem)', 1000) == 1000 - 48
    assert T.to_px('min(90vw, 1200px)', 1440) == 1200.0


def test_must_fail_the_gutter_token_of_each_tier_decides_root_padding(tmp_path):
    (tmp_path / 'theme' / 'sgs-theme').mkdir(parents=True)
    tj = {'settings': {'layout': {'contentSize': '600px', 'wideSize': '90vw'},
                       'spacing': {'spacingSizes': [{'slug': '40', 'size': '1.5rem'}]},
                       'custom': {'gutter': {'mobile': '10px', 'tablet': 'clamp(1rem, 4vw, 3rem)', 'desktop': 'var(--wp--preset--spacing--40)'}}},
          'styles': {'spacing': {'padding': {'left': 'var:preset|spacing|40'}}}}
    (tmp_path / 'theme' / 'sgs-theme' / 'theme.json').write_text(json.dumps(tj), encoding='utf-8')
    lay = T.layout(tmp_path)
    assert lay['rootPadding'] == {375: 10.0, 768: 30.72, 1440: 24.0}
    assert lay['wideSize'] == 1296.0


def test_colour_roles_and_fluid_ranges_are_ported():
    theme = {'settings': {'color': {'palette': [{'slug': 'brand-500', 'color': '#123456'}]},
                          'custom': {'colourRoles': {'primary': 'brand-500', 'error': '#ff0000', 'bad role': 'brand-500', 'ghost': 'nothere'}},
                          'typography': {'fontSizes': [{'slug': 'hero', 'size': 'clamp(2rem, 5vw, 4rem)'}, {'slug': 'xx-large', 'size': '36px'}]}}}
    assert T.colour_roles_css(theme) == ':root{--wp--preset--color--primary:var(--wp--preset--color--brand-500);--wp--preset--color--error:#ff0000}'
    assert T.type_scale_ranges_css(theme) == '@media(max-width:1023.98px){:root:root{--wp--preset--font-size--hero:clamp(2rem, 5vw, 4rem);}}'
    assert T.type_scale_ranges_css({'settings': THEME_JSON['settings']}) == ''  # the defaults are all fixed px
