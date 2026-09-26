/**
 * Chooses sgs/form's editor by where the block sits (Spec 42 §9): inside a
 * saved form (`sgs_form`) it is the field builder (edit.js); everywhere else
 * it embeds a saved form (FormEmbedEdit.js).
 */
import { useSelect } from '@wordpress/data';
import Edit from './edit';
import FormEmbedEdit from './FormEmbedEdit';
import { FORM_CPT } from './SavedFormPicker';

export default function FormEditRouter( props ) {
	const postType = useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		return editor && typeof editor.getCurrentPostType === 'function'
			? editor.getCurrentPostType()
			: null;
	}, [] );

	return FORM_CPT === postType ? <Edit { ...props } /> : <FormEmbedEdit { ...props } />;
}
