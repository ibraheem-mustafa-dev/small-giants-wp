/**
 * Atom: INTRINSIC (control half).
 *
 * Trivial by design — `registry.js` declares `clientEditable: false` for this
 * atom, so there is no row to render. Moved to its own file anyway so every
 * atom's file shape is uniform (`scripts/check-media-atom-purity.js` expects
 * a `.control.js` sibling regardless of how much it contains).
 *
 * @package SGS\Blocks
 */

/**
 * No control. Registry declares `clientEditable: false` for this atom.
 *
 * @return {Array} Always empty — nothing to render.
 */
export function control() {
	return [];
}
