/**
 * Standing gate for the Starter Look owned-key rules
 * (src/components/starter-look-owned-keys.js, FR-37-47).
 *
 * What it protects: applying a starter look must write ONLY the attributes some
 * look explicitly declares. The defect this closes was silent — `parse()` from
 * `@wordpress/blocks` fills every declared default, so applying any look wiped
 * `ariaLabel`, `drawerRef`, `backgroundImage` and friends with no error at all.
 *
 * Carries a NEGATIVE CONTROL: the non-owned-key assertion is re-run against a
 * deliberately broken builder and must REJECT it. Without that, a check that
 * stopped checking would keep reporting green.
 *
 * Run:  node scripts/tests/test-starter-look-owned-keys.mjs
 * Exit: 0 = green, 1 = red.
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BS = String.fromCharCode( 92 );
const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const P = ( process.argv[ 2 ] || path.resolve( HERE, '..', '..' ) ).split( BS ).join( '/' );
const {
	parseExplicitBlocks,
	findExplicitRoot,
	collectOwnedKeys,
	collectChildOwnedKeys,
	buildOwnedAttributes,
	matchChildrenByName,
	stripMetadataDeep,
} = await import( 'file:///' + P + '/src/components/starter-look-owned-keys.js' );

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

function equal( label, actual, expected ) {
	check( `${ label } (got ${ JSON.stringify( actual ) })`, JSON.stringify( actual ) === JSON.stringify( expected ) );
}

// --- Fixtures: three drawer looks, deliberately overlapping but not identical.
const ROOT = 'sgs/nav-drawer';

const floatingCard = {
	name: 'sgs/drawer-floating',
	keywords: [ 'featured' ],
	content: `<!-- wp:sgs/nav-drawer {"closeStyle":"corner","anchor":{"x":"right"},"panelSize":{"width":"420px"}} -->
<!-- wp:sgs/nav-drawer-menu {"listColumns":{"desktop":1},"itemFontSize":"18px"} /-->
<!-- /wp:sgs/nav-drawer -->`,
};

const twoColumn = {
	name: 'sgs/drawer-two-column',
	keywords: [ 'featured' ],
	content: `<!-- wp:sgs/nav-drawer {"closeStyle":"bar","drawerBg":"surface"} -->
<!-- wp:sgs/nav-drawer-menu {"listColumns":{"desktop":2}} /-->
<!-- wp:sgs/button {"label":"Book"} /-->
<!-- /wp:sgs/nav-drawer -->`,
};

// Hidden from the picker (no `featured` keyword) — must still contribute keys.
const hiddenLook = {
	name: 'sgs/drawer-hidden',
	content: `<!-- wp:sgs/nav-drawer {"drawerAlign":"start","metadata":{"name":"Hidden"}} -->
<!-- wp:sgs/nav-drawer-menu {"gap":"16px"} /-->
<!-- /wp:sgs/nav-drawer -->`,
};

const qualifying = [ floatingCard, twoColumn, hiddenLook ];

const drawerSchema = {
	closeStyle: { type: 'string', default: 'corner' },
	drawerBg: { type: 'string', default: 'canvas' },
	drawerAlign: { type: 'string', default: 'centre' },
	anchor: { type: 'object', default: { x: 'left' } },
	panelSize: { type: 'object', default: { width: '320px' } },
	ariaLabel: { type: 'string', default: '' },
	drawerRef: { type: 'string', default: '' },
	backgroundImage: { type: 'object', default: {} },
};

const menuSchema = {
	listColumns: { type: 'object', default: { desktop: 1 } },
	itemFontSize: { type: 'string', default: '16px' },
	gap: { type: 'string', default: '8px' },
	itemFontWeight: { type: 'string', default: '400' },
};

console.log( '\nRaw parser (explicit attributes only)' );
const parsedFloating = parseExplicitBlocks( floatingCard.content );
equal( 'top-level block count', parsedFloating.length, 1 );
equal( 'root name', parsedFloating[ 0 ].name, ROOT );
equal( 'self-closing child captured', parsedFloating[ 0 ].innerBlocks.map( ( b ) => b.name ), [
	'sgs/nav-drawer-menu',
] );
equal( 'explicit attrs only', Object.keys( parsedFloating[ 0 ].attrs ).sort(), [
	'anchor',
	'closeStyle',
	'panelSize',
] );
equal( 'core shorthand namespaced', parseExplicitBlocks( '<!-- wp:paragraph /-->' )[ 0 ].name, 'core/paragraph' );
equal( 'empty content', parseExplicitBlocks( '' ), [] );
equal(
	'root picked by name, not position',
	findExplicitRoot(
		parseExplicitBlocks( `<!-- wp:core/spacer /-->\n${ floatingCard.content }` ),
		ROOT
	).name,
	ROOT
);

console.log( '\nOwned-key union' );
const ownedRoot = collectOwnedKeys( qualifying, ROOT );
equal( 'root union across all looks', ownedRoot, [
	'anchor',
	'closeStyle',
	'drawerAlign',
	'drawerBg',
	'panelSize',
] );
check( 'metadata is never owned', ! ownedRoot.includes( 'metadata' ) );
check(
	'a look hidden by `featured` still contributes (drawerAlign)',
	ownedRoot.includes( 'drawerAlign' ) &&
		! collectOwnedKeys( [ floatingCard, twoColumn ], ROOT ).includes( 'drawerAlign' )
);
check(
	'attributes no look declares are not owned',
	! ownedRoot.includes( 'ariaLabel' ) &&
		! ownedRoot.includes( 'drawerRef' ) &&
		! ownedRoot.includes( 'backgroundImage' )
);

const ownedChildren = collectChildOwnedKeys( qualifying, ROOT );
equal( 'child union by block name', ownedChildren[ 'sgs/nav-drawer-menu' ], [
	'gap',
	'itemFontSize',
	'listColumns',
] );
equal( 'sibling child block keyed separately', ownedChildren[ 'sgs/button' ], [ 'label' ] );
check( 'itemFontWeight declared by no look is not owned', ! ownedChildren[ 'sgs/nav-drawer-menu' ].includes( 'itemFontWeight' ) );

console.log( '\nAttribute patch' );
const explicitTwoColumn = findExplicitRoot( parseExplicitBlocks( twoColumn.content ), ROOT ).attrs;
const patch = buildOwnedAttributes( ownedRoot, explicitTwoColumn, drawerSchema );
equal( 'explicit value wins', patch.closeStyle, 'bar' );
equal( 'explicit value wins (drawerBg)', patch.drawerBg, 'surface' );
equal( 'unset owned key falls back to the declared default', patch.anchor, { x: 'left' } );
equal( 'unset owned key falls back to the declared default (panelSize)', patch.panelSize, {
	width: '320px',
} );
equal( 'patch keys are exactly the owned keys', Object.keys( patch ).sort(), ownedRoot );

const defaultAnchor = drawerSchema.anchor.default;
patch.anchor.x = 'mutated';
equal( 'defaults are deep-cloned, never shared with the schema', defaultAnchor, { x: 'left' } );

const menuPatch = buildOwnedAttributes(
	ownedChildren[ 'sgs/nav-drawer-menu' ],
	{ listColumns: { desktop: 2 } },
	menuSchema
);
equal( 'child explicit value wins', menuPatch.listColumns, { desktop: 2 } );
equal( 'child unset owned key resets to default', menuPatch.itemFontSize, '16px' );

/**
 * The reusable assertion under negative control: a patch may contain NOTHING
 * outside the owned set.
 *
 * @param {Object}        result    The built patch.
 * @param {Array<string>} ownedKeys The owned key set.
 * @throws {Error} When the patch carries a key no look owns.
 */
function assertNoNonOwnedKeys( result, ownedKeys ) {
	const strays = Object.keys( result ).filter( ( key ) => ! ownedKeys.includes( key ) );
	if ( strays.length > 0 ) {
		throw new Error( `non-owned keys written: ${ strays.join( ', ' ) }` );
	}
}

let realPassed = true;
try {
	assertNoNonOwnedKeys( patch, ownedRoot );
} catch ( e ) {
	realPassed = false;
}
check( 'real builder writes no non-owned key', realPassed );

console.log( '\nNegative control' );
// A builder that also forwards every explicit attribute — the exact regression
// shape "apply the whole parsed attribute bag" would reintroduce.
function brokenBuildOwnedAttributes( ownedKeys, explicit, schema ) {
	return { ...buildOwnedAttributes( ownedKeys, explicit, schema ), ariaLabel: '' };
}
let caught = false;
try {
	assertNoNonOwnedKeys( brokenBuildOwnedAttributes( ownedRoot, explicitTwoColumn, drawerSchema ), ownedRoot );
} catch ( e ) {
	caught = /ariaLabel/.test( e.message );
}
check( 'the non-owned-key assertion REJECTS a deliberately broken builder', caught );

console.log( '\nChild matching' );
equal(
	'matched by name, in order',
	matchChildrenByName(
		[ 'sgs/nav-drawer-menu', 'sgs/button' ],
		[ 'sgs/nav-drawer-menu', 'sgs/text', 'sgs/button' ]
	),
	[
		{ patternIndex: 0, liveIndex: 0 },
		{ patternIndex: 1, liveIndex: 2 },
	]
);
equal(
	'each live child is consumed at most once',
	matchChildrenByName(
		[ 'sgs/nav-drawer-menu', 'sgs/nav-drawer-menu' ],
		[ 'sgs/nav-drawer-menu' ]
	),
	[ { patternIndex: 0, liveIndex: 0 } ]
);
equal(
	'a pattern child with no live counterpart is skipped',
	matchChildrenByName( [ 'sgs/button' ], [ 'sgs/nav-drawer-menu' ] ),
	[]
);

console.log( '\nMetadata strip' );
const stripped = stripMetadataDeep( [
	{
		name: ROOT,
		attributes: { metadata: { name: 'x' }, drawerBg: 'surface' },
		innerBlocks: [ { name: 'sgs/container', attributes: { metadata: { name: 'y' } }, innerBlocks: [] } ],
	},
] );
equal( 'root metadata gone', Object.keys( stripped[ 0 ].attributes ), [ 'drawerBg' ] );
equal( 'nested metadata gone', Object.keys( stripped[ 0 ].innerBlocks[ 0 ].attributes ), [] );

const total = passed + failures.length;
if ( failures.length > 0 ) {
	console.log( `\nFAIL - ${ passed }/${ total } assertions\n` );
	failures.forEach( ( f ) => console.log( `  - ${ f }` ) );
	process.exit( 1 );
}
console.log( `\nPASS - ${ passed }/${ total } assertions\n` );
