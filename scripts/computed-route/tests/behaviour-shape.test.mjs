// Spec 48 FR-48-77 (RC10): a script behaviour is recognised by what it does (its mechanism, trigger, the properties it
// writes, its timing and iterations, and the element it targets read from the fact record's template), never by a word in
// its name or the draft's own identifiers. The records here are a real client's saved intake records (A-02 the endless
// ring on the opening-hours dot, J-05 to J-11 the pinned sideways timeline, J-31 the drawer's accordion scroll, A-24 the
// drawer's close), with the template elements they name; each recogniser also fires on a copy whose names, refs,
// selectors, functions and variables are all renamed, and stays silent on a near-miss shape.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { recogniseBehaviour } from '../lib/motion-behaviours.mjs';
import { carouselOf } from '../lib/motion-behaviour-settings.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = JSON.parse( fs.readFileSync( path.join( HERE, 'fixtures', 'behaviour-shape', 'draft-records.json' ), 'utf8' ) );
const TEMPLATE = FIX.template;
const RECORDS = FIX.records;
const byId = ( id, list = RECORDS ) => list.find( ( r ) => r.id === id );
const ctx = ( records = RECORDS, template = TEMPLATE ) => ( { records, template } );

// Every name the draft chose, renamed: the record's name and description, refs, selectors, functions, data attributes and
// the formula's variables. The template keys stay (they are the element's identity, not a name).
const RENAMES = [ [ /setPulseEl/g, 'attachHalo' ], [ /updatePins/g, 'onWheelTick' ], [ /data-pin-?/g, 'data-rail-' ], [ /\bp\b/g, 'prog' ], [ /\bk\b/g, 'nearness' ], [ /animateAcc/g, 'syncOpenRow' ], [ /closeMobile/g, 'hidePanel' ], [ /setMobEl/g, 'bindSheet' ], [ /setDrawerEl/g, 'bindSheetBox' ], [ /\bcnt\b/g, 'tally' ] ];
const rename = ( v ) => ( 'string' === typeof v ? RENAMES.reduce( ( s, [ re, to ] ) => s.replace( re, to ), v ) : Array.isArray( v ) ? v.map( rename ) : v && 'object' === typeof v ? Object.fromEntries( Object.entries( v ).map( ( [ k, x ] ) => [ k, 'template_tpl_id' === k || 'dc' === k ? x : rename( x ) ] ) ) : v );
const RENAMED = RECORDS.map( ( r ) => ( { ...rename( r ), name: `Effect ${ r.id }` } ) );
const settingsOf = ( b ) => ( b && 'settings' === b.kind ? b.blocks : null );

test( 'MUST FAIL: the real endless ring on the status dot (A-02) is the open-status dot pulse by its shape and element, and a renamed copy still is', () => {
	const want = { 'sgs/business-info': [ { attr: 'openStatusDotPulse', value: true }, { attr: 'openStatusDotPulseDuration', value: 1600 } ] };
	assert.deepEqual( settingsOf( recogniseBehaviour( byId( 'A-02' ), ctx() ) ), want );
	assert.deepEqual( settingsOf( recogniseBehaviour( byId( 'A-02', RENAMED ), ctx( RENAMED ) ) ), want, 'renamed, it is still the pulse' );
} );

test( 'negative control: an endless ring is not the dot pulse on an element that is not a live status dot, nor a ring that does not grow from nothing or ends', () => {
	const ring = byId( 'A-02' );
	const key = `${ ring.element.dc }/${ ring.element.template_tpl_id }`;
	const dot = TEMPLATE.elements[ key ];
	const withDot = ( e ) => ( { elements: { ...TEMPLATE.elements, [ key ]: { ...dot, ...e } } } );
	assert.equal( recogniseBehaviour( ring, ctx( RECORDS, withDot( { style: { static: dot.style.static.filter( ( [ n ] ) => ! /radius/.test( n ) ), holes: dot.style.holes } } ) ) )?.kind ?? null, null, 'a square element is not a dot' );
	assert.equal( recogniseBehaviour( ring, ctx( RECORDS, withDot( { holes: dot.holes.filter( ( h ) => ! /^style:/.test( h.where ) ) } ) ) ), null, 'a dot whose paint the script never sets shows no status' );
	assert.equal( recogniseBehaviour( ring, ctx( RECORDS, withDot( { words: 'Live' } ) ) ), null, 'an element with its own words is not the dot' );
	const corners = ( v ) => [ ...dot.style.static.filter( ( [ n ] ) => ! /radius/.test( n ) ), ...[ 'top-left', 'top-right', 'bottom-right', 'bottom-left' ].map( ( c ) => [ `border-${ c }-radius`, v ] ) ];
	assert.equal( recogniseBehaviour( ring, ctx( RECORDS, withDot( { style: { static: corners( '20%' ), holes: dot.style.holes } } ) ) ), null, 'softened corners are not a round dot' );
	assert.equal( recogniseBehaviour( ring, ctx( RECORDS, withDot( { style: { static: corners( '2px' ), holes: dot.style.holes } } ) ) ), null, 'a 2px radius on an 8px element is not round' );
	assert.equal( settingsOf( recogniseBehaviour( ring, ctx( RECORDS, withDot( { style: { static: corners( '4px' ), holes: dot.style.holes } } ) ) ) )?.[ 'sgs/business-info' ]?.[ 0 ]?.attr, 'openStatusDotPulse', 'a radius of half its size is round' );
	assert.equal( recogniseBehaviour( ring, ctx( RECORDS, null ) ), null, 'without the template the element cannot be read' );
	assert.equal( recogniseBehaviour( { ...ring, iterations: 1 }, ctx() ), null, 'a ring that ends is not the pulse' );
	assert.equal( recogniseBehaviour( { ...ring, properties: [ { property: 'box-shadow', from: '0 0 0 4px currentColor', to: '0 0 0 8px transparent' } ] }, ctx() ), null, 'a ring that does not grow from nothing is not the pulse' );
} );

const TIMELINE = {
	'J-05': { 'sgs/timeline': [ { attr: 'scrollEffect', value: 'pinned-horizontal' }, { attr: 'orientation', value: 'horizontal', companion: true }, { attr: 'mobileLayout', value: 'carousel' } ] },
	'J-07': { 'sgs/timeline': [ { attr: 'panelProximityFocus', value: true }, { attr: 'panelEdgeOpacity', value: 0.55 }, { attr: 'panelFocusOpacity', value: 1 } ] },
	'J-08': { 'sgs/timeline': [ { attr: 'panelProximityFocus', value: true }, { attr: 'panelEdgeScale', value: 0.94 }, { attr: 'panelFocusScale', value: 1 } ] },
	'J-09': { 'sgs/timeline': [ { attr: 'dateActiveColour', value: '#D8CA50', colour: true } ] },
	'J-10': { 'sgs/timeline': [ { attr: 'dateActiveTextStrokeColour', value: '#D8CA50', colour: true } ] },
	'J-11': { 'sgs/timeline': [ { attr: 'panelCounter', value: true }, { attr: 'panelCounterFormat', value: 'padded-index-of-total' } ] },
};

test( 'MUST FAIL: the real pinned sideways timeline (J-05 to J-11) is the sgs/timeline settings by its shape (a scroll write that moves a track left inside a sticky stage), and a renamed copy still is', () => {
	for ( const list of [ RECORDS, RENAMED ] ) {
		for ( const [ id, want ] of Object.entries( TIMELINE ) ) {
			assert.deepEqual( settingsOf( recogniseBehaviour( byId( id, list ), ctx( list ) ) ), want, `${ id }${ list === RENAMED ? ' renamed' : '' }` );
		}
		const bar = recogniseBehaviour( byId( 'J-06', list ), ctx( list ) );
		assert.deepEqual( bar.effects[ 0 ].values, { source: 'pin', output: 'bar-x' }, 'the stage\'s progress bar is fed by the pin' );
	}
} );

test( 'negative control: with no sticky stage, or a track that moves down rather than sideways, no write is the pinned timeline', () => {
	const unstuck = { elements: Object.fromEntries( Object.entries( TEMPLATE.elements ).map( ( [ k, e ] ) => [ k, { ...e, style: { ...e.style, static: e.style.static.filter( ( [ n, v ] ) => ! ( 'position' === n && 'sticky' === v ) ) } } ] ) ) };
	for ( const id of Object.keys( TIMELINE ) ) {
		assert.equal( settingsOf( recogniseBehaviour( byId( id ), ctx( RECORDS, unstuck ) ) ), null, `${ id } outside a sticky stage` );
	}
	const down = RECORDS.map( ( r ) => ( 'J-05' === r.id ? { ...r, properties: [ { property: 'transform', from: null, to: null, formula: "'translate3d(0,' + (-p * dist).toFixed(1) + 'px,0)'" } ] } : r ) );
	for ( const id of Object.keys( TIMELINE ) ) {
		assert.equal( settingsOf( recogniseBehaviour( byId( id, down ), ctx( down ) ) ), null, `${ id } beside a track that moves down` );
	}
	const forward = RECORDS.map( ( r ) => ( 'J-05' === r.id ? { ...r, properties: [ { property: 'transform', from: null, to: null, formula: "'translate3d(' + (p * dist).toFixed(1) + 'px,0,0)'" } ] } : r ) );
	assert.equal( settingsOf( recogniseBehaviour( byId( 'J-05', forward ), ctx( forward ) ) ), null, 'a track that moves right is not the pinned track' );
	const slanted = RECORDS.map( ( r ) => ( 'J-05' === r.id ? { ...r, properties: [ { property: 'transform', from: null, to: null, formula: "'translate3d(-12px,' + (-p * dist).toFixed(1) + 'px,0)'" } ] } : r ) );
	assert.equal( settingsOf( recogniseBehaviour( byId( 'J-05', slanted ), ctx( slanted ) ) ), null, 'a track moved up by the scroll from a fixed sideways offset is not the pinned track' );
	const track = byId( 'J-05' );
	const trackKey = `${ track.element.dc }/${ track.element.template_tpl_id }`;
	const selfStuck = { elements: { ...unstuck.elements, [ trackKey ]: { ...unstuck.elements[ trackKey ], style: { static: [ [ 'position', 'sticky' ] ], holes: [] } } } };
	assert.equal( settingsOf( recogniseBehaviour( track, ctx( RECORDS, selfStuck ) ) ), null, 'a track that is itself sticky is not held by a stage' );
} );

test( 'negative control: a write by another writer, or by the same writer on an element outside the stage, does not join the pinned track', () => {
	const year = byId( 'J-09' );
	assert.equal( settingsOf( recogniseBehaviour( { ...byId( 'J-07' ), source: { ...byId( 'J-07' ).source, function: 'elsewhere' } }, ctx() ) ), null, 'another writer' );
	const outside = { ...year, element: { ...year.element, template_tpl_id: byId( 'A-02' ).element.template_tpl_id } };
	assert.equal( settingsOf( recogniseBehaviour( outside, ctx() ) ), null, 'the same writer, outside the stage' );
} );

test( 'MUST FAIL: the real accordion scroll (J-31) is the scroll-to-opened setting by its shape, renamed too; the window scrolled on a step change (J-220) is not', () => {
	const want = { 'sgs/nav-drawer-menu': [ { attr: 'accordionScrollIntoView', value: true } ], 'sgs/accordion': [ { attr: 'scrollToOpened', value: true } ] };
	assert.deepEqual( settingsOf( recogniseBehaviour( byId( 'J-31' ), ctx() ) ), want );
	assert.deepEqual( settingsOf( recogniseBehaviour( byId( 'J-31', RENAMED ), ctx( RENAMED ) ) ), want );
	assert.equal( recogniseBehaviour( byId( 'J-220' ), ctx() ), null, 'scrolling the window is not scrolling a row into view' );
	assert.equal( recogniseBehaviour( { ...byId( 'J-31' ), trigger: { type: 'press', detail: 'onClick' } }, ctx() ), null, 'a press, not a state change, is not the opened row' );
} );

test( 'MUST FAIL: the real drawer close (A-24) is an exit by its shape (it leaves its rest and holds), renamed too; an entrance that holds its rest is not', () => {
	const close = recogniseBehaviour( byId( 'A-24' ), ctx() );
	assert.equal( close.kind, 'close' );
	assert.deepEqual( close.to, { translateX: '100%' } );
	assert.equal( recogniseBehaviour( byId( 'A-24', RENAMED ), ctx( RENAMED ) ).kind, 'close' );
	const enters = { ...byId( 'A-24', RENAMED ), properties: [ { property: 'transform', from: 'translateX(100%)', to: 'none' } ] };
	assert.equal( recogniseBehaviour( enters, ctx( RENAMED ) )?.kind ?? null, null, 'moving to rest is not an exit' );
	assert.equal( recogniseBehaviour( { ...byId( 'A-24' ), properties: [ { property: 'transform', from: 'none', to: 'translateX(0)' } ] }, ctx() )?.kind ?? null, null, 'staying at rest is not an exit' );
	assert.equal( recogniseBehaviour( { ...byId( 'A-24' ), properties: [ { property: 'transform', from: 'translateX(50%)', to: 'translateX(100%)' } ] }, ctx() )?.kind ?? null, null, 'a move between two poses away from rest does not leave the rest' );
} );

// The code is read through its syntax tree, never matched as text (R-47-4).
test( 'MUST FAIL: the accordion scroll is a scrollTo call with a top offset and the counter is padded by a padStart call, each read from the code\'s syntax tree', () => {
	const scroll = byId( 'J-31' );
	const want = { 'sgs/nav-drawer-menu': [ { attr: 'accordionScrollIntoView', value: true } ], 'sgs/accordion': [ { attr: 'scrollToOpened', value: true } ] };
	assert.deepEqual( settingsOf( recogniseBehaviour( { ...scroll, source: { ...scroll.source, code: 'box.scrollTo({ behavior: \'smooth\', top: y })' } }, ctx() ) ), want, 'the top option in any place' );
	const gap = { ...scroll, properties: [ { property: 'scrollTop', from: null, to: 'row.offsetTop - 6' } ] };
	assert.deepEqual( settingsOf( recogniseBehaviour( gap, ctx() ) )[ 'sgs/accordion' ], [ { attr: 'scrollToOpened', value: true }, { attr: 'scrollToOpenedGap', value: '6px' } ], 'the gap is the number subtracted from the offset' );
	const count = byId( 'J-11' );
	const format = ( code ) => settingsOf( recogniseBehaviour( { ...count, source: { ...count.source, code }, properties: [ { property: 'textContent', from: null, to: null, formula: null } ] }, ctx() ) )[ 'sgs/timeline' ][ 1 ].value;
	assert.equal( format( "n.textContent = `${ String(i + 1).padStart(2, '0') } / ${ total }`" ), 'padded-index-of-total', 'a padStart inside a template literal pads' );
} );

test( 'negative control: a scrollTo with only a left offset, words that only spell the calls in a string, and an unpadded counter', () => {
	const scroll = byId( 'J-31' );
	assert.equal( recogniseBehaviour( { ...scroll, source: { ...scroll.source, code: 'sc.scrollTo({ left: x })' } }, ctx() ), null, 'a scroll sideways is not a row brought into view' );
	assert.equal( recogniseBehaviour( { ...scroll, source: { ...scroll.source, code: "log('sc.scrollTo({ top })')" } }, ctx() ), null, 'a string that spells the call is not the call' );
	const count = byId( 'J-11' );
	const format = ( code ) => settingsOf( recogniseBehaviour( { ...count, source: { ...count.source, code }, properties: [ { property: 'textContent', from: null, to: null, formula: null } ] }, ctx() ) )[ 'sgs/timeline' ][ 1 ].value;
	assert.equal( format( "cnt.textContent = (best + 1) + ' / ' + cards.length" ), 'index-of-total' );
	assert.equal( format( "cnt.textContent = 'padStart 01 / NN'" ), 'index-of-total', 'a string holding the words is not a pad' );
	const track = byId( 'J-05' );
	const twice = { ...track, properties: [ { property: 'transform', from: null, to: null, formula: "'translate3d(' + (-p * -dist) + 'px,0,0)'" } ] };
	assert.equal( settingsOf( recogniseBehaviour( twice, ctx( RECORDS.map( ( r ) => ( r.id === track.id ? twice : r ) ) ) ) ), null, 'two negative factors move the track right' );
} );

// A track a timer steps sideways, a writer that suspends its snapping and moves its offset (the drag), whatever the writer is called.
const step = { id: 'T-1', mechanism: 'js-scroll', status: 'active', element: { dc: 'Site', template_tpl_id: '20', selector: 'ref bindRail' }, source: { file: 'Site.dc.html', function: 'advance', code: 't.scrollTo({ left: t.scrollLeft + w })' }, trigger: { type: 'interval', detail: 'setInterval every 6000ms via advance' }, properties: [ { property: 'scroll-left', to: null } ] };
const suspend = ( fn ) => ( { id: 'T-2', mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: null, selector: 't' }, source: { file: 'Site.dc.html', function: fn, code: "t.style.scrollSnapType = 'none'" }, trigger: { type: 'state', detail: 'pointer handlers' }, properties: [ { property: 'scroll-snap-type', to: 'none' } ] } );
const offset = ( fn ) => ( { id: 'T-3', mechanism: 'js-scroll', status: 'active', element: { dc: 'Site', template_tpl_id: null, selector: 't' }, source: { file: 'Site.dc.html', function: fn, code: 't.scrollLeft = start - dx' }, trigger: { type: 'state', detail: 'pointer handlers' }, properties: [ { property: 'scroll-left', to: null } ] } );

test( 'MUST FAIL: a writer that suspends a stepped track\'s snapping and moves its offset is its drag to scroll, whatever the writer is called', () => {
	const records = [ step, suspend( 'grabRail' ), offset( 'grabRail' ) ];
	assert.ok( carouselOf( step, { records } ).blocks[ 'sgs/testimonial-slider' ].some( ( s ) => 'dragToScroll' === s.attr ) );
} );

test( 'negative control: a snap suspended in one writer and an offset moved in another are not a drag', () => {
	const records = [ step, suspend( 'grabRail' ), offset( 'jumpTo' ) ];
	assert.ok( ! carouselOf( step, { records } ).blocks[ 'sgs/testimonial-slider' ].some( ( s ) => 'dragToScroll' === s.attr ) );
} );

// The touch strip, the header's threshold, the slider's steps and the progress bar are read from the fact record and the
// code's syntax tree, never from words.
test( 'MUST FAIL: the real pinned track (J-05) writes the carousel layout because its section declares a horizontal snap track beside the stage', () => {
	const blocks = settingsOf( recogniseBehaviour( byId( 'J-05' ), ctx() ) )[ 'sgs/timeline' ];
	assert.deepEqual( blocks.find( ( s ) => 'mobileLayout' === s.attr ), { attr: 'mobileLayout', value: 'carousel' } );
} );

test( 'negative control: with no snapping track beside the stage, or one that only clips, no carousel layout is written', () => {
	const flatten = ( keep ) => ( { elements: Object.fromEntries( Object.entries( TEMPLATE.elements ).map( ( [ k, e ] ) => [ k, { ...e, style: { ...e.style, static: e.style.static.filter( keep ) } } ] ) ) } );
	const noSnap = flatten( ( [ n ] ) => 'scroll-snap-type' !== n );
	const clipped = flatten( ( [ n, v ] ) => ! ( 'overflow-x' === n && /auto|scroll/.test( v ) ) );
	for ( const template of [ noSnap, clipped ] ) {
		const blocks = settingsOf( recogniseBehaviour( byId( 'J-05' ), ctx( RECORDS, template ) ) )[ 'sgs/timeline' ];
		assert.equal( blocks.find( ( s ) => 'mobileLayout' === s.attr ), undefined );
	}
} );

const header = ( code, over = {} ) => ( { id: 'H-1', mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: '1', selector: 'ref bar' }, trigger: { type: 'scroll-position', detail: 'scroll listener on window' }, source: { code }, properties: [ { property: 'box-shadow', from: 'none', to: '0 4px 8px rgba(0,0,0,.2)' } ], ...over } );
test( 'MUST FAIL: the header\'s scroll threshold is the number a scrollY comparison tests in the code', () => {
	const offset = ( code ) => settingsOf( recogniseBehaviour( header( code ), {} ) )?.[ 'sgs/site-header' ]?.[ 0 ]?.value ?? null;
	assert.equal( offset( "bar.style.boxShadow = window.scrollY >= 24 ? '0 4px 8px rgba(0,0,0,.2)' : 'none'" ), 24 );
	assert.equal( offset( "if (pageYOffset > 3) bar.style.boxShadow = '0 4px 8px rgba(0,0,0,.2)'" ), 3 );
} );

test( 'negative control: a threshold only spelled in words or a string, or a comparison of another value, is no threshold', () => {
	assert.equal( recogniseBehaviour( header( "bar.style.boxShadow = 'scrollY > 8'" ), {} ), null );
	assert.equal( recogniseBehaviour( header( "bar.style.boxShadow = 'x'", { trigger: { type: 'scroll-position', detail: 'window scroll: scrollY > 8' } } ), {} ), null, 'the trigger detail is not read' );
	assert.equal( recogniseBehaviour( header( "bar.style.boxShadow = innerWidth > 8 ? 'a' : 'none'" ), {} ), null );
} );

test( 'MUST FAIL: a slider dot is a scrollTo call whose left option is a product; a step is any scrollTo call with a left option', () => {
	const dot = ( code ) => ( { id: 'T-4', mechanism: 'js-scroll', status: 'active', element: { dc: 'Site', template_tpl_id: '20', selector: 'ref bindRail' }, source: { file: 'Site.dc.html', function: 'dotsOf', code }, trigger: { type: 'press', detail: 'onClick' }, properties: [ { property: 'scroll-left', to: null } ] } );
	const shows = ( code ) => carouselOf( step, { records: [ step, dot( code ) ] } ).blocks[ 'sgs/testimonial-slider' ].some( ( s ) => 'showDots' === s.attr );
	assert.equal( shows( 'tr.scrollTo({ behavior: \'smooth\', left: i * (w + 22) })' ), true );
	assert.equal( shows( 'tr.scrollTo({ left: 0 })' ), false, 'a fixed offset is not an indexed dot' );
	assert.equal( shows( "tr.scrollBy({ left: i * w })" ), false, 'a scrollBy is not a step to an offset' );
	assert.equal( carouselOf( { ...step, source: { ...step.source, code: "log('t.scrollTo({ left: 1 })')" } }, { records: [] } ), null, 'a string that spells the call is no step' );
} );

test( 'MUST FAIL: a page progress bar is a scale written from the scroll as a fraction; a scale of anything else is not', () => {
	const bar = ( formula ) => recogniseBehaviour( { id: 'J-13', mechanism: 'js-style-write', status: 'active', element: { dc: 'Site', template_tpl_id: '38', selector: 'ref prog' }, source: { file: 'Site.dc.html', function: 'onScroll' }, trigger: { type: 'scroll-position', detail: 'scroll listener on window' }, properties: [ { property: 'transform', from: null, to: null, formula } ] }, {} );
	assert.deepEqual( bar( "'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')'" )?.effects?.[ 0 ]?.values, { source: 'page', output: 'bar-x' }, 'the real page bar: the scroll over the scrollable distance' );
	assert.deepEqual( bar( "'scaleY(' + scrollY / (document.body.scrollHeight - innerHeight) + ')'" )?.effects?.[ 0 ]?.values, { source: 'page', output: 'bar-y' } );
	assert.equal( bar( "'scaleX(' + hovered + ')'" ), null, 'a scale not read from the scroll' );
	assert.equal( bar( "'translateX(' + window.scrollY / max + ')'" )?.effects?.[ 0 ]?.effect === 'scroll-progress', false, 'a move is not a bar' );
} );

// The slider's interval is the delay of the timer call in the record's own code (syntax tree), never the trigger's words.
test( 'MUST FAIL: the autoplay interval is the setInterval delay in the record\'s code, a literal or a constant the code declares', () => {
	const timer = ( code, detail = 'setInterval every 9999ms via advance' ) => ( { ...step, source: { ...step.source, code }, trigger: { type: 'interval', detail } } );
	const speed = ( t ) => carouselOf( t, { records: [ t ] } ).blocks[ 'sgs/testimonial-slider' ].find( ( s ) => 'autoplaySpeed' === s.attr )?.value ?? null;
	assert.equal( speed( timer( 'this.iv = setInterval(() => t.scrollTo({ left: t.scrollLeft + w }), 6000)' ) ), 6000, 'the code\'s delay, not the 9999 in the trigger words' );
	assert.equal( speed( timer( 'const EVERY = 4500; this.iv = setInterval(() => t.scrollTo({ left: x }), EVERY)' ) ), 4500 );
} );

test( 'negative control: with no timer call in the record\'s code the interval is not written and a named row says so; a delay spelled in a string is no delay', () => {
	const t = { ...step, source: { ...step.source, code: "t.scrollTo({ left: t.scrollLeft + w }); log('setInterval(f, 6000)')" } };
	const b = carouselOf( t, { records: [ t ] } );
	assert.equal( b.blocks[ 'sgs/testimonial-slider' ].find( ( s ) => 'autoplaySpeed' === s.attr ), undefined );
	assert.deepEqual( b.unread.map( ( u ) => u.field ), [ 'autoplaySpeed' ] );
	const card = { id: 'A-1', mechanism: 'waapi', status: 'active', element: { dc: 'Site', template_tpl_id: '9', selector: 'ref card' }, source: { code: 'card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 })' }, trigger: { type: 'state', detail: 'state.i changes or the 6.5s setInterval', state_keys: [ 'i' ] }, properties: [ { property: 'opacity', from: 0, to: 1 } ], duration_ms: 500 };
	assert.equal( recogniseBehaviour( card, {} )?.kind === 'settings', false, 'the trigger words alone are no interval' );
} );

test( 'MUST FAIL: a setting a behaviour could not read is a named unmapped row where its block is written', async () => {
	const { applySettings } = await import( '../lib/fill-behaviour.mjs' );
	const t = { ...step, source: { ...step.source, code: 't.scrollTo({ left: t.scrollLeft + w })' } };
	const out = { writes: [], unmapped: [], notes: [] };
	applySettings( { items: [ { r: t, b: carouselOf( t, { records: [ t ] } ) } ], n: { name: 'sgs/testimonial-slider', index: 0 }, out, where: { node: 'r0', block: 'sgs/testimonial-slider', slot: '' }, flat: [ { attributes: {} } ], hasAttr: () => true } );
	assert.deepEqual( out.writes.map( ( w ) => w.attr ), [ 'autoplay' ] );
	assert.equal( out.unmapped.length, 1 );
	assert.match( out.unmapped[ 0 ].reason, /^sgs\/testimonial-slider autoplaySpeed not written: the timer's interval is not in the record's own code/ );
} );
