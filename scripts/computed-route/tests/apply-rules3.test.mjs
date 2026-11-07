// Hero SVG parts, hover indent, field width auto, the testimonial change animation and the process steps' hidden connector.
// Run: node --test tests/apply-rules3.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { chrome } from '../lib/apply-family-chrome.mjs';
import { form } from '../lib/apply-family-form.mjs';
import { statemotion } from '../lib/apply-family-statemotion.mjs';
import { motion } from '../lib/apply-family-motion.mjs';
import { changeAnimation, easingName, heroSvgParts, namedEasings } from '../lib/apply-motion-rules.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const at = ( f ) => ( { 1440: f } );
const target = { ref: 'cr-ref-x-1', key: 'cr-ref-x-1', tpl: 'Root/9#0', owns: [], reach: [] };
const rec = ( id, tpl, trigger, properties, o = {} ) => ( { id, element: { dc: 'D', template_tpl_id: String( tpl ) }, trigger: { type: trigger }, properties, ...o } );

// ---- hero SVG parts
const svgRec = ( id, part, nearest = '9' ) => ( { id, element: { dc: 'D', template_tpl_id: null, nearest_tpl_id: nearest, selector: `inlined SVG → [id="${ part }"]` }, trigger: { type: 'mount' } } );
const PARTS = [ { target: 'snow', fromOpacity: 0 }, { target: 'goldpath', copyShapeFrom: 'path5', draw: true } ];
const FULL_SVG = '<svg><g id="snow"/><path id="path5"/><path id="goldpath"/></svg>';
const hero = ( o ) => ( { target, block: 'sgs/hero', saved: { bgSvgContent: FULL_SVG }, records: [ svgRec( 'A-24', 'snow' ) ], clientData: { hero: { bgSvgPartsTrigger: 'load', bgSvgParts: PARTS } }, ...o } );

test( 'hero svg parts: the client data lands on the hero that holds the SVG', () => {
	const [ item ] = heroSvgParts( hero() );
	assert.equal( item.status, 'op' );
	assert.deepEqual( item.writes.map( ( w ) => w.attr ), [ 'bgSvgParts', 'bgSvgPartsTrigger' ] );
	assert.equal( item.record, 'A-24' );
} );

test( 'hero svg parts: a missing id, a missing file or no SVG is a no-setting row; another block or another hero writes nothing', () => {
	const lacking = heroSvgParts( hero( { saved: { bgSvgContent: '<svg><g id="snow"/><path id="path5"/></svg>' } } ) )[ 0 ];
	assert.equal( lacking.status, 'no-setting' );
	assert.match( lacking.why, /no element with id goldpath/ );
	assert.equal( heroSvgParts( hero( { clientData: {} } ) )[ 0 ].status, 'no-setting' );
	assert.match( heroSvgParts( hero( { saved: {} } ) )[ 0 ].why, /no bgSvgContent/ );
	assert.deepEqual( heroSvgParts( hero( { block: 'sgs/container' } ) ), [] );
	assert.deepEqual( heroSvgParts( hero( { records: [ svgRec( 'A-24', 'snow', '77' ) ] } ) ), [] );
} );

const animated = ( u ) => ( /\.svg$/.test( u ) ? '<svg><animateTransform attributeName="transform" dur="4s"/></svg>' : null );
const still = ( u ) => ( /\.svg$/.test( u ) ? '<svg><g id="snow"/></svg>' : null );
const withBg = ( url, extra = {} ) => ( { saved: { backgroundImage: { id: 1, url }, ...extra } } );

test( 'hero svg parts: a hero whose background is an animated SVG file is equal, with the file named', () => {
	const [ item ] = heroSvgParts( hero( { ...withBg( 'http://x/hero-rays.svg', { backgroundImageMobile: { id: 2, url: 'http://x/hero-rays-m.svg' } } ), readSvg: animated } ) );
	assert.equal( item.status, 'equal' );
	assert.match( item.why, /animated SVG file hero-rays\.svg/ );
} );

test( 'hero svg parts: a still image, a still SVG, an unreadable file or one still device image keeps the no-setting row', () => {
	const gap = ( o ) => heroSvgParts( hero( o ) )[ 0 ];
	assert.equal( gap( { ...withBg( 'http://x/photo.jpg' ), readSvg: animated } ).status, 'no-setting' );
	assert.equal( gap( { ...withBg( 'http://x/hero.svg' ), readSvg: still } ).status, 'no-setting' );
	assert.equal( gap( { ...withBg( 'http://x/hero.svg' ), readSvg: () => null } ).status, 'no-setting' );
	assert.equal( gap( { ...withBg( 'http://x/hero.svg', { backgroundImageTablet: { id: 3, url: 'http://x/tablet.png' } } ), readSvg: animated } ).status, 'no-setting' );
	assert.equal( gap( { saved: {}, readSvg: animated } ).status, 'no-setting' );
} );

test( 'hero svg parts: saved values already equal give equal', () => {
	assert.equal( heroSvgParts( hero( { saved: { bgSvgContent: FULL_SVG, bgSvgPartsTrigger: 'load', bgSvgParts: PARTS } } ) )[ 0 ].status, 'equal' );
} );

// ---- hover indent
const indentRec = rec( 'TR-9', 9, 'hover', [ { property: 'padding-left', from: null, to: '12px', duration_ms: 220, delay_ms: 0, easing: 'ease-out' } ], { mechanism: 'css-transition', duration_ms: 220 } );
const ictx = ( o = {} ) => ( { target, block: 'sgs/container', saved: {}, draft: at( { styles: { 'padding-left': '6px' } } ), live: at( {} ), recordsIndex: recordIndex( [ indentRec ], 'D' ), db, rawSnapshot: null, ...o } );
const indent = ( c ) => statemotion.decide( c ).find( ( i ) => 'hover indent' === i.prop );

test( 'hover indent: indent is hover minus rest, restIndent is the rest, and the live rest padding is checked', () => {
	const item = indent( ictx() );
	assert.equal( item.status, 'op', item.why );
	const values = item.writes[ 0 ].value.elements.root.hover.state.values;
	assert.equal( values.indent, 6 );
	assert.equal( values.restIndent, 6 );
	assert.deepEqual( item.checks, [ { width: 1440, prop: 'padding-left', want: '6px' } ] );
} );

test( 'hover indent: a rest of 0 sets no restIndent; an equal layer, no indent and no record write nothing', () => {
	const flat = indent( ictx( { draft: at( { styles: { 'padding-left': '0px' } } ) } ) ).writes[ 0 ].value.elements.root.hover.state.values;
	assert.equal( flat.restIndent, undefined );
	assert.equal( flat.indent, 12 );
	const held = { v: 1, elements: { root: { hover: { state: { values: { indent: 6, restIndent: 6, duration: 220 } } } } } };
	assert.equal( indent( ictx( { saved: { sgsMotion: held } } ) ).status, 'equal' );
	assert.equal( indent( ictx( { draft: at( { styles: { 'padding-left': '12px' } } ) } ) ), undefined );
	assert.equal( indent( ictx( { recordsIndex: recordIndex( [], 'D' ) } ) ), undefined );
	assert.equal( indent( ictx( { draft: at( { styles: { 'padding-left': 'calc(1em)' } } ) } ) ).status, 'no-setting' );
} );

// ---- field width
const cell = ( cellW, o = {} ) => ( { cellW, gridW: 684, cols: 2, form: false, ref: 'cr-ref-f-1', ...o } );
const field = ( layout ) => ( { field: {}, label: {}, layout } );
const wctx = ( dLayouts, lLayouts, attrs = {} ) => ( {
	target, block: 'sgs/form', db, saved: {},
	draft: at( { probes: { fields: dLayouts.map( field ) } } ), live: at( { probes: { fields: lLayouts.map( field ) } } ),
	all: { blocks: Object.fromEntries( lLayouts.map( ( l, i ) => [ l?.ref ?? `n${ i }`, { block: 'sgs/form-field-text', attrs } ] ) ) },
} );
const widths = ( c ) => form.decide( c ).filter( ( i ) => 'field width' === i.prop );

test( 'field width: a field in one of two draft columns, in a nested live grid, takes auto; a full-row field keeps full', () => {
	const items = widths( wctx( [ cell( 333 ), cell( 684 ) ], [ cell( 684, { ref: 'cr-ref-f-1' } ), cell( 684, { ref: 'cr-ref-f-2' } ) ] ) );
	assert.equal( items.length, 1 );
	assert.equal( items[ 0 ].status, 'op' );
	assert.equal( items[ 0 ].ref, 'cr-ref-f-1' );
	assert.deepEqual( items[ 0 ].writes, [ { attr: 'width', value: 'auto' } ] );
} );

test( 'field width: negative controls (the form own grid, a single-track draft, equal, a count mismatch) write nothing', () => {
	assert.equal( widths( wctx( [ cell( 333 ) ], [ cell( 684, { form: true } ) ] ) ).length, 0 );
	assert.equal( widths( wctx( [ cell( 684, { cols: 1 } ) ], [ cell( 684 ) ] ) ).length, 0 );
	assert.equal( widths( wctx( [ cell( 333 ) ], [ cell( 684 ) ], { width: 'auto' } ) )[ 0 ].status, 'equal' );
	assert.equal( widths( wctx( [ cell( 333 ), cell( 333 ) ], [ cell( 684 ) ] ) )[ 0 ].status, 'no-setting' );
} );

// ---- testimonial change animation
const change = rec( 'A-01', 9, 'state', [ { property: 'opacity', from: 0, to: 1 }, { property: 'transform', from: 'translateX(26px)', to: 'none' } ], { duration_ms: 520, easing: 'cubic-bezier(.16,.84,.32,1)' } );
const cctx = ( o = {} ) => ( { target, block: 'sgs/testimonial-slider', saved: {}, recordsIndex: recordIndex( [ change ], 'D' ), db, ...o } );

test( 'change animation: fade-up from the record; values equal to the block defaults are not rewritten', () => {
	const [ item ] = changeAnimation( cctx() );
	assert.equal( item.status, 'op' );
	assert.deepEqual( item.writes, [ { attr: 'changeTransition', value: 'fade-up' } ] );
	const moved = { ...change, duration_ms: 700, properties: [ change.properties[ 0 ], { property: 'transform', from: 'translateX(-40px)', to: 'none' } ] };
	const other = changeAnimation( cctx( { recordsIndex: recordIndex( [ moved ], 'D' ) } ) )[ 0 ];
	assert.deepEqual( other.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'changeTransition', 'fade-up' ], [ 'changeDistance', -40 ], [ 'changeDuration', 700 ] ] );
	assert.equal( changeAnimation( cctx( { saved: { changeTransition: 'fade-up' } } ) )[ 0 ].status, 'equal' );
} );

test( 'change animation: an easing no name gives is a no-setting row; another block or a hover record writes nothing', () => {
	const odd = changeAnimation( cctx( { recordsIndex: recordIndex( [ { ...change, easing: 'cubic-bezier(.1,.2,.3,.4)' } ], 'D' ) } ) );
	assert.ok( odd.some( ( i ) => 'no-setting' === i.status && 'changeEasing' === i.prop ) );
	assert.deepEqual( changeAnimation( cctx( { block: 'sgs/container' } ) ), [] );
	assert.deepEqual( changeAnimation( cctx( { recordsIndex: recordIndex( [ { ...change, trigger: { type: 'hover' } } ], 'D' ) } ) ), [] );
	assert.equal( easingName( { db, block: 'sgs/testimonial-slider', attr: 'changeEasing', css: 'cubic-bezier(.16,.84,.32,1)' } ), 'drafts' );
	assert.equal( namedEasings().drafts, 'cubic-bezier(0.16, 0.84, 0.32, 1)' );
} );

// ---- process steps' hidden connector
const line = ( shown ) => ( { styles: { display: shown ? 'block' : 'none', height: '2px', 'background-color': 'rgb(1, 1, 1)' }, box: shown ? { w: 600, h: 2, x: 0, y: 28 } : { w: 0, h: 0, x: 0, y: 0 } } );
const steps = () => ( { styles: { display: 'grid' }, box: { w: 800, h: 200, x: 0, y: 0 } } );
const sctx = ( hiddenAt ) => ( {
	target: { ...target, reach: [ 5 ] }, block: 'sgs/process-steps', saved: {}, recordsIndex: recordIndex( [], 'D' ), clientData: {},
	draft: { 1440: steps(), 768: steps(), 375: steps() },
	live: { 1440: steps(), 768: steps(), 375: steps() },
	aux: { 'Root/5#0': Object.fromEntries( [ 1440, 768, 375 ].filter( ( w ) => ! hiddenAt.includes( w ) ).map( ( w ) => [ w, line( true ) ] ) ) },
} );
const hiddenOf = ( c ) => chrome.decide( c ).find( ( i ) => 'connectorLine' === i.prop )?.writes.find( ( w ) => 'connectorHidden' === w.attr )?.value;

test( 'connectorHidden: true at the tiers the draft hides the line at, and only those', () => {
	assert.deepEqual( hiddenOf( sctx( [ 768, 375 ] ) ), { tablet: true, mobile: true } );
	assert.deepEqual( hiddenOf( sctx( [ 375 ] ) ), { mobile: true } );
	assert.equal( hiddenOf( sctx( [] ) ), undefined );
} );

// ---- the motion family hands the hero SVG's calls to bgSvgParts
const svgCall = { key: 'cr-ref-x-1', own: false, tpl: '9', frames: [ { translate: '0 140px', opacity: 0 }, { translate: '0 0', opacity: 1 } ], options: { duration: 1100, easing: 'ease', fill: 'both' } };
const mctx = ( records, o = {} ) => ( {
	...hero( { records } ), target, draft: at( { box: { y: 0 } } ), live: at( {} ), recordsIndex: recordIndex( [], 'D' ), db, rawSnapshot: null,
	animate: { 1440: [ svgCall ], 768: [ svgCall ], 375: [ svgCall ] }, ...o,
} );

test( 'motion family: the SVG parts are no media entrance; without SVG records the same calls are', () => {
	const withRecords = motion.decide( mctx( [ svgRec( 'A-24', 'snow' ) ] ) );
	assert.ok( withRecords.some( ( i ) => 'bgSvgParts' === i.prop && 'op' === i.status ) );
	assert.ok( ! withRecords.some( ( i ) => /media/.test( `${ i.prop } ${ i.why }` ) ), JSON.stringify( withRecords ) );
	const without = motion.decide( mctx( [] ) );
	assert.ok( without.some( ( i ) => /media/.test( `${ i.prop } ${ i.why }` ) ), JSON.stringify( without ) );
} );
