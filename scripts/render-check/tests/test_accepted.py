"""python scripts/render-check/tests/test_accepted.py

An accepted entry may name `where` (a part of the difference's state: `focus`, `hover`, `rest`), so Bean's sign-off on a
button's focus look does not also accept a later change to the same button at rest or under hover.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import rc_compare as cmp  # noqa: E402

FOCUS = {"el": "button.wp-element-button.buybox__add-to-cart", "where": "focus on button.buybox__add-to-cart[submit]"}
REST = {"el": "button.wp-element-button.buybox__add-to-cart", "where": "rest"}
ENTRY = {"state": "*", "element": "buybox__add-to-cart", "where": "focus", "commit": "f28138a61", "pair": "x.png"}


def test_where_narrows_an_entry_to_its_state():
    assert cmp.accepted_by(FOCUS, "home", 375, [ENTRY]) is ENTRY
    # MUST FAIL before `where`: the focus sign-off also accepted a resting change to the same button.
    assert cmp.accepted_by(REST, "home", 375, [ENTRY]) is None


def test_an_entry_without_where_covers_every_state():
    plain = {k: v for k, v in ENTRY.items() if k != "where"}
    assert cmp.accepted_by(REST, "home", 375, [plain]) is plain
    assert cmp.accepted_by(FOCUS, "home", 375, [plain]) is plain


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
