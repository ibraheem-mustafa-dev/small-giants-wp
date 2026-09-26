/**
 * SGS Wishlist Panel — "Site-wide saved-item features" inspector panel.
 *
 * These three switches are SITE settings, not block attributes — they
 * apply everywhere the panel appears (the cart strip, the Saved items page,
 * the account tab), so they are read/written on the site entity through
 * `useEntityProp( 'root', 'site', 'sgs_wishlist_features' )` — the same
 * mechanism the core Site Title block uses to edit a site-wide setting from
 * inside a block's own inspector (the editor saves the site entity
 * alongside the post). The setting is registered server-side
 * (`register_setting( 'general', 'sgs_wishlist_features', … )`,
 * `show_in_rest`) by the wishlist-store build stream — this panel only
 * reads/writes it.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';

const DEFAULT_FEATURES = { priceAlerts: false, stockAlerts: false, sharing: false };

/**
 * @return {JSX.Element} The panel.
 */
export default function SiteFeaturesPanel() {
	const [ features, setFeatures ] = useEntityProp(
		'root',
		'site',
		'sgs_wishlist_features'
	);
	const value = { ...DEFAULT_FEATURES, ...( features || {} ) };

	const toggle = ( key ) => ( checked ) => setFeatures( { ...value, [ key ]: checked } );

	return (
		<PanelBody title={ __( 'Site-wide saved-item features', 'sgs-blocks' ) }>
			<p>{ __( 'These switches apply to the whole site.', 'sgs-blocks' ) }</p>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Price-drop alerts', 'sgs-blocks' ) }
				checked={ !! value.priceAlerts }
				onChange={ toggle( 'priceAlerts' ) }
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Back-in-stock alerts', 'sgs-blocks' ) }
				checked={ !! value.stockAlerts }
				onChange={ toggle( 'stockAlerts' ) }
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Share by link', 'sgs-blocks' ) }
				checked={ !! value.sharing }
				onChange={ toggle( 'sharing' ) }
			/>
		</PanelBody>
	);
}
