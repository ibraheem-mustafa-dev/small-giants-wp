/**
 * Nav drawer item entrance shape (gap G-4), shown in the Motion panel while
 * the item stagger is on: the axis each item travels on, per device, and the
 * reveal it arrives with. Render side:
 * `includes/helpers-nav-drawer-stagger-shape.php`; keyframes in style.css.
 *
 * Kept out of MotionPanel.js on purpose: that file's `SHAPE_OPTIONS` list is
 * read by `tests/php/run-u5-motion-standalone.php`, which matches every option
 * object in the file.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import { ResponsiveOverride } from '../../components';

/** Mirrors includes/helpers-nav-drawer-stagger-shape.php::sgs_nav_drawer_stagger_axes(). */
const AXIS_OPTIONS = [
	[ 'vertical', __( 'Up or down (the distance’s sign picks)', 'sgs-blocks' ) ],
	[ 'start', __( 'In from the start edge (left in English)', 'sgs-blocks' ) ],
	[ 'end', __( 'In from the end edge (right in English)', 'sgs-blocks' ) ],
].map( ( [ value, label ] ) => ( { value, label } ) );

const REVEAL_OPTIONS = [
	[ 'translate', __( 'Travel and fade in', 'sgs-blocks' ) ],
	[ 'clip', __( 'Travel while uncovered top to bottom', 'sgs-blocks' ) ],
].map( ( [ value, label ] ) => ( { value, label } ) );

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The controls.
 */
export default function ItemEntranceControls( { attributes, setAttributes } ) {
	const { itemStaggerAxis, itemStaggerReveal } = attributes;

	return (
		<>
			<ResponsiveOverride
				label={ __( 'Item direction', 'sgs-blocks' ) }
				value={ itemStaggerAxis || {} }
				onChange={ ( obj ) => setAttributes( { itemStaggerAxis: obj } ) }
			>
				{ ( { ownValue, effectiveValue, setOwnValue } ) => (
					<SelectControl
						hideLabelFromVision
						label={ __( 'Item direction', 'sgs-blocks' ) }
						help={ __( 'The start and end edges swap in right-to-left languages.', 'sgs-blocks' ) }
						value={ ownValue || effectiveValue || 'vertical' }
						options={ AXIS_OPTIONS }
						onChange={ ( value ) => setOwnValue( value || undefined ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveOverride>
			<SelectControl
				label={ __( 'Item reveal', 'sgs-blocks' ) }
				value={ itemStaggerReveal || 'translate' }
				options={ REVEAL_OPTIONS }
				onChange={ ( value ) => setAttributes( { itemStaggerReveal: value } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</>
	);
}
