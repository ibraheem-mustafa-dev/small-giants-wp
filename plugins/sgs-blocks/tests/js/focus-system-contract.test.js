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
 *   - carries the card arm (`.sgs-focus-card:has(.sgs-focus-source:focus-visible)`) in the one declaration set and in
 *     forced colours, and turns the focus source's own outline off while its proxy draws the ring;
 *   - mirrors every signature `:focus-visible` rule (variables, `::before`, reduced motion, higher contrast) for the
 *     `.sgs-focus--signature.sgs-focus-preview` editor arm, so the preview shows the band;
 *   - restates the arms that need no `:has()` (and a card's own focus source) in `@supports not selector(:has(*))`, in
 *     forced colours too, because a browser without `:has()` drops the whole selector list above;
 *   - gives a duotone, photo or signature element the core of the NEAREST ground: the ground classes set
 *     `--sgs-focus-ground-core` (the ink token on `:root` and `.sgs-on-light`, the light inner token on `.sgs-on-dark`), the
 *     element reads it by inheritance, so a light pill inside a dark block keeps the dark core and no selector says
 *     "dark ancestor" (which would also reach through a nearer light ground);
 *   - registers the three per-element override properties (`--sgs-focus-offset`, `--sgs-focus-halo`, `--sgs-focus-under`)
 *     with `@property` and `inherits: false`, so an inset or shadowed card never hands its inset ring, halo or shadow to a
 *     focusable descendant that carries no such class of its own;
 *   - rings a card's block-link overlay (`.sgs-focus-card:has(.sgs-focus-source:focus-visible) > .sgs-block-link-overlay`)
 *     in the one declaration set and in forced colours, and gives it the inset offset and halo on an inset card: the card's
 *     own outline paints below its positioned children, so the overlay carries the ring over a photo;
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
};

// Set by a block (or the inset class) on the focusable element itself and read by that element's own indicator.
// `--sgs-focus-host-border` is not in the list: the signature `::before` reads it from its host, so it must inherit.
const OVERRIDE_PROPERTIES = [ '--sgs-focus-offset', '--sgs-focus-halo', '--sgs-focus-under' ];

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
				const sels = 'rule' === d.parent.type ? d.parent.selectors.map( norm ) : [];
				const allowed = 'inherit' === d.value.trim() && sels.length > 0 && sels.every( ( sel ) => /^\.sgs-focus--signature(?::focus-visible|\.sgs-focus-preview):not\(#wpadminbar \*\)::before$/.test( sel ) );
				if ( ! allowed ) {
					problems.push( `border-radius on ${ sels.join( ', ' ) }` );
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
	cardArmCarriesTheIndicator( root ) {
		const CARD = '.sgs-focus-card:has(.sgs-focus-source:focus-visible):not(#wpadminbar *)';
		const problems = [];
		let base = false;
		let forced = false;
		root.walkRules( ( rule ) => {
			if ( ! rule.selectors.map( norm ).includes( CARD ) ) {
				return;
			}
			const has = ( prop ) => ( rule.nodes || [] ).some( ( n ) => 'decl' === n.type && prop === n.prop );
			if ( inForced( rule ) ) {
				forced = has( 'outline' ) && has( 'box-shadow' );
			} else {
				base = has( 'outline' ) && has( 'box-shadow' );
			}
		} );
		if ( ! base ) {
			problems.push( `no indicator arm for ${ CARD }` );
		}
		if ( ! forced ) {
			problems.push( `forced colours does not repeat the card arm ${ CARD }` );
		}
		return problems;
	},
	sourceDrawsNothing( root ) {
		let found = false;
		root.walkRules( ( rule ) => {
			if ( inForced( rule ) || inSupports( rule ) || ! rule.selectors.map( norm ).includes( '.sgs-focus-source:focus-visible:not(#wpadminbar *)' ) ) {
				return;
			}
			rule.walkDecls( 'outline-style', ( d ) => {
				found = found || 'none' === d.value.trim();
			} );
		} );
		return found ? [] : [ 'a focus source keeps the browser default ring beside its proxy ring' ];
	},
	coreFollowsNearestGround( root ) {
		const problems = [];
		const coreOf = ( rule ) => {
			let v = null;
			rule.each( ( n ) => { if ( 'decl' === n.type && '--sgs-focus-ground-core' === n.prop ) v = norm( n.value ); } );
			return v;
		};
		const seen = { light: false, dark: false };
		let g2 = null;
		let signature = null;
		root.walkRules( ( rule ) => {
			const sels = rule.selectors.map( norm );
			for ( const sel of sels ) {
				if ( /\.sgs-on-dark[^,]*\.sgs-(?:focus--(?:duotone|signature)|container--has-bg-(?:image|video))/.test( sel ) ) {
					problems.push( `selector reaches through a nearer light ground: ${ sel }` );
				}
			}
			if ( inForced( rule ) || inSupports( rule ) || atRuleChain( rule ).some( ( a ) => a.startsWith( '@media (prefers' ) ) ) {
				return;
			}
			const core = coreOf( rule );
			if ( null !== core && sels.includes( ':root' ) && sels.includes( '.sgs-on-light' ) ) {
				seen.light = 'var(--sgs-focus-ink)' === core;
			}
			if ( null !== core && sels.includes( '.sgs-on-dark' ) ) {
				seen.dark = 'var(--sgs-focus-inner)' === core;
			}
			const decl = ( prop ) => { let v = null; rule.each( ( n ) => { if ( 'decl' === n.type && prop === n.prop ) v = norm( n.value ); } ); return v; };
			if ( sels.includes( '.sgs-focus--duotone' ) && sels.includes( '.sgs-container--has-bg-image' ) ) {
				g2 = decl( '--sgs-focus-ring' );
			}
			if ( sels.includes( '.sgs-focus--signature:focus-visible:not(#wpadminbar *)' ) && null !== decl( '--sgs-focus-ring' ) ) {
				signature = decl( '--sgs-focus-ring' );
			}
		} );
		if ( ! seen.light ) {
			problems.push( ':root, .sgs-on-light must set --sgs-focus-ground-core to var(--sgs-focus-ink)' );
		}
		if ( ! seen.dark ) {
			problems.push( '.sgs-on-dark must set --sgs-focus-ground-core to var(--sgs-focus-inner)' );
		}
		if ( 'var(--sgs-focus-ground-core)' !== g2 ) {
			problems.push( `the duotone and photo rule paints the core ${ g2 }, want var(--sgs-focus-ground-core)` );
		}
		if ( 'var(--sgs-focus-ground-core)' !== signature ) {
			problems.push( `the signature rule paints the core ${ signature }, want var(--sgs-focus-ground-core)` );
		}
		return problems;
	},
	g2HairlineIsTheOtherTone( root ) {
		// G2 and G3 are a two-tone pair: the hairline is the ground's band (the inner token on a light ground, the ink on
		// a dark one), never the core's colour, and every indicator paints --sgs-focus-hairline, never the inner token.
		const problems = [];
		const seen = { light: false, dark: false, g2: false, signature: false };
		root.walkRules( ( rule ) => {
			if ( inForced( rule ) || inSupports( rule ) || atRuleChain( rule ).some( ( a ) => a.startsWith( '@media (prefers' ) ) ) {
				return;
			}
			const sels = rule.selectors.map( norm );
			const decl = ( prop ) => { let v = null; rule.each( ( n ) => { if ( 'decl' === n.type && prop === n.prop ) v = norm( n.value ); } ); return v; };
			if ( sels.includes( ':root' ) && sels.includes( '.sgs-on-light' ) ) seen.light = 'var(--sgs-focus-inner)' === decl( '--sgs-focus-ground-band' );
			if ( sels.includes( '.sgs-on-dark' ) && 1 === sels.length ) seen.dark = 'var(--sgs-focus-ink)' === decl( '--sgs-focus-ground-band' );
			if ( sels.includes( '.sgs-focus--duotone' ) && sels.includes( '.sgs-container--has-bg-image' ) ) seen.g2 = 'var(--sgs-focus-ground-band)' === decl( '--sgs-focus-hairline' );
			if ( sels.includes( '.sgs-focus--signature:focus-visible:not(#wpadminbar *)' ) && null !== decl( '--sgs-focus-ring' ) ) seen.signature = 'var(--sgs-focus-ground-band)' === decl( '--sgs-focus-hairline' );
			rule.walkDecls( /^(box-shadow|--sgs-focus-halo)$/, ( d ) => {
				if ( d.value.includes( 'var(--sgs-focus-inner)' ) ) problems.push( `${ sels.join( ', ' ) } paints the inner token instead of --sgs-focus-hairline` );
			} );
		} );
		if ( ! seen.light ) problems.push( ':root, .sgs-on-light must set --sgs-focus-ground-band to var(--sgs-focus-inner)' );
		if ( ! seen.dark ) problems.push( '.sgs-on-dark must set --sgs-focus-ground-band to var(--sgs-focus-ink)' );
		if ( ! seen.g2 ) problems.push( 'the duotone and photo rule must paint its hairline in var(--sgs-focus-ground-band)' );
		if ( ! seen.signature ) problems.push( 'the signature rule must paint its hairline in var(--sgs-focus-ground-band)' );
		return problems;
	},
	signaturePreviewMirrorsFocus( root ) {
		const problems = [];
		let seen = 0;
		root.walkRules( ( rule ) => {
			if ( inForced( rule ) ) {
				return;
			}
			const sels = rule.selectors.map( norm );
			for ( const sel of sels ) {
				const m = /^\.sgs-focus--signature:focus-visible:not\(#wpadminbar \*\)(::before)?$/.exec( sel );
				if ( m ) {
					seen++;
					const twin = `.sgs-focus--signature.sgs-focus-preview:not(#wpadminbar *)${ m[ 1 ] || '' }`;
					if ( ! sels.includes( twin ) ) {
						problems.push( `the editor preview arm is missing beside ${ sel }: ${ twin }` );
					}
				}
			}
		} );
		return seen >= 5 ? problems : [ `only ${ seen } signature focus-visible selectors found, want the variables, ::before, reduced-motion and the two contrast rules` ];
	},
	noHasFallbackKeepsAFocusRing( root ) {
		const CARD_SOURCE = '.sgs-focus-card .sgs-focus-source:focus-visible:not(#wpadminbar *)';
		let base = false;
		let forced = false;
		root.walkRules( ( rule ) => {
			if ( ! rule.selectors.map( norm ).includes( CARD_SOURCE ) ) {
				return;
			}
			const chain = atRuleChain( rule );
			if ( ! chain.includes( '@supports not selector(:has(*))' ) ) {
				return;
			}
			const has = ( prop ) => ( rule.nodes || [] ).some( ( n ) => 'decl' === n.type && prop === n.prop );
			if ( chain.includes( `@media ${ FORCED }` ) ) {
				forced = has( 'outline' ) && rule.nodes.some( ( n ) => 'box-shadow' === n.prop && 'none' === n.value.trim() );
			} else {
				base = has( 'outline' ) && has( 'outline-offset' ) && has( 'box-shadow' );
			}
		} );
		const problems = [];
		if ( ! base ) {
			problems.push( `no @supports not selector(:has(*)) arm gives ${ CARD_SOURCE } the indicator` );
		}
		if ( ! forced ) {
			problems.push( `no forced-colours repeat of ${ CARD_SOURCE } inside the :has() fallback` );
		}
		return problems;
	},
	overridePropertiesDoNotInherit( root ) {
		const problems = [];
		const seen = {};
		root.walkAtRules( 'property', ( at ) => {
			const decls = {};
			at.walkDecls( ( d ) => { decls[ d.prop ] = d.value.trim().replace( /^["']|["']$/g, '' ); } );
			seen[ at.params.trim() ] = decls;
		} );
		for ( const name of OVERRIDE_PROPERTIES ) {
			const reg = seen[ name ];
			if ( ! reg ) {
				problems.push( `${ name } is not registered with @property` );
				continue;
			}
			if ( 'false' !== reg.inherits ) {
				problems.push( `${ name } registers inherits: ${ reg.inherits }, want false` );
			}
			if ( '*' !== reg.syntax ) {
				problems.push( `${ name } registers syntax ${ reg.syntax }, want * (any value, so the var() fallback chains keep working)` );
			}
			if ( 'initial-value' in reg ) {
				problems.push( `${ name } registers an initial-value, which would replace the var() fallback with a value` );
			}
		}
		return problems;
	},
	cardOverlayCarriesTheRing( root ) {
		const OVERLAY = '.sgs-focus-card:has(.sgs-focus-source:focus-visible) > .sgs-block-link-overlay:not(#wpadminbar *)';
		const INSET = '.sgs-focus--inset.sgs-focus-card > .sgs-block-link-overlay';
		let base = false;
		let forced = false;
		let inset = false;
		root.walkRules( ( rule ) => {
			const sels = rule.selectors.map( norm );
			if ( sels.includes( OVERLAY ) && rule.some( ( n ) => 'decl' === n.type && 'outline' === n.prop ) ) {
				if ( inForced( rule ) ) {
					forced = true;
				} else if ( ! inSupports( rule ) ) {
					base = true;
				}
			}
			if ( sels.includes( INSET ) && rule.some( ( n ) => 'decl' === n.type && '--sgs-focus-offset' === n.prop ) && rule.some( ( n ) => 'decl' === n.type && '--sgs-focus-halo' === n.prop ) ) {
				inset = true;
			}
		} );
		const problems = [];
		if ( ! base ) {
			problems.push( `the indicator declaration set has no ${ OVERLAY } arm` );
		}
		if ( ! forced ) {
			problems.push( 'no forced-colours repeat of the card overlay arm' );
		}
		if ( ! inset ) {
			problems.push( `${ INSET } does not carry the inset offset and halo` );
		}
		return problems;
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
		forcedColoursMirrorsEveryArm: ( text ) => text.replace( /\n@media \(forced-colors: active\) \{[\s\S]*$/, [
			// The plan's original §2.2 block: lower weight than the proxy arms and no thumb arms.
			'\n@media (forced-colors: active) {',
			'\t:focus-visible:not(#wpadminbar *), .sgs-focus-proxy:not(#wpadminbar *), .sgs-focus-preview:not(#wpadminbar *) { outline-color: Highlight; }',
			'\t.sgs-focus--signature::before { display: none; }',
			'}',
		].join( '\n' ) ),
		rangeTrackDrawsNoSecondRing: ( text ) => text.replace( /(input\[type="range"\]:not\(\.sgs-focus-source\):focus-visible:not\(#wpadminbar \*\) \{\s*)outline-style: none;/, '$1outline-style: auto;' ),
		cardArmCarriesTheIndicator: ( text ) => text.replace( /\.sgs-focus-card:has\(\.sgs-focus-source:focus-visible\):not\(#wpadminbar \*\)/g, '.sgs-focus-card:focus-visible:not(#wpadminbar *)' ),
		sourceDrawsNothing: ( text ) => text.replace( /(\n\.sgs-focus-source:focus-visible:not\(#wpadminbar \*\) \{\s*)outline-style: none;/, '$1color: inherit;' ),
		coreFollowsNearestGround: ( text ) => text.replace( '--sgs-focus-ground-core: var(--sgs-focus-inner)', '--sgs-focus-ground-core: var(--sgs-focus-ink)' ),
		g2HairlineIsTheOtherTone: ( text ) => text.replace( '--sgs-focus-ground-band: var(--sgs-focus-ink)', '--sgs-focus-ground-band: var(--sgs-focus-inner)' ),
		signaturePreviewMirrorsFocus: ( text ) => text.replace( /\.sgs-focus--signature\.sgs-focus-preview:not\(#wpadminbar \*\)::before/g, '.sgs-focus--signature.sgs-focus-preview-x:not(#wpadminbar *)::before' ),
		noHasFallbackKeepsAFocusRing: ( text ) => text.replace( /@supports not selector\(:has\(\*\)\)/, '@supports not selector(:is(*))' ),
		cardOverlayCarriesTheRing: ( text ) => text.replace( /\.sgs-focus-card:has\(\.sgs-focus-source:focus-visible\) > \.sgs-block-link-overlay/g, '.sgs-focus-card:has(.sgs-focus-source:focus-visible) > .sgs-block-link-overlay-x' ),
		overridePropertiesDoNotInherit: ( text ) => text.replace( /@property --sgs-focus-halo \{[^}]*\}/, '@property --sgs-focus-halo { syntax: "*"; inherits: true; }' ),
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
