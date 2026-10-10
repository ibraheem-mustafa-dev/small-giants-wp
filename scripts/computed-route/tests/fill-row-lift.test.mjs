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
		childIconTransitionDuration: at( SHAPE, 'transition-duration' ),
		childIconShapeSize: at( SHAPE, 'width' ),
		childIconSize: at( GLYPH, 'width' ),
	},
	discovered: {},
};
// sgs/icon's own calibration: iconSize on the glyph, the shape settings on the shape (the 2026-10-10 recalibration).
const ICON_CAL = { block: 'sgs/icon', elements: { '': paint( REST ), '.sgs-icon__shape': paint( REST ), '.sgs-icon__shape > .sgs-icon__svg': paint( { width: '32px' } ) }, settings: { iconSize: at( '.sgs-icon__shape > .sgs-icon__svg', 'width' ), backgroundColour: at( '.sgs-icon__shape', 'background-color', [ 'hex' ] ) }, discovered: {}, link: { linkUrl: { path: '', attr: 'href' } } };

// The footer row: three brand links, each a 40px white circle with a 1px warm-grey border, holding an 18px glyph.
const LINK = { ...REST, 'background-color': 'rgb(255, 255, 255)', 'border-top-width': '1px', 'border-right-width': '1px', 'border-bottom-width': '1px', 'border-left-width': '1px', 'border-top-style': 'solid', 'border-right-style': 'solid', 'border-bottom-style': 'solid', 'border-left-style': 'solid', 'border-top-color': 'rgb(230, 225, 218)', 'border-right-color': 'rgb(230, 225, 218)', 'border-bottom-color': 'rgb(230, 225, 218)', 'border-left-color': 'rgb(230, 225, 218)', 'transition-duration': '0.25s', width: '40px' };
const snap = ( styles, w ) => ( { styles, pseudo: {}, rect: { x: 0, y: 0, w, h: w }, inFlow: true, words: '', href: null } );

function run( { linkOf = () => LINK } = {} ) {
	const skeleton = expandSiteInfoRows( [ { name: 'sgs/social-icons', attributes: {}, draftRef: '.row', siteInfoRow: [ 'instagram', 'google', 'whatsapp' ], childRefs: { instagram: 'a.ig', google: 'a.gg', whatsapp: 'a.wa' } } ] );
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'footer' );
	const glyphTarget = ( i ) => nodes[ i ].targets.find( ( t ) => '' !== t.slot );
	const byWidth = ( w ) => ( {
		'0:': snap( { display: 'flex', gap: '10px' }, 300 ),
		...Object.fromEntries( [ 1, 2, 3 ].flatMap( ( i ) => [ [ `${ i }:`, snap( linkOf( i ), 40 ) ], [ glyphTarget( i ).id, snap( { width: '18px' }, 18 ) ] ] ) ),
	} );
	const declared = Object.fromEntries( WIDTHS.map( ( w ) => [ w, Object.fromEntries( [ 1, 2, 3 ].flatMap( ( i ) => [ [ `${ i }:`, { width: '40px' } ], [ glyphTarget( i ).id, { width: '18px' } ] ] ) ) ] ) );
	const reads = { widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, byWidth( w ) ] ) ), declared, sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db: openDb(), snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: ( b ) => ( 'sgs/icon' === b ? ICON_CAL : ROW_CAL ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, out, nodes };
}

const ROW_ATTRS = [ 'childIconBackground', 'childIconBorderColour', 'childIconBorderWidth', 'childIconBorderStyle', 'childIconTransitionDuration', 'childIconShapeSize', 'childIconSize' ];
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
	const iconRows = out.unmapped.filter( ( u ) => 'sgs/icon' === u.block && ! [ '(content)', 'display' ].includes( u.property ) );
	assert.deepEqual( iconRows, [], 'no UNMAPPED icon rows for settings the row holds' );
} );

test( 'negative control: copies that disagree are reported on the row, never averaged', () => {
	const { tree, out } = run( { linkOf: ( i ) => ( 2 === i ? { ...LINK, 'background-color': 'rgb(37, 211, 102)' } : LINK ) } );
	assert.equal( tree[ 0 ].attributes.childIconBackground, undefined );
	const row = out.unmapped.find( ( u ) => 'sgs/social-icons' === u.block && 'background-color' === u.property );
	assert.ok( row, 'the disagreement is an UNMAPPED row' );
	assert.match( row.reason, /^disagree:/ );
	assert.ok( undefined !== tree[ 0 ].attributes.childIconBorderColour, 'the settings every copy agrees on are still written' );
} );
