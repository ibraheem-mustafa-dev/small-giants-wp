/**
 * Declared spacing defaults (`block.json::supports.sgs.spacingDefaults`).
 *
 * 1. `spacingDefaultsFor()` reads a block's declaration for one attribute and nothing else.
 * 2. Every block that declares a default paints exactly that from its stylesheet (Bean D1, 2026-10-09): for each
 *    declared base side, the element's base rule in `style.css` (outside @media / @container) reads
 *    `var(--wp--preset--spacing--<slug>[, <fallback>])` with the declared slug, or the declared literal length. A
 *    fallback, where the rule has one, is a value, so the shorthand the build folds the sides into stays valid on a
 *    scale without that slug. `scripts/survey-spacing-defaults.py --check --strict` gates the same parity (and the
 *    fallback's size) with the census's fuller selector resolution, and gates every `tablet` / `mobile` / `when`
 *    value against the media or variant rule that paints it.
 *
 * Negative control: `stylesheetSides()` run on a rule whose side names a different preset, a bare preset, a length
 * other than the declared one, or a media-conditional override reports that side as different, which fails the
 * parity assertion.
 */

jest.mock( '@wordpress/blocks', () => ( { getBlockType: jest.fn() } ) );

const fs = require( 'fs' );
const path = require( 'path' );
const { getBlockType } = require( '@wordpress/blocks' );
const { spacingDefaultsFor } = require( '../../src/utils/spacing-defaults' );

const BLOCKS = path.join( __dirname, '..', '..', 'src', 'blocks' );
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const PRESET = /^var\(\s*--wp--preset--spacing--([\w-]+)\s*(,[^)]*)?\)$/;
const DECLARED_PRESET = /^var\(\s*--wp--preset--spacing--([\w-]+)\s*\)$/;
const LENGTH = /^\d*\.?\d+(px|rem)$/;

describe( 'spacingDefaultsFor', () => {
	afterEach( () => getBlockType.mockReset() );

	it( 'returns the declared sides for the attribute, presets and literal lengths alike', () => {
		getBlockType.mockReturnValue( {
			supports: {
				sgs: { spacingDefaults: { pad: { top: 'var(--wp--preset--spacing--30)', right: '20px', left: '' } } },
			},
		} );
		expect( spacingDefaultsFor( 'sgs/x', 'pad' ) ).toEqual( {
			top: 'var(--wp--preset--spacing--30)',
			right: '20px',
		} );
		expect( getBlockType ).toHaveBeenCalledWith( 'sgs/x' );
	} );

	it( 'returns {} for an undeclared attribute, an unknown block or a malformed entry', () => {
		getBlockType.mockReturnValue( { supports: { sgs: { spacingDefaults: { pad: [ 'x' ] } } } } );
		expect( spacingDefaultsFor( 'sgs/x', 'other' ) ).toEqual( {} );
		expect( spacingDefaultsFor( 'sgs/x', 'pad' ) ).toEqual( {} );
		getBlockType.mockReturnValue( undefined );
		expect( spacingDefaultsFor( 'sgs/missing', 'pad' ) ).toEqual( {} );
	} );
} );

describe( 'spacingDefaultsFor with a tier and settings', () => {
	const preset = ( slug ) => `var(--wp--preset--spacing--${ slug })`;
	const box = ( top, right = top, bottom = top, left = right ) => ( { top, right, bottom, left } );
	const declare = ( padding ) =>
		getBlockType.mockReturnValue( { supports: { sgs: { spacingDefaults: { padding } } } } );
	afterEach( () => getBlockType.mockReset() );

	// A media rule repaints the block on a phone (the CTA section shape).
	const cta = { ...box( preset( 60 ), preset( 40 ) ), mobile: box( preset( 40 ), preset( 30 ) ) };

	it( 'without a context returns the base, as before', () => {
		declare( cta );
		expect( spacingDefaultsFor( 'sgs/x', 'padding' ) ).toEqual( box( preset( 60 ), preset( 40 ) ) );
		expect( spacingDefaultsFor( 'sgs/x', 'padding', {} ) ).toEqual( box( preset( 60 ), preset( 40 ) ) );
	} );

	it( 'returns the base on desktop, "base" and an unknown tier', () => {
		declare( cta );
		[ 'desktop', 'base', 'wide', undefined ].forEach( ( tier ) => {
			expect( spacingDefaultsFor( 'sgs/x', 'padding', { tier } ) ).toEqual( box( preset( 60 ), preset( 40 ) ) );
		} );
	} );

	it( 'returns the mobile override on mobile', () => {
		declare( cta );
		expect( spacingDefaultsFor( 'sgs/x', 'padding', { tier: 'mobile' } ) ).toEqual( box( preset( 40 ), preset( 30 ) ) );
	} );

	it( 'lets tablet inherit desktop when it has no entry of its own, and mobile inherit tablet', () => {
		declare( cta );
		expect( spacingDefaultsFor( 'sgs/x', 'padding', { tier: 'tablet' } ) ).toEqual( box( preset( 60 ), preset( 40 ) ) );
		declare( { ...box( '20px' ), tablet: { top: '16px' }, mobile: { left: '8px' } } );
		expect( spacingDefaultsFor( 'sgs/x', 'padding', { tier: 'tablet' } ) ).toEqual( { ...box( '20px' ), top: '16px' } );
		// Mobile: its own left, tablet's top, desktop's rest, side by side as a stored wider-tier value cascades.
		expect( spacingDefaultsFor( 'sgs/x', 'padding', { tier: 'mobile' } ) ).toEqual( {
			top: '16px',
			right: '20px',
			bottom: '20px',
			left: '8px',
		} );
	} );

	// A card look repaints the review card (the Google Reviews shape).
	const looks = {
		...box( '20px' ),
		when: [
			{ attrs: { cardStyle: 'boxed' }, classes: [ 'x--card-boxed' ], ...box( '28px' ) },
			{ attrs: { cardStyle: 'bubble' }, classes: [ 'x--card-bubble' ], ...box( '0' ), mobile: box( '4px' ) },
		],
	};
	const atLook = ( cardStyle, tier ) =>
		spacingDefaultsFor( 'sgs/x', 'padding', { attributes: { cardStyle }, tier } );

	it( 'returns the matching when entry, else the base', () => {
		declare( looks );
		expect( atLook( 'boxed' ) ).toEqual( box( '28px' ) );
		expect( atLook( 'bubble' ) ).toEqual( box( '0' ) );
		expect( atLook( 'flat' ) ).toEqual( box( '20px' ) );
		expect( spacingDefaultsFor( 'sgs/x', 'padding', { attributes: {} } ) ).toEqual( box( '20px' ) );
	} );

	it( 'applies a when entry tier override only on that tier and only when it matches', () => {
		declare( looks );
		expect( atLook( 'bubble', 'tablet' ) ).toEqual( box( '0' ) );
		expect( atLook( 'bubble', 'mobile' ) ).toEqual( box( '4px' ) );
		expect( atLook( 'boxed', 'mobile' ) ).toEqual( box( '28px' ) );
		expect( atLook( 'flat', 'mobile' ) ).toEqual( box( '20px' ) );
	} );

	it( 'matches the first when entry whose every attribute pair equals the block, booleans included', () => {
		declare( {
			...box( '12px' ),
			when: [
				{ attrs: { orientation: 'horizontal', mobileLayout: 'stack' }, ...box( '1px' ) },
				{ attrs: { orientation: 'horizontal' }, ...box( '2px' ) },
				{ attrs: { dense: true }, ...box( '3px' ) },
			],
		} );
		const at = ( attributes ) => spacingDefaultsFor( 'sgs/x', 'padding', { attributes } ).top;
		expect( at( { orientation: 'horizontal', mobileLayout: 'stack' } ) ).toBe( '1px' );
		expect( at( { orientation: 'horizontal', mobileLayout: 'row' } ) ).toBe( '2px' );
		expect( at( { orientation: 'vertical', dense: true } ) ).toBe( '3px' );
		expect( at( { orientation: 'vertical', dense: 'true' } ) ).toBe( '12px' );
	} );

	it( 'a when entry with no attrs never matches, and a malformed when or tier entry is ignored', () => {
		declare( { ...box( '12px' ), when: [ { ...box( '1px' ) }, { attrs: {}, ...box( '2px' ) }, 'x', null ], mobile: 'x' } );
		expect( spacingDefaultsFor( 'sgs/x', 'padding', { attributes: { a: 1 }, tier: 'mobile' } ) ).toEqual( box( '12px' ) );
		declare( { ...box( '12px' ), when: { attrs: { a: 1 } } } );
		expect( spacingDefaultsFor( 'sgs/x', 'padding', { attributes: { a: 1 } } ) ).toEqual( box( '12px' ) );
	} );

	it( 'never returns a tier or when key as a side, and a flat declaration resolves identically at every tier', () => {
		declare( { ...box( '12px' ), mobile: box( '4px' ), when: [] } );
		expect( Object.keys( spacingDefaultsFor( 'sgs/x', 'padding', { tier: 'mobile' } ) ).sort() ).toEqual( [
			'bottom',
			'left',
			'right',
			'top',
		] );
		declare( { top: preset( 30 ), right: '20px', left: '' } );
		[ undefined, 'desktop', 'tablet', 'mobile' ].forEach( ( tier ) => {
			expect( spacingDefaultsFor( 'sgs/x', 'padding', { tier, attributes: { a: 1 } } ) ).toEqual( {
				top: preset( 30 ),
				right: '20px',
			} );
		} );
	} );

	it( 'negative control: ignoring the tier or the settings returns the base, which differs from the repaint', () => {
		declare( { ...cta, when: [ { attrs: { look: 'big' }, ...box( '28px' ) } ] } );
		const base = spacingDefaultsFor( 'sgs/x', 'padding' );
		expect( spacingDefaultsFor( 'sgs/x', 'padding', { tier: 'mobile' } ) ).not.toEqual( base );
		expect( spacingDefaultsFor( 'sgs/x', 'padding', { attributes: { look: 'big' } } ) ).not.toEqual( base );
	} );
} );

describe( 'the shipped declarations resolve per tier and setting', () => {
	const read = ( dir ) => JSON.parse( fs.readFileSync( path.join( BLOCKS, dir, 'block.json' ), 'utf8' ) );
	const resolve = ( dir, attr, context ) => {
		getBlockType.mockReturnValue( read( dir ) );
		return spacingDefaultsFor( `sgs/${ dir }`, attr, context );
	};
	afterEach( () => getBlockType.mockReset() );

	it( 'sgs/tabs tabPadding: the compact mobile padding only for horizontal tabs that stack', () => {
		const at = ( attributes, tier ) => resolve( 'tabs', 'tabPadding', { attributes, tier } );
		const stacked = { orientation: 'horizontal', mobileLayout: 'stack' };
		expect( at( stacked, 'desktop' ) ).toEqual( { top: '12px', right: '20px', bottom: '12px', left: '20px' } );
		expect( at( stacked, 'mobile' ) ).toEqual( { top: '0.875rem', right: 'var(--wp--preset--spacing--30)', bottom: '0.875rem', left: 'var(--wp--preset--spacing--30)' } );
		expect( at( { ...stacked, mobileLayout: 'row' }, 'mobile' ).top ).toBe( '12px' );
		expect( at( { ...stacked, orientation: 'vertical' }, 'mobile' ).top ).toBe( '12px' );
	} );

	it( 'sgs/google-reviews cardPadding: each card look paints its own padding', () => {
		const at = ( cardStyle ) =>
			resolve( 'google-reviews', 'cardPadding', { attributes: { cardStyle }, tier: 'desktop' } ).top;
		expect( [ 'google-card', 'flat', 'bordered', 'elevated' ].map( at ) ).toEqual( [ '20px', '20px', '20px', '20px' ] );
		expect( [ 'boxed', 'wall-tile', 'bubble', 'quote-minimal' ].map( at ) ).toEqual( [ '28px', 'var(--wp--preset--spacing--30)', '0', '0' ] );
	} );
} );

const kebab = ( name ) => name.replace( /([a-z0-9])([A-Z])/g, '$1-$2' ).toLowerCase();
const escapeRe = ( s ) => s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );

/** Split a value on top-level whitespace (a var() with a fallback stays one token). */
function tokens( value ) {
	const out = [];
	let depth = 0;
	let cur = '';
	for ( const ch of value.trim() ) {
		if ( '(' === ch ) {
			depth++;
		} else if ( ')' === ch ) {
			depth--;
		}
		if ( /\s/.test( ch ) && 0 === depth ) {
			if ( cur ) {
				out.push( cur );
			}
			cur = '';
		} else {
			cur += ch;
		}
	}
	if ( cur ) {
		out.push( cur );
	}
	return out;
}

/** The stylesheet without comments and without its @media / @container / @supports blocks (not base defaults). */
function baseCss( css ) {
	const clean = css.replace( /\/\*[\s\S]*?\*\//g, '' );
	let out = '';
	let i = 0;
	const at = /@(media|container|supports)[^{]*\{/g;
	let match;
	while ( ( match = at.exec( clean ) ) ) {
		out += clean.slice( i, match.index );
		let depth = 1;
		let j = at.lastIndex;
		while ( depth && j < clean.length ) {
			depth += '{' === clean[ j ] ? 1 : 0;
			depth -= '}' === clean[ j ] ? 1 : 0;
			j++;
		}
		i = j;
		at.lastIndex = j;
	}
	return out + clean.slice( i );
}

/** A block-private custom property read with a fallback (`var(--sgs-x, 12px 20px)`) paints its fallback. */
function unwrapPrivateVars( value ) {
	let prev;
	let next = value;
	do {
		prev = next;
		next = next.replace( /var\(\s*--(?!wp--)[\w-]+\s*,\s*((?:[^()]|\([^()]*\))*)\)/g, '$1' );
	} while ( next !== prev );
	return next.trim();
}

const LOGICAL = { 'block-start': [ 'top' ], 'block-end': [ 'bottom' ], 'inline-start': [ 'left' ], 'inline-end': [ 'right' ] };

/**
 * The side values the base (not media-conditional, not variant-class) rules ending in one of `classNames` give
 * `family`; the last rule wins.
 *
 * @param {string}   css        Stylesheet source.
 * @param {string[]} classNames Element classes without the dot.
 * @param {string}   family     'padding' or 'margin'.
 * @return {Object} `{ side: value }`.
 */
function stylesheetSides( css, classNames, family ) {
	const sides = {};
	const rule = /([^{}]+)\{([^{}]*)\}/g;
	const ends = classNames.map( ( c ) => new RegExp( `\\.${ escapeRe( c ) }$` ) );
	const source = baseCss( css );
	let match;
	while ( ( match = rule.exec( source ) ) ) {
		const selectors = match[ 1 ].split( ',' ).map( ( s ) => s.replace( /:where\(\s*([^()]*?)\s*\)/g, '$1' ).trim() );
		// A selector keyed on a variant class (`.x--look-boxed .x__card`) is a repaint, which the census gates.
		if ( ! selectors.some( ( s ) => ! /--/.test( s ) && ends.some( ( re ) => re.test( s ) ) ) ) {
			continue;
		}
		match[ 2 ].split( ';' ).forEach( ( decl ) => {
			const colon = decl.indexOf( ':' );
			if ( colon < 0 ) {
				return;
			}
			const prop = decl.slice( 0, colon ).trim();
			const value = unwrapPrivateVars( decl.slice( colon + 1 ).trim() );
			const suffix = prop.slice( family.length + 1 );
			if ( prop === family ) {
				const [ top, right = top, bottom = top, left = right ] = tokens( value );
				Object.assign( sides, { top, right, bottom, left } );
			} else if ( prop.startsWith( `${ family }-` ) && SIDES.includes( suffix ) ) {
				sides[ suffix ] = value;
			} else if ( prop.startsWith( `${ family }-` ) && LOGICAL[ suffix ] ) {
				sides[ LOGICAL[ suffix ][ 0 ] ] = value;
			} else if ( prop === `${ family }-block` || prop === `${ family }-inline` ) {
				const [ a, b = a ] = tokens( value );
				Object.assign( sides, prop.endsWith( 'block' ) ? { top: a, bottom: b } : { left: a, right: b } );
			}
		} );
	}
	return sides;
}

/** The classes a block's element is painted by: its BEM element class, or for the wrapper the root aliases. */
function elementClasses( dir, json, elementKey, element ) {
	if ( ! element?.isWrapper ) {
		return [ `sgs-${ dir }__${ kebab( elementKey ) }` ];
	}
	const names = new Set( [ `wp-block-sgs-${ dir }`, `sgs-${ dir }` ] );
	const root = json.selectors?.root;
	if ( /^\.[-\w]+$/.test( root ?? '' ) ) {
		names.add( root.slice( 1 ) );
	}
	// A shorter root class render.php prints (sgs/countdown-timer's root is `.sgs-countdown`).
	const render = path.join( BLOCKS, dir, 'render.php' );
	if ( fs.existsSync( render ) ) {
		( fs.readFileSync( render, 'utf8' ).match( /\bsgs-[a-z0-9-]+\b/g ) ?? [] )
			.filter( ( c ) => `sgs-${ dir }`.startsWith( `${ c }-` ) )
			.forEach( ( c ) => names.add( c ) );
	}
	return [ ...names ];
}

const declaring = fs
	.readdirSync( BLOCKS )
	.map( ( dir ) => [ dir, path.join( BLOCKS, dir, 'block.json' ) ] )
	.filter( ( [ , file ] ) => fs.existsSync( file ) )
	.map( ( [ dir, file ] ) => [ dir, JSON.parse( fs.readFileSync( file, 'utf8' ) ) ] )
	.filter( ( [ , json ] ) => json.supports?.sgs?.spacingDefaults );

const cases = [];
declaring.forEach( ( [ dir, json ] ) => {
	const elements = json.supports.sgs.elements ?? {};
	Object.entries( json.supports.sgs.spacingDefaults ).forEach( ( [ attr, sides ] ) => {
		const [ elementKey, element ] =
			Object.entries( elements ).find( ( [ , el ] ) =>
				Object.entries( el.attrMap ?? {} ).some( ( [ k, v ] ) => v === attr && /^css:(padding|margin)$/.test( k ) )
			) ?? [];
		const family = Object.entries( element?.attrMap ?? {} )
			.find( ( [ k, v ] ) => v === attr && /^css:(padding|margin)$/.test( k ) )?.[ 0 ]
			.slice( 4 );
		// The base sides only: `tablet`, `mobile` and `when` are repaints, which the census gates against their rules.
		Object.entries( sides )
			.filter( ( [ side ] ) => SIDES.includes( side ) )
			.forEach( ( [ side, value ] ) => {
				cases.push( [ `${ dir }.${ attr }.${ side }`, dir, json, elementKey, element, family, side, value ] );
			} );
	} );
} );

describe( 'a declared default is what the stylesheet paints', () => {
	it( 'blocks declare defaults (sgs/cart among them)', () => {
		expect( declaring.map( ( [ dir ] ) => dir ) ).toContain( 'cart' );
	} );

	it.each( cases )( '%s', ( label, dir, json, elementKey, element, family, side, value ) => {
		expect( elementKey ).toBeDefined();
		const css = fs.readFileSync( path.join( BLOCKS, dir, 'style.css' ), 'utf8' );
		const painted = stylesheetSides( css, elementClasses( dir, json, elementKey, element ), family )[ side ] ?? '';
		const declared = value.match( DECLARED_PRESET );
		if ( declared ) {
			const preset = painted.match( PRESET );
			expect( preset?.[ 1 ] ).toBe( declared[ 1 ] );
			// A fallback, where the rule has one, is a value: it keeps the folded shorthand valid where the scale lacks the slug.
			if ( undefined !== preset?.[ 2 ] ) {
				expect( preset[ 2 ] ).toMatch( /^,\s*\S+/ );
			}
		} else {
			expect( value ).toMatch( LENGTH );
			expect( painted ).toBe( value );
		}
	} );

	it( 'negative control: a different preset, a bare preset, another length or a media override is caught', () => {
		const css =
			'.x :where(.sgs-a__b) { padding: var(--wp--preset--spacing--30, 1rem) 20px; padding-bottom: var(--wp--preset--spacing--40); }' +
			'@media (max-width: 600px) { .sgs-a__b { padding-left: 14px; } }' +
			'.sgs-a__b { margin-block-end: var(--sgs-private, 8px); }';
		const sides = stylesheetSides( css, [ 'sgs-a__b' ], 'padding' );
		expect( sides.top.match( PRESET )[ 1 ] ).toBe( '30' );
		expect( sides.top.match( PRESET )[ 1 ] ).not.toBe( '40' );
		expect( sides.right.match( PRESET ) ).toBeNull();
		expect( sides.right ).not.toBe( '24px' );
		expect( sides.bottom.match( PRESET )[ 2 ] ).toBeUndefined();
		// The media rule is not the base default: left stays the base rule's 20px.
		expect( sides.left ).toBe( '20px' );
		expect( stylesheetSides( css, [ 'sgs-a__b' ], 'margin' ).bottom ).toBe( '8px' );
	} );
} );
