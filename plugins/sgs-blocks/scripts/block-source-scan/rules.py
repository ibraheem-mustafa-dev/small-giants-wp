"""Rules written in PHP, read through the selector evaluator, and the precedence rule.

`RulesReader.rules_in` evaluates every statement of a read code body that writes a rule
(a literal holding `{`, a call to a function whose literals write rules, a `return`) and
places each setting found in a rule body on the part the rule's selector styles.
`resolve_selector` gives the parts a selector expression at a position can name.

Precedence (`apply_precedence`): evidence read from code outranks a block.json
declaration; a declared element with no `selector` is a hint, kept apart in `hints` and
never placing a setting alone; a code placement whose selector cannot be worked out stays
`part: null` with its reason, never replaced by a guess.
"""
from __future__ import annotations

import re

from common import function_index, rel, strip_php_comments
from css_read import split_top
from selector_eval import UID, UNK, Env, analyse_selector, css_emissions, flatten, signature_defaults, unknown, writes_rules

WRITES_RULE_RE = re.compile(r"""['"][^'"\n]*\{""")
LEAD_RE = re.compile(r'^\s*(?:<\?php\s*)?(?:\$\w+\s*(?:\[[^\]]*\]\s*)*(?:\.=|=)(?![=>])|echo\b|return\b|print\b)')


class RulesReader:
    # ------------------------------------------------------------ environments
    def env_for(self, label: str) -> Env:
        if label in self.envs:
            return self.envs[label]
        texts = {lab: src for lab, src, _m, _f, _v in self.php_texts}
        src = texts.get(label, '')
        if '::' in label:
            fname = label.split('::', 1)[1]
            fn = function_index()[0].get(fname)
            params = fn.params if fn else []
            bindings = {}
            for args, caller, pos in self.call_sites.get(fname, []):
                for i, p in enumerate(params):
                    if i < len(args):
                        bindings.setdefault(p, []).append((args[i], None, pos, caller))
            env = Env(src, label, self.attr_names, params, {}, signature_defaults(fn) if fn else {}, depth=1)
            self.envs[label] = env  # stored first: a caller chain may lead back here
            env.bindings = {p: [(t, self.env_for(c), pos) for t, _e, pos, c in sites] for p, sites in bindings.items()}
            return env
        siblings = [lab for lab in texts if '::' not in lab and lab != label]
        env = Env(src, label, self.attr_names, lookup=lambda n, _s=siblings: self._sibling_var(n, _s))
        self.envs[label] = env
        return env

    def _sibling_var(self, name, siblings):
        """A variable a sibling block file (one that requires this file, or that it requires) assigns."""
        for lab in siblings:
            env = self.env_for(lab)
            if any(a[1] == name for a in env.assigns):
                return env.var(name, len(env.src))
        return unknown(f'${name} is assigned nowhere the scan reads')

    def resolve_selector(self, label: str, pos: int, text: str) -> list:
        """[(part or None, state or None, reason, selector text)] for a selector expression."""
        out = []
        for sel_text, _conds in flatten(self.env_for(label).eval(text, pos)):
            for sel in split_top(sel_text) or ['']:
                part, state, reason = analyse_selector(sel, self.short)
                row = (part, state, reason, sel.replace(UID, '{uid}').replace(UNK, '?'))
                if row not in out:
                    out.append(row)
        return out or [(None, None, 'no value', text[:80])]

    # ------------------------------------------------------------ PHP-written rules
    def rules_in(self, label: str, src: str, mask: str, tiers_of):
        """Rules written from a block file's top level. A helper's body is read through the
        call that reaches it (Env.call binds that call's arguments together), never on its
        own: bound to every call site at once, one call's selector would meet another's
        declarations."""
        if '::' in label:
            return
        env = self.env_for(label)
        index = function_index()[0]
        for st in re.finditer(r'[^;{}]+;', mask):  # one simple statement (strings are blanked in the mask)
            stmt_m = mask[st.start():st.end()]
            calls = {m.group(1) for m in re.finditer(r'(?<![\w$>])([A-Za-z_]\w*(?:::\w+)?)\s*\(', stmt_m)}
            literal_rule = WRITES_RULE_RE.search(src[st.start():st.end()])
            rule_call = any(c in index and writes_rules(index[c]) for c in calls)
            is_return = re.match(r'\s*return\b', stmt_m)
            if not (literal_rule or rule_call or is_return):
                continue
            stmt = src[st.start():st.end() - 1]
            lead = LEAD_RE.match(stmt)
            expr = stmt[lead.end():] if lead else stmt
            value = env.eval(expr, st.start() + (lead.end() if lead else 0))
            for sel, media, prop, sym in css_emissions(value):
                self._place_emission(sel, media, prop, sym, label, tiers_of(stmt))

    def _place_emission(self, sel, media, prop, sym, label, stmt_tiers):
        attrs = sorted(a for a in sym.attrs if a in self.attr_names)
        if not attrs:
            return
        if prop and prop.startswith('--'):
            for a in attrs:
                self.custom_props[prop].add(a)
            return
        props = [prop] if prop else sorted(sym.props)
        tiers = [re.search(r'sgs-tier:([\w-]+)', m).group(1) if 'sgs-tier:' in m else m for m in media if m.startswith('@media')] or stmt_tiers
        for one in split_top(sel) or ['']:
            part, state, reason = analyse_selector(one, self.short)
            shown = one.replace(UID, '{uid}').replace(UNK, '?')
            for a in attrs:
                st = state
                if st is None and sym.kind == 'decls':
                    key = (sym.keys.get(a) or '').lower()
                    st = 'hover' if 'hover' in key or a.endswith('Hover') else None
                extra = {'selector': shown}
                if part is None:
                    extra['unknown'] = reason
                self.place(a, part, props, 'rule', st, tiers or None, label, **extra)

    # ------------------------------------------------------------ precedence
    def apply_precedence(self):
        for a in list(self.settings):
            pl = self.settings[a]
            code = [p for p in pl if p['mechanism'] != 'declared-attrMap']
            declared = [p for p in pl if p['mechanism'] == 'declared-attrMap' and p.get('declaredSelector')]
            hints = [p for p in pl if p['mechanism'] == 'declared-attrMap' and not p.get('declaredSelector')]
            code_parts = {p['part'] for p in code if p['part'] and p['props']}
            if hints:
                self.hints[a] = hints
                for p in code:
                    if p['part'] and any(h['part'] == p['part'] for h in hints):
                        p['hintAgrees'] = True
            keep = list(code)
            for d in declared:
                if not code_parts:
                    keep.append(d)
                elif d['part'] in code_parts:
                    for p in code:
                        if p['part'] == d['part']:
                            p['declarationAgrees'] = True
                else:
                    self.conflicts.append({'setting': a, 'declared': d['part'], 'code': sorted(code_parts)})
            if keep:
                self.settings[a] = keep
            else:
                del self.settings[a]


def block_rel(path):
    return rel(path)


__all__ = ['RulesReader', 'strip_php_comments']
