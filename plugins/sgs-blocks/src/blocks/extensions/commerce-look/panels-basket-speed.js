/**
 * Cart-only inspector panel: the basket Stripe hold switch (a site option, `sgs_basket_stripe_hold`, read by
 * `includes/woocommerce/basket-stripe-hold.php`). Site options need the right to change site settings, so the panel
 * shows only to a user who has it; for anyone else saving the switch would fail.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useEntityProp, store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';

/**
 * @return {JSX.Element|null} The panel, or nothing for a user who cannot change site settings.
 */
export function BasketSpeedPanel() {
	const canManage = useSelect(
		( select ) =>
			!! select( coreStore ).canUser( 'update', {
				kind: 'root',
				name: 'site',
			} ),
		[]
	);
	const [ hold, setHold ] = useEntityProp(
		'root',
		'site',
		'sgs_basket_stripe_hold'
	);
	if ( ! canManage ) {
		return null;
	}
	return (
		<PanelBody
			title={ __( 'Loading speed', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<ToggleControl
				label={ __(
					'Load Stripe when the shopper first scrolls or taps',
					'sgs-blocks'
				) }
				help={ __(
					'The basket shows at once and the express wallet buttons (Apple Pay, Google Pay) appear after the first scroll, tap or key press. Saves Stripe and its fraud check loading on every basket visit. Applies to the whole site.',
					'sgs-blocks'
				) }
				checked={ !! hold }
				onChange={ ( value ) => setHold( !! value ) }
				__nextHasNoMarginBottom
			/>
		</PanelBody>
	);
}
