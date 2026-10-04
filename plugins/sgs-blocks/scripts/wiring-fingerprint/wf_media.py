"""Media-atom read sites (blind spot: media atoms build their attribute keys).

The media atoms (`includes/media/atoms/*.php`) never name an attribute: they ask
`sgs_media_element_stored_attr( $block_slug, $prefix, 'Base' )` for the key and
read `$attributes[ $key ]`. A block opts in with
`SGS_Media_Element::style( $attributes, '<prefix>', '<block>', … )`. So the read
site of a media attribute is the key-builder call whose base, joined to one of
the block's literal prefixes (or renamed by the resolver's own `$stored_as`
table), gives the attribute's name.
"""
from __future__ import annotations

import re

from wf_php import PhpIndex, PhpText, lower_first

KEY_BUILDER_RE = re.compile(r"""\b\w*(?:stored_attr|attr_name|attr_key)\w*\s*\([^;()]*?['"]([A-Z][A-Za-z0-9]*)['"]\s*\)""")
MEDIA_CALL_RE = re.compile(r"""(?:SGS_Media_Element::\w+|sgs_media_element_\w+)\s*\(\s*\$\w+\s*,\s*['"](\w*)['"]""")
RESOLVER = "sgs_media_element_stored_attr"
ATOM_PREFIX = "sgs_media_atom_"


class MediaKeys:
    def __init__(self, index: PhpIndex) -> None:
        self.overrides: dict[str, dict[str, str]] = {}
        entry = index.funcs.get(RESOLVER)
        if entry:
            for m in re.finditer(r"""['"](sgs/[a-z0-9-]+)['"]\s*=>\s*array\s*\((.*?)\)""", entry[2].src, re.S):
                self.overrides[m.group(1)] = dict(re.findall(r"""['"](\w+)['"]\s*=>\s*['"](\w+)['"]""", m.group(2)))
        # The atoms run through `sgs_media_element_style()`'s dynamic `$fn = 'sgs_media_atom_…_css'`
        # dispatch, which no call graph follows: every atom function is a candidate read site.
        self.atom_texts = [body for name, (_f, _p, body) in sorted(index.funcs.items()) if name.startswith(ATOM_PREFIX)]

    @staticmethod
    def prefixes(texts: list[PhpText]) -> set[str]:
        return {m.group(1) for t in texts for m in MEDIA_CALL_RE.finditer(t.src)}

    def sites(self, t: PhpText) -> list[tuple[int, str]]:
        if "media_sites" not in t.cache:
            t.cache["media_sites"] = [(m.start(), m.group(1)) for m in KEY_BUILDER_RE.finditer(t.src)]
        return t.cache["media_sites"]

    def seeds(self, t: PhpText, attr: str, block: str, prefixes: set[str]) -> list[int]:
        out = []
        over = self.overrides.get(block, {})
        for pos, base in self.sites(t):
            for p in prefixes:
                name = p + base if p else lower_first(base)
                if attr in (name, over.get(lower_first(base)), over.get(name)):
                    out.append(pos)
                    break
        return out
