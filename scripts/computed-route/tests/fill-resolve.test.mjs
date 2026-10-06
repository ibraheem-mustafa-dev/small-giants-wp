// L9.2 / L9.3 / L9.5 / L9.6 / L9.7 through fillTree (lib/fill-resolve.mjs): the draft's measured values (built here as
// fixtures, no browser) resolved root-down through the real resolver and the real framework database, with calibration
// fixtures shaped as the cache files are. Rules: R-47-3 (one resolver), R-47-5 (write only what differs, inherited values
// from the parent), R-47-8 (the ledger), FR-47-4 step 3 (spacing ownership).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree, valueText } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];

const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px', 'letter-spacing': 'normal', 'text-transform': 'none', 'background-color': 'rgba(0, 0, 0, 0)', 'box-shadow': 'none', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'row-gap': '0px', 'column-gap': '0px' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ], ...extra } );
const CAL = {
	'sgs/text': { block: 'sgs/text', elements: { '': tiers( DEFAULT ) }, settings: { fontSize: setting( 'font-size' ), textColour: setting( 'color', { forms: [ 'hex', 'slug' ] } ), margin: setting( 'margin' ), letterSpacing: setting( 'letter-spacing' ), textTransform: setting( 'text-transform' ), lineHeight: setting( 'line-height' ) }, discovered: {} },
	'sgs/heading': { block: 'sgs/heading', elements: { '': tiers( DEFAULT ) }, settings: { fontSize: setting( 'font-size' ), margin: setting( 'margin' ) }, discovered: {} },
	'sgs/container': { block: 'sgs/container', elements: { '': tiers( DEFAULT ), '.sgs-container__inner': tiers( DEFAULT ) }, settings: { gap: setting( 'gap', { slots: [ '', '.sgs-container__inner' ] } ), padding: setting( 'padding' ), margin: setting( 'margin' ), textColour: setting( 'color', { forms: [ 'hex', 'slug' ] } ), backgroundColour: setting( 'background-color', { forms: [ 'hex', 'slug' ] } ) }, discovered: {} },
};
const calFor = ( over = {} ) => ( block ) => ( over[ block ] !== undefined ? over[ block ] : CAL[ block ] ?? null );

// A snapshot of one element as lib/fill-read.mjs returns it: the styles it overrides on the default paint, per width.
const snap = ( styles, { rect, words = '', href = null, pseudo = {} } = {} ) => ( { styles: { ...DEFAULT, ...styles }, pseudo, rect: rect || { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words, href } );
// reads for a spec { id: { at: { width: snap } | snap, ... } }: a single snap applies at every width.
function reads( spec, declared = {} ) {
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, {} ] ) );
	for ( const [ id, s ] of Object.entries( spec ) ) {
		for ( const w of FIVE ) {
			const one = s?.at ? s.at[ w ] : s;
			if ( one ) {
				widths[ w ][ id ] = 'function' === typeof one ? one( w ) : one;
			} else {
				widths[ w ][ id ] = { missing: true };
			}
		}
	}
	return { widths, declared, sweep: {}, origin: 'http://127.0.0.1:1' };
}

function run( skeleton, spec, opts = {} ) {
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: reads( spec, opts.declared ), db, snapshot, calFor: opts.calFor || calFor(), ledger: opts.ledger || [], ledgerStates: opts.ledgerStates || [], rawSnapshot: opts.rawSnapshot, origin: 'http://127.0.0.1:1' } );
	return { tree, ...out };
}
const find = ( tree, ...path ) => path.reduce( ( n, i, k ) => ( 0 === k ? n[ i ] : n.innerBlocks[ i ] ), tree );

const SKEL = () => [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [
	{ name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } },
	{ name: 'sgs/text', draftRef: '.b', attributes: { text: 'B' } },
	{ name: 'sgs/text', draftRef: '.c', attributes: { text: 'C' } },
] } ];
const box = ( y ) => ( { x: 0, y, w: 300, h: 40 } );

test( 'MUST FAIL: a node whose draft equals its calibrated default paint writes nothing, and a node that differs writes only the difference', () => {
	const same = run( [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ], { '0:': snap( {}, { words: 'A' } ) } );
	assert.deepEqual( same.writes, [] );
	assert.deepEqual( same.unmapped, [] );
	const r = run( [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ], { '0:': snap( { 'font-size': '18px', 'text-transform': 'uppercase' }, { words: 'A' } ) } );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ).sort(), [ 'fontSize', 'textTransform' ] );
	assert.equal( find( r.tree, 0 ).attributes.textTransform, 'uppercase' );
	assert.match( JSON.stringify( find( r.tree, 0 ).attributes.fontSize ), /18/ );
} );

test( 'every written value goes through the resolver: a colour is snapped or a flagged literal and logged (R-47-3, R-47-7)', () => {
	const r = run( [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ], { '0:': snap( { color: 'rgb(255, 0, 0)' }, { words: 'A' } ) } );
	assert.equal( find( r.tree, 0 ).attributes.textColour, '#FF0000' );
	assert.deepEqual( [ ...new Set( r.snaps.map( ( s ) => `${ s.from } -> ${ s.to } ${ s.kind }` ) ) ], [ 'rgb(255, 0, 0) -> #FF0000 literal' ], 'logged once per tier of the call whose write was kept' );
	assert.equal( r.snaps.length, 3 );
} );

test( 'R-47-5: an inherited value equal to what the parent shows is never repeated on the child; one that differs is written', () => {
	const WHITE = 'rgb(255, 255, 255)';
	const spec = { '0:': snap( { color: WHITE } ), '1:': snap( { color: WHITE }, { words: 'A' } ), '2:': snap( { color: 'rgb(0, 0, 255)' }, { words: 'B' } ), '3:': snap( { color: WHITE }, { words: 'C' } ) };
	const r = run( SKEL(), spec );
	assert.equal( find( r.tree, 0 ).attributes.textColour, '#FFFFFF', 'the container carries it' );
	assert.equal( find( r.tree, 0, 0 ).attributes.textColour, undefined, 'the first child inherits white' );
	assert.equal( find( r.tree, 0, 1 ).attributes.textColour, '#0000FF', 'the second child differs from its parent' );
	assert.equal( find( r.tree, 0, 2 ).attributes.textColour, undefined );
} );

test( 'a child compares with its parent\'s measured value even when that value was not written (a default-equal parent)', () => {
	// Parent shows the default dark; a child that is also dark writes nothing; a white child writes white.
	const r = run( SKEL(), { '0:': snap( {} ), '1:': snap( {}, { words: 'A' } ), '2:': snap( { color: 'rgb(255, 255, 255)' }, { words: 'B' } ), '3:': snap( {}, { words: 'C' } ) } );
	assert.equal( find( r.tree, 0, 0 ).attributes.textColour, undefined );
	assert.equal( find( r.tree, 0, 1 ).attributes.textColour, '#FFFFFF' );
} );

test( 'MUST FAIL: equal rendered gaps give the parent the gap and take the between-sibling margins from the children', () => {
	const kid = ( y, mb ) => snap( { 'margin-bottom': `${ mb }px` }, { rect: box( y ), words: 'x' } );
	const r = run( SKEL(), { '0:': snap( {}, { rect: { x: 0, y: 0, w: 300, h: 200 } } ), '1:': kid( 0, 16 ), '2:': kid( 56, 16 ), '3:': kid( 112, 16 ) } );
	assert.equal( JSON.stringify( find( r.tree, 0 ).attributes.gap ), JSON.stringify( { desktop: '16px' } ), 'the parent holds the 16px gap' );
	assert.equal( find( r.tree, 0, 0 ).attributes.margin, undefined, 'the first child gave its trailing margin up' );
	assert.equal( find( r.tree, 0, 1 ).attributes.margin, undefined );
	assert.ok( find( r.tree, 0, 2 ).attributes.margin, 'the last child\'s trailing margin is not between siblings, so it stays' );
	assert.deepEqual( r.spacing.filter( ( s ) => 1440 === s.width ).map( ( s ) => [ s.owner, s.decisions[ 0 ].value ] ), [ [ 'parent', '16px' ] ] );
} );

test( 'MUST FAIL: one unequal gap leaves the parent gap at 0 and every child keeps its own margin', () => {
	const kid = ( y, mb ) => snap( { 'margin-bottom': `${ mb }px` }, { rect: box( y ), words: 'x' } );
	const r = run( SKEL(), { '0:': snap( { 'row-gap': '16px' }, { rect: { x: 0, y: 0, w: 300, h: 220 } } ), '1:': kid( 0, 16 ), '2:': kid( 56, 40 ), '3:': kid( 136, 0 ) } );
	assert.equal( find( r.tree, 0 ).attributes.gap, undefined, 'a draft gap of 16px is overridden by the rendered, unequal gaps: the parent gap is 0 (the default)' );
	assert.match( JSON.stringify( find( r.tree, 0, 0 ).attributes.margin ), /"bottom":"16px"/ );
	assert.match( JSON.stringify( find( r.tree, 0, 1 ).attributes.margin ), /"bottom":"40px"/ );
} );

test( 'spacing is decided per tier: equal gaps at desktop, unequal on a phone', () => {
	const kidAt = ( ys, mb ) => ( w ) => snap( { 'margin-bottom': `${ mb( w ) }px` }, { rect: box( ys( w ) ), words: 'x' } );
	// 1440: gaps 16, 16. 768 and 375: gaps 16, 40.
	const y1 = ( w ) => ( 1440 === w ? 56 : 56 );
	const y2 = ( w ) => ( 1440 === w ? 112 : 136 );
	const spec = { '0:': snap( {}, { rect: { x: 0, y: 0, w: 300, h: 300 } } ), '1:': kidAt( () => 0, () => 16 ), '2:': kidAt( y1, ( w ) => ( 1440 === w ? 16 : 40 ) ), '3:': kidAt( y2, () => 0 ) };
	const r = run( SKEL(), spec );
	const owners = Object.fromEntries( r.spacing.map( ( s ) => [ s.width, s.owner ] ) );
	assert.deepEqual( [ owners[ 1440 ], owners[ 768 ], owners[ 375 ] ], [ 'parent', 'children', 'children' ] );
	assert.deepEqual( find( r.tree, 0 ).attributes.gap, { desktop: '16px', tablet: '0px' }, 'the parent owns the gap at desktop and zeroes it at tablet, which mobile then shows' );
} );

test( 'zero children and a single child decide no ownership and write no gap', () => {
	const r = run( [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ] } ], { '0:': snap( { 'row-gap': '24px' } ), '1:': snap( {}, { words: 'A' } ) } );
	assert.deepEqual( r.spacing, [] );
	assert.ok( find( r.tree, 0 ).attributes.gap, 'with one child there is no rendered gap to override: the measured gap is written as it is' );
	const none = run( [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [] } ], { '0:': snap( {} ) } );
	assert.deepEqual( none.spacing, [] );
} );

test( 'the divergence ledger: a value entry is written instead of the draft, a rule entry leaves the property alone, both are listed', () => {
	const ledger = [
		{ id: 'D-1', scope: 'fx', node: 'cr-ref-fx-0', state: '*', property: 'font-size', widths: [ 1440 ], expected: { value: '20px' }, reason: 'decided', decided: '2026-10-05 Bean' },
		{ id: 'D-2', scope: 'fx', node: 'cr-ref-fx-0', state: '*', property: 'text-transform', widths: [ 375, 768, 1440 ], expected: { rule: 'bean-choice' }, reason: 'decided', decided: '2026-10-05 Bean' },
	];
	const r = run( [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ], { '0:': snap( { 'font-size': '18px', 'text-transform': 'uppercase' }, { words: 'A' } ) }, { ledger } );
	assert.deepEqual( find( r.tree, 0 ).attributes.fontSize, { desktop: 20, tablet: 18 }, 'desktop takes the decided 20; the entry covers only 1440, so tablet keeps the draft\'s 18' );
	assert.equal( find( r.tree, 0 ).attributes.textTransform, undefined );
	assert.deepEqual( r.held.map( ( h ) => [ h.id, h.prop ] ).sort(), [ [ 'D-1', 'font-size' ], [ 'D-2', 'text-transform' ], [ 'D-2', 'text-transform' ], [ 'D-2', 'text-transform' ] ] );
} );

test( 'UNMAPPED lists a property no setting paints with its value, node and reason; an uncalibrated block and a missing finder are listed too', () => {
	const r = run( [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } }, { name: 'sgs/mystery', draftRef: '.b', attributes: {} }, { name: 'sgs/text', draftRef: '.gone', attributes: {} } ], { '0:': snap( { 'box-shadow': 'rgba(0, 0, 0, 0.2) 0px 4px 8px 0px' }, { words: 'A' } ), '1:': snap( {} ), '2:': undefined } );
	const row = r.unmapped.find( ( u ) => 'box-shadow' === u.property );
	assert.equal( row.node, 'cr-ref-fx-0' );
	assert.equal( row.value, 'rgba(0, 0, 0, 0.2) 0px 4px 8px 0px' );
	assert.match( row.reason, /^no-setting: /);
	assert.ok( r.unmapped.some( ( u ) => 'sgs/mystery' === u.block && /uncalibrated/.test( u.reason ) ) );
	assert.ok( r.unmapped.some( ( u ) => '(element)' === u.property && 'cr-ref-fx-2' === u.node && /resolved no visible element/.test( u.reason ) ) );
} );

test( 'a slot that calibration does not know is one UNMAPPED row, not a row per property', () => {
	const skeleton = [ { name: 'sgs/text', draftRef: '.a', draftSlots: { '.sgs-text__badge': '.badge' }, attributes: { text: 'A' } } ];
	const r = run( skeleton, { '0:': snap( {}, { words: 'A' } ), '0:.sgs-text__badge': snap( { color: 'rgb(255, 0, 0)', 'font-size': '11px' }, { words: 'New' } ) } );
	assert.deepEqual( r.unmapped.filter( ( u ) => '.sgs-text__badge' === u.slot ).map( ( u ) => u.property ), [ '(element)' ] );
} );

test( 'L9.7 fluid: a linear size is a clamp() where calibration lists clamp among the setting\'s forms, per-tier values where it does not', () => {
	const linear = ( w ) => snap( { 'font-size': `${ 10 + w * 0.01 }px` }, { words: 'A' } );
	const spec = { '0:': { at: Object.fromEntries( FIVE.map( ( w ) => [ w, linear ] ) ) } };
	const sk = () => [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ];
	const withClamp = run( sk(), spec, { calFor: calFor( { 'sgs/text': { ...CAL[ 'sgs/text' ], settings: { ...CAL[ 'sgs/text' ].settings, fontSize: setting( 'font-size', { forms: [ 'clamp' ] } ) } } } ) } );
	assert.match( find( withClamp.tree, 0 ).attributes.fontSize.desktop, /^clamp\(/ );
	assert.equal( find( withClamp.tree, 0 ).attributes.fontSize.tablet, undefined );
	assert.equal( withClamp.fluid[ 0 ].written, 'clamp' );
	const without = run( sk(), spec );
	assert.doesNotMatch( JSON.stringify( find( without.tree, 0 ).attributes.fontSize ), /clamp/ );
	assert.deepEqual( Object.keys( find( without.tree, 0 ).attributes.fontSize ).sort(), [ 'desktop', 'mobile', 'tablet' ] );
	assert.equal( without.fluid[ 0 ].written, 'per-tier' );
	assert.match( without.fluid[ 0 ].reason, /accepts no clamp/ );
} );

test( 'a stepped size is not fluid: no fluid entry, ordinary per-tier values, with a narrower tier reset where a wider one would otherwise show', () => {
	const stepped = ( w ) => snap( { 'font-size': w < 768 ? '16px' : w < 1024 ? '20px' : '24px' }, { words: 'A' } );
	const r = run( [ { name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } } ], { '0:': { at: Object.fromEntries( FIVE.map( ( w ) => [ w, stepped ] ) ) } } );
	assert.deepEqual( r.fluid, [] );
	assert.deepEqual( Object.keys( find( r.tree, 0 ).attributes.fontSize ).sort(), [ 'desktop', 'mobile', 'tablet' ], 'mobile equals the default 16px but the tablet 20px would show there, so it is written' );
} );

test( 'L9.6: words, links and presence flow from calibration\'s text, link and presence keys, and a block without them is noted, not failed', () => {
	const calText = { ...CAL[ 'sgs/text' ], presence: { dropCap: { shows: [ '.sgs-text__cap' ], hides: [] } }, text: { text: { path: '', reachedAt: THREE } }, link: { url: { path: '', attr: 'href' } } };
	const sk = [ { name: 'sgs/text', draftRef: '.a', draftSlots: { '.sgs-text__cap': '.cap' }, attributes: {} } ];
	const spec = { '0:': snap( {}, { words: 'Hello there', href: '/shop/' } ), '0:.sgs-text__cap': snap( {}, { words: 'H' } ) };
	const r = run( sk, spec, { calFor: calFor( { 'sgs/text': { ...calText, elements: { '': tiers( DEFAULT ), '.sgs-text__cap': tiers( DEFAULT ) } } } ) } );
	assert.equal( find( r.tree, 0 ).attributes.text, 'Hello there' );
	assert.equal( find( r.tree, 0 ).attributes.url, '/shop/' );
	assert.equal( find( r.tree, 0 ).attributes.dropCap, true, 'the draft shows the cap element, so the setting that shows it is on' );
	const bare = run( sk, { '0:': snap( {}, { words: 'Hello' } ), '0:.sgs-text__cap': snap( {}, { words: 'H' } ) }, { calFor: calFor( { 'sgs/text': { ...CAL[ 'sgs/text' ], elements: { '': tiers( DEFAULT ), '.sgs-text__cap': tiers( DEFAULT ) } } } ) } );
	assert.ok( bare.notes.some( ( n ) => /sgs\/text: calibration has no presence, text, link key/.test( n ) ) );
	assert.deepEqual( bare.unmapped.filter( ( u ) => [ 'text', 'link', 'presence' ].includes( u.property ) ), [], 'nothing is judged without the keys' );
} );

test( 'L9.5 handover: a skeleton\'s declared outside-the-tree content becomes a handover entry with its owner and evidence, and replaces the UNMAPPED row', () => {
	const calText = { ...CAL[ 'sgs/text' ], text: { other: { path: '.sgs-text__x', reachedAt: THREE } } };
	const sk = [ { name: 'sgs/text', draftRef: '.a', attributes: {}, handover: [ { owner: 'site-info', kind: 'text', detail: 'the address lives in Site Info' } ] } ];
	const r = run( sk, { '0:': snap( {}, { words: '644 Washwood Heath Rd' } ) }, { calFor: calFor( { 'sgs/text': calText } ) } );
	assert.equal( r.handover.length, 1 );
	assert.deepEqual( [ r.handover[ 0 ].owner, r.handover[ 0 ].kind, r.handover[ 0 ].node, r.handover[ 0 ].evidence.draft ], [ 'site-info', 'text', 'cr-ref-fx-0', '644 Washwood Heath Rd' ] );
	assert.deepEqual( r.unmapped.filter( ( u ) => 'text' === u.property ), [], 'the declared handover replaces the unmapped text row' );
	const undeclared = run( [ { name: 'sgs/text', draftRef: '.a', attributes: {} } ], { '0:': snap( {}, { words: '644 Washwood Heath Rd' } ) }, { calFor: calFor( { 'sgs/text': calText } ) } );
	assert.equal( undeclared.handover.length, 0 );
	assert.equal( undeclared.unmapped.filter( ( u ) => 'text' === u.property ).length, 1, 'an undeclared one is framework work, not handover' );
} );

test( 'a used width is written only as the draft declares it, and a node with no draftRef is passed through to its children', () => {
	const sk = [ { name: 'sgs/container', attributes: {}, innerBlocks: [ { name: 'sgs/text', draftRef: '.a', attributes: {} } ] } ];
	const r = run( sk, { '1:': snap( { color: 'rgb(20, 20, 20)', width: '300px' }, { words: 'A' } ) }, { declared: Object.fromEntries( THREE.map( ( w ) => [ w, { '1:': {} } ] ) ) } );
	assert.deepEqual( r.writes, [], 'no declared width, so the used 300px is not written' );
	assert.deepEqual( r.unmapped, [] );
} );

// The theme the pages inherit from (lib/fill-page.mjs): body text and colour, and a heading element style.
const RAW = {
	settings: { color: { palette: [ { slug: 'text', color: '#141414' } ] }, typography: { fontFamilies: [ { slug: 'body', fontFamily: 'Outfit, system-ui, sans-serif' }, { slug: 'heading', fontFamily: '"Playfair Display", serif' } ], fontSizes: [ { slug: 'regular', size: '16px' } ] } },
	styles: { typography: { fontFamily: 'var:preset|font-family|body', fontSize: 'var:preset|font-size|regular', lineHeight: '1.5', fontWeight: '400' }, color: { text: 'var:preset|color|text' }, elements: { heading: { typography: { fontFamily: 'var:preset|font-family|heading', fontWeight: '500' } } } },
};

test( 'R-47-5 at the top of a surface: the page baseline is the theme, so the theme\'s own text colour and a heading\'s theme family are not repeated', () => {
	const sk = () => [ { name: 'sgs/text', draftRef: '.a', attributes: {} } ];
	const spec = { '0:': snap( { color: 'rgb(20, 20, 20)', 'font-family': 'Outfit, system-ui, sans-serif' }, { words: 'A' } ) };
	assert.equal( find( run( sk(), spec, { rawSnapshot: RAW } ).tree, 0 ).attributes.textColour, undefined, 'the theme\'s text colour is what the page shows' );
	// Calibration records no default for an inherited property; without a theme to compare there is no baseline, so the colour is written.
	const noDefault = { 'sgs/text': { ...CAL[ 'sgs/text' ], elements: { '': tiers( Object.fromEntries( Object.entries( DEFAULT ).filter( ( [ k ] ) => ! [ 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform' ].includes( k ) ) ) ) } } };
	assert.equal( find( run( sk(), spec, { calFor: calFor( noDefault ) } ).tree, 0 ).attributes.textColour, '#141414', 'control: with no theme and no calibrated default the colour is written' );
	assert.equal( find( run( sk(), { '0:': snap( { color: 'rgb(255, 0, 0)' }, { words: 'A' } ) }, { rawSnapshot: RAW } ).tree, 0 ).attributes.textColour, '#FF0000', 'a colour that is not the one the theme gives is written' );
	const h = ( family ) => run( [ { name: 'sgs/heading', draftRef: 'h1', attributes: { level: 'h1' } } ], { '0:': snap( { 'font-family': family, 'font-weight': '500' } ) }, { rawSnapshot: RAW, calFor: calFor( { 'sgs/heading': { ...CAL[ 'sgs/heading' ], settings: { ...CAL[ 'sgs/heading' ].settings, fontFamily: setting( 'font-family' ), fontWeight: setting( 'font-weight' ) } } } ) } );
	assert.deepEqual( h( '"Playfair Display", serif' ).writes, [], 'the theme gives h1 its heading family and weight 500' );
	assert.equal( find( h( 'Outfit, system-ui, sans-serif' ).tree, 0 ).attributes.fontFamily, 'Outfit, system-ui, sans-serif', 'a heading set in another family is written' );
} );

test( 'a line height is inherited as a ratio: a child with another font size and the same ratio repeats nothing', () => {
	const sk = [ { name: 'sgs/container', draftRef: 'main', attributes: {}, innerBlocks: [ { name: 'sgs/text', draftRef: '.a', attributes: {} }, { name: 'sgs/text', draftRef: '.b', attributes: {} } ] } ];
	const r = run( sk, { '0:': snap( { 'font-size': '16px', 'line-height': '24px' } ), '1:': snap( { 'font-size': '12px', 'line-height': '18px' }, { words: 'A' } ), '2:': snap( { 'font-size': '12px', 'line-height': '20px' }, { words: 'B' } ) }, { rawSnapshot: RAW } );
	assert.equal( find( r.tree, 0, 0 ).attributes.lineHeight, undefined, '18px at 12px is the parent\'s 1.5' );
	assert.ok( find( r.tree, 0, 1 ).attributes.lineHeight, '20px at 12px is not' );
} );

test( 'an auto side margin the draft centres with is a used size, never written; a real margin beside it is', () => {
	const declared = { 1440: { '0:': { 'margin-left': 'auto', 'margin-right': 'auto' } }, 768: { '0:': {} }, 375: { '0:': {} } };
	const at = { 375: snap( { 'margin-top': '8px' } ), 768: snap( { 'margin-top': '8px' } ), 1024: snap( {} ), 1440: snap( { 'margin-left': '170px', 'margin-right': '170px', 'margin-top': '8px' } ), 1920: snap( {} ) };
	const r = run( [ { name: 'sgs/container', draftRef: 'main', attributes: {} } ], { '0:': { at } }, { declared } );
	const m = find( r.tree, 0 ).attributes.margin;
	assert.ok( m, 'the 8px top margin is written' );
	assert.ok( ! JSON.stringify( m ).includes( '170' ), 'the centring margins are not' );
} );

test( 'the ledger: a value entry for a hover-capable property is not applied to the rest state and is listed as such; a plain property is', () => {
	const ledger = [
		{ id: 'D-1', scope: 'fx', node: 'cr-ref-fx-0', state: 'opening', property: 'transform', widths: [ 1440 ], expected: { value: 'matrix(1, 0, 0, 1, 0, -3)' }, reason: 'hover lift', decided: '2026-10-05 Bean' },
		{ id: 'D-2', scope: 'fx', node: 'cr-ref-fx-0', state: 'opening', property: 'font-size', widths: [ 1440 ], expected: { value: '20px' }, reason: 'decided', decided: '2026-10-05 Bean' },
	];
	const r = run( [ { name: 'sgs/text', draftRef: '.a', attributes: {} } ], { '0:': snap( { 'font-size': '18px' }, { words: 'A' } ) }, { ledger, ledgerStates: [ 'opening' ] } );
	assert.deepEqual( r.held.map( ( h ) => [ h.id, h.prop, h.applied ] ), [ [ 'D-2', 'font-size', true ] ], 'transform is not read as a draft value here, so only the font-size entry is consulted' );
	const withT = run( [ { name: 'sgs/text', draftRef: '.a', attributes: {} } ], { '0:': snap( { transform: 'matrix(1, 0, 0, 1, 0, 5)' }, { words: 'A' } ) }, { ledger, ledgerStates: [ 'opening' ] } );
	assert.deepEqual( withT.held.map( ( h ) => [ h.id, h.prop, h.applied ] ).sort(), [ [ 'D-1', 'transform', false ], [ 'D-2', 'font-size', true ] ], 'the font-size decision covers the node whatever the draft shows; the hover-capable transform one is not applied' );
	assert.ok( withT.unmapped.some( ( u ) => 'transform' === u.property && u.value.includes( '5)' ) ), 'the draft\'s own rest value is the one that goes through, not the hover lift' );
} );

test( 'a block\'s layout mode is read from the element that lays out its children: a wrapper around a grid is a grid, through the calibrated layout setting', () => {
	const calC = { ...CAL[ 'sgs/container' ], discovered: { layout: { display: { slots: [ '' ], values: { grid: { 375: 'grid', 768: 'grid', 1440: 'grid' }, flex: { 375: 'flex', 768: 'flex', 1440: 'flex' } } } } } };
	const wrapper = { ...snap( { display: 'block' } ), layoutDisplay: 'grid' };
	const r = run( [ { name: 'sgs/container', draftRef: 'main', attributes: {} } ], { '0:': wrapper }, { calFor: calFor( { 'sgs/container': calC } ) } );
	assert.equal( find( r.tree, 0 ).attributes.layout, 'grid' );
	const plain = run( [ { name: 'sgs/container', draftRef: 'main', attributes: {} } ], { '0:': snap( { display: 'block' } ) }, { calFor: calFor( { 'sgs/container': calC } ) } );
	assert.equal( find( plain.tree, 0 ).attributes.layout, undefined, 'a plain block writes no layout' );
} );

test( 'a computed leftover that paints nothing (an outline with no style, a border colour with no width) raises no UNMAPPED row', () => {
	const r = run( [ { name: 'sgs/text', draftRef: '.a', attributes: {} } ], { '0:': snap( { 'outline-style': 'none', 'outline-width': '0px', 'outline-color': 'rgb(111, 97, 82)', 'border-top-width': '0px', 'border-top-color': 'rgb(111, 97, 82)', 'text-decoration-line': 'none', 'text-decoration-color': 'rgb(1, 2, 3)' }, { words: 'A' } ) } );
	assert.deepEqual( r.unmapped.filter( ( u ) => [ 'outline-color', 'border-top-color', 'text-decoration-color' ].includes( u.property ) ), [] );
	const painted = run( [ { name: 'sgs/text', draftRef: '.a', attributes: {} } ], { '0:': snap( { 'border-top-width': '2px', 'border-top-color': 'rgb(111, 97, 82)' }, { words: 'A' } ) } );
	assert.ok( painted.unmapped.some( ( u ) => 'border-top-color' === u.property ) || painted.writes.some( ( w ) => /border/i.test( w.attr ) ), 'a painted border is judged' );
} );

test( 'valueText shows one value when the widths agree and the map when they do not', () => {
	assert.equal( valueText( { 375: '1px', 768: '1px' } ), '1px' );
	assert.equal( valueText( { 375: '1px', 768: '2px' } ), '{"375":"1px","768":"2px"}' );
} );
