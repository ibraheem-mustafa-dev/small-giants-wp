/**
 * The rule above the review-card's name and date line: one border per device through the shared tier border control.
 */
import { __ } from '@wordpress/i18n';
import { TierBorderControl } from '../../components';

/**
 * @param {Object}   props          Props.
 * @param {Object}   props.value    The stored `reviewFooterBorder` tier object.
 * @param {Function} props.onChange Receives the whole next tier object.
 * @return {Element} The control.
 */
export default function ReviewLineBorder( { value, onChange } ) {
	return (
		<TierBorderControl
			label={ __( 'Rule above the name line', 'sgs-blocks' ) }
			value={ value }
			onChange={ onChange }
		/>
	);
}
