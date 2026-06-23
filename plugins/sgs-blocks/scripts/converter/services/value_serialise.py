"""value_serialise — render a raw draft value into the attr's stored form (design §3.1).

Slice scope: maxWidth is a string-literal LENGTH attr. Per D230 the OUTER box cap
is written as the EXACT draft value — decimals + unit preserved, the old 5% theme-snap
and int() truncation are GONE. So serialisation for a length literal is verbatim
(trimmed). Non-length attr types (enum/number/colour) are step-3 work.
"""
from __future__ import annotations


def value_serialise(attr_type: str, kind_override: str | None, raw: str) -> str:
    """Return the stored value string for a raw draft value.

    For the slice's length-literal path this is the trimmed verbatim value (D230 —
    no snap, no truncation). attr_type / kind_override are accepted for the frozen
    signature and used by the step-3 enum/number/colour serialisers.
    """
    return raw.strip()
