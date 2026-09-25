/**
 * "Scroll sideways" — sgs/container's per-device native scroller
 * (`scrollSideways`, `scrollItemWidth`; includes/container-scroll-row-css.php).
 *
 * At a device where it is on, the container's items sit in one row that scrolls
 * sideways and snaps into place (away's phone tiles). A layout setting, not a
 * motion effect: no GSAP and no pin, so it is safe in a menu panel or a drawer.
 * Hidden while the "Horizontal scroll section" effect is on, which owns that
 * element's scrolling.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import {
	ResponsiveOverride,
	ResponsiveTriStateControl,
	SgsLengthControl,
} from '../../../components';
import { resolveOnTiers } from '../../../utils/responsive';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 * @return {Element|null} The controls (mounted inside the container's Layout panel).
 */
export default function ScrollSidewaysPanel( { attributes, setAttributes } ) {
	const { scrollSideways, scrollItemWidth } = attributes;
	// `fx` is the effects extension's attribute (not declared in this block.json).
	if ( 'horizontal-panel' === attributes.fx ) {
		return null;
	}
	const onAnywhere = resolveOnTiers( scrollSideways, 'on', 'off' ).length > 0;

	return (
		<>
			<ResponsiveTriStateControl
				label={ __( 'Scroll sideways', 'sgs-blocks' ) }
				help={ __(
					'Items sit in one row that scrolls sideways and snaps into place, for example image tiles on a phone.',
					'sgs-blocks'
				) }
				value={ scrollSideways }
				onChange={ ( value ) => setAttributes( { scrollSideways: value } ) }
				defaultValue="off"
			/>
			{ onAnywhere && (
				<ResponsiveOverride
					label={ __( 'Item width', 'sgs-blocks' ) }
					value={ scrollItemWidth }
					onChange={ ( obj ) => setAttributes( { scrollItemWidth: obj } ) }
				>
					{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
						<SgsLengthControl
							label={ __( 'Item width', 'sgs-blocks' ) }
							hideLabelFromVision
							help={ __( 'Width of each item in the row. Empty: 80%.', 'sgs-blocks' ) }
							value={ ownValue || '' }
							placeholder={ inherited ? effectiveValue : '80%' }
							onChange={ ( value ) => setOwnValue( value || undefined ) }
						/>
					) }
				</ResponsiveOverride>
			) }
		</>
	);
}
