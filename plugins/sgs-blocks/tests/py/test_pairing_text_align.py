"""Golden output of the core-block pairings for text alignment (FW-F): the emitted attribute is the
`{desktop, tablet, mobile}` object, never a bare string.

Run with: python plugins/sgs-blocks/tests/py/test_pairing_text_align.py
"""
import pathlib
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2] / 'scripts' / 'migrate-core-blocks'
sys.path.insert(0, str(ROOT))

from pairings.typography_common import map_typography  # noqa: E402


class TextAlignPairingTest(unittest.TestCase):
    def test_style_typography_text_align_becomes_a_desktop_tier_object(self):
        out, detail = {}, []
        unmapped = map_typography({'textAlign': 'center'}, out, detail)
        self.assertEqual(unmapped, [])
        self.assertEqual(out['textAlign'], {'desktop': 'center'})

    def test_a_conflicting_top_level_value_is_still_refused(self):
        out, detail = {'textAlign': {'desktop': 'left'}}, []
        unmapped = map_typography({'textAlign': 'right'}, out, detail)
        self.assertEqual(len(unmapped), 1)
        self.assertIn("'left'", unmapped[0])

    def test_the_same_value_is_not_a_conflict(self):
        out, detail = {'textAlign': {'desktop': 'left'}}, []
        self.assertEqual(map_typography({'textAlign': 'left'}, out, detail), [])

    def test_a_value_off_the_enum_is_refused_not_written(self):
        out, detail = {}, []
        unmapped = map_typography({'textAlign': 'middle'}, out, detail)
        self.assertEqual(len(unmapped), 1)
        self.assertNotIn('textAlign', out)

    def test_no_pairing_emits_a_bare_string(self):
        for name in ('heading_pairing.py', 'paragraph_pairing.py', 'typography_common.py'):
            text = (ROOT / 'pairings' / name).read_text(encoding='utf8')
            self.assertNotIn("out['textAlign'] = value", text, name)


if __name__ == '__main__':
    unittest.main()
