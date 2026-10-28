/**
 * Gift card panel for the WooCommerce Cart and Checkout blocks (Spec 27, FR-27-GC5, FR-27-GC10).
 *
 * Fills WooCommerce's `ExperimentalDiscountsMeta` slot (rendered in the order
 * summary of both blocks) and talks to the server through
 * `wc.blocksCheckout.extensionCartUpdate()`, which POSTs to the Store API
 * `cart/extensions` route with `namespace: 'sgs_gift_card'`. The server
 * (includes/gift-card/class-gift-card-store-api.php) applies or removes the card,
 * recalculates the cart and returns it, so the order summary shows the new
 * "Gift card ending ____" line and the reduced total.
 *
 * Plain script (no JSX, no build step): it only needs globals WooCommerce and
 * WordPress already provide. No jQuery.
 *
 * @package
 */
( function () {
	'use strict';

	const wp = window.wp;
	const wc = window.wc;
	if ( ! wp || ! wc || ! wc.blocksCheckout || ! wp.plugins || ! wp.element ) {
		return;
	}

	const NAMESPACE = 'sgs_gift_card';
	const el = wp.element.createElement;
	const useState = wp.element.useState;
	const __ = wp.i18n.__;
	const Fill = wc.blocksCheckout.ExperimentalDiscountsMeta;
	const extensionCartUpdate = wc.blocksCheckout.extensionCartUpdate;

	if ( ! Fill || ! extensionCartUpdate ) {
		return;
	}

	/**
	 * Turn a rejected update into the message to show.
	 *
	 * @param {Object} error Rejection from extensionCartUpdate.
	 * @return {string} Message.
	 */
	function messageFrom( error ) {
		if ( error && typeof error.message === 'string' && error.message ) {
			return error.message;
		}
		return __(
			'That gift card code is not valid or cannot be used.',
			'sgs-blocks'
		);
	}

	/**
	 * One applied card with its remove button.
	 *
	 * @param {Object} props Card data and remove handler.
	 * @return {Object} Element.
	 */
	function AppliedCard( props ) {
		const card = props.card;
		return el(
			'li',
			{ className: 'sgs-gift-card-panel__applied' },
			el(
				'span',
				{ className: 'sgs-gift-card-panel__applied-text' },
				/* translators: 1: last four characters, 2: amount paid, 3: balance left */
				__( 'Gift card ending', 'sgs-blocks' ) +
					' ' +
					card.last4 +
					': ' +
					card.applied +
					' ' +
					__( 'used,', 'sgs-blocks' ) +
					card.remaining +
					' ' +
					__( 'left', 'sgs-blocks' )
			),
			el(
				'button',
				{
					type: 'button',
					className: 'sgs-gift-card-panel__remove',
					disabled: props.busy,
					'aria-label':
						__( 'Remove gift card ending', 'sgs-blocks' ) +
						' ' +
						card.last4,
					onClick() {
						props.onRemove( card.id );
					},
				},
				__( 'Remove', 'sgs-blocks' )
			)
		);
	}

	/**
	 * The panel.
	 *
	 * @param {Object} props Fill props: { extensions, cart, context }.
	 * @return {Object|null} Element.
	 */
	function Panel( props ) {
		const data = props.extensions && props.extensions[ NAMESPACE ];
		const codeState = useState( '' );
		const errorState = useState( '' );
		const busyState = useState( false );
		const code = codeState[ 0 ];
		const setCode = codeState[ 1 ];
		const error = errorState[ 0 ];
		const setError = errorState[ 1 ];
		const busy = busyState[ 0 ];
		const setBusy = busyState[ 1 ];

		if ( ! data || data.blocked ) {
			return null;
		}

		/**
		 * Send an apply or remove to the server.
		 *
		 * @param {Object} payload Update data.
		 * @return {Promise} Settles when the cart has been refreshed.
		 */
		function send( payload ) {
			setBusy( true );
			setError( '' );
			return extensionCartUpdate( {
				namespace: NAMESPACE,
				data: payload,
			} )
				.then( function () {
					setCode( '' );
				} )
				.catch( function ( rejection ) {
					setError( messageFrom( rejection ) );
				} )
				.then( function () {
					setBusy( false );
				} );
		}

		function onSubmit( event ) {
			event.preventDefault();
			if ( code.trim() === '' || busy ) {
				return;
			}
			send( { action: 'apply', code } );
		}

		const children = [];

		if ( data.cards && data.cards.length ) {
			children.push(
				el(
					'ul',
					{ className: 'sgs-gift-card-panel__list', key: 'list' },
					data.cards.map( function ( card ) {
						return el( AppliedCard, {
							key: card.id,
							card,
							busy,
							onRemove( id ) {
								send( { action: 'remove', card_id: id } );
							},
						} );
					} )
				)
			);
		}

		if ( data.canApply ) {
			children.push(
				el(
					'form',
					{
						className: 'sgs-gift-card-panel__form',
						key: 'form',
						onSubmit,
					},
					el(
						'label',
						{
							className: 'sgs-gift-card-panel__label',
							htmlFor: 'sgs-gift-card-code',
						},
						__( 'Gift card code', 'sgs-blocks' )
					),
					el(
						'div',
						{ className: 'sgs-gift-card-panel__row' },
						el( 'input', {
							id: 'sgs-gift-card-code',
							className: 'sgs-gift-card-panel__input',
							type: 'text',
							autoComplete: 'off',
							value: code,
							'aria-describedby': error
								? 'sgs-gift-card-error'
								: undefined,
							'aria-invalid': error ? 'true' : undefined,
							onChange( event ) {
								setCode( event.target.value );
							},
						} ),
						el(
							'button',
							{
								type: 'submit',
								className:
									'sgs-gift-card-panel__apply wc-block-components-button wp-element-button',
								disabled: busy || code.trim() === '',
							},
							__( 'Apply', 'sgs-blocks' )
						)
					)
				)
			);
		}

		if ( error ) {
			children.push(
				el(
					'p',
					{
						className: 'sgs-gift-card-panel__error',
						id: 'sgs-gift-card-error',
						role: 'alert',
						key: 'error',
					},
					error
				)
			);
		}

		if ( data.terms ) {
			children.push(
				el(
					'p',
					{ className: 'sgs-gift-card-panel__terms', key: 'terms' },
					data.terms
				)
			);
		}

		return el( 'div', { className: 'sgs-gift-card-panel' }, children );
	}

	wp.plugins.registerPlugin( 'sgs-gift-card', {
		scope: 'woocommerce-checkout',
		render() {
			return el( Fill, null, el( Panel, null ) );
		},
	} );
} )();
