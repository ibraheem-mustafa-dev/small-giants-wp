/**
 * The Focus state of a form field (Spec 38A §5.1; build plan M3.4): on `sgs/form` only, one state that animates the
 * field's focus look (border colour, a ring, a background lift) with the state change's one timing. The state is a
 * layer of the list `hover.focus`; the section is drawn only when the schema declares that list, so a schema without it
 * draws nothing.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import { DEFS, LAYER_LISTS } from '../layers/layer-lists';
import { FOCUS_GROUPS } from './hover-fields';
import { FOCUS_LIST } from './hover-actions';
import HoverFineTune from './HoverFineTune';

/** The one block that offers the Focus state: the form's fields are the surface it animates. */
export const FOCUS_BLOCK = 'sgs/form';
const REF_PREFIX = '#/$defs/';

/**
 * Whether the Focus section is drawn for a block.
 *
 * @param {string}  blockName The block name.
 * @param {Object=} lists     The layer lists (tests pass a changed copy).
 * @return {boolean} True for `sgs/form` when the schema declares the `hover.focus` list.
 */
export function focusAvailable( blockName, lists = LAYER_LISTS ) {
	return blockName === FOCUS_BLOCK && Boolean( lists[ FOCUS_LIST ] );
}

/**
 * The values `$def` of the Focus layer.
 *
 * @param {Object=} lists The layer lists.
 * @param {Object=} root  The `$defs`.
 * @return {string|null} The `$def` name, or null when the schema declares no Focus list.
 */
export function focusValuesDef( lists = LAYER_LISTS, root = DEFS ) {
	const layerDef = lists[ FOCUS_LIST ]?.layerDef;
	const ref = root[ layerDef ]?.properties?.values?.$ref;
	return typeof ref === 'string' ? ref.replace( REF_PREFIX, '' ) : null;
}

/**
 * @param {Object} props
 * @param {Object} props.actions The `hover-actions.js::hoverActions` result.
 * @return {Element} The section.
 */
export default function FocusState( { actions } ) {
	const layer = actions.focusLayer();
	const defName = focusValuesDef();
	return (
		<section className="sgs-motion-hover__group sgs-motion-hover__group--focus">
			<h3 className="sgs-motion-layers__heading">
				{ __( 'Focus state', 'sgs-blocks' ) }
			</h3>
			<p className="sgs-motion-atom__help">
				{ __(
					'How a form field looks while it has focus. It uses the same timing going in and coming out.',
					'sgs-blocks'
				) }
			</p>
			{ layer && defName ? (
				<>
					<HoverFineTune
						layer={ layer }
						defName={ defName }
						groups={ FOCUS_GROUPS }
						level={ 4 }
						onLayer={ actions.editFocus }
					/>
					<Button
						variant="tertiary"
						isDestructive
						onClick={ actions.removeFocus }
						__next40pxDefaultSize
					>
						{ __( 'Remove Focus state', 'sgs-blocks' ) }
					</Button>
				</>
			) : (
				<Button
					variant="secondary"
					onClick={ actions.addFocus }
					__next40pxDefaultSize
				>
					{ __( 'Add Focus state', 'sgs-blocks' ) }
				</Button>
			) }
		</section>
	);
}
