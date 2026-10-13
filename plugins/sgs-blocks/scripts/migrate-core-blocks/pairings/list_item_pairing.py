#!/usr/bin/env python3
"""core/list-item -> sgs/icon-list: REFUSE every standalone instance.

core/list-item only exists as a child of core/list. sgs/icon-list has no
child block; its items are the `items` array attribute, built by
list_pairing.py, which consumes every core/list-item inside the core/list it
converts. So run `--pairing core/list` (lint-page.py orders it before
core/list-item); this module is reached only by a list item whose parent list
was refused (it stays core alongside its parent) or by a malformed orphan.
Converting one item alone would produce a one-item list inside the source
list, which is a worse failure than refusing.
"""

import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from contract import GapError  # noqa: E402


def transform(node, text):
    raise GapError(
        'core/list-item is converted by its parent core/list (list_pairing.py builds the '
        'sgs/icon-list items array from every list item); a standalone list item is never swapped '
        'alone. Run --pairing core/list, or fix the refusal that kept its parent list core.'
    )
