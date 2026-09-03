'use strict';

/**
 * Selector-level classification for the hover guard.
 *
 * A CSS rule can carry a comma-separated selector LIST. Each list member is
 * classified independently because a single rule frequently mixes a `:hover`
 * member with a `:focus-visible`/`:focus-within` member sharing identical
 * declarations (the touch-safe emission pattern used across every SGS block
 * — see includes/helpers-hover-state.php). Guarding must apply per member,
 * never per rule, or the focus member gets wrongly wrapped.
 *
 * @package SGS\Blocks
 */

const parser = require( 'postcss-selector-parser' );

/** Pseudo-classes that must never be wrapped in the touch guard. */
const FOCUS_PSEUDOS = new Set( [ ':focus-visible', ':focus-within', ':focus' ] );

/**
 * Classify a single selector-parser Selector node for hasHover/hasFocus,
 * shared by both the top-level split and the `:where()` rescue below.
 *
 * @param {import('postcss-selector-parser').Selector} node
 * @returns {{hasHover: boolean, hasFocus: boolean}}
 */
function classifyNode( node ) {
	let hasHover = false;
	let hasFocus = false;
	node.walkPseudos( ( pseudo ) => {
		const name = pseudo.value.toLowerCase();
		if ( ':hover' === name ) {
			hasHover = true;
		}
		if ( FOCUS_PSEUDOS.has( name ) ) {
			hasFocus = true;
		}
	} );
	return { hasHover, hasFocus };
}

/**
 * RESCUE for Bean's ruling 2026-09-03 (google-reviews `--arrow`): a hand-authored
 * `:where( A:hover, A:focus-visible )` selector is a SINGLE top-level member
 * that trips the ordinary hover+focus-in-one-compound ambiguity check, but
 * it is not actually ambiguous — the author already partitioned hover from
 * focus themselves, just inside one `:where()` argument list instead of as
 * two top-level comma members. `:where()` is used here deliberately for its
 * ZERO-SPECIFICITY guarantee (unlike `:is()`, which takes the specificity of
 * its most specific argument) — that guarantee is why this rescue is scoped
 * to `:where()` only. Splitting an `:is()`-grouped hover+focus selector
 * would risk silently changing its specificity, so that shape is left to
 * fall through to 'ambiguous' rather than guessed at.
 *
 * Only rescues the CLEAN case: the entire member is nothing but one
 * `:where(...)` pseudo (no selector text outside it), every inner list item
 * is unambiguously hover-only or focus-only (no item mixes both, no item is
 * neither), and both buckets are non-empty. Anything else falls through to
 * 'ambiguous' exactly as before — this rescue never guesses.
 *
 * Each returned member is RE-WRAPPED in its own `:where(...)` — not left
 * bare — specifically to preserve the original's zero specificity. The
 * source rule's `:where()` zeroed EVERYTHING inside it, including the
 * `:hover`/`:focus-visible` pseudo-classes themselves; extracting
 * `A:hover` bare would hand it real specificity (0,1,0) it never had,
 * silently changing how it competes against neighbouring rules. Re-wrapping
 * keeps the hover half at zero specificity going into the transform's own
 * guard-prefix (which is ALSO `:where(...)`, so the combination stays zero
 * throughout, guarded or not), and keeps the focus half at exactly the zero
 * specificity it always had.
 *
 * @param {import('postcss-selector-parser').Selector} node
 * @returns {{hover: string, focus: string}|null}
 */
function tryWhereRescue( node ) {
	if ( 1 !== node.nodes.length ) {
		return null;
	}
	const only = node.nodes[ 0 ];
	if ( 'pseudo' !== only.type || ':where' !== only.value.toLowerCase() ) {
		return null;
	}
	if ( ! only.nodes || only.nodes.length < 2 ) {
		return null; // nothing to partition
	}

	const hoverItems = [];
	const focusItems = [];

	for ( const inner of only.nodes ) {
		const { hasHover, hasFocus } = classifyNode( inner );
		if ( hasHover && hasFocus ) {
			return null; // an inner item is itself ambiguous — don't guess
		}
		if ( hasHover ) {
			hoverItems.push( inner.toString().trim() );
		} else if ( hasFocus ) {
			focusItems.push( inner.toString().trim() );
		} else {
			return null; // an inner item is neither — not the clean shape this rescues
		}
	}

	if ( 0 === hoverItems.length || 0 === focusItems.length ) {
		return null;
	}

	return {
		hover: ':where(' + hoverItems.join( ', ' ) + ')',
		focus: ':where(' + focusItems.join( ', ' ) + ')',
	};
}

/**
 * Split a selector list into hover members, focus members, and "other"
 * members (containing neither :hover nor a focus pseudo — these are left
 * untouched, they are not a hover rule at all).
 *
 * A member containing BOTH :hover and a focus pseudo-class anywhere in its
 * compound chain (e.g. a combinator selector where one compound has
 * `:hover` and a later compound has `:focus-within`) is treated as
 * AMBIGUOUS — the classifier must not guess which pseudo the caller
 * intended to gate on, so it is reported for the checker to fail on —
 * UNLESS the member is a `:where()` group cleanly rescuable per
 * tryWhereRescue() above, in which case its hover/focus halves are split
 * out (each still zero-specificity) into the hover/focus buckets instead.
 *
 * @param {string} selectorList Raw CSS selector list text.
 * @returns {{hover: string[], focus: string[], other: string[], ambiguous: string[]}}
 */
function splitSelectorList( selectorList ) {
	const result = { hover: [], focus: [], other: [], ambiguous: [] };

	const root = parser().astSync( selectorList );

	root.each( ( selectorNode ) => {
		const raw = selectorNode.toString().trim();
		const { hasHover, hasFocus } = classifyNode( selectorNode );

		if ( hasHover && hasFocus ) {
			const rescued = tryWhereRescue( selectorNode );
			if ( rescued ) {
				result.hover.push( rescued.hover );
				result.focus.push( rescued.focus );
			} else {
				result.ambiguous.push( raw );
			}
		} else if ( hasHover ) {
			result.hover.push( raw );
		} else if ( hasFocus ) {
			result.focus.push( raw );
		} else {
			result.other.push( raw );
		}
	} );

	return result;
}

module.exports = { splitSelectorList, FOCUS_PSEUDOS };
