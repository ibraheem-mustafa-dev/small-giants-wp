/**
 * SgsPanelReset: one small "Reset" button for a whole panel, shown only when the panel holds a value.
 *
 * It replaces a permanent three-dots menu whose only item is a reset: nothing shows on an untouched panel, and a
 * touched one offers the reset as a visible button. The caller says whether the panel holds a value and what a reset
 * writes.
 *
 * Props: `hasValue` (boolean), `onReset` (function), optional `panelTitle` (names the panel for screen readers) and
 * `label` (the visible text, "Reset" by default).
 *
 * Usage:
 *   <SgsPanelReset hasValue={ rows.some( isSet ) } onReset={ () => setAttributes( resetPatch ) } panelTitle="Size" />
 */
import { Button } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

export default function SgsPanelReset( {
	hasValue,
	onReset,
	panelTitle = '',
	label = __( 'Reset', 'sgs-blocks' ),
} ) {
	if ( ! hasValue ) {
		return null;
	}
	return (
		<div className="sgs-panel-reset">
			<Button
				variant="tertiary"
				size="small"
				className="sgs-panel-reset__button"
				onClick={ onReset }
				aria-label={
					panelTitle
						? sprintf(
								/* translators: 1: the reset button's text, 2: the panel's title. */
								__( '%1$s %2$s', 'sgs-blocks' ),
								label,
								panelTitle
						  )
						: undefined
				}
			>
				{ label }
			</Button>
		</div>
	);
}
