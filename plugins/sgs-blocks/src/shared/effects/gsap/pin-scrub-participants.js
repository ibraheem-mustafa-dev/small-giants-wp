/**
 * Tier G effect: which elements play on a pinned section's timeline (Spec 38 FR-38-6).
 *
 * Exports functions only; nothing runs on import.
 *
 * @package
 */

/**
 * Keep only nodes that are elements AND actually occupy a layout box.
 *
 * Spec 32's no-inline contract has each styled container PREPEND a scoped
 * `<style>` as a preceding SIBLING of its element, and the content of a pinned
 * section is typically a stack of such blocks. On the live frontend those tags
 * are lifted out to an external stylesheet at `render_block` p99, so they are
 * usually gone by the time this runs — but not in the editor canvas, and not on
 * any page where the lift has not run. A `<style>` node is `display: none`, so
 * tweening it animates nothing while still consuming a stagger slot and
 * shifting every following child's timing.
 *
 * @param {Iterable<Node>} nodes Candidate nodes.
 * @return {HTMLElement[]} Laid-out elements only.
 */
function laidOutElements( nodes ) {
	return Array.from( nodes ).filter(
		( node ) =>
			node.nodeType === 1 &&
			( node.offsetWidth > 0 ||
				node.offsetHeight > 0 ||
				null !== node.offsetParent )
	);
}

/**
 * Resolve which elements play on the pinned section's timeline.
 *
 * Order of preference, and why:
 *
 *  1. Anything carrying `data-sgs-fx-child`, ANYWHERE inside the section. This
 *     is the deliberate-authoring escape hatch — if someone has explicitly
 *     marked participants, honour exactly those. Searched by descendant rather
 *     than direct child because the wrapper depth is not stable (see 2).
 *  2. Otherwise, the element children of the section's CONTENT WRAPPER.
 *     `sgs/container` renders content inside `div.wp-block-sgs-container`,
 *     optionally within a `.sgs-container__inner` band, so the pinned element's
 *     own `children` is that wrapper and never the content.
 *
 *     The unwrap steps through those two FRAMEWORK-OWNED class names only. An
 *     earlier draft of this function descended through any single element child
 *     instead — which is subtly wrong: a section holding one heading would
 *     unwrap past the heading and animate the `<span>` inside it. Matching on
 *     the wrapper classes makes the descent deterministic and stops exactly
 *     where content begins, the same rule `fx-horizontal-panel.js` uses to find
 *     its track.
 *  3. If unwrapping finds nothing, fall back to the section's own laid-out
 *     children rather than returning empty, so a hand-authored section with no
 *     SGS wrapper still animates.
 *
 * @param {HTMLElement} el The pinned section.
 * @return {HTMLElement[]} Participants in DOM order.
 */
export function resolveParticipants( el ) {
	const marked = laidOutElements(
		el.querySelectorAll( '[data-sgs-fx-child]' )
	);
	if ( marked.length > 0 ) {
		return marked;
	}

	const WRAPPER_CLASSES = [
		'sgs-container__inner',
		'wp-block-sgs-container',
	];

	let node = el;
	// Bounded: the two wrapper classes can nest at most a couple of levels, and
	// a bound means malformed markup cannot spin here.
	for ( let depth = 0; depth < 4; depth++ ) {
		const inner = Array.from( node.children ).find(
			( child ) =>
				child.nodeType === 1 &&
				WRAPPER_CLASSES.some( ( cls ) =>
					child.classList.contains( cls )
				)
		);
		if ( ! inner ) {
			break;
		}
		node = inner;
	}

	const candidates = laidOutElements( node.children );
	return candidates.length > 0 ? candidates : laidOutElements( el.children );
}
