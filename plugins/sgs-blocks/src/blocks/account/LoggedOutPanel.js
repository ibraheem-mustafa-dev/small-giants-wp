/**
 * sgs/account — "Logged out" inspector panel.
 *
 * Auth-card layout (side-by-side vs stacked), the optional Track-an-order
 * card, and the guest checkout line.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @return {JSX.Element} Panel.
 */
export default function LoggedOutPanel( { attributes, setAttributes } ) {
	const {
		authLayout,
		showOrderTracking,
		orderTrackingHeading,
		showGuestLine,
		guestLineText,
	} = attributes;

	return (
		<PanelBody title={ __( 'Logged out', 'sgs-blocks' ) } initialOpen={ false }>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={ __( 'Log in / register layout', 'sgs-blocks' ) }
				value={ authLayout || 'side-by-side' }
				onChange={ ( value ) => setAttributes( { authLayout: value } ) }
			>
				<ToggleGroupControlOption value="side-by-side" label={ __( 'Side by side', 'sgs-blocks' ) } />
				<ToggleGroupControlOption value="stacked" label={ __( 'Stacked', 'sgs-blocks' ) } />
			</ToggleGroupControl>

			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Show "Track an order" card', 'sgs-blocks' ) }
				checked={ !! showOrderTracking }
				onChange={ ( value ) => setAttributes( { showOrderTracking: value } ) }
			/>
			{ !! showOrderTracking && (
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ __( 'Track an order heading', 'sgs-blocks' ) }
					value={ orderTrackingHeading }
					onChange={ ( value ) => setAttributes( { orderTrackingHeading: value } ) }
				/>
			) }

			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Show the guest-checkout line', 'sgs-blocks' ) }
				checked={ false !== showGuestLine }
				onChange={ ( value ) => setAttributes( { showGuestLine: value } ) }
			/>
			{ false !== showGuestLine && (
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ __( 'Guest-checkout line text', 'sgs-blocks' ) }
					value={ guestLineText }
					onChange={ ( value ) => setAttributes( { guestLineText: value } ) }
				/>
			) }
		</PanelBody>
	);
}
