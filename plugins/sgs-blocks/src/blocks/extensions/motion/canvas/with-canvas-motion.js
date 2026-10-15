/**
 * Mounts the editor-canvas motion preview (Spec 38A §11, FR-38A-28) on every block whose type declares the motion
 * support, selected or not, so hovering any block in the canvas previews its hover state and Replay can reach any
 * block. One `editor.BlockListBlock` filter (it renders for every block in the canvas): a block without the support
 * costs one cached lookup (`../support-cache.js`) and renders exactly as before; a supporting block gets a sibling
 * that renders nothing and runs `useCanvasMotion`.
 *
 * Imported once from `../index.js`.
 *
 * @package SGS\Blocks
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { blockHasMotion } from '../support-cache';
import { useCanvasMotion } from './use-canvas-motion';

/**
 * Runs the canvas preview for one block; renders nothing.
 *
 * @param {Object} props            Block props.
 * @param {string} props.clientId   Block client id.
 * @param {string} props.name       Block name.
 * @param {Object} props.attributes Block attributes.
 * @return {null} Nothing.
 */
export function CanvasMotion( { clientId, name, attributes } ) {
	useCanvasMotion( { clientId, name, attributes } );
	return null;
}

export const withCanvasMotion = createHigherOrderComponent(
	( BlockListBlock ) =>
		function MotionCanvasBlock( props ) {
			if ( ! blockHasMotion( props.name ) ) {
				return <BlockListBlock { ...props } />;
			}
			return (
				<>
					<BlockListBlock { ...props } />
					<CanvasMotion clientId={ props.clientId } name={ props.name } attributes={ props.attributes } />
				</>
			);
		},
	'withCanvasMotion'
);

addFilter( 'editor.BlockListBlock', 'sgs/motion-canvas', withCanvasMotion );
