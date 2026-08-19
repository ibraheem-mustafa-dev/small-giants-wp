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
 * revealed control's label sat flush against the toggle above it (confirmed
 * live via computed-style measurement: both margins were exactly 0px).
 *
 * This wrapper owns that decision instead of leaving it to be repeated
 * per-block: pass the conditionally-revealed control(s) as `children` and
 * the toggle keeps its natural bottom margin whenever children are present,
 * matching the manual fix already applied to post-grid.
 *
 * Existing raw `<ToggleControl>` consumers are NOT migrated onto this
 * wrapper this session — see the `boolean` row's `migrationNote` in
 * `goldens/input.json`. Single-control toggles (the overwhelming majority)
 * have nothing to gain from switching; only the reveal-a-second-control
 * shape benefits, and only 3 confirmed instances exist today.
 *
 * @package SGS\Blocks
 */
import { ToggleControl } from '@wordpress/components';

/**
 * @param {Object}    props
 * @param {string}    props.label     Toggle label.
 * @param {boolean}   props.checked   Current value.
 * @param {Function}  props.onChange  Receives the next boolean.
 * @param {string}    [props.help]    Help text.
 * @param {import('react').ReactNode} [props.children] A conditionally-revealed
 *   control (or controls) shown below the toggle — pass them already gated on
 *   the checked state by the caller (see post-grid/edit.js's Show
 *   image/Show excerpt/Show read more rows for real examples). When
 *   present, the toggle keeps its natural bottom margin so the revealed
 *   control isn't flush against it.
 *   (JSX-shaped example text deliberately avoided here — check-control-
 *   parity-live.js's scanner does not exclude JSDoc content from its tag
 *   search, so a literal `<Component .../>` in a comment reads as a real
 *   mount and false-flags this file. Confirmed 2026-08-19: removing this
 *   exact string from the doc comment made the finding disappear.)
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
			{ children }
		</>
	);
}
