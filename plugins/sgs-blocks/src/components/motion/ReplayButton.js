/**
 * ReplayButton: plays the selected target's motion once, on request, in the editor canvas. The button hands the play to
 * `onReplay` (the canvas playback is M3's, FR-38A-28) and ignores further presses until that play has finished, so one
 * press plays exactly once. `onReplay` may return a promise; the button waits for it.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { useEffect, useRef, useState } from '@wordpress/element';
import { Button } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {Function} props.onReplay   Plays the motion once; may return a promise that settles when the play ends.
 * @param {string}   [props.label]    Button text.
 * @param {boolean}  [props.disabled] True when there is nothing to play.
 * @return {Element} The button.
 */
export default function ReplayButton( {
	onReplay,
	label = __( 'Replay', 'sgs-blocks' ),
	disabled = false,
} ) {
	const [ playing, setPlaying ] = useState( false );
	const busy = useRef( false );
	const mounted = useRef( true );

	useEffect(
		() => () => {
			mounted.current = false;
		},
		[]
	);

	const play = () => {
		if ( busy.current || disabled ) {
			return;
		}
		busy.current = true;
		setPlaying( true );
		const done = () => {
			busy.current = false;
			if ( mounted.current ) {
				setPlaying( false );
			}
		};
		let result;
		try {
			result = onReplay();
		} catch ( error ) {
			done();
			throw error;
		}
		Promise.resolve( result ).then( done, done );
	};

	return (
		<Button
			className="sgs-motion-atom sgs-motion-atom--replay"
			variant="secondary"
			onClick={ play }
			disabled={ disabled }
			aria-disabled={ disabled || playing }
			aria-busy={ playing }
			__next40pxDefaultSize
		>
			{ label }
		</Button>
	);
}
