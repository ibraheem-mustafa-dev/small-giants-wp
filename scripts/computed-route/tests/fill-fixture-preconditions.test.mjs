// Proves Fill reads a calibration fixture's styling preconditions (Spec 47 §3.4, Bean's ruling 2026-10-10): the
// sgs/social-icons fixture switches the icon background on and sets a 1px border so those settings can be measured, so
// the calibrated rest paint shows a 1px solid border and a blue background the block's real defaults do not have. On
// the Eye Care footer row Fill must still write the border width, the border style and the background switch.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { expandSiteInfoRows, skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { openDb } from '../lib/db.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { fixturePreconditions } from '../lib/fill-fixture.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURES = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'calibration-fixtures.json' ), 'utf8' ) );
const WIDTHS = [ 375, 768, 1024, 1440, 1920 ];
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const sides = ( part, v ) => Object.fromEntries( SIDES.map( ( s ) => [ `border-${ s }-${ part }`, v ] ) );
// The row calibration's element paths and its real rest paint (cache/social-icons.json, calibrated 2026-10-10 on
// local-eye-care): the fixture's 1px solid border and its brand-blue background.
const SHAPE = '.sgs-icon:nth-of-type(1) > .sgs-icon__link > .sgs-icon__shape';
const GLYPH = `${ SHAPE } > .sgs-icon__svg`;
const REST = { display: 'flex', 'background-color': 'rgb(24, 119, 242)', ...sides( 'width', '1px' ), ...sides( 'style', 'solid' ), ...sides( 'color', 'rgb(20, 20, 20)' ), 'transition-duration': '0s', width: '48px', 'box-shadow': 'none' };
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
const ICON_CAL = { block: 'sgs/icon', elements: { '': paint( REST ), '.sgs-icon__shape': paint( REST ), '.sgs-icon__shape > .sgs-icon__svg': paint( { width: '32px' } ) }, settings: { iconSize: at( '.sgs-icon__shape > .sgs-icon__svg', 'width' ) }, discovered: {}, link: { linkUrl: { path: '', attr: 'href' } } };

// The footer row's links: 40px white circles with a 1px solid warm-grey border.
const LINK = { ...REST, 'background-color': 'rgb(255, 255, 255)', ...sides( 'color', 'rgb(230, 225, 218)' ), 'transition-duration': '0.25s', width: '40px' };
const BARE = { ...LINK, ...sides( 'width', '0px' ), ...sides( 'style', 'none' ) };
const snap = ( styles, w ) => ( { styles, pseudo: {}, rect: { x: 0, y: 0, w, h: w }, inFlow: true, words: '', href: null } );

function run( { link = LINK, fixtures = FIXTURES } = {} ) {
	const skeleton = expandSiteInfoRows( [ { name: 'sgs/social-icons', attributes: {}, draftRef: '.row', siteInfoRow: [ 'instagram', 'google', 'whatsapp' ], childRefs: { instagram: 'a.ig', google: 'a.gg', whatsapp: 'a.wa' } } ] );
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'footer' );
	const glyphTarget = ( i ) => nodes[ i ].targets.find( ( t ) => '' !== t.slot );
	const byWidth = () => ( {
		'0:': snap( { display: 'flex', gap: '10px' }, 300 ),
		...Object.fromEntries( [ 1, 2, 3 ].flatMap( ( i ) => [ [ `${ i }:`, snap( link, 40 ) ], [ glyphTarget( i ).id, snap( { width: '18px' }, 18 ) ] ] ) ),
	} );
	const declared = Object.fromEntries( WIDTHS.map( ( w ) => [ w, Object.fromEntries( [ 1, 2, 3 ].flatMap( ( i ) => [ [ `${ i }:`, { width: '40px' } ], [ glyphTarget( i ).id, { width: '18px' } ] ] ) ) ] ) );
	const reads = { widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, byWidth() ] ) ), declared, sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db: openDb(), snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: ( b ) => ( 'sgs/icon' === b ? ICON_CAL : ROW_CAL ), fixtures, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { row: tree[ 0 ].attributes, out };
}

test( 'MUST FAIL: the footer row keeps the border and background the fixture switched on in calibration', () => {
	const { row } = run();
	assert.match( JSON.stringify( row.childIconBorderWidth ?? null ), /1px/, 'childIconBorderWidth holds the draft\'s 1px' );
	assert.match( JSON.stringify( row.childIconBorderStyle ?? null ), /solid/, 'childIconBorderStyle holds solid' );
	assert.equal( row.childIconShowBackground, true, 'the background switch is written with the background colour' );
	assert.ok( undefined !== row.childIconBackground, 'the background colour is still written' );
} );

test( 'negative control: a row whose draft shows no border writes no border settings', () => {
	const { row } = run( { link: BARE } );
	assert.equal( row.childIconBorderWidth, undefined );
	assert.equal( row.childIconBorderStyle, undefined );
} );

test( 'the social-icons fixture\'s preconditions are its two styling settings, never its scaffolding', () => {
	const pre = fixturePreconditions( 'sgs/social-icons', FIXTURES, blockSchema( 'sgs/social-icons' ), openDb() );
	assert.deepEqual( Object.keys( pre ).sort(), [ 'childIconBorderWidth', 'childIconShowBackground' ] );
} );

test( 'negative control: a fixture that sets only words and a level has no preconditions', () => {
	assert.deepEqual( fixturePreconditions( 'sgs/heading', FIXTURES, blockSchema( 'sgs/heading' ), openDb() ), {} );
} );
