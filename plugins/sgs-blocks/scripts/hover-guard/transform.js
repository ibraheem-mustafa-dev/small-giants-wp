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
 *     outermost such media query, in the other at-rules around it.
 *
 * Idempotent: a guarded member, or a touch half already in the stylesheet, is never added twice.
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

/** Whether a selector carries `:hover` as a pseudo-class. */
function hasHover( selector ) {
	return /:hover(?![\w-])/i.test( selector );
}

/** Whether a selector carries `:active` as a pseudo-class. */
function hasActive( selector ) {
	return /:active(?![\w-])/i.test( selector );
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
 * Whether a hover member cannot take the guard as a descendant prefix: it starts at a pseudo-element (a viewport
 * scrollbar, `::-webkit-scrollbar-thumb:hover`) or at the root itself. Such a member is mouse-only in practice and stays
 * as written.
 */
function unguardable( member ) {
	return /^(::|:root|html)/i.test( member );
}

/** A member without the mouse guard. */
function unguarded( member ) {
	return member.startsWith( SGS_HOVER_NOT_TOUCH ) ? member.slice( SGS_HOVER_NOT_TOUCH.length ).trim() : member;
}

/**
 * The touch half of one member: each `:hover` and `:active` becomes `.sgs-pressed`.
 *
 * @param {string} member A selector member (without the mouse guard).
 * @returns {{selector: string, negated: boolean}|null} Null when a state follows a pseudo-element.
 */
function touchMember( member ) {
	let negated = false;
	let impossible = false;
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
			pseudo.replaceWith( selectorParser.className( { value: PRESSED_CLASS } ) );
		} );
	} ).processSync( member );
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
				const half = t.negated ? `${ SGS_HOVER_TOUCH_ONLY } ${ t.selector }` : t.selector;
				( inMouse ? touch : out ).push( half );
			}
			if ( inMouse ) {
				out.push( m );
			} else {
				if ( plain === m ) {
					guarded++;
				}
				out.push( `${ SGS_HOVER_NOT_TOUCH } ${ plain }` );
			}
		} else if ( hasActive( m ) ) {
			out.push( m );
			const t = touchMember( m );
			if ( t && ! t.negated ) {
				out.push( t.selector );
			}
		} else {
			out.push( m );
		}
	}
	return { members: out, touch, guarded };
}

/** The outermost `@media (hover: hover)` ancestor of a node, or null. */
function outermostMouseMedia( node ) {
	let found = null;
	for ( let cursor = node.parent; cursor; cursor = cursor.parent ) {
		if ( isMouseMedia( cursor ) ) {
			found = cursor;
		}
	}
	return found;
}

/** Whether an at-rule is a mouse-only media query (`(hover: hover)` without `not`). */
function isMouseMedia( node ) {
	if ( ! node || 'atrule' !== node.type || 'media' !== node.name.toLowerCase() ) {
		return false;
	}
	const params = node.params.toLowerCase().replace( /\s+/g, '' );
	return params.includes( '(hover:hover)' ) && ! params.includes( 'not' );
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

/** Clone the at-rules between `node` and `stop` (exclusive) around `inner`. */
function nestBetween( node, stop, inner ) {
	let content = inner;
	for ( let cursor = node.parent; cursor && cursor !== stop; cursor = cursor.parent ) {
		if ( 'atrule' === cursor.type ) {
			const shell = cursor.clone();
			shell.removeAll();
			shell.append( content );
			content = shell;
		}
	}
	return content;
}

/** Every selector member in a stylesheet, normalised. */
function memberSet( root ) {
	const set = new Set();
	root.walkRules( ( rule ) => {
		if ( ! inKeyframes( rule ) ) {
			for ( const m of splitMembers( rule.selector ) ) {
				set.add( normalise( m ) );
			}
		}
	} );
	return set;
}

/** Order-preserving de-duplication of members, also against members already elsewhere when given. */
function dedupe( members, elsewhere ) {
	const seen = new Set();
	return members.filter( ( m ) => {
		const k = normalise( m );
		if ( seen.has( k ) || ( elsewhere && elsewhere.has( k ) ) ) {
			return false;
		}
		seen.add( k );
		return true;
	} );
}

/**
 * Run the transform over a stylesheet.
 *
 * @param {string} css      Input CSS.
 * @param {string} filename For messages only.
 * @returns {{css: string, guardedCount: number, touchCount: number, findings: Array<{kind: string, selector: string, line: number}>}}
 */
function transformCss( css, filename ) {
	const root = postcss.parse( css, { from: filename } );
	const findings = [];
	let guardedCount = 0;
	let touchCount = 0;
	const existing = memberSet( root );

	const rules = [];
	root.walkRules( ( rule ) => {
		const sel = rule.selector || '';
		if ( ( hasHover( sel ) || hasActive( sel ) ) && ! inKeyframes( rule ) ) {
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
			rule.selector = finalMembers.join( ',\n' );
		}
		for ( const m of fresh ) {
			existing.add( normalise( m ) );
		}
		if ( mouse ) {
			const missing = dedupe( next.touch, existing );
			if ( missing.length ) {
				mouse.before( nestBetween( rule, mouse, rule.clone( { selector: missing.join( ',\n' ) } ) ) );
				missing.forEach( ( m ) => existing.add( normalise( m ) ) );
				touchCount += missing.length;
			}
		}
	}

	return { css: root.toString(), guardedCount, touchCount, findings };
}

/**
 * Every member that breaks the contract: an unguarded `:hover` outside `@media (hover: hover)`, or a `:hover` or
 * `:active` member whose touch half is in no rule of the stylesheet.
 *
 * @param {string} css
 * @param {string} filename
 * @returns {{hoverMembers: number, activeMembers: number, findings: Array<{kind: string, selector: string, line: number}>}}
 */
function auditCss( css, filename ) {
	const root = postcss.parse( css, { from: filename } );
	const findings = [];
	let hoverMembers = 0;
	let activeMembers = 0;
	const existing = memberSet( root );
	root.walkRules( ( rule ) => {
		const sel = rule.selector || '';
		if ( ( ! hasHover( sel ) && ! hasActive( sel ) ) || inKeyframes( rule ) ) {
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
				const half = t && ( t.negated ? `${ SGS_HOVER_TOUCH_ONLY } ${ t.selector }` : t.selector );
				if ( half && ! existing.has( normalise( half ) ) ) {
					findings.push( { kind: 'missing-touch-half', selector: m, line } );
				}
			} else if ( hasActive( m ) ) {
				activeMembers++;
				const t = touchMember( m );
				if ( t && ! t.negated && ! existing.has( normalise( t.selector ) ) ) {
					findings.push( { kind: 'missing-press-half', selector: m, line } );
				}
			}
		}
	} );
	return { hoverMembers, activeMembers, findings };
}

module.exports = { transformCss, auditCss, touchMember, SGS_HOVER_NOT_TOUCH, SGS_HOVER_TOUCH_ONLY, PRESSED_CLASS };
