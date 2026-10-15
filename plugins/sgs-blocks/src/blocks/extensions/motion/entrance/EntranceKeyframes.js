/**
 * The extra keyframes of an entrance (Spec 38A §5.2): up to the schema's limit, each with an offset and the same
 * properties as the from and to values. Desktop keyframes are `values.keyframes`; Tablet and Mobile store their own
 * list in `devices.<tier>.keyframes` (a tier list replaces the Desktop one for that tier). Adding a keyframe sorts the
 * list by offset, and the Customised paths follow each keyframe to its new index. Each keyframe's panel keeps a stable
 * key, so editing an offset or sorting never remounts the fields the client is typing in.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { useRef } from '@wordpress/element';
import { Button, PanelBody } from '@wordpress/components';
import defs from '../../../../components/motion/motion-defs';
import { valueAtPath } from '../layers/stamp';
import SchemaFields from './SchemaFields';
import { addKeyframe, removeKeyframe, withKeyframeList } from './layer-edit';

const MAX_KEYFRAMES = defs.$defs.EntranceKeyframeList.maxItems;
const TIER_NAMES = Object.freeze( {
	desktop: __( 'Desktop', 'sgs-blocks' ),
	tablet: __( 'Tablet', 'sgs-blocks' ),
	mobile: __( 'Mobile', 'sgs-blocks' ),
} );

let sequence = 0;
const freshId = () => {
	sequence += 1;
	return `keyframe-${ sequence }`;
};

// One stable id per keyframe, kept in step with the list the client edits; rebuilt when the list changes outside
// this component (another tier, an undo).
function useKeyframeIds( base, length ) {
	const held = useRef( { base, ids: [] } );
	if ( held.current.base !== base || held.current.ids.length !== length ) {
		held.current = {
			base,
			ids: Array.from( { length }, freshId ),
		};
	}
	return held.current;
}

/**
 * @param {Object} props
 * @param {Object} props.layer  The entrance layer.
 * @param {string} props.tier   The tier being edited.
 * @param {Object} props.editor `layer-edit.js::layerEditor` for this layer.
 * @return {Element} The keyframes.
 */
export default function EntranceKeyframes( { layer, tier, editor } ) {
	const base =
		tier === 'desktop' ? 'values.keyframes' : `devices.${ tier }.keyframes`;
	const stored = valueAtPath( layer, base );
	const list = Array.isArray( stored ) ? stored : [];
	const held = useKeyframeIds( base, list.length );

	const add = () => {
		const { list: next, moved } = addKeyframe( list );
		const ids = [];
		moved.forEach( ( to, from ) => {
			ids[ to ] = held.ids[ from ];
		} );
		held.ids = Array.from(
			{ length: next.length },
			( unused, at ) => ids[ at ] || freshId()
		);
		editor.replace( withKeyframeList( layer, base, next, moved ) );
	};
	const remove = ( at ) => {
		const { list: next, moved } = removeKeyframe( list, at );
		held.ids = held.ids.filter( ( unused, index ) => index !== at );
		editor.replace( withKeyframeList( layer, base, next, moved ) );
	};

	return (
		<div className="sgs-motion-entrance__keyframes">
			<h4 className="sgs-motion-fields__heading">
				{ tier === 'desktop'
					? __( 'Extra keyframes', 'sgs-blocks' )
					: sprintf(
							/* translators: %s: Tablet or Mobile. */
							__( 'Extra keyframes for %s', 'sgs-blocks' ),
							TIER_NAMES[ tier ]
					  ) }
			</h4>
			{ list.map( ( frame, index ) => (
				<PanelBody
					key={ held.ids[ index ] }
					title={ sprintf(
						/* translators: %s: the keyframe's position in the animation, as a percentage. */
						__( 'Keyframe at %s', 'sgs-blocks' ),
						`${ frame.offset }%`
					) }
					initialOpen={ false }
				>
					<SchemaFields
						defName="EntranceKeyframe"
						prefix={ `${ base }.${ index }` }
						layer={ layer }
						onEdit={ editor.edit }
						stamped={ false }
						label={ sprintf(
							/* translators: %s: the keyframe's position, as a percentage. */
							__( 'Values of the keyframe at %s', 'sgs-blocks' ),
							`${ frame.offset }%`
						) }
					/>
					<Button
						variant="tertiary"
						isDestructive
						onClick={ () => remove( index ) }
						__next40pxDefaultSize
					>
						{ sprintf(
							/* translators: %s: the keyframe's position, as a percentage. */
							__( 'Remove the keyframe at %s', 'sgs-blocks' ),
							`${ frame.offset }%`
						) }
					</Button>
				</PanelBody>
			) ) }
			<Button
				variant="secondary"
				onClick={ add }
				disabled={ list.length >= MAX_KEYFRAMES }
				accessibleWhenDisabled
				__next40pxDefaultSize
			>
				{ __( 'Add a keyframe', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}
