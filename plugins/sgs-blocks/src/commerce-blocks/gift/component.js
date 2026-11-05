/**
 * Gift order: one component, two placements (Spec 27, FR-30-21).
 *
 * On a product page (editor preview; the front end is drawn by view.js) it is the same switch with only the note under it.
 * In the basket (inside the cart items area) it is a "This is a gift" switch
 * with the recipient name and note under it. In the checkout it is its own step:
 * two choice tiles that form a radio group and stack when the column is narrow,
 * then the name and note, then a line that shows only for a gift. The placement
 * is read from where WooCommerce mounts the block, so the same registration
 * serves both parents.
 *
 * @package
 */
import { useId, useLayoutEffect, useRef, useState } from '@wordpress/element';
import Fields from './fields';
import useGift from './use-gift';

const CHECKOUT_ROOT =
	'.wp-block-woocommerce-checkout, .wc-block-checkout, [data-block-name="woocommerce/checkout"]';

/**
 * Read the block's settings: the editor preview hands them over directly, the
 * front end gets them as a JSON string in the server markup.
 *
 * @param {Object|undefined} settings Attributes from the editor preview.
 * @param {string|undefined} config   JSON string from the server markup.
 * @return {Object} Settings.
 */
function readSettings( settings, config ) {
	if ( settings ) {
		return settings;
	}
	try {
		return JSON.parse( config || '{}' );
	} catch ( error ) {
		return {};
	}
}

/**
 * @param {Object} props
 * @param {string} props.config         JSON string of the block's attributes (server markup).
 * @param {Object} props.settings       Block attributes when drawn by the editor preview.
 * @param {string} props.forcePlacement Placement chosen by the editor preview.
 * @return {JSX.Element} Gift order.
 */
export default function GiftOrder( { config, settings, forcePlacement } ) {
	const copy = readSettings( settings, config );
	const preview = !! settings;
	const idBase = useId();
	const root = useRef( null );
	const [ placement, setPlacement ] = useState(
		forcePlacement || 'checkout'
	);
	const state = useGift( {
		preview,
		errorText: copy.saveErrorText,
		recipientMax: copy.recipientLimit,
		messageMax: copy.messageLimit,
	} );
	const { gift, update, flush } = state;

	useLayoutEffect( () => {
		if ( ! forcePlacement && root.current ) {
			setPlacement(
				root.current.closest( CHECKOUT_ROOT ) ? 'checkout' : 'basket'
			);
		}
	}, [ forcePlacement ] );

	const fields = (
		<Fields
			product={ placement === 'product' }
			idBase={ idBase }
			config={ copy }
			gift={ gift }
			recipientMax={ state.recipientMax }
			messageMax={ state.messageMax }
			onChange={ ( patch ) => update( patch, false ) }
			onCommit={ flush }
		/>
	);
	const alert = state.error ? (
		<p className="sgs-gift-order__error" role="alert">
			{ state.error }
		</p>
	) : null;

	if ( placement === 'basket' || placement === 'product' ) {
		return (
			<div
				ref={ root }
				className={ 'sgs-gift-order sgs-gift-order--' + placement }
			>
				<label
					className="sgs-gift-order__switch"
					htmlFor={ idBase + '-switch' }
				>
					<input
						id={ idBase + '-switch' }
						className="sgs-gift-order__checkbox"
						type="checkbox"
						checked={ gift.on }
						onChange={ ( event ) =>
							update( { on: event.target.checked }, true )
						}
					/>
					<span className="sgs-gift-order__switch-label">
						<span className="sgs-gift-order__switch-text">
							{ copy.basketLabel }
						</span>
						{ copy.basketHelp ? (
							<span className="sgs-gift-order__help">
								{ copy.basketHelp }
							</span>
						) : null }
					</span>
				</label>
				{ gift.on ? fields : null }
				{ alert }
			</div>
		);
	}

	return (
		<fieldset
			ref={ root }
			className="sgs-gift-order sgs-gift-order--checkout wc-block-components-checkout-step"
		>
			<legend className="sgs-gift-order__title wc-block-components-title wc-block-components-checkout-step__title">
				{ copy.stepTitle }
			</legend>
			<div className="sgs-gift-order__tiles">
				{ [
					[ false, copy.optionMeLabel, copy.optionMeText ],
					[ true, copy.optionGiftLabel, copy.optionGiftText ],
				].map( ( [ value, label, text ] ) => (
					<label
						key={ String( value ) }
						htmlFor={ idBase + '-for-' + String( value ) }
						className={
							'sgs-gift-order__tile sgs-focus-card' +
							( gift.on === value
								? ' sgs-gift-order__tile--selected'
								: '' )
						}
					>
						<input
							id={ idBase + '-for-' + String( value ) }
							className="sgs-gift-order__radio sgs-focus-source"
							type="radio"
							name={ idBase + '-for' }
							checked={ gift.on === value }
							onChange={ () => update( { on: value }, true ) }
						/>
						<span className="sgs-gift-order__tile-label">
							{ label }
						</span>
						{ text ? (
							<span className="sgs-gift-order__tile-text">
								{ text }
							</span>
						) : null }
					</label>
				) ) }
			</div>
			{ gift.on ? fields : null }
			{ gift.on && copy.giftOnlyLine ? (
				<p className="sgs-gift-order__gift-only">
					{ copy.giftOnlyLine }
				</p>
			) : null }
			{ alert }
		</fieldset>
	);
}
