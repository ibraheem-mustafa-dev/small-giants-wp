"""Front-end model per block: the PHP texts a block's render reaches, the
prefix-helper table (which helper parameter is an attribute prefix and which
suffixes it reads), the `includes/` hook emitters, and the per-attribute channel:
the block's reached texts first, then the media-atom key builders (wf_media), a
block-context consumer's own PHP, and last the `includes/` hook emitters.
"""
from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

from wf_channel import Channel, ChannelAnalyser, attr_seeds, dyn_sites, quoted_seeds
from wf_media import MediaKeys
from wf_php import PhpIndex, PhpText, _call_names, lower_first, read, split_args

HOOK_EMITTER_RE = re.compile(r"""render_block|\[\s*['"]attrs['"]\s*\]|parsed_block|block_type_metadata""")


def prefix_helpers(index: PhpIndex, dead_controls_js: Path) -> dict[str, dict[int, set[str]]]:
    """fname -> {param index -> suffixes it appends to that parameter}."""
    table: dict[str, dict[int, set[str]]] = defaultdict(lambda: defaultdict(set))
    for name, (_f, pnames, body) in index.funcs.items():
        for idx, pn in enumerate(pnames):
            if not pn or pn == "attributes":
                continue
            for m in re.finditer(r"\$" + pn + r"""\s*\.\s*['"]([A-Z]\w*)['"]""", body.src):
                table[name][idx].add(m.group(1))
            for m in re.finditer(r"""sgs_typography_attr\(\s*\$""" + pn + r"""\s*,\s*['"](\w+)['"]""", body.src):
                table[name][idx].add(m.group(1))
    for _ in range(4):
        changed = False
        for name, (_f, pnames, body) in index.funcs.items():
            called = set(_call_names(body.src))
            for idx, pn in enumerate(pnames):
                if not pn or pn == "attributes":
                    continue
                for callee in sorted(called & set(table)):
                    if callee == name:
                        continue
                    for m in re.finditer(r"\b" + callee + r"\s*\(", body.src):
                        args = split_args(body.src, m.end() - 1)
                        for cidx, sfx in list(table[callee].items()):
                            if cidx < len(args) and re.fullmatch(r"\$" + pn, args[cidx]) and not sfx <= table[name][idx]:
                                table[name][idx] |= sfx
                                changed = True
        if not changed:
            break
    js = read(dead_controls_js)
    m = re.search(r"const PREFIXED_HELPER_SUFFIXES = \{(.*?)\n\};", js, re.S)
    if m:
        for fm in re.finditer(r"(\w+):\s*\[(.*?)\]", m.group(1), re.S):
            table[fm.group(1)][1] |= set(re.findall(r"'(\w+)'", fm.group(2)))
    return {k: {i: set(v) for i, v in d.items() if v} for k, d in table.items() if any(d.values())}


class FrontEnd:
    def __init__(self, index: PhpIndex, analyser: ChannelAnalyser, ptable: dict, includes_dir: Path) -> None:
        self.index = index
        self.analyser = analyser
        self.ptable = ptable
        inc = includes_dir.as_posix()
        self.hook_texts = [t for k, t in sorted(index.files.items()) if k.startswith(inc) and HOOK_EMITTER_RE.search(t.src)]
        self._block_cache: dict[str, tuple[list[PhpText], dict]] = {}
        self._maps_cache: dict[int, tuple] = {}
        self.media = MediaKeys(index)

    def block_texts(self, bdir: Path) -> tuple[list[PhpText], dict[str, list[str]]]:
        key = bdir.as_posix()
        if key in self._block_cache:
            return self._block_cache[key]
        own = [t for k, t in sorted(self.index.files.items()) if k.startswith(key + "/")]
        texts, _seen = self.index.reach(own)
        derived: dict[str, list[str]] = defaultdict(list)
        for t in texts:
            for fname in sorted(set(_call_names(t.src)) & set(self.ptable)):
                for m in re.finditer(r"\b" + fname + r"\s*\(", t.src):
                    args = split_args(t.src, m.end() - 1)
                    for idx, sfx in self.ptable[fname].items():
                        if idx < len(args):
                            mm = re.fullmatch(r"""['"](\w*)['"]""", args[idx])
                            if mm:
                                pre = mm.group(1)
                                for s in sfx:
                                    derived[(pre + s) if pre else lower_first(s)].append(fname)
        out = (texts, dict(derived))
        self._block_cache[key] = out
        return out

    def _media_prefixes(self, texts: list[PhpText]) -> set[str]:
        key = ("media", id(texts))
        if key not in self._maps_cache:
            self._maps_cache[key] = self.media.prefixes(texts)
        return self._maps_cache[key]

    def _maps(self, texts: list[PhpText]) -> tuple[dict, list, dict]:
        """Per text-set lookups: literal -> texts, texts with dynamic keys, callee -> texts."""
        key = id(texts)
        if key not in self._maps_cache:
            lit: dict[str, list[PhpText]] = defaultdict(list)
            calls: dict[str, list[PhpText]] = defaultdict(list)
            dyn = []
            for t in texts:
                for name in t.literals:
                    lit[name].append(t)
                for name in _call_names(t.src):
                    calls[name].append(t)
                if dyn_sites(t):
                    dyn.append(t)
            self._maps_cache[key] = (dict(lit), dyn, dict(calls), texts)
        return self._maps_cache[key][:3]

    def flow_texts(self, texts: list[PhpText], attr: str, seeds_for, candidates: list[PhpText] | None = None) -> Channel:
        lit, dyn, calls = self._maps(texts)
        if candidates is None:
            seen_ids = set()
            candidates = []
            for t in lit.get(attr, []) + dyn:
                if id(t) not in seen_ids:
                    seen_ids.add(id(t))
                    candidates.append(t)
        ch = Channel()
        pending = [(t, seeds_for(t)) for t in candidates]
        returned: set[str] = set()
        rounds = 0
        while pending and rounds < 4:
            rounds += 1
            nxt = []
            for t, seeds in pending:
                if not seeds:
                    continue
                if self.analyser.flow(t, seeds, attr, ch) and t.name in self.index.funcs and t.name not in returned:
                    returned.add(t.name)
                    call = re.compile(r"\b" + re.escape(t.name) + r"\s*\(")
                    for t2 in calls.get(t.name, []):
                        if t2 is not t:
                            s2 = [m.start() for m in call.finditer(t2.src)]
                            if s2:
                                nxt.append((t2, s2))
            pending = nxt
        return ch

    def channel(self, attr: str, texts: list[PhpText], derived: dict, consumers: list[tuple[list[PhpText], str]],
                block: str = "", own_prefix: str = "") -> tuple[Channel, str]:
        """The attribute's channel and where it was found ('block', 'media-atom', 'context', 'hook', '').
        `own_prefix` is the block directory: texts under it are the block's own files."""
        ch = self.flow_texts(texts, attr, lambda t: attr_seeds(t, attr, own=not own_prefix or t.path.startswith(own_prefix)))
        where = "block" if ch.read else ""
        if not ch.kinds() and block:
            prefixes = self._media_prefixes(texts)
            if prefixes:
                cands = [t for t in texts if self.media.sites(t)] + self.media.atom_texts
                sub = self.flow_texts(texts, attr, lambda t: self.media.seeds(t, attr, block, prefixes), cands)
                if sub.read:
                    ch.merge(sub)
                    where = where or "media-atom"
        for h in derived.get(attr, ()):
            ch.read = True
            ch.helpers.add(h)
            if self.analyser.emits_css(h) or "css" in h:
                ch.decl = True
            where = where or "block"
        for ctexts, key in consumers:
            sub = self.flow_texts(ctexts, key, lambda t, k=key: quoted_seeds(t, k), [t for t in ctexts if key in t.src])
            if sub.read:
                ch.merge(sub)
                where = where or "context"
        if not ch.kinds():
            sub = self.flow_texts(self.hook_texts, attr, lambda t: list(t.literals.get(attr, ())))
            if sub.read:
                ch.merge(sub)
                where = where or "hook"
        return ch, where
