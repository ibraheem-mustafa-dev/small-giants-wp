/**
 * "Pin to edge" — sgs/container's per-device sticky setting (`pinEdge`;
 * includes/container-pin-edge-css.php).
 *
 * At a device where it is Top or Bottom, the container sticks to that edge of
 * the nearest scrolling area (a drawer, a panel or the page) while the content
 * around it scrolls, and adds the phone's safe-area inset to its padding on
 * that edge. Mounted inside the container's Layout panel.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import { ResponsiveOverride } from '../../../components';

const PIN_EDGE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Not pinned', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'bottom' },
];

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {Element} The control.
 */
export default function PinEdgeControl( { attributes, setAttributes } ) {
	const { pinEdge } = attributes;
	return (
		<ResponsiveOverride
			label={ __( 'Pin to edge', 'sgs-blocks' ) }
			value={ pinEdge }
			onChange={ ( obj ) => setAttributes( { pinEdge: obj } ) }
		>
			{ ( { ownValue, inherited, setOwnValue } ) => (
				<SelectControl
					value={ ownValue || '' }
					options={ PIN_EDGE_OPTIONS }
					onChange={ ( val ) => setOwnValue( val || undefined ) }
					help={ inherited
						? __( 'Default follows the larger device. Top or Bottom keeps this container at that edge of the scrolling area (a drawer or the page) while the rest scrolls.', 'sgs-blocks' )
						: __( 'Top or Bottom keeps this container at that edge of the scrolling area (a drawer or the page) while the rest scrolls, with room for the phone’s home bar.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</ResponsiveOverride>
	);
}
