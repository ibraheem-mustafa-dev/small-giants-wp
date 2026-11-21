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
// The logo block's calibration as cache/responsive-logo.json holds it: width reaches the link part, the ceiling and the margin
// only the root.
const CAL = { width: { slot: '', slots: [ '', LINK, `${ LINK } > .sgs-responsive-logo__picture` ], property: 'width' }, maxWidth: { slot: '', slots: [ '' ], property: 'max-width' }, margin: { slot: '', slots: [ '' ], property: 'margin' } };
// The link sizes the logo (a width, and a ceiling of 100% that caps nothing); a link that also centres it is in the test of
// the looks the link slot reads.
const page = ( logos = 1 ) => N( 'section', {}, [ N( 'a', { attrs: { href: '#/' }, style: 'width:240px;max-width:100%', box: [ 240, 80 ] }, Array.from( { length: logos }, () => N( 'acme-logo', { style: 'width:100%', box: [ 240, 80 ] } ) ) ), N( 'p', { words: 'Body' } ) ] );
const nodes = ( root, o = {} ) => find( run( root, 'class Component {}', { calSettings: ( b ) => ( b === logoBlock ? CAL : {} ), ...o } ).skeleton, ( x ) => x.name === logoBlock );

test( 'MUST FAIL: the dissolved link round one logo is the logo node\'s draft slot at the calibrated link slot', () => {
	const [ n ] = nodes( page() );
	assert.equal( logoBlock, 'sgs/responsive-logo' );
	assert.deepEqual( Object.keys( n.draftSlots ), [ LINK ] );
	assert.deepEqual( n.draftSlots[ LINK ], { tpl: 'Root/2#0' }, 'the slot is the link (template 2), not the logo image' );
} );

const linked = ( style, inner = null ) => N( 'section', {}, [ N( 'a', { attrs: { href: '#/' }, style, box: [ 240, 80 ] }, [ inner ?? N( 'acme-logo', { style: 'width:100%', box: [ 240, 80 ] } ) ] ), N( 'p', { words: 'Body' } ) ] );
const outcome = ( style, o = {}, inner = null ) => {
	const r = run( linked( style, inner ), 'class Component {}', { calSettings: ( b ) => ( b === logoBlock ? CAL : {} ), ...o } );
	return { link: r.proposal.rows.find( ( x ) => 'a' === x.tag ), logo: find( r.skeleton, ( x ) => x.name === logoBlock )[ 0 ], r };
};
const byWidth = ( values ) => ( { 375: values, 768: values, 1440: values } );

test( 'a link that only sizes its logo is dissolved to the link slot; one that also paints a box stays a node (MUST FAIL where the unwrap guard ignores the link slot)', () => {
	const { link, logo } = outcome( 'width:240px' );
	assert.equal( link.action, 'unwrap' );
	assert.deepEqual( logo.draftSlots, { [ LINK ]: { tpl: 'Root/2#0' } } );
	// The waived width is recorded where it goes: the logo node's link part, which the conservation check verifies.
	assert.deepEqual( link.conserve, [ { kind: 'link-slot', node: 'Root/3#0', slot: LINK, looks: [ 'width' ] } ] );
	// Negative controls: a pill round the logo (a background, padding) is paint the link slot does not read, so the link
	// stays a node and the logo takes no slot; and with no calibrated link slot a sized link stays a node too.
	const pill = outcome( 'width:240px;background:#fff;padding:8px 10px;border-radius:14px' );
	assert.equal( pill.link.action, null );
	assert.equal( pill.link.block, 'sgs/container' );
	assert.equal( pill.logo.draftSlots, undefined );
	const unread = outcome( 'width:240px', { calSettings: () => ( { width: { slot: '', slots: [ '' ] } } ) } );
	assert.equal( unread.link.action, null, 'no calibrated link slot: the width would be read by nothing, so the link stays' );
} );

test( 'the link slot reads only the looks a setting calibrated there paints: a ceiling or centring it does not read keeps the link a node (MUST FAIL where the link slot waives every band look)', () => {
	for ( const style of [ 'width:240px;max-width:320px', 'width:240px;margin:0 auto', 'width:240px;max-width:320px;margin:0 auto' ] ) {
		const { link, logo } = outcome( style );
		assert.equal( link.action, null, `${ style }: max-width and margin are calibrated at the logo's root only` );
		assert.equal( link.block, 'sgs/container', style );
		assert.equal( logo.draftSlots, undefined, style );
	}
	// Negative control: a calibration whose ceiling setting reaches the link part reads the ceiling there, so the link goes.
	const reaching = { ...CAL, maxWidth: { slot: '', slots: [ '', LINK ], property: 'max-width' } };
	const capped = outcome( 'width:240px;max-width:320px', { calSettings: ( b ) => ( b === logoBlock ? reaching : {} ) } );
	assert.equal( capped.link.action, 'unwrap' );
	assert.deepEqual( capped.link.conserve, [ { kind: 'link-slot', node: 'Root/3#0', slot: LINK, looks: [ 'width', 'max-width' ] } ] );
} );

test( 'a look the link part paints by default at the value the link declares is read there: no underline on a home link (MUST FAIL where the declared none keeps the link)', () => {
	const paint = ( line ) => ( b ) => ( b === logoBlock ? { elements: { [ LINK ]: byWidth( { 'text-decoration-line': line, width: '0px' } ) }, parts: {}, settings: CAL, text: {} } : null );
	for ( const style of [ 'width:240px;text-decoration:none', 'width:240px;text-decoration-line:none' ] ) {
		const { link, logo } = outcome( style, { calParts: paint( 'none' ) } );
		assert.equal( link.action, 'unwrap', style );
		assert.deepEqual( logo.draftSlots, { [ LINK ]: { tpl: 'Root/2#0' } }, style );
		assert.deepEqual( link.conserve[ 0 ].looks, [ 'width', 'text-decoration' ], style );
	}
	// Negative controls: a link part that underlines by default, and a block with no default paint, do not read it.
	assert.equal( outcome( 'width:240px;text-decoration:none', { calParts: paint( 'underline' ) } ).link.action, null );
	assert.equal( outcome( 'width:240px;text-decoration:none', { calParts: () => null } ).link.action, null );
	// The default paint counts only at a part the rule's setting is calibrated at: with width never reaching the link part,
	// the writer cannot place the link there, so a link that draws no underline stays.
	const unreached = { calSettings: ( b ) => ( b === logoBlock ? { width: { slot: '', slots: [ '' ], property: 'width' } } : {} ), calParts: paint( 'none' ) };
	assert.equal( outcome( 'text-decoration:none', unreached ).link.action, null );
	// A declared value the default does not paint (margin auto against the part's 0px) is not read by the default.
	const margins = ( b ) => ( b === logoBlock ? { elements: { [ LINK ]: byWidth( { 'margin-left': '0px', 'margin-right': '0px' } ) } } : null );
	assert.equal( outcome( 'width:240px;margin:0 auto', { calParts: margins } ).link.action, null );
} );

test( 'a logo one dissolved wrapper down still takes the link slot (MUST FAIL where only a direct logo child counts)', () => {
	// The inner div only centres the logo (rules.alignWrapper), so the build dissolves it as well and the logo is built
	// straight under the link.
	const logoIn = ( style ) => N( 'div', { style, box: [ 240, 80 ] }, [ N( 'acme-logo', { style: 'width:100%', box: [ 240, 80 ] } ) ] );
	const { link, logo, r } = outcome( 'width:240px', {}, logoIn( 'text-align:center' ) );
	assert.equal( link.action, 'unwrap' );
	assert.equal( r.proposal.rows.find( ( x ) => 'div' === x.tag ).action, 'unwrap' );
	assert.deepEqual( logo.draftSlots, { [ LINK ]: { tpl: 'Root/2#0' } } );
	assert.equal( link.conserve[ 0 ].node, 'Root/4#0', 'the record names the logo, two levels down' );
	// Negative controls: an inner wrapper that paints a box of its own stays a node, and so does a bare one the build keeps
	// as a container, so in both the logo is not the link's only block and the link stays.
	for ( const style of [ 'background:#fff;padding:8px;border-radius:12px', '' ] ) {
		const kept = outcome( 'width:240px', {}, logoIn( style ) );
		assert.equal( kept.r.proposal.rows.find( ( x ) => 'div' === x.tag ).action, null, style );
		assert.equal( kept.link.action, null, style );
		assert.equal( kept.logo.draftSlots, undefined, style );
	}
	// The owner decided the centring div is a container: the build keeps it, so the guard does not look through it either
	// (it classifies as the build does) and the link stays, though the rules alone would dissolve the div.
	const decided = outcome( 'width:240px', { clientDecisions: { surfaces: { fixture: { 'Root/3#0': { block: 'sgs/container' } } } } }, logoIn( 'text-align:center' ) );
	assert.equal( decided.r.proposal.rows.find( ( x ) => 'div' === x.tag ).block, 'sgs/container' );
	assert.equal( decided.link.action, null );
	assert.equal( decided.logo.draftSlots, undefined );
} );

test( 'the writer says when a link dissolved for its logo\'s link slot built no logo to take it (the guard predicts the build)', () => {
	const rule = { linkSlots: [ { block: logoBlock, setting: 'width', slot: LINK } ] };
	const expected = [ { kind: 'link-slot', node: 'Root/3#0', slot: LINK, looks: [ 'width' ] } ];
	const res = wrapperLinkSlot( { rule, e: {}, built: [ { name: 'sgs/heading' } ], calSettings: () => CAL, finder: () => 'F', expected } );
	assert.ok( res.notes.some( ( t ) => /dissolved for the sgs\/responsive-logo link slot, but its children built no sgs\/responsive-logo block: its width is read by nothing/.test( t ) ), res.notes.join( '; ' ) );
	// Negative controls: the logo built takes the slot and no note is written; with no record nothing was expected.
	const logo = { name: logoBlock };
	assert.deepEqual( wrapperLinkSlot( { rule, e: {}, built: [ logo ], calSettings: () => CAL, finder: () => 'F', expected } ).notes, [] );
	assert.deepEqual( wrapperLinkSlot( { rule, e: {}, built: [ { name: 'sgs/heading' } ], calSettings: () => CAL, finder: () => 'F' } ).notes, [] );
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
	// Called directly with a calibration that never reached the link part, the writer gives no slot and says why (the guard
	// refuses such an unwrap first, so a proposal never gets here).
	const unmeasured = { name: logoBlock };
	const said = wrapperLinkSlot( { rule: { linkSlots: [ { block: logoBlock, setting: 'width', slot: LINK } ] }, e: {}, built: [ unmeasured ], calSettings: () => ( { width: { slot: '', slots: [ '' ], property: 'width' } } ), finder: () => 'F' } );
	assert.equal( unmeasured.draftSlots, undefined );
	assert.match( said.notes[ 0 ], /the calibration has no \.sgs-responsive-logo__link slot for width/ );
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
