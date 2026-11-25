// A label that wraps its field is read at the element holding its words (lib/apply-probes.mjs::labelTextHolder): the wrapper
// carries only inherited styles, so reading it reports the body size and the label size setting is never written.
// Run: node --test tests/apply-label-holder.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { labelTextHolder, probeRead } from '../lib/apply-probes.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const HTML = `<style>body{font-size:19px;font-weight:400}.t{font-size:13.5px;font-weight:700}</style>
<form>
	<label id="wrap"><span class="t">Name *</span><input id="a"></label>
	<label for="b" id="for" class="t">Email</label><input id="b">
	<label id="own">Phone <input id="c"></label>
	<label id="mark1"><span class="req">*</span><span class="t">Name</span><input id="d"></label>
	<label id="mark2">* <span class="t">Name</span><input id="e"></label>
	<label id="mark3"><span class="req">(required)</span><span class="t">Name</span><input id="f"></label>
	<label id="mark4"><span class="req">*</span><input id="g"></label>
	<label id="sel"><span class="t">Team</span><select id="h"><option>Sales and account management</option><option>Other</option></select></label>
	<label id="selbare"><select id="i"><option>Sales and account management</option></select></label>
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
				return { tag: el.tagName, cls: el.className, size: cs.fontSize, weight: cs.fontWeight };
			};
			return { wrap: pick( 'wrap', 'a' ), forLabel: pick( 'for', 'b' ), own: pick( 'own', 'c' ), m1: pick( 'mark1', 'd' ), m2: pick( 'mark2', 'e' ), m3: pick( 'mark3', 'f' ), m4: pick( 'mark4', 'g' ), sel: pick( 'sel', 'h' ), selbare: pick( 'selbare', 'i' ) };
		}, labelTextHolder.toString() );
		// The fault: the wrapper reads 19px / 400; its span holds the label look.
		assert.deepEqual( got.wrap, { tag: 'SPAN', cls: 't', size: '13.5px', weight: '700' } );
		// Negative controls: a for= label and a label with its own words stay the label itself.
		assert.deepEqual( got.forLabel, { tag: 'LABEL', cls: 't', size: '13.5px', weight: '700' } );
		assert.equal( got.own.tag, 'LABEL' );
		// A required marker or icon is skipped, whether it is a span before the words or loose text in the label; a label holding only a marker stays itself.
		for ( const k of [ 'm1', 'm2', 'm3' ] ) {
			assert.equal( got[ k ].cls, 't', k );
		}
		assert.equal( got.m4.tag, 'LABEL' );
		// The fault: a select in the label put its longest option (19px / 400 here, the body's) ahead of the label's own span.
		assert.deepEqual( got.sel, { tag: 'SPAN', cls: 't', size: '13.5px', weight: '700' } );
		// A label holding only a select has no words of its own: it stays the label, never an option.
		assert.equal( got.selbare.tag, 'LABEL' );
	} finally {
		await browser.close();
	}
} );

// The form probe reads the px of one line box where a label's or the consent text's line height computes to normal (the value
// Fill's read gives the same element), and nothing where it is a length.
test( 'MUST FAIL: the form probe collects normalLineHeight for a label and a consent text at line-height normal, and none for a length', async () => {
	const browser = await ( await loadChromium() ).chromium.launch();
	try {
		const page = await browser.newPage();
		const form = ( lh ) => `<style>body{font:14px/normal Arial}.t{line-height:${ lh }}</style><form id="f"><label><span class="t">Name</span><input id="a"></label><label><input type="checkbox"><span class="sgs-form-field__consent-text t">I agree</span></label></form>`;
		const read = async ( lh ) => {
			await page.setContent( form( lh ) );
			return ( await probeRead( page, { keys: [ 'f' ], finderOf: () => '#f', resolveSrc: resolveFinder.toString(), tpls: {}, blocks: { f: 'sgs/form' }, side: 'live' } ) ).f;
		};
		const normal = await read( 'normal' );
		assert.ok( normal.fields[ 0 ].label.normalLineHeight > 14, `label ${ normal.fields[ 0 ].label.normalLineHeight }` );
		assert.ok( normal.consent.normalLineHeight > 14, `consent ${ normal.consent?.normalLineHeight }` );
		const fixed = await read( '22px' );
		assert.equal( fixed.fields[ 0 ].label[ 'line-height' ], '22px' );
		assert.equal( fixed.fields[ 0 ].label.normalLineHeight, undefined );
		assert.equal( fixed.consent.normalLineHeight, undefined );
	} finally {
		await browser.close();
	}
} );
