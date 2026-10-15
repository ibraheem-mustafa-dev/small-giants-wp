/**
 * The editor-canvas motion preview (Spec 38A §11; FR-38A-28): for a block with the motion support, write the same
 * scoped CSS the page gets (`emit-scoped-css.js`, scoped to the block's canvas id) into the canvas document as one
 * `<style>` per block, and stamp the data attributes `assets/css/motion.css` keys on onto the block's canvas elements,
 * so hovering the canvas previews the hover state and Replay (`replay.js`) can play an entrance. A block with a
 * whole-block link is the hover group (`data-sgs-hover-group`) even when it has no motion of its own.
 *
 * The stamps follow the canvas: a block that mounts later is found by a mutation observer (no timers), a re-rendered
 * part or a remounted block element is planned and stamped again, and everything is removed on unmount. Blocks inside
 * a block preview (the inserter, the style book) do nothing. Mounted for every supporting block by
 * `with-canvas-motion.js`.
 *
 * @package SGS\Blocks
 */

import { useEffect, useMemo } from '@wordpress/element';
import { getBlockType } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import { MOTION_ATTRIBUTE_NAME } from '../register';
import {
	canvasRootSelector,
	findBlockElement,
	planCanvas,
	removeStyle,
	stamp,
	unstamp,
	watchForMount,
	writeStyle,
} from './canvas-dom';
import { declaredStates } from './trigger-rules';
import { ringDelegate, shadowValues } from './emit-ring';
import { activeDelegation } from '../delegate-parts';
import { childOf } from '../hover/use-ring-refused';
import { registry } from './replay';

export { replay, canReplay, REPLAY_REDUCED_NOTICE } from './replay';

/**
 * The canvas preview for one block.
 *
 * @param {Object} props            Block props.
 * @param {string} props.clientId   Block client id.
 * @param {string} props.name       Block name.
 * @param {Object} props.attributes Block attributes.
 */
export function useCanvasMotion( { clientId, name, attributes } ) {
	const motion = attributes?.[ MOTION_ATTRIBUTE_NAME ];
	const linked = Boolean( attributes?.sgsBlockLink || attributes?.sgsBlockLinkAuto );
	const preview = useSelect(
		( select ) => Boolean( select( 'core/block-editor' )?.getSettings?.()?.__unstableIsPreviewMode ),
		[]
	);
	// Only the attributes that decide the hover ring's refusal (the shadow attributes) reach the options, so editing
	// anything else does not re-emit the block's motion.
	const shadows = JSON.stringify(
		shadowValues( getBlockType( name )?.supports?.sgs?.elements, attributes )
	);
	const delegate = JSON.stringify(
		ringDelegate( activeDelegation( getBlockType( name )?.supports?.sgs, attributes ), childOf )
	);
	const options = useMemo( () => {
		const sgs = getBlockType( name )?.supports?.sgs || {};
		return {
			blockName: name,
			elements: sgs.elements || {},
			animationItems: sgs.animationItems || '',
			states: declaredStates( sgs.motion ),
			root: canvasRootSelector( clientId ),
			attributes: JSON.parse( shadows ),
			ringDelegate: JSON.parse( delegate ),
		};
	}, [ name, clientId, shadows, delegate ] );

	useEffect( () => {
		if ( preview || ( ! motion && ! linked ) ) {
			return undefined;
		}
		let rootEl = null;
		let touched = new Map();
		let observer = null;
		let frame = 0;
		let stopWatch = () => {};

		const apply = () => {
			frame = 0;
			const found = findBlockElement( clientId );
			if ( ! found ) {
				return;
			}
			unstamp( touched, rootEl );
			if ( found !== rootEl ) {
				observer?.disconnect();
				rootEl = found;
				const win = rootEl.ownerDocument.defaultView || window;
				observer = new win.MutationObserver( schedule );
				observer.observe( rootEl, { childList: true, subtree: true } );
				if ( rootEl.parentNode ) {
					observer.observe( rootEl.parentNode, { childList: true } );
				}
			}
			const emitted = planCanvas( rootEl, motion, options );
			if ( linked ) {
				emitted.rootAttrs = { ...emitted.rootAttrs, 'data-sgs-hover-group': '' };
			}
			writeStyle( rootEl, clientId, emitted.css );
			touched = stamp( rootEl, emitted );
			registry.set( clientId, { emitted, element: () => findBlockElement( clientId ) } );
		};
		function schedule() {
			if ( ! frame ) {
				frame = window.requestAnimationFrame( apply );
			}
		}
		stopWatch = watchForMount( clientId, apply );

		return () => {
			stopWatch();
			if ( frame ) {
				window.cancelAnimationFrame( frame );
			}
			observer?.disconnect();
			unstamp( touched, rootEl );
			removeStyle( clientId );
			registry.delete( clientId );
		};
	}, [ clientId, motion, linked, preview, options ] );
}
