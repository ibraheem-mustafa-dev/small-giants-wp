"""Shadow-clip detector and the two framework fixes it guards (a marquee root and the mega panel wrap never clip shadows).

Run with: python plugins/sgs-blocks/tests/py/test_check_shadow_clip.py
"""
import importlib.util
import pathlib
import unittest

PLUGIN = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('check_shadow_clip', PLUGIN / 'scripts' / 'check-shadow-clip.py')
det = importlib.util.module_from_spec(spec)
spec.loader.exec_module(det)


class DetectorTest(unittest.TestCase):
    def test_a_planted_both_axis_clipper_is_flagged(self):
        hits = det.scan_css('t.css', '.sgs-x__track{overflow:hidden}')
        self.assertEqual([h['status'] for h in hits], ['HIT'])

    def test_an_axis_only_clip_passes(self):
        self.assertEqual(det.scan_css('t.css', '.sgs-x__track{overflow-x:clip;overflow-y:visible}'), [])

    def test_a_fixed_scroller_passes(self):
        css = '.sgs-x__wrap{overflow-y:auto;padding-bottom:var(--sgs-shadow-bleed,80px);margin-bottom:calc(-1*var(--sgs-shadow-bleed,80px))}'
        self.assertEqual([h['status'] for h in det.scan_css('t.css', css)], ['FIXED'])

    def test_the_framework_has_no_unfixed_clipper(self):
        self.assertEqual([h for h in det.survey() if h['status'] == 'HIT'], [])

    def test_self_test_passes(self):
        self.assertEqual(det.self_test(), 0)


class FrameworkFixTest(unittest.TestCase):
    def test_the_marquee_root_clips_one_axis_only(self):
        css = (PLUGIN / 'assets' / 'css' / 'fx-marquee.css').read_text(encoding='utf-8')
        sel = '[data-sgs-fx~="marquee"][data-sgs-marquee="on"]'
        twin = [d for p, b in det.rules(css) for d in [det.decls(b)] if p == sel and d.get('overflow-x') == 'clip']
        self.assertTrue(twin, 'the marquee root needs an overflow-x:clip rule')
        self.assertEqual(twin[0].get('overflow-y'), 'visible')

    def test_the_mega_panel_wrap_reserves_the_bleed(self):
        php = (PLUGIN / 'includes' / 'nav-menu-submenu-css.php').read_text(encoding='utf-8')
        start = php.index("__mega-panel-wrap{position:absolute")
        rule = php[start:php.index("$css .=", start)]
        for needle in ('padding-bottom:var(--sgs-shadow-bleed', 'margin-bottom:calc(-1 * var(--sgs-shadow-bleed'):
            self.assertIn(needle, rule)
        self.assertNotIn('padding-top', rule)

    def test_the_bleed_token_is_defined_once_in_the_theme(self):
        css = (PLUGIN.parents[1] / 'theme' / 'sgs-theme' / 'assets' / 'css' / 'utilities.css').read_text(encoding='utf-8')
        self.assertIn('--sgs-shadow-bleed: 80px;', css)


if __name__ == '__main__':
    unittest.main()
