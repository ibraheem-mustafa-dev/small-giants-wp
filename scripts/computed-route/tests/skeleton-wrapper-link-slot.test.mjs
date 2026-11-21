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

test( 'a link that only sizes its logo is dissolved to the link slot; one that also paints a box stays a node (MUST FAIL where the unwrap guard ignores the link slot)', () => {
	const linked = ( style ) => N( 'section', {}, [ N( 'a', { attrs: { href: '#/' }, style, box: [ 240, 80 ] }, [ N( 'acme-logo', { style: 'width:100%', box: [ 240, 80 ] } ) ] ), N( 'p', { words: 'Body' } ) ] );
	const outcome = ( style, o = {} ) => {
		const r = run( linked( style ), 'class Component {}', { calSettings: ( b ) => ( b === logoBlock ? CAL : {} ), ...o } );
		return { link: r.proposal.rows.find( ( x ) => 'a' === x.tag ), logo: find( r.skeleton, ( x ) => x.name === logoBlock )[ 0 ] };
	};
	for ( const style of [ 'width:240px', 'width:240px;max-width:320px', 'width:240px;margin:0 auto' ] ) {
		const { link, logo } = outcome( style );
		assert.equal( link.action, 'unwrap', style );
		assert.deepEqual( logo.draftSlots, { [ LINK ]: { tpl: 'Root/2#0' } }, style );
	}
	// Negative controls: a pill round the logo (a background, padding) is paint the link slot does not read, so the link
	// stays a node and the logo takes no slot; and with no calibrated link slot a sized link stays a node too.
	const pill = outcome( 'width:240px;background:#fff;padding:8px 10px;border-radius:14px' );
	assert.equal( pill.link.action, null );
	assert.equal( pill.link.block, 'sgs/container' );
	assert.equal( pill.logo.draftSlots, undefined );
	const unread = outcome( 'width:240px', { calSettings: () => ( { width: { slot: '', slots: [ '' ] } } ) } );
	assert.equal( unread.link.action, null, 'no calibrated link slot: the width would be read by nothing, so the link stays' );
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
