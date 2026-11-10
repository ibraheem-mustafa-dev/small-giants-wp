/**
 * Pay later message: a thin wrapper round Stripe's Payment Method Messaging Element, so the
 * terms shown (for example Klarna's instalments) are always the provider's own.
 *
 * @package
 */

const stripeByKey = {};

/**
 * The cart total in minor units, as the Store API reports it.
 *
 * @param {Object|undefined} totals Cart totals from the `wc/store/cart` store.
 * @return {number} Minor units, 0 when unknown.
 */
export function cartAmount( totals ) {
	const amount = parseInt( totals?.total_price, 10 );
	return Number.isFinite( amount ) ? amount : 0;
}

/**
 * Element options for one render. Stripe's messaging element takes only these four; its text,
 * size and logo colour are Stripe's own.
 *
 * @param {Object} settings Block settings: method.
 * @param {Object} detail   Live values: amount (minor units), currency, country.
 * @return {Object} Options for `elements.create( 'paymentMethodMessaging', options )`.
 */
export function buildOptions( settings, detail ) {
	return {
		amount: detail.amount,
		currency: String( detail.currency || '' ).toUpperCase(),
		countryCode: detail.country,
		paymentMethodTypes: [ settings.method || 'klarna' ],
	};
}

/**
 * The Stripe object for a publishable key, built once per key from the Stripe.js the Stripe
 * plugin already loads. Null when there is no key or no Stripe.js.
 *
 * @param {string} key Publishable key.
 * @return {Object|null} Stripe object.
 */
export function stripeFor( key ) {
	if ( ! key || typeof window.Stripe !== 'function' ) {
		return null;
	}
	if ( ! stripeByKey[ key ] ) {
		stripeByKey[ key ] = window.Stripe( key );
	}
	return stripeByKey[ key ];
}

/**
 * Mount and keep one messaging element up to date.
 *
 * @param {Object}      args
 * @param {Object|null} args.stripe    Stripe object; null keeps the container hidden.
 * @param {HTMLElement} args.container Mount point.
 * @param {Object}      args.settings  Block settings.
 * @return {{update: Function, destroy: Function}} Handle.
 */
export function createMessaging( { stripe, container, settings } ) {
	let element = null;
	let elements = null;

	const destroy = () => {
		if ( element ) {
			element.destroy();
			element = null;
		}
	};

	const update = ( detail ) => {
		if ( ! stripe || ! detail || detail.amount <= 0 ) {
			destroy();
			container.hidden = true;
			return;
		}
		const options = buildOptions( settings, detail );
		container.hidden = false;
		if ( element ) {
			element.update( options );
			return;
		}
		elements = elements || stripe.elements();
		element = elements.create( 'paymentMethodMessaging', options );
		element.mount( container );
	};

	return { update, destroy };
}
