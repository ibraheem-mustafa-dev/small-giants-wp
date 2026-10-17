'use strict';

/**
 * Selector helpers for check-focus-system.js: split a selector list at top level, resolve
 * nesting (`&` and implicit descendant), and describe each member's focus shape.
 *
 * @package SGS\Blocks
 */

/** Split on `sep` at bracket depth 0, outside quotes. */
function splitTop( text, sep ) {
	const out = [];
	let depth = 0;
	let quote = '';
	let cur = '';
	for ( let i = 0; i < text.length; i++ ) {
		const ch = text[ i ];
		if ( quote ) {
			cur += ch;
			if ( '\\' === ch && i + 1 < text.length ) {
				cur += text[ ++i ];
			} else if ( ch === quote ) {
				quote = '';
			}
			continue;
		}
		if ( '"' === ch || "'" === ch ) {
			quote = ch;
		} else if ( '(' === ch || '[' === ch ) {
			depth++;
		} else if ( ')' === ch || ']' === ch ) {
			depth--;
		}
		if ( 0 === depth && ch === sep ) {
			out.push( cur );
			cur = '';
			continue;
		}
		cur += ch;
	}
	out.push( cur );
	return out.map( ( s ) => s.trim() ).filter( Boolean );
}

const norm = ( s ) => s.replace( /\s+/g, ' ' ).trim();

/** Resolve a postcss rule's selector against its ancestor rules. */
function resolveSelector( rule ) {
	let members = splitTop( rule.selector || '', ',' ).map( norm );
	let parent = rule.parent;
	while ( parent && 'root' !== parent.type && 'document' !== parent.type ) {
		if ( 'rule' === parent.type ) {
			const outer = splitTop( parent.selector || '', ',' ).map( norm );
			const next = [];
			for ( const o of outer ) {
				for ( const m of members ) {
					next.push( m.includes( '&' ) ? m.replace( /&/g, o ) : `${ o } ${ m }` );
				}
			}
			members = next;
		}
		parent = parent.parent;
	}
	return members;
}

/** The at-rule chain around a node, outermost first, e.g. `@media (forced-colors: active)`. */
function contextOf( node ) {
	const parts = [];
	let parent = node.parent;
	while ( parent && 'root' !== parent.type && 'document' !== parent.type ) {
		if ( 'atrule' === parent.type ) {
			parts.unshift( norm( `@${ parent.name } ${ parent.params }` ) );
		}
		parent = parent.parent;
	}
	return parts.join( ' > ' );
}

/** Remove every `:name( … )` group (balanced), returning the stripped text and the removed bodies. */
function takeFunctional( text, name ) {
	const bodies = [];
	let out = '';
	let i = 0;
	const needle = `:${ name }(`;
	while ( i < text.length ) {
		const at = text.indexOf( needle, i );
		if ( -1 === at ) {
			out += text.slice( i );
			break;
		}
		out += text.slice( i, at );
		let depth = 0;
		let j = at + needle.length - 1;
		for ( ; j < text.length; j++ ) {
			if ( '(' === text[ j ] ) {
				depth++;
			} else if ( ')' === text[ j ] ) {
				depth--;
				if ( 0 === depth ) {
					break;
				}
			}
		}
		bodies.push( text.slice( at + needle.length, j ) );
		i = j + 1;
	}
	return { stripped: out, bodies };
}

const POS_FOCUS_RE = /:focus(?:-visible)?(?![\w-])/;

/**
 * Describe one selector member.
 *
 * @returns {{ focus: boolean, within: boolean, hasFocus: boolean, hover: boolean, neg: boolean }}
 *   focus     a positive :focus or :focus-visible (outside :not and :has), on the subject or a proxy;
 *   within    a positive :focus-within (outside :not);
 *   hasFocus  a focus state inside :has( … ), i.e. a wrapper painted for a focused descendant;
 *   hover     a positive :hover;
 *   neg       a :not( :focus… ) negation.
 */
function memberInfo( member ) {
	const notPart = takeFunctional( member, 'not' );
	const hasPart = takeFunctional( notPart.stripped, 'has' );
	const rest = hasPart.stripped;
	return {
		focus: POS_FOCUS_RE.test( rest ),
		within: rest.includes( ':focus-within' ),
		hasFocus: hasPart.bodies.some( ( b ) => b.includes( ':focus' ) ),
		hover: rest.includes( ':hover' ),
		neg: notPart.bodies.some( ( b ) => b.includes( ':focus' ) ),
	};
}

const FOCUSABLE_TAG_RE = /(^|[\s>+~(,])(a|button|input|select|textarea|summary|iframe)(?=$|[.:#[\s>+~),])/;
const FOCUSABLE_ATTR_RE = /\[(tabindex|href|contenteditable)|\[role=["']?(button|tab|link|radio|checkbox|switch|menuitem|option|slider)/;
const FOCUSABLE_CLASS_RE = /(__|-)(tab|btn|button|link|toggle|trigger|input|close|arrow|dot|thumb|handle|submit|control|summary|chip|swatch)(?![\w])/;

/**
 * Whether a member's subject (its last compound, pseudo-elements removed) looks focusable: a
 * focusable element, a focus-bearing attribute or role, or a BEM element named like a control.
 */
function subjectFocusable( member ) {
	const parts = splitTop( member.replace( /\s*([>+~])\s*/g, ' ' ), ' ' );
	const subject = ( parts[ parts.length - 1 ] || '' ).replace( /::?(before|after|placeholder|marker|-webkit-[\w-]+|-moz-[\w-]+)/g, '' );
	return FOCUSABLE_TAG_RE.test( ` ${ subject }` ) || FOCUSABLE_ATTR_RE.test( subject ) || FOCUSABLE_CLASS_RE.test( subject );
}

/** Summarise a selector list. */
function selectorInfo( members ) {
	const infos = members.map( memberInfo );
	return {
		focusable: members.some( subjectFocusable ),
		anyFocus: infos.some( ( i ) => i.focus ),
		allFocus: infos.length > 0 && infos.every( ( i ) => i.focus ),
		anyWithin: infos.some( ( i ) => i.within ),
		anyHasFocus: infos.some( ( i ) => i.hasFocus ),
		anyHover: infos.some( ( i ) => i.hover ),
		anyNeg: infos.some( ( i ) => i.neg ),
		anyPlain: infos.some( ( i ) => ! i.focus && ! i.within && ! i.hasFocus && ! i.hover && ! i.neg ),
	};
}

function countFocus( text ) {
	return ( String( text ).match( /:focus/g ) || [] ).length;
}

module.exports = { splitTop, norm, resolveSelector, contextOf, memberInfo, selectorInfo, subjectFocusable, countFocus };
