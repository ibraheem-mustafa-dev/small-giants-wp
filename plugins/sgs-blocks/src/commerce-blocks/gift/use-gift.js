/**
 * Gift order: state for the component.
 *
 * Starts from the cart store's `sgs_gift` extension data, writes through the
 * cart proxy, keeps typed text on screen while a save is in flight, and shows the
 * server's message when it refuses a value.
 *
 * @package
 */
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { CART_STORE, refreshCart, saveGift } from '../api';

const EMPTY = { on: false, to: '', message: '' };
const TYPING_DELAY = 600;

/**
 * @param {Object}  args
 * @param {boolean} args.preview      Editor preview: no store, no network.
 * @param {string}  args.errorText    Shown when a save fails without a message.
 * @param {number}  args.recipientMax Block limit for the name (0 = server cap).
 * @param {number}  args.messageMax   Block limit for the note (0 = server cap).
 * @return {Object} Gift state and actions.
 */
export default function useGift( {
	preview,
	errorText,
	recipientMax,
	messageMax,
} ) {
	const stored = useSelect(
		( select ) => {
			if ( preview ) {
				return null;
			}
			const store = select( CART_STORE );
			const data =
				store && store.getCartData ? store.getCartData() : null;
			return data && data.extensions && data.extensions.sgs_gift
				? data.extensions.sgs_gift
				: null;
		},
		[ preview ]
	);
	const [ gift, setGift ] = useState( EMPTY );
	const [ error, setError ] = useState( '' );
	const timer = useRef( null );
	const dirty = useRef( false );
	const edits = useRef( 0 );
	const latest = useRef( EMPTY );

	useEffect( () => {
		if ( stored && ! dirty.current ) {
			const next = {
				on: !! stored.on,
				to: stored.to || '',
				message: stored.message || '',
			};
			latest.current = next;
			setGift( next );
		}
	}, [ stored ] );

	useEffect( () => () => window.clearTimeout( timer.current ), [] );

	const send = useCallback(
		( value ) => {
			if ( preview ) {
				return;
			}
			const stamp = edits.current;
			saveGift( value )
				.then( () => {
					// Only a save that carries the newest edit makes the screen
					// follow the server again; a later keystroke keeps it in charge.
					if ( stamp === edits.current ) {
						dirty.current = false;
					}
					setError( '' );
					refreshCart();
				} )
				.catch( ( failure ) => {
					setError(
						failure && failure.message ? failure.message : errorText
					);
				} );
		},
		[ preview, errorText ]
	);

	const update = useCallback(
		( patch, immediate ) => {
			const next = { ...latest.current, ...patch };
			if ( ! next.on ) {
				next.to = '';
				next.message = '';
			}
			latest.current = next;
			dirty.current = true;
			edits.current += 1;
			setGift( next );
			window.clearTimeout( timer.current );
			if ( immediate ) {
				send( next );
				return;
			}
			timer.current = window.setTimeout( () => {
				timer.current = null;
				send( latest.current );
			}, TYPING_DELAY );
		},
		[ send ]
	);

	const flush = useCallback( () => {
		if ( timer.current ) {
			window.clearTimeout( timer.current );
			timer.current = null;
			send( latest.current );
		}
	}, [ send ] );

	const serverLimits = ( stored && stored.limits ) || {};
	const cap = ( own, server, fallback ) => {
		const ceiling = server > 0 ? server : fallback;
		return own > 0 && own < ceiling ? own : ceiling;
	};

	return {
		gift,
		error,
		update,
		flush,
		recipientMax: cap( recipientMax, serverLimits.to, 100 ),
		messageMax: cap( messageMax, serverLimits.message, 500 ),
	};
}
