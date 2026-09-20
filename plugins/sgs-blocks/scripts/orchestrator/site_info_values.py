"""site_info_values: put the draft's own business details in place of the `{{ name }}` bindings that carry them.

Plan step A2a (D1134). A Claude Design draft keeps its phone number, review link, social links and map link
in a script data object (``phone:'0121 729 8233'``, ``gmbHref:'https://share.google/...'``) and the markup
refers to them as ``{{ phone }}`` / ``<a href="{{ gmbHref }}">``. Static HTML still carries the raw text, so
the converter copied ``{{ gmbHref }}`` into a text setting. ``business_info`` already reads those same pairs
(``sync-business-info.py`` writes ``site-info-placeholder-map.json`` from them and fills the Site Info
store); this module reads them with the SAME functions and swaps the value in on the run copy.

Rules that keep it safe (the third and fourth came from the QC council, 2026-09-20):

* Only a BARE name (``{{ gmbHref }}``) is replaced. ``{{ p.phone }}`` is a field of a loop item, not the
  business's phone, and stays raw.
* Only the template part of the file (before the draft's own script) is touched.
* A name inside a directive tag (``<sc-for list="{{ reviews }}">``, ``<sc-if cond="{{ email }}">``) is never
  replaced: those attributes take an array or a condition, and a vocabulary word such as ``reviews`` or ``map``
  is an ordinary state name there.
* Values come from the draft's own script (``text/x-dc``) when it has one, so a sample default in some other
  script (a form's ``email:'you@example.com'``) cannot become the business's details.
* A value counts only if it passes ``business_info.shapes.resolve`` for its kind (a phone looks like a phone,
  a social link is https and on the right network), and is never itself a ``{{ }}`` binding.
* A draft with no such name yields the SAME string and a count of 0: a static or BEM draft is byte-identical.
* The value is HTML-escaped for the text or attribute it lands in.
"""
from __future__ import annotations

import html as _html
import pathlib
import re
import sys

_SCRIPTS = str(pathlib.Path(__file__).resolve().parent.parent)
if _SCRIPTS not in sys.path:
    sys.path.insert(0, _SCRIPTS)

from business_info.script_source import script_candidates  # noqa: E402
from business_info.shapes import resolve  # noqa: E402
from business_info.vocabulary import BINDING_RE, VOCABULARY  # noqa: E402

# A directive start tag (`sc-for`, `sc-if`, `dc-import` ...) with quoted attribute values.
_DIRECTIVE_TAG_RE = re.compile(r"""<(?:sc|dc)-[\w-]+(?:[^<>"']|"[^"]*"|'[^']*')*>""", re.IGNORECASE)
_OWN_SCRIPT_RE = re.compile(r'<script\s+type="text/x-dc"[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL)


def template_part(draft_html: str) -> tuple[str, str]:
    """``(template, rest)``: the markup before the draft's own script (``text/x-dc``, else the first ``<script``)."""
    cut = draft_html.find('<script type="text/x-dc"')
    if cut < 0:
        cut = draft_html.lower().find("<script")
    return (draft_html, "") if cut < 0 else (draft_html[:cut], draft_html[cut:])


def _own_script(draft_html: str) -> str:
    """The draft's own ``text/x-dc`` script(s); the whole file when it has none (a plain static page)."""
    own = _OWN_SCRIPT_RE.findall(draft_html)
    return "\n".join(own) if own else draft_html


def site_info_values(draft_html: str) -> dict[str, str]:
    """``{data-object key as written: value}`` for every business detail the draft's script declares.

    First declaration of a key wins. The value is the script's own text with whitespace collapsed
    (``tel:01217298233`` stays a ``tel:`` link, ``0121 729 8233`` stays the display form).
    """
    out: dict[str, str] = {}
    for key, base, _suffix, value in script_candidates(_own_script(draft_html)):
        site_key, shape = VOCABULARY[base]
        if key not in out and resolve(shape, site_key, value):
            out[key] = " ".join(value.split())
    return out


def resolve_site_info_bindings(draft_html: str) -> tuple[str, dict[str, int]]:
    """``(html, {name: replacements})``. The same string and ``{}`` when nothing was replaced."""
    values = site_info_values(draft_html)
    if not values:
        return draft_html, {}
    template, rest = template_part(draft_html)
    directives = [m.span() for m in _DIRECTIVE_TAG_RE.finditer(template)]
    counts: dict[str, int] = {}

    def swap(match: re.Match[str]) -> str:
        expr = match.group(1).strip()
        if expr not in values or any(start <= match.start() < end for start, end in directives):
            return match.group(0)
        counts[expr] = counts.get(expr, 0) + 1
        return _html.escape(values[expr], quote=True)

    replaced = BINDING_RE.sub(swap, template)
    if not counts:
        return draft_html, {}
    return replaced + rest, counts
