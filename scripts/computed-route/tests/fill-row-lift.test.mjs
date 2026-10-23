// Proves the Site Info row lift (2026-10-09 skeleton-writer test, REPORT.md §3): the footer's social links are one
// shared look, so Fill reads each generated icon's draft link as the row's shape element and the glyph inside it as the
// row's glyph element, and writes the row's childIcon* settings once, only when every copy agrees. The generated icons
// carry none of those values, and the 40px link box never becomes an 18px glyph's iconSize.
import test from 'node:test';
import assert from 'node:assert/strict';
import { expandSiteInfoRows, skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { openDb } from '../lib/db.mjs';

const WIDTHS = [ 375, 768, 1024, 1440, 1920 ];
// The row calibration's element paths (cache/social-icons.json, calibrated 2026-10-10 on local-eye-care).
const SHAPE = '.sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape';
const GLYPH = `${ SHAPE } > .sgs-icon__svg`;
const REST = { display: 'flex', 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-width': '0px', 'border-right-width': '0px', 'border-bottom-width': '0px', 'border-left-width': '0px', 'border-top-style': 'none', 'border-right-style': 'none', 'border-bottom-style': 'none', 'border-left-style': 'none', 'border-top-color': 'rgb(20, 20, 20)', 'border-right-color': 'rgb(20, 20, 20)', 'border-bottom-color': 'rgb(20, 20, 20)', 'border-left-color': 'rgb(20, 20, 20)', 'transition-duration': '0s', width: '32px', 'box-shadow': 'none' };
const paint = ( styles ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, styles ] ) );
const at = ( slot, property, forms = [] ) => ( { slot, slots: [ slot ], property, state: null, forms, transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0, 1 ] } );
const ROW_CAL = {
	block: 'sgs/social-icons',
	elements: { '': paint( { display: 'flex', gap: '20px' } ), [ SHAPE ]: paint( REST ), [ GLYPH ]: paint( { width: '32px' } ) },
	settings: {
		childIconBackground: at( SHAPE, 'background-color', [ 'hex', 'slug' ] ),
		childIconBorderColour: at( SHAPE, 'border-color', [ 'hex', 'slug' ] ),
		childIconBorderWidth: at( SHAPE, 'border-width' ),
		childIconBorderStyle: at( SHAPE, 'border-style' ),
		childIconShapeSize: at( SHAPE, 'width' ),
		childIconSize: at( GLYPH, 'width' ),
	},
	discovered: {},
};
// sgs/icon's own calibration: iconSize on the glyph, the shape settings on the shape (the 2026-10-10 recalibration).
const ICON_CAL = { block: 'sgs/icon', elements: { '': paint( REST ), '.sgs-icon__shape': paint( REST ), '.sgs-icon__shape > .sgs-icon__svg': paint( { width: '32px' } ) }, settings: { iconSize: at( '.sgs-icon__shape > .sgs-icon__svg', 'width' ), backgroundColour: at( '.sgs-icon__shape', 'background-color', [ 'hex' ] ) }, discovered: {}, link: { linkUrl: { path: '', attr: 'href' } } };

// The footer row: three brand links, each a 40px white circle with a 1px warm-grey border, holding an 18px glyph.
const LINK = { ...REST, 'background-color': 'rgb(255, 255, 255)', 'border-top-width': '1px', 'border-right-width': '1px', 'border-bottom-width': '1px', 'border-left-width': '1px', 'border-top-style': 'solid', 'border-right-style': 'solid', 'border-bottom-style': 'solid', 'border-left-style': 'solid', 'border-top-color': 'rgb(230, 225, 218)', 'border-right-color': 'rgb(230, 225, 218)', 'border-bottom-color': 'rgb(230, 225, 218)', 'border-left-color': 'rgb(230, 225, 218)', 'transition-duration': '0.25s', width: '40px' };
const snap = ( styles, w, h ) => ( { styles, pseudo: {}, rect: { x: 0, y: 0, w, h: h ?? w }, inFlow: true, words: '', href: null } );

function run( { linkOf = () => LINK, glyphOf = () => '18px', iconCal = ICON_CAL, rowCal = ROW_CAL, heightOf = () => undefined } = {} ) {
	const skeleton = expandSiteInfoRows( [ { name: 'sgs/social-icons', attributes: {}, draftRef: '.row', siteInfoRow: [ 'instagram', 'google', 'whatsapp' ], childRefs: { instagram: 'a.ig', google: 'a.gg', whatsapp: 'a.wa' } } ] );
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'footer' );
	const glyphTarget = ( i ) => nodes[ i ].targets.find( ( t ) => '' !== t.slot );
	const byWidth = ( w ) => ( {
		'0:': snap( { display: 'flex', gap: '10px' }, 300 ),
		...Object.fromEntries( [ 1, 2, 3 ].flatMap( ( i ) => [ [ `${ i }:`, snap( linkOf( i, w ), 40, heightOf( i ) ) ], [ glyphTarget( i ).id, snap( { width: glyphOf( i, w ) }, 18 ) ] ] ) ),
	} );
	const declared = Object.fromEntries( WIDTHS.map( ( w ) => [ w, Object.fromEntries( [ 1, 2, 3 ].flatMap( ( i ) => [ [ `${ i }:`, { width: '40px' } ], [ glyphTarget( i ).id, { width: glyphOf( i, w ) } ] ] ) ) ] ) );
	const reads = { widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, byWidth( w ) ] ) ), declared, sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db: openDb(), snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: ( b ) => ( 'sgs/icon' === b ? iconCal : rowCal ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, out, nodes };
}

const ROW_ATTRS = [ 'childIconBackground', 'childIconBorderColour', 'childIconBorderWidth', 'childIconBorderStyle', 'childIconShapeSize', 'childIconSize' ];
const CHILD_STYLE = [ 'iconSize', 'shapeSize', 'backgroundColour', 'borderColour', 'borderWidth', 'borderStyle' ];

test( 'expandSiteInfoRows names each generated icon\'s glyph inside its draft link', () => {
	const { nodes } = run();
	assert.deepEqual( nodes[ 1 ].targets.map( ( t ) => [ t.slot, t.finder ] ), [ [ '', '.row a.ig' ], [ '.sgs-icon__shape > .sgs-icon__svg', 'svg' ] ] );
} );

test( 'MUST FAIL: the footer row takes the shared look once, and the icons carry none of it', () => {
	const { tree, out } = run();
	const row = tree[ 0 ].attributes;
	for ( const a of ROW_ATTRS ) {
		assert.ok( undefined !== row[ a ], `${ a } is written on the row` );
	}
	// One value at every width is written at desktop; tablet and mobile inherit it (the tier cascade).
	assert.deepEqual( row.childIconShapeSize, { desktop: { width: '40px' } } );
	assert.deepEqual( row.childIconSize, { desktop: '18px' } );
	assert.equal( out.writes.filter( ( w ) => ROW_ATTRS.includes( w.attr ) ).length, ROW_ATTRS.length, 'each row setting is written once, not once per icon' );
	for ( const icon of tree[ 0 ].innerBlocks ) {
		for ( const a of CHILD_STYLE ) {
			assert.equal( icon.attributes[ a ], undefined, `${ a } is not on the icon` );
		}
	}
	const iconRows = out.unmapped.filter( ( u ) => 'sgs/icon' === u.block && ! [ '(content)', 'display', 'transition-duration' ].includes( u.property ) );
	assert.deepEqual( iconRows, [], 'no UNMAPPED icon rows for settings the row holds' );
} );

test( 'MUST FAIL: copies that disagree keep their own value on each icon, never averaged and never raised while the icon has the setting', () => {
	const colour = { 1: 'rgb(10, 102, 194)', 2: 'rgb(24, 119, 242)', 3: 'rgb(255, 255, 255)' };
	const { tree, out } = run( { linkOf: ( i ) => ( { ...LINK, 'background-color': colour[ i ] } ) } );
	assert.equal( tree[ 0 ].attributes.childIconBackground, undefined, 'the row holds no background' );
	assert.deepEqual( tree[ 0 ].innerBlocks.map( ( c ) => c.attributes.backgroundColour ), [ '#0A66C2', '#1877F2', '#FFFFFF' ] );
	assert.ok( undefined !== tree[ 0 ].attributes.childIconBorderColour, 'the settings every copy agrees on are still written on the row' );
	assert.equal( out.unmapped.filter( ( u ) => 'background-color' === u.property ).length, 0 );
} );

test( "MUST FAIL: one icon that differs takes its own value and the other two take the agreed value of the row", () => {
	const { tree } = run( { glyphOf: ( i ) => ( 2 === i ? '15px' : '18px' ) } );
	assert.equal( tree[ 0 ].attributes.childIconSize, undefined );
	assert.deepEqual( tree[ 0 ].innerBlocks.map( ( c ) => c.attributes.iconSize ), [ { desktop: '18px' }, { desktop: '15px' }, { desktop: '18px' } ] );
} );

test( 'MUST FAIL: a per-tier disagreement is a disagreement, held on each icon with its tiers', () => {
	const { tree } = run( { glyphOf: ( i, w ) => ( 2 === i && 375 === w ? '12px' : '18px' ) } );
	assert.equal( tree[ 0 ].attributes.childIconSize, undefined );
	assert.deepEqual( tree[ 0 ].innerBlocks[ 1 ].attributes.iconSize, { desktop: '18px', mobile: '12px' } );
} );

test( 'MUST FAIL: an icon with no setting for the differing value is raised by block and property, not dropped', () => {
	const noBg = { ...ICON_CAL, settings: { iconSize: ICON_CAL.settings.iconSize } };
	const { tree, out } = run( { iconCal: noBg, linkOf: ( i ) => ( { ...LINK, 'background-color': 1 === i ? 'rgb(10, 102, 194)' : LINK[ 'background-color' ] } ) } );
	assert.equal( tree[ 0 ].innerBlocks[ 0 ].attributes.backgroundColour, undefined );
	assert.ok( out.unmapped.some( ( u ) => 'sgs/icon' === u.block && 'background-color' === u.property ), 'raised on sgs/icon' );
} );

test( "MUST FAIL: a square box with 50% corners on every icon is the shape setting circle of the row, not a radius row", () => {
	const round = { ...LINK, 'border-top-left-radius': '50%', 'border-top-right-radius': '50%', 'border-bottom-right-radius': '50%', 'border-bottom-left-radius': '50%' };
	const { tree, out } = run( { linkOf: () => round } );
	assert.equal( tree[ 0 ].attributes.childIconShape, 'circle' );
	assert.ok( ! out.unmapped.some( ( u ) => /radius/.test( u.property ) ), 'no radius row' );
	const oval = run( { linkOf: () => round, heightOf: () => undefined } );
	assert.equal( oval.tree[ 0 ].attributes.childIconShape, 'circle' );
} );

test( 'MUST FAIL: a box that is not square keeps the radius as a value, not circle', () => {
	const round = { ...LINK, 'border-top-left-radius': '50%', 'border-top-right-radius': '50%', 'border-bottom-right-radius': '50%', 'border-bottom-left-radius': '50%' };
	const { tree } = run( { linkOf: () => round, heightOf: ( i ) => ( 2 === i ? 60 : undefined ) } );
	assert.notEqual( tree[ 0 ].attributes.childIconShape, 'circle' );
} );

test( 'MUST FAIL: settings of one element calibrated at different slots are each read where they sit', () => {
	const split = { ...ROW_CAL, settings: { ...ROW_CAL.settings, childIconShapeSize: at( '.sgs-icon:nth-of-type(1)', 'width' ) } };
	const { tree } = run( { rowCal: split } );
	assert.deepEqual( tree[ 0 ].attributes.childIconShapeSize, { desktop: { width: '40px' } } );
	assert.ok( undefined !== tree[ 0 ].attributes.childIconBackground, 'the colour sitting one element deeper is written too' );
} );


test( 'MUST FAIL: a draft element is never read at a pseudo-element slot, and a row is raised once however many slots read it', () => {
	// The icon's gradient border is calibrated on its shape's ::before (as the real sgs/icon cache has it); the icons
	// disagree on their background, so each is read against the icon's own calibration.
	// A second shape setting calibrated on the icon root makes the shape read at two elements: its rows are raised once.
	const iconCal = { ...ICON_CAL, settings: { ...ICON_CAL.settings, borderColourGradient: at( '.sgs-icon__shape::before', 'border-color-gradient' ), borderRadius: at( '', 'border-radius' ) } };
	const colour = { 1: 'rgb(10, 102, 194)', 2: 'rgb(24, 119, 242)', 3: 'rgb(255, 255, 255)' };
	const { out } = run( { iconCal, linkOf: ( i ) => ( { ...LINK, 'background-color': colour[ i ] } ) } );
	const pseudo = out.unmapped.filter( ( u ) => /::(before|after)$/.test( u.slot || '' ) );
	assert.deepEqual( pseudo, [], 'no row is read against a ::before or ::after slot' );
	const keys = out.unmapped.map( ( u ) => `${ u.node }|${ u.property }|${ u.state || '' }|${ u.value }` );
	assert.equal( new Set( keys ).size, keys.length, 'each row once' );
} );
