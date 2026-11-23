/**
 * The Custom CSS field in a block's Advanced panel (Spec 32 FR-32-13, FR-32-20, FR-32-30).
 *
 * A user the server lets write Custom CSS (`includes/custom-css-save.php::sgs_custom_css_user_can`) edits the field. For
 * anyone else it is read-only with a line saying why, because the server keeps each block's rule exactly as stored
 * whatever a save sends. The editor settings carry the answer (`sgsCustomCssAccess.canEdit`) and the hosts a `url()` may name
 * (`sgsCustomCssAccess.siteHosts`), added by `sgs_custom_css_editor_settings`. The block editor store drops a setting it does
 * not list, so they are read from the editor store (the post editor) or the site editor's own store.
 */
import { useSelect } from '@wordpress/data';
import { Notice, TextareaControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * The server's answers for this editor: whether the user may write Custom CSS, and the site's own hosts.
 *
 * @return {{canEdit: boolean, siteHosts: string[]}} Defaults to editable with no host named when the server sent nothing.
 */
export function useCustomCssSettings() {
	const settings = useSelect(
		( select ) =>
			select( 'core/editor' )?.getEditorSettings?.()?.sgsCustomCssAccess ??
			select( 'core/edit-site' )?.getSettings?.()?.sgsCustomCssAccess,
		[]
	);
	return {
		canEdit: settings?.canEdit !== false,
		siteHosts: settings?.siteHosts ?? [],
	};
}

/**
 * The note, the textarea and the refusals for one block.
 *
 * @param {Object}   props
 * @param {string}   props.value    The block's `sgsCustomCss`.
 * @param {string}   props.note     The block's `sgsCustomCssNote`.
 * @param {string[]} props.refused  Reasons the scoper refused parts of the CSS.
 * @param {boolean}  props.readOnly True when the user may not change Custom CSS.
 * @param {Function} props.onChange Called with the new CSS.
 * @return {JSX.Element} The field.
 */
export function CustomCssField( { value, note, refused, readOnly, onChange } ) {
	return (
		<>
			{ note && (
				<Notice status="info" isDismissible={ false }>
					{ note }
				</Notice>
			) }
			<TextareaControl
				label={ __( 'Custom CSS', 'sgs-blocks' ) }
				help={
					readOnly
						? __(
								'Read only: your account may not change Custom CSS on this site, so this block keeps the rule it was saved with.',
								'sgs-blocks'
						  )
						: __(
								'CSS rules applied to this block only. Use &selector for the block itself; any other selector styles elements inside it. A url() must be a relative address, an address on this site or an inline data:image. A @keyframes animation written here is renamed for this block, so it never clashes with another; wrap the animation rule in @media (prefers-reduced-motion: no-preference).',
								'sgs-blocks'
						  )
				}
				value={ value || '' }
				onChange={ readOnly ? undefined : onChange }
				readOnly={ readOnly }
				rows={ 6 }
				__nextHasNoMarginBottom
			/>
			{ refused.length > 0 && (
				<Notice status="warning" isDismissible={ false }>
					{ __( 'Not applied:', 'sgs-blocks' ) } { refused.join( '; ' ) }
				</Notice>
			) }
		</>
	);
}
