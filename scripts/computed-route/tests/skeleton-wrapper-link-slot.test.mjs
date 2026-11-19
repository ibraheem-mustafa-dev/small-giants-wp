// A link round a logo that the writer dissolves (rules.homeLink) is read at the logo block's own link part: the draft sizes the
// logo by its link (`<a style="width:240px; max-width:100%; margin:0 auto">` round an image of `width:100%`), and the logo block
// draws its own link, so the dissolved link becomes the logo node's draftSlots entry at the calibrated link slot of the width
// setting (rules.homeLink.linkSlots, lib/skeleton-wrapper-link-slot.mjs). Before this the footer logo filled its column, twice
// the draft's size (2026-11-19). Pure functions and a temporary folder only: no command, no site.
// Mutation list: tests/skeleton-wrapper-link-slot.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionsProblems } from '../lib/skeleton-facts.mjs';
import { wrapperLinkSlot } from '../lib/skeleton-wrapper-link-slot.mjs';
import { facts, N, run, find, REPO } from './fixtures/skeleton-widgets/build.mjs';

const LINK = '.sgs-responsive-logo__link';
const logoBlock = facts( REPO ).logoBlocks[ 0 ];
const CAL = { width: { slot: '', slots: [ '', LINK, `${ LINK } > .sgs-responsive-logo__picture` ] } };
const page = ( logos = 1 ) => N( 'section', {}, [ N( 'a', { attrs: { href: '#/' }, style: 'width:240px;max-width:100%;margin:0 auto', box: [ 240, 80 ] }, Array.from( { length: logos }, () => N( 'acme-logo', { style: 'width:100%', box: [ 240, 80 ] } ) ) ), N( 'p', { words: 'Body' } ) ] );
const nodes = ( root, o = {} ) => find( run( root, 'class Component {}', { calSettings: ( b ) => ( b === logoBlock ? CAL : {} ), ...o } ).skeleton, ( x ) => x.name === logoBlock );

test( 'MUST FAIL: the dissolved link round one logo is the logo node\'s draft slot at the calibrated link slot', () => {
	const [ n ] = nodes( page() );
	assert.equal( logoBlock, 'sgs/responsive-logo' );
	assert.deepEqual( Object.keys( n.draftSlots ), [ LINK ] );
	assert.deepEqual( n.draftSlots[ LINK ], { tpl: 'Root/2#0' }, 'the slot is the link (template 2), not the logo image' );
} );

test( 'negative control: no rule entry, no calibrated link slot, and a link round several logos give no slot', () => {
	assert.equal( nodes( page(), { off: [ 'homeLink' ] } )[ 0 ]?.draftSlots, undefined );
	assert.equal( nodes( page(), { calSettings: () => ( { width: { slot: '', slots: [ '' ] } } ) } )[ 0 ].draftSlots, undefined, 'a block whose width calibration never reached the link reads nothing' );
	assert.ok( nodes( page( 2 ) ).every( ( n ) => ! n.draftSlots?.[ LINK ] ), 'two logos in one link: the link sizes neither alone' );
	// A link round two logos is not dissolved at all: rules.homeLink.groupBlock keeps it as the container of the pair.
	const r = run( page( 2 ), 'class Component {}', { calSettings: ( b ) => ( b === logoBlock ? CAL : {} ) } );
	const row = r.proposal.rows.find( ( x ) => 'homeLink' === x.rule );
	assert.equal( row?.slotNotes, undefined, 'a kept link is no dissolved link, so it gives no link slot' );
	// Called on a dissolved link that held two logos, the writer reads the link for neither and says so.
	const two = [ { name: logoBlock }, { name: logoBlock } ];
	const res = wrapperLinkSlot( { rule: { linkSlots: [ { block: logoBlock, setting: 'width', slot: LINK } ] }, e: {}, built: two, calSettings: () => CAL, finder: () => 'F' } );
	assert.ok( two.every( ( n ) => undefined === n.draftSlots ), 'two logos in one link: neither takes the link' );
	assert.ok( res.notes.some( ( t ) => /holds 2 sgs\/responsive-logo blocks/.test( t ) ) );
} );

test( 'wrapperLinkSlot: other blocks built under the link are untouched, and an absent rule changes nothing', () => {
	const other = { name: 'sgs/heading' };
	const logo = { name: logoBlock };
	wrapperLinkSlot( { rule: { linkSlots: [ { block: logoBlock, setting: 'width', slot: LINK } ] }, e: {}, built: [ other, logo ], calSettings: () => CAL, finder: () => 'F' } );
	assert.equal( other.draftSlots, undefined );
	assert.deepEqual( logo.draftSlots, { [ LINK ]: 'F' } );
	const none = { name: logoBlock };
	assert.deepEqual( wrapperLinkSlot( { rule: undefined, e: {}, built: [ none ], calSettings: () => CAL, finder: () => 'F' } ), { notes: [] } );
	assert.equal( none.draftSlots, undefined );
} );

test( 'MUST FAIL: the rule names a setting of the logo block and a slot path', () => {
	const bad = ( linkSlots ) => {
		const f = facts( REPO );
		f.decisions.rules.homeLink.linkSlots = linkSlots;
		return decisionsProblems( f ).filter( ( p ) => /homeLink\.linkSlots/.test( p ) );
	};
	assert.deepEqual( bad( [ { block: logoBlock, setting: 'width', slot: LINK } ] ), [] );
	assert.equal( bad( [ { block: logoBlock, setting: 'noSuchSetting', slot: LINK } ] ).length, 1 );
	assert.equal( bad( [ { block: logoBlock, setting: 'width', slot: 'link' } ] ).length, 1 );
} );
