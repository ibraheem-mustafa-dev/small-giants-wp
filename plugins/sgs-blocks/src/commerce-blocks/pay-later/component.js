/**
 * Pay later message: the Cart and Checkout component. Mounts Stripe's Payment Method Messaging
 * Element with the live cart total and redraws when the total, currency or country changes.
 *
 * @package
 */
import { useSelect } from '@wordpress/data';
import { useEffect, useRef } from '@wordpress/element';
import { cartAmount, createMessaging, stripeFor } from './messaging';

/**
 * The publishable key the Stripe plugin hands to the Cart and Checkout blocks.
 *
 * @return {string} Key, empty when Stripe is absent.
 */
function publishableKey() {
	const data = window.wcSettings?.stripe_data;
	return data && typeof data.key === 'string' ? data.key : '';
}

/**
 * @param {Object} props
 * @param {string} props.config JSON string of the block's settings (server markup).
 * @return {JSX.Element|null} Message.
 */
export default function PayLaterMessage( { config } ) {
	let settings = {};
	try {
		settings = JSON.parse( config || '{}' );
	} catch ( error ) {
		settings = {};
	}
	const box = useRef( null );
	const handle = useRef( null );
	const detail = useSelect( ( select ) => {
		const store = select( 'wc/store/cart' );
		const totals = store.getCartTotals();
		const address =
			store.getCustomerData?.()?.shippingAddress ||
			store.getCustomerData?.()?.billingAddress ||
			{};
		return {
			amount: cartAmount( totals ),
			currency: totals?.currency_code,
			country:
				settings.country ||
				address.country ||
				window.wcSettings?.baseLocation?.country ||
				'GB',
		};
	}, [] );

	useEffect( () => {
		handle.current = createMessaging( {
			stripe: stripeFor( publishableKey() ),
			container: box.current,
			settings,
		} );
		return () => handle.current.destroy();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- settings are fixed for the page's life.
	}, [] );

	useEffect( () => {
		handle.current?.update( detail );
	}, [ detail.amount, detail.currency, detail.country ] ); // eslint-disable-line react-hooks/exhaustive-deps -- detail is read whole, keyed by its three fields.

	return <div ref={ box } className="sgs-pay-later__mount" hidden />;
}
