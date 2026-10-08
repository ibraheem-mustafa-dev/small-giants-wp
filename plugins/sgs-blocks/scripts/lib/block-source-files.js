'use strict';
/*
 * Block source-file resolver shared by the gate scripts.
 *
 * A block's behaviour is no longer only in render.php and edit.js: render.php
 * includes partials with a plain `require __DIR__ . '/x.php';` (they run in
 * render.php's scope) and edit.js imports components by relative path. This
 * module returns the full set of files, or their joined text, so a gate that
 * reads render.php or edit.js by name sees the code that moved out of it. Plain
 * require/include targets inside the block folder are followed transitively
 * (depth cap 5); require_once/include_once load function files and are not
 * followed. JS imports are followed only when they resolve inside the block
 * folder. Use blockPhpFiles when function files should be read too.
 *
 * Self-test: node scripts/lib/block-source-files.js --self-test
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const MAX_DEPTH = 5;

const PARTIAL_REQUIRE_RE_SRC =
	"(?<![\\w$>:])(?:require|include)(?!_once)\\s*\\(?\\s*__DIR__\\s*\\.\\s*['\"]/([\\w./-]+\\.php)['\"]\\s*\\)?\\s*;";
const JS_IMPORT_RE_SRC =
	"(?:\\bimport\\s+(?:[\\w$*{}\\s,]*?\\s+from\\s+)?|\\bexport\\s+(?:\\*(?:\\s+as\\s+[\\w$]+)?|\\{[^}]*\\})\\s+from\\s+)['\"]([^'\"]+)['\"]";

const read = (p) => fs.readFileSync(p, 'utf8');
const isFile = (p) => {
	try {
		return fs.statSync(p).isFile();
	} catch (e) {
		return false;
	}
};

function inside(p, root) {
	const rel = path.relative(path.resolve(root), path.resolve(p));
	return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function partialTarget(rel, includingFile, blockDir) {
	if (rel.split('/').includes('..')) return null;
	const t = path.join(path.dirname(includingFile), rel);
	return isFile(t) && inside(t, blockDir) ? t : null;
}

function renderFiles(blockDir) {
	const render = path.join(blockDir, 'render.php');
	if (!isFile(render)) return [];
	const out = [render];
	const seen = new Set([path.resolve(render)]);
	const walk = (f, depth) => {
		if (depth > MAX_DEPTH) return;
		for (const m of read(f).matchAll(new RegExp(PARTIAL_REQUIRE_RE_SRC, 'g'))) {
			const t = partialTarget(m[1], f, blockDir);
			if (!t || seen.has(path.resolve(t))) continue;
			seen.add(path.resolve(t));
			out.push(t);
			walk(t, depth + 1);
		}
	};
	walk(render, 1);
	return out;
}

function inline(src, f, blockDir, depth) {
	if (depth > MAX_DEPTH) return src;
	return src.replace(new RegExp(PARTIAL_REQUIRE_RE_SRC, 'g'), (whole, rel) => {
		const t = partialTarget(rel, f, blockDir);
		if (!t) return whole;
		const body = read(t).replace(/^\s*<\?php/, '');
		return '\n' + inline(body, t, blockDir, depth + 1) + '\n?><?php\n';
	});
}

function renderSource(blockDir) {
	const render = path.join(blockDir, 'render.php');
	if (!isFile(render)) return '';
	return inline(read(render), render, blockDir, 1);
}

function blockPhpFiles(blockDir) {
	const out = [];
	const walk = (d) => {
		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			const p = path.join(d, e.name);
			if (e.isDirectory()) walk(p);
			else if (e.isFile() && e.name.endsWith('.php')) out.push(p);
		}
	};
	if (fs.existsSync(blockDir)) walk(blockDir);
	return out.sort((a, b) => {
		const ra = path.relative(blockDir, a).split(path.sep).join('/');
		const rb = path.relative(blockDir, b).split(path.sep).join('/');
		return ra < rb ? -1 : ra > rb ? 1 : 0;
	});
}

function resolveJs(base, spec, blockDir) {
	const raw = path.join(path.dirname(base), spec);
	const cands = [];
	if (/\.(js|jsx|mjs)$/.test(raw)) cands.push(raw);
	cands.push(raw + '.js', path.join(raw, 'index.js'));
	for (const c of cands) if (isFile(c) && inside(c, blockDir)) return c;
	return null;
}

function editFiles(blockDir) {
	const edit = path.join(blockDir, 'edit.js');
	if (!isFile(edit)) return [];
	const out = [edit];
	const seen = new Set([path.resolve(edit)]);
	for (let i = 0; i < out.length; i++) {
		for (const m of read(out[i]).matchAll(new RegExp(JS_IMPORT_RE_SRC, 'g'))) {
			if (!m[1].startsWith('.')) continue;
			const t = resolveJs(out[i], m[1], blockDir);
			if (!t || seen.has(path.resolve(t))) continue;
			seen.add(path.resolve(t));
			out.push(t);
		}
	}
	return out;
}

function editSource(blockDir) {
	return editFiles(blockDir)
		.map((f) => '/* ==== ' + path.relative(blockDir, f).split(path.sep).join('/') + ' ==== */\n' + read(f))
		.join('\n');
}

module.exports = { renderFiles, renderSource, blockPhpFiles, editFiles, editSource };

// ---------------------------------------------------------------- self-test

function buildFixture(root, partACode) {
	const w = (p, s) => {
		fs.mkdirSync(path.dirname(p), { recursive: true });
		fs.writeFileSync(p, s, 'utf8');
	};
	const b = path.join(root, 'demo');
	w(
		path.join(b, 'render.php'),
		"<?php\n$x = 0;\nrequire __DIR__ . '/part-a.php';\n" +
			"require_once __DIR__ . '/funcs.php';\n" +
			"include __DIR__ . '/part-c.php';\n" +
			"require __DIR__ . '/missing.php';\n" +
			"require __DIR__ . '/../other/x.php';\n"
	);
	w(path.join(b, 'part-a.php'), '<?php\n' + partACode + "\nrequire __DIR__ . '/nested/part-b.php';\n");
	w(path.join(b, 'nested', 'part-b.php'), '<?php\n$b = 2;\n');
	w(path.join(b, 'part-c.php'), '<?php\n$c = 3;\n');
	w(path.join(b, 'funcs.php'), '<?php\nfunction demo_fn() {}\n');
	w(path.join(root, 'other', 'x.php'), '<?php\n$outside = 1;\n');
	w(
		path.join(b, 'edit.js'),
		"import { PanelBody } from '@wordpress/components';\n" +
			"import Panel from './components/Panel';\n" +
			"import Shared from '../../../components/Shared';\n" +
			"export { X } from './reexp';\n" +
			'export default function Edit() {}\n'
	);
	w(
		path.join(b, 'components', 'Panel.js'),
		"import {\n  A,\n  B,\n} from '../constants.js';\nimport '@wordpress/components';\n"
	);
	w(path.join(b, 'constants.js'), 'export const A = 1; export const B = 2;\n');
	w(path.join(b, 'reexp.js'), 'export const X = 1;\n');
	return b;
}

function selfTest() {
	let fails = 0;
	const check = (label, ok) => {
		console.log((ok ? 'PASS' : 'FAIL') + '  ' + label);
		if (!ok) fails++;
	};
	const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bsf-js-'));
	try {
		const b = buildFixture(tmp, '$a = 1;');
		const rel = (list) => list.map((p) => path.relative(b, p).split(path.sep).join('/'));
		const names = rel(renderFiles(b));
		check('render_files list', same(names, ['render.php', 'part-a.php', 'nested/part-b.php', 'part-c.php']));
		const src = renderSource(b);
		check('render_source has part-a code', src.includes('$a = 1;'));
		check('render_source has nested part-b code', src.includes('$b = 2;'));
		check('render_source has part-c code (include)', src.includes('$c = 3;'));
		check(
			'render_source drops inlined require lines',
			!src.includes('part-a.php') && !src.includes('part-b.php') && !src.includes('part-c.php')
		);
		check('render_source keeps require_once verbatim', src.includes("require_once __DIR__ . '/funcs.php';"));
		check('render_source keeps missing require verbatim', src.includes("require __DIR__ . '/missing.php';"));
		check(
			'render_source keeps outside require verbatim, no outside code',
			src.includes('../other/x.php') && !src.includes('$outside')
		);
		check('render_source joiner exact', !src.includes('\n$a = 1;\nrequire') && src.includes('\n?><?php\n'));
		check('render_files excludes funcs.php', !names.includes('funcs.php'));
		check(
			'block_php_files sorted, all php',
			same(rel(blockPhpFiles(b)), ['funcs.php', 'nested/part-b.php', 'part-a.php', 'part-c.php', 'render.php'])
		);
		check(
			'edit_files list',
			same(rel(editFiles(b)), ['edit.js', 'components/Panel.js', 'reexp.js', 'constants.js'])
		);
		const es = editSource(b);
		check(
			'edit_source headers',
			es.includes('/* ==== edit.js ==== */') &&
				es.includes('/* ==== constants.js ==== */') &&
				es.startsWith('/* ==== edit.js ==== */\n')
		);
		check(
			'edit_source has no outside/bare code',
			es.includes('Shared') && es.includes('components/Shared') && es.includes('export const A')
		);
		const empty = path.join(tmp, 'empty');
		fs.mkdirSync(empty);
		check('missing render.php -> [] and \'\'', renderFiles(empty).length === 0 && renderSource(empty) === '');
		check('missing edit.js -> []', editFiles(empty).length === 0 && editSource(empty) === '');
		const b2 = buildFixture(path.join(tmp, 'v2'), '$a = 99;');
		const s2 = renderSource(b2);
		check(
			'negative control: changed partial changes render_source',
			s2 !== src && s2.includes('$a = 99;') && !s2.includes('$a = 1;')
		);
	} finally {
		fs.rmSync(tmp, { recursive: true, force: true });
	}
	console.log('RESULT: ' + (fails ? 'FAIL (' + fails + ')' : 'ALL PASS'));
	return fails ? 1 : 0;
}

if (require.main === module) {
	if (process.argv.includes('--self-test')) process.exit(selfTest());
	console.log('Usage: node scripts/lib/block-source-files.js --self-test');
	process.exit(2);
}
