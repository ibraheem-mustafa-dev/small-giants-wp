'use strict';

/**
 * PHP, JS and JSON scanning for check-focus-system.js.
 *
 * PHP / JS: every statement whose strings mention `:focus` is one item. The CSS it assembles is
 * rebuilt (string contents in order, code as a hole) and each `selector{body}` fragment is
 * classified with the CSS classifier; an indicator written on a focus selector becomes
 * `php-emitter` or `js-emitter` (fixed by hand). A selector string with no body in the statement
 * is classified by its shape: handed to a pairing helper (the helper adds the `:hover` half),
 * paired with `:hover` in the same statement, a `:focus-within` container, or a `:not( :focus… )`
 * resting selector. Anything else is looked up in emitter-registry.json, else `unrecognised`.
 *
 * JSON: `styles…[":focus*"]` keys painting `outline` or `shadow` are `json-focus`; other focus
 * keys are `shared-state`; `settings.custom.focus-ring` and any retired token are `legacy-token`.
 *
 * @package SGS\Blocks
 */

const { RETIRED_TOKEN_RE, RETIRED_JSON_KEYS, groupOf } = require( './config.js' );
const { classifyUnit, findingKey, TARGET_CATEGORIES, RULE_PRIORITY } = require( './classify-css.js' );
const { lex, statements, reconstruct, HOLE } = require( './lexer.js' );
const { splitTop, norm, selectorInfo, countFocus } = require( './selector.js' );

const { loadRegistry } = require( './json-io.js' );

/** Shared helpers that pair the selector they are given with a `:hover` half themselves. */
function pairingHelpers() {
	return loadRegistry().pairingHelpers.map( ( h ) => h.name );
}

function tokensIn( text ) {
	RETIRED_TOKEN_RE.lastIndex = 0;
	const hits = text.match( RETIRED_TOKEN_RE ) || [];
	RETIRED_TOKEN_RE.lastIndex = 0;
	return [ ...new Set( hits ) ];
}

function pick( cats ) {
	for ( const c of RULE_PRIORITY ) {
		if ( cats.includes( c ) ) {
			return c;
		}
	}
	return 'unrecognised';
}

/** Leaf `selector{body}` fragments of rebuilt CSS, with their at-rule context. */
function fragments( css ) {
	const out = [];
	const stack = [];
	let start = 0;
	for ( let i = 0; i < css.length; i++ ) {
		const ch = css[ i ];
		if ( '{' === ch ) {
			stack.push( { open: i, prelude: css.slice( start, i ).replace( new RegExp( `^[\s${ HOLE }]+(?=@)` ), '' ).trim() } );
			start = i + 1;
		} else if ( '}' === ch && stack.length ) {
			const top = stack.pop();
			const body = css.slice( top.open + 1, i );
			if ( ! body.includes( '{' ) && ! top.prelude.startsWith( '@' ) ) {
				const context = stack.filter( ( s ) => s.prelude.startsWith( '@' ) ).map( ( s ) => norm( s.prelude ) ).join( ' > ' );
				out.push( { selector: top.prelude, body, context } );
			}
			start = i + 1;
		} else if ( ';' === ch && 0 === stack.length ) {
			start = i + 1;
		}
	}
	return out;
}

function shapeCategory( sel, recon, fullText, helper, emitter ) {
	const shadow = /shadow/i.test( fullText );
	if ( sel.anyFocus && ( sel.anyHover || helper ) ) {
		// A pairing helper or hover pair that paints an outline declaration (any outline property) or the
		// focus-shadow token draws its own keyboard indicator: fixed by hand, like any emitter.
		if ( /(?:^|[^\w-])(?:outline(?:-[a-z]+)?|--sgs-focus-shadow)\s*:/i.test( fullText ) ) {
			return emitter;
		}
		return shadow ? 'shared-shadow' : 'shared-state';
	}
	if ( sel.anyWithin || sel.anyHasFocus ) {
		return 'container';
	}
	if ( sel.anyNeg && ! sel.anyFocus ) {
		return /forced-colors/.test( recon ) ? 'forced-resting' : 'shared-state';
	}
	return null;
}

function registryHit( rel, text ) {
	return loadRegistry().entries.find( ( e ) => e.path === rel && text.includes( e.contains ) ) || null;
}

/**
 * @returns {{ items: Object[], findings: Object[], gap: Object<string, number>, classifiedFocus: number }}
 */
function analyseCode( text, rel, lang, opts ) {
	const emitter = 'php' === lang ? 'php-emitter' : 'js-emitter';
	const segs = lex( text, lang );
	const items = [];
	const findings = [];
	const gap = { comment: 0, 'emitter-selector': 0, 'not-css': 0 };
	let classifiedFocus = 0;
	const group = groupOf( rel, '' );
	const addFinding = ( category, selector, prop ) => {
		const f = { category, path: rel, context: '', selector, prop, value: '', group, node: null };
		f.key = findingKey( f );
		findings.push( f );
	};

	for ( const s of segs ) {
		if ( 'comment' !== s.type ) {
			continue;
		}
		gap.comment += countFocus( s.text );
		const tokens = tokensIn( s.text );
		if ( tokens.length ) {
			const label = `// ${ norm( s.text.replace( /^\/\/|^\/\*|\*\/$|^#/g, '' ) ).slice( 0, 80 ) }`;
			items.push( { kind: `${ lang }-comment`, category: 'legacy-token', path: rel, context: '', selector: label, group, decls: [], indicatorShaped: false, form: '' } );
			tokens.forEach( ( t ) => addFinding( 'legacy-token', label, t ) );
		}
	}

	for ( const stmt of statements( segs ) ) {
		const full = stmt.map( ( s ) => s.text ).join( ' ' );
		const focusCount = countFocus( full );
		const tokens = tokensIn( stmt.filter( ( s ) => 'string' === s.type ).map( ( s ) => s.text ).join( ' ' ) + ' ' + stmt.filter( ( s ) => 'code' === s.type ).map( ( s ) => s.text ).join( ' ' ) );
		if ( 0 === focusCount && 0 === tokens.length ) {
			continue;
		}
		const recon = reconstruct( stmt );
		const label = norm( recon ).slice( 0, 160 );
		const cats = [];
		const decls = [];
		let indicatorShaped = false;
		let form = '';

		if ( focusCount > 0 ) {
			const reg = registryHit( rel, full );
			const helper = pairingHelpers().some( ( h ) => full.includes( `${ h }(` ) );
			const frags = fragments( recon ).filter( ( f ) => f.selector.includes( ':focus' ) );
			if ( reg ) {
				cats.push( reg.category );
				if ( 'not-css' === reg.category ) {
					gap[ 'not-css' ] += focusCount;
				}
			} else if ( frags.length ) {
				for ( const fr of frags ) {
					const members = splitTop( fr.selector.split( /[;}]/ ).pop(), ',' ).map( norm );
					const known = splitTop( fr.body, ';' ).filter( ( d ) => d.includes( ':' ) && ! d.trim().startsWith( HOLE ) ).map( ( d ) => {
						const at = d.indexOf( ':' );
						return { prop: d.slice( 0, at ).trim(), value: d.slice( at + 1 ).trim() };
					} );
					const unit = known.length ? classifyUnit( { members, context: fr.context, decls: known }, rel, { allow: opts.allow, emitter } ) : null;
					if ( unit ) {
						cats.push( unit.category );
						decls.push( ...unit.decls );
						if ( unit.indicatorShaped ) {
							indicatorShaped = true;
							form = form || unit.form;
						}
					} else {
						cats.push( shapeCategory( selectorInfo( members ), recon, full, helper, emitter ) || 'unrecognised' );
					}
				}
			} else {
				const members = splitTop( recon.replace( /[{}]/g, ',' ), ',' ).map( norm ).filter( ( m ) => m.includes( ':focus' ) );
				cats.push( shapeCategory( selectorInfo( members ), recon, full, helper, emitter ) || 'unrecognised' );
			}
			if ( ! reg || 'not-css' !== reg.category ) {
				classifiedFocus += 1;
				gap[ 'emitter-selector' ] += focusCount - 1;
			}
		}
		if ( tokens.length ) {
			cats.push( 'legacy-token' );
		}
		const category = pick( cats.filter( ( c ) => 'not-css' !== c ) );
		if ( 0 === cats.filter( ( c ) => 'not-css' !== c ).length ) {
			continue;
		}
		items.push( { kind: `${ lang }-statement`, category, path: rel, context: '', selector: label, group, decls, indicatorShaped, form } );
		for ( const d of decls ) {
			if ( TARGET_CATEGORIES.has( d.category ) ) {
				addFinding( d.category, label, d.prop );
			}
		}
		if ( 'unrecognised' === category || ( TARGET_CATEGORIES.has( category ) && 'legacy-token' !== category && 0 === decls.length ) ) {
			addFinding( category, label, '' );
		}
		tokens.forEach( ( t ) => addFinding( 'legacy-token', label, t ) );
	}
	return { items, findings, gap, classifiedFocus };
}

/** JSON corpus files: theme.json and the snapshots. */
function analyseJson( text, rel ) {
	const items = [];
	const findings = [];
	const gap = { 'json-string': 0 };
	let classifiedFocus = 0;
	const group = groupOf( rel, '' );
	const add = ( category, keyPath, prop ) => {
		items.push( { kind: 'json-key', category, path: rel, context: '', selector: keyPath, group, decls: [], indicatorShaped: 'json-focus' === category, form: '' } );
		if ( TARGET_CATEGORIES.has( category ) ) {
			const f = { category, path: rel, context: '', selector: keyPath, prop, value: '', group, node: null };
			f.key = findingKey( f );
			findings.push( f );
		}
	};
	const walk = ( node, trail ) => {
		if ( Array.isArray( node ) ) {
			node.forEach( ( v, i ) => walk( v, trail.concat( String( i ) ) ) );
			return;
		}
		if ( node && 'object' === typeof node ) {
			for ( const [ k, v ] of Object.entries( node ) ) {
				const next = trail.concat( k );
				const keyPath = next.join( '.' );
				if ( RETIRED_JSON_KEYS.some( ( r ) => r.join( '.' ) === keyPath ) ) {
					add( 'legacy-token', keyPath, k );
					gap[ 'json-string' ] += countFocus( JSON.stringify( v ) );
					continue;
				}
				if ( /^:focus/.test( k ) ) {
					classifiedFocus += 1;
					const paints = /"(outline|shadow)"/.test( JSON.stringify( v ) );
					add( paints ? 'json-focus' : ( ':focus-within' === k ? 'container' : 'shared-state' ), keyPath, k );
					gap[ 'json-string' ] += countFocus( JSON.stringify( v ) );
					continue;
				}
				gap[ 'json-string' ] += countFocus( k );
				walk( v, next );
			}
			return;
		}
		if ( 'string' === typeof node ) {
			gap[ 'json-string' ] += countFocus( node );
			const tokens = tokensIn( node );
			tokens.forEach( ( t ) => add( 'legacy-token', trail.join( '.' ), t ) );
		}
	};
	walk( JSON.parse( text ), [] );
	return { items, findings, gap, classifiedFocus };
}

module.exports = { analyseCode, analyseJson, fragments };
