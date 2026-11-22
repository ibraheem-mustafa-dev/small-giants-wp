"""What a front-end script sets on the page after the server render: the classes and attributes only a browser shows.

The offline render prints markup the way PHP writes it. A script then adds classes (`classList.add/toggle`), attributes
(`setAttribute`, `dataset.x =`) and, through the Interactivity API, whatever a directive binds (`data-wp-class--X="state.G"`,
`data-wp-bind--a="state.G"`). A CSS rule that waits on one of those tokens matches no element of the render, so the proof
cannot tell whether the setting under test changes what the rule paints. This module lists each token a script sets, the
elements it lands on and the code that decides it (the guard), so the proof can hold the token on those elements in both
pages (`proof.py::script_holds`) and read the setting's difference as it would show once the script had run.

A token is {kind: 'class' | 'attr', name, landing: a CSS selector for the elements it lands on, or None, guard:
'file::function', source: 'directive' | 'script'}. Sources:

  directive  `<tag class="... sgs-x__y" data-wp-class--NAME="state.G">` in PHP: the token lands on that tag's own part class;
             the guard is the getter or function named G in the front-end scripts (`get G()`, `G()`, `G:`), else the
             expression itself. `data-wp-bind--ATTR="..."` is an attribute token the same way.
  script     `VAR.classList.add|toggle('NAME'`, `VAR.setAttribute('NAME'` and `VAR.dataset.camelName =` in a front-end script;
             the landing selector is the one VAR was found with (`querySelector('.x')`, `querySelectorAll('.x').forEach(
             ( VAR ) =>`), else None; the guard is the function the call sits in.

The list is read from the code on every call; nothing is written by hand.
"""
from __future__ import annotations

import re
from functools import lru_cache

# an Interactivity directive on a PHP tag: the nearest opening tag before it holds the element's own classes
DIRECTIVE = re.compile(r'''data-wp-(class|bind)--([A-Za-z0-9_:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')''')
CLASS_ATTR = re.compile(r'''\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')''')
JS_CLASS = re.compile(r'''([\w$.?\[\]]+?)\s*\.classList\.(add|toggle)\(\s*(['"])([A-Za-z0-9_-]+)\3''')
JS_SETATTR = re.compile(r'''([\w$.?\[\]]+?)\s*\.setAttribute\(\s*(['"])([A-Za-z0-9_:-]+)\2''')
JS_DATASET = re.compile(r'''([\w$.?\[\]]+?)\s*\.dataset\.([A-Za-z0-9_$]+)\s*=''')
FN_AT = re.compile(r'''(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>)|^\s*(?:async\s+)?(?:get\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{)''', re.M)


def _kebab(camel: str) -> str:
    return re.sub(r'[A-Z]', lambda m: '-' + m.group(0).lower(), camel)


def _guard_of(text: str, pos: int, rel: str) -> str:
    """`file::function` of the nearest function or method that opens before `pos` (the file alone when none does)."""
    last = None
    for m in FN_AT.finditer(text, 0, pos):
        name = m.group(1) or m.group(2) or m.group(3)
        if name and name not in ('if', 'for', 'while', 'switch', 'catch', 'function', 'return'):
            last = name
    return f'{rel}::{last}' if last else rel


def _getter_guard(expr: str, scripts) -> str:
    """Where a directive's `state.G` / `context.G` expression is decided: the script that defines G, else the expression."""
    m = re.search(r'(?:state|context)\.([A-Za-z_$][\w$]*)', expr or '')
    if not m:
        return expr or ''
    name = m.group(1)
    pat = re.compile(r'(?:get\s+' + re.escape(name) + r'\s*\(|(?<![\w$.])' + re.escape(name) + r'\s*(?:\([^)]*\)\s*\{|:\s*(?:\(|function|async)))')
    for rel, text in scripts:
        hit = pat.search(text)
        if hit:
            return f'{rel}::{name}'
    return expr


def _landing_of(var: str, text: str, pos: int):
    """The CSS selector VAR was bound with before `pos`, or None: `const VAR = x.querySelector('.sel')`, or
    `x.querySelectorAll('.sel').forEach( ( VAR ) =>`."""
    base = var.split('.')[0].split('?')[0]
    if not re.fullmatch(r'[A-Za-z_$][\w$]*', base):
        return None
    head = text[:pos]
    m = None
    for m in re.finditer(r'''querySelector(?:All)?\(\s*(['"`])([^'"`$]+)\1\s*\)\s*\.forEach\(\s*\(?\s*''' + re.escape(base) + r'\b', head):
        pass
    if m:
        return m.group(2)
    for m in re.finditer(r'''(?:const|let|var)\s+''' + re.escape(base) + r'''\s*=\s*[\w$.?]*querySelector\(\s*(['"`])([^'"`$]+)\1\s*\)''', head):
        pass
    return m.group(2) if m else None


@lru_cache(maxsize=8)
def scan(files: tuple) -> tuple:
    """Every token a front-end script sets, from `files` ((relative path, text), ...): the PHP that prints directives and the
    scripts that write classes and attributes. A tuple of token dicts, in file order."""
    php = [(r, t) for r, t in files if r.endswith('.php')]
    scripts = [(r, t) for r, t in files if r.endswith(('.js', '.mjs'))]
    out, seen = [], set()

    def add(tok):
        k = (tok['kind'], tok['name'], tok['landing'], tok['guard'])
        if k not in seen:
            seen.add(k)
            out.append(tok)

    for rel, text in php:
        for m in DIRECTIVE.finditer(text):
            kind, name, expr = m.group(1), m.group(2), m.group(3) if m.group(3) is not None else m.group(4)
            start = max(text.rfind('<', 0, m.start()), 0)
            while text[start:start + 2] == '<?':  # a PHP tag, not the element's opening tag
                start = text.rfind('<', 0, start)
                if start < 0:
                    break
            if start < 0:
                continue
            tag = text[start:min(len(text), m.end() + 400)]
            cm = CLASS_ATTR.search(tag)
            part = next((c for c in (cm.group(1) or cm.group(2) or '').split() if c.startswith('sgs-') and '__' in c and '--' not in c and '<' not in c), None) if cm else None
            add({'kind': 'class' if kind == 'class' else 'attr', 'name': name, 'landing': f'.{part}' if part else None,
                 'guard': _getter_guard(expr, scripts), 'source': 'directive', 'file': rel})
    for rel, text in scripts:
        for m in JS_CLASS.finditer(text):
            add({'kind': 'class', 'name': m.group(4), 'landing': _landing_of(m.group(1), text, m.start()),
                 'guard': _guard_of(text, m.start(), rel), 'source': 'script', 'file': rel})
        for m in JS_SETATTR.finditer(text):
            add({'kind': 'attr', 'name': m.group(3), 'landing': _landing_of(m.group(1), text, m.start()),
                 'guard': _guard_of(text, m.start(), rel), 'source': 'script', 'file': rel})
        for m in JS_DATASET.finditer(text):
            add({'kind': 'attr', 'name': 'data-' + _kebab(m.group(2)), 'landing': _landing_of(m.group(1), text, m.start()),
                 'guard': _guard_of(text, m.start(), rel), 'source': 'script', 'file': rel})
    return tuple(out)


def needed_by(selectors, tokens) -> list:
    """The script-set tokens a rule's selectors wait on: a class named outside a functional pseudo-class
    (cascade.required_classes) or an attribute named in brackets, that some script sets. Each token once per landing."""
    import cascade as C  # noqa: PLC0415 - the module sits beside this one
    classes, attrs = set(), set()
    for s in selectors:
        classes |= set(C.required_classes(s))
        attrs |= set(re.findall(r'\[\s*([A-Za-z_:][\w:-]*)', s))
    got, seen = [], set()
    for t in tokens:
        if (t['kind'] == 'class' and t['name'] in classes) or (t['kind'] == 'attr' and t['name'] in attrs):
            # each landing of a token once: a class a script puts on two elements is held on both
            k = (t['kind'], t['name'], t['landing'])
            if k not in seen:
                seen.add(k)
                got.append(t)
    return got
