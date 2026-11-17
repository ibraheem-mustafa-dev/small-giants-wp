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
 * The panel carries WooCommerce's own coupon-panel classes
 * (`wc-block-components-panel`, `wc-block-components-totals-coupon`,
 * `…__form`, `…__input`, `…__button`) beside its `sgs-gift-card-panel*` ones, so
 * any styling a site gives the coupon panel reaches it. It starts collapsed behind
 * a real button and stays open while a card is applied or an error shows.
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
	const CONTENT_ID = 'sgs-gift-card-panel-content';
	const INPUT_ID = 'sgs-gift-card-code';
	const ERROR_ID = 'sgs-gift-card-error';
	const ICON_COLLAPSED = 'M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z';
	const ICON_EXPANDED = 'M6.5 12.4L12 8l5.5 4.4-.9 1.2L12 10l-4.5 3.6-1-1.2z';
	const ICON_REMOVE =
		'M12 13.06l3.712 3.713 1.061-1.06L13.061 12l3.712-3.712-1.06-1.06L12 10.938 8.288 7.227l-1.061 1.06L10.939 12l-3.712 3.712 1.06 1.061L12 13.061z';
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
	 * An icon in WooCommerce's panel and chip icon markup.
	 *
	 * @param {string} className Icon class.
	 * @param {string} path      SVG path data.
	 * @param {number} size      Width and height.
	 * @return {Object} Element.
	 */
	function icon( className, path, size ) {
		return el(
			'svg',
			{
				className,
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				width: size,
				height: size,
				'aria-hidden': 'true',
				focusable: 'false',
			},
			el( 'path', { d: path } )
		);
	}

	/**
	 * One applied card as a chip with its remove button, the way WooCommerce shows an applied coupon.
	 *
	 * @param {Object} props Card data and remove handler.
	 * @return {Object} Element.
	 */
	function AppliedCard( props ) {
		const card = props.card;
		return el(
			'li',
			{
				className:
					'sgs-gift-card-panel__applied wc-block-components-totals-discount__coupon-list-item',
			},
			el(
				'span',
				{
					className:
						'sgs-gift-card-panel__chip wc-block-components-chip wc-block-components-chip--radius-large',
				},
				el(
					'span',
					{
						className:
							'sgs-gift-card-panel__applied-text wc-block-components-chip__text',
					},
					/* translators: 1: last four characters, 2: amount paid, 3: balance left */
					__( 'Gift card ending', 'sgs-blocks' ) +
						' ' +
						card.last4 +
						': ' +
						card.applied +
						' ' +
						__( 'used,', 'sgs-blocks' ) +
						' ' +
						card.remaining +
						' ' +
						__( 'left', 'sgs-blocks' )
				),
				el(
					'button',
					{
						type: 'button',
						className:
							'sgs-gift-card-panel__remove wc-block-components-chip__remove',
						disabled: props.busy,
						'aria-label':
							__( 'Remove gift card ending', 'sgs-blocks' ) +
							' ' +
							card.last4,
						onClick() {
							props.onRemove( card.id );
						},
					},
					icon(
						'wc-block-components-chip__remove-icon',
						ICON_REMOVE,
						16
					)
				)
			)
		);
	}

	/**
	 * The apply form, in the structure of WooCommerce's coupon form (floating label, validation error, button).
	 *
	 * @param {Object} props code, error, busy, focused and their handlers.
	 * @return {Object} Element.
	 */
	function ApplyForm( props ) {
		const error = props.error;
		const active = props.focused || props.code !== '';
		return el(
			'form',
			{
				className:
					'sgs-gift-card-panel__form wc-block-components-totals-coupon__form',
				onSubmit: props.onSubmit,
			},
			el(
				'div',
				{
					className:
						'sgs-gift-card-panel__field wc-block-components-text-input wc-block-components-totals-coupon__input' +
						( active ? ' is-active' : '' ) +
						( error ? ' has-error' : '' ),
				},
				el( 'input', {
					id: INPUT_ID,
					className: 'sgs-gift-card-panel__input',
					type: 'text',
					autoCapitalize: 'off',
					autoComplete: 'off',
					value: props.code,
					'aria-invalid': error ? 'true' : 'false',
					'aria-describedby': error ? ERROR_ID : undefined,
					onChange( event ) {
						props.setCode( event.target.value );
					},
					onFocus() {
						props.setFocused( true );
					},
					onBlur() {
						props.setFocused( false );
					},
				} ),
				el(
					'label',
					{
						className: 'sgs-gift-card-panel__label',
						htmlFor: INPUT_ID,
					},
					__( 'Gift card code', 'sgs-blocks' )
				),
				error
					? el(
							'div',
							{
								className:
									'sgs-gift-card-panel__error wc-block-components-validation-error',
								id: ERROR_ID,
								role: 'alert',
							},
							el( 'p', null, error )
					  )
					: null
			),
			el(
				'button',
				{
					type: 'submit',
					className:
						'sgs-gift-card-panel__apply wc-block-components-button wp-element-button wc-block-components-totals-coupon__button contained',
					disabled: props.busy || props.code.trim() === '',
				},
				el(
					'span',
					{ className: 'wc-block-components-button__text' },
					__( 'Apply', 'sgs-blocks' )
				)
			)
		);
	}

	/**
	 * The panel: WooCommerce's collapsible coupon panel markup and classes.
	 *
	 * @param {Object} props Fill props: { extensions, cart, context }.
	 * @return {Object|null} Element.
	 */
	function Panel( props ) {
		const data = props.extensions && props.extensions[ NAMESPACE ];
		const codeState = useState( '' );
		const errorState = useState( '' );
		const busyState = useState( false );
		const openState = useState( false );
		const focusState = useState( false );
		const code = codeState[ 0 ];
		const setCode = codeState[ 1 ];
		const error = errorState[ 0 ];
		const setError = errorState[ 1 ];
		const busy = busyState[ 0 ];
		const setBusy = busyState[ 1 ];
		const toggled = openState[ 0 ];
		const setToggled = openState[ 1 ];
		const focused = focusState[ 0 ];
		const setFocused = focusState[ 1 ];

		if ( ! data || data.blocked ) {
			return null;
		}

		const hasCards = !! ( data.cards && data.cards.length );
		// Stays open while a card is applied or an error is showing.
		const open = toggled || hasCards || error !== '';

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

		const content = [];

		if ( hasCards ) {
			content.push(
				el(
					'ul',
					{
						className:
							'sgs-gift-card-panel__list wc-block-components-totals-discount__coupon-list',
						key: 'list',
					},
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
			content.push(
				el( ApplyForm, {
					key: 'form',
					code,
					error,
					busy,
					focused,
					setCode,
					setFocused,
					onSubmit,
				} )
			);
		}

		if ( data.terms ) {
			content.push(
				el(
					'p',
					{ className: 'sgs-gift-card-panel__terms', key: 'terms' },
					data.terms
				)
			);
		}

		return el(
			'div',
			{
				className:
					'sgs-gift-card-panel wc-block-components-totals-coupon wc-block-components-panel',
			},
			// The toggle is the panel's direct child, as the coupon panel's is: WooCommerce's and a site's rules for
			// `.wc-block-components-panel__button` then reach both the same way (inside a heading, WooCommerce's
			// heading-specific rule changed its weight and the heading's line height leaked in).
			el(
				'button',
				{
					type: 'button',
					className:
						'sgs-gift-card-panel__toggle wc-block-components-panel__button',
					'aria-expanded': open ? 'true' : 'false',
					'aria-controls': CONTENT_ID,
					onClick() {
						setToggled( ! toggled );
					},
				},
				icon(
					'wc-block-components-panel__button-icon',
					open ? ICON_EXPANDED : ICON_COLLAPSED,
					24
				),
				__( 'Add a gift card', 'sgs-blocks' )
			),
			el(
				'div',
				{
					id: CONTENT_ID,
					className:
						'sgs-gift-card-panel__content wc-block-components-panel__content' +
						( open ? '' : ' sgs-gift-card-panel__content--closed' ),
					hidden: ! open,
				},
				el(
					'div',
					{
						className:
							'sgs-gift-card-panel__inner wc-block-components-totals-coupon__content',
					},
					content
				)
			)
		);
	}

	wp.plugins.registerPlugin( 'sgs-gift-card', {
		scope: 'woocommerce-checkout',
		render() {
			return el( Fill, null, el( Panel, null ) );
		},
	} );
} )();
