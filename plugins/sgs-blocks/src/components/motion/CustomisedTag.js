/**
 * CustomisedTag: marks a field whose value differs from the preset that stamped it, with a Reset that restores the
 * preset's value. It renders nothing while the field still matches its preset.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {boolean}  [props.changed=true] Whether the field differs from its preset.
 * @param {string}   [props.label]        The field's label, spoken with the Reset button.
 * @param {Function} props.onReset        Restores the preset's stamped value.
 * @return {Element|null} The tag, or null when the field is unchanged.
 */
export default function CustomisedTag( {
	changed = true,
	label = '',
	onReset,
} ) {
	if ( ! changed ) {
		return null;
	}
	return (
		<div
			className="sgs-motion-customised"
			style={ {
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
				marginTop: '4px',
			} }
		>
			<span className="sgs-motion-customised__text">
				{ __( 'Customised', 'sgs-blocks' ) }
			</span>
			<Button
				variant="tertiary"
				size="small"
				onClick={ onReset }
				style={ { minHeight: '44px', minWidth: '44px' } }
				aria-label={
					label
						? sprintf(
								/* translators: %s: the field's label. */
								__(
									'Reset %s to the preset value',
									'sgs-blocks'
								),
								label
						  )
						: __( 'Reset to the preset value', 'sgs-blocks' )
				}
			>
				{ __( 'Reset', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}
