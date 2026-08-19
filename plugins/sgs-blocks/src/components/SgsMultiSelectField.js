/**
 * SgsMultiSelectField — the SGS standard MULTI-SELECT / TOKEN control
 * (golden-controls.json goldens/input.json `multi-select` row, Bean-approved
 * live 2026-08-19).
 *
 * A thin wrapper around core's `FormTokenField` — confirmed live this
 * session as the only implementation in the tree (post-grid's
 * category/tag pickers) and genuinely correct for its job. What this
 * wrapper fixes: confirmed live 2026-08-19 by direct interaction, typing a
 * near-miss value and pressing Enter without arrowing down to a suggestion
 * first silently clears the input — no chip, no error, no feedback. A
 * non-technical client has no way to tell "I haven't finished typing" apart
 * from "that was rejected".
 *
 * Two REAL FormTokenField props fix this (verified against the component's
 * own README before use, not guessed): `__experimentalAutoSelectFirstMatch`
 * makes Enter commit the top matching suggestion even when it wasn't
 * explicitly arrow-selected — so typing the start of a real name and
 * pressing Enter now works, matching how a client actually expects a
 * type-ahead field to behave. `messages.__experimentalInvalid` gives
 * assistive tech a real "that wasn't valid" announcement instead of silence
 * for the case that's still genuinely invalid (no match at all).
 *
 * Existing raw consumers (post-grid's 2 mounts) are NOT migrated onto this
 * wrapper this session — see the `multi-select` row's `migrationNote` in
 * `goldens/input.json`.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { FormTokenField } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {string}   props.label        Field label.
 * @param {string[]} props.value        Current tokens (display names).
 * @param {Function} props.onChange     Receives the next token array.
 * @param {string[]} props.suggestions  The full list of valid names — only an
 *   exact match (typed in full, or picked from the dropdown) becomes a
 *   token.
 * @param {string}   [props.help]       Overrides the default hint. Pass an
 *   empty string to suppress it entirely.
 */
export default function SgsMultiSelectField( { label, value, onChange, suggestions, help } ) {
	return (
		<FormTokenField
			label={ label }
			value={ value }
			onChange={ onChange }
			suggestions={ suggestions }
			__experimentalExpandOnFocus
			__experimentalAutoSelectFirstMatch
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			messages={ {
				added: __( 'Item added.', 'sgs-blocks' ),
				removed: __( 'Item removed.', 'sgs-blocks' ),
				__experimentalInvalid: __( 'That name doesn’t match anything — check the spelling and try again.', 'sgs-blocks' ),
			} }
			help={ help }
		/>
	);
}
