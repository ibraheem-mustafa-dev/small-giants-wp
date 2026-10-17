/**
 * No resting or focus-state opacity below 1 on a focusable root.
 *
 * `opacity` on an element fades everything it paints, including its focus outline: the outline blends with the
 * ground and its contrast drops (the unified focus system's F6 defect). A focusable control that wants a muted
 * resting look mixes the tint into its own text colour (`color: color-mix( in srgb, currentColor 85%, transparent )`)
 * or puts the opacity on a child, never on the link, button or summary itself.
 *
 * The scan reads every block stylesheet, the plugin and theme asset stylesheets, and flags a rule that sets a literal
 * `opacity` strictly between 0 and 1 (0 is a hidden state, not a dim) when a selector in it targets a focusable root:
 *   - the last compound is an a, button, summary, input, select or textarea, carries [tabindex], or has a class whose
 *     name ends in link, btn, button, close, prev, next, pause, play, trigger, toggle, remove, submit, arrow, cta,
 *     save-for-later or add-options (a BEM modifier after the name is ignored);
 *   - and the selector is not a hover, disabled, aria-disabled or aria-busy state, not a pseudo-element, and not inside
 *     @keyframes;
 *   - a selector with :focus, :focus-visible or :focus-within is always a fault (the dim would apply while the outline
 *     is drawn), whatever the element.
 * A rule is cleared when the same stylesheet resets the same subject on :focus-visible to opacity 1, or when
 * fixtures/focus-resting-opacity-allow.json carries an entry (path, selector, reason) for it. A stale allow entry fails.
 * Every check also runs against a planted fault (negative control).
 */

const fs = require( 'fs' );
const path = require( 'path' );
const postcss = require( 'postcss' );

const PLUGIN = path.resolve( __dirname, '..', '..' );
const REPO = path.resolve( PLUGIN, '..', '..' );
const ALLOW = JSON.parse( fs.readFileSync( path.join( __dirname, 'fixtures', 'focus-resting-opacity-allow.json' ), 'utf8' ) );

const FOCUSABLE_TAGS = /^(a|button|summary|input|select|textarea)$/i;
const FOCUSABLE_CLASS = /(link|btn|button|close|prev|next|pause|play|trigger|toggle|remove|submit|arrow|cta|save-for-later|add-options)(--[a-z0-9-]+)?$/;
const STATE = /:hover|:disabled|\[disabled|\[aria-disabled|\[aria-busy/;
const FOCUS = /:focus-visible|:focus-within|:focus(?![-\w])/;

function norm( s ) {
	return s.replace( /\s+/g, ' ' ).trim();
}

/** The part of a selector after its last combinator. */
function subjectOf( selector ) {
	const parts = norm( selector.replace( /\s*([>+~])\s*/g, ' $1 ' ) ).split( / (?![^(]*\))/ );
	for ( let i = parts.length - 1; i >= 0; i-- ) {
		if ( ! /^[>+~]$/.test( parts[ i ] ) ) {
			return parts[ i ];
		}
	}
	return '';
}

function isFocusableSubject( subject ) {
	const bare = subject.replace( /:[a-z-]+(\([^)]*\))?/g, '' );
	const tag = bare.match( /^[a-z][a-z0-9-]*/i );
	if ( tag && FOCUSABLE_TAGS.test( tag[ 0 ] ) ) {
		return true;
	}
	if ( /\[tabindex/.test( subject ) ) {
		return true;
	}
	return ( bare.match( /\.[a-z0-9_-]+/gi ) || [] ).some( ( c ) => FOCUSABLE_CLASS.test( c.slice( 1 ) ) );
}

function dimmed( value ) {
	const v = value.trim().replace( /\s*!important$/, '' );
	if ( /^\d*\.?\d+%$/.test( v ) ) {
		return parseFloat( v ) > 0 && parseFloat( v ) < 100;
	}
	return /^\d*\.?\d+$/.test( v ) && parseFloat( v ) > 0 && parseFloat( v ) < 1;
}

/** The faults in one stylesheet: [{ selector, kind }]. */
function findFaults( css, allow = [] ) {
	const root = postcss.parse( css );
	const resets = new Set();
	root.walkRules( ( rule ) => {
		let reset = false;
		rule.walkDecls( 'opacity', ( d ) => {
			if ( '1' === d.value.trim() ) {
				reset = true;
			}
		} );
		if ( reset ) {
			rule.selectors.forEach( ( s ) => resets.add( norm( s ) ) );
		}
	} );
	const faults = [];
	root.walkRules( ( rule ) => {
		if ( rule.parent && 'atrule' === rule.parent.type && /keyframes$/i.test( rule.parent.name ) ) {
			return;
		}
		let dims = false;
		rule.walkDecls( 'opacity', ( d ) => {
			if ( dimmed( d.value ) ) {
				dims = true;
			}
		} );
		if ( ! dims ) {
			return;
		}
		for ( const raw of rule.selectors ) {
			const selector = norm( raw );
			const subject = subjectOf( selector );
			if ( /::/.test( subject ) || /:(before|after)$/.test( subject ) ) {
				continue;
			}
			const onFocus = FOCUS.test( selector.replace( /:not\([^)]*\)/g, '' ) );
			if ( ! onFocus && ( STATE.test( selector ) || ! isFocusableSubject( subject ) ) ) {
				continue;
			}
			if ( ! onFocus && resets.has( norm( subject + ':focus-visible' ) ) ) {
				continue;
			}
			if ( allow.some( ( a ) => a.selector === selector ) ) {
				continue;
			}
			faults.push( { selector, kind: onFocus ? 'focus-state' : 'resting' } );
		}
	} );
	return faults;
}

function corpus() {
	const out = [];
	const walk = ( dir ) => {
		for ( const e of fs.readdirSync( dir, { withFileTypes: true } ) ) {
			const p = path.join( dir, e.name );
			if ( e.isDirectory() ) {
				walk( p );
			} else if ( p.endsWith( '.css' ) ) {
				out.push( p );
			}
		}
	};
	const blocks = path.join( PLUGIN, 'src', 'blocks' );
	for ( const e of fs.readdirSync( blocks, { withFileTypes: true } ) ) {
		const p = path.join( blocks, e.name, 'style.css' );
		if ( e.isDirectory() && fs.existsSync( p ) ) {
			out.push( p );
		}
	}
	walk( path.join( PLUGIN, 'assets', 'css' ) );
	walk( path.join( REPO, 'theme', 'sgs-theme', 'assets', 'css' ) );
	return out;
}

const rel = ( p ) => path.relative( REPO, p ).split( path.sep ).join( '/' );

describe( 'focusable roots keep full opacity', () => {
	test( 'the current tree has no unallowed fault', () => {
		const found = [];
		for ( const file of corpus() ) {
			const allow = ALLOW.entries.filter( ( a ) => a.path === rel( file ) );
			for ( const f of findFaults( fs.readFileSync( file, 'utf8' ), allow ) ) {
				found.push( `${ rel( file ) }: ${ f.kind }: ${ f.selector }` );
			}
		}
		expect( found ).toEqual( [] );
	} );

	test( 'the allow-list is small, reasoned and not stale', () => {
		expect( ALLOW.entries.length ).toBeLessThanOrEqual( 5 );
		for ( const a of ALLOW.entries ) {
			expect( a.reason && a.reason.length > 20 ).toBe( true );
			const file = path.join( REPO, a.path );
			expect( fs.existsSync( file ) ).toBe( true );
			const css = fs.readFileSync( file, 'utf8' );
			expect( findFaults( css, [] ).some( ( f ) => f.selector === a.selector ) ).toBe( true );
		}
	} );

	describe( 'negative controls', () => {
		const faults = ( css ) => findFaults( css ).map( ( f ) => f.selector );

		test( 'a resting dim on a link, button, summary or named control is a fault', () => {
			expect( faults( '.x a { opacity: 0.85; }' ) ).toEqual( [ '.x a' ] );
			expect( faults( '.sgs-x__close { opacity: .7; }' ) ).toEqual( [ '.sgs-x__close' ] );
			expect( faults( 'summary.sgs-x { opacity: 70%; }' ) ).toEqual( [ 'summary.sgs-x' ] );
			expect( faults( '.sgs-x__item-remove--text { opacity: 0.5 !important; }' ) ).toEqual( [ '.sgs-x__item-remove--text' ] );
			expect( faults( '@media (min-width: 1px) { .sgs-x__link { opacity: 0.9; } }' ) ).toEqual( [ '.sgs-x__link' ] );
		} );

		test( 'a dim while the element has focus is a fault, whatever the element', () => {
			expect( faults( '.sgs-x__card:focus-visible { opacity: 0.8; }' ) ).toEqual( [ '.sgs-x__card:focus-visible' ] );
			expect( faults( '.sgs-x__link:hover, .sgs-x__link:focus-visible { opacity: 0.85; }' ) ).toEqual( [ '.sgs-x__link:focus-visible' ] );
		} );

		test( 'a pointer-only, disabled, pseudo-element or keyframe use is not a fault', () => {
			expect( faults( '.sgs-x__link:hover:not(:focus-visible) { opacity: 0.85; }' ) ).toEqual( [] );
			expect( faults( '.sgs-x__btn:disabled, .sgs-x__btn[aria-disabled="true"] { opacity: 0.6; }' ) ).toEqual( [] );
			expect( faults( '.sgs-x__link::after { opacity: 0.4; }' ) ).toEqual( [] );
			expect( faults( '@keyframes k { 0% { opacity: 0.5; } }' ) ).toEqual( [] );
			expect( faults( '.sgs-x__close { opacity: 0; }' ) ).toEqual( [] );
			expect( faults( '.sgs-x__caption { opacity: 0.7; }' ) ).toEqual( [] );
			expect( faults( '.sgs-x__link { color: color-mix( in srgb, currentColor 85%, transparent ); }' ) ).toEqual( [] );
		} );

		test( 'a control that resets itself on :focus-visible is cleared; a different subject is not', () => {
			expect( faults( '.sgs-x__close { opacity: 0.7; } .sgs-x__close:focus-visible { opacity: 1; }' ) ).toEqual( [] );
			expect( faults( '.sgs-x__close { opacity: 0.7; } .sgs-x__prev:focus-visible { opacity: 1; }' ) ).toEqual( [ '.sgs-x__close' ] );
		} );

		test( 'an allow entry clears one selector and a mismatch does not', () => {
			expect( findFaults( '.sgs-x__link { opacity: 0.5; }', [ { selector: '.sgs-x__link' } ] ) ).toEqual( [] );
			expect( findFaults( '.sgs-x__link { opacity: 0.5; }', [ { selector: '.sgs-y__link' } ] ).length ).toBe( 1 );
		} );
	} );
} );
