#!/usr/bin/env python3
"""Shared contract between the migration driver and pairing modules.

Lives in its own module so `driver.py` (run as __main__) and the pairing
modules import the SAME class objects — importing driver from a pairing
module would create a second driver module instance whose GapError the
running __main__ driver could never catch.
"""


class GapError(Exception):
    """Raised by a pairing module to REFUSE an instance (goes to the register)."""


class TransformResult:
    """What a pairing module returns for one block instance.

    replacement : full serialised text replacing the node's whole span.
    attrs       : the attrs dict embedded in `replacement` (re-validated by the gate).
    target      : fully-qualified target block name.
    accounting  : {source_attr: (verb, detail)} — every source attr, no gaps.
    notes       : list of human-readable notes for the swap log.
    """

    def __init__(self, replacement, attrs, target, accounting, notes=None):
        self.replacement = replacement
        self.attrs = attrs
        self.target = target
        self.accounting = accounting
        self.notes = notes or []
