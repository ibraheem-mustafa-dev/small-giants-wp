// A label that wraps its field is read at the element holding its words (lib/apply-probes.mjs::labelTextHolder): the wrapper
// carries only inherited styles, so reading it reports the body size and the label size setting is never written.
// Run: node --test tests/apply-label-holder.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { labelTextHolder } from '../lib/apply-probes.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const HTML = `<style>body{font-size:19px;font-weight:400}.t{font-size:13.5px;font-weight:700}</style>
<form>
	<label id="wrap"><span class="t">Name *</span><input id="a"></label>
	<label for="b" id="for" class="t">Email</label><input id="b">
	<label id="own">Phone <input id="c"></label>
</form>`;

test( 'wrapping, for= and own-text labels resolve to the element painting the words', async () => {
	const browser = await ( await loadChromium() ).chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		const got = await page.evaluate( ( src ) => {
			// eslint-disable-next-line no-new-func
			const holder = new Function( `return (${ src });` )();
			const pick = ( labelId, fieldId ) => {
				const el = holder( document.getElementById( labelId ), document.getElementById( fieldId ) );
				const cs = getComputedStyle( el );
				return { tag: el.tagName, size: cs.fontSize, weight: cs.fontWeight };
			};
			return { wrap: pick( 'wrap', 'a' ), forLabel: pick( 'for', 'b' ), own: pick( 'own', 'c' ) };
		}, labelTextHolder.toString() );
		// The fault: the wrapper reads 19px / 400; its span holds the label look.
		assert.deepEqual( got.wrap, { tag: 'SPAN', size: '13.5px', weight: '700' } );
		// Negative controls: a for= label and a label with its own words stay the label itself.
		assert.deepEqual( got.forLabel, { tag: 'LABEL', size: '13.5px', weight: '700' } );
		assert.equal( got.own.tag, 'LABEL' );
	} finally {
		await browser.close();
	}
} );
