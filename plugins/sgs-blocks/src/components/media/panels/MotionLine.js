/**
 * The motion line at the bottom of the Background panel (Spec 49 §9.6). It shows the effects set on the background's
 * motion target and a button that asks the Effects panel to open on that target through the `sgs/inspector-focus`
 * store. It creates no motion.
 *
 * @package SGS\Blocks
 */
import { Button } from '@wordpress/components';
import { useDispatch } from '@wordpress/data';

import { INSPECTOR_FOCUS_STORE, nextRequestId } from '../inspector-focus-store.js';
import { backgroundTarget, effectLayers, motionLineButton, motionLineText } from './motion-line.js';
import './MotionLine.css';

const MOTION_ATTRIBUTE = 'sgsMotion';

/**
 * @param {Object} props
 * @param {string} props.clientId   The block's client id.
 * @param {Object} props.attributes Block attributes (the motion value is `sgsMotion`).
 * @param {string} props.kind       The background's kind at the active device.
 * @return {JSX.Element} The line.
 */
export default function MotionLine( { clientId, attributes, kind } ) {
	const { open } = useDispatch( INSPECTOR_FOCUS_STORE );
	const target = backgroundTarget( kind );
	const layers = effectLayers( attributes?.[ MOTION_ATTRIBUTE ], target );
	return (
		<div className="sgs-media-motion-line">
			<span className="sgs-media-motion-line__text">{ motionLineText( layers ) }</span>
			<Button
				variant="secondary"
				size="compact"
				className="sgs-media-motion-line__button"
				onClick={ () => open( { clientId, panel: 'effects', target, requestId: nextRequestId() } ) }
			>
				{ motionLineButton( layers ) }
			</Button>
		</div>
	);
}
