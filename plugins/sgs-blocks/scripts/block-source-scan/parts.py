"""Part reading: the classes and tags a block prints (render.php, the PHP files it
requires and the functions they call, view.js and its imports), the classes its
stylesheets style, and the elements block.json declares. Each source region the
scan cannot read is recorded as a flag (a known unknown)."""
from __future__ import annotations

import re
from pathlib import Path

from common import NON_CLASS_TOKENS, PLUGIN, TOKEN_RE, function_index, owner_of, part_of, rel, strip_php_comments
from css_read import parse_css, split_top, subject_of
from js_lex import js_segments, strip_js_comments
from php_lex import code_mask, context_at, frames_of, php_segments
from values import attrs_in, switch_attrs, var_attr_map

CLASS_CONTEXT_RE = re.compile(r"""class(?:Name|List|_name|es)?\b|['"]class['"]|\$\w*(?:class|cls)\w*\s*(?:\[\]\s*)?[.=]""", re.I)
ATTR_IN_LITERAL_RE = re.compile(r"""([\w:-]+)\s*=\s*\\?["'][^"']*$""")
EXTERNAL_MARKUP_RE = re.compile(r"\b(render_block|do_blocks|wp_nav_menu|wc_get_template\w*|woocommerce_\w+|wc_price|get_the_post_thumbnail|wp_get_attachment_image|get_avatar|the_content|do_shortcode|wp_kses_post|get_search_form|paginate_links)\s*\(")
NOT_A_CLASS_CALL_RE = re.compile(r'wp_(enqueue|register)_|asset_handle|esc_html__|__\(|_e\(|_x\(|esc_attr__|get_option|add_action|add_filter|wp_add_inline|strpos|str_contains|preg_match|in_array|array_key_exists|stripos')
INSTANCE_ID_RE = r'\s*=\s*[^;]*(md5|uniqid|wp_unique_id|wp_rand|substr\(\s*md5|hash\()'
CALL_DEPTH = 4


class PartsReader:
    # ------------------------------------------------------------ flags
    def flag(self, kind, where, detail, key=None):
        k = (kind, key or detail)
        if k in self.flag_keys:
            return
        self.flag_keys.add(k)
        self.flags.append({'kind': kind, 'where': where, 'detail': detail, **({'key': key} if key else {})})

    def add_part(self, token, origin, where, tag=None, loops=(), conds=(), text_attr=None, cond_attrs=()):
        rec = self.parts.setdefault(token, {'selector': '.' + token, 'owner': owner_of(token, self.short), 'tags': set(), 'origins': set(),
                                            'where': [], 'repeats': [], 'conditions': [], 'conditionAttrs': set(), 'textAttrs': set()})
        rec['origins'].add(origin)
        if tag:
            rec['tags'].add(tag)
            self.tags.add(tag)
        if len(rec['where']) < 6 and where not in rec['where']:
            rec['where'].append(where)
        for x in loops:
            if x not in rec['repeats'] and len(rec['repeats']) < 4:
                rec['repeats'].append(x)
        for c in conds:
            if c not in rec['conditions'] and len(rec['conditions']) < 4:
                rec['conditions'].append(c)
        rec['conditionAttrs'] |= set(cond_attrs)
        if text_attr:
            rec['textAttrs'] |= set(text_attr)

    # ------------------------------------------------------------ PHP
    def harvest_php(self, src: str, label: str, inherited_loops=(), inherited_conds=(), inherited_cond_attrs=()):
        segs = list(php_segments(src))
        mask = code_mask(src, segs)
        frames = frames_of(mask, src)
        vmap = var_attr_map(src, self.attr_names)
        self.php_texts.append((label, src, mask, frames, vmap))
        for s, e, kind, content in segs:
            for m in re.finditer(r'<([a-z][a-z0-9]*)\b', content):
                self.tags.add(m.group(1))
            for m in TOKEN_RE.finditer(content):
                self._php_token(m, s, e, kind, content, src, mask, frames, vmap, label, inherited_loops, inherited_conds, inherited_cond_attrs)
        for m in re.finditer(r'data-([a-z0-9-]+)=\\?["\']\s*\'?\s*\.\s*esc_attr\(\s*([^)]*)\)', src):
            for a in attrs_in(m.group(2), vmap, self.attr_names):
                self.data_attrs[m.group(1)].add(a)
        for m in re.finditer(r"'data-([a-z0-9-]+)'\s*=>\s*([^\n]+)", src):
            for a in attrs_in(m.group(2), vmap, self.attr_names):
                self.data_attrs[m.group(1)].add(a)
        for m in re.finditer(r"(--[a-z0-9-]+)\s*:\s*['\"]?\s*\.?\s*([^;'\"]{0,120})", src):
            stmt_end = src.find(';', m.start())
            stmt = src[m.start():stmt_end if stmt_end > 0 else m.end()]
            for a in attrs_in(stmt, vmap, self.attr_names):
                self.custom_props[m.group(1)].add(a)
        for m in re.finditer(r"['\"](\w+)['\"]\s*=>\s*['\"](--[a-z0-9-]+)['\"]", src):
            if m.group(1) in self.attr_names:
                self.custom_props[m.group(2)].add(m.group(1))
        for m in re.finditer(r"['\"](--[a-z0-9-]+)['\"]\s*=>\s*([^,\n]+)", src):
            for a in attrs_in(m.group(2), vmap, self.attr_names):
                self.custom_props[m.group(1)].add(a)
        for m in EXTERNAL_MARKUP_RE.finditer(mask):
            self.flag('external-markup', label, f'{m.group(1)}(): markup made by WordPress/WooCommerce or another block, not by this source', key=f'{label}:{m.group(1)}')
        if re.search(r'echo\s+\$content|\.\s*\$content\b|\$inner_html|\$block->inner_blocks', mask):
            self.flag('inner-blocks', label, 'prints its inner blocks: their parts belong to the child blocks', key=f'{label}:content')
        return mask, frames, vmap

    def _php_token(self, m, s, e, kind, content, src, mask, frames, vmap, label, inh_loops, inh_conds, inh_cond_attrs):
        tok, tail = m.group(1), m.group(2)
        if tok in NON_CLASS_TOKENS:
            return
        before = content[:m.start()]
        abs_pos = s + m.start()
        at_end = m.end() == len(content)
        if tail and (at_end or content[m.end():m.end() + 2] in ('{$', '${') or content[m.end():m.end() + 1] == '$'):
            fam = tok + tail
            vm = re.match(r"\s*\.\s*\$(\w+)", src[e + 1:e + 80]) or re.match(r"\{?\$(\w+)", content[m.end():])
            if vm and re.search(r'\$' + vm.group(1) + INSTANCE_ID_RE, src):
                return  # an instance id, not a part or modifier
            self.flag('dynamic-class', label, f'class name built from "{fam}" + a runtime value: the parts or modifiers it names cannot be listed from source', key=fam)
            if '--' in tail or (('--' in tok) and tail == '-'):
                for a in switch_attrs(abs_pos, e, mask, src, vmap, self.attr_names):
                    self.switch_classes[fam].add(a)
            return
        if before.endswith('.'):
            self.selector_refs[tok].add(label)
            return
        am = ATTR_IN_LITERAL_RE.search(before)
        if am and am.group(1).lower() not in ('class', 'classname'):
            return  # an id, data-* or aria-* value, not a class
        if kind != 'html' and not am:
            st = mask.rfind(';', 0, abs_pos)
            if NOT_A_CLASS_CALL_RE.search(src[st + 1:abs_pos][-120:]):
                return
        tagm = re.search(r'<([a-z][a-z0-9]*)\b[^<>]*$', before)
        loops, conds = context_at(abs_pos, frames, mask, src)
        cond_attrs = set(inh_cond_attrs)
        for c in conds:
            cond_attrs |= attrs_in(c, vmap, self.attr_names)
        tail_txt = src[e:e + 260]
        tm = re.match(r"""[^;]*?(?:esc_html|wp_kses_post|wp_kses|sgs_rich_text_kses|esc_html_e)\s*\(\s*([^;]*?)\)""", tail_txt, re.S)
        text_attr = None
        if tm and '</' not in tail_txt[:tm.start(1)]:
            text_attr = attrs_in(tm.group(1), vmap, self.attr_names) or None
        if '--' in tok:
            for a in switch_attrs(abs_pos, e, mask, src, vmap, self.attr_names):
                self.switch_classes[tok].add(a)
        self.add_part(part_of(tok), 'php' if kind != 'html' else 'php-html', label, tagm.group(1) if tagm else None,
                      list(inh_loops) + loops, list(inh_conds) + conds, text_attr, cond_attrs)
        if '--' in tok:
            self.parts[part_of(tok)].setdefault('modifiers', set()).add(tok)

    def follow_calls(self, src, mask, frames, label, depth, vmap, seen, inherited=((), (), ())):
        index, short_index = function_index()
        obj_class = {m.group(1): m.group(2).split('\\')[-1] for m in re.finditer(r'\$(\w+)\s*=\s*new\s+\\?([\w\\]+)\s*\(', src)}
        calls = [(m.start(), m.group(1)) for m in re.finditer(r'(?<![\w$>:])([a-zA-Z_]\w*)\s*\(', mask)]
        calls += [(m.start(), f'{m.group(1)}::{m.group(2)}') for m in re.finditer(r'\b([A-Z]\w*)::(\w+)\s*\(', mask)]
        for m in re.finditer(r'\$(\w+)->(\w+)\s*\(', mask):
            cls = obj_class.get(m.group(1))
            calls.append((m.start(), f'{cls}::{m.group(2)}' if cls else f'?->{m.group(2)}'))
        for pos, name in calls:
            fn = index.get(name)
            if fn is None and name.startswith('?->'):
                cands = short_index.get(name[3:], [])
                if len(cands) == 1:
                    fn = cands[0]
                elif cands:
                    self.flag('unresolved-method', label, f'{name}(): instance method on an object whose class the source does not show; {len(cands)} candidates', key=name)
            if fn is None or fn.name in seen:
                continue
            body = fn.body
            if not re.search(r'<[a-z]|class|sgs-|\{', body):
                continue
            seen.add(fn.name)
            loops, conds = context_at(pos, frames, mask, src)
            cond_attrs = set(inherited[2])
            for c in conds:
                cond_attrs |= attrs_in(c, vmap, self.attr_names)
            where = f'{rel(fn.file)}::{fn.name}'
            if depth <= 0:
                if re.search(r"""<[a-z]|['"]sgs-""", body):
                    self.flag('call-depth', where, f'{fn.name}() prints markup but was not read: call depth limit', key=fn.name)
                continue
            self.followed.append(where)
            inh = (list(inherited[0]) + loops, list(inherited[1]) + conds, cond_attrs)
            mask2, frames2, vmap2 = self.harvest_php(body, where, *inh)
            self.follow_calls(body, mask2, frames2, where, depth - 1, vmap2, seen, inh)

    @staticmethod
    def required_files(src: str, here: Path) -> list:
        out = []
        for m in re.finditer(r"(?:require|include)(?:_once)?\s*\(?\s*(dirname\(\s*__DIR__\s*(?:,\s*(\d+)\s*)?\)|__DIR__)\s*\.\s*'([^']+)'", src):
            levels = int(m.group(2) or 1) if m.group(1).startswith('dirname') else 0
            base = here
            for _ in range(levels):
                base = base.parent
            p = (base / m.group(3).lstrip('/')).resolve()
            if p.is_file():
                out.append(p)
        return out

    def scan_php(self):
        render = self.dir / 'render.php'
        if not render.is_file():
            self.flag('no-render', 'render.php', 'no render.php: markup is saved by save.js (read the saved markup instead)')
            save = self.dir / 'save.js'
            if save.is_file():
                self.scan_js_file(save, 'save', set())
            return
        seen_files, todo, seen_fns = set(), [render], set()
        while todo:
            p = todo.pop(0)
            if p in seen_files:
                continue
            seen_files.add(p)
            raw = p.read_text(encoding='utf-8', errors='ignore')
            src = strip_php_comments(raw)
            if self.dir in p.parents:
                mask, frames, vmap = self.harvest_php(src, rel(p))
                self.follow_calls(src, mask, frames, rel(p), CALL_DEPTH, vmap, seen_fns)
            for q in self.required_files(raw, p.parent):
                if self.dir in q.parents:
                    todo.append(q)

    # ------------------------------------------------------------ JS
    @staticmethod
    def resolve_import(spec: str, here: Path):
        if spec.startswith('.'):
            p = (here.parent / spec).resolve()
            for cand in (p, p.with_suffix('.js'), p / 'index.js'):
                if cand.is_file():
                    return cand
        return None

    def scan_js_file(self, path: Path, origin: str, seen: set):
        if path in seen:
            return
        seen.add(path)
        src = strip_js_comments(path.read_text(encoding='utf-8', errors='ignore'))
        label = rel(path)
        segs = list(js_segments(src))
        mask = code_mask(src, segs)
        frames = frames_of(mask, src)
        for s, e, q, content in segs:
            for m in TOKEN_RE.finditer(content):
                self._js_token(m, s, content, src, mask, frames, label, origin)
        for m in re.finditer(r'innerHTML\s*[+]?=|insertAdjacentHTML\s*\(', mask):
            seg = src[m.end():m.end() + 300]
            if '${' in seg or re.search(r"\+\s*\w", seg):
                self.flag('js-template', label, 'markup assembled as an HTML string in script with runtime values', key=f'{label}:innerHTML:{m.start()}')
        for m in re.finditer(r"""(?:import\s[^;]*?from\s*|import\s*\(\s*|export\s[^;]*?from\s*)['"]([^'"]+)['"]""", src):
            spec = m.group(1)
            p = self.resolve_import(spec, path)
            if p:
                self.scan_js_file(p, origin, seen)
            elif spec.startswith('@sgs/') or (not spec.startswith('@wordpress') and not spec.startswith('.')):
                self.flag('js-import', label, f'import "{spec}" not followed (alias or package)', key=spec)

    def _js_token(self, m, s, content, src, mask, frames, label, origin):
        tok, tail = m.group(1), m.group(2)
        if tok in NON_CLASS_TOKENS:
            return
        before = content[:m.start()]
        if tail and (m.end() == len(content) or content[m.end():m.end() + 2] == '${'):
            self.flag('dynamic-class', label, f'class name built in script from "{tok + tail}" + a runtime value', key=tok + tail)
            return
        if before.endswith('.'):
            self.selector_refs[tok].add(label)
            return
        am = ATTR_IN_LITERAL_RE.search(before)
        if am and am.group(1).lower() not in ('class', 'classname'):
            return
        lead = mask[max(0, s - 90):s]
        creates = bool(CLASS_CONTEXT_RE.search(lead)) or bool(re.search(r'class\s*=\s*\\?["\'][^"\']*$', before))
        if not creates:
            if re.search(r'(querySelector\w*|closest|matches|getElementsByClassName)\s*\(\s*$', lead) or re.search(r'contains\s*\(\s*$', lead):
                self.selector_refs[tok].add(label)
            return
        tag = None
        tm = re.search(r'<([a-z][a-z0-9]*)\b[^<>]*$', before)
        if tm:
            tag = tm.group(1)
        else:
            vm = re.search(r'(\w+)\s*\.\s*class(?:Name|List)[\s\S]{0,40}$', lead)
            if vm:
                cm = re.search(r'\b' + re.escape(vm.group(1)) + r"\s*=\s*(?:document\.)?createElement(?:NS)?\(\s*(?:[^,()]+,\s*)?['\"](\w+)['\"]", src[:s])
                if cm:
                    tag = cm.group(1)
        loops, conds = context_at(s, frames, mask, src)
        self.add_part(part_of(tok), origin, label, tag, loops, conds)

    def scan_js(self):
        seen = set()
        if (self.dir / 'view.js').is_file():
            self.scan_js_file(self.dir / 'view.js', 'js', seen)
        for key in ('viewScriptModule', 'viewScript'):
            v = self.bj.get(key)
            for e in ([v] if isinstance(v, str) else (v or [])):
                if isinstance(e, str) and e.startswith('file:'):
                    src_p = self.dir / Path(e[5:]).name
                    if src_p.is_file():
                        self.scan_js_file(src_p, 'js', seen)
        self.js_files = sorted(rel(p) for p in seen)

    # ------------------------------------------------------------ CSS
    def scan_css(self):
        """Every front-end stylesheet in the block folder (editor sheets excluded)."""
        for p in sorted(list(self.dir.rglob('*.css')) + list(self.dir.rglob('*.scss'))):
            if 'editor' not in p.name:
                parse_css(p.read_text(encoding='utf-8', errors='ignore'), '', self.css_rules)
        for header, body, media in self.css_rules:
            for sel in split_top(header):
                subj = subject_of(sel)
                if subj:
                    self.css_parts[subj].append((sel, body, media))

    # ------------------------------------------------------------ declared
    def declared(self):
        """block.json supports.sgs.elements: key -> token, attrMap, states, and whether it states a selector."""
        els = self.bj.get('supports', {}).get('sgs', {}).get('elements') or {}
        items = els.items() if isinstance(els, dict) else ((e.get('name'), e) for e in els)
        out = {}
        for key, e in items:
            if not isinstance(e, dict):
                continue
            if e.get('isWrapper'):
                tok = f'sgs-{self.short}'
            else:
                sel = e.get('selector') or f'.sgs-{self.short}__{key}'
                toks = TOKEN_RE.findall(sel)
                tok = toks[-1][0] if toks else sel
            out[key] = {'token': tok, 'attrMap': e.get('attrMap') or {}, 'states': e.get('states') or {},
                        'hasSelector': bool(e.get('selector') or e.get('isWrapper'))}
        self.declared_parts = out
        return out

    def finish_parts(self):
        """CSS-only and declared-only parts, references to parts printed elsewhere, and the root."""
        printed = set(self.parts)
        for subj in self.css_parts:
            base = subj.split('::')[0]
            if '::' in subj:
                self.add_part(subj, 'css-pseudo', 'style.css')
            if base in printed:
                continue
            if base.startswith('sgs-') and owner_of(base, self.short) != 'host':
                self.flag('expected-elsewhere', 'style.css', f'.{base} is styled here but printed by another block, helper or script', key=base)
            if base.startswith('sgs-') and owner_of(base, self.short) == 'host':
                self.add_part(base, 'css-only', 'style.css')
                self.flag('css-only', 'style.css', f'.{base} is styled but no read source prints it', key=base)
        for tok, where in self.selector_refs.items():
            if tok not in printed and tok.startswith('sgs-'):
                self.flag('expected-elsewhere', sorted(where)[0], f'.{tok} is looked up by this block code but printed elsewhere', key=tok)
        for key, d in self.declared_parts.items():
            if d['token'] not in self.parts:
                self.add_part(d['token'], 'declared-only', 'block.json')
                self.flag('declared-only', 'block.json', f'declared part "{key}" ({d["token"]}) found in no read source', key='decl:' + key)
        self.add_part(f'sgs-{self.short}', 'root', 'block.json')


__all__ = ['PartsReader', 'PLUGIN']
