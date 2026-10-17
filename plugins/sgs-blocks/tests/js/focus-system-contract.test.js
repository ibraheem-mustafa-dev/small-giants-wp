/**
 * The one keyboard focus system: contract for theme/sgs-theme/assets/css/focus.css (focus plan §2.2, §2.4; Spec 32 §14.5).
 *
 * Asserts that focus.css:
 *   - declares `outline`, `outline-offset` and `box-shadow` exactly once outside the slider-thumb arms, the
 *     `@supports` arms and the forced-colours block (one indicator, every look a token value);
 *   - carries `:not(#wpadminbar` on every arm (the (1,1,0) weight that replaces `!important`);
 *   - has no `!important`, no `transition`, and no `border-radius` on an element (the one allowed radius is
 *     `border-radius: inherit` on the signature `::before`, which paints the G3 band and never the button);
 *   - has the forced-colours, reduced-motion and contrast-more blocks;
 *   - repeats EVERY indicator arm (element, adjacent proxy, scoped proxy, preview, both thumb pseudo-elements) inside
 *     `@media (forced-colors: active)` with the identical selector, so `outline: <width> solid Highlight` and
 *     `box-shadow: none` win by source order at equal specificity on every stop (the shorthand, not `outline-color`,
 *     so the style is pinned and rule-reading probes see it);
 *   - turns the range input's own outline off (the thumb carries the ring; the browser's default ring would wrap the
 *     whole track as a second ring);
 *   - anchors the signature `::before` outside the host's border box through `--sgs-focus-host-border`, so the G3 band
 *     never lands on the outline ring of a bordered button;
 * and that no other theme stylesheet holds an indicator, apart from the files a later plan task owns (PENDING; an
 * entry that no longer holds a finding fails, so the list only shrinks).
 * Each focus.css check also runs against a planted fault (negative control), so a check that cannot fail fails here.
 *
 * FOCUS_CSS_FILE overrides the stylesheet path, for a manual negative control on a planted copy.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );

const REPO = path.resolve( __dirname, '..', '..', '..', '..' );
const THEME_CSS = path.join( REPO, 'theme', 'sgs-theme', 'assets', 'css' );
const CSS_FILE = process.env.FOCUS_CSS_FILE || path.join( THEME_CSS, 'focus.css' );
const { analyseCss } = require( '../../scripts/focus-system/classify-css.js' );

// Theme stylesheets whose focus rules a later task of the focus plan removes (the detector's group in brackets).
const PENDING = {
	'woocommerce.css': 'plan Task 6 (group woocommerce)',
	'dark-mode.css': 'plan Task 7 (group nav)',
};

const INDICATOR = new Set( [ 'outline', 'outline-offset', 'box-shadow' ] );
const FORCED = '(forced-colors: active)';
const norm = ( value ) => value.replace( /\s+/g, ' ' ).replace( /\s*,\s*/g, ', ' ).trim();

function atRuleChain( node ) {
	const chain = [];
	for ( let p = node.parent; p && 'root' !== p.type; p = p.parent ) {
		if ( 'atrule' === p.type ) {
			chain.push( `@${ p.name } ${ norm( p.params ) }` );
		}
	}
	return chain;
}

const inSupports = ( node ) => atRuleChain( node ).some( ( a ) => a.startsWith( '@supports' ) );
const inForced = ( node ) => atRuleChain( node ).some( ( a ) => a === `@media ${ FORCED }` );
const isThumb = ( rule ) => /::-(?:webkit-slider|moz-range)-thumb/.test( rule.selector );
const isArmSelector = ( sel ) => /:focus-visible|sgs-focus-proxy|sgs-focus-preview/.test( sel );

/** The focus.css checks, each returning a list of problems (empty when it holds). */
const CHECKS = {
	indicatorOnce( root ) {
		const counts = { outline: 0, 'outline-offset': 0, 'box-shadow': 0 };
		root.walkDecls( ( d ) => {
			if ( ! INDICATOR.has( d.prop ) || 'rule' !== d.parent.type ) {
				return;
			}
			if ( isThumb( d.parent ) || inSupports( d ) || inForced( d ) ) {
				return;
			}
			counts[ d.prop ]++;
		} );
		return Object.entries( counts ).filter( ( [ , n ] ) => 1 !== n ).map( ( [ p, n ] ) => `${ p } declared ${ n } times, want 1` );
	},
	everyArmExcludesAdminBar( root ) {
		const problems = [];
		root.walkRules( ( rule ) => {
			if ( 'keyframes' === ( rule.parent.name || '' ) ) {
				return;
			}
			for ( const sel of rule.selectors ) {
				if ( isArmSelector( sel ) && ! sel.includes( ':not(#wpadminbar' ) ) {
					problems.push( `arm without :not(#wpadminbar: ${ norm( sel ) }` );
				}
			}
		} );
		return problems;
	},
	noImportantTransitionRadius( root ) {
		const problems = [];
		root.walkDecls( ( d ) => {
			if ( d.important ) {
				problems.push( `!important on ${ d.prop }` );
			}
			if ( /^transition/.test( d.prop ) ) {
				problems.push( `transition declared (${ d.prop })` );
			}
			if ( /^border(?:-[a-z]+)*-radius$/.test( d.prop ) ) {
				const sel = 'rule' === d.parent.type ? d.parent.selector : '';
				const allowed = 'inherit' === d.value.trim() && /^\.sgs-focus--signature:focus-visible:not\(#wpadminbar \*\)::before$/.test( norm( sel ) );
				if ( ! allowed ) {
					problems.push( `border-radius on ${ norm( sel ) }` );
				}
			}
		} );
		return problems;
	},
	preferenceBlocks( root ) {
		const media = [];
		root.walkAtRules( 'media', ( a ) => media.push( norm( a.params ) ) );
		return [ FORCED, '(prefers-reduced-motion: reduce)', '(prefers-contrast: more)' ]
			.filter( ( want ) => ! media.includes( want ) )
			.map( ( want ) => `missing @media ${ want }` );
	},
	forcedColoursMirrorsEveryArm( root ) {
		const problems = [];
		const arms = [];
		root.walkRules( ( rule ) => {
			const decl = ( rule.nodes || [] ).some( ( n ) => 'decl' === n.type && 'outline' === n.prop );
			if ( decl && ! inSupports( rule ) && ! inForced( rule ) ) {
				arms.push( rule.selectors.map( norm ) );
			}
		} );
		if ( 0 === arms.length ) {
			return [ 'no indicator arm found' ];
		}
		const forced = [];
		root.walkRules( ( rule ) => {
			if ( inForced( rule ) ) {
				const decls = Object.fromEntries( ( rule.nodes || [] ).filter( ( n ) => 'decl' === n.type ).map( ( n ) => [ n.prop, n.value.trim() ] ) );
				forced.push( { selectors: rule.selectors.map( norm ), decls } );
			}
		} );
		for ( const arm of arms ) {
			for ( const sel of arm ) {
				const hit = forced.find( ( f ) => f.selectors.includes( sel ) && /^var\(--sgs-focus-width\) solid Highlight$/.test( norm( f.decls.outline || '' ) ) && 'none' === f.decls[ 'box-shadow' ] );
				if ( ! hit ) {
					problems.push( `forced colours does not repeat the arm with outline: var(--sgs-focus-width) solid Highlight and box-shadow: none: ${ sel }` );
				}
			}
		}
		return problems;
	},
	rangeTrackDrawsNoSecondRing( root ) {
		let found = false;
		root.walkRules( ( rule ) => {
			const track = rule.selectors.some( ( sel ) => /input\[type="range"\]/.test( sel ) && /:focus-visible/.test( sel ) && ! /-thumb/.test( sel ) );
			if ( track && ! inForced( rule ) && ! inSupports( rule ) ) {
				rule.walkDecls( 'outline-style', ( d ) => {
					found = found || 'none' === d.value.trim();
				} );
			}
		} );
		return found ? [] : [ 'the range input keeps the browser default ring beside the thumb ring' ];
	},
	signatureClearsHostBorder( root ) {
		let found = false;
		const problems = [];
		root.walkRules( ( rule ) => {
			if ( ! /\.sgs-focus--signature:focus-visible.*::before/.test( rule.selector ) ) {
				return;
			}
			rule.walkDecls( 'inset', ( d ) => {
				found = true;
				if ( ! /var\(\s*--sgs-focus-host-border\s*,\s*0px\s*\)/.test( d.value ) || ! /-\s*var\(\s*--sgs-focus-host-border/.test( d.value ) ) {
					problems.push( `signature ::before inset does not step out by --sgs-focus-host-border: ${ d.value }` );
				}
			} );
		} );
		return found ? problems : [ 'no signature ::before inset found' ];
	},
};

function readCss() {
	return fs.existsSync( CSS_FILE ) ? fs.readFileSync( CSS_FILE, 'utf8' ) : null;
}

describe( 'focus.css, the one focus system', () => {
	const css = readCss();

	test( 'the system file exists', () => {
		expect( css ).not.toBeNull();
	} );

	for ( const [ name, check ] of Object.entries( CHECKS ) ) {
		test( `${ name } holds on focus.css`, () => {
			expect( css ).not.toBeNull();
			expect( check( postcss.parse( css ) ) ).toEqual( [] );
		} );
	}

	// Negative controls: each check must fail on a planted fault in a copy of focus.css.
	const PLANTS = {
		indicatorOnce: ( text ) => `${ text }\n.x:focus-visible:not(#wpadminbar *){outline:1px solid red}\n`,
		everyArmExcludesAdminBar: ( text ) => `${ text }\n.x:focus-visible{color:red}\n`,
		noImportantTransitionRadius: ( text ) => `${ text }\n.x:not(#wpadminbar *){transition:none;border-radius:4px;color:red !important}\n`,
		preferenceBlocks: ( text ) => text.replace( /@media \(prefers-contrast: more\)/, '@media (min-width: 1px)' ),
		forcedColoursMirrorsEveryArm: ( text ) => text.replace( /@media \(forced-colors: active\) \{[\s\S]*$/, [
			// The plan's original §2.2 block: lower weight than the proxy arms and no thumb arms.
			'@media (forced-colors: active) {',
			'\t:focus-visible:not(#wpadminbar *), .sgs-focus-proxy:not(#wpadminbar *), .sgs-focus-preview:not(#wpadminbar *) { outline-color: Highlight; }',
			'\t.sgs-focus--signature::before { display: none; }',
			'}',
		].join( '\n' ) ),
		rangeTrackDrawsNoSecondRing: ( text ) => text.replace( /outline-style: none;/, 'outline-style: auto;' ),
		signatureClearsHostBorder: ( text ) => text.replace( /inset: calc\([^;]*--sgs-focus-host-border[^;]*\);/, 'inset: calc(var(--sgs-focus-width) * -3);' ),
	};

	for ( const [ name, plant ] of Object.entries( PLANTS ) ) {
		test( `${ name } fails on a planted fault (negative control)`, () => {
			expect( css ).not.toBeNull();
			const planted = plant( css );
			expect( planted ).not.toEqual( css );
			expect( CHECKS[ name ]( postcss.parse( planted ) ).length ).toBeGreaterThan( 0 );
		} );
	}
} );

describe( 'no other theme stylesheet holds an indicator', () => {
	const files = fs.readdirSync( THEME_CSS ).filter( ( f ) => f.endsWith( '.css' ) && 'focus.css' !== f && ! f.endsWith( '.min.css' ) );

	const findingsOf = ( file ) => {
		const rel = `theme/sgs-theme/assets/css/${ file }`;
		return analyseCss( fs.readFileSync( path.join( THEME_CSS, file ), 'utf8' ), rel, { allow: [] } ).findings;
	};

	test( 'the theme stylesheets were found', () => {
		expect( files ).toEqual( expect.arrayContaining( [ 'core-blocks-critical.css', 'core-blocks.css', 'utilities.css' ] ) );
	} );

	for ( const file of files.filter( ( f ) => ! PENDING[ f ] ) ) {
		test( `${ file } holds no focus indicator, suppressor, focus radius or retired token`, () => {
			expect( findingsOf( file ).map( ( f ) => `${ f.category } ${ f.selector } ${ f.prop }` ) ).toEqual( [] );
		} );
	}

	for ( const [ file, owner ] of Object.entries( PENDING ) ) {
		test( `${ file } is still pending (${ owner }); delete its PENDING entry once it is clean`, () => {
			expect( files ).toContain( file );
			expect( findingsOf( file ).length ).toBeGreaterThan( 0 );
		} );
	}

	test( 'the detector sees a planted indicator (negative control)', () => {
		const planted = analyseCss( '.x:focus-visible{outline:2px solid red}', 'theme/sgs-theme/assets/css/utilities.css', { allow: [] } );
		expect( planted.findings.length ).toBeGreaterThan( 0 );
	} );
} );
