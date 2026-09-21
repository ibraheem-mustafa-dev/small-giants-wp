/**
 * SGS Navigation — the non-modal drawer's selective background freeze (pure).
 *
 * The traversal lives here, apart from `store.js`, because it is pure: it reads
 * nothing but the two node members it is handed (`children`, `contains`) and the
 * caller's two predicates, so it is unit-testable with a plain object tree and no
 * DOM. `store.js` itself imports `@wordpress/interactivity` and cannot be loaded
 * under plain node.
 *
 * FR-36-6 `non-modal`: background inertness is AUTHOR-MANAGED, with focus
 * containment "kept exactly as `modal` has them". The only content that may stay
 * live is what the mode's own z-index scale paints ABOVE the panel — the site
 * header (the drawer sits one below the header's `--sgs-header-z`, `blocks/nav-drawer/style.css`) and
 * the toggle that opens and closes the drawer. Everything else is frozen at
 * whatever depth it sits, so a toggle placed in page content freezes its own
 * surroundings instead of exempting its entire ancestor branch (a `<main>` left
 * wholly focusable behind an open drawer is a WCAG 2.4.3 defect, not a feature of
 * the mode).
 *
 * @package SGS\Blocks
 */

/**
 * The elements to mark `inert` for one non-modal open.
 *
 * Walks down from `root`, freezing every child EXCEPT: one the caller skips
 * (the dialog, the scrim, the admin bar), one the caller declares live (the
 * header region painted above the panel), the toggle itself, and the toggle's
 * ancestors — which are descended INTO rather than frozen, so their other
 * branches are still caught. The toggle is never descended into: `inert` on a
 * descendant removes it from the accessibility tree and would cost the button
 * its accessible name.
 *
 * @param {Object}        root              Subtree root (the document body).
 * @param {Object|null}   toggle            The nav toggle; its chain stays live.
 * @param {Object}        [options]         Predicates.
 * @param {Function}      [options.isSkipped] True for a node to leave untouched
 *                                            and undescended.
 * @param {Function}      [options.isLive]    True for a node whose whole subtree
 *                                            stays live.
 * @return {Array<Object>} Elements to freeze, in document order.
 */
export function collectFreezeTargets( root, toggle, options = {} ) {
	const isSkipped = options.isSkipped || ( () => false );
	const isLive = options.isLive || ( () => false );
	const targets = [];

	const walk = ( parent ) => {
		const children =
			parent && parent.children ? Array.from( parent.children ) : [];
		children.forEach( ( el ) => {
			if ( isSkipped( el ) || isLive( el ) || el === toggle ) {
				return;
			}
			if ( toggle && el.contains( toggle ) ) {
				walk( el );
				return;
			}
			targets.push( el );
		} );
	};

	walk( root );
	return targets;
}
