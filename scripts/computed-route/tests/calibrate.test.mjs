// Proves FR-47-2's state rule (§3.2): a setting with a css_state is calibrated only through a known trigger; a state
// with none is reported, never calibrated as if it were rest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { triggerFor, STATE_TRIGGERS } from '../lib/calibrate.mjs';

test( 'each setting state the database uses has its trigger', () => {
	assert.equal( triggerFor( null ), null );
	assert.equal( triggerFor( 'hover' ), 'hover' );
	assert.equal( triggerFor( 'scrolled' ), 'scroll' );
	assert.equal( triggerFor( 'open' ), 'fixture' );
	assert.equal( triggerFor( 'current' ), 'fixture' );
} );

test( 'MUST FAIL TO CALIBRATE: a state with no trigger is undefined, never rest', () => {
	assert.equal( triggerFor( 'focus' ), undefined );
	assert.equal( triggerFor( 'shrunk' ), undefined );
	assert.ok( ! Object.hasOwn( STATE_TRIGGERS, 'focus' ) );
} );

// The deploy key (§3.2): webpack's module number depends on the build folder, so two builds of one commit must hash
// alike, while any real change to the bundle must not.
import { normaliseBundle } from '../calibrate.mjs';

const bundle = ( id, attr ) => `var e={${ id }(){const e="${ attr }";}},t={};function r(n){return e[n]()}r(${ id }),document.x;`;

test( 'two builds of one commit (module 2310 and 6469) normalise to the same text', () => {
	assert.equal( normaliseBundle( './view.js', bundle( 2310, 'data-a' ) ), normaliseBundle( './view.js', bundle( 6469, 'data-a' ) ) );
	assert.equal( normaliseBundle( './view.asset.php', "<?php return array('dependencies' => array(), 'version' => 'abc');" ), normaliseBundle( './view.asset.php', "<?php return array('dependencies' => array(), 'version' => 'def');" ) );
} );

test( 'MUST FAIL TO MATCH: a real code change still differs after normalising', () => {
	assert.notEqual( normaliseBundle( './view.js', bundle( 2310, 'data-a' ) ), normaliseBundle( './view.js', bundle( 6469, 'data-b' ) ) );
	assert.notEqual( normaliseBundle( './view.asset.php', "array('dependencies' => array('a'), 'version' => 'x')" ), normaliseBundle( './view.asset.php', "array('dependencies' => array('b'), 'version' => 'x')" ) );
} );

// One library-wide cache (§3.2): a block calibrated on one site is never replaced by a run on another site unless the
// run asks for it.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { skipReason, cachedSite } from '../lib/cache.mjs';

const cacheFile = ( site ) => {
	const f = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'cr-cache-' ) ), 'heading.json' );
	fs.writeFileSync( f, JSON.stringify( { block: 'sgs/heading', site } ) );
	return f;
};

test( 'a block with no file, or a file from the same site, may be written', () => {
	assert.equal( skipReason( path.join( os.tmpdir(), 'cr-cache-none', 'heading.json' ), 'sandybrown' ), null );
	assert.equal( skipReason( cacheFile( 'sandybrown' ), 'sandybrown' ), null );
	assert.equal( skipReason( cacheFile( 'eye-care-test' ), 'sandybrown', true ), null );
} );

test( 'MUST FAIL TO REPLACE: a sandybrown run never replaces an eye-care-test file without --recalibrate', () => {
	const f = cacheFile( 'eye-care-test' );
	assert.match( skipReason( f, 'sandybrown' ), /calibrated on eye-care-test/ );
	assert.equal( cachedSite( f ), 'eye-care-test' );
} );

// The deploy key reads local text files with LF endings (§3.2): the deploy builds from a clean LF checkout, so a CRLF
// working copy of the same code must key alike, while a code change must not.
import { localBlockHash } from '../calibrate.mjs';

const buildDir = ( php ) => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-key-' ) );
	fs.writeFileSync( path.join( d, 'render.php' ), php );
	fs.writeFileSync( path.join( d, 'block.json' ), '{"name":"sgs/x"}\n' );
	return d;
};

test( 'a CRLF render.php keys the same as its LF copy', () => {
	assert.equal( localBlockHash( buildDir( '<?php\r\necho 1;\r\n' ) ), localBlockHash( buildDir( '<?php\necho 1;\n' ) ) );
} );

test( 'MUST FAIL TO MATCH: a code change in render.php changes the key, whatever its line endings', () => {
	assert.notEqual( localBlockHash( buildDir( '<?php\r\necho 2;\r\n' ) ), localBlockHash( buildDir( '<?php\necho 1;\n' ) ) );
} );

// A border-radius box marker is written in the shape the render reads: corners, per device (otherwise every
// borderRadius reads as dead).
import { markersFor } from '../lib/calibrate.mjs';
import { blockSchema } from '../lib/resolve.mjs';

test( 'MUST FAIL TO BE DEAD: the quote borderRadius marker is corner-keyed and per device', () => {
	const [ m ] = markersFor( { attr_name: 'borderRadius', css_property: 'border-radius', tier_shape: 'box_only', box_family: 'borderRadius' }, blockSchema( 'sgs/quote' ), { palette: [], spacing: [], fontSizes: [] } );
	assert.deepEqual( Object.keys( m.attrs.borderRadius ), [ 'desktop', 'tablet', 'mobile' ] );
	assert.deepEqual( m.attrs.borderRadius.desktop, { topLeft: '11px', topRight: '13px', bottomRight: '17px', bottomLeft: '19px' } );
} );

// CR11: a border style paints only with a border width (info-box/render.php prints border-style inside
// `if ( $has_border_width )`), so a style-only marker reads dead. Each style marker carries its companion width and is
// read against a baseline carrying the same width.
import { companionWidth, slotFor } from '../lib/calibrate.mjs';

const BORDER_ROW = { attr_name: 'borderStyle', css_property: 'border-style', tier_shape: null, box_family: null };
// The render's rule, per width: the style prints only beside a width; otherwise nothing paints.
const paint = ( attrs ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '': {
	'border-top-style': attrs.borderWidth ? attrs.borderStyle || 'solid' : 'none',
	'border-top-width': attrs.borderWidth ? '3px' : '0px',
} } ] ) );

test( 'a border-style marker carries the companion width, and its baseline carries the same width', () => {
	const schema = blockSchema( 'sgs/info-box' );
	assert.deepEqual( companionWidth( 'borderStyle', schema ).attrs, { borderWidth: { top: '3px', right: '3px', bottom: '3px', left: '3px' } } );
	const ms = markersFor( BORDER_ROW, schema, { palette: [], spacing: [], fontSizes: [] } );
	assert.ok( ms.length > 1 );
	for ( const m of ms ) {
		assert.deepEqual( m.base, { borderWidth: { top: '3px', right: '3px', bottom: '3px', left: '3px' } } );
		assert.deepEqual( m.attrs.borderWidth, m.base.borderWidth );
	}
} );

test( 'MUST FAIL TO BE DEAD: a dashed style is mapped against its width baseline; alone against the default it reads dead', () => {
	const m = markersFor( BORDER_ROW, blockSchema( 'sgs/info-box' ), { palette: [], spacing: [], fontSizes: [] } ).find( ( x ) => 'enum-dashed' === x.label );
	const styleOnly = slotFor( BORDER_ROW, m, paint( {} ), paint( { borderStyle: 'dashed' } ) );
	assert.equal( styleOnly.dead, true );
	const paired = slotFor( BORDER_ROW, m, paint( m.base ), paint( m.attrs ) );
	assert.equal( paired.dead, undefined );
	assert.equal( paired.slot, '' );
	assert.equal( paired.property, 'border-style' );
} );

test( 'a style setting with no width companion keeps its plain markers', () => {
	assert.equal( companionWidth( 'lineStyle', blockSchema( 'sgs/separator' ) ), null );
} );
