/**
 * Editor-canvas emitter parity (Spec 38A §6.5, FR-38A-28): the JS twin (src/blocks/extensions/motion/canvas/) writes
 * the same scoped CSS text, target selectors, data attributes and shared-element losers as the PHP renderer path
 * (tests/php/fixtures/motion-canvas-emitter-dump.php: document sanitise, layer drops, shared-element strip, emitter
 * with the open and state trigger rules) for every shared case in tests/fixtures/motion/canvas-parity-cases.json:
 * hover states, entrances, per-device tiers, parts (BEM, declared selector, wrapper, band), custom targets, root and
 * group sources, keyframes, the LCP rule, unclean input (off-schema values, bad enums, a missing version), refused
 * layer pairs, the open close values and two parts on one element.
 *
 * PHP must be on the path: the PHP side runs live, and its output must also equal the committed golden
 * tests/fixtures/motion/canvas-parity.json (rewrite it with the dump's `--write`). Without PHP the suite fails.
 *
 * Negative control: 'a planted emitted-value change is caught' changes one emitted value and expects a mismatch.
 */

const { execFileSync } = require( 'child_process' );
const fs = require( 'fs' );
const path = require( 'path' );

import { emitScopedCss } from '../../src/blocks/extensions/motion/canvas/emit-scoped-css';
import { planCanvas } from '../../src/blocks/extensions/motion/canvas/canvas-dom';
import { declaredStates } from '../../src/blocks/extensions/motion/canvas/trigger-rules';
import {
	isScoped,
	resolveTarget,
} from '../../src/blocks/extensions/motion/canvas/resolve-target';

const PLUGIN = path.resolve( __dirname, '..', '..' );
const FIXTURES = path.join( PLUGIN, 'tests/fixtures/motion' );
const CASES = JSON.parse(
	fs.readFileSync( path.join( FIXTURES, 'canvas-parity-cases.json' ), 'utf8' )
).cases;
const GOLDEN = JSON.parse(
	fs.readFileSync( path.join( FIXTURES, 'canvas-parity.json' ), 'utf8' )
);
const EMPTY = { css: '', plans: [], rootAttrs: {}, dropped: [] };

// The editor hands a block its attributes with the `block.json` defaults in them; the PHP guard reads the same defaults.
const attributesOf = ( c ) => {
	const slug = c.block.slice( c.block.indexOf( '/' ) + 1 );
	const defs = JSON.parse(
		fs.readFileSync( path.join( PLUGIN, 'src/blocks', slug, 'block.json' ), 'utf8' )
	).attributes;
	const defaults = {};
	Object.entries( defs ).forEach( ( [ key, def ] ) => {
		if ( def.default !== undefined ) {
			defaults[ key ] = def.default;
		}
	} );
	return { ...defaults, ...( c.attributes || {} ) };
};

const blockSgs = ( name ) => {
	const slug = name.slice( name.indexOf( '/' ) + 1 );
	const json = JSON.parse(
		fs.readFileSync( path.join( PLUGIN, 'src/blocks', slug, 'block.json' ), 'utf8' )
	);
	return json.supports?.sgs || {};
};

const motionOf = ( c ) =>
	c.motionFile
		? JSON.parse(
				fs.readFileSync( path.join( FIXTURES, path.basename( c.motionFile ) ), 'utf8' )
		  ).motion
		: c.motion;

// The case's markup as a DOM root, so shared elements are found the way the canvas finds them.
const rootOf = ( c ) => {
	if ( ! c.html ) {
		return null;
	}
	const host = document.createElement( 'div' );
	host.innerHTML = c.html;
	return host.firstElementChild;
};

// The JS result in the dump's shape.
const jsResult = ( c ) => {
	const sgs = blockSgs( c.block );
	const out = planCanvas( rootOf( c ), motionOf( c ), {
		blockName: c.block,
		elements: sgs.elements || {},
		animationItems: sgs.animationItems || '',
		states: declaredStates( sgs.motion ),
		root: c.root,
		attributes: attributesOf( c ),
		context: {
			lcp: Boolean( c.context.lcp ),
			suppressEntrance: Boolean( c.context.suppress_entrance ),
		},
	} );
	return {
		name: c.name,
		css: out.css,
		plans: out.plans.map( ( plan ) => ( {
			target: plan.target,
			selector: plan.selector,
			root: plan.root,
			attrs: plan.attrs,
			entrance: plan.entrance,
		} ) ),
		rootAttrs: out.rootAttrs,
		losers: out.losers,
		...( out.itemMatches ? { itemMatches: out.itemMatches } : {} ),
	};
};

// Every case where the two sides differ, as `name: js vs php` lines.
const mismatches = ( js, php ) =>
	js.flatMap( ( result, i ) =>
		JSON.stringify( result ) === JSON.stringify( php[ i ] )
			? []
			: [ `${ result.name }:\n  js  ${ JSON.stringify( result ) }\n  php ${ JSON.stringify( php[ i ] ) }` ]
	);

let php;
let js;

beforeAll( () => {
	let raw;
	try {
		raw = execFileSync(
			'php',
			[ path.join( PLUGIN, 'tests/php/fixtures/motion-canvas-emitter-dump.php' ) ],
			{ encoding: 'utf8', cwd: PLUGIN }
		);
	} catch ( error ) {
		throw new Error(
			error.code === 'ENOENT'
				? 'motion canvas parity needs `php` on the path: the PHP side is the reference and is never skipped.'
				: `the PHP dump failed: ${ error.message }`
		);
	}
	php = JSON.parse( raw );
	js = CASES.map( jsResult );
} );

describe( 'motion editor-canvas emitter parity', () => {
	it( 'the committed golden is the PHP output today', () => {
		expect( GOLDEN ).toEqual( php );
	} );

	it( 'JS and PHP give identical CSS text, selectors, data attributes and losers for every case', () => {
		expect( php ).toHaveLength( CASES.length );
		expect( mismatches( js, php ) ).toEqual( [] );
	} );

	it( 'the cases cover the shapes the canvas must match', () => {
		const all = js.map( ( r ) => r.css ).join( '' );
		[ '@media (max-width:1023px)', '@media (max-width:767px)', '--sgs-mh-to-', '--sgs-me-from-', '--sgs-me-close-to-' ].forEach(
			( needle ) => expect( all ).toContain( needle )
		);
		const plans = js.flatMap( ( r ) => r.plans );
		expect( plans.some( ( p ) => p.target.startsWith( 'custom:' ) ) ).toBe( true );
		expect( plans.some( ( p ) => p.selector.includes( ' > ' ) ) ).toBe( true );
		expect( plans.some( ( p ) => p.attrs[ 'data-sgs-mh' ] === 'group' ) ).toBe( true );
		expect( plans.some( ( p ) => p.attrs[ 'data-sgs-me-keyframes' ] ) ).toBe( true );
		expect( js.some( ( r ) => r.rootAttrs[ 'data-sgs-mroot' ] === '' ) ).toBe( true );
		expect( js.some( ( r ) => Object.keys( r.losers ).length > 0 ) ).toBe( true );
	} );

	it( 'the hover ring: painted on an unshadowed block, dropped on a shadowed one, at a zero spread and with no colour', () => {
		const css = ( name ) => js.find( ( r ) => r.name === name ).css;
		const painted = css( 'hover ring on an unshadowed block' );
		expect( painted ).toContain( '--sgs-mh-to-ring:4px;' );
		expect( painted ).toContain( '--sgs-mh-to-ring-c:#0A7EA8;' );
		expect( painted ).toMatch( /box-shadow 250ms/ );
		expect(
			js.find( ( r ) => r.name === 'hover ring on an unshadowed block' ).plans[ 0 ].attrs[ 'data-sgs-mc' ]
		).toContain( 'box-shadow' );
		expect( css( 'hover ring with a preset colour slug and a per-device spread' ) ).toMatch(
			/@media \(max-width:767px\)\{[^}]*--sgs-mh-to-ring:0px/
		);
		[
			'hover ring dropped at a zero spread',
			'hover ring dropped with no colour',
			'hover ring refused on a block that sets a shadow',
			'hover ring refused through the root target on a shadowed wrapper',
			'hover ring refused by a hover shadow',
			'hover ring refused by the native shadow support',
		].forEach( ( name ) => expect( css( name ) ).not.toContain( '--sgs-mh-to-ring' ) );
		expect( css( "hover ring kept when the block's shadow is none" ) ).toContain( '--sgs-mh-to-ring:4px;' );
		expect( css( 'hover ring refused on a block that sets a shadow' ) ).toContain( '--sgs-mh-to-ty:' );
	} );

	it( 'two parts on one element: the earlier-declared part keeps the hover state and entrance', () => {
		const shared = js.find( ( r ) => r.name.startsWith( 'shared element: item and current' ) );
		expect( shared.losers ).toEqual( { current: 'item' } );
		const current = shared.plans.find( ( p ) => p.target === 'current' );
		const item = shared.plans.find( ( p ) => p.target === 'item' );
		expect( current.attrs ).toEqual( {} );
		expect( item.attrs[ 'data-sgs-mh' ] ).toBe( 'root' );
		expect( item.attrs[ 'data-sgs-me' ] ).toBe( 'scroll translate' );
		expect( shared.css.match( /transition:/g ) ).toHaveLength( 1 );
	} );

	it( 'an empty motion attribute emits no CSS and no plan', () => {
		const empty = js.find( ( r ) => r.name === 'empty motion' );
		expect( empty.css ).toBe( '' );
		expect( empty.plans ).toEqual( [] );
		expect( emitScopedCss( undefined, { blockName: 'sgs/hero', elements: {}, root: '.x' } ) ).toEqual( EMPTY );
	} );

	it( 'a planted emitted-value change is caught', () => {
		const at = js.findIndex( ( r ) => r.name === 'hover part per device' );
		const planted = js.map( ( r, i ) =>
			i === at ? { ...r, css: r.css.replace( '--sgs-mh-to-s:1.04', '--sgs-mh-to-s:1.05' ) } : r
		);
		expect( planted[ at ].css ).not.toBe( js[ at ].css );
		expect( mismatches( planted, php ) ).toHaveLength( 1 );
	} );
} );

describe( 'canvas custom-target refusal (the twin of Sgs_Motion_Custom_Target and selectorProblem)', () => {
	const review = { draftNode: 'card title', reason: 'no declared part' };
	const hover = { hover: { state: { values: { translateX: 2 } } } };
	const emit = ( selector, element = { review } ) =>
		emitScopedCss(
			{ v: 1, elements: { 'custom:1': { selector, ...element, ...hover } } },
			{ blockName: 'sgs/hero', elements: {}, root: '.sgs-m-x' }
		);

	it.each( [ 'a{color:red}', 'a</style>', 'a;b', 'body .x' ] )( 'refuses %s: no CSS and no plan', ( selector ) => {
		expect( isScoped( selector ) ).toBe( false );
		expect( emit( selector ) ).toEqual( EMPTY );
	} );

	it( 'accepts .card .title, prefixed by the scoped root', () => {
		expect( isScoped( '.card .title' ) ).toBe( true );
		const out = emit( '.card .title' );
		expect( out.plans ).toHaveLength( 1 );
		expect( out.plans[ 0 ].selector ).toBe( '.sgs-m-x .card .title' );
		expect( out.css.startsWith( '.sgs-m-x .card .title{' ) ).toBe( true );
	} );

	it( 'refuses an unreviewed custom target', () => {
		expect( emit( '.card .title', {} ).plans ).toEqual( [] );
		expect(
			resolveTarget( 'sgs/hero', {}, '.r', 'custom:1', {
				selector: '.card .title',
				review: { draftNode: ' ', reason: 'x' },
			} )
		).toBeNull();
	} );

	it( 'refuses a list, a sibling start, :root and an over-long selector', () => {
		[ '.a, .b', '~ .a', '+ .a', ':root .a', '.a' + 'b'.repeat( 200 ) ].forEach( ( selector ) =>
			expect( isScoped( selector ) ).toBe( false )
		);
		expect( isScoped( '> .a [data-x="1"]:hover' ) ).toBe( true );
	} );
} );
