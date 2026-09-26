/**
 * sgs/form placed anywhere other than a saved form (Spec 42 §9: every form is
 * a saved `sgs_form` post, no inline exception).
 *
 * Three states:
 *   - linked:            a live preview of the saved form plus "Edit this form".
 *   - unlinked, fields:  an inline form (older content or a clone) — one click
 *                        saves it to the Forms list and links it.
 *   - unlinked, empty:   pick a saved form, or name and create a new one.
 * Fields are only ever built inside the saved form itself (edit.js).
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	Button,
	Disabled,
	ExternalLink,
	Notice,
	PanelBody,
	Placeholder,
	TextControl,
} from '@wordpress/components';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { cloneBlock, createBlock, serialize } from '@wordpress/blocks';
import { useState } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { addQueryArgs } from '@wordpress/url';
import ServerSideRender from '@wordpress/server-side-render';
import { formIcon } from '../../utils';
import SavedFormPicker, { FORM_CPT } from './SavedFormPicker';

export default function FormEmbedEdit( { attributes, setAttributes, clientId } ) {
	const { formId, formIsLinked, formName } = attributes;
	const blockProps = useBlockProps( { className: 'sgs-form-embed' } );
	const registry = useRegistry();
	const { saveEntityRecord } = useDispatch( coreStore );
	const { replaceInnerBlocks } = useDispatch( blockEditorStore );
	const [ newName, setNewName ] = useState( '' );
	const [ busy, setBusy ] = useState( false );
	const [ error, setError ] = useState( '' );

	const { savedForm, resolved, canCreate, fieldCount, pageTitle } = useSelect(
		( select ) => {
			const core = select( coreStore );
			const query = { slug: formId, status: 'any', per_page: 1 };
			const lookup = formIsLinked && formId;
			const editor = select( 'core/editor' );
			return {
				savedForm: lookup
					? core.getEntityRecords( 'postType', FORM_CPT, query )?.[ 0 ] ?? null
					: null,
				resolved: lookup
					? core.hasFinishedResolution( 'getEntityRecords', [ 'postType', FORM_CPT, query ] )
					: false,
				canCreate: !! core.canUser( 'create', { kind: 'postType', name: FORM_CPT } ),
				fieldCount: select( blockEditorStore ).getBlockCount( clientId ),
				pageTitle:
					editor && typeof editor.getEditedPostAttribute === 'function'
						? editor.getEditedPostAttribute( 'title' ) || ''
						: '',
			};
		},
		[ formId, formIsLinked, clientId ]
	);

	const link = ( slug ) => {
		replaceInnerBlocks( clientId, [], false );
		setAttributes( { formId: slug, formIsLinked: true } );
	};

	const saveAsForm = async ( title, slug, formBlock ) => {
		setBusy( true );
		setError( '' );
		try {
			const record = await saveEntityRecord(
				'postType',
				FORM_CPT,
				{ title, slug, status: 'publish', content: serialize( [ formBlock ] ) },
				{ throwOnError: true }
			);
			link( record.slug );
		} catch ( saveError ) {
			setError( saveError?.message || __( 'The form could not be saved. Please try again.', 'sgs-blocks' ) );
		}
		setBusy( false );
	};

	const createNew = () =>
		saveAsForm(
			newName.trim(),
			undefined,
			createBlock( 'sgs/form', { formName: newName.trim() }, [
				createBlock( 'sgs/form-step', { label: __( 'Step 1', 'sgs-blocks' ) } ),
			] )
		);

	const saveInline = () => {
		const block = registry.select( blockEditorStore ).getBlock( clientId );
		const title =
			formName ||
			( pageTitle ? `${ pageTitle } ${ __( 'form', 'sgs-blocks' ) }` : __( 'Form', 'sgs-blocks' ) );
		saveAsForm( title, formId || undefined, cloneBlock( block, { formId: '', formIsLinked: false } ) );
	};

	const picker = (
		<SavedFormPicker formId={ formId } formIsLinked={ formIsLinked } onLink={ link } onUnlink={ () => setAttributes( { formId: '', formIsLinked: false } ) } />
	);

	const inspector = (
		<InspectorControls>
			<PanelBody title={ __( 'Form', 'sgs-blocks' ) }>{ picker }</PanelBody>
		</InspectorControls>
	);

	if ( formIsLinked ) {
		const missing = resolved && ( ! savedForm || 'publish' !== savedForm.status );
		return (
			<div { ...blockProps }>
				{ inspector }
				<div className="sgs-form-embed__bar">
					<strong>
						{ savedForm ? decodeEntities( savedForm.title?.rendered || formId ) : formId }
					</strong>
					{ savedForm && (
						<ExternalLink href={ addQueryArgs( 'post.php', { post: savedForm.id, action: 'edit' } ) }>
							{ __( 'Edit this form', 'sgs-blocks' ) }
						</ExternalLink>
					) }
				</div>
				{ missing ? (
					<Notice status="warning" isDismissible={ false }>
						{ __( 'This saved form is missing or not published, so visitors see a “form not available” message. Publish it under Forms, or choose another form in the block settings.', 'sgs-blocks' ) }
					</Notice>
				) : (
					<Disabled>
						<ServerSideRender block="sgs/form" attributes={ { formId, formIsLinked: true } } />
					</Disabled>
				) }
			</div>
		);
	}

	const hasInlineFields = fieldCount > 0;

	return (
		<div { ...blockProps }>
			{ inspector }
			<Placeholder
				icon={ formIcon.src }
				label={ __( 'Form', 'sgs-blocks' ) }
				instructions={
					hasInlineFields
						? __( 'This form’s fields are stored on this page only. Save it to the Forms list so it can be reused, tracked and edited in one place.', 'sgs-blocks' )
						: __( 'Choose a saved form, or create a new one.', 'sgs-blocks' )
				}
			>
				<div className="sgs-form-embed__actions">
					{ hasInlineFields && canCreate && (
						<Button variant="primary" isBusy={ busy } disabled={ busy } onClick={ saveInline }>
							{ __( 'Save as reusable form', 'sgs-blocks' ) }
						</Button>
					) }
					{ picker }
					{ ! hasInlineFields && canCreate && (
						<div className="sgs-form-embed__create">
							<TextControl
								label={ __( 'New form name', 'sgs-blocks' ) }
								value={ newName }
								onChange={ setNewName }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<Button
								variant="primary"
								isBusy={ busy }
								disabled={ busy || '' === newName.trim() }
								onClick={ createNew }
							>
								{ __( 'Create form', 'sgs-blocks' ) }
							</Button>
						</div>
					) }
					{ error && (
						<Notice status="error" isDismissible={ false }>
							{ error }
						</Notice>
					) }
				</div>
			</Placeholder>
		</div>
	);
}
