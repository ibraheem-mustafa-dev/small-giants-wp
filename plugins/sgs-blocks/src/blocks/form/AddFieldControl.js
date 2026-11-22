/**
 * "Add field" on the form's and a step's toolbar.
 *
 * WordPress's inserter adds a block after the selected one, so with the form itself selected its fields (block.json
 * `parent`: the form or a step) are not offered at all. This button opens the inserter inside the given container
 * (the step a field goes into), so the whole form family is one click away whichever part of the form is selected.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { BlockControls, Inserter } from '@wordpress/block-editor';
import { ToolbarGroup, ToolbarButton } from '@wordpress/components';
import { plus } from '@wordpress/icons';
import metadata from './block.json';

/** The field blocks a form takes, from the form's own allowed list: listed first wherever a form's inserter opens. */
export const FORM_FIELDS = metadata.allowedBlocks.filter( ( name ) => name.startsWith( 'sgs/form-field-' ) );

/**
 * @param {Object} props
 * @param {string} props.rootClientId The container a new field goes into (a step, or the form when it has none).
 * @return {Element|null} The toolbar button.
 */
export default function AddFieldControl( { rootClientId } ) {
	if ( ! rootClientId ) {
		return null;
	}
	return (
		<BlockControls group="other">
			<ToolbarGroup>
				<Inserter
					rootClientId={ rootClientId }
					isAppender
					__experimentalIsQuick
					renderToggle={ ( { onToggle, disabled, isOpen } ) => (
						<ToolbarButton
							icon={ plus }
							onClick={ onToggle }
							aria-expanded={ isOpen }
							aria-haspopup="true"
							disabled={ disabled }
						>
							{ __( 'Add field', 'sgs-blocks' ) }
						</ToolbarButton>
					) }
				/>
			</ToolbarGroup>
		</BlockControls>
	);
}
