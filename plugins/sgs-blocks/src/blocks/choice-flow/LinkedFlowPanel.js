/**
 * "Linked flow" inspector panel for sgs/choice-flow (Spec 43 FR-43-6).
 *
 * Links this block to a reusable flow saved on the Choice Flows admin screen
 * (the sgs_choice_flow post type). The picker writes the post's SLUG into
 * `flowId` and sets `flowIsLinked`, the same by-slug reference sgs/form uses
 * for sgs_form posts (form/edit.js "Linked Form"), so render.php can tell
 * "never linked" from "linked, but the flow post is gone".
 */
import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { SavedPostPicker } from '../../components';

export const FLOW_CPT = 'sgs_choice_flow';

export default function LinkedFlowPanel( { flowId, flowIsLinked, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Linked flow', 'sgs-blocks' ) }>
			<SavedPostPicker
				postType={ FLOW_CPT }
				label={ __( 'Linked flow', 'sgs-blocks' ) }
				emptyLabel={ __( 'Choose a saved flow', 'sgs-blocks' ) }
				help={ __(
					'Optional. Show a flow saved under Choice Flows instead of building the steps here. Edit the steps on that flow, and every page that links it updates.',
					'sgs-blocks'
				) }
				value={ flowIsLinked ? flowId : '' }
				onSelect={ ( slug ) => setAttributes( { flowId: slug, flowIsLinked: true } ) }
				onClear={ () => setAttributes( { flowId: '', flowIsLinked: false } ) }
			/>
		</PanelBody>
	);
}
