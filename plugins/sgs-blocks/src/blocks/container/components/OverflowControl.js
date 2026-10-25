/**
 * "Overflow" — sgs/container's root overflow (`overflow`; includes/class-sgs-container-wrapper.php).
 *
 * Visible is the default and prints nothing. Clip crops content that sticks out (for example
 * decorative rings placed outside a section) without making the container a scroll container,
 * so `position: sticky` inside it still works; Hidden crops too but does make it one.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';

export const OVERFLOW_OPTIONS = [
	{ label: __( 'Visible', 'sgs-blocks' ), value: 'visible' },
	{ label: __( 'Clip', 'sgs-blocks' ), value: 'clip' },
	{ label: __( 'Hidden', 'sgs-blocks' ), value: 'hidden' },
];

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {Element} The control (mounted inside the container's Layout panel).
 */
export default function OverflowControl( { attributes, setAttributes } ) {
	return (
		<SelectControl
			label={ __( 'Overflow', 'sgs-blocks' ) }
			value={ attributes.overflow || 'visible' }
			options={ OVERFLOW_OPTIONS }
			onChange={ ( value ) => setAttributes( { overflow: value } ) }
			help={ __(
				'Clip crops anything that sticks out of the container and keeps sticky items inside working. Hidden crops too, but sticky items inside stop sticking. Visible shows everything.',
				'sgs-blocks'
			) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
}
