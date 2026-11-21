"""Paths, class-token rules and the seeder modules the scanner reuses.

The scanner imports the framework-database seeder's parsers from
`scripts/behavioural-analyser/` (the comment stripper, the PHP function index,
the paint-table reader and the helper contracts derived from helper bodies); it
never copies them. Everything here is general: no block is named.
"""
from __future__ import annotations

import importlib.util
import re
import sys
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

HERE = Path(__file__).resolve().parent
PLUGIN = HERE.parents[1]
BLOCKS = PLUGIN / 'src' / 'blocks'
INCLUDES = PLUGIN / 'includes'
SEEDER = PLUGIN / 'scripts' / 'behavioural-analyser'

if str(SEEDER) not in sys.path:
    sys.path.insert(0, str(SEEDER))


def _load_seeder():
    name = 'block_source_scan_extract_signatures'
    if name in sys.modules:
        return sys.modules[name]
    spec = importlib.util.spec_from_file_location(name, SEEDER / 'extract-signatures.py')
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


es = _load_seeder()
import php_preprocess as pp  # noqa: E402
import php_source_index as psi  # noqa: E402

strip_php_comments = es._strip_php_comments

# A class token: sgs-<block>[__<element>][--<modifier>], with the joiner that follows it
# when the name is completed by a runtime value.
TOKEN_RE = re.compile(r'(?<![\w$#/-])(sgs-[a-z0-9]+(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?)((?:__|--|-)?)')
NON_CLASS_TOKENS = {'sgs-blocks', 'sgs-theme'}
STATE_RE = re.compile(r':hover|:focus-visible|:focus-within|:focus|:active|:checked|:disabled|\[aria-[a-z]+(?:="[^"]*")?\]|\.is-[a-z0-9-]+|\[open\]|\[hidden\]|:open|:popover-open|\[data-[a-z-]*state[^\]]*\]')
PSEUDO_EL_RE = re.compile(r'::?(before|after|first-letter|first-line|marker|placeholder|backdrop|selection|-webkit-[a-z-]+)\b')


@lru_cache(maxsize=1)
def block_names() -> tuple:
    """Every block folder name, longest first (so `nav-bar-menu` wins over `nav`)."""
    return tuple(sorted((p.name for p in BLOCKS.iterdir() if (p / 'block.json').is_file()), key=len, reverse=True))


def owner_of(token: str, short: str) -> str:
    """'host' when the token is the scanned block's, 'block:<name>' for another block, else 'shared'."""
    base = token.split('::')[0]
    if base == f'sgs-{short}' or base.startswith(f'sgs-{short}__') or base.startswith(f'sgs-{short}--'):
        return 'host'
    for b in block_names():
        if base == f'sgs-{b}' or base.startswith(f'sgs-{b}__') or base.startswith(f'sgs-{b}--'):
            return f'block:{b}'
    return 'shared'


def part_of(token: str) -> str:
    """A class token's part: the class with its BEM modifier removed."""
    return token.split('--')[0] if '--' in token else token


@lru_cache(maxsize=1)
def contracts() -> dict:
    """The seeder's helper contracts, with the suffixes its derivation misses added."""
    c = es._helper_contracts()
    _augment_prefix_contracts(c)
    return c


def _augment_prefix_contracts(c: dict) -> None:
    """Add suffixes held in variables ($k_wrap = $prefix . 'TextWrap'; ... 'text-wrap:' . $attributes[ $k_wrap ])."""
    for name, h in c['prefix_helpers'].items():
        fn = c['index'].get(name)
        if fn is None:
            continue
        body = fn.body
        keyvars = {m.group(1): m.group(2) for m in re.finditer(r"\$(\w+)\s*=\s*\$\w*prefix\w*\s*\.\s*'(\w+)'", body)}
        for stmt in re.findall(r'[^;{}]+;', body):
            props = set(re.findall(r"'([a-z][a-z-]+):", stmt))
            if not props:
                continue
            for var, suffix in keyvars.items():
                if re.search(r'\$' + var + r'\b', stmt) and suffix not in h.suffix_props:
                    h.suffix_props[suffix] = props
            for suffix in re.findall(r"\$\w*prefix\w*\s*\.\s*'(\w+)'", stmt):
                if suffix not in h.suffix_props:
                    h.suffix_props[suffix] = props


@lru_cache(maxsize=1)
def function_index() -> tuple:
    """(name -> PhpFunction over includes/ and every block's PHP, short method name -> functions)."""
    index = dict(contracts()['index'])
    for p in sorted(BLOCKS.rglob('*.php')):
        try:
            src = strip_php_comments(p.read_text(encoding='utf-8', errors='ignore'))
        except OSError:
            continue
        for fn in psi.parse_functions(src, p):
            index.setdefault(fn.name, fn)
    short = defaultdict(list)
    for k, fn in index.items():
        short[k.split('::')[-1]].append(fn)
    return index, dict(short)


@lru_cache(maxsize=1)
def css_vocab() -> frozenset:
    return frozenset(p for p in contracts()['vocab'] if p not in ('rule', 'content', 'src'))


def rel(path: Path) -> str:
    """A path relative to the plugin root, with forward slashes (absolute when outside it)."""
    try:
        return path.relative_to(PLUGIN).as_posix()
    except ValueError:
        return path.as_posix()
