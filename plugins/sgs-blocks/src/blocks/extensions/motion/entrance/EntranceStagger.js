/**
 * The stagger helper on a container (Spec 38A §5.2, §8; FR-38A-24): mounts the M1 `StaggerHelper` atom, stores its
 * settings in the `stagger` key at the motion root, and on Write delays stores each child's delay (`stagger-write.js`)
 * in one editor update, so Undo reverts the whole write.
 *
 * @package
 */

import { __, _n, sprintf } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import StaggerHelper from '../../../../components/motion/StaggerHelper';
import { MOTION_ATTRIBUTE_NAME } from '../register';
import {
	BASE_LIST,
	EDITOR_STORE,
	TIERS,
	columnsAt,
	hasServerItems,
} from './entrance-facts';
import { staggerUpdates, withStagger } from './stagger-write';

/**
 * @param {Object}           props
 * @param {string}           props.blockName The container's name.
 * @param {string}           props.clientId  The container's client id.
 * @param {Object|undefined} props.motion    The container's motion value.
 * @param {Object}           props.layers    The `useMotionLayers` result.
 * @param {string}           props.tier      The editor's active device tier, for the preview and the row restart.
 * @return {Element} The helper.
 */
export default function EntranceStagger( {
	blockName,
	clientId,
	motion,
	layers,
	tier,
} ) {
	const registry = useRegistry();
	const { updateBlockAttributes } = useDispatch( EDITOR_STORE );
	const childIds = useSelect(
		( select ) => select( EDITOR_STORE ).getBlockOrder?.( clientId ) || [],
		[ clientId ]
	);
	const attributes = useSelect(
		( select ) => select( EDITOR_STORE ).getBlockAttributes?.( clientId ),
		[ clientId ]
	);
	const [ status, setStatus ] = useState( null );

	const columnsByTier = Object.fromEntries(
		TIERS.map( ( name ) => [
			name,
			columnsAt( blockName, attributes, name ),
		] )
	);

	const writeDelays = ( ignored, settings ) => {
		const children = registry.select( EDITOR_STORE ).getBlocks( clientId );
		const template = layers.layersOf( 'root', BASE_LIST )[ 0 ];
		const updates = staggerUpdates( {
			children,
			columnsByTier,
			settings,
			template,
		} );
		const ids = Object.keys( updates );
		if ( ids.length ) {
			updateBlockAttributes( ids, updates, true );
		}
		setStatus(
			sprintf(
				/* translators: 1: children that took a delay, 2: children in the container. */
				_n(
					'Wrote delays to %1$d of %2$d child.',
					'Wrote delays to %1$d of %2$d children.',
					children.length,
					'sgs-blocks'
				),
				ids.length,
				children.length
			)
		);
	};

	return (
		<div className="sgs-motion-entrance__stagger">
			<h4 className="sgs-motion-fields__heading">
				{ __( 'Stagger helper', 'sgs-blocks' ) }
			</h4>
			<StaggerHelper
				value={ motion?.stagger }
				onChange={ ( next ) =>
					updateBlockAttributes( clientId, {
						[ MOTION_ATTRIBUTE_NAME ]: withStagger( motion, next ),
					} )
				}
				childCount={ childIds.length }
				columns={ columnsByTier[ tier ] }
				emptyMessage={
					hasServerItems( blockName )
						? __(
								'Delays are written on the live page as items load.',
								'sgs-blocks'
						  )
						: undefined
				}
				onWriteDelays={ writeDelays }
			/>
			{ status && (
				<p className="sgs-motion-atom__help" role="status">
					{ status }
				</p>
			) }
		</div>
	);
}
