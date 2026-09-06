/**
 * SgsBooleanField — the SGS standard BOOLEAN control (golden-controls.json
 * goldens/input.json `boolean` row, Bean-approved live 2026-08-19).
 *
 * A thin wrapper around core's own `ToggleControl` — the raw primitive was
 * already the right choice for a plain yes/no setting, so this does NOT
 * change what renders. What it fixes: a toggle that reveals a second control
 * when checked (e.g. "Show image" revealing an "Image size" dropdown) needs
 * a spacing contract between the two, and today that's left to each block to
 * get right by hand. `post-grid/edit.js` got it wrong in 3 places
 * (Show image+Image size, Show excerpt+Excerpt length, Show read more+Read
 * more text) — the toggle's `__nextHasNoMarginBottom` removed its bottom
 * margin, the parent ToolsPanelItem supplies no gap of its own, so the
 * revealed control's label sat flush against the toggle above it.
 *
 * ⛔ CORRECTED 2026-08-19 — the first version of this fix was WRONG, caught
 * live after deploy (Bean: "Booleans still don't have padding or margins
 * under them"). That version toggled `__nextHasNoMarginBottom` to `false`
 * when a reveal exists, assuming that restores ToggleControl's default
 * bottom margin — a plausible-sounding assumption that was never actually
 * verified against this installed WP version's real behaviour. Proven wrong
 * live: React DevTools fiber inspection on the deployed page confirmed the
 * component's own logic ran exactly as designed (checked=true, children
 * truthy, __nextHasNoMarginBottom correctly computed to `false`) — yet the
 * ToggleControl's own computed margin-bottom was still 0px. Whatever that
 * flag actually does in this WP version, it is NOT restoring a default
 * margin for ToggleControl specifically (sibling controls of OTHER types on
 * the same page — RangeControl, SelectControl — do show a real 16px default
 * margin with the equivalent flag, so this is a ToggleControl-specific gap,
 * not a page-wide one). Rather than chase what the flag is "supposed" to do,
 * this version adds an OWN, explicit, directly-verifiable CSS margin on the
 * revealed children — it does not depend on any WordPress internal default.
 *
 * @package SGS\Blocks
 */
import { ToggleControl } from '@wordpress/components';
import './SgsBooleanField.css';

/**
 * @param {Object}    props
 * @param {string}    props.label     Toggle label.
 * @param {boolean}   props.checked   Current value.
 * @param {Function}  props.onChange  Receives the next boolean.
 * @param {string}    [props.help]    Help text.
 * @param {import('react').ReactNode} [props.children] A conditionally-revealed
 *   control (or controls) shown below the toggle — pass them already gated on
 *   the checked state by the caller (see post-grid/edit.js's Show
 *   image/Show excerpt/Show read more rows for real examples).
 *   (JSX-shaped example text deliberately avoided here — check-control-
 *   parity-live.js's scanner does not exclude JSDoc content from its tag
 *   search, so a literal `<Component .../>` in a comment reads as a real
 *   mount and false-flags this file.)
 */
export default function SgsBooleanField( { label, checked, onChange, help, children } ) {
	const hasReveal = !! children;
	return (
		<>
			<ToggleControl
				label={ label }
				checked={ checked }
				onChange={ onChange }
				help={ help }
				__nextHasNoMarginBottom={ ! hasReveal }
			/>
			{ hasReveal && <div className="sgs-boolean-field__reveal">{ children }</div> }
		</>
	);
}
