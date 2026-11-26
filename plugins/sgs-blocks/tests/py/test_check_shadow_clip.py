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

# The rule that gives the links inside a band their tap highlight back (every band's stylesheet carries one).
RESTORE = ':where(.sgs-x__grid) :where(a, button, [role="button"], input, select, textarea, label, summary){-webkit-tap-highlight-color:initial}'


class DetectorTest(unittest.TestCase):
    def test_a_planted_both_axis_clipper_is_flagged(self):
        hits = det.scan_css('t.css', '.sgs-x__track{overflow:hidden}')
        self.assertEqual([h['status'] for h in hits], ['HIT'])

    def test_an_axis_only_clip_passes(self):
        self.assertEqual(det.scan_css('t.css', '.sgs-x__track{overflow-x:clip;overflow-y:visible}'), [])

    def test_a_fixed_scroller_passes(self):
        css = '.sgs-x__wrap{overflow-y:auto;padding-bottom:var(--sgs-shadow-bleed,80px);margin-bottom:calc(-1*var(--sgs-shadow-bleed,80px))}'
        self.assertEqual([h['status'] for h in det.scan_css('t.css', css)], ['FIXED'])

    def test_a_bleed_band_needs_the_click_hand_off(self):
        band = '.sgs-x__grid{overflow-x:auto;padding-block:var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px));margin-block:calc(-1 * var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px)));--sgs-bleed-band:1;-webkit-tap-highlight-color:transparent}' + RESTORE
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', band, True)], ['FIXED'])
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', band, False)], ['HIT'])

    def test_a_bleed_band_needs_a_transparent_tap_highlight_and_a_restore_for_its_links(self):
        band = '.sgs-x__grid{overflow-x:auto;padding-block:var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px));margin-block:calc(-1 * var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px)));--sgs-bleed-band:1'
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', band + '}' + RESTORE, True)], ['HIT'])
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', band + ';-webkit-tap-highlight-color:transparent}', True)], ['HIT'])
        php = "return 'padding-block:var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px));margin-block:calc(-1 * var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px)));--sgs-bleed-band:1;';"
        self.assertEqual([h['status'] for h in det.scan_bleed_php('t.php', php, True)], ['HIT'])

    def test_a_scrolling_bleed_band_never_drops_the_pointer(self):
        band = '.sgs-x__grid{overflow-x:auto;padding-block:var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px));margin-block:calc(-1 * var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px)));--sgs-bleed-band:1;-webkit-tap-highlight-color:transparent;pointer-events:none}' + RESTORE
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', band, True)], ['HIT'])

    def test_a_bleed_band_without_the_marker_is_refused(self):
        band = '.sgs-x__grid{overflow-x:auto;padding-block:var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px));margin-block:calc(-1 * var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px)))}'
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', band, True)], ['HIT'])
        php = "return 'padding-block:var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px));margin-block:calc(-1 * var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px)));';"
        self.assertEqual([h['status'] for h in det.scan_bleed_php('t.php', php, True)], ['HIT'])

    def test_each_band_needs_a_restore_naming_it_and_every_control(self):
        band = '.sgs-x__grid{overflow-x:auto;padding-block:var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px));margin-block:calc(-1 * var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px)));--sgs-bleed-band:1;-webkit-tap-highlight-color:transparent}'
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', band + RESTORE, True)], ['FIXED'])
        unrelated = RESTORE.replace('.sgs-x__grid', '.sgs-y__grid')
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', band + unrelated, True)], ['HIT'])
        summary_only = ':where(.sgs-x__grid) :where(summary){-webkit-tap-highlight-color:initial}'
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', band + summary_only, True)], ['HIT'])
        # The band's last compound scopes it too (a restore for every gallery grid covers the swipe-row grid).
        scoped = '.sgs-x--scroll ' + band
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', scoped + RESTORE, True)], ['FIXED'])

    def test_each_php_band_is_checked_on_its_own(self):
        band = ("$css .= $u . ' .' . $b . '__panel-wrap{overflow-y:auto;' . 'padding-bottom:var(--sgs-shadow-bleed-bottom, var(--sgs-shadow-bleed, 80px));"
                "margin-bottom:calc(-1 * var(--sgs-shadow-bleed-bottom, var(--sgs-shadow-bleed, 80px)));--sgs-bleed-band:1;-webkit-tap-highlight-color:transparent;}';")
        restore = ("$css .= ':where(' . $u . ' .' . $b . '__panel-wrap) :where(a,button,[role=\"button\"],input,select,textarea,label,summary)"
                   "{-webkit-tap-highlight-color:initial;}';")
        self.assertEqual([h['status'] for h in det.scan_bleed_php('t.php', band + "\n" + restore, True)], ['FIXED'])
        self.assertEqual([h['status'] for h in det.scan_bleed_php('t.php', band, True)], ['HIT'])
        other = "$css .= $u . ' .x__other{padding-top:var(--sgs-shadow-bleed,80px);margin-top:calc(-1 * var(--sgs-shadow-bleed,80px));}';"
        self.assertEqual([h['status'] for h in det.scan_bleed_php('t.php', band + "\n" + restore + "\n" + other, True)], ['FIXED', 'HIT'])

    def test_the_real_nav_emitter_needs_its_restore(self):
        php = (PLUGIN / 'includes' / 'nav-menu-submenu-css.php').read_text(encoding='utf-8')
        self.assertEqual([h['status'] for h in det.scan_bleed_php('n.php', php, True)], ['FIXED'])
        stripped = "\n".join(line for line in php.split("\n") if "__mega-panel-wrap) :where(" not in line)
        self.assertEqual([h['status'] for h in det.scan_bleed_php('n.php', stripped, True)], ['HIT'])

    def test_the_hand_off_enqueue_must_be_live_code(self):
        fn = "class A { public function enqueue_frontend_assets(): void {\n%s\n\t}\n}"
        call = "wp_enqueue_script( 'h', SGS_BLOCKS_URL . '" + det.HANDOFF_JS + "', array(), '1' );"
        self.assertTrue(det.handoff_enqueued(fn % ("$f = 'x'; if ( file_exists( $f ) ) { " + call + " }")))
        for body in ("// " + call, "/* " + call + " */", "# " + call, "if ( false ) { " + call + " }", "return; " + call):
            self.assertFalse(det.handoff_enqueued(fn % body), body)

    def test_the_framework_wires_the_hand_off_and_covers_every_band(self):
        self.assertTrue(det.handoff_wired(det.ROOT))
        bands = [h for h in det.survey() if h['clip'] == 'tap-band']
        self.assertGreaterEqual(len(bands), 11, 'the survey reads every stylesheet and PHP emitter that reserves the bleed')
        self.assertEqual([h for h in bands if h['status'] != 'FIXED'], [])

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


    def test_a_band_must_read_its_computed_side(self):
        sized = '.sgs-x__grid{overflow-x:auto;padding-block:var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px));margin-block:calc(-1 * var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px)));--sgs-bleed-band:1;-webkit-tap-highlight-color:transparent}' + RESTORE
        fixed = sized.replace('var(--sgs-shadow-bleed-top,var(--sgs-shadow-bleed,80px))', 'var(--sgs-shadow-bleed,80px)')
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', sized, True)], ['FIXED'])
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', fixed, True)], ['HIT'])
        self.assertEqual([h['status'] for h in det.scan_bleed_css('t.css', sized, True, False)], ['HIT'])
        self.assertTrue(det.sizer_wired(det.ROOT))

if __name__ == '__main__':
    unittest.main()
