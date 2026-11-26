/**
 * Hides, by the visually-hidden technique, the label an inner control draws when it repeats the label its
 * `ResponsiveOverride` already shows on the markers' row. The label stays in the accessibility tree, so the control
 * keeps its accessible name.
 *
 * Only a label-like element whose text equals the override's label is hidden, and never one that wraps a form control
 * (a checkbox label holds the checkbox), so a control that draws a different label of its own is left alone.
 */
import { useEffect } from '@wordpress/element';

/** Added to a duplicate label; `ResponsiveOverride.css` carries the visually-hidden rule. */
export const DUPLICATE_LABEL_CLASS =
	'sgs-responsive-override__duplicate-label';

// A `label` or `legend`, or any element whose class names a `__label` part (core's control labels, a corner field's
// own label).
const LABEL_SELECTOR = 'label, legend, [class*="__label"]';
const CONTROL_SELECTOR = 'input, select, textarea, button';

const normalise = ( text ) =>
	String( text || '' )
		.replace( /\s+/g, ' ' )
		.trim()
		.toLowerCase();

/**
 * Marks every label inside `root` that repeats `label`.
 *
 * @param {Element|null} root  The override's field wrapper.
 * @param {string}       label The label the override shows.
 * @return {number} How many labels are marked after the call.
 */
export function markDuplicateLabels( root, label ) {
	const wanted = normalise( label );
	if ( ! root || ! wanted ) {
		return 0;
	}
	let marked = 0;
	root.querySelectorAll( LABEL_SELECTOR ).forEach( ( el ) => {
		if ( el.classList.contains( DUPLICATE_LABEL_CLASS ) ) {
			marked++;
			return;
		}
		if (
			normalise( el.textContent ) !== wanted ||
			el.querySelector( CONTROL_SELECTOR )
		) {
			return;
		}
		el.classList.add( DUPLICATE_LABEL_CLASS );
		marked++;
	} );
	return marked;
}

/**
 * Keeps a field wrapper's duplicate labels marked, including labels that mount later (a lazy field) and a class
 * attribute React rewrites.
 *
 * @param {{current: Element|null}} ref   The field wrapper's ref.
 * @param {string}                  label The label the override shows ('' draws none, so nothing is hidden).
 */
export function useHideDuplicateLabels( ref, label ) {
	useEffect( () => {
		const root = ref.current;
		if ( ! root || ! label || 'undefined' === typeof MutationObserver ) {
			return undefined;
		}
		markDuplicateLabels( root, label );
		const observer = new MutationObserver( () =>
			markDuplicateLabels( root, label )
		);
		observer.observe( root, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: [ 'class' ],
		} );
		return () => observer.disconnect();
	}, [ ref, label ] );
}
