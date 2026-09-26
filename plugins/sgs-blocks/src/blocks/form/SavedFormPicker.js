/**
 * "Saved form" picker: WordPress's own link search filtered to `sgs_form`
 * (Spec 42 §4, FR-42-4). Stores the chosen post's slug, never its id.
 */
import { __ } from '@wordpress/i18n';
import { resolveSelect } from '@wordpress/data';
import { LinkPopoverField } from '../../components';

export const FORM_CPT = 'sgs_form';

export default function SavedFormPicker( { formId, formIsLinked, onLink, onUnlink } ) {
	return (
		<LinkPopoverField
			label={ __( 'Saved form', 'sgs-blocks' ) }
			emptyLabel={ __( 'Choose a saved form', 'sgs-blocks' ) }
			help={ __( 'Search the Forms list. Edit the form there, and every page using it updates.', 'sgs-blocks' ) }
			value={ { url: formIsLinked ? formId : '' } }
			suggestionsQuery={ { type: 'post', subtype: FORM_CPT } }
			enableInternalResolution
			showTarget={ false }
			showRel={ false }
			onChange={ async ( { linkId } ) => {
				if ( ! linkId ) {
					onUnlink();
					return;
				}
				const record = await resolveSelect( 'core' ).getEntityRecord( 'postType', FORM_CPT, linkId );
				if ( record?.slug ) {
					onLink( record.slug );
				}
			} }
		/>
	);
}
