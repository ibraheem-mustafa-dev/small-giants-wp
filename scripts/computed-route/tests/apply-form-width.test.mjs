// RF7: the form's field widths pair the draft's and the live form's fields by name among those each shows at rest (the live
// form's later wizard steps, hidden at rest, included), so a conditional field one form hides (the draft's "Companies House" until
// its condition holds) takes no place in the pairing
// (lib/apply-form-width.mjs::pairedFields, ::fieldWidths). The probe records carry the keys lib/apply-probes.mjs::fieldsOf writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldWidths, pairedFields } from '../lib/apply-form-width.mjs';
import { probeRead } from '../lib/apply-probes.mjs';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const column = { ref: null, cellW: 300, gridW: 640, cols: 2, form: false };
const span = { ref: null, cellW: 640, gridW: 640, cols: 2, form: false };
const field = ( name, layout, extra = {} ) => ( { name, layout, shown: true, honeypot: false, field: {}, label: null, type: 'text', ...extra } );
const live = ( name, ref, extra = {} ) => field( name, { ref, cellW: 640, gridW: 640, cols: 0, form: false }, extra );
const all = { blocks: { 'cr-ref-a': { block: 'sgs/form-field-text', attrs: {} }, 'cr-ref-b': { block: 'sgs/form-field-text', attrs: {} }, 'cr-ref-c': { block: 'sgs/form-field-text', attrs: {} } } };
const db = { prepare: () => ( { get: () => ( { attr_name: 'width' } ), all: () => [ { attr_name: 'width' } ] } ) };

// The draft shows two fields (its third, a conditional one, is hidden at rest); the live form shows all three.
const draft = { 1440: { probes: { fields: [ field( 'first', column ), field( 'second', column ), field( 'company', column, { shown: false } ) ] } } };
const liveForm = { 1440: { probes: { fields: [ live( 'first', 'cr-ref-a' ), live( 'second', 'cr-ref-b' ), live( 'company', 'cr-ref-c' ) ] } } };

test( 'MUST FAIL: a field only the live form shows pairs with nothing, the others pair by name', () => {
	const { pairs } = pairedFields( draft[ 1440 ].probes.fields, liveForm[ 1440 ].probes.fields );
	assert.deepEqual( pairs.map( ( [ d, l ] ) => [ d.name, l.name ] ), [ [ 'first', 'first' ], [ 'second', 'second' ] ] );
} );

test( 'MUST FAIL: the widths are written on the paired fields, none on the conditional one', () => {
	const items = fieldWidths( { draft, live: liveForm, block: 'sgs/form', all, db } );
	assert.deepEqual( items.map( ( i ) => [ i.ref, i.status ] ), [ [ 'cr-ref-a', 'op' ], [ 'cr-ref-b', 'op' ] ] );
} );

test( 'a reordered live form still pairs by name', () => {
	const swapped = { 1440: { probes: { fields: [ live( 'second', 'cr-ref-b' ), live( 'first', 'cr-ref-a' ) ] } } };
	const items = fieldWidths( { draft: { 1440: { probes: { fields: [ field( 'first', column ), field( 'second', span ) ] } } }, live: swapped, block: 'sgs/form', all, db } );
	assert.deepEqual( items.map( ( i ) => i.ref ), [ 'cr-ref-a' ] );
} );

test( 'negative control: no names on the draft side pairs by position, and unequal counts pair nothing', () => {
	const bare = ( f ) => ( { ...f, name: '' } );
	const same = fieldWidths( { draft: { 1440: { probes: { fields: [ bare( field( 'x', column ) ), bare( field( 'y', column ) ) ] } } }, live: { 1440: { probes: { fields: [ live( 'x', 'cr-ref-a' ), live( 'y', 'cr-ref-b' ) ] } } }, block: 'sgs/form', all, db } );
	assert.deepEqual( same.map( ( i ) => i.ref ), [ 'cr-ref-a', 'cr-ref-b' ] );
	const uneven = fieldWidths( { draft: { 1440: { probes: { fields: [ bare( field( 'x', column ) ) ] } } }, live: { 1440: { probes: { fields: [ live( 'x', 'cr-ref-a' ), live( 'y', 'cr-ref-b' ) ] } } }, block: 'sgs/form', all, db } );
	assert.equal( uneven[ 0 ].status, 'no-setting' );
} );

// A wizard: the draft probe reads every step's fields at that step (all shown); the live form is read at rest, where the second
// step's fields are hidden (`.sgs-form-step--hidden`, read as `laterStep`), so the live side must not drop those.
test( 'MUST FAIL: a wizard form pairs the live form\'s later-step fields by name though they are hidden at rest', () => {
	const wizardDraft = { 1440: { probes: { fields: [ field( 'first', column ), field( 'second', column ), field( 'company', column ) ] } } };
	const wizardLive = { 1440: { probes: { fields: [ live( 'first', 'cr-ref-a' ), live( 'second', 'cr-ref-b', { shown: false, laterStep: true } ), live( 'company', 'cr-ref-c', { shown: false, laterStep: true } ) ] } } };
	const items = fieldWidths( { draft: wizardDraft, live: wizardLive, block: 'sgs/form', all, db } );
	assert.deepEqual( items.map( ( i ) => [ i.ref, i.status ] ), [ [ 'cr-ref-a', 'op' ], [ 'cr-ref-b', 'op' ], [ 'cr-ref-c', 'op' ] ] );
} );

test( 'negative control: the live honeypot is never paired, by name or by position', () => {
	const trap = live( 'first', 'cr-ref-c', { honeypot: true } );
	const { pairs } = pairedFields( [ field( 'first', column ) ], [ trap, live( 'first', 'cr-ref-a' ) ] );
	assert.deepEqual( pairs.map( ( [ , l ] ) => l.layout.ref ), [ 'cr-ref-a' ] );
} );

// A form with no wizard whose fields carry no names pairs by position: a conditional field both forms hide at rest takes no place on
// either side (the live one is hidden by its condition, not by a later step), so the shown fields pair one for one.
test( 'MUST FAIL: unnamed fields pair by position when the live form hides a conditional field at rest, as the draft does', () => {
	const bare = ( f ) => ( { ...f, name: '' } );
	const draftSide = [ bare( field( 'x', column ) ), bare( field( 'y', column, { shown: false } ) ), bare( field( 'z', column ) ) ];
	const liveSide = [ bare( live( 'x', 'cr-ref-a' ) ), bare( live( 'y', 'cr-ref-b', { shown: false, laterStep: false } ) ), bare( live( 'z', 'cr-ref-c' ) ) ];
	assert.deepEqual( pairedFields( draftSide, liveSide ).pairs.map( ( [ , l ] ) => l.layout.ref ), [ 'cr-ref-a', 'cr-ref-c' ] );
	const items = fieldWidths( { draft: { 1440: { probes: { fields: draftSide } } }, live: { 1440: { probes: { fields: liveSide } } }, block: 'sgs/form', all, db } );
	assert.deepEqual( items.map( ( i ) => [ i.ref, i.status ] ), [ [ 'cr-ref-a', 'op' ], [ 'cr-ref-c', 'op' ] ] );
} );

// The live probe says why a field is hidden at rest: only by its wizard step (laterStep), or by a condition (in a shown step or a
// hidden one), or not at all; the pairing keeps the first and drops the second.
test( 'MUST FAIL: the form probe marks a field in a hidden wizard step as laterStep, and a condition-hidden field as not', async () => {
	const browser = await ( await loadChromium() ).chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( `<style>.sgs-form-step--hidden,.sgs-form-field--hidden{display:none}</style><form id="f">
			<div class="sgs-form-step"><input name="a"><div class="sgs-form-field--hidden" data-conditional-field="a"><input name="b"></div></div>
			<div class="sgs-form-step sgs-form-step--hidden"><input name="c"><div class="sgs-form-field--hidden" data-conditional-field="c"><input name="d"></div></div>
		</form>` );
		const got = ( await probeRead( page, { keys: [ 'f' ], finderOf: () => '#f', resolveSrc: resolveFinder.toString(), tpls: {}, blocks: { f: 'sgs/form' }, side: 'live' } ) ).f.fields;
		assert.deepEqual( got.map( ( x ) => [ x.name, x.shown, x.laterStep ] ), [ [ 'a', true, false ], [ 'b', false, false ], [ 'c', false, true ], [ 'd', false, false ] ] );
		assert.deepEqual( pairedFields( [ field( '', column ), field( '', column ) ], got ).lives.map( ( x ) => x.name ), [ 'a', 'c' ] );
	} finally {
		await browser.close();
	}
} );
