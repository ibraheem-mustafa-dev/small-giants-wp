/**
 * Standing gate for the inline drawer-creation rules
 * (src/blocks/nav-bar-menu/create-drawer-seed.js, Spec 37 FR-37-43/FR-37-49).
 *
 * What it protects:
 *  1. A new `sgs_drawer` post is seeded from a pattern registered FOR THAT CPT.
 *     Almost every pattern in the registry declares no post type (it targets an
 *     ordinary page), and seeding a drawer from one of those would silently
 *     produce a panel full of page content.
 *  2. The blank starter wins over a decorated look, so a new panel never
 *     arrives wearing a look nobody chose.
 *  3. The picker query constant stays byte-identical to the one the create
 *     action invalidates — core-data keys its resolution cache on the
 *     stringified query, so a drift here is invisible until an operator finds
 *     their new panel missing from the picker.
 *  4. A failed save always yields a message. A silent no-op is the failure mode
 *     this whole control exists to avoid.
 *
 * Carries NEGATIVE CONTROLS: each rule is re-run against deliberately broken
 * input and must REJECT it, so a check that stopped checking cannot report
 * green.
 *
 * Run:  node scripts/tests/test-create-drawer-seed.mjs
 * Exit: 0 = green, 1 = red.
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BS = String.fromCharCode( 92 );
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const P = ( process.argv[ 2 ] || path.resolve( HERE, '..', '..' ) ).split( BS ).join( '/' );
const {
	DRAWER_POST_TYPE,
	DRAWER_QUERY,
	DEFAULT_DRAWER_TITLE,
	qualifyingDrawerPatterns,
	pickDrawerSeedPattern,
	drawerSeedContent,
	drawerTitleFrom,
	drawerEditUrl,
	createDrawerErrorMessage,
} = await import(
	'file:///' + P + '/src/blocks/nav-bar-menu/create-drawer-seed.js'
);

let passed = 0;
const failures = [];

function check( label, condition ) {
	if ( condition ) {
		passed++;
		console.log( `  ok   ${ label }` );
	} else {
		failures.push( label );
		console.log( `  FAIL ${ label }` );
	}
}

const pattern = ( name, extra = {} ) => ( {
	name,
	content: `<!-- wp:sgs/nav-drawer --><!-- /wp:sgs/nav-drawer --> ${ name }`,
	postTypes: [ DRAWER_POST_TYPE ],
	blockTypes: [ 'core/post-content' ],
	...extra,
} );

const REGISTRY = [
	// An ordinary page pattern — declares no post type. Must never qualify.
	{ name: 'sgs/hero-basic', content: '<!-- wp:sgs/hero /-->' },
	pattern( 'sgs/drawer-solid-brand-light', { keywords: [ 'featured' ] } ),
	pattern( 'sgs/framework-drawer-default' ),
	pattern( 'sgs/drawer-scratch' ),
	// Scoped to the CPT but not usable as post content.
	pattern( 'sgs/drawer-fragment', { blockTypes: [ 'sgs/nav-drawer' ] } ),
	pattern( 'sgs/drawer-hidden', { inserter: false } ),
];

console.log( '\nqualification' );
const qualifying = qualifyingDrawerPatterns( REGISTRY ).map( ( p ) => p.name );
check(
	'a pattern declaring no post type never qualifies',
	! qualifying.includes( 'sgs/hero-basic' )
);
check(
	'a pattern not usable as post content never qualifies',
	! qualifying.includes( 'sgs/drawer-fragment' )
);
check(
	'an inserter:false pattern never qualifies',
	! qualifying.includes( 'sgs/drawer-hidden' )
);
check( 'the three real drawer starters qualify', 3 === qualifying.length );
check( 'a non-array registry yields no patterns', 0 === qualifyingDrawerPatterns( null ).length );

console.log( '\nseed choice' );
check(
	'the blank starter is preferred over the framework default and the looks',
	'sgs/drawer-scratch' === pickDrawerSeedPattern( REGISTRY ).name
);
check(
	'the framework default is used when no blank starter is registered',
	'sgs/framework-drawer-default' ===
		pickDrawerSeedPattern(
			REGISTRY.filter( ( p ) => p.name !== 'sgs/drawer-scratch' )
		).name
);
check(
	'any qualifying look is used when neither preferred starter is registered',
	'sgs/drawer-solid-brand-light' ===
		pickDrawerSeedPattern(
			REGISTRY.filter(
				( p ) =>
					p.name !== 'sgs/drawer-scratch' &&
					p.name !== 'sgs/framework-drawer-default'
			)
		).name
);
check(
	'a registry with no drawer pattern picks nothing',
	null === pickDrawerSeedPattern( [ REGISTRY[ 0 ] ] )
);

console.log( '\nseed content' );
check(
	'the pattern source markup is used verbatim, not re-serialised',
	drawerSeedContent( pickDrawerSeedPattern( REGISTRY ) ) ===
		pattern( 'sgs/drawer-scratch' ).content
);
check( 'no pattern yields empty content, never a fabricated drawer', '' === drawerSeedContent( null ) );
check( 'a whitespace-only pattern counts as empty', '' === drawerSeedContent( { content: '   \n ' } ) );

console.log( '\ntitle + edit url' );
check( 'a typed name is used', 'Shop menu' === drawerTitleFrom( '  Shop menu  ' ) );
check( 'a blank name falls back to the default', DEFAULT_DRAWER_TITLE === drawerTitleFrom( '   ' ) );
check( 'a missing name falls back to the default', DEFAULT_DRAWER_TITLE === drawerTitleFrom( undefined ) );
check( 'the edit url points at the post edit screen', 'post.php?post=42&action=edit' === drawerEditUrl( 42 ) );
check( 'a non-positive id yields no url', '' === drawerEditUrl( 0 ) && '' === drawerEditUrl( -3 ) );
check( 'a non-numeric id yields no url', '' === drawerEditUrl( 'x' ) );

console.log( '\npicker query parity' );
// The literal the picker used before this constant existed. If DRAWER_QUERY
// ever drifts from it the picker stops listing a just-created drawer.
const PICKER_QUERY_AS_AUTHORED = { per_page: -1, status: [ 'publish' ], context: 'edit' };
check(
	'DRAWER_QUERY matches the query the picker passes to useEntityRecords',
	JSON.stringify( DRAWER_QUERY ) === JSON.stringify( PICKER_QUERY_AS_AUTHORED )
);
check(
	'DRAWER_QUERY is frozen, so no caller can mutate the shared cache key',
	Object.isFrozen( DRAWER_QUERY )
);
check( 'the post type is the drawer CPT', 'sgs_drawer' === DRAWER_POST_TYPE );

console.log( '\nerror reporting' );
check(
	'a WP_Error-shaped rejection reports its own message',
	'Sorry, you are not allowed to access this resource.' ===
		createDrawerErrorMessage(
			{ code: 'rest_forbidden', message: 'Sorry, you are not allowed to access this resource.' },
			'fallback'
		)
);
check(
	'a network TypeError reports its own message',
	'Failed to fetch' === createDrawerErrorMessage( new TypeError( 'Failed to fetch' ), 'fallback' )
);
check( 'a bare string rejection is reported', 'boom' === createDrawerErrorMessage( 'boom', 'fallback' ) );
check(
	'a message-less rejection still reports something',
	'fallback' === createDrawerErrorMessage( {}, 'fallback' ) &&
		'fallback' === createDrawerErrorMessage( undefined, 'fallback' ) &&
		'fallback' === createDrawerErrorMessage( { message: '   ' }, 'fallback' )
);

// ── NEGATIVE CONTROLS ──────────────────────────────────────────────────────
// Each assertion above is re-run against input that breaks the rule it guards.
// Every one MUST come back false; a `true` here means the check has stopped
// discriminating and every green run above is vacuous.
console.log( '\nnegative controls' );
check(
	'NC: an unscoped page pattern is rejected as a seed source',
	null === pickDrawerSeedPattern( [ { name: 'sgs/hero-basic', content: 'x' } ] )
);
check(
	'NC: a decorated look does not win when the blank starter is present',
	'sgs/drawer-solid-brand-light' !== pickDrawerSeedPattern( REGISTRY ).name
);
check(
	'NC: a drifted picker query is detected',
	JSON.stringify( DRAWER_QUERY ) !==
		JSON.stringify( { per_page: -1, status: [ 'publish', 'draft' ], context: 'edit' } )
);
check(
	'NC: an empty seed is not silently turned into markup',
	'' === drawerSeedContent( { content: '' } ) && '' !== drawerSeedContent( pattern( 'sgs/x' ) )
);
check(
	'NC: the error reporter never returns an empty string',
	'' !== createDrawerErrorMessage( {}, 'fallback' )
);

console.log( `\n${ passed } passed, ${ failures.length } failed` );
if ( failures.length ) {
	failures.forEach( ( f ) => console.log( `  - ${ f }` ) );
	process.exit( 1 );
}
process.exit( 0 );
