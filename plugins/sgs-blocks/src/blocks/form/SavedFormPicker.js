/**
 * "Saved form" picker: searches the `sgs_form` post type's own REST collection
 * (core's /wp/v2/search rejects non-public post types) and shows a type badge
 * on every row (Spec 42 §4, FR-42-4, FR-42-5). Stores the chosen post's slug,
 * never its id.
 */
import { __ } from '@wordpress/i18n';
import { SavedPostPicker } from '../../components';

export const FORM_CPT = 'sgs_form';

export default function SavedFormPicker( { formId, formIsLinked, onLink, onUnlink } ) {
	return (
		<SavedPostPicker
			postType={ FORM_CPT }
			label={ __( 'Saved form', 'sgs-blocks' ) }
			emptyLabel={ __( 'Choose a saved form', 'sgs-blocks' ) }
			help={ __( 'Search the Forms list. Edit the form there, and every page using it updates.', 'sgs-blocks' ) }
			value={ formIsLinked ? formId : '' }
			onSelect={ onLink }
			onClear={ onUnlink }
		/>
	);
}
