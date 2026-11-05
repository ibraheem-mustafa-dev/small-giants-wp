/**
 * Gift order: the recipient name and note fields, shared by both placements.
 *
 * @package
 */
import { sprintf } from '@wordpress/i18n';

/**
 * A live character count that is announced politely.
 *
 * @param {Object} props
 * @param {string} props.format Block text with %1$d (used), %2$d (maximum) and %3$d (left).
 * @param {number} props.used   Characters used.
 * @param {number} props.max    Characters allowed.
 * @return {JSX.Element} Counter.
 */
function Counter( { format, used, max } ) {
	return (
		<span className="sgs-gift-order__count" aria-live="polite">
			{ sprintf( format, used, max, Math.max( 0, max - used ) ) }
		</span>
	);
}

/**
 * @param {Object}   props
 * @param {boolean}  props.product      Product-page layout: no recipient name, and the note label is hidden from sight.
 * @param {string}   props.idBase       Unique id prefix.
 * @param {Object}   props.config       Block attributes (all visible words).
 * @param {Object}   props.gift         Current value.
 * @param {number}   props.recipientMax Name limit.
 * @param {number}   props.messageMax   Note limit.
 * @param {Function} props.onChange     Called with a patch while typing.
 * @param {Function} props.onCommit     Called when a field loses focus.
 * @return {JSX.Element} Fields.
 */
export default function Fields( {
	product = false,
	idBase,
	config,
	gift,
	recipientMax,
	messageMax,
	onChange,
	onCommit,
} ) {
	return (
		<div className="sgs-gift-order__fields">
			{ product ? null : (
				<div className="sgs-gift-order__field">
					<label
						className="sgs-gift-order__label"
						htmlFor={ idBase + '-to' }
					>
						{ config.recipientLabel }
					</label>
					<input
						id={ idBase + '-to' }
						className="sgs-gift-order__input"
						type="text"
						autoComplete="off"
						maxLength={ recipientMax }
						value={ gift.to }
						onChange={ ( event ) =>
							onChange( { to: event.target.value } )
						}
						onBlur={ onCommit }
					/>
					<Counter
						format={ config.characterCountText }
						used={ gift.to.length }
						max={ recipientMax }
					/>
				</div>
			) }
			<div className="sgs-gift-order__field">
				<label
					className={
						'sgs-gift-order__label' +
						( product ? ' sgs-gift-order__label--hidden' : '' )
					}
					htmlFor={ idBase + '-message' }
				>
					{ config.messageLabel }
				</label>
				<textarea
					id={ idBase + '-message' }
					className="sgs-gift-order__textarea"
					rows="3"
					maxLength={ messageMax }
					placeholder={ config.messagePlaceholder }
					value={ gift.message }
					onChange={ ( event ) =>
						onChange( { message: event.target.value } )
					}
					onBlur={ onCommit }
				/>
				<Counter
					format={ config.characterCountText }
					used={ gift.message.length }
					max={ messageMax }
				/>
			</div>
		</div>
	);
}
