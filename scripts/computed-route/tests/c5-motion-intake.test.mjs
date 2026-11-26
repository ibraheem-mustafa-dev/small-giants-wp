// Spec 48 FR-48-25, register row C5 (intake): the re-derived animation inventory reads what the draft's code states.
// A style writer inside a tween carries the tween's duration, curve and per-item delay (lib/intake-inventory-tween.mjs);
// a ref object (`createRef`) and `a || b` reach the template element they are bound to
// (lib/intake-inventory-target.mjs::targetOf); an `animation: {{ key }}` hole carries the strings the code builds for the
// key, with the widths its conditions apply them at (lib/intake-inventory-holes.mjs). Fixtures are written here from the
// shape of the drafts' code (no browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { animationRecords } from '../lib/intake-inventory-anim.mjs';

const source = ( logic, elements = [] ) => ( { component: 'App', file: 'App.dc.html', via: 'entry', logic, logicLine: 1, logicColumn: 0, scripts: [], stamped: { elements } } );
const records = ( logic, rows = [], elements = [] ) => animationRecords( { sources: [ source( logic, elements ) ], rows } ).records;
const writes = ( recs, fn ) => recs.filter( ( r ) => fn === r.source.function );

const REVEAL = `class Component extends DCComponent {
  show( el, i ) {
    const start = Date.now(), dur = 460, delay = Math.min( i || 0, 7 ) * 70;
    el.style.willChange = 'opacity, transform';
    const step = () => {
      const t = Date.now() - start - delay;
      const p = Math.min( 1, t / dur ), e = 1 - Math.pow( 1 - p, 3 );
      el.style.opacity = String( e );
      el.style.transform = 'translateY(' + ( 26 * ( 1 - e ) ).toFixed( 2 ) + 'px)';
      setTimeout( step, 16 );
    };
    setTimeout( step, 0 );
  }
  reset( el ) { el.style.opacity = '1'; }
}`;

test( 'MUST FAIL (C5 intake 1): a style writer inside a tween carries the tween\'s duration, curve and per-item delay, not a stylesheet smoothing default', () => {
	const recs = writes( records( REVEAL ), 'show' ).filter( ( r ) => 'will-change' !== r.properties[ 0 ].property );
	assert.deepEqual( recs.map( ( r ) => r.properties[ 0 ].property ).sort(), [ 'opacity', 'transform' ] );
	for ( const r of recs ) {
		assert.equal( r.duration_ms, 460, `${ r.source.code }: the dur constant` );
		assert.equal( r.easing, 'easeOutCubic', `${ r.source.code }: 1 - Math.pow( 1 - p, 3 )` );
		assert.deepEqual( r.stagger, { ms: 70, cap_ms: 490, base_ms: 0, basis: 'item index (i), capped at 7' } );
	}
} );

test( 'negative control (C5 intake 1): a writer outside any tween keeps no tween timing', () => {
	const [ r ] = writes( records( REVEAL ), 'reset' );
	assert.equal( r.duration_ms, 0 );
	assert.equal( r.stagger, null );
	assert.equal( r.easing, null );
	const [ still ] = writes( records( REVEAL ), 'show' ).filter( ( x ) => 'will-change' === x.properties[ 0 ].property );
	assert.equal( still.duration_ms, 0, "a write in the tween's function that does not read the progress is not tweened" );
	assert.equal( still.stagger, null );
} );

test( 'MUST FAIL (C5 intake 1): each easing shape is named, and a per-item delay is read in each spelling', () => {
	const timing = ( curve, delay ) => {
		const logic = REVEAL.replace( '1 - Math.pow( 1 - p, 3 )', curve ).replace( 'Math.min( i || 0, 7 ) * 70', delay );
		return writes( records( logic ), 'show' ).find( ( r ) => 'opacity' === r.properties[ 0 ].property );
	};
	assert.equal( timing( 'p', '0' ).easing, 'linear' );
	assert.equal( timing( 'Math.pow( p, 3 )', '0' ).easing, 'easeInCubic' );
	assert.equal( timing( 'p * p', '0' ).easing, 'easeInQuad' );
	assert.equal( timing( '1 - Math.pow( 1 - p, 5 )', '0' ).easing, 'easeOutQuint' );
	assert.equal( timing( 'p * ( 2 - p )', '0' ).easing, 'easeOutQuad' );
	assert.equal( timing( '1 - Math.pow( 1 - p, 4 )', '0' ).easing, 'easeOutQuart' );
	assert.equal( timing( '1 - Math.pow( 1 - p, 2 )', '0' ).easing, 'easeOutQuad' );
	assert.equal( timing( 'Math.pow( p, 2 )', '0' ).easing, 'easeInQuad' );
	assert.equal( timing( 'p', '120' ).delay_ms, 120, "a literal delay is the record's delay" );
	assert.equal( timing( 'p', '120' ).stagger, null );
	assert.deepEqual( timing( 'p', 'i * 90' ).stagger, { ms: 90, cap_ms: null, base_ms: 0, basis: 'item index (i)' } );
	assert.deepEqual( timing( 'p', '90 * i' ).stagger, { ms: 90, cap_ms: null, base_ms: 0, basis: 'item index (i)' } );
	assert.deepEqual( timing( 'p', '80 * Math.min( i, 4 )' ).stagger, { ms: 80, cap_ms: 320, base_ms: 0, basis: 'item index (i), capped at 4' } );
	assert.equal( timing( 'p', 'someDelay()' ).stagger, null, 'a delay the reader cannot read is not guessed' );
	assert.equal( timing( 'p', 'someDelay()' ).delay_ms, 0 );
} );

test( 'MUST FAIL (C5 intake 1): a curve that is not a known one keeps its source text, never a guessed name', () => {
	const odd = REVEAL.replace( '1 - Math.pow( 1 - p, 3 )', 'Math.sin( p * 1.5 )' );
	const r = writes( records( odd ), 'show' ).find( ( x ) => 'opacity' === x.properties[ 0 ].property );
	assert.equal( r.duration_ms, 460 );
	assert.equal( r.easing, 'Math.sin(p*1.5)' );
} );

const REF = ( body ) => `class Component extends DCComponent {
  heroRef = React.createRef();
  trackRef = React.createRef();
  parallax( y ) { const el = this.heroRef.current; el.style.transform = 'translate3d(0,' + y * 0.18 + 'px,0)'; }
  step( ref ) { ${ body } }
  renderVals() { return { heroRef: this.heroRef, trackRef: this.trackRef }; }
}`;
const REF_ROWS = [
	{ id: 'r1', kind: 'ref', component: 'App', draftId: 'App:9', detail: { expression: 'heroRef' } },
	{ id: 'r2', kind: 'ref', component: 'App', draftId: 'App:12', detail: { expression: 'trackRef' } },
	{ id: 'v1', kind: 'renderVals-key', component: 'App', draftId: 'App:js:6:0', detail: { name: 'heroRef', value: { type: 'MemberExpression', method: 'heroRef' } } },
	{ id: 'v2', kind: 'renderVals-key', component: 'App', draftId: 'App:js:6:1', detail: { name: 'trackRef', value: { type: 'MemberExpression', method: 'trackRef' } } },
];

test( 'MUST FAIL (C5 intake 4/6): the current element of a createRef field bound by ref="{{ key }}" is that template element', () => {
	const [ r ] = writes( records( REF( '' ), REF_ROWS ), 'parallax' );
	assert.equal( r.element.template_tpl_id, '9', JSON.stringify( r.element ) );
	assert.equal( r.element.nearest_tpl_id, undefined );
} );

test( 'MUST FAIL (C5 intake 5): `(ref || this.trackRef).current` reaches the element of the operand that resolves', () => {
	const [ r ] = writes( records( REF( 'const t = (ref || this.trackRef).current; t.scrollTo({ left: 0 });' ), REF_ROWS ), 'step' );
	assert.equal( r.element.template_tpl_id, '12', JSON.stringify( r.element ) );
} );

test( 'negative control (C5 intake 4/6): a createRef field no template binds stays unplaced', () => {
	const [ r ] = writes( records( REF( '' ), REF_ROWS.filter( ( x ) => 'r1' !== x.id ) ), 'parallax' );
	assert.equal( r.element.template_tpl_id, null );
} );

const TICKER = ( value ) => `class Component extends DCComponent {
  renderVals() {
    const effW = this.state.w;
    const mobile = effW < 768;
    return { tickerAnim: ${ value } };
  }
}`;
const TICKER_ROWS = [ { id: 'k1', kind: 'keyframes', component: 'App', draftId: 'App:8', detail: { via: 'style', property: 'animation', value: '{{ tickerAnim }}' } } ];
const TICKER_EL = [ { n: '8', parent: null, tag: 'div', attrs: [ [ 'style', 'animation: {{ tickerAnim }}' ] ], texts: [] } ];
const loops = ( logic ) => records( logic, TICKER_ROWS, TICKER_EL ).filter( ( r ) => 'css-animation' === r.mechanism );

test( 'MUST FAIL (C5 intake 2): an animation hole takes the string the code builds for its key, with the widths its condition applies it at', () => {
	const [ k ] = loops( TICKER( "mobile ? 'marquee 30s linear infinite' : 'none'" ) );
	assert.equal( k.element.template_tpl_id, '8' );
	assert.equal( k.duration_ms, 30000 );
	assert.equal( k.iterations, 'infinite' );
	assert.equal( k.easing, 'linear' );
	assert.equal( k.properties[ 0 ].to, 'marquee' );
	assert.deepEqual( k.breakpoints, [ 'mobile' ], 'the ticker runs below 768 only' );
	assert.equal( k.status, 'active' );
} );

test( 'negative control (C5 intake 2): a string every width gets has no breakpoints, and `none` alone declares no motion', () => {
	const [ always ] = loops( TICKER( "'marquee 30s linear infinite'" ) );
	assert.equal( always.breakpoints, undefined );
	assert.equal( always.duration_ms, 30000 );
	const [ none ] = loops( TICKER( "mobile ? 'none' : 'none'" ) );
	assert.equal( none.status, 'no-op' );
	assert.equal( none.breakpoints, undefined );
} );

test( 'MUST FAIL (C5 intake 2): a condition the reader cannot decide from the width leaves the widths unknown, never guessed', () => {
	const [ k ] = loops( TICKER( "this.state.open ? 'marquee 30s linear infinite' : 'none'" ) );
	assert.equal( k.duration_ms, 30000 );
	assert.equal( k.breakpoints, undefined );
} );

// A code-built animation string (the shape of a mobile-only trust bar) with the widths the runtime pass saw it at.
const BUILT = ( widths ) => {
	const logic = `class Component extends DCComponent {
renderVals() { return { trustBar: this.strip() }; }
strip() { return h( 'div', { style: { animation: 'mmMarquee 24s linear infinite' } } ); }
}`;
	const line = logic.split( '\n' ).findIndex( ( l ) => l.includes( 'animation:' ) );
	const rows = [
		{ id: 'k1', kind: 'keyframes', component: 'App', draftId: `App:js:${ line + 1 }:${ logic.split( '\n' )[ line ].indexOf( 'animation:' ) }`, detail: { via: 'object-key', property: 'animation', value: "'mmMarquee 24s linear infinite'" }, ...( widths ? { widths } : {} ) },
		{ id: 'b1', kind: 'binding', component: 'App', draftId: 'App:7', detail: { where: 'text', expression: 'trustBar' } },
	];
	return records( logic, rows ).find( ( r ) => 'css-animation' === r.mechanism );
};

test( 'MUST FAIL (C5 intake 2): a code-built loop the runtime pass saw at the mobile width only is recorded for that width', () => {
	assert.deepEqual( BUILT( [ 375 ] ).breakpoints, [ 'mobile' ] );
	assert.deepEqual( BUILT( [ 375, 768 ] ).breakpoints, [ 'mobile', 'tablet' ] );
} );

test( 'negative control (C5 intake 2): a loop sighted at every tested width, or at none recorded, carries no breakpoints', () => {
	assert.equal( BUILT( [ 375, 768, 1440 ] ).breakpoints, undefined );
	assert.equal( BUILT( null ).breakpoints, undefined );
} );

test( 'MUST FAIL (C5 intake 2): the census runtime pass keeps the widths a construct was sighted at on its row', async () => {
	const { applyRuntime } = await import( '../lib/intake-census.mjs' );
	const rows = [ { id: 'keyframes@App:js:3:4', kind: 'keyframes', draftId: 'App:js:3:4', component: 'App', detail: {}, source: 'static', unreached: null } ];
	const sight = ( width ) => ( { id: 'keyframes@App:js:3:4', kind: 'keyframes', draftId: 'App:js:3:4', component: 'App', detail: {}, source: 'runtime', visit: 'home', width } );
	const merged = applyRuntime( rows, { sightings: [ sight( 768 ), sight( 375 ), sight( 375 ) ], kinds: [ 'keyframes' ], traceGaps: [] } );
	assert.deepEqual( merged[ 0 ].widths, [ 375, 768 ] );
	assert.equal( 'both', merged[ 0 ].source );
	const none = applyRuntime( rows, { sightings: [], kinds: [ 'keyframes' ], traceGaps: [] } );
	assert.equal( none[ 0 ].widths, undefined, 'negative control: a row no sighting reached has no widths' );
} );


test( 'MUST FAIL (C5 intake 2): the widths a hole value applies at come from the comparisons around it', async () => {
	const { codeModel } = await import( '../lib/intake-inventory-code.mjs' );
	const { holeValues } = await import( '../lib/intake-inventory-holes.mjs' );
	const at = ( expr, key = 'v' ) => holeValues( codeModel( { sources: [ source( `class Component extends DCComponent { renderVals() { const w = this.state.w; const mobile = w < 768; return { ${ key }: ${ expr } }; } }` ) ], rows: [] } ).progs.get( 'App' ), key );
	const by = ( list ) => Object.fromEntries( list.map( ( x ) => [ x.text, x.widths ] ) );
	assert.deepEqual( by( at( "mobile ? 'a' : 'b'" ) ), { a: [ 375 ], b: [ 768, 1440 ] } );
	assert.deepEqual( by( at( "w <= 768 ? 'a' : 'b'" ) ), { a: [ 375, 768 ], b: [ 1440 ] } );
	assert.deepEqual( by( at( "w >= 768 && w < 1024 ? 'a' : 'b'" ) ), { a: [ 768 ], b: [ 375, 1440 ] } );
	assert.deepEqual( by( at( "w < 768 || w > 1200 ? 'a' : 'b'" ) ), { a: [ 375, 1440 ], b: [ 768 ] } );
	assert.deepEqual( by( at( "! mobile ? 'a' : 'b'" ) ), { a: [ 768, 1440 ], b: [ 375 ] } );
	assert.deepEqual( by( at( "w > 1000 ? 'a' : w > 500 ? 'b' : 'c'" ) ), { a: [ 1440 ], b: [ 768 ], c: [ 375 ] } );
	assert.deepEqual( by( at( "w > 768 ? 'a' : 'b'" ) ), { a: [ 1440 ], b: [ 375, 768 ] } );
	assert.deepEqual( by( at( "innerWidth < 768 ? 'a' : 'b'" ) ), { a: [ 375 ], b: [ 768, 1440 ] }, 'a bare width global' );
	assert.deepEqual( by( at( "'only'" ) ), { only: [ 375, 768, 1440 ] } );
	assert.deepEqual( by( at( "this.state.open ? 'a' : 'b'" ) ), { a: null, b: null }, 'a condition on something other than the width is undecided' );
	assert.deepEqual( at( "'x'", 'other' ), [ { text: 'x', widths: [ 375, 768, 1440 ] } ] );
	assert.deepEqual( at( "'x'", 'missing' ).filter( ( x ) => 'x' !== x.text ), [] );
} );


test( 'MUST FAIL (C5 intake 2): a hole with two animation strings is two records, each joined to its @keyframes', () => {
	const stops = [ { key: 'from', decls: [ [ 'transform', 'translateX(0)' ] ] }, { key: 'to', decls: [ [ 'transform', 'translateX(-50%)' ] ] } ];
	const rows = [ ...TICKER_ROWS, { id: 'd1', kind: 'keyframes', component: 'App', draftId: 'App:2', detail: { via: '@keyframes', name: 'marquee', stops } } ];
	const logic = TICKER( "mobile ? 'marquee 30s linear infinite' : 'drift 10s ease infinite'" );
	const ks = records( logic, rows, TICKER_EL ).filter( ( r ) => 'css-animation' === r.mechanism && 'active' === r.status && r.iterations === 'infinite' );
	assert.deepEqual( ks.map( ( k ) => k.properties[ 0 ].to ).sort(), [ 'drift', 'marquee' ] );
	assert.deepEqual( ks.find( ( k ) => 'marquee' === k.properties[ 0 ].to ).breakpoints, [ 'mobile' ] );
	assert.deepEqual( ks.find( ( k ) => 'drift' === k.properties[ 0 ].to ).breakpoints, [ 'tablet', 'desktop' ] );
	assert.ok( ks.find( ( k ) => 'marquee' === k.properties[ 0 ].to ).properties.some( ( p ) => 'transform' === p.property ), 'the @keyframes named by the string supplies the moving property' );
} );
