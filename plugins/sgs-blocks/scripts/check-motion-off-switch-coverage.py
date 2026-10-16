#!/usr/bin/env python3
"""Detector: which motion effects honour the per-tier off switch (Spec 38A).

The emitter writes `data-sgs-fx-off-tablet` / `data-sgs-fx-off-mobile` (effect-slug token lists) and the flat
`data-sgs-fx-disable-tablet` / `-mobile`. An effect honours them when its runtime (or its stylesheet) reads them.
This script measures which effects do, without reading any file by hand.

Discovery (nothing is hardcoded):
  * Effect boot modules: every `'@sgs/fx-<slug>'` entry of `SGS_Motion_Registry::MODULES` in
    includes/class-sgs-motion-registry.php. `enqueue_effect()` loads `'@sgs/fx-' . $effect`, so the id suffix is
    the `data-sgs-fx` slug and `path` (build/...) maps to the source file under src/.
  * Stylesheet effects: every assets/css/fx-<slug>.css (`effect_stylesheet()` loads `fx-<effect>.css`); the selectors
    keyed on `[data-sgs-fx~="<slug>"]` are counted as context.
  * Excluded (listed, never counted): registry modules that are not effect boot modules, nav runtimes, and every
    other source file under src/shared/effects and src/shared/nav-interactivity that the registry does not enqueue
    as an effect.

Classification, per file:
  * GUARDED   - the file (comments stripped), or a local module it imports, references one of GUARD_PATTERNS; a
                Tier G module under src/shared/effects/gsap/ counts when it calls `bootEffect(` (provider.js gates
                every Tier G effect there). A CSS file is GUARDED when a rule mentions an off/disable attribute.
  * UNGUARDED - no such reference; the evidence column says `no reference found`.

Modes: report (default, exit 0), `--json`, `--check` (exit 1 while any UNGUARDED remains), `--self-test`.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

# Names of the shared Tier V gate in src/shared/effects/off-switch.js. `isEffectOffAtThisTier` is the per-call
# check; `bootGated` runs every element through it and re-checks on each tier change, so a runtime that calls only
# `bootGated` carries its own evidence line instead of relying on the import walk. An empty list is safe.
HELPER_NAMES = ['isEffectOffAtThisTier', 'bootGated']

# Literal references that prove a file reads the per-tier off switch.
GUARD_LITERALS = ['data-sgs-fx-off-', 'data-sgs-fx-disable-', 'isDisabledAtThisTier']

ROOT = Path(__file__).resolve().parents[1]
REGISTRY_REL = 'includes/class-sgs-motion-registry.php'
EFFECT_SRC_DIRS = ['src/shared/effects', 'src/shared/nav-interactivity']
CSS_DIR_REL = 'assets/css'
GSAP_DIR_REL = 'src/shared/effects/gsap'
PROVIDER_REL = 'src/shared/effects/gsap/provider.js'


def read_text(path: Path) -> str:
    with open(path, encoding='utf-8', newline='') as handle:
        return handle.read()


def strip_js_comments(text: str) -> str:
    """Blank out // and /* */ comments, keeping string contents and every newline so line numbers hold."""
    out: list[str] = []
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        nxt = text[i + 1] if i + 1 < n else ''
        if ch in '\'"`':
            quote = ch
            out.append(ch)
            i += 1
            while i < n:
                c = text[i]
                out.append(c)
                i += 1
                if c == '\\' and i < n:
                    out.append(text[i])
                    i += 1
                elif c == quote:
                    break
            continue
        if ch == '/' and nxt == '/':
            while i < n and text[i] != '\n':
                out.append(' ')
                i += 1
            continue
        if ch == '/' and nxt == '*':
            while i < n and not (text[i] == '*' and i + 1 < n and text[i + 1] == '/'):
                out.append('\n' if text[i] == '\n' else ' ')
                i += 1
            out.append('  ')
            i += 2
            continue
        out.append(ch)
        i += 1
    return ''.join(out)


def strip_css_comments(text: str) -> str:
    return re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), text, flags=re.S)


def guard_regex(helper_names) -> re.Pattern:
    parts = [re.escape(lit) for lit in GUARD_LITERALS]
    parts += [r'\b' + re.escape(name) + r'\b' for name in helper_names if name]
    return re.compile('|'.join(parts))


def first_hit(stripped: str, pattern: re.Pattern):
    for number, line in enumerate(stripped.splitlines(), 1):
        if pattern.search(line):
            return number, line.strip()[:110]
    return None


def rel(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def parse_registry(root: Path):
    """Return {module id: build path} for the MODULES constant."""
    path = root / REGISTRY_REL
    if not path.is_file():
        raise SystemExit(f'registry not found: {REGISTRY_REL}')
    text = read_text(path)
    start = text.find('const MODULES')
    if start < 0:
        raise SystemExit('MODULES constant not found in the registry')
    end = text.find(');\n\n', start)
    block = text[start:end if end > 0 else len(text)]
    block = re.sub(r'/\*.*?\*/', '', block, flags=re.S)
    return {m.group(1): m.group(2) for m in re.finditer(
        r"'(@sgs/[\w-]+)'\s*=>\s*array\(\s*'path'\s*=>\s*'([^']+)'", block)}


IMPORT_RE = re.compile(r"""(?:from\s*|import\s*\(\s*|import\s+)['"](\.{1,2}/[^'"]+)['"]""")


def local_imports(root: Path, file: Path, stripped: str):
    found = []
    for match in IMPORT_RE.finditer(stripped):
        target = (file.parent / match.group(1)).resolve()
        for candidate in (target, target.with_suffix('.js'), target / 'index.js'):
            if candidate.is_file() and root.resolve() in candidate.parents:
                found.append(candidate)
                break
    return found


def js_evidence(root: Path, file: Path, pattern: re.Pattern, seen=None):
    """Guard evidence for a JS file: its own text first, then local imports (provider.js excluded)."""
    seen = seen if seen is not None else set()
    if file in seen:
        return None
    seen.add(file)
    stripped = strip_js_comments(read_text(file))
    hit = first_hit(stripped, pattern)
    if hit:
        return f'{rel(root, file)}:{hit[0]}: {hit[1]}'
    for dep in local_imports(root, file, stripped):
        if rel(root, dep) == PROVIDER_REL:
            continue
        found = js_evidence(root, dep, pattern, seen)
        if found:
            return found + '  (via import)'
    return None


def bootEffect_evidence(root: Path, file: Path):
    hit = first_hit(strip_js_comments(read_text(file)), re.compile(r'\bbootEffect\s*\('))
    return f'{rel(root, file)}:{hit[0]}: {hit[1]}' if hit else None


def exclusion_reason(root: Path, relpath: str, registry: dict, registered_sources: dict) -> str:
    name = relpath.rsplit('/', 1)[-1]
    if 'nav-interactivity' in relpath or name.startswith('nav-'):
        return 'nav runtime (not a data-sgs-fx effect)'
    if relpath in registered_sources:
        return f'registry module {registered_sources[relpath]}, not an effect boot module'
    if relpath.startswith(GSAP_DIR_REL + '/'):
        return 'Tier G helper, not enqueued as an effect'
    if relpath.startswith('src/shared/effects/surface-treatments/') or relpath.startswith('src/shared/effects/webgl/'):
        return 'engine/helper sub-module, not enqueued as an effect'
    return 'engine/helper file, not enqueued by the registry as an effect'


def scan(root: Path, helper_names=HELPER_NAMES) -> dict:
    pattern = guard_regex(helper_names)
    registry = parse_registry(root)
    rows, excluded = [], []
    effect_sources = {}
    registered_sources = {}
    for module_id, build_path in registry.items():
        src = 'src/' + build_path[len('build/'):] if build_path.startswith('build/') else None
        if src and (root / src).is_file():
            registered_sources[src] = module_id
        if module_id.startswith('@sgs/fx-') and src:
            effect_sources[module_id[len('@sgs/fx-'):]] = src

    for slug, src in sorted(effect_sources.items()):
        file = root / src
        if not file.is_file():
            rows.append({'kind': 'js', 'slug': slug, 'file': src, 'class': 'UNGUARDED',
                         'evidence': 'no reference found (source file missing)'})
            continue
        evidence = None
        if src.startswith(GSAP_DIR_REL + '/'):
            evidence = bootEffect_evidence(root, file)
            if evidence:
                evidence += '  (Tier G: provider.js::bootEffect gates it)'
        if not evidence:
            evidence = js_evidence(root, file, pattern)
        rows.append({'kind': 'js', 'slug': slug, 'file': src,
                     'class': 'GUARDED' if evidence else 'UNGUARDED',
                     'evidence': evidence or 'no reference found'})

    css_dir = root / CSS_DIR_REL
    for file in sorted(css_dir.glob('fx-*.css')) if css_dir.is_dir() else []:
        slug = file.stem[len('fx-'):]
        stripped = strip_css_comments(read_text(file))
        hit = first_hit(stripped, re.compile(r'data-sgs-fx-(?:off|disable)-'))
        keyed = len(re.findall(r'\[data-sgs-fx~="%s"\]' % re.escape(slug), stripped))
        rows.append({'kind': 'css', 'slug': slug, 'file': rel(root, file), 'keyed_selectors': keyed,
                     'class': 'GUARDED' if hit else 'UNGUARDED',
                     'evidence': f'{rel(root, file)}:{hit[0]}: {hit[1]}' if hit else 'no reference found'})

    counted_js = {r['file'] for r in rows if r['kind'] == 'js'}
    for module_id, build_path in sorted(registry.items()):
        if not module_id.startswith('@sgs/fx-'):
            src = 'src/' + build_path[len('build/'):] if build_path.startswith('build/') else build_path
            excluded.append({'file': src, 'reason': f'registry module {module_id}, not an effect boot module'})
    listed = {e['file'] for e in excluded}
    for directory in EFFECT_SRC_DIRS:
        base = root / directory
        for file in sorted(base.rglob('*.js')) if base.is_dir() else []:
            relpath = rel(root, file)
            if relpath in counted_js or relpath in listed or '.test.' in relpath or '__tests__' in relpath:
                continue
            excluded.append({'file': relpath, 'reason': exclusion_reason(root, relpath, registry, registered_sources)})
    excluded.sort(key=lambda e: e['file'])

    return {
        'helper_names': list(helper_names),
        'rows': rows,
        'excluded': excluded,
        'counts': {
            'guarded': sum(r['class'] == 'GUARDED' for r in rows),
            'unguarded': sum(r['class'] == 'UNGUARDED' for r in rows),
            'excluded': len(excluded),
        },
    }


def print_report(result: dict) -> None:
    for cls in ('UNGUARDED', 'GUARDED'):
        subset = [r for r in result['rows'] if r['class'] == cls]
        print(f'\n{cls} ({len(subset)})')
        for r in subset:
            print(f"  [{r['kind']:3}] {r['slug']:<22} {r['file']}")
            print(f"        evidence: {r['evidence']}")
    print(f"\nEXCLUDED, never counted ({len(result['excluded'])})")
    for e in result['excluded']:
        print(f"  {e['file']:<62} {e['reason']}")
    c = result['counts']
    print(f"\nTOTAL guarded={c['guarded']} unguarded={c['unguarded']} excluded={c['excluded']}")


def run(root: Path, argv, helper_names=HELPER_NAMES) -> int:
    args = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    args.add_argument('--json', action='store_true', help='print the result as JSON')
    args.add_argument('--check', action='store_true', help='exit 1 while any effect is UNGUARDED')
    args.add_argument('--self-test', action='store_true', help='prove the detector goes red and green')
    ns = args.parse_args(argv)
    if ns.self_test:
        return self_test()
    result = scan(root, helper_names)
    if ns.json:
        print(json.dumps(result, indent=2))
    else:
        print_report(result)
    return 1 if ns.check and result['counts']['unguarded'] else 0


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='') as handle:
        handle.write(text)


REGISTRY_FIXTURE = """<?php
class SGS_Motion_Registry {
	private const MODULES = array(
		'@sgs/fx-bad'  => array(
			'path' => 'build/shared/effects/fx-bad.js',
			'deps' => array(),
		),
		'@sgs/fx-good' => array(
			'path' => 'build/shared/effects/fx-good.js',
			'deps' => array(),
		),
		'@sgs/fx-note' => array(
			'path' => 'build/shared/effects/fx-note.js',
			'deps' => array(),
		),
		'@sgs/fx-tierg' => array(
			'path' => 'build/shared/effects/gsap/fx-tierg.js',
			'deps' => array(),
		),
		'@sgs/magnet' => array(
			'path' => 'build/shared/effects/magnet.js',
			'deps' => array(),
		),
	);

	public static function x() {}
}
"""


def self_test() -> int:
    failures = []

    def expect(label: str, ok: bool) -> None:
        print(f"  {'ok  ' if ok else 'FAIL'} {label}")
        if not ok:
            failures.append(label)

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        write(root / REGISTRY_REL, REGISTRY_FIXTURE)
        fx = root / 'src/shared/effects'
        write(fx / 'fx-bad.js', "const SELECTOR = '[data-sgs-fx~=\"bad\"]';\nexport function init() {}\n")
        write(fx / 'fx-good.js', "import { isDisabledAtThisTier } from './helper.js';\nif (isDisabledAtThisTier(el, 'good')) return;\n")
        write(fx / 'fx-note.js', "// reads data-sgs-fx-off-tablet one day\n/* isDisabledAtThisTier */\nexport function init() {}\n")
        write(fx / 'gsap/fx-tierg.js', "import { bootEffect } from './provider.js';\nbootEffect('tierg', init);\n")
        write(fx / 'gsap/provider.js', "export function isDisabledAtThisTier() {}\nexport function bootEffect() {}\n")
        write(fx / 'magnet.js', "export const x = 1;\n")
        write(fx / 'particles-engine.js', "export const engine = 1;\n")
        write(fx / 'nav-drilldown.js', "export const nav = 1;\n")
        write(root / 'src/shared/nav-interactivity/store.js', "export const s = 1;\n")
        write(root / 'assets/css/fx-badcss.css', '[data-sgs-fx~="badcss"] { opacity: 1; }\n')
        write(root / 'assets/css/fx-goodcss.css',
              '/* note */\n[data-sgs-fx~="goodcss"]:not([data-sgs-fx-off-tablet~="goodcss"]) { opacity: 1; }\n')

        print('self-test: first tree (unguarded runtime, comment-only mention, unguarded stylesheet)')
        result = scan(root)
        by = {(r['kind'], r['slug']): r['class'] for r in result['rows']}
        expect('unguarded runtime is UNGUARDED', by[('js', 'bad')] == 'UNGUARDED')
        expect('comment-only mention is still UNGUARDED', by[('js', 'note')] == 'UNGUARDED')
        expect('guarded runtime is GUARDED', by[('js', 'good')] == 'GUARDED')
        expect('Tier G module calling bootEffect is GUARDED', by[('js', 'tierg')] == 'GUARDED')
        expect('unguarded stylesheet is UNGUARDED', by[('css', 'badcss')] == 'UNGUARDED')
        expect('guarded stylesheet is GUARDED', by[('css', 'goodcss')] == 'GUARDED')
        excluded = {e['file'] for e in result['excluded']}
        counted = {r['file'] for r in result['rows']}
        for name in ('src/shared/effects/particles-engine.js', 'src/shared/effects/nav-drilldown.js',
                     'src/shared/nav-interactivity/store.js', 'src/shared/effects/magnet.js',
                     'src/shared/effects/gsap/provider.js'):
            expect(f'{name} is EXCLUDED and never counted', name in excluded and name not in counted)
        expect('--check exits 1 on the red tree', run(root, ['--check']) == 1)
        expect('report mode exits 0 on the red tree', run(root, []) == 0)

        print('self-test: second tree (every effect guarded; excluded files remain unguarded)')
        write(fx / 'fx-bad.js', "if (isDisabledAtThisTier(el, 'bad')) return;\n")
        write(fx / 'fx-note.js', "const off = el.getAttribute('data-sgs-fx-off-mobile');\n")
        write(root / 'assets/css/fx-badcss.css', '[data-sgs-fx~="badcss"]:not([data-sgs-fx-disable-mobile]) { opacity: 1; }\n')
        expect('--check exits 0 on the green tree', run(root, ['--check']) == 0)
        green = scan(root)
        expect('green tree has zero UNGUARDED while excluded files still carry no guard',
               green['counts']['unguarded'] == 0 and green['counts']['excluded'] >= 5)

        print('self-test: helper name control')
        write(fx / 'fx-bad.js', "export function init() { if (isEffectOffAtThisTier(el, 'bad')) return; }\n")
        with_helper = {r['slug']: r['class'] for r in scan(root, ['isEffectOffAtThisTier'])['rows'] if r['kind'] == 'js'}
        without_helper = {r['slug']: r['class'] for r in scan(root, [])['rows'] if r['kind'] == 'js'}
        expect('helper name guards the file when listed', with_helper['bad'] == 'GUARDED')
        expect('empty HELPER_NAMES is safe and leaves it UNGUARDED', without_helper['bad'] == 'UNGUARDED')
        write(fx / 'fx-bad.js', "export function boot() { stop = bootGated('bad', SELECTOR, init); }\n")
        gated = {r['slug']: r['class'] for r in scan(root)['rows'] if r['kind'] == 'js'}
        expect('a runtime calling only bootGated is GUARDED by the default HELPER_NAMES', gated['bad'] == 'GUARDED')
        write(fx / 'fx-bad.js', "export function boot() { stop = bootGatedLater('bad', SELECTOR, init); }\n")
        prefix = {r['slug']: r['class'] for r in scan(root)['rows'] if r['kind'] == 'js'}
        expect('a longer name that only starts with bootGated stays UNGUARDED', prefix['bad'] == 'UNGUARDED')

    print('self-test: ' + ('FAILED: ' + '; '.join(failures) if failures else 'all checks passed'))
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(run(ROOT, sys.argv[1:]))
