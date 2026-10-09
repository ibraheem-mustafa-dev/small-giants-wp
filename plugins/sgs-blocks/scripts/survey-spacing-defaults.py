#!/usr/bin/env python3
"""
survey-spacing-defaults.py - census of the Spacing control's untouched sides.

READ-ONLY. Writes nothing except `--out <file>` and `--write-baseline`; never builds, deploys
or touches the database (it opens the framework DB with mode=ro, and never imports
a framework-DB helper module, which could migrate the schema on import).

Plan: .claude/plans/archive/2026-10-08-icon-unification-and-spacing-control.md, Bean decision D1 and
Phase E. D1 (refined by Bean 2026-10-09) DECLARES every untouched Spacing side's default: a theme
spacing preset when the side's value equals that preset's size exactly, otherwise the literal
length it already is (no snapping, so nothing moves). This census is the detector that runs
first (THE migration method: survey, check, self-test):

  1. POPULATION, from source. A Babel AST pass (embedded below, run with the plugin's own
     @babel/parser) finds every JSX mount of SgsBoxControl, ResponsiveBoxControl and
     ResponsiveBoxControls under src/blocks, src/components and src/shared, with the mount's
     `presets`, `sides` and label, and the attribute it writes (setAttributes keys on the mount
     and on the enclosing ResponsiveOverride, `.map()` constant lists, props of block-local
     components resolved at their call sites, the media-padding atom resolved from
     block.json::supports.sgs.mediaElements). Shared panels are attributed to the blocks that
     use them through the JSX usage graph. Cross-checked against the DB's padding/margin
     family; disagreements are listed both ways.
  2. PAINTED DEFAULT per side. block.json::supports.sgs.elements maps attribute -> element ->
     selector (`isWrapper` is the block root, anything else is `.sgs-<block>__<element>`); the
     block's style.css is parsed (nesting at-rules, :where(), var() fallbacks, custom
     properties, longhand/logical/shorthand sides, specificity and !important) and the base rule
     that wins each side is recorded. render.php `var(--x, fallback)` padding/margin text is
     reported when the stylesheet is silent.
  3. PROPOSAL per side against theme/sgs-theme/theme.json spacingSizes (static `size`, 1rem =
     16px; fluid min/max reported): the preset whose size equals the side's px exactly, else the
     literal length itself. em is `em-ambiguous` when the element sets its own font-size.
  4. STAY-UNSET: 0, auto, inherit-likes, percentages, the container layout gutter, or no
     declaration. `sgs/button` padding is `exempt: theme-button-presets`. VARIANT-DEPENDENT: a
     side some variant-class or @media/@container rule on the element itself repaints with
     another value has no single default for the base alone: it is reported as variant-dependent until a
     `tablet` / `mobile` tier entry (a media rule) or a `when` entry (a variant class) declares every repaint.
  5. SNAPSHOTS: the spacing slugs each sites/*/theme-snapshot.json declares. A snapshot with no
     scale is assumed to inherit theme.json's (stated, not verified in WordPress core).
  6. DECLARED DEFAULTS: block.json::supports.sgs.spacingDefaults names, per attribute and side,
     what an untouched side paints (Bean D1: declared, never stored): `var(--wp--preset--spacing--N)`
     or a literal length. A side whose stylesheet paints exactly that reports `declared`.
     A declaration may add `tablet` / `mobile` overrides and `when` entries ({attrs, classes, sides, tablet, mobile});
     see src/utils/spacing-defaults.js. Each tier or when value is checked against the media or variant rule that
     paints it (tier: Mobile < 768px, Tablet 768-1023px), a `when` against block.json (attribute, enum or type) and
     the PHP that emits its class, and each mount against the `{ attributes, tier }` context it must pass.

Usage:
    python scripts/survey-spacing-defaults.py --survey [--out census.json]
    python scripts/survey-spacing-defaults.py --check [--strict]
    python scripts/survey-spacing-defaults.py --write-baseline
    python scripts/survey-spacing-defaults.py --self-test

--check fails on (a) a proposed default slug missing from a snapshot's scale, unless the gap is
acknowledged in the baseline (`--strict` ignores the acknowledgement), (b) a stylesheet
length on a Spacing-governed side that the committed baseline
(scripts/data/spacing-defaults-census.json) does not hold, and (c) a declared default that is
neither a literal preset var() nor a length, names a side no Spacing control governs, differs
from what the stylesheet paints (another preset, a var() fallback that is not the preset's theme
size, or another length), is a length equal to a preset's size (declare the preset), or names a
slug a snapshot's scale lacks, or is edited by a mount that passes no `defaults` prop (or reads
another attribute's spacingDefaultsFor, or omits the tier or attributes its tier and when entries need)
(never acknowledgeable). A preset's var() fallback is optional; one that is present must be the preset's theme size.
A tier or when value must equal what its rule paints (the literal "0" is allowed there); a literal equal to a preset
size is a note (the rule paints the literal, so painting the preset is owed), not a failure. A variant or media rule
no entry covers fails the declaration of that side. `--strict` also fails (d) a governed side the stylesheet paints
(a length or a preset) that no declaration covers, and (e) any side still variant-dependent.

LIMITS (stated, not hidden): tier-conditional rules (@media/@container) are not base defaults, and a tier or when
entry is matched to its rule by (tier, variant classes, side) with no model of specificity between a variant rule
and a media rule on the same side;
a stylesheet outside src/blocks/<block>/style.css (theme CSS, shared assets) is not read; a
custom property defined in another file stays `unknown`; logical sides assume left-to-right;
border-width and corner mounts are listed but not given defaults (not Spacing sides).
"""
import argparse
import copy
import glob
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

PLUGIN = Path(__file__).resolve().parent.parent
REPO = PLUGIN.parent.parent
DB_PATH = Path(os.path.expanduser('~/.claude/skills/sgs-wp-engine/sgs-framework.db'))
BASELINE = PLUGIN / 'scripts' / 'data' / 'spacing-defaults-census.json'
FIXTURES = PLUGIN / 'scripts' / 'tests' / 'fixtures' / 'spacing-defaults'
SIDES = ('top', 'right', 'bottom', 'left')
FAMILIES_WITH_DEFAULTS = ('padding', 'margin')
DEFINITION_FILES = {'src/components/SgsBoxControl.js', 'src/components/ResponsiveBoxControl.js', 'src/components/ResponsiveOverride.js', 'src/components/SgsBorderControl.js'}
PRESET_VAR = re.compile(r'var\(\s*--wp--preset--spacing--([\w-]+)\s*(?:,[^)]*)?\)')
DECLARED_VAR = re.compile(r'var\(\s*--wp--preset--spacing--([\w-]+)\s*\)')
PRESET_FALLBACK = re.compile(r'var\(\s*--wp--preset--spacing--[\w-]+\s*,\s*([^)]*?)\s*\)')
BUTTON_PRESETS = '--wp--custom--button-presets--'
MUTATE = set()  # self-test negative control: names of deliberately broken rules

AST_JS = r"""
'use strict';
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const req = createRequire(path.join(process.env.SGS_PLUGIN_DIR, 'package.json'));
const parser = req('@babel/parser');
const traverse = req('@babel/traverse').default;
const ROOT = path.resolve(process.argv[2]);
const TARGETS = new Set(['SgsBoxControl', 'ResponsiveBoxControl', 'ResponsiveBoxControls']);
const SKIP = /(node_modules|__tests__|\.test\.|\.spec\.|\/build\/)/;
const SKIPKEYS = new Set(['loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments']);
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
function walk(dir, out) {
	if (!fs.existsSync(dir)) return;
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (SKIP.test(p.replace(/\\/g, '/'))) continue;
		if (e.isDirectory()) walk(p, out); else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) out.push(p);
	}
}
function resolveImport(from, source) {
	if (!source.startsWith('.')) return null;
	const base = path.resolve(path.dirname(from), source);
	for (const c of [base, base + '.js', base + '.jsx', base + '.ts', base + '.tsx', path.join(base, 'index.js'), path.join(base, 'index.jsx')]) {
		if (fs.existsSync(c) && fs.statSync(c).isFile()) return rel(c);
	}
	return null;
}
function parse(code) {
	for (const plugins of [['jsx'], ['jsx', 'typescript']]) {
		try { return parser.parse(code, { sourceType: 'module', plugins, errorRecovery: true }); } catch (e) { /* next */ }
	}
	return null;
}
const nameOf = (n) => (!n ? null : n.type === 'JSXIdentifier' ? n.name : n.type === 'JSXMemberExpression' ? n.property.name : null);
const strOf = (n) => {
	if (!n) return null;
	if (n.type === 'StringLiteral') return n.value;
	if (n.type === 'TemplateLiteral' && n.expressions.length === 0) return n.quasis[0].value.cooked;
	if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && (n.callee.name === '__' || n.callee.name === '_x') && n.arguments[0]) return strOf(n.arguments[0]);
	return null;
};
const attrOf = (el, name) => el.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === name);
const exprOf = (a) => (a && a.value && a.value.type === 'JSXExpressionContainer' ? a.value.expression : a && a.value ? a.value : null);
const kids = (node, fn) => {
	for (const k of Object.keys(node)) {
		if (SKIPKEYS.has(k)) continue;
		const v = node[k];
		if (Array.isArray(v)) v.forEach((c) => { if (c && typeof c.type === 'string') fn(c); });
		else if (v && typeof v === 'object' && typeof v.type === 'string') fn(v);
	}
};
function readNames(node, acc) {
	if (!node || typeof node.type !== 'string') return;
	if (node.type === 'Identifier') acc.add(node.name);
	if ((node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') && node.object.type === 'Identifier' && node.object.name === 'attributes') {
		if (!node.computed && node.property.type === 'Identifier') acc.add(node.property.name);
		else if (node.computed) { const s = strOf(node.property); if (s) acc.add(s); else if (node.property.type === 'Identifier') acc.add('$dyn:' + node.property.name); }
	}
	kids(node, (c) => readNames(c, acc));
}
function writeNames(node, setKeys, dyn, strings) {
	if (!node || typeof node.type !== 'string') return;
	if (node.type === 'CallExpression') {
		const c = node.callee;
		const cn = c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && c.property.type === 'Identifier' ? c.property.name : '';
		if (cn === 'setAttributes') {
			const objs = [];
			const collect = (n) => {
				if (!n) return;
				if (n.type === 'ObjectExpression') objs.push(n);
				else if (n.type === 'ConditionalExpression') { collect(n.consequent); collect(n.alternate); }
				else if (n.type === 'LogicalExpression') { collect(n.left); collect(n.right); }
			};
			collect(node.arguments[0]);
			for (const o of objs) for (const p of o.properties) {
				if (p.type !== 'ObjectProperty') continue;
				if (!p.computed && p.key.type === 'Identifier') setKeys.add(p.key.name);
				else if (!p.computed && p.key.type === 'StringLiteral') setKeys.add(p.key.value);
				else if (p.computed && p.key.type === 'Identifier') dyn.add(p.key.name);
				else if (p.computed && strOf(p.key)) setKeys.add(strOf(p.key));
				else if (p.computed) dyn.add('$expr');
			}
		}
	}
	if (node.type === 'StringLiteral') strings.add(node.value);
	kids(node, (c) => writeNames(c, setKeys, dyn, strings));
}
function allStrings(node, acc) {
	if (!node || typeof node.type !== 'string') return;
	if (node.type === 'StringLiteral') acc.add(node.value);
	kids(node, (c) => allStrings(c, acc));
}
function presetsOf(el) {
	const a = attrOf(el, 'presets');
	if (!a) return { kind: 'absent', value: false };
	if (a.value === null) return { kind: 'true', value: true };
	const e = exprOf(a);
	if (e && e.type === 'BooleanLiteral') return { kind: String(e.value), value: e.value };
	if (e && e.type === 'ArrayExpression' && e.elements.every((x) => x && strOf(x) !== null)) return { kind: 'list', value: e.elements.map(strOf) };
	return { kind: 'dynamic', value: null, expr: CODE.slice(e.start, e.end) };
}
function findDefaultsCall(node) {
	if (!node || typeof node.type !== 'string') return null;
	if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'spacingDefaultsFor') return node;
	let found = null;
	kids(node, (c) => { if (!found) found = findDefaultsCall(c); });
	return found;
}
function defaultsOf(el) {
	const a = attrOf(el, 'defaults');
	const e = exprOf(a);
	if (!e) return null;
	const c = findDefaultsCall(e);
	const ctx = c && c.arguments[2] ? CODE.slice(c.arguments[2].start, c.arguments[2].end) : null;
	return { expr: CODE.slice(e.start, e.end), attr: c && c.arguments[1] ? strOf(c.arguments[1]) : null, call: !!c, ctx };
}
function sidesOf(el) {
	const a = attrOf(el, 'sides');
	if (!a) return null;
	const e = exprOf(a);
	if (e && e.type === 'ArrayExpression' && e.elements.every((x) => x && strOf(x) !== null)) return e.elements.map(strOf);
	return 'dynamic';
}
function paramNames(params) {
	const out = [];
	const add = (p) => {
		if (!p) return;
		if (p.type === 'Identifier') out.push(p.name);
		else if (p.type === 'AssignmentPattern') add(p.left);
		else if (p.type === 'ArrayPattern') p.elements.forEach(add);
		else if (p.type === 'ObjectPattern') p.properties.forEach((pr) => add(pr.type === 'ObjectProperty' ? pr.value : null));
	};
	params.forEach(add);
	return out;
}
let CODE = '';
const files = [];
for (const d of ['src/blocks', 'src/components', 'src/shared']) walk(path.join(ROOT, d), files);
files.sort();
const out = { files: {}, mounts: [], uses: [], parseErrors: [] };
for (const f of files) {
	const r = rel(f);
	CODE = fs.readFileSync(f, 'utf8');
	const ast = parse(CODE);
	if (!ast) { out.parseErrors.push(r); continue; }
	const info = { imports: [], reexports: [] };
	const imported = {};
	for (const n of ast.program.body) {
		if (n.type === 'ImportDeclaration') {
			const resolved = resolveImport(f, n.source.value);
			if (resolved) info.imports.push(resolved);
			for (const s of n.specifiers) {
				const im = s.type === 'ImportSpecifier' ? (s.imported.name || s.imported.value) : s.type === 'ImportDefaultSpecifier' ? 'default' : '*';
				imported[s.local.name] = { imported: im, resolved };
			}
		}
		if ((n.type === 'ExportNamedDeclaration' || n.type === 'ExportAllDeclaration') && n.source) {
			const resolved = resolveImport(f, n.source.value);
			if (resolved) info.reexports.push(resolved);
		}
	}
	out.files[r] = info;
	const seenUse = new Set();
	traverse(ast, {
		JSXOpeningElement(p) {
			const el = p.node;
			const local = nameOf(el.name);
			if (!local || !/^[A-Z]/.test(local)) return;
			const imp = imported[local];
			const canonical = imp && imp.imported !== 'default' && imp.imported !== '*' ? imp.imported : local;
			const jsx = p.parentPath;
			let enclosing = null, enclosingParams = [];
			for (let q = jsx.parentPath; q; q = q.parentPath) {
				const n = q.node;
				if (n.type === 'FunctionDeclaration' && n.id && /^[A-Z]/.test(n.id.name)) { enclosing = n.id.name; enclosingParams = paramNames(n.params); break; }
				if ((n.type === 'ArrowFunctionExpression' || n.type === 'FunctionExpression') && q.parent.type === 'VariableDeclarator' && q.parent.id.type === 'Identifier' && /^[A-Z]/.test(q.parent.id.name)) { enclosing = q.parent.id.name; enclosingParams = paramNames(n.params); break; }
			}
			const props = {};
			for (const a of el.attributes) {
				if (a.type !== 'JSXAttribute') continue;
				const s = strOf(exprOf(a));
				if (s !== null && s !== undefined) props[a.name.name] = s;
			}
			const key = [local, imp ? imp.imported : '', imp ? imp.resolved : '', enclosing, JSON.stringify(props)].join('|');
			if (!seenUse.has(key)) {
				seenUse.add(key);
				out.uses.push({ f: r, l: local, i: imp ? imp.imported : null, r: imp ? imp.resolved : null, e: enclosing, props });
			}
			if (!TARGETS.has(canonical)) return;
			const setKeys = new Set(), dyn = new Set(), strings = new Set(), valueNames = new Set();
			for (const a of el.attributes) {
				if (a.type !== 'JSXAttribute') continue;
				if (a.name.name === 'onChange') writeNames(exprOf(a), setKeys, dyn, strings);
				if (a.name.name === 'values' || a.name.name === 'value') readNames(exprOf(a), valueNames);
			}
			let overrideWrapped = false;
			for (let q = jsx.parentPath; q; q = q.parentPath) {
				if (q.node.type === 'JSXElement' && nameOf(q.node.openingElement.name) === 'ResponsiveOverride') {
					overrideWrapped = true;
					for (const a of q.node.openingElement.attributes) {
						if (a.type !== 'JSXAttribute') continue;
						if (a.name.name === 'onChange') writeNames(exprOf(a), setKeys, dyn, strings);
						if (a.name.name === 'value') readNames(exprOf(a), valueNames);
					}
					break;
				}
			}
			const dynResolved = {};
			for (const x of dyn) {
				if (x === '$expr') continue;
				for (let q = jsx.parentPath; q; q = q.parentPath) {
					const n = q.node;
					if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.property.name === 'map' && n.arguments[0] && /Function/.test(n.arguments[0].type) && paramNames(n.arguments[0].params).includes(x)) {
						const vals = new Set();
						let obj = n.callee.object;
						if (obj.type === 'Identifier') {
							const b = q.scope.getBinding(obj.name);
							obj = b && b.path.node && b.path.node.init ? b.path.node.init : null;
						}
						if (obj) allStrings(obj, vals);
						dynResolved[x] = [...vals];
						break;
					}
				}
			}
			out.mounts.push({
				file: r, line: el.loc.start.line, component: canonical, presets: presetsOf(el), defaults: defaultsOf(el), sides: sidesOf(el),
				label: strOf(exprOf(attrOf(el, 'label'))), setKeys: [...setKeys], dynamicKeys: [...dyn], dynResolved,
				strings: [...strings], valueNames: [...valueNames], overrideWrapped, enclosing, enclosingParams,
			});
		},
	});
}
process.stdout.write(JSON.stringify(out));
"""


# ----------------------------------------------------------------------------------------------
# Units and presets
# ----------------------------------------------------------------------------------------------
LEN = re.compile(r'^(-?\d*\.?\d+)(px|rem|em|pt|%|[a-z]+)?$', re.I)


def safe_arith(expr):
    """Evaluate + - * / and parentheses over numbers with the ast module (no eval); None if anything else."""
    import ast
    import operator
    ops = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv}

    def ev(n):
        if isinstance(n, ast.Expression):
            return ev(n.body)
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
            return float(n.value)
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.USub, ast.UAdd)):
            return -ev(n.operand) if isinstance(n.op, ast.USub) else ev(n.operand)
        if isinstance(n, ast.BinOp) and type(n.op) in ops:
            return ops[type(n.op)](ev(n.left), ev(n.right))
        raise ValueError('unsupported')
    try:
        return ev(ast.parse(expr.strip(), mode='eval'))
    except (ValueError, SyntaxError, ZeroDivisionError):
        return None


def to_px(raw):
    """(px, unit, note). note is '' on success, otherwise why px is None."""
    s = raw.strip().lower()
    m = LEN.match(s)
    if m:
        n, u = float(m.group(1)), (m.group(2) or '')
        if u == '' and n == 0:
            return 0.0, 'px', ''
        if u == 'px':
            return n, u, ''
        if u == 'rem':
            return n * 16, u, ''
        if u == 'em':
            return n * 16, u, 'em'
        if u == 'pt':
            return n * 4 / 3, u, ''
        if u == '%':
            return None, u, 'percentage'
        return None, u, f'unit-not-convertible:{u or "unitless"}'
    mc = re.match(r'^calc\((.*)\)$', s)
    if mc:
        expr = re.sub(r'(-?\d*\.?\d+)rem', lambda x: str(float(x.group(1)) * 16), mc.group(1))
        expr = re.sub(r'(-?\d*\.?\d+)px', r'\1', expr)
        value = safe_arith(expr) if re.fullmatch(r'[\d.+\-*/() ]+', expr) else None
        if value is not None:
            return value, 'calc', ''
        return None, 'calc', 'calc-not-static'
    if re.match(r'^(clamp|min|max)\(', s):
        return None, 'fn', 'fluid-function'
    return None, '', 'not-a-length'


def load_scale(theme_json):
    sizes = json.loads(Path(theme_json).read_text(encoding='utf-8'))['settings']['spacing']['spacingSizes']
    out = []
    for s in sizes:
        px, _, note = to_px(str(s['size']))
        fluid = s.get('fluid') or {}
        fmin, fmax = (to_px(str(fluid.get('min', '')))[0], to_px(str(fluid.get('max', '')))[0]) if fluid else (None, None)
        out.append({'slug': str(s['slug']), 'name': s.get('name', ''), 'size': s['size'], 'px': px, 'fluid_min_px': fmin, 'fluid_max_px': fmax})
    return out


def exact_preset(px, scale):
    """The preset whose static size is exactly `px`, else None."""
    return next((p for p in scale if p['px'] is not None and abs(px - p['px']) <= 1e-9), None)


def propose(px, raw, scale):
    """Bean D1 (2026-10-09): a preset only on an exact size match; any other value stays the literal it is.

    The `snap` self-test control restores the old nearest-preset snap, which the fixture must catch."""
    p = exact_preset(px, scale)
    if p is None and 'snap' in MUTATE:
        p = min(scale, key=lambda q: abs(px - q['px']))
    if p:
        return {'kind': 'preset', 'value': f'var(--wp--preset--spacing--{p["slug"]})', 'slug': p['slug'], 'name': p['name'], 'preset_px': p['px']}
    return {'kind': 'literal', 'value': raw, 'slug': None, 'name': None, 'preset_px': None}


# ----------------------------------------------------------------------------------------------
# CSS parsing
# ----------------------------------------------------------------------------------------------
def strip_comments(css):
    return re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), css, flags=re.S)


def split_top(text, seps):
    """Split on top-level characters in seps, respecting (), [] and quotes."""
    out, depth, cur, quote = [], 0, [], None
    for ch in text:
        if quote:
            cur.append(ch)
            quote = None if ch == quote else quote
            continue
        if ch in '"\'':
            quote = ch
        elif ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        elif depth == 0 and ch in seps:
            out.append(''.join(cur))
            cur = []
            continue
        cur.append(ch)
    out.append(''.join(cur))
    return out


def parse_css(css):
    """Flat rule list: {'sels': [...], 'decls': [(prop, value, important)], 'cond': tuple, 'order': n}."""
    css = strip_comments(css)
    rules = []

    def decls_of(body):
        res = []
        for part in split_top(body, ';'):
            if ':' not in part:
                continue
            prop, val = part.split(':', 1)
            val = val.strip()
            imp = bool(re.search(r'!\s*important\s*$', val, re.I))
            val = re.sub(r'\s*!\s*important\s*$', '', val, flags=re.I).strip()
            if prop.strip():
                res.append((prop.strip().lower() if not prop.strip().startswith('--') else prop.strip(), val, imp))
        return res

    def walk(text, cond):
        i, n = 0, len(text)
        while i < n:
            j, depth, quote = i, 0, None
            while j < n:
                ch = text[j]
                if quote:
                    quote = None if ch == quote else quote
                elif ch in '"\'':
                    quote = ch
                elif ch == '(':
                    depth += 1
                elif ch == ')':
                    depth -= 1
                elif depth == 0 and ch in '{;}':
                    break
                j += 1
            if j >= n or text[j] != '{':
                i = j + 1
                continue
            prelude = text[i:j].strip()
            k, d = j + 1, 1
            while k < n and d:
                d += (text[k] == '{') - (text[k] == '}')
                k += 1
            body = text[j + 1:k - 1]
            if prelude.startswith('@'):
                name = prelude.split(None, 1)[0].lower()
                if name == '@layer':
                    walk(body, cond)
                elif name in ('@media', '@supports', '@container', '@scope', '@starting-style'):
                    walk(body, cond + (prelude,))
            elif prelude:
                rules.append({'sels': [s.strip() for s in split_top(prelude, ',') if s.strip()], 'decls': decls_of(body), 'cond': cond, 'order': len(rules)})
            i = k
    walk(css, ())
    return rules


def split_compounds(sel):
    out, depth, cur = [], 0, []
    for ch in sel.strip():
        if ch in '([':
            depth += 1
        elif ch in ')]':
            depth -= 1
        if depth == 0 and (ch.isspace() or ch in '>+~'):
            if cur:
                out.append(''.join(cur))
                cur = []
            continue
        cur.append(ch)
    if cur:
        out.append(''.join(cur))
    return out


def tokenize(compound):
    toks, i, n = [], 0, len(compound)
    while i < n:
        ch = compound[i]
        if ch == '.' or ch == '#':
            m = re.match(r'[-\w\\]+', compound[i + 1:])
            toks.append(('class' if ch == '.' else 'id', m.group(0) if m else ''))
            i += 1 + (len(m.group(0)) if m else 0)
        elif ch == '[':
            e = compound.find(']', i)
            e = n - 1 if e < 0 else e
            toks.append(('attr', compound[i + 1:e]))
            i = e + 1
        elif ch == ':':
            pe = compound[i + 1:i + 2] == ':'
            m = re.match(r'[-\w]+', compound[i + 1 + pe:])
            name = m.group(0) if m else ''
            i += 1 + pe + len(name)
            args = None
            if i < n and compound[i] == '(':
                d, k = 0, i
                while k < n:
                    d += (compound[k] == '(') - (compound[k] == ')')
                    k += 1
                    if d == 0:
                        break
                args = compound[i + 1:k - 1]
                i = k
            toks.append(('pseudo-el' if pe else 'pseudo', name.lower(), args))
        elif ch == '*' or ch.isalpha():
            m = re.match(r'[-\w]+|\*', compound[i:])
            toks.append(('type', m.group(0)))
            i += len(m.group(0))
        else:
            i += 1
    return toks


def specificity(sel):
    a = b = c = 0
    for comp in split_compounds(sel):
        for t in tokenize(comp):
            if t[0] == 'id':
                a += 1
            elif t[0] in ('class', 'attr'):
                b += 1
            elif t[0] == 'type' and t[1] != '*':
                c += 1
            elif t[0] == 'pseudo-el':
                c += 1
            elif t[0] == 'pseudo':
                if t[1] == 'where':
                    continue
                if t[1] in ('is', 'not', 'has', 'matches') and t[2]:
                    inner = max((specificity(x) for x in split_top(t[2], ',')), default=(0, 0, 0))
                    a, b, c = a + inner[0], b + inner[1], c + inner[2]
                else:
                    b += 1
    return (a, b, c)


NS_CLASS = re.compile(r'^(?:wp-block-)?sgs-[a-z0-9]+(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?$')


def _plain_classes(args):
    """Classes of a :where()/:is() argument that is only class selectors, else None."""
    out = []
    for part in split_top(args or '', ','):
        toks = tokenize(part.strip())
        if not toks or any(t[0] != 'class' for t in toks):
            return None
        out.extend(t[1] for t in toks)
    return out


def base_match(sel, names, aliases):
    """(specificity, where_flag) when `sel` paints the element unconditionally, else None."""
    comps = split_compounds(sel)
    if not comps:
        return None
    for comp in comps[:-1]:
        for t in tokenize(comp):
            if t[0] == 'class' and NS_CLASS.match(t[1]) and '--' not in t[1]:
                continue
            if t[0] == 'pseudo' and t[1] in ('where', 'is') and _plain_classes(t[2]) and all(NS_CLASS.match(c) and '--' not in c for c in _plain_classes(t[2])):
                continue
            return None
    found = where = False
    for t in tokenize(comps[-1]):
        if t[0] == 'type':
            continue
        if t[0] == 'class':
            if t[1] in names:
                found = True
            elif t[1] not in aliases:
                return None
        elif t[0] == 'pseudo' and t[1] in ('where', 'is'):
            cls = _plain_classes(t[2])
            if not cls or any(c not in names and c not in aliases for c in cls):
                return None
            if any(c in names for c in cls):
                found = True
                where = where or t[1] == 'where'
        else:
            return None
    return (specificity(sel), where) if found else None


def mentions(rules, names):
    pat = re.compile(r'\.(' + '|'.join(re.escape(n) for n in names) + r')(?![-\w])')
    return any(pat.search(s) for r in rules for s in r['sels'])


# ----------------------------------------------------------------------------------------------
# Value resolution
# ----------------------------------------------------------------------------------------------
VAR_RE = re.compile(r'var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)')


def resolve_vars(text, custom, depth=0):
    """Substitute var() with its fallback or a locally defined custom property; keep preset vars."""
    notes = []

    def sub(m):
        name, fb = m.group(1), m.group(2)
        if name.startswith('--wp--preset--spacing--'):
            return m.group(0)
        if name in custom and depth < 6:
            notes.append(f'custom-property {name}')
            return custom[name]
        if fb is not None and fb.strip() != '':
            notes.append(f'var-fallback {name}')
            return fb.strip()
        notes.append(f'unresolved {name}')
        return m.group(0)
    prev = None
    out = text
    for _ in range(5):
        if prev == out:
            break
        prev, out = out, VAR_RE.sub(sub, out)
    return out, notes


def side_values(prop, value, fam):
    """Map one padding/margin declaration to {side: token}. Logical sides assume left-to-right."""
    p = prop.lower()
    toks = [t for t in split_top(value.strip(), ' \t\n') if t.strip()]
    if p == fam:
        if not 1 <= len(toks) <= 4:
            return {s: value.strip() for s in SIDES} if len(toks) == 1 else {}
        t = toks + [None] * (4 - len(toks))
        top = t[0]
        right = t[1] if t[1] is not None else top
        bottom = t[2] if t[2] is not None else top
        left = t[3] if t[3] is not None else right
        return {'top': top, 'right': right, 'bottom': bottom, 'left': left}
    m = re.fullmatch(fam + r'-(top|right|bottom|left)', p)
    if m:
        return {m.group(1): value.strip()}
    mapping = {'block': ('top', 'bottom'), 'inline': ('left', 'right'), 'block-start': ('top',), 'block-end': ('bottom',), 'inline-start': ('left',), 'inline-end': ('right',)}
    m = re.fullmatch(fam + r'-(block|inline|block-start|block-end|inline-start|inline-end)', p)
    if m:
        sides = mapping[m.group(1)]
        if len(sides) == 1:
            return {sides[0]: value.strip()}
        a = toks[0] if toks else ''
        b = toks[1] if len(toks) > 1 else a
        return {sides[0]: a, sides[1]: b}
    return {}


def resolve_element_css(rules, names, aliases):
    """{'matched': [rule...], 'custom': {..}, 'mentioned': bool, 'variants': n, 'font_size': bool}."""
    matched = []
    variants = 0
    variant_rules = []
    pat = re.compile(r'\.(' + '|'.join(re.escape(n) for n in names) + r')(?![-\w])') if names else None
    for r in rules:
        hits = []
        for s in r['sels']:
            bm = base_match(s, names, aliases) if not r['cond'] else None
            if bm:
                hits.append((s, bm))
            elif pat and pat.search(s):
                variants += 1
                comps = split_compounds(s)
                if comps and pat.search(comps[-1]) and not re.search(r':(hover|focus|focus-visible|focus-within|active|visited)\b', comps[-1]):
                    variant_rules.append({'rule': r, 'sel': s})
        for s, bm in hits:
            matched.append({'rule': r, 'sel': s, 'spec': bm[0], 'where': bm[1]})
    custom = {}
    for m in sorted(matched, key=lambda x: x['rule']['order']):
        for prop, val, _ in m['rule']['decls']:
            if prop.startswith('--'):
                custom[prop] = val
    return {
        'matched': matched, 'custom': custom, 'variants': variants, 'variant_rules': variant_rules,
        'font_size': any(d[0] == 'font-size' for m in matched for d in m['rule']['decls']),
    }


def cond_tier(cond):
    """The device tier a media condition paints (Mobile < 768, Tablet 768-1023, Desktop >= 1024), else None.

    '' is no condition. A condition that is not one of the fixed tier ranges maps to no tier, so no tier entry covers it."""
    c = re.sub(r'\s+', '', cond.lower())
    if c == '@media(max-width:767px)':
        return 'mobile'
    if c in ('@media(min-width:768px)and(max-width:1023px)', '@media(max-width:1023px)'):
        return 'tablet'
    return None


def variant_tokens(sel, names, aliases):
    """The variant classes a selector keys on, apart from the element's own and the root's classes.

    A class is `name`; a :not() of classes is `!name`; any other qualifier (attribute, pseudo-class) is `?text`, which
    no declaration can name, so a rule keyed on one is never covered."""
    own = set(names) | set(aliases)
    out = set()
    for comp in split_compounds(sel):
        for t in tokenize(comp):
            if t[0] == 'class':
                if t[1] not in own:
                    out.add(t[1])
            elif t[0] == 'pseudo' and t[1] in ('where', 'is'):
                inner = _plain_classes(t[2])
                if inner is None:
                    out.add(f'?:{t[1]}({t[2]})')
                else:
                    out |= {c for c in inner if c not in own}
            elif t[0] == 'pseudo' and t[1] == 'not':
                inner = _plain_classes(t[2])
                if inner is None:
                    out.add(f'?:not({t[2]})')
                else:
                    out |= {'!' + c for c in inner}
            elif t[0] in ('attr', 'id'):
                out.add(f'?{t[0]}:{t[1]}')
            elif t[0] == 'pseudo':
                out.add(f'?:{t[1]}')
    return sorted(out)


def variant_side_values(css_info, fam, root_custom, names=(), aliases=()):
    """{side: [{'sel', 'cond', 'raw', 'tier', 'variant'}]}: what each variant or media/container rule paints the element's sides.

    `tier` is the device tier its media condition is (None for no condition or a condition that is no tier);
    `variant` is the variant classes its selector keys on (variant_tokens)."""
    custom = dict(root_custom)
    custom.update(css_info['custom'])
    out = {}
    for m in css_info['variant_rules']:
        cond = ' '.join(m['rule']['cond'])
        for prop, val, _ in m['rule']['decls']:
            if not prop.startswith(fam):
                continue
            resolved, _ = resolve_vars(val, custom)
            for side, tok in side_values(prop, resolved, fam).items():
                out.setdefault(side, []).append({'sel': m['sel'], 'cond': cond, 'raw': tok, 'tier': cond_tier(cond) if cond else None,
                                                 'variant': variant_tokens(m['sel'], names, aliases)})
    return out


def painted_sides(css_info, fam, root_custom):
    """{side: {'raw','notes','sel','where','important'}} for the winning base declaration per side."""
    custom = dict(root_custom)
    custom.update(css_info['custom'])
    best = {}
    for m in css_info['matched']:
        for prop, val, imp in m['rule']['decls']:
            if not prop.startswith(fam):
                continue
            resolved, notes = resolve_vars(val, custom)
            for side, tok in side_values(prop, resolved, fam).items():
                key = (imp, m['spec'], m['rule']['order'])
                if side not in best or key >= best[side][0]:
                    best[side] = (key, tok, notes, m['sel'], m['where'], imp)
    return {s: {'raw': v[1], 'notes': v[2], 'sel': v[3], 'where': v[4], 'important': v[5]} for s, v in best.items()}


# ----------------------------------------------------------------------------------------------
# Population: AST mounts -> (block, attribute)
# ----------------------------------------------------------------------------------------------
class Tree:
    """Where a census reads from. Fixtures supply their own tree, theme.json, sites and DB rows."""

    def __init__(self, plugin, theme_json, sites_dir, db_rows=None):
        self.plugin, self.theme_json, self.sites_dir, self.db_rows = Path(plugin), Path(theme_json), Path(sites_dir), db_rows


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def kebab(name):
    return re.sub(r'(?<=[a-z0-9])([A-Z])', r'-\1', name).lower()


def run_ast(tree):
    node = shutil.which('node')
    if not node:
        sys.exit('survey-spacing-defaults: node is required for the JSX pass and was not found on PATH')
    env = dict(os.environ, SGS_PLUGIN_DIR=str(PLUGIN))
    res = subprocess.run([node, '-', str(tree.plugin)], input=AST_JS, capture_output=True, text=True, encoding='utf-8', env=env, cwd=str(PLUGIN))
    if res.returncode != 0:
        sys.exit(f'survey-spacing-defaults: AST pass failed:\n{res.stderr[-2000:]}')
    return json.loads(res.stdout)


def load_blocks(tree):
    blocks = {}
    for bj in sorted(glob.glob(str(tree.plugin / 'src' / 'blocks' / '*' / 'block.json'))):
        d = Path(bj).parent
        data = read_json(bj)
        css_path, php_path = d / 'style.css', d / 'render.php'
        blocks[d.name] = {
            'dir': d.name, 'slug': data.get('name', f'sgs/{d.name}'), 'json': data,
            'attrs': set((data.get('attributes') or {}).keys()),
            'rules': parse_css(css_path.read_text(encoding='utf-8')) if css_path.exists() else [],
            'has_css': css_path.exists(), 'has_scss': (d / 'style.scss').exists(),
            'php': strip_php_comments(php_path.read_text(encoding='utf-8')) if php_path.exists() else '',
            'php_all': ' '.join(strip_php_comments(f.read_text(encoding='utf-8')) for f in sorted(d.glob('*.php'))),
        }
    for blk in blocks.values():
        text = ' '.join(s for r in blk['rules'] for s in r['sels'])
        blk['custom_names'] = {d[0] for r in blk['rules'] for d in r['decls'] if d[0].startswith('--')}
        blk['css_classes'] = set(re.findall(r'\.(sgs-[A-Za-z0-9_-]+)', text))
        blk['bem_pairs'] = {tuple(c.split('__', 1)) for c in blk['css_classes'] if '__' in c and '--' not in c.split('__', 1)[1]}
    return blocks


def strip_php_comments(text):
    text = re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), text, flags=re.S)
    return re.sub(r'(?m)^\s*//.*$', '', text)


def block_of(path, blocks):
    m = re.match(r'src/blocks/([^/]+)/', path)
    return m.group(1) if m and m.group(1) in blocks else None


class Graph:
    """JSX usage graph: who renders a component, through re-export barrels."""

    def __init__(self, ast):
        self.reexported_by = {}
        for f, info in ast['files'].items():
            for t in info['reexports']:
                self.reexported_by.setdefault(t, set()).add(f)
        self.by_r, self.same = {}, {}
        for u in ast['uses']:
            if u['r']:
                self.by_r.setdefault(u['r'], []).append(u)
            else:
                self.same.setdefault(u['f'], []).append(u)

    def targets(self, f):
        seen, queue = set(), [f]
        while queue:
            x = queue.pop()
            if x not in seen:
                seen.add(x)
                queue.extend(self.reexported_by.get(x, ()))
        return seen

    def uses_of(self, f, comp):
        out = []
        for t in self.targets(f):
            out.extend(u for u in self.by_r.get(t, ()) if u['i'] in (comp, 'default', '*'))
        out.extend(u for u in self.same.get(f, ()) if u['l'] == comp and u['e'] != comp)
        return out

    def reach(self, f, comp, blocks):
        """Blocks whose files (transitively) render component `comp` defined in `f`."""
        found, seen, queue = set(), set(), [(f, comp)]
        while queue and comp:
            node = queue.pop()
            if node in seen:
                continue
            seen.add(node)
            for u in self.uses_of(*node):
                b = block_of(u['f'], blocks)
                if b:
                    found.add(b)
                if u['e']:
                    queue.append((u['f'], u['e']))
        return found


def norm_family(text):
    """padding / margin / border-width / border-radius from a css property or a boxFamilies key."""
    low = text.lower().replace('_', '-')
    for needle, fam in (('padding', 'padding'), ('margin', 'margin'), ('border-width', 'border-width'), ('borderwidth', 'border-width'), ('radius', 'border-radius')):
        if needle in low:
            return fam
    return 'other'


def classify(blk, attr, label):
    """(family, [element names], source) from block.json first, then the label, then the name."""
    sgs = (blk['json'].get('supports') or {}).get('sgs') or {}
    fam, els = None, []
    for en, e in (sgs.get('elements') or {}).items():
        for key, val in ((e or {}).get('attrMap') or {}).items():
            if val == attr and key.startswith('css:'):
                fam = fam or norm_family(key[4:])
                els.append(en)
    if fam:
        return fam, els, 'block.json attrMap'
    for f, names in (sgs.get('boxFamilies') or {}).items():
        if attr in (names or []):
            return norm_family(f), [], 'block.json boxFamilies'
    low = (label or '').lower()
    for word, f in (('padding', 'padding'), ('margin', 'margin'), ('border width', 'border-width'), ('radius', 'border-radius')):
        if word in low:
            return f, [], 'mount label'
    for pat, f in ((r'[Pp]adding', 'padding'), (r'[Mm]argin', 'margin'), (r'[Bb]orderWidth', 'border-width'), (r'[Rr]adius', 'border-radius')):
        if re.search(pat, attr):
            return f, [], 'attribute name'
    return 'other', [], 'unclassified'


def expand_mounts(ast, blocks, graph):
    """-> (hits, unresolved). A hit is one mount reaching one (block, attribute)."""
    hits, unresolved = [], []
    seen = set()

    def add(block, attr, m, via):
        key = (block, attr, m['file'], m['line'])
        if key not in seen:
            seen.add(key)
            hits.append({'block': block, 'attr': attr, 'mount': m, 'via': via})

    pad_mount = next((m for m in ast['mounts'] if m['file'].endswith('media/atoms/media-padding.control.js')), None)
    if pad_mount:
        for b in blocks.values():
            for el in (((b['json'].get('supports') or {}).get('sgs') or {}).get('mediaElements') or []):
                if 'media-padding' in (el.get('atoms') or []):
                    attr = (el.get('prefix') + 'Padding') if el.get('prefix') else 'padding'
                    if attr in b['attrs']:
                        add(b['dir'], attr, pad_mount, 'media-padding atom (block.json mediaElements)')
                    else:
                        unresolved.append({'what': f'{b["dir"]}: media-padding atom key {attr} is not declared', 'where': 'block.json'})
    for m in ast['mounts']:
        f, comp = m['file'], m['component']
        if f in DEFINITION_FILES:
            unresolved.append({'what': f'{comp} forwarding mount in a control-definition file (attribute comes from its callers)', 'where': f'{f}:{m["line"]}'})
            continue
        if comp == 'ResponsiveBoxControls' or f.endswith('media/atoms/media-padding.control.js'):
            continue
        own = block_of(f, blocks)
        targets = ({own} if own else set()) | graph.reach(f, m['enclosing'], blocks)
        static = set(m['setKeys']) | {v for vals in m['dynResolved'].values() for v in vals}
        via = 'setAttributes key'
        if not static and not m['dynamicKeys']:
            static = set(m['valueNames']) | set(m['strings'])
            via = 'value prop'
        for dyn in m['dynamicKeys']:
            if dyn in m['dynResolved'] or dyn == '$expr':
                continue
            if dyn in m['enclosingParams']:
                got = False
                for u in graph.uses_of(f, m['enclosing']):
                    attr = u['props'].get(dyn)
                    if not attr:
                        continue
                    ub = block_of(u['f'], blocks)
                    for tb in ({ub} if ub else graph.reach(u['f'], u['e'], blocks)):
                        if attr in blocks[tb]['attrs']:
                            add(tb, attr, m, f'prop {dyn}="{attr}" at {u["f"]}')
                            got = True
                if not got:
                    unresolved.append({'what': f'{m["enclosing"]} takes its attribute from prop `{dyn}`; no call site passes a literal', 'where': f'{f}:{m["line"]}'})
            else:
                unresolved.append({'what': f'computed attribute key `{dyn}` could not be resolved', 'where': f'{f}:{m["line"]}'})
        matched = False
        for b in sorted(targets):
            for attr in sorted(static & blocks[b]['attrs']):
                add(b, attr, m, via)
                matched = True
        if static and via == 'setAttributes key' and not matched and own:
            unresolved.append({'what': f'setAttributes keys {sorted(static)} are not declared by block {own}', 'where': f'{f}:{m["line"]}'})
        if not static and not m['dynamicKeys']:
            unresolved.append({'what': f'{comp} mount names no attribute', 'where': f'{f}:{m["line"]}'})
    return hits, unresolved


# ----------------------------------------------------------------------------------------------
# Per-attribute rows
# ----------------------------------------------------------------------------------------------
def root_classes(blk):
    """Root class names: slug-derived, selectors.root, and the sgs-* literals render.php hands to
    get_block_wrapper_attributes() that style.css also uses."""
    b = blk['dir']
    names = {f'wp-block-sgs-{b}', f'sgs-{b}'}
    sel_root = (blk['json'].get('selectors') or {}).get('root', '')
    if re.fullmatch(r'\.[-\w]+', sel_root or ''):
        names.add(sel_root[1:])
    php, css_classes = blk['php'], blk['css_classes']
    for m in re.finditer(r'get_block_wrapper_attributes', php):
        window = php[max(0, m.start() - 1500):m.start()]
        for c in re.findall(r"(?<![-\w])(sgs-[a-z0-9]+(?:-[a-z0-9]+)*)(?![-\w])", window):
            if c in css_classes:
                names.add(c)
    return names


def element_classes(blk, element, root):
    """(names the element is painted by, root aliases that may share its compound)."""
    roots = root_classes(blk)
    if root:
        return roots, roots
    names = set()
    for stem, el in blk['bem_pairs']:
        if el in (kebab(element), element):
            names.add(f'{stem}__{el}')
    for r in roots:
        if r.startswith('sgs-'):
            names |= {f'{r}__{kebab(element)}', f'{r}__{element}'}
    return names, roots


def render_fallbacks(php, fam):
    pat = re.compile(r'(' + fam + r'(?:-[a-z-]+)?)\s*:\s*([^;\'"{}]*var\(\s*--[\w-]+\s*,[^;\'"{}]*)', re.I)
    return [(m.group(1), m.group(2).strip()) for m in pat.finditer(php)]


def side_row(raw_info, ctx):
    """Classify one side. ctx: scale, fam, block, attr, css_info, font_size, php_fb, names."""
    scale = {p['slug']: p for p in ctx['scale']}
    base = {'side': raw_info['side']}
    painted = raw_info.get('painted')
    if painted is None:
        fb = [v for p, v in ctx['php_fb'] if p == ctx['fam'] or p.startswith(ctx['fam'] + '-' + raw_info['side'])]
        if fb:
            return {**base, 'status': 'unknown', 'reason': f'render.php emits var() fallback text for {ctx["fam"]} (element not verified): {fb[0]}', 'raw': None}
        if ctx['css_info']['matched'] or ctx['mentioned']:
            return {**base, 'status': 'stay-unset', 'reason': 'absent', 'raw': None}
        if not ctx['has_css']:
            return {**base, 'status': 'unknown', 'reason': 'block has no style.css' + (' (style.scss only, not parsed)' if ctx['has_scss'] else ''), 'raw': None}
        return {**base, 'status': 'unknown', 'reason': f'style.css has no rule naming .{sorted(ctx["names"])[0]} (the paint may come from render.php or a shared wrapper, which are not read)', 'raw': None}
    raw = painted['raw'].strip()
    row = {**base, 'raw': raw, 'source': {'selector': painted['sel'], 'where': painted['where'], 'important': painted['important'], 'file': 'style.css'}, 'notes': painted['notes']}
    low = raw.lower()
    if BUTTON_PRESETS in raw or (ctx['block'] == 'button' and ctx['attr'] == 'padding'):
        return {**row, 'status': 'exempt', 'reason': 'theme-button-presets'}
    if ctx['block'] == 'container' and ctx['attr'] in ('padding', 'margin'):
        return {**row, 'status': 'stay-unset', 'reason': 'layout-gutter (container own padding/margin; core .has-global-padding)'}
    if '--wp--style--root--padding' in raw or 'has-global-padding' in painted['sel']:
        return {**row, 'status': 'stay-unset', 'reason': 'layout-gutter'}
    pm = PRESET_VAR.fullmatch(raw)
    if pm:
        p = scale.get(pm.group(1))
        if not p:
            return {**row, 'status': 'unknown', 'reason': f'preset slug {pm.group(1)} is not in theme.json'}
        return {**row, 'status': 'default', 'reason': 'already a preset', 'px': p['px'], 'already_preset': True, 'proposed': {'kind': 'preset', 'value': f'var(--wp--preset--spacing--{p["slug"]})', 'slug': p['slug'], 'name': p['name'], 'preset_px': p['px']}}
    if low == 'auto':
        return {**row, 'status': 'stay-unset', 'reason': 'auto'}
    if low in ('inherit', 'initial', 'unset', 'revert', 'revert-layer'):
        return {**row, 'status': 'stay-unset', 'reason': 'inherit'}
    px, unit, note = to_px(raw)
    if note == 'percentage':
        return {**row, 'status': 'stay-unset', 'reason': 'percentage'}
    if px is None:
        um = re.search(r'var\(\s*(--[\w-]+)', raw)
        reason = f'unresolved custom property {um.group(1)} (not defined in this block\'s style.css)' if um else note
        return {**row, 'status': 'unknown', 'reason': reason}
    if px == 0:
        return {**row, 'status': 'stay-unset', 'reason': 'zero'}
    if px < 0:
        return {**row, 'status': 'unknown', 'reason': 'negative-length (no preset is negative)'}
    row['px'] = round(px, 4)
    if note == 'em' and ctx['font_size']:
        return {**row, 'status': 'em-ambiguous', 'reason': 'element sets its own font-size; em is not 16px', 'proposed_if_16px': propose(px, raw, ctx['scale'])}
    return {**row, 'status': 'default', 'reason': 'stylesheet length', 'proposed': propose(px, raw, ctx['scale'])}


def mount_presets(m):
    p = m['presets']
    return p['value'] if p['kind'] == 'list' else f'dynamic: {p["expr"]}' if p['kind'] == 'dynamic' else p['kind']


def build_rows(tree, blocks, hits, scale):
    """{(block, attr): attribute row}."""
    grouped = {}
    for h in hits:
        grouped.setdefault((h['block'], h['attr']), []).append(h)
    out = {}
    for (b, attr), hs in sorted(grouped.items()):
        blk = blocks[b]
        label = next((h['mount']['label'] for h in hs if h['mount']['label']), None)
        fam, els, esrc = classify(blk, attr, label)
        sgs = (blk['json'].get('supports') or {}).get('sgs') or {}
        elmap = sgs.get('elements') or {}
        root = bool(els) and any(e == 'wrapper' or (elmap.get(e) or {}).get('isWrapper') for e in els)
        if not els:
            stem = re.sub(r'(?i)(padding|margin)$', '', attr)
            root = stem == ''
            els, esrc = ([stem] if stem else ['wrapper']), esrc + ' + name-derived element'
        element = els[0] if not root else (next((e for e in els if e == 'wrapper' or (elmap.get(e) or {}).get('isWrapper')), els[0]))
        names, aliases = element_classes(blk, element, root)
        sides_gov = set()
        for h in hs:
            s = h['mount']['sides']
            sides_gov |= set(SIDES) if s in (None, 'dynamic') else {x for x in s if x in SIDES}
        kinds = [h['mount']['presets']['kind'] for h in hs]
        presets = 'true' if 'true' in kinds else 'list' if 'list' in kinds else 'dynamic' if 'dynamic' in kinds else 'false'
        mounts = [{'file': h['mount']['file'], 'line': h['mount']['line'], 'component': h['mount']['component'], 'presets': mount_presets(h['mount']), 'defaults': h['mount'].get('defaults'), 'sides': h['mount']['sides'], 'via': h['via']} for h in hs]
        row = {'block': b, 'attr': attr, 'family': fam, 'family_source': esrc, 'element': element, 'root_element': root, 'classes': sorted(names), 'presets': presets, 'mounts': mounts, 'sides': []}
        if fam in FAMILIES_WITH_DEFAULTS:
            info = resolve_element_css(blk['rules'], names, aliases)
            root_info = resolve_element_css(blk['rules'], *element_classes(blk, 'wrapper', True))
            painted = painted_sides(info, fam, root_info['custom'])
            ctx = {'scale': scale, 'fam': fam, 'block': b, 'attr': attr, 'css_info': info, 'font_size': info['font_size'], 'php_fb': render_fallbacks(blk['php'], fam), 'names': names, 'custom_names': blk['custom_names'], 'has_css': blk['has_css'], 'has_scss': blk['has_scss'], 'mentioned': mentions(blk['rules'], names)}
            overrides = variant_side_values(info, fam, root_info['custom'], names, aliases)
            for s in SIDES:
                if s in sides_gov:
                    srow = side_row({'side': s, 'painted': painted.get(s)}, ctx)
                    base_px = to_px(srow['raw'])[0] if srow.get('raw') and not PRESET_VAR.fullmatch(srow['raw']) else srow.get('px')
                    diff = [o for o in overrides.get(s, []) if o['raw'] != srow.get('raw') and (base_px is None or to_px(o['raw'])[0] != base_px)]
                    if diff:
                        srow['overridden_by'] = diff
                        if srow['status'] == 'default':
                            srow['status'] = 'variant-dependent'
                            srow['reason'] = f'a variant or media rule paints {diff[0]["raw"]} ({diff[0]["sel"]}{" " + diff[0]["cond"] if diff[0]["cond"] else ""}); one declared default would misreport it'
                    row['sides'].append(srow)
            row['variant_rules'] = info['variants']
        else:
            row['not_spacing'] = f'{fam}: listed, no Spacing defaults computed'
        out[(b, attr)] = row
    return out


# ----------------------------------------------------------------------------------------------
# DB cross-check, snapshots, census assembly
# ----------------------------------------------------------------------------------------------
def db_rows(tree):
    if tree.db_rows is not None:
        return tree.db_rows
    if not DB_PATH.exists():
        return None
    con = sqlite3.connect(f'file:{DB_PATH}?mode=ro', uri=True)
    try:
        cur = con.execute("SELECT block_slug, attr_name, css_property, box_family, inspector_control_type FROM block_attributes WHERE source='sgs' AND block_slug LIKE 'sgs/%'")
        return [dict(zip(('block_slug', 'attr_name', 'css_property', 'box_family', 'inspector_control_type'), r)) for r in cur.fetchall()]
    finally:
        con.close()


def js_references(tree, block, attr):
    n = 0
    for f in glob.glob(str(tree.plugin / 'src' / 'blocks' / block / '**' / '*.js'), recursive=True):
        n += len(re.findall(r'(?<![\w$])' + re.escape(attr) + r'(?![\w$])', Path(f).read_text(encoding='utf-8', errors='replace')))
    return n


def db_crosscheck(tree, rows, db, blocks):
    if db is None:
        return {'available': False}
    dbset = {}
    for r in db:
        fam = (r.get('box_family') or '').lower()
        prop = (r.get('css_property') or '').lower()
        if 'padding' in fam or 'margin' in fam or prop in ('padding', 'margin'):
            dbset[(r['block_slug'].split('/', 1)[1], r['attr_name'])] = r
    src = {k for k, v in rows.items() if v['family'] in FAMILIES_WITH_DEFAULTS}
    return {
        'available': True, 'source_count': len(src), 'db_count': len(dbset),
        'source_only': [{'block': b, 'attr': a} for b, a in sorted(src - set(dbset))],
        'db_only': [{'block': b, 'attr': a, 'css_property': dbset[(b, a)].get('css_property'), 'box_family': dbset[(b, a)].get('box_family'), 'inspector_control_type': dbset[(b, a)].get('inspector_control_type'), 'declared_in_block_json': a in blocks.get(b, {'attrs': set()})['attrs'],
                     'js_references_in_block': js_references(tree, b, a),
                     'why': 'declared but nothing in the block edits it' if not js_references(tree, b, a) else 'edited by a control other than SgsBoxControl (or not by a mount this pass can name)'} for b, a in sorted(set(dbset) - src)],
    }


def snapshot_report(tree, scale):
    base = {p['slug'] for p in scale}
    out = {}
    for f in sorted(glob.glob(str(tree.sites_dir / '*' / 'theme-snapshot.json'))):
        site = Path(f).parent.name
        data = read_json(f)
        sizes = ((data.get('settings') or {}).get('spacing') or {}).get('spacingSizes')
        if sizes:
            out[site] = {'declares_scale': True, 'slugs': [str(s['slug']) for s in sizes], 'slug_px': {str(s['slug']): to_px(str(s.get('size', '')))[0] for s in sizes}}
        else:
            out[site] = {'declares_scale': False, 'slugs': sorted(base), 'assumed': 'inherits theme.json scale (assumption, not verified in WordPress core)', 'slug_px': {p['slug']: p['px'] for p in scale}}
    return out


def declared_problems(value, srow, scale):
    """Why a declared side's value is not what its stylesheet paints (Bean D1, 2026-10-09).

    A preset's var() fallback is optional (a shorthand of presets such as `padding: var(--a) var(--b)` needs none);
    one that is present must be the preset's theme size."""
    raw = (srow.get('raw') or '').strip()
    sm = PRESET_VAR.fullmatch(raw)
    m = DECLARED_VAR.fullmatch(value.strip())
    if m:
        slug = m.group(1)
        if not sm:
            return [f'stylesheet paints {srow.get("raw")!r} ({srow["status"]}), not the declared preset']
        if sm.group(1) != slug and 'declared-ignore-slug' not in MUTATE:
            return [f'stylesheet falls back to preset {sm.group(1)}, the declaration names {slug}']
        preset = next((p for p in scale if p['slug'] == slug), None)
        fb = PRESET_FALLBACK.fullmatch(raw)
        fb_px = to_px(fb.group(1))[0] if fb else None
        if preset and fb and (fb_px is None or abs(fb_px - preset['px']) > 1e-9) and 'declared-ignore-fallback' not in MUTATE:
            return [f"the stylesheet var() fallback {fb.group(1)!r} is not preset {slug}'s theme size {preset['size']}"]
        return []
    px = to_px(value)[0]
    if sm:
        return [f'stylesheet paints the preset {raw!r}, the declaration names the length {value!r}']
    have = to_px(raw)[0] if raw else None
    if have is None or abs(have - px) > 1e-9:
        return [f'stylesheet paints {srow.get("raw")!r}, the declaration names {value!r}']
    exact = exact_preset(px, scale)
    if exact and 'declared-ignore-exact' not in MUTATE:
        return [f'{value!r} equals preset {exact["slug"]} ({exact["size"]}) exactly; declare and paint var(--wp--preset--spacing--{exact["slug"]}, {exact["size"]})']
    return []


def is_declarable(value):
    """A literal preset var() or a plain px/rem length."""
    if not isinstance(value, str) or not value.strip():
        return False
    if DECLARED_VAR.fullmatch(value.strip()):
        return True
    px, unit, note = to_px(value)
    return px is not None and px > 0 and unit in ('px', 'rem') and not note


def is_declarable_override(value):
    """A tier or when value is declarable, or the literal "0" (a base side that paints 0 stays unset; a repaint can paint it)."""
    return isinstance(value, str) and (value.strip() == '0' or is_declarable(value))


RESERVED_KEYS = ('tablet', 'mobile', 'when')
CLASS_TOKEN = re.compile(r'^!?[a-z][a-z0-9_-]*$')
BAD_VALUE = 'declared value {0!r} is neither a literal var(--wp--preset--spacing--N), a px/rem length nor "0"'


def override_value_problems(value, raw, scale):
    """(problems, notes): a tier or when value against what the media or variant rule paints.

    A literal that equals a preset size exactly is a note, not a failure: the rule paints the literal, and the
    declaration must say what the stylesheet paints; painting var(--wp--preset--spacing--N, size) is then owed."""
    if 'tier-ignore-value' in MUTATE:
        return [], []
    raw = (raw or '').strip()
    sm = PRESET_VAR.fullmatch(raw)
    m = DECLARED_VAR.fullmatch(value.strip())
    if m:
        if not sm:
            return [f'the rule paints {raw!r}, not the declared preset {value!r}'], []
        if sm.group(1) != m.group(1):
            return [f'the rule paints preset {sm.group(1)}, the declaration names {m.group(1)}'], []
        preset = next((p for p in scale if p['slug'] == m.group(1)), None)
        fb = PRESET_FALLBACK.fullmatch(raw)
        if preset and fb:
            fb_px = to_px(fb.group(1))[0]
            if fb_px is None or abs(fb_px - preset['px']) > 1e-9:
                return [f"the rule's var() fallback {fb.group(1)!r} is not preset {m.group(1)}'s theme size {preset['size']}"], []
        return [], []
    if sm:
        return [f'the rule paints the preset {raw!r}, the declaration names the length {value!r}'], []
    px = to_px(value)[0]
    have = to_px(raw)[0] if raw else None
    if px is None or have is None or abs(px - have) > 1e-9:
        return [f'the rule paints {raw!r}, the declaration names {value!r}'], []
    exact = exact_preset(px, scale) if px > 0 else None
    notes = [f'{value!r} equals preset {exact["slug"]} ({exact["size"]}) exactly; the rule paints the literal, so painting var(--wp--preset--spacing--{exact["slug"]}, {exact["size"]}) is owed'] if exact else []
    return [], notes


def attr_value_problem(blk, attr, value):
    """Why `attr` cannot take `value` (block.json attributes, type and enum), else None."""
    spec = (blk['json'].get('attributes') or {}).get(attr)
    if spec is None:
        return f'names attribute {attr!r}, which block.json does not declare'
    if 'when-ignore-attrs' in MUTATE:
        return None
    enum = spec.get('enum')
    if enum is not None and value not in enum:
        return f'names {value!r} for {attr!r}, which is not in its enum {enum}'
    typ = spec.get('type')
    if enum is None and ((typ == 'boolean' and not isinstance(value, bool)) or (typ == 'string' and not isinstance(value, str))
                         or (typ in ('number', 'integer') and (isinstance(value, bool) or not isinstance(value, (int, float))))):
        return f'names {value!r} for {attr!r}, which is not of its type {typ}'
    return None


def class_emission_problem(blk, token, attrs):
    """Why the block's PHP is not seen emitting variant class `token` (`!` marks a :not()), else None.

    The class is emitted when the PHP holds it literally, or holds the class minus a trailing attribute value (the
    `'sgs-x--card-' . $card_style` shape). A block with no PHP is not checked."""
    php = blk.get('php_all') or ''
    if not php or 'when-ignore-classes' in MUTATE:
        return None
    c = token.lstrip('!')
    if c in php:
        return None
    for v in attrs.values():
        if isinstance(v, str) and v and c.endswith(v) and c[:-len(v)] in php:
            return None
    return f"class {c} is not emitted by the block's PHP for {attrs}"


def parse_overrides(sides, blk):
    """(entries, structure): the tier and when values of one attribute's declaration.

    entries: [{'label', 'side', 'value', 'tier', 'variant' (sorted tokens), 'problems'}]; the label reads
    'mobile.top' or 'when[0].mobile.top'. structure: [(label, problem)], the problems with the shape itself (a non-object tier, a when entry
    with no attrs or classes, an attribute or value the block cannot take, a class the PHP never emits)."""
    entries, structure = [], []

    def tier_obj(obj, tier, variant, prefix):
        if not isinstance(obj, dict):
            structure.append(('shape', f'{prefix}{tier} is not a {{side: value}} object'))
            return
        for side, value in sorted(obj.items()):
            probs = []
            if side not in SIDES:
                probs.append(f'{side!r} is not a side')
            elif not is_declarable_override(value):
                probs.append(BAD_VALUE.format(value))
            entries.append({'label': f'{prefix}{tier}.{side}', 'side': side, 'value': value, 'tier': tier, 'variant': variant, 'problems': probs})

    for tier in ('tablet', 'mobile'):
        if tier in sides:
            tier_obj(sides[tier], tier, [], '')
    whens = sides.get('when')
    if whens is None:
        return entries, structure
    if not isinstance(whens, list):
        return entries, structure + [('shape', 'when is not a list')]
    for i, w in enumerate(whens):
        prefix = f'when[{i}].'
        if not isinstance(w, dict):
            structure.append(('shape', f'when[{i}] is not an object'))
            continue
        probs = []
        attrs, classes = w.get('attrs'), w.get('classes')
        if not isinstance(attrs, dict) or not attrs:
            probs.append(f'when[{i}] has no attrs object (attribute name -> value)')
            attrs = {}
        if not isinstance(classes, list) or not classes or any(not isinstance(c, str) or not CLASS_TOKEN.match(c) for c in classes):
            probs.append(f'when[{i}] needs classes: the variant class names the stylesheet keys on ("!name" for a :not())')
            classes = []
        for attr, value in attrs.items():
            pr = attr_value_problem(blk, attr, value)
            if pr:
                probs.append(f'when[{i}] {pr}')
        for c in classes:
            pr = class_emission_problem(blk, c, attrs)
            if pr:
                probs.append(f'when[{i}] {pr}')
        for k in w:
            if k not in SIDES + ('attrs', 'classes', 'tablet', 'mobile'):
                probs.append(f'when[{i}] has an unknown key {k!r}')
        variant = sorted(classes)
        for side, value in sorted((k, v) for k, v in w.items() if k in SIDES):
            entries.append({'label': f'{prefix}{side}', 'side': side, 'value': value, 'tier': None, 'variant': variant,
                            'problems': [] if is_declarable_override(value) else [BAD_VALUE.format(value)]})
        for tier in ('tablet', 'mobile'):
            if tier in w:
                tier_obj(w[tier], tier, variant, prefix)
        if probs:
            structure.append((f'when[{i}]', '; '.join(probs)))
    return entries, structure


def entry_problems(entry, got, scale):
    """(problems, notes) for one tier or when value against the rule that repaints its side at that tier and setting.

    With no such rule the side keeps what the stylesheet's base paints, so the value must equal that."""
    problems = list(entry['problems'])
    notes = []
    srow = got.get(entry['side'])
    if not srow:
        return problems + ['no Spacing control governs this side'], notes
    if problems:
        return problems, notes
    rules = [o for o in srow.get('overridden_by', []) if o['tier'] == entry['tier'] and o['variant'] == entry['variant']]
    for o in rules or [{'raw': srow.get('raw')}]:
        pr, nt = override_value_problems(entry['value'], o['raw'], scale)
        problems += pr
        notes += nt
        if pr:
            break
    return problems, notes


def coverage_problems(side, got, entries):
    """Why a variant or media rule that repaints `side` is not covered by a tier or when entry; [] when every one is."""
    if 'declared-ignore-variant' in MUTATE:
        return []
    out = []
    for o in (got.get(side) or {}).get('overridden_by', []):
        where = f'({o["sel"]}{" " + o["cond"] if o["cond"] else ""} = {o["raw"]})'
        if o['cond'] and o['tier'] is None:
            out.append(f'a variant or media rule repaints this side {where}; its condition is no device tier (mobile < 768px, tablet 768-1023px), so no entry can cover it')
        elif any(t.startswith('?') for t in o['variant']):
            out.append(f'a variant or media rule repaints this side {where}; its selector keys on something a when entry cannot name')
        elif not any(e['side'] == side and e['tier'] == o['tier'] and e['variant'] == o['variant'] and isinstance(e['value'], str) for e in entries):
            kind = 'when' if o['variant'] else 'tier'
            out.append(f'a variant or media rule repaints this side {where}; no {kind} entry declares it')
    return out


def declared_report(blocks, rows, snaps, scale):
    """One entry per side a block.json::supports.sgs.spacingDefaults declares, with its problems.

    A declaration is a base (the four sides) plus optional `tablet` / `mobile` overrides and `when` entries (see
    src/utils/spacing-defaults.js). A side whose stylesheet paints exactly its base (the same preset, or the same
    length) and whose every variant or media repaint a tier or when entry declares correctly is marked `declared` on
    its census row; a snapshot that lacks a declared slug is still a problem for the gate. Tier and when values get
    their own entries (side `mobile.top`, `when[0].top`) checked against the rules that paint them."""
    out = []
    for b, blk in sorted(blocks.items()):
        decl = ((blk['json'].get('supports') or {}).get('sgs') or {}).get('spacingDefaults')
        if decl is None:
            continue
        if not isinstance(decl, dict):
            out.append({'block': b, 'attr': None, 'side': None, 'value': decl, 'slug': None, 'problems': ['supports.sgs.spacingDefaults is not an object']})
            continue
        for attr, sides in sorted(decl.items()):
            row = rows.get((b, attr))
            if not isinstance(sides, dict):
                out.append({'block': b, 'attr': attr, 'side': None, 'value': sides, 'slug': None, 'problems': ['the attribute entry is not a {side: value} object']})
                continue
            got = {s['side']: s for s in row['sides']} if row else {}
            entries, structure = parse_overrides(sides, blk)
            has_overrides = any(k in sides for k in RESERVED_KEYS)
            for side, value in sorted(sides.items()):
                if side in RESERVED_KEYS:
                    continue
                problems = []
                m = DECLARED_VAR.fullmatch(value.strip()) if isinstance(value, str) else None
                slug = m.group(1) if m else None
                if not is_declarable(value):
                    problems.append(f'declared value {value!r} is neither a literal var(--wp--preset--spacing--N) nor a px/rem length')
                if side not in SIDES:
                    problems.append(f'{side!r} is not a side')
                elif not row:
                    problems.append('no Spacing control edits this attribute')
                elif row['family'] not in FAMILIES_WITH_DEFAULTS:
                    problems.append(f'the attribute is {row["family"]}, not padding or margin')
                elif side not in got:
                    problems.append('no Spacing control governs this side')
                elif not problems:
                    problems += declared_problems(value, got[side], scale)
                    problems += coverage_problems(side, got, entries)
                if row and 'mount-ignore-defaults' not in MUTATE:
                    for mt in row['mounts']:
                        md = mt.get('defaults')
                        if not md:
                            problems.append(f'the mount at {mt["file"]}:{mt["line"]} passes no defaults prop, so the control cannot show the declared default')
                        elif md['call'] and md['attr'] is not None and md['attr'] != attr:
                            problems.append(f'the mount at {mt["file"]}:{mt["line"]} reads {md["expr"]}, not this attribute ({attr})')
                        elif has_overrides and md['call'] and 'mount-ignore-context' not in MUTATE:
                            ctx = md.get('ctx') or ''
                            need = (['tier'] if any(e['tier'] for e in entries) else []) + (['attributes'] if any(e['variant'] for e in entries) else [])
                            missing = [n for n in need if not re.search(r'\b' + n + r'\b', ctx)]
                            if missing:
                                problems.append(f'the mount at {mt["file"]}:{mt["line"]} resolves this attribute\'s tier or when entries but passes no {" or ".join(missing)} in the spacingDefaultsFor context, so the control shows only the base')
                agree = not problems
                gaps = sorted(site for site, v in snaps.items() if slug and slug not in v['slugs'])
                if gaps:
                    problems.append(f'slug {slug} is missing from snapshot(s) {gaps}')
                if row and side in got:
                    got[side]['declared'] = value
                    if agree:
                        got[side]['status'] = 'declared'
                        got[side]['reason'] = (f'declared default (supports.sgs.spacingDefaults); the stylesheet falls back to the same preset {slug}' if slug
                                               else f'declared default (supports.sgs.spacingDefaults); the stylesheet paints the same length {value}')
                out.append({'block': b, 'attr': attr, 'side': side, 'value': value, 'slug': slug, 'problems': problems})
            for label, text in structure:
                out.append({'block': b, 'attr': attr, 'side': label, 'value': None, 'slug': None, 'problems': [text]})
            for e in entries:
                problems, notes = entry_problems(e, got, scale) if row else (e['problems'] + ['no Spacing control edits this attribute'], [])
                dm = DECLARED_VAR.fullmatch(e['value'].strip()) if isinstance(e['value'], str) else None
                slug = dm.group(1) if dm else None
                gaps = sorted(site for site, v in snaps.items() if slug and slug not in v['slugs'])
                if gaps:
                    problems.append(f'slug {slug} is missing from snapshot(s) {gaps}')
                out.append({'block': b, 'attr': attr, 'side': e['label'], 'value': e['value'], 'slug': slug, 'tier': e['tier'], 'when': e['variant'] or None, 'problems': problems, 'notes': notes})
    return out


def build_census(tree):
    scale = load_scale(tree.theme_json)
    ast = run_ast(tree)
    blocks = load_blocks(tree)
    graph = Graph(ast)
    hits, unresolved = expand_mounts(ast, blocks, graph)
    rows = build_rows(tree, blocks, hits, scale)
    unresolved += [{'what': 'file did not parse', 'where': p} for p in ast['parseErrors']]
    delegating = sorted({f'{m["file"]}:{m["line"]}' for m in ast['mounts'] if m['file'] == 'src/components/SgsBorderControl.js'})
    snaps = snapshot_report(tree, scale)
    declared = declared_report(blocks, rows, snaps, scale)
    proposed = sorted({s['proposed']['slug'] for r in rows.values() for s in r['sides'] if s['status'] == 'default' and s['proposed']['slug']} | {d['slug'] for d in declared if d['slug']})
    gaps = {site: sorted(set(proposed) - set(v['slugs']), key=int) for site, v in snaps.items() if set(proposed) - set(v['slugs'])}
    allsides = [s for r in rows.values() for s in r['sides']]
    spacing = [r for r in rows.values() if r['family'] in FAMILIES_WITH_DEFAULTS]
    mounts_flat = [(r, m) for r in spacing for m in r['mounts']]
    census = {
        'scale': scale,
        'attributes': [rows[k] for k in sorted(rows)],
        'db_crosscheck': db_crosscheck(tree, rows, db_rows(tree), blocks),
        'snapshots': snaps, 'proposed_slugs': proposed, 'slug_gaps': gaps, 'declared_defaults': declared,
        'unresolved': unresolved, 'delegating_border_mounts': delegating,
        'mounts_without_presets': [{'block': r['block'], 'attr': r['attr'], 'file': m['file'], 'line': m['line'], 'presets': m['presets']} for r, m in mounts_flat if m['presets'] in ('absent', 'false')],
        'mounts_with_dynamic_presets': [{'block': r['block'], 'attr': r['attr'], 'file': m['file'], 'line': m['line'], 'presets': m['presets']} for r, m in mounts_flat if isinstance(m['presets'], str) and m['presets'].startswith('dynamic')],
    }
    st = lambda name: sum(1 for s in allsides if s['status'] == name)
    census['summary'] = {
        'mounts_found': len(ast['mounts']), 'attributes_surveyed': len(rows), 'spacing_attributes': len(spacing),
        'non_spacing_attributes': len(rows) - len(spacing), 'sides_total': len(allsides),
        'sides_with_stylesheet_default': st('default') + st('em-ambiguous'), 'default': st('default'), 'em_ambiguous': st('em-ambiguous'),
        'already_preset': sum(1 for s in allsides if s.get('already_preset')),
        'undeclared_presets': sum(1 for s in allsides if s['status'] == 'default' and s.get('already_preset')),
        'undeclared_lengths': sum(1 for s in allsides if s['status'] == 'default' and not s.get('already_preset')),
        'undeclared_exact_matches': sum(1 for s in allsides if s['status'] == 'default' and not s.get('already_preset') and s['proposed']['kind'] == 'preset'),
        'stay_unset': st('stay-unset'), 'unknown': st('unknown'), 'exempt': st('exempt'), 'variant_dependent': st('variant-dependent'), 'declared': st('declared'),
        'declared_presets': sum(1 for s in allsides if s['status'] == 'declared' and DECLARED_VAR.fullmatch(s.get('declared') or '')),
        'declared_literals': sum(1 for s in allsides if s['status'] == 'declared' and not DECLARED_VAR.fullmatch(s.get('declared') or '')),
        'declared_problems': sum(1 for d in declared if d['problems']),
        'declared_tier_values': sum(1 for d in declared if d.get('tier') and not d.get('when')),
        'declared_when_values': sum(1 for d in declared if d.get('when')),
        'tier_values_owing_preset_paint': sum(1 for d in declared if d.get('notes')),
        'mounts_without_presets': len(census['mounts_without_presets']),
        'mounts_with_dynamic_presets': len(census['mounts_with_dynamic_presets']),
        'snapshot_slug_gaps': {k: v for k, v in gaps.items()},
    }
    return census


# ----------------------------------------------------------------------------------------------
# Baseline and gate
# ----------------------------------------------------------------------------------------------
def length_map(census):
    """'block:attr:side' -> stylesheet text for every governed side whose length a preset could replace.

    Zero, auto, inherit and percentage sides stay unset by design, an exempt block follows its own
    theme presets, an already-preset side is a preset, and a declared side is governed by its
    declaration, so none of those gate here."""
    return {f'{r["block"]}:{r["attr"]}:{s["side"]}': s['raw'] for r in census['attributes'] for s in r['sides']
            if s.get('raw') and s['status'] in ('default', 'em-ambiguous', 'unknown', 'variant-dependent') and not s.get('already_preset')}


def make_baseline(census):
    return {'version': 1, 'note': 'Stylesheet lengths on Spacing-governed sides, not yet declared, as of the last --write-baseline. Phase E removes entries by declaring them in block.json::supports.sgs.spacingDefaults (a preset on an exact size match, else the literal).',
            'lengths': dict(sorted(length_map(census).items())),
            'acknowledged_slug_gaps': {k: v for k, v in sorted(census['slug_gaps'].items())}}


def run_check(census, baseline, strict=False):
    fails, notes = [], []
    base_len = baseline.get('lengths', {})
    for key, raw in sorted(length_map(census).items()):
        if PRESET_VAR.fullmatch(raw.strip()) or base_len.get(key) == raw:
            continue
        fails.append(f'new stylesheet length {key} = {raw!r} (baseline: {base_len.get(key)!r}); set it through var(--wp--preset--spacing--N) or a declared default')
    ack = baseline.get('acknowledged_slug_gaps', {})
    for site, missing in sorted(census['slug_gaps'].items()):
        new = [s for s in missing if s not in ack.get(site, [])]
        if strict and missing:
            fails.append(f'snapshot {site} lacks proposed default slug(s) {missing}')
        elif new:
            fails.append(f'snapshot {site} lacks proposed default slug(s) {new} (not acknowledged in the baseline)')
        elif missing:
            notes.append(f'snapshot {site} lacks slug(s) {missing} (acknowledged in the baseline; --strict fails on it)')
    for d in census.get('declared_defaults', []):
        for problem in d['problems']:
            fails.append(f'declared default {d["block"]}:{d["attr"]}:{d["side"]}: {problem}')
    undeclared = [(r, s) for r in census['attributes'] for s in r['sides'] if s['status'] == 'default']
    for r, s in undeclared if strict else ():
        fails.append(f'undeclared default {r["block"]}:{r["attr"]}:{s["side"]} = {s["raw"]!r}; declare {s["proposed"]["value"]!r} in block.json::supports.sgs.spacingDefaults')
    if undeclared and not strict:
        notes.append(f'{len(undeclared)} governed side(s) paint a default no declaration covers (--strict fails on them)')
    repainted = [(r, s) for r in census['attributes'] for s in r['sides'] if s['status'] == 'variant-dependent']
    for r, s in repainted if strict else ():
        o = s['overridden_by'][0]
        fails.append(f'uncovered repaint {r["block"]}:{r["attr"]}:{s["side"]}: {o["sel"]}{" " + o["cond"] if o["cond"] else ""} paints {o["raw"]}; declare it as a tier or when entry in block.json::supports.sgs.spacingDefaults')
    if repainted and not strict:
        notes.append(f'{len(repainted)} governed side(s) are repainted by a variant or media rule no tier or when entry covers (--strict fails on them)')
    owed = [(d, n) for d in census.get('declared_defaults', []) for n in d.get('notes') or []]
    if owed:
        notes.append(f'{len(owed)} tier or when value(s) equal a preset size exactly but their rule paints the literal (painting var(--wp--preset--spacing--N, size) there is owed): ' + ', '.join(sorted(f'{d["block"]}:{d["attr"]}:{d["side"]}' for d, _ in owed)[:6]) + (' ...' if len(owed) > 6 else ''))
    stale = sorted(set(base_len) - set(length_map(census)))
    if stale:
        notes.append(f'{len(stale)} baseline entr(ies) no longer hold a stylesheet length (migrated or removed)')
    return fails, notes


# ----------------------------------------------------------------------------------------------
# Reporting
# ----------------------------------------------------------------------------------------------
def top_defaults(census, n=15):
    groups = {}
    for r in census['attributes']:
        for s in r['sides']:
            if s['status'] == 'default' and not s.get('already_preset'):
                g = groups.setdefault((s['raw'], s['proposed']['value'], s['proposed']['name'] or 'literal'), [])
                g.append(f'{r["block"]}.{r["attr"]}.{s["side"]}')
    ranked = sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0][0]))
    return [{'current': k[0], 'declare': k[1], 'preset_name': k[2], 'sides': len(v), 'examples': v[:4]} for k, v in ranked[:n]]


def human_summary(census):
    s = census['summary']
    lines = ['spacing-defaults census', '=' * 23]
    for k in ('mounts_found', 'attributes_surveyed', 'spacing_attributes', 'non_spacing_attributes', 'sides_total', 'sides_with_stylesheet_default', 'default', 'em_ambiguous', 'already_preset', 'undeclared_presets', 'undeclared_lengths', 'undeclared_exact_matches', 'stay_unset', 'unknown', 'exempt', 'variant_dependent', 'declared', 'declared_presets', 'declared_literals', 'declared_tier_values', 'declared_when_values', 'tier_values_owing_preset_paint', 'declared_problems', 'mounts_without_presets', 'mounts_with_dynamic_presets'):
        lines.append(f'  {k:32} {s[k]}')
    dbc = census['db_crosscheck']
    if dbc.get('available'):
        lines.append(f'  db cross-check: source {dbc["source_count"]} / db {dbc["db_count"]}; source-only {len(dbc["source_only"])}, db-only {len(dbc["db_only"])}')
    lines.append(f'  proposed default slugs: {census["proposed_slugs"]}')
    for site, v in census['snapshots'].items():
        gap = census['slug_gaps'].get(site)
        lines.append(f'  snapshot {site}: {"declares " + str(len(v["slugs"])) + " slugs" if v["declares_scale"] else "no scale (inherits theme.json, assumed)"}{"; MISSING " + str(gap) if gap else ""}')
    lines.append(f'  unresolved: {len(census["unresolved"])}')
    lines.append('  undeclared lengths -> declaration:')
    for t in top_defaults(census):
        lines.append(f'    {t["sides"]:4} x {t["current"]:>10} -> {t["declare"]} ({t["preset_name"]})  e.g. {t["examples"][0]}')
    return '\n'.join(lines)


# ----------------------------------------------------------------------------------------------
# Self-test
# ----------------------------------------------------------------------------------------------
def fixture_tree():
    root = FIXTURES / 'tree'
    return Tree(root, root / 'theme.json', root / 'sites', db_rows=read_json(root / 'db-rows.json'))


def assertions(census):
    """Compare the fixture census with expected.json; return failure strings."""
    exp = read_json(FIXTURES / 'tree' / 'expected.json')
    fails = []
    rows = {f'{r["block"]}:{r["attr"]}': r for r in census['attributes']}
    for key, want in exp['attributes'].items():
        r = rows.get(key)
        if not r:
            fails.append(f'{key}: attribute not surveyed')
            continue
        for k, v in want.items():
            if k == 'sides':
                continue
            if r.get(k) != v:
                fails.append(f'{key}: {k} = {r.get(k)!r}, expected {v!r}')
        got = {s['side']: s for s in r['sides']}
        for side, w in (want.get('sides') or {}).items():
            s = got.get(side)
            if not s:
                fails.append(f'{key}:{side}: side not governed/reported')
                continue
            prop = s.get('proposed') or s.get('proposed_if_16px') or {}
            flat = {'status': s['status'], 'raw': s.get('raw'), 'px': s.get('px'), 'slug': prop.get('slug'), 'proposed': prop.get('value'),
                    'declared': s.get('declared'), 'where': (s.get('source') or {}).get('where'), 'reason': s.get('reason')}
            for k, v in w.items():
                have = flat.get(k)
                if (k == 'reason' and v not in (have or '')) or (k != 'reason' and have != v):
                    fails.append(f'{key}:{side}: {k} = {have!r}, expected {v!r}')
    for key in exp.get('absent_attributes', []):
        if key in rows:
            fails.append(f'{key}: surveyed but must be absent')
    for k, v in exp.get('db_crosscheck', {}).items():
        have = sorted(f'{x["block"]}:{x["attr"]}' for x in census['db_crosscheck'][k])
        if have != sorted(v):
            fails.append(f'db_crosscheck.{k} = {have}, expected {sorted(v)}')
    for k, v in exp.get('summary', {}).items():
        if census['summary'].get(k) != v:
            fails.append(f'summary.{k} = {census["summary"].get(k)!r}, expected {v!r}')
    declared = {f'{d["block"]}:{d["attr"]}:{d["side"]}': d['problems'] for d in census.get('declared_defaults', [])}
    for key, want in exp.get('declared_defaults', {}).items():
        if key not in declared:
            fails.append(f'declared default {key}: not reported')
            continue
        have = declared[key]
        if not want and have:
            fails.append(f'declared default {key}: expected no problem, got {have}')
        for needle in want:
            if not any(needle in x for x in have):
                fails.append(f'declared default {key}: expected a problem containing {needle!r}, got {have}')
    return fails


def gate_assertions(census):
    fails = []
    base = make_baseline(census)
    f, _ = run_check(census, base)
    planted = [x for x in f if x.startswith('declared default ')]
    if [x for x in f if x not in planted]:
        fails.append(f'check must pass on its own baseline apart from the planted declared defaults: {[x for x in f if x not in planted][:2]}')
    bad_blocks = ('declaredbad', 'variant', 'tieredbad', 'whenbad', 'noctx')
    if not planted or any(not x.startswith(tuple(f'declared default {b}:' for b in bad_blocks)) for x in planted):
        fails.append(f'check must fail on exactly the planted declared-default problems ({", ".join(bad_blocks)}), got {planted}')
    missed = [b for b in bad_blocks if not any(x.startswith(f'declared default {b}:') for x in planted)]
    if missed:
        fails.append(f'check did not fail on the planted blocks {missed}')
    broken = copy.deepcopy(base)
    key = next((k for k, v in broken['lengths'].items() if not PRESET_VAR.fullmatch(v.strip())), None)
    broken['lengths'].pop(key, None)
    f, _ = run_check(census, broken)
    if not any('new stylesheet length' in x for x in f):
        fails.append('check did not fail on a stylesheet length missing from the baseline')
    unack = copy.deepcopy(base)
    unack['acknowledged_slug_gaps'] = {}
    f, _ = run_check(census, unack)
    if census['slug_gaps'] and not any('lacks proposed default' in x for x in f):
        fails.append('check did not fail on an unacknowledged snapshot slug gap')
    f, _ = run_check(census, base, strict=True)
    if census['slug_gaps'] and not any('lacks proposed default' in x for x in f):
        fails.append('--strict did not fail on an acknowledged snapshot slug gap')
    undeclared = sorted(x.split(' = ')[0] for x in f if x.startswith('undeclared default '))
    want = sorted(f'undeclared default {r["block"]}:{r["attr"]}:{s["side"]}' for r in census['attributes'] for s in r['sides'] if s['status'] == 'default')
    if not want or undeclared != want:
        fails.append(f'--strict must fail on exactly the undeclared governed defaults ({len(want)}), got {len(undeclared)}')
    if any(x.startswith('undeclared default ') for x in run_check(census, base)[0]):
        fails.append('an undeclared default failed without --strict')
    repainted = sorted(x.split(':', 3)[0] + ':' + x.split(':', 3)[1] + ':' + x.split(':', 3)[2] for x in f if x.startswith('uncovered repaint '))
    want = sorted(f'uncovered repaint {r["block"]}:{r["attr"]}:{s["side"]}' for r in census['attributes'] for s in r['sides'] if s['status'] == 'variant-dependent')
    if not want or repainted != want:
        fails.append(f'--strict must fail on exactly the variant-dependent sides ({len(want)}), got {len(repainted)}')
    if any(x.startswith('uncovered repaint ') for x in run_check(census, base)[0]):
        fails.append('an uncovered repaint failed without --strict')
    return fails


def self_test():
    census = build_census(fixture_tree())
    fails = assertions(census) + gate_assertions(census)
    controls = {'snap': 'a non-matching length must stay literal, never snap to the nearest preset',
                'declared-ignore-slug': 'a declared preset that differs from the stylesheet preset',
                'declared-ignore-fallback': 'a declared preset whose stylesheet fallback is not its theme size',
                'declared-ignore-exact': 'a declared length that equals a preset size exactly',
                'mount-ignore-defaults': 'a declared attribute whose mount passes no defaults prop',
                'declared-ignore-variant': 'a declared side a variant or media rule repaints with no tier or when entry covering it',
                'tier-ignore-value': 'a tier or when value that is not what its media or variant rule paints',
                'when-ignore-attrs': 'a when entry naming an enum value the attribute does not have',
                'when-ignore-classes': 'a when entry naming a variant class the block never emits',
                'mount-ignore-context': 'a tier or when declaration whose mount resolves the base only'}
    for name, what in controls.items():
        MUTATE.add(name)
        try:
            tripped = bool(assertions(build_census(fixture_tree())))
        finally:
            MUTATE.discard(name)
        if not tripped:
            fails.append(f'negative control "{name}" did not trip the self-test ({what} is untested)')
    for f in fails:
        print('FAIL', f, file=sys.stderr)
    print(f'self-test {"FAIL" if fails else "PASS"} ({len(census["attributes"])} fixture attributes, {len(fails)} failure(s))', file=sys.stderr)
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[1])
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--write-baseline', action='store_true')
    ap.add_argument('--strict', action='store_true', help='with --check: fail on acknowledged snapshot slug gaps too')
    ap.add_argument('--out', help='write the census JSON here instead of stdout')
    args = ap.parse_args()
    if args.self_test:
        return self_test()
    tree = Tree(PLUGIN, REPO / 'theme' / 'sgs-theme' / 'theme.json', REPO / 'sites')
    census = build_census(tree)
    if args.write_baseline:
        BASELINE.parent.mkdir(parents=True, exist_ok=True)
        BASELINE.write_text(json.dumps(make_baseline(census), indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
        print(f'wrote {BASELINE.relative_to(REPO)} ({len(length_map(census))} lengths, {len(census["slug_gaps"])} acknowledged slug gap site(s))', file=sys.stderr)
        return 0
    if args.check:
        if not BASELINE.exists():
            print('FAIL no baseline; run --write-baseline once and commit it', file=sys.stderr)
            return 1
        fails, notes = run_check(census, read_json(BASELINE), args.strict)
        for n in notes:
            print('note', n, file=sys.stderr)
        for f in fails:
            print('FAIL', f, file=sys.stderr)
        print(f'[spacing-defaults] {len(fails)} failure(s).', file=sys.stderr)
        return 1 if fails else 0
    census['top_defaults'] = top_defaults(census)
    text = json.dumps(census, indent=1, ensure_ascii=False)
    if args.out:
        Path(args.out).write_text(text + '\n', encoding='utf-8')
    else:
        print(text)
    print(human_summary(census), file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
