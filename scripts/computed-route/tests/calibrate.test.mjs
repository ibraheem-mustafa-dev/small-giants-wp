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
	assert.equal( triggerFor( 'focus' ), 'focus' );
	assert.equal( triggerFor( 'shrunk' ), 'class' );
} );

test( 'MUST FAIL TO CALIBRATE: a state with no trigger is undefined, never rest', () => {
	assert.equal( triggerFor( 'visited' ), undefined );
	assert.ok( ! Object.hasOwn( STATE_TRIGGERS, 'visited' ) );
} );

// The deploy key (§3.2): webpack's module number depends on the build folder, so two builds of one commit must hash
// alike, while any real change to the bundle must not.
import { normaliseBundle } from '../calibrate.mjs';

const bundle = ( id, attr ) => `var e={${ id }(){const e="${ attr }";}},t={};function r(n){return e[n]()}r(${ id }),document.x;`;

test( 'two builds of one commit (module 2310 and 6469) normalise to the same text', () => {
	assert.equal( normaliseBundle( './view.js', bundle( 2310, 'data-a' ) ), normaliseBundle( './view.js', bundle( 6469, 'data-a' ) ) );
	assert.equal( normaliseBundle( './view.asset.php', "<?php return array('dependencies' => array(), 'version' => 'abc');" ), normaliseBundle( './view.asset.php', "<?php return array('dependencies' => array(), 'version' => 'def');" ) );
} );

test( 'MUST FAIL: a module taking parameters (webpack 5 with exports or require) normalises alike across builds', () => {
	const param = ( a, b ) => `var e={${ a }(e,t,r){r(${ b })},${ b }(){}};`;
	assert.equal( normaliseBundle( './view.js', param( 2310, 4410 ) ), normaliseBundle( './view.js', param( 6469, 912 ) ) );
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

test( 'MUST FAIL: an inherited setting records every element its value reached, never a child whose own rule holds it', () => {
	const COLOUR_ROW = { attr_name: 'textColourHover', css_property: 'color', tier_shape: null, box_family: null };
	const reads = ( c ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '': { color: c }, '.x__link > .x__label': { color: c }, '.x__day': { color: 'rgb(0, 0, 0)' } } ] ) );
	const r = slotFor( COLOUR_ROW, { attrs: {} }, reads( 'rgb(1, 1, 1)' ), reads( 'rgb(19, 87, 155)' ) );
	assert.equal( r.slot, '' );
	assert.deepEqual( r.reaches, [ '', '.x__link > .x__label' ] );
} );

test( 'MUST FAIL: a minimum size marks above the 44px touch-target floor', () => {
	const row = { attr_name: 'fieldMinHeight', css_property: 'min-height', tier_shape: 'tier_object', box_family: null };
	const [ m ] = markersFor( row, { fieldMinHeight: { type: 'object', default: {} } }, { palette: [], spacing: [], fontSizes: [] } );
	assert.ok( Object.values( m.attrs.fieldMinHeight ).every( ( v ) => parseFloat( v ) > 44 ), JSON.stringify( m.attrs ) );
	const flat = markersFor( { attr_name: 'minHeight', css_property: 'min-height', tier_shape: null, box_family: null }, { minHeight: { type: 'string', default: '' } }, { palette: [], spacing: [], fontSizes: [] } );
	assert.ok( parseFloat( flat[ 0 ].attrs.minHeight ) > 44 );
} );

// P4: transition calibration markers.
import { MARKER_DURATION_MS, MARKER_EASING } from '../lib/calibrate.mjs';

const snap = { palette: [] };
const durRow = ( over = {} ) => ( { attr_name: 'transitionDuration', attr_type: 'string', default_value: '"300"', enum_values: null, css_property: 'transition,transition-duration', ...over } );
const easeRow = ( over = {} ) => ( { attr_name: 'transitionEasing', attr_type: 'string', default_value: '"ease-in-out"', enum_values: null, css_property: 'transition,transition-timing-function', ...over } );

test( 'MUST FAIL ON REVERT: the duration marker is the integer millisecond 437, never a CSS time', () => {
	const [ m ] = markersFor( durRow(), {}, snap );
	assert.equal( MARKER_DURATION_MS, 437 );
	assert.equal( m.attrs.transitionDuration, '437' );
	assert.match( m.attrs.transitionDuration, /^[0-9]+$/ );
	const [ n ] = markersFor( durRow( { attr_type: 'number', default_value: '0', css_property: 'transition-duration' } ), {}, snap );
	assert.strictEqual( n.attrs.transitionDuration, 437 );
	assert.equal( n.expect[ 1440 ], '0.437s' );
} );

test( 'MUST FAIL ON REVERT: the easing marker is whitelisted and is never ease-in-out', () => {
	const allowed = [ 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' ];
	for ( const def of [ '"ease-in-out"', '"ease"', '"linear"' ] ) {
		const [ m ] = markersFor( easeRow( { default_value: def } ), {}, snap );
		const v = m.attrs.transitionEasing;
		assert.ok( allowed.includes( v ) );
		assert.notEqual( v, 'ease-in-out' );
		assert.notEqual( v, JSON.parse( def ) );
	}
	assert.equal( MARKER_EASING, 'linear' );
} );

test( 'NO OVER-REACH: an enum easing row (heading, text, nav-bar-menu, icon-list) keeps the enum branch', () => {
	const en = '["ease", "ease-in", "ease-out", "ease-in-out", "linear"]';
	const ms = markersFor( easeRow( { default_value: '"ease"', enum_values: en, css_property: 'transition-timing-function' } ), {}, snap );
	assert.deepEqual( ms.map( ( m ) => m.label ), [ 'enum-ease-in', 'enum-ease-out', 'enum-ease-in-out', 'enum-linear' ] );
	assert.ok( ! ms.some( ( m ) => 'easing' === m.label ) );
} );

test( 'NO OVER-REACH: a block with no transition attribute produces no marker', () => {
	// google-reviews, accordion-item, media and choice-flow-question have no transition* attribute: a row that merely
	// paints a transition from some other setting, or carries no type, has no control to write to.
	assert.deepEqual( markersFor( { attr_name: 'hoverLift', attr_type: 'string', default_value: null, enum_values: null, css_property: 'transition,transition-duration' }, {}, snap ), [] );
	assert.deepEqual( markersFor( durRow( { attr_type: null, default_value: null } ), {}, snap ), [] );
	assert.deepEqual( markersFor( easeRow( { attr_type: null, default_value: null } ), {}, snap ), [] );
} );

test( 'MUST FAIL ON REVERT: a timing setting named for what it moves gets a marker, not only one named transition*', () => {
	// 37 of the 64 timing rows in the DB carry no "Transition" in their name (cart, nav menus, the bgHoverZoom family).
	const [ slide ] = markersFor( { attr_name: 'panelSlideDuration', attr_type: 'number', default_value: '0', enum_values: null, css_property: 'transition-duration' }, {}, snap );
	assert.equal( slide.label, 'duration-ms' );
	assert.strictEqual( slide.attrs.panelSlideDuration, 437 );
	assert.equal( slide.expect[ 768 ], '0.437s' );
	const [ caret ] = markersFor( { attr_name: 'submenuCaretTurnEasingCustom', attr_type: 'string', default_value: '""', enum_values: null, css_property: 'transition-timing-function' }, {}, snap );
	assert.equal( caret.label, 'easing' );
	const [ exit ] = markersFor( { attr_name: 'submenuExitDuration', attr_type: 'number', default_value: '150', enum_values: null, css_property: 'transition' }, {}, snap );
	assert.strictEqual( exit.attrs.submenuExitDuration, 437 );
} );

test( 'MUST FAIL ON REVERT: a duration held in seconds gets its marker in seconds, never 437 seconds', () => {
	// sgs/cart freeDeliveryFillDuration defaults to 0.6 and render.php clamps it to 0..3 seconds: 437 would read as 3s.
	const [ fill ] = markersFor( { attr_name: 'freeDeliveryFillDuration', attr_type: 'number', default_value: '0.6', enum_values: null, css_property: 'transition-duration' }, {}, snap );
	assert.equal( fill.label, 'duration-s' );
	assert.strictEqual( fill.attrs.freeDeliveryFillDuration, 0.437 );
	assert.equal( fill.expect[ 1440 ], '0.437s' );
} );

test( 'NO OVER-REACH: a Duration-named setting that paints no timing longhand gets no timing marker, and no default stays milliseconds', () => {
	const ms = markersFor( { attr_name: 'countDuration', attr_type: 'number', default_value: '2000', enum_values: null, css_property: 'animation-duration' }, {}, snap );
	assert.ok( ! ms.some( ( m ) => /^duration-/.test( m.label ) ), `labels ${ ms.map( ( m ) => m.label ) }` );
	const [ motion ] = markersFor( { attr_name: 'itemMotionDuration', attr_type: 'number', default_value: null, enum_values: null, css_property: 'transition-duration' }, {}, snap );
	assert.equal( motion.label, 'duration-ms' );
	assert.strictEqual( motion.attrs.itemMotionDuration, 437 );
} );

test( 'slotFor reads a transition marker through timingSet: repeated and reordered lists are one timing', () => {
	const [ m ] = markersFor( durRow(), {}, snap );
	const at = ( v ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '': { 'transition-duration': v } } ] ) );
	assert.deepEqual( slotFor( durRow(), m, at( '0.3s' ), at( '0.437s, 0.437s' ) ).slot, '' );
	assert.equal( slotFor( durRow(), m, at( '0.3s, 0.3s' ), at( '0.3s' ) ).dead, true );
} );
