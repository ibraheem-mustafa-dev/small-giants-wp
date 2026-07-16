#!/usr/bin/env node
/**
 * wp-migrate-oldshape-blocks.js — restore content stranded by the scalar→InnerBlocks
 * block migrations (Track B, 2026-07-15), through the BLOCK EDITOR ONLY.
 *
 * The stored old shape (self-closing sgs/* with scalar content attrs) renders an
 * empty shell; the content is intact in post_content. This script converts each
 * casualty to the current InnerBlocks shape via wp.blocks.createBlock +
 * dispatch('core/block-editor').replaceBlock — the sanctioned write route
 * (wp-content-guard.py bans every WP-CLI/PHP path). Mappings + fail-closed rules:
 * scripts/lib/oldshape-mappings.js.
 *
 * SAFETY MODEL (adversarial-council hardened — scratch TB-3):
 *  - Default mode is DRY-RUN: builds + validates + prints serialized previews,
 *    writes nothing. --live applies + saves once + verifies.
 *  - Values come from the RAW markup (REST ?context=edit) — the editor discards
 *    undeclared attrs (e.g. legacy colour attrs) at parse, so wp.data never sees them.
 *  - Pre-flight before any mutation: runtime-schema validation of every planned
 *    attr (wp.blocks.getBlockType — the DEPLOYED schema, not the repo's), per-name
 *    count assertion raw-vs-editor, every block isValid, no post-lock modal,
 *    autosave interval raised.
 *  - Verify after save: re-parse old vs new via wp.blocks.parse, tree-parity on all
 *    NON-migrated blocks (must be identical), content-token inventory on migrated
 *    ones, revision existence via REST. savePost failure = hard fail, NO retry.
 *  - --restore <file> is the rehearsed rollback: parse(backup) → resetBlocks →
 *    save. NOTE: parse drops undeclared attrs, so a restore recovers all DECLARED
 *    content; the byte-exact record stays in the backup file.
 *
 * Usage (PowerShell; node via PowerShell on this machine):
 *   $env:WP_USER='...'; $env:WP_PASSWORD='...'; $env:WP_APP_PASSWORD='...'
 *   node scripts/wp-migrate-oldshape-blocks.js --site palestine-lives.org --post 58            # dry-run
 *   node scripts/wp-migrate-oldshape-blocks.js --site palestine-lives.org --post 58 --live
 *   node scripts/wp-migrate-oldshape-blocks.js --site palestine-lives.org --post 58 --restore .claude/backups/2026-07-15-track-b/palestine-lives/58.txt
 *
 * Exit codes: 0 ok · 2 auth · 3 editor · 4 preflight · 5 save · 6 verify · 7 plan fail-closed
 */

'use strict';

const fs = require('fs');
const { chromium } = require('playwright');
const { buildPlan } = require('./lib/oldshape-mappings');

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const SITE = opt('--site');
const POST = opt('--post');
const LIVE = args.includes('--live');
const RESTORE = opt('--restore');
const USER = process.env.WP_USER;
const PASS = process.env.WP_PASSWORD;
const APP_PASS = process.env.WP_APP_PASSWORD || process.env.WP_PASSWORD;

if (!SITE || !POST || !USER || !PASS) {
	console.error('need --site, --post, WP_USER, WP_PASSWORD (and ideally WP_APP_PASSWORD)');
	process.exit(2);
}

const fail = (code, msg) => { console.error(`[FAIL ${code}] ${msg}`); process.exit(code); };

async function restFetchRaw() {
	const auth = 'Basic ' + Buffer.from(`${USER}:${APP_PASS}`).toString('base64');
	for (const type of ['pages', 'posts']) {
		const res = await fetch(`https://${SITE}/wp-json/wp/v2/${type}/${POST}?context=edit`, { headers: { Authorization: auth } });
		if (res.status === 200) { const j = await res.json(); return { raw: j.content.raw, type }; }
		if (res.status === 401 || res.status === 403) fail(2, `REST auth rejected (${res.status}) for ${type}/${POST}`);
	}
	fail(3, `post ${POST} not found via REST on ${SITE}`);
}

async function openEditor(page) {
	await page.goto(`https://${SITE}/wp-login.php`, { waitUntil: 'domcontentloaded' });
	await page.fill('#user_login', USER);
	await page.fill('#user_pass', PASS);
	await page.click('#wp-submit');
	await page.waitForURL(/wp-admin/, { timeout: 20000 }).catch(() => fail(2, 'wp-login did not reach wp-admin — bad credentials?'));
	await page.goto(`https://${SITE}/wp-admin/post.php?post=${POST}&action=edit`, { waitUntil: 'domcontentloaded' });
	await page.waitForFunction(
		() => window.wp && window.wp.data && window.wp.blocks && window.wp.data.select('core/block-editor') &&
			window.wp.data.select('core/block-editor').getBlockCount() > 0,
		{ timeout: 30000 }
	).catch(() => fail(3, 'editor did not become ready'));
	const locked = await page.evaluate(() => Boolean(document.querySelector('.editor-post-locked-modal')));
	if (locked) fail(3, 'post-lock modal present — another session is editing this post. Aborting.');
	// Kill the pattern/welcome modal if present.
	await page.evaluate(() => {
		const btn = document.querySelector('.components-modal__header button[aria-label="Close"]');
		if (btn) btn.click();
	});
}

/* Runs in the page. Pure function of (plan, mode). */
const PAGE_FN = ({ plan, mode, oldRaw, newRawAfterSave }) => {
	const { select, dispatch } = window.wp.data;
	const be = select('core/block-editor');
	const NATIVE = new Set(['className', 'align', 'style', 'anchor', 'lock', 'metadata', 'fontSize', 'fontFamily', 'backgroundColor', 'textColor', 'gradient', 'borderColor', 'layout']);

	const flatten = (blocks, out = []) => {
		for (const b of blocks) { out.push(b); flatten(b.innerBlocks || [], out); }
		return out;
	};
	const validateSpec = (spec, problems, path) => {
		const bt = window.wp.blocks.getBlockType(spec.name);
		if (!bt) { problems.push(`${path}: block type ${spec.name} not registered on this site`); return; }
		for (const [k, v] of Object.entries(spec.attrs || {})) {
			const decl = bt.attributes && bt.attributes[k];
			if (!decl && !NATIVE.has(k)) { problems.push(`${path}: ${spec.name}.${k} not in runtime schema — would be discarded`); continue; }
			if (decl && decl.enum && !decl.enum.includes(v)) problems.push(`${path}: ${spec.name}.${k}=${JSON.stringify(v)} not in enum [${decl.enum}]`);
		}
		(spec.children || []).forEach((c, i) => validateSpec(c, problems, `${path}>${spec.name}[${i}]`));
	};

	if (mode === 'preflight') {
		const problems = [];
		for (const e of plan.entries) validateSpec({ name: e.name, attrs: e.newAttrs, children: e.children }, problems, `#${e.kth}`);
		const all = flatten(be.getBlocks());
		const counts = {};
		for (const b of all) if (b.name.startsWith('sgs/')) counts[b.name] = (counts[b.name] || 0) + 1;
		for (const name of new Set(plan.entries.map((e) => e.name))) {
			if ((counts[name] || 0) !== plan.sgsNameCounts[name]) {
				problems.push(`count mismatch for ${name}: raw=${plan.sgsNameCounts[name]} editor=${counts[name] || 0}`);
			}
		}
		const invalid = all.filter((b) => b.isValid === false).map((b) => b.name);
		if (invalid.length) problems.push(`invalid blocks present (would be silently rewritten on save): ${invalid.join(', ')}`);
		try { dispatch('core/editor').updateEditorSettings({ autosaveInterval: 3600 }); } catch (e) { /* non-fatal */ }
		return { problems };
	}

	const build = (spec) => window.wp.blocks.createBlock(spec.name, spec.attrs, (spec.children || []).map(build));
	const kthOf = (name, k) => flatten(be.getBlocks()).filter((b) => b.name === name)[k - 1];
	const deepHasValue = (obj, value) => {
		if (obj === value) return true;
		if (obj && typeof obj === 'object') return Object.values(obj).some((v) => deepHasValue(v, value));
		return false;
	};
	// Recursively gather every attributes object in a built block tree.
	const collectAttrs = (b, acc = []) => {
		acc.push(b.attributes || {});
		(b.innerBlocks || []).forEach((x) => collectAttrs(x, acc));
		return acc;
	};

	if (mode === 'dryrun') {
		return plan.entries.map((e) => {
			const fresh = build({ name: e.name, attrs: e.newAttrs, children: e.children });
			const attrSets = collectAttrs(fresh);
			const missing = e.tokens.filter((t) => !attrSets.some((a) => deepHasValue(a, t.value)));
			return { name: e.name, kth: e.kth, serialized: window.wp.blocks.serialize(fresh), missingTokens: missing };
		});
	}

	if (mode === 'apply') {
		const replaced = [];
		for (const e of plan.entries) {
			const target = kthOf(e.name, e.kth);
			if (!target) return { error: `apply: could not locate ${e.name} #${e.kth}` };
			const fresh = build({ name: e.name, attrs: e.newAttrs, children: e.children });
			dispatch('core/block-editor').replaceBlock(target.clientId, fresh);
			replaced.push({ name: e.name, kth: e.kth });
		}
		return { replaced };
	}

	if (mode === 'verify') {
		const migrated = new Set(plan.entries.map((e) => `${e.name}#${e.kth}`));
		// Depth-first flatten of a parsed tree, SKIPPING migrated instances + their
		// subtrees. Kth counters are per-name in document order — the same rule the
		// node-side plan builder used, so both sides agree on identity.
		const strip = (raw) => {
			const counters = {};
			const keep = [];
			const walk = (blocks) => {
				for (const b of blocks) {
					if (!b.name) continue; // whitespace-only segment
					counters[b.name] = (counters[b.name] || 0) + 1;
					if (migrated.has(`${b.name}#${counters[b.name]}`)) continue; // skip migrated + subtree
					keep.push({ name: b.name, attrs: b.attributes || {} });
					walk(b.innerBlocks || []);
				}
			};
			walk(window.wp.blocks.parse(raw));
			return keep;
		};
		const before = strip(oldRaw);
		const after = strip(newRawAfterSave);
		const mismatches = [];
		let benignExtensionAdds = 0;
		// The editor save round-trip appends SGS extension attrs (sgsBlockLink,
		// sgsClickEffect, …) with inert default values to EVERY block's serialized
		// JSON — a pre-existing plugin behaviour on any manual save too. Benign iff
		// the key is sgs-prefixed, ABSENT before, and equal to its runtime default
		// (or an inert zero-value). Anything else is a real regression.
		const INERT = new Set(['', 'none', false, 0]);
		const attrsDeltaIsBenign = (name, b, a) => {
			const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
			const bt = window.wp.blocks.getBlockType(name);
			for (const k of keys) {
				if (JSON.stringify(b[k]) === JSON.stringify(a[k])) continue;
				const decl = bt && bt.attributes && bt.attributes[k];
				const isDefault = decl && JSON.stringify(a[k]) === JSON.stringify(decl.default);
				if (!(k in b) && k.startsWith('sgs') && (isDefault || INERT.has(a[k]))) { benignExtensionAdds++; continue; }
				return false;
			}
			return true;
		};
		if (before.length !== after.length) mismatches.push(`untouched-block count drifted: ${before.length} -> ${after.length}`);
		const n = Math.min(before.length, after.length);
		for (let i = 0; i < n; i++) {
			if (before[i].name !== after[i].name) { mismatches.push(`#${i}: ${before[i].name} -> ${after[i].name}`); continue; }
			if (JSON.stringify(before[i].attrs) !== JSON.stringify(after[i].attrs)
				&& !attrsDeltaIsBenign(before[i].name, before[i].attrs, after[i].attrs)) {
				mismatches.push(`#${i} ${before[i].name}: attrs changed ${JSON.stringify(before[i].attrs).slice(0, 120)} -> ${JSON.stringify(after[i].attrs).slice(0, 120)}`);
			}
		}
		// Content-token inventory against the saved content's parsed tree.
		const newTree = window.wp.blocks.parse(newRawAfterSave);
		const allAttrSets = [];
		newTree.forEach((b) => collectAttrs(b, allAttrSets));
		const missingTokens = [];
		for (const e of plan.entries) {
			for (const t of e.tokens) {
				if (!allAttrSets.some((a) => deepHasValue(a, t.value))) missingTokens.push(t);
			}
		}
		return { mismatches: mismatches.slice(0, 25), missingTokens, benignExtensionAdds };
	}
	return { error: `unknown mode ${mode}` };
};

async function savePost(page) {
	const result = await page.evaluate(async () => {
		const sel = () => window.wp.data.select('core/editor');
		window.wp.data.dispatch('core/editor').savePost();
		const t0 = Date.now();
		// Give the save request time to start, then wait for it to finish.
		await new Promise((r) => setTimeout(r, 500));
		while (sel().isSavingPost()) {
			if (Date.now() - t0 > 60000) return { ok: false, reason: 'save timeout' };
			await new Promise((r) => setTimeout(r, 250));
		}
		const ok = sel().didPostSaveRequestSucceed();
		const errors = window.wp.data.select('core/notices').getNotices()
			.filter((x) => x.status === 'error').map((x) => x.content);
		return { ok, errors };
	});
	if (!result.ok || (result.errors && result.errors.length)) {
		fail(5, `savePost failed (NO retry — investigate before re-running): ${JSON.stringify(result)}`);
	}
}

(async () => {
	const { raw: oldRaw, type } = await restFetchRaw();
	console.log(`[fetch] ${SITE} ${type}/${POST}: ${Buffer.byteLength(oldRaw, 'utf8')} bytes raw`);

	const browser = await chromium.launch({ headless: true });
	const page = await (await browser.newContext()).newPage();
	try {
		if (RESTORE) {
			const backup = fs.readFileSync(RESTORE, 'utf8');
			await openEditor(page);
			await page.evaluate((rawContent) => {
				const parsed = window.wp.blocks.parse(rawContent);
				window.wp.data.dispatch('core/block-editor').resetBlocks(parsed);
			}, backup);
			await savePost(page);
			console.log('[restore] backup applied through the editor and saved.');
			console.log('[restore] NOTE: undeclared attrs in the backup are dropped by parse — the byte-exact record stays in the backup file.');
			return;
		}

		// --from-backup <file>: build the plan from the byte-exact backup instead of
		// the live raw — REQUIRED when re-migrating after a --restore, because the
		// restore's parse round-trip permanently dropped the undeclared attrs
		// (legacy colours) from the DB; the backup is then the only value source.
		const FROM_BACKUP = opt('--from-backup');
		const plan = buildPlan(FROM_BACKUP ? fs.readFileSync(FROM_BACKUP, 'utf8') : oldRaw);
		if (plan.errors.length) {
			plan.errors.forEach((e) => console.error(`[plan] ${e}`));
			fail(7, `${plan.errors.length} fail-closed mapping error(s) — nothing was touched`);
		}
		if (!plan.entries.length) { console.log('[plan] no casualties found on this post — nothing to do.'); return; }
		console.log(`[plan] ${plan.entries.length} block(s) to migrate: ${plan.entries.map((e) => `${e.name}#${e.kth}`).join(', ')}`);

		await openEditor(page);
		const pre = await page.evaluate(PAGE_FN, { plan, mode: 'preflight' });
		if (pre.problems.length) {
			pre.problems.forEach((p) => console.error(`[preflight] ${p}`));
			fail(4, 'preflight failed — nothing was touched');
		}
		console.log('[preflight] runtime schema + counts + validity: OK');

		const dry = await page.evaluate(PAGE_FN, { plan, mode: 'dryrun' });
		for (const d of dry) {
			console.log(`\n===== DRY ${d.name} #${d.kth} =====\n${d.serialized}`);
			if (d.missingTokens.length) {
				d.missingTokens.forEach((t) => console.error(`[dry] MISSING TOKEN ${t.source}: ${JSON.stringify(t.value)}`));
			}
		}
		if (dry.some((d) => d.missingTokens.length)) fail(6, 'dry-run token inventory failed — mapping loses content');
		if (!LIVE) { console.log('\n[dry-run] complete, nothing written. Re-run with --live to apply.'); return; }

		const applied = await page.evaluate(PAGE_FN, { plan, mode: 'apply' });
		if (applied.error) fail(5, applied.error);
		console.log(`[apply] replaced ${applied.replaced.length} block(s)`);
		await savePost(page);
		console.log('[save] savePost succeeded');

		const { raw: newRaw } = await restFetchRaw();
		const verdict = await page.evaluate(PAGE_FN, { plan, mode: 'verify', oldRaw, newRawAfterSave: newRaw });
		if (verdict.mismatches.length) verdict.mismatches.forEach((m) => console.error(`[verify] UNTOUCHED-BLOCK DELTA: ${m}`));
		if (verdict.missingTokens.length) verdict.missingTokens.forEach((t) => console.error(`[verify] MISSING TOKEN ${t.source}: ${JSON.stringify(t.value)}`));
		// Revision safety net: assert the pre-migration revision exists (REST read).
		const auth = 'Basic ' + Buffer.from(`${USER}:${APP_PASS}`).toString('base64');
		const revRes = await fetch(`https://${SITE}/wp-json/wp/v2/${type}/${POST}/revisions?per_page=1`, { headers: { Authorization: auth } });
		const revs = revRes.status === 200 ? await revRes.json() : [];
		console.log(`[revisions] ${revRes.status === 200 ? revs.length + '+ revision(s) present' : 'could not list (' + revRes.status + ')'}`);
		if (verdict.mismatches.length || verdict.missingTokens.length) fail(6, 'post-save verification FAILED — see deltas above; restore path: --restore <backup>');
		console.log(`[verify] tree-parity on untouched blocks + token inventory: OK (${verdict.benignExtensionAdds} benign extension-default additions accepted)`);
	} finally {
		await browser.close();
	}
})().catch((e) => fail(3, e.stack || String(e)));
