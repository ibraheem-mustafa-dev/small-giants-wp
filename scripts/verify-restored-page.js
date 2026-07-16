#!/usr/bin/env node
/**
 * verify-restored-page.js — live-DOM proof that a migrated page renders its content.
 *
 * The Track B definition-of-done requires the restore to be proven on the REAL
 * page via computed DOM (R-31-11), not on assertion output or the emitted markup.
 * This script IS that proof, committed so any later session (or Bean) can re-run
 * it and get the same numbers rather than trusting a prose claim in a handoff.
 *
 * Clear the Hostinger CDN before running (`hosting_clearWebsiteCacheV1`) —
 * build-deploy.py clears no caches, and a stale edge copy will silently give you
 * yesterday's DOM.
 *
 * Usage (node runs via PowerShell on this machine — the nvm shim is broken in Git Bash):
 *   node scripts/verify-restored-page.js https://palestine-lives.org/ [--json out.json]
 *
 * Exit 0 = every gate passed. Exit 1 = a gate failed (numbers printed).
 */

'use strict';

const fs = require('fs');
const { chromium } = require('playwright');

const url = process.argv[2];
const jsonIdx = process.argv.indexOf('--json');
const jsonOut = jsonIdx > 0 ? process.argv[jsonIdx + 1] : null;
if (!url) {
	console.error('usage: node scripts/verify-restored-page.js <url> [--json out.json]');
	process.exit(2);
}

(async () => {
	const browser = await chromium.launch({ headless: true });
	const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
	const consoleErrors = [];
	page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
	await page.goto(`${url}?verify=${Date.now()}`, { waitUntil: 'networkidle', timeout: 45000 });

	const m = await page.evaluate(() => {
		const q = (s) => Array.from(document.querySelectorAll(s));
		const hero = document.querySelector('.sgs-hero');
		const imgs = q('.sgs-brand-strip img');
		return {
			heroTextLength: hero ? hero.innerText.trim().length : 0,
			h1Count: q('h1').length,
			h1Text: q('h1')[0] ? q('h1')[0].innerText.trim() : '',
			heroImageSrc: q('.sgs-hero img')[0] ? (q('.sgs-hero img')[0].currentSrc || q('.sgs-hero img')[0].src) : '',
			heroCtas: q('.sgs-hero a').map((a) => ({ label: a.innerText.trim(), href: a.getAttribute('href') })).filter((c) => c.label),
			brandImgCount: imgs.length,
			brandImgLoaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
			brandImgAlts: Array.from(new Set(imgs.map((i) => i.alt).filter(Boolean))),
			slideCount: q('.sgs-testimonial-slider__slide').length,
			distinctReviewers: Array.from(new Set(q('.sgs-testimonial-slider__slide')
				.map((s) => (s.innerText.match(/[A-Z][a-z]+ [A-Z][a-z]+/) || [''])[0]).filter(Boolean))),
			infoBoxCount: q('.sgs-info-box').length,
			infoBoxHeadings: q('.sgs-info-box h3').map((h) => h.innerText.trim()),
			infoBoxIcons: q('.sgs-info-box svg').length,
		};
	});
	m.url = url;
	m.consoleErrors = consoleErrors;

	// The definition-of-done gates. Content presence only — styling is Bean's eye
	// (R-31-13); these numbers exist so nobody has to take a prose claim on trust.
	const gates = [
		['.sgs-hero has text', m.heroTextLength > 0],
		['at least one <h1>', m.h1Count >= 1],
		['brand-strip images present', m.brandImgCount > 0],
		['brand-strip images all loaded', m.brandImgCount > 0 && m.brandImgLoaded === m.brandImgCount],
		['hero has both CTAs', m.heroCtas.length >= 2],
		['hero split image present', Boolean(m.heroImageSrc)],
		['testimonials present', m.slideCount > 0],
		['info-boxes have headings', m.infoBoxCount > 0 && m.infoBoxHeadings.length === m.infoBoxCount],
	];
	m.gates = Object.fromEntries(gates);
	const failed = gates.filter(([, ok]) => !ok).map(([name]) => name);

	console.log(JSON.stringify(m, null, 1));
	if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(m, null, 1), 'utf8');
	if (failed.length) console.error(`\nFAILED GATES: ${failed.join(', ')}`);
	else console.log('\nAll live-DOM gates PASSED.');
	await browser.close();
	process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(2); });
