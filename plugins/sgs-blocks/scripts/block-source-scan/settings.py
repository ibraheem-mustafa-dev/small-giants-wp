"""Setting reading: where each block setting paints (part, CSS properties, state, tier)
and by which mechanism the scan read it. Mechanisms:

- declared-attrMap: block.json supports.sgs.elements (a declaration, not code);
- helper / map-helper: a shared style helper called with a literal prefix, or given
  the attribute array plus setting names (contracts derived by the seeder);
- php-css: a CSS declaration written in a PHP string from a setting;
- paint-table: the seeder's paint-table rows;
- custom-property: a custom property written from a setting and read by the stylesheet;
- class-switch / data-switch: a class or data attribute a setting prints, keyed by a stylesheet rule;
- media-element: block.json mediaElements prefixes;
- presence-condition: a part printed only when the setting holds.
"""
from __future__ import annotations

import re
from collections import defaultdict

from common import TOKEN_RE, contracts, css_vocab, function_index, pp, psi
from css_read import decl_props, split_top, subject_of
from common import STATE_RE
from values import attrs_in

SUFFIX_PROPS = [  # framework naming convention for a setting's suffix (declared media elements only)
    ('Gradient', ['background-image']), ('BorderColour', ['border-color']), ('BorderWidth', ['border-width']),
    ('BorderStyle', ['border-style']), ('BorderRadius', ['border-radius']), ('Radius', ['border-radius']),
    ('BoxShadow', ['box-shadow']), ('OverlayColour', ['background-color']), ('OverlayOpacity', ['opacity']),
    ('Background', ['background-color']), ('Opacity', ['opacity']), ('Blend', ['mix-blend-mode']),
    ('Padding', ['padding']), ('Fit', ['object-fit']), ('Focal', ['object-position']), ('Colour', ['color']),
    ('Width', ['width']), ('Height', ['height']), ('AspectRatio', ['aspect-ratio']), ('Filter', ['filter']),
]
CSS_DECL_RE = re.compile(r'(?<![\w-])(-{0,2}[a-z][a-z0-9-]*)\s*:\s*(?=[\'"]?\s*\.|\{\$|\$|%s|[\'"]\s*\.)')
_HELPER_PROPS: dict = {}


def suffix_props(suffix: str):
    s = re.sub(r'Hover$', '', suffix)
    for k, v in SUFFIX_PROPS:
        if s.endswith(k):
            return v
    return None


def helper_props(name: str, depth: int = 0, seen=None) -> set:
    """CSS properties a helper (and the helpers it calls, two levels) writes in its literals."""
    if depth == 0 and name in _HELPER_PROPS:
        return _HELPER_PROPS[name]
    seen = seen if seen is not None else set()
    fn = function_index()[0].get(name)
    if fn is None or name in seen:
        return set()
    seen.add(name)
    vocab = css_vocab()
    props = {p for p in re.findall(r"['\"{;]\s*([a-z][a-z-]+)\s*:", fn.body) if p in vocab}
    props |= {p for p in re.findall(r"=>\s*'([a-z][a-z-]+)'", fn.body) if p in vocab and '-' in p}
    if depth < 2:
        for c in fn.calls:
            props |= helper_props(c, depth + 1, seen)
    if depth == 0:
        _HELPER_PROPS[name] = props
    return props


def tiers_of(stmt: str):
    tm = re.search(r"SGS_Breakpoints::(?:media|query)\(\s*'(\w+)'", stmt)
    return [tm.group(1)] if tm else None


class SettingsReader:
    def place(self, attr, part, props, mechanism, state=None, tiers=None, where=None, **extra):
        if attr not in self.attr_names:
            return
        rec = {'part': part, 'props': sorted(set(p for p in props if p)), 'state': state, 'mechanism': mechanism}
        if tiers:
            rec['tiers'] = tiers
        if where:
            rec['where'] = where
        rec.update({k: v for k, v in extra.items() if v is not None})
        if rec not in self.settings[attr]:
            self.settings[attr].append(rec)

    def settings_declared(self):
        for key, d in self.declared_parts.items():
            for k, a in d['attrMap'].items():
                if isinstance(a, str) and k.startswith('css:'):
                    self.place(a, d['token'], [k[4:]], 'declared-attrMap', declaredSelector=d['hasSelector'], element=key)
            for st, sd in d['states'].items():
                for k, a in (sd.get('attrMap') or {}).items():
                    if isinstance(a, str) and k.startswith('css:'):
                        self.place(a, d['token'], [k[4:]], 'declared-attrMap', state=st, declaredSelector=d['hasSelector'], element=key)

    def selector_part(self, text: str, vmap_sel: dict):
        """The part a PHP selector expression names: its last literal class token, else a
        selector variable's token, else the block root when the text names a root-like variable."""
        toks = [t for t, _ in TOKEN_RE.findall(text) if t not in ('sgs-blocks', 'sgs-theme')]
        cand = None
        for v in re.findall(r'\$(\w+)', text):
            if v in vmap_sel:
                cand = vmap_sel[v]
        if toks:
            return list(TOKEN_RE.finditer(text))[-1].group(1)
        if cand:
            return cand
        if re.search(r'root|uid|wrapper|scope|\$sel\b|\$selector|block_sel', text):
            return f'sgs-{self.short}'
        return None

    def selector_parts(self, text: str, vmap_sel: dict):
        out = []
        for piece in split_top(text):
            p = self.selector_part(piece, vmap_sel)
            if p and p not in out:
                out.append(p)
        return out or [None]

    def settings_media_elements(self):
        for me in self.bj.get('supports', {}).get('sgs', {}).get('mediaElements') or []:
            if not isinstance(me, dict) or not me.get('prefix'):
                continue
            pre = me['prefix']
            part = 'sgs-bg-media' if me.get('context') == 'background' else 'sgs-media-el'
            for a in self.attr_names:
                if not a.startswith(pre) or len(a) == len(pre) or not a[len(pre)].isupper():
                    continue
                props = suffix_props(a[len(pre):])
                if props:
                    self.place(a, part, props, f'media-element:{pre}', 'hover' if 'Hover' in a else None)

    # ------------------------------------------------------------ PHP-written CSS
    def settings_traced(self):
        self.settings_media_elements()
        for label, src, mask, frames, vmap in self.php_texts:
            vmap_sel = {}
            for m in re.finditer(r'\$(\w+)\s*=\s*([^;]+);', src):
                toks = TOKEN_RE.findall(m.group(2))
                if toks:
                    vmap_sel[m.group(1)] = toks[-1][0]
            for st_m in re.finditer(r'[^;]+;', mask):
                stmt = src[st_m.start():st_m.end()]
                tiers = tiers_of(stmt)
                self._prefix_helper_calls(stmt, label, vmap_sel, tiers)
                self._map_helper_calls(stmt, label, vmap_sel, tiers)
                self._php_css(stmt, label, vmap, vmap_sel, tiers)
        vocab = css_vocab()
        for label, src, mask, frames, vmap in self.php_texts:
            for a, prop, sel in pp.paint_table_props(src, vocab):
                if a in self.attr_names:
                    self.place(a, subject_of(sel) if TOKEN_RE.search(sel) else None, [prop], 'paint-table', None, None, label, selector=sel)
        self._custom_properties()
        self._switches()
        for tok, rec in self.parts.items():
            for a in rec['conditionAttrs']:
                self.place(a, tok, [], 'presence-condition', None, None, rec['where'][0] if rec['where'] else None)

    def _prefix_helper_calls(self, stmt, label, vmap_sel, tiers):
        helpers = contracts()['prefix_helpers']
        for hm in re.finditer(r'\b(\w+)\s*\(', stmt):
            h = helpers.get(hm.group(1))
            if not h:
                continue
            close = psi.matching_close(stmt, hm.end() - 1, '(', ')')
            args = psi.split_top_level_args(stmt[hm.end():close if close > 0 else len(stmt)])
            if len(args) <= max(h.attrs_index, h.prefix_index):
                continue
            pm = re.match(r"\s*['\"](\w*)['\"]\s*$", args[h.prefix_index])
            if not pm:
                self.flag('helper-prefix-unread', label, f'{hm.group(1)}() called with a prefix the source does not state as a literal', key=f'{label}:{hm.group(1)}:{args[h.prefix_index][:30]}')
                continue
            prefix = pm.group(1)
            sel_txt = args[h.selector_index] if h.selector_index is not None and h.selector_index < len(args) else None
            part = self.selector_part(sel_txt, vmap_sel) if sel_txt is not None else None
            for a in self.attr_names:
                if not a.startswith(prefix) or (prefix and len(a) == len(prefix)):
                    continue
                suffix = a[len(prefix):]
                if prefix and not suffix[:1].isupper():
                    continue
                if not prefix:
                    suffix = suffix[:1].upper() + suffix[1:]
                props = h.suffix_props.get(suffix)
                if props:
                    state = h.suffix_states.get(suffix) or ('hover' if 'Hover' in suffix else None)
                    self.place(a, part, props, f'helper:{hm.group(1)}', state, tiers, label, selector=sel_txt)

    def _map_helper_calls(self, stmt, label, vmap_sel, tiers):
        helpers = contracts()['prefix_helpers']
        index = function_index()[0]
        for hm in re.finditer(r'\b(\w+)\s*\(', stmt):
            fname = hm.group(1)
            if fname in helpers or fname not in index:
                continue
            close = psi.matching_close(stmt, hm.end() - 1, '(', ')')
            argtxt = stmt[hm.end():close if close > 0 else len(stmt)]
            if not re.search(r'\$(attributes|attrs|atts|chrome_attrs)\b', argtxt):
                continue
            named = [(k, v) for k, v in re.findall(r"(?:'(\w+)'\s*=>\s*)?'(\w+)'", argtxt) if v in self.attr_names]
            if not named:
                continue
            args = psi.split_top_level_args(argtxt)
            sel_arg = next((x for x in args if TOKEN_RE.search(x) or re.search(r'\$\w*(sel|selector|scope|root)\w*', x)), None)
            parts = self.selector_parts(sel_arg, vmap_sel) if sel_arg else [None]
            props = helper_props(fname)
            if not props:
                self.flag('helper-contract-unread', label, f'{fname}() receives settings by name but writes no CSS property the scan can read', key=f'{fname}')
                continue
            for key, a in named:
                pp_ = ['background-image'] if 'Gradient' in a or 'gradient' in (key or '') else sorted(x for x in props if x != 'background-image') or sorted(props)
                st = 'hover' if 'hover' in (key or '').lower() or a.endswith('Hover') else ('current' if 'current' in (key or '') else None)
                for part in parts:
                    self.place(a, part, pp_, f'map-helper:{fname}', st, tiers, label, selector=sel_arg)

    def _php_css(self, stmt, label, vmap, vmap_sel, tiers):
        vocab = css_vocab()
        for dm in CSS_DECL_RE.finditer(stmt):
            prop = dm.group(1)
            if prop in ('http', 'https', 'data', 'mailto', 'tel') or (prop.endswith('-') and not prop.startswith('--')):
                continue
            if not (prop.startswith('--') or prop in vocab):
                continue
            seg = stmt[dm.end():]
            seg = seg[:re.search(r';|\}|$', seg).start() + 1] if re.search(r';|\}', seg) else seg[:120]
            found = attrs_in(seg[:200], vmap, self.attr_names)
            if not found:
                continue
            if prop.startswith('--'):
                for a in found:
                    self.custom_props[prop].add(a)
                continue
            before = stmt[:dm.start()]
            brace = before.rfind('{')
            sel_txt = before[max(before.rfind('}', 0, brace) if brace >= 0 else 0, 0):brace] if brace >= 0 else ''
            part = self.selector_part(sel_txt, vmap_sel) if sel_txt else None
            state_m = STATE_RE.search(sel_txt or '')
            for a in found:
                st = state_m.group(0) if state_m else ('hover' if 'Hover' in a else None)
                self.place(a, part, [prop], 'php-css', st, tiers, label, selector=sel_txt or None)

    # ------------------------------------------------------------ stylesheet-keyed
    def _custom_properties(self):
        consumers = defaultdict(list)
        for header, body, media in self.css_rules:
            for d in re.finditer(r'(?:^|;)\s*([a-z-]+|--[a-z0-9-]+)\s*:\s*([^;]+)', body):
                prop, val = d.group(1), d.group(2)
                for v in re.findall(r'var\(\s*(--[a-z0-9-]+)', val):
                    for sel in split_top(header):
                        consumers[v].append((sel, prop, media))

        def resolve(cp, depth=0):
            out = []
            for sel, prop, media in consumers.get(cp, []):
                if prop.startswith('--') and depth < 4:
                    out += resolve(prop, depth + 1)
                else:
                    out.append((sel, prop, media))
            return out

        for cp, attrs in self.custom_props.items():
            uses = resolve(cp)
            if not uses and attrs:
                self.flag('custom-property-unconsumed', 'style.css', f'{cp} is written from {sorted(attrs)[:3]} but no rule in the block stylesheet reads it (shared stylesheet or script)', key=cp)
            for sel, prop, media in uses:
                st = STATE_RE.search(sel)
                for a in attrs:
                    self.place(a, subject_of(sel), [prop], f'custom-property:{cp}', st.group(0) if st else None, [media] if media else None, 'style.css', selector=sel)

    def _switches(self):
        for cls, attrs in self.switch_classes.items():
            fam = cls if not cls.endswith('-') else None
            for header, body, media in self.css_rules:
                for sel in split_top(header):
                    hit = (fam and re.search(r'\.' + re.escape(fam) + r'(?![\w-])', sel)) or (not fam and ('.' + cls) in sel)
                    if hit:
                        for a in attrs:
                            self.place(a, subject_of(sel), decl_props(body), f'class-switch:{cls}', None, [media] if media else None, 'style.css', selector=sel)
        for dname, attrs in self.data_attrs.items():
            for header, body, media in self.css_rules:
                for sel in split_top(header):
                    if f'[data-{dname}' in sel:
                        for a in attrs:
                            self.place(a, subject_of(sel), decl_props(body), f'data-switch:data-{dname}', None, [media] if media else None, 'style.css', selector=sel)
