'use strict';

/**
 * Hover and press looks on touch screens, for stylesheets (Spec 38A FR-38A-17). The PHP twin for generated CSS is
 * `includes/helpers-hover-state.php::sgs_touch_hover_css`; both follow one contract, rule by rule, inside the rule:
 *
 *   - Mouse: every `:hover` selector member is guarded by `:where(:root:not(.sgs-touch-input))`.
 *     `assets/js/touch-input.js` puts `.sgs-touch-input` on <html> while the last pointer was a touch (unless the site
 *     chose "Show on tap"), so a phone can no longer leave a tapped element in its hover look ("sticky hover"). The
 *     guard is `:where()`, so it adds no specificity.
 *   - Touch: the same member with `:hover` replaced by the pressed class `.sgs-pressed` joins the rule. touch-input.js
 *     sets that class on the element under a touching finger and on its ancestors (the chain `:hover` covers) the
 *     moment the finger lands, and removes it when the finger lifts, slides off or starts a scroll; only under the
 *     default "Show while pressed". A class and a pseudo-class weigh the same, so specificity is unchanged.
 *   - A member that hovers only through `:not(:hover)` gets its touch half under `:where(:root.sgs-touch-input)`:
 *     unguarded it would also apply while a mouse hovers.
 *   - Press looks: a member keyed on `:active` gains the same member with `.sgs-pressed`, so a press look shows at
 *     once and clears on slide-off and scroll on every engine (WebKit's `:active` on touch is unreliable).
 *   - A `:hover` or `:active` after a pseudo-element (`::-webkit-scrollbar-thumb:hover`) gets no touch half: a class
 *     cannot follow a pseudo-element. Members without `:hover` or `:active` stay exactly as they are.
 *   - A hover rule inside `@media (hover: hover)` is mouse-only by its author: its touch half is added just before the
 *     outermost such media query, in the other at-rules around it. A query that adds other conditions
 *     (`(hover: hover) and (min-width: 1024px)`) keeps them around the half, so the half applies only where the
 *     author's rule would on a mouse. A press look (`:active`) inside a mouse-only query gets no twin.
 *   - A member that asks for a press and for no press at once (`.a:active:not(:hover)`) gets no touch half: both states
 *     are the one pressed class, so the half could never match.
 *   - A guarded `:active` member's twin is unguarded (the guard would keep it from ever matching on touch).
 *
 * Idempotent: a guarded member, or a touch half already in the stylesheet, is never added twice. "Already in the
 * stylesheet" means the identical rule: the same selector member, the same declarations and the same at-rules around it,
 * so a second rule for one selector with other declarations still gets its own half.
 *
 * Input the contract cannot rewrite is reported, never skipped: a stylesheet postcss cannot parse (unbalanced braces) and
 * CSS nesting under a rule that carries `:hover` or `:active` are findings, which fail the postbuild.
 *
 * @package SGS\Blocks
 */

const postcss = require( 'postcss' );
const selectorParser = require( 'postcss-selector-parser' );

/** The mouse guard. Must match includes/helpers-hover-state.php::SGS_HOVER_NOT_TOUCH. */
const SGS_HOVER_NOT_TOUCH = ':where(:root:not(.sgs-touch-input))';
/** The guard of a `:not(:hover)` member's touch half. Must match helpers-hover-state.php::SGS_HOVER_TOUCH_ONLY. */
const SGS_HOVER_TOUCH_ONLY = ':where(:root.sgs-touch-input)';
/** The class touch-input.js sets on the pressed chain. Must match helpers-hover-state.php::SGS_PRESSED_CLASS. */
const PRESSED_CLASS = 'sgs-pressed';

const LEGACY_PSEUDO_ELEMENTS = new Set( [ ':before', ':after', ':first-line', ':first-letter' ] );

/** A selector with each quoted string emptied, so text in an attribute value is never read as a state. */
function unquoted( selector ) {
	return selector.replace( /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""' );
}

/** Whether a selector carries `:hover` as a pseudo-class. */
function hasHover( selector ) {
	return /:hover(?![\w-])/i.test( unquoted( selector ) );
}

/** Whether a selector carries `:active` as a pseudo-class. */
function hasActive( selector ) {
	return /:active(?![\w-])/i.test( unquoted( selector ) );
}

/** Split a selector list into trimmed top-level members. */
function splitMembers( selector ) {
	return selectorParser().astSync( selector ).nodes.map( ( n ) => n.toString().trim() );
}

/** Whitespace-insensitive form of a selector member. */
function normalise( member ) {
	return member.replace( /\s+/g, ' ' ).replace( /\s*([>+~,()])\s*/g, '$1' ).trim();
}

/**
 * Whether a hover member cannot take the guard: it starts at a pseudo-element (a viewport scrollbar,
 * `::-webkit-scrollbar-thumb:hover`). Such a member is mouse-only in practice and stays as written.
 */
function unguardable( member ) {
	return /^::/.test( member );
}

/** The length of a member's first compound when it is the root (`:root`, `html`), else 0. */
function rootCompound( member ) {
	const m = /^(?::root|html)(?![\w-])/i.exec( member );
	if ( ! m ) {
		return 0;
	}
	let depth = 0;
	for ( let i = 0; i < member.length; i++ ) {
		const c = member[ i ];
		if ( '(' === c || '[' === c ) {
			depth++;
		} else if ( ')' === c || ']' === c ) {
			depth--;
		} else if ( 0 === depth && /[\s>+~]/.test( c ) ) {
			return i;
		}
	}
	return member.length;
}

/**
 * A member behind a root guard. A member that starts at the root (`:root :where(a:hover)`, WordPress's global styles)
 * takes the guard on that compound (`:root:where(:not(.sgs-touch-input))`), since the root is no descendant of itself;
 * any other member takes it as a descendant prefix. Both forms add no specificity.
 *
 * @param {string} member
 * @param {string} guard  SGS_HOVER_NOT_TOUCH or SGS_HOVER_TOUCH_ONLY.
 */
function withGuard( member, guard ) {
	const at = rootCompound( member );
	if ( at ) {
		const inner = guard.slice( ':where(:root'.length, -1 );
		return `${ member.slice( 0, at ) }:where(${ inner })${ member.slice( at ) }`;
	}
	return `${ guard } ${ member }`;
}

/** A member without the mouse guard (either form). */
function unguarded( member ) {
	if ( member.startsWith( SGS_HOVER_NOT_TOUCH ) ) {
		return member.slice( SGS_HOVER_NOT_TOUCH.length ).trim();
	}
	const at = rootCompound( member );
	const tail = ':where(:not(.sgs-touch-input))';
	if ( at && member.slice( 0, at ).endsWith( tail ) ) {
		return member.slice( 0, at - tail.length ) + member.slice( at );
	}
	return member;
}

const TRANSPARENT_PSEUDOS = new Set( [ ':not', ':is', ':where' ] );

/**
 * The touch half of one member: each `:hover` and `:active` becomes `.sgs-pressed`.
 *
 * @param {string} member A selector member (without the mouse guard).
 * @returns {{selector: string, negated: boolean}|null} Null when a state follows a pseudo-element, or when one compound
 *   both requires and negates the state (`.a:active:not(:hover)`): both are the one class, so the half could never match.
 */
function touchMember( member ) {
	let negated = false;
	let impossible = false;
	// For each selector list, the compounds (by index) that hold a positive state and a negated one.
	const positive = new Map();
	const negative = new Map();
	const mark = ( map, selector, index ) => {
		if ( ! map.has( selector ) ) {
			map.set( selector, new Set() );
		}
		map.get( selector ).add( index );
	};
	const out = selectorParser( ( root ) => {
		root.walkPseudos( ( pseudo ) => {
			const name = pseudo.value.toLowerCase();
			if ( ':hover' !== name && ':active' !== name ) {
				return;
			}
			for ( let prev = pseudo.prev(); prev && 'combinator' !== prev.type; prev = prev.prev() ) {
				if ( 'pseudo' === prev.type && ( prev.value.startsWith( '::' ) || LEGACY_PSEUDO_ELEMENTS.has( prev.value.toLowerCase() ) ) ) {
					impossible = true;
				}
			}
			for ( let up = pseudo.parent; up; up = up.parent ) {
				if ( 'pseudo' === up.type && ':not' === up.value.toLowerCase() ) {
					negated = true;
				}
			}
			// The compound the state belongs to, climbing out of :not(), :is() and :where().
			let node = pseudo;
			let isNegated = false;
			while ( node.parent && node.parent.parent && 'pseudo' === node.parent.parent.type && TRANSPARENT_PSEUDOS.has( node.parent.parent.value.toLowerCase() ) ) {
				isNegated = isNegated || ':not' === node.parent.parent.value.toLowerCase();
				node = node.parent.parent;
			}
			const selector = node.parent;
			if ( selector ) {
				const index = selector.nodes.slice( 0, selector.nodes.indexOf( node ) ).filter( ( n ) => 'combinator' === n.type ).length;
				mark( isNegated ? negative : positive, selector, index );
			}
			pseudo.replaceWith( selectorParser.className( { value: PRESSED_CLASS } ) );
		} );
	} ).processSync( member );
	for ( const [ selector, indexes ] of positive ) {
		if ( negative.has( selector ) && [ ...indexes ].some( ( i ) => negative.get( selector ).has( i ) ) ) {
			impossible = true;
		}
	}
	return impossible ? null : { selector: out.trim(), negated };
}

/**
 * The members a rule should carry under the contract.
 *
 * @param {string[]} members  The rule's members.
 * @param {boolean}  inMouse  Whether the rule sits in `@media (hover: hover)` (its touch halves go elsewhere).
 * @returns {{members: string[], touch: string[], guarded: number}} The rule's new members, the touch halves a mouse
 *   media rule needs outside its media query, and the hover members newly guarded.
 */
function contractMembers( members, inMouse ) {
	const out = [];
	const touch = [];
	let guarded = 0;
	for ( const m of members ) {
		const plain = unguarded( m );
		if ( hasHover( plain ) && unguardable( plain ) ) {
			out.push( m );
		} else if ( hasHover( plain ) ) {
			const t = touchMember( plain );
			if ( t ) {
				const half = t.negated ? withGuard( t.selector, SGS_HOVER_TOUCH_ONLY ) : t.selector;
				( inMouse ? touch : out ).push( half );
			}
			if ( inMouse ) {
				out.push( m );
			} else {
				if ( plain === m ) {
					guarded++;
				}
				out.push( withGuard( plain, SGS_HOVER_NOT_TOUCH ) );
			}
		} else if ( hasActive( plain ) ) {
			out.push( m );
			// A press look inside a mouse-only query is mouse-only, and the halves of that query are hoisted out of it: no twin.
			const t = inMouse ? null : touchMember( plain );
			if ( t && ! t.negated ) {
				out.push( t.selector );
			}
		} else {
			out.push( m );
		}
	}
	return { members: out, touch, guarded };
}

/**
 * What a media query leaves once its `(hover: hover)` condition is taken out, or null when the query is not mouse-only.
 * Mouse-only means `(hover: hover)` is one of the conditions joined by `and`: a query list (`,`), a `not` or an `or` is
 * not. Must match helpers-hover-state.php::sgs_touch_hover_mouse_remainder.
 *
 * @param {string} params A media query (the text after `@media`).
 * @returns {string|null} '' for exactly `(hover: hover)`, else the remaining conditions joined by ` and `.
 */
function mouseRemainder( params ) {
	const text = params.trim().replace( /\s+/g, ' ' );
	if ( text.includes( ',' ) || /(^|\s)(not|or)(\s|\()/i.test( text ) ) {
		return null;
	}
	const parts = text.split( /\s+and\s+/i );
	const isHover = ( p ) => '(hover:hover)' === p.replace( /\s+/g, '' ).toLowerCase();
	if ( ! parts.some( isHover ) ) {
		return null;
	}
	return parts.filter( ( p ) => ! isHover( p ) && 'all' !== p.toLowerCase() ).join( ' and ' );
}

/** The mouse-only remainder of an at-rule node, or null when it is not a mouse-only media query. */
function nodeRemainder( node ) {
	return 'atrule' === node.type && 'media' === node.name.toLowerCase() ? mouseRemainder( node.params ) : null;
}

/** The outermost mouse-only media ancestor of a node, or null. */
function outermostMouseMedia( node ) {
	let found = null;
	for ( let cursor = node.parent; cursor; cursor = cursor.parent ) {
		if ( null !== nodeRemainder( cursor ) ) {
			found = cursor;
		}
	}
	return found;
}

/** Whether a node sits inside `@keyframes`. */
function inKeyframes( node ) {
	for ( let cursor = node.parent; cursor; cursor = cursor.parent ) {
		if ( 'atrule' === cursor.type && /keyframes$/i.test( cursor.name ) ) {
			return true;
		}
	}
	return false;
}

/** Whether a node has a rule among its ancestors (CSS nesting). */
function hasAncestorRule( node ) {
	for ( let cursor = node.parent; cursor; cursor = cursor.parent ) {
		if ( 'rule' === cursor.type ) {
			return true;
		}
	}
	return false;
}

/** One at-rule as a context segment, whitespace-free and lower-case. Must match helpers-hover-state.php::sgs_touch_hover_ctx. */
const segment = ( name, params ) => `/@${ name }${ params }`.toLowerCase().replace( /\s+/g, '' );

/**
 * The at-rules around a rule as one string. With `halves`, the mouse-only conditions are taken out, as they are for the
 * touch half hoisted out of them.
 */
function contextOf( rule, halves ) {
	const parts = [];
	for ( let cursor = rule.parent; cursor; cursor = cursor.parent ) {
		if ( 'atrule' !== cursor.type ) {
			continue;
		}
		const rest = halves ? nodeRemainder( cursor ) : null;
		parts.unshift( null === rest ? segment( cursor.name, cursor.params ) : ( rest ? segment( 'media', rest ) : '' ) );
	}
	return parts.join( '' );
}

/** A rule's declarations as text, whitespace-insensitive. Must match helpers-hover-state.php::sgs_touch_hover_body_key. */
function bodyKey( rule ) {
	const text = ( rule.nodes || [] )
		.filter( ( n ) => 'comment' !== n.type )
		.map( ( n ) => ( 'decl' === n.type ? `${ n.prop }:${ n.value }${ n.important ? '!important' : '' }` : n.toString() ) )
		.join( ';' );
	return text.replace( /\s+/g, ' ' ).replace( /\s*([:;,{}!])\s*/g, '$1' ).trim().replace( /;+$/, '' );
}

/** The identity of one member of one rule: the at-rules around it, the member and the declarations. */
const ruleKey = ( context, member, body ) => `${ context }|${ normalise( member ) }|${ body }`;

/** Clone the at-rules from `node` up to and including `stop` around `inner`, without their mouse-only conditions. */
function nestBetween( node, stop, inner ) {
	let content = inner;
	for ( let cursor = node.parent; cursor; cursor = cursor.parent ) {
		if ( 'atrule' === cursor.type ) {
			const rest = nodeRemainder( cursor );
			if ( '' !== rest ) {
				const shell = cursor.clone();
				shell.removeAll();
				if ( null !== rest ) {
					shell.params = rest;
				}
				shell.append( content );
				content = shell;
			}
		}
		if ( cursor === stop ) {
			break;
		}
	}
	return content;
}

/** Every rule of a stylesheet as `ruleKey`s, one per selector member (keyframes and unparsable selectors left out). */
function ruleKeySet( root ) {
	const set = new Set();
	root.walkRules( ( rule ) => {
		if ( inKeyframes( rule ) ) {
			return;
		}
		let members;
		try {
			members = splitMembers( rule.selector );
		} catch ( e ) {
			return;
		}
		const context = contextOf( rule, false );
		const body = bodyKey( rule );
		for ( const m of members ) {
			set.add( ruleKey( context, m, body ) );
		}
	} );
	return set;
}

/** Order-preserving de-duplication of members. */
function dedupe( members ) {
	const seen = new Set();
	return members.filter( ( m ) => {
		const k = normalise( m );
		if ( seen.has( k ) ) {
			return false;
		}
		seen.add( k );
		return true;
	} );
}

/** Whether a rule, or a rule around it, carries `:hover` or `:active`. */
function carriesState( rule ) {
	for ( let cursor = rule; cursor; cursor = cursor.parent ) {
		if ( 'rule' === cursor.type && ( hasHover( cursor.selector || '' ) || hasActive( cursor.selector || '' ) ) ) {
			return true;
		}
	}
	return false;
}

/**
 * CSS nesting the contract cannot rewrite: a rule or an at-rule inside a rule, when that rule or one around it carries
 * `:hover` or `:active`. The PHP twin copies such a body verbatim, so it would ship without its guard and touch half.
 */
function nestingFindings( root ) {
	const findings = [];
	const note = ( node, selector ) => {
		findings.push( { kind: 'nested-rule', selector, line: node.source && node.source.start ? node.source.start.line : 0 } );
	};
	root.walkRules( ( rule ) => {
		if ( hasAncestorRule( rule ) && carriesState( rule ) ) {
			note( rule, rule.selector );
		}
	} );
	root.walkAtRules( ( atrule ) => {
		if ( atrule.parent && 'rule' === atrule.parent.type && carriesState( atrule.parent ) ) {
			note( atrule, `@${ atrule.name } ${ atrule.params }` );
		}
	} );
	return findings;
}

/** The indentation a rule's own line starts with, so a selector list keeps one member per line at that depth. */
function indentOf( rule ) {
	const before = ( rule.raws && rule.raws.before ) || '';
	return before.slice( before.lastIndexOf( '\n' ) + 1 ).replace( /[^ \t]/g, '' );
}

/** postcss's parse error (unbalanced braces, for one) as a finding. */
function parseFinding( e ) {
	return { kind: 'unparsable-stylesheet', selector: e && e.reason ? e.reason : String( e ), line: e && e.line ? e.line : 0 };
}

/**
 * Run the transform over a stylesheet.
 *
 * @param {string} css      Input CSS.
 * @param {string} filename For messages only.
 * @returns {{css: string, guardedCount: number, touchCount: number, findings: Array<{kind: string, selector: string, line: number}>}}
 */
function transformCss( css, filename ) {
	let root;
	try {
		root = postcss.parse( css, { from: filename } );
	} catch ( e ) {
		return { css, guardedCount: 0, touchCount: 0, findings: [ parseFinding( e ) ] };
	}
	const findings = nestingFindings( root );
	let guardedCount = 0;
	let touchCount = 0;
	const existing = ruleKeySet( root );

	const rules = [];
	root.walkRules( ( rule ) => {
		const sel = rule.selector || '';
		if ( ( hasHover( sel ) || hasActive( sel ) ) && ! inKeyframes( rule ) && ! hasAncestorRule( rule ) ) {
			rules.push( rule );
		}
	} );

	for ( const rule of rules ) {
		let members;
		try {
			members = splitMembers( rule.selector );
		} catch ( e ) {
			findings.push( { kind: 'unparsable-selector', selector: rule.selector, line: rule.source && rule.source.start ? rule.source.start.line : 0 } );
			continue;
		}
		const mouse = outermostMouseMedia( rule );
		const next = contractMembers( members, !! mouse );
		guardedCount += next.guarded;
		const before = new Set( members.map( normalise ) );
		const finalMembers = dedupe( next.members );
		const fresh = finalMembers.filter( ( m ) => ! before.has( normalise( m ) ) && ! hasHover( m ) );
		touchCount += fresh.length;
		if ( finalMembers.map( normalise ).join( ',' ) !== members.map( normalise ).join( ',' ) ) {
			rule.selector = finalMembers.join( ',\n' + indentOf( rule ) );
		}
		const body = bodyKey( rule );
		for ( const m of fresh ) {
			existing.add( ruleKey( contextOf( rule, false ), m, body ) );
		}
		if ( mouse ) {
			const halfContext = contextOf( rule, true );
			const missing = dedupe( next.touch ).filter( ( m ) => ! existing.has( ruleKey( halfContext, m, body ) ) );
			if ( missing.length ) {
				mouse.before( nestBetween( rule, mouse, rule.clone( { selector: missing.join( ',\n' + indentOf( rule ) ) } ) ) );
				missing.forEach( ( m ) => existing.add( ruleKey( halfContext, m, body ) ) );
				touchCount += missing.length;
			}
		}
	}

	return { css: root.toString(), guardedCount, touchCount, findings };
}

/**
 * Every member that breaks the contract: an unguarded `:hover` outside `@media (hover: hover)`, or a `:hover` or
 * `:active` member whose touch half is not in the stylesheet as an identical rule (same declarations, same at-rules);
 * and input the contract cannot read (unbalanced braces) or rewrite (nesting under a rule that carries a state).
 *
 * @param {string} css
 * @param {string} filename
 * @returns {{hoverMembers: number, activeMembers: number, findings: Array<{kind: string, selector: string, line: number}>}}
 */
function auditCss( css, filename ) {
	let root;
	try {
		root = postcss.parse( css, { from: filename } );
	} catch ( e ) {
		return { hoverMembers: 0, activeMembers: 0, findings: [ parseFinding( e ) ] };
	}
	const findings = nestingFindings( root );
	let hoverMembers = 0;
	let activeMembers = 0;
	const existing = ruleKeySet( root );
	root.walkRules( ( rule ) => {
		const sel = rule.selector || '';
		if ( ( ! hasHover( sel ) && ! hasActive( sel ) ) || inKeyframes( rule ) || hasAncestorRule( rule ) ) {
			return;
		}
		const line = rule.source && rule.source.start ? rule.source.start.line : 0;
		let members;
		try {
			members = splitMembers( sel );
		} catch ( e ) {
			findings.push( { kind: 'unparsable-selector', selector: sel, line } );
			return;
		}
		const inMouse = !! outermostMouseMedia( rule );
		const context = contextOf( rule, true );
		const body = bodyKey( rule );
		const has = ( half ) => existing.has( ruleKey( context, half, body ) );
		for ( const m of members ) {
			const plain = unguarded( m );
			if ( hasHover( plain ) && unguardable( plain ) ) {
				continue;
			}
			if ( hasHover( plain ) ) {
				hoverMembers++;
				if ( plain === m && ! inMouse ) {
					findings.push( { kind: 'unguarded-hover', selector: m, line } );
					continue;
				}
				const t = touchMember( plain );
				const half = t && ( t.negated ? withGuard( t.selector, SGS_HOVER_TOUCH_ONLY ) : t.selector );
				if ( half && ! has( half ) ) {
					findings.push( { kind: 'missing-touch-half', selector: m, line } );
				}
			} else if ( hasActive( plain ) ) {
				activeMembers++;
				const t = inMouse ? null : touchMember( plain );
				if ( t && ! t.negated && ! has( t.selector ) ) {
					findings.push( { kind: 'missing-press-half', selector: m, line } );
				}
			}
		}
	} );
	return { hoverMembers, activeMembers, findings };
}

module.exports = { transformCss, auditCss, touchMember, mouseRemainder, SGS_HOVER_NOT_TOUCH, SGS_HOVER_TOUCH_ONLY, PRESSED_CLASS };
