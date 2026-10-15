/**
 * Mounts the stagger re-run (Spec 38A FR-38A-25) once per container block in the editor canvas, selected or not: a
 * child is usually inserted, moved or duplicated while the container is not selected, so the Entrance panel (which
 * mounts only for the selected block) cannot host it. One `editor.BlockListBlock` filter; a block without stored
 * stagger settings renders exactly as before and costs one cached lookup and one property read.
 *
 * Imported once from `../EntrancePanel.js`.
 *
 * @package
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { blockHasMotion } from '../support-cache';
import { MOTION_ATTRIBUTE_NAME } from '../register';
import { useStaggerRerun } from './use-stagger-rerun';

/**
 * Runs the re-run for one container; renders nothing.
 *
 * @param {Object} props          Block props.
 * @param {string} props.clientId The container's client id.
 * @param {string} props.name     The container's block name.
 * @return {null} Nothing.
 */
export function StaggerRerun( { clientId, name } ) {
	useStaggerRerun( { clientId, name } );
	return null;
}

export const withStaggerRerun = createHigherOrderComponent(
	( BlockListBlock ) =>
		function StaggerRerunBlock( props ) {
			if (
				! props.attributes?.[ MOTION_ATTRIBUTE_NAME ]?.stagger ||
				! blockHasMotion( props.name )
			) {
				return <BlockListBlock { ...props } />;
			}
			return (
				<>
					<BlockListBlock { ...props } />
					<StaggerRerun
						clientId={ props.clientId }
						name={ props.name }
					/>
				</>
			);
		},
	'withStaggerRerun'
);

addFilter(
	'editor.BlockListBlock',
	'sgs/motion-stagger-rerun',
	withStaggerRerun
);
