import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { Notice } from '@wordpress/components';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @return {WPElement} Element to render.
 */
export default function Edit() {
	return (
		<div { ...useBlockProps() }>
			<Notice status="warning" isDismissible={ false }>
				{ __( 'This block is deprecated. Configure Back to Top in Appearance → Customise → SGS Floating UI.', 'sgs-blocks' ) }
			</Notice>
			<div className="sgs-back-to-top-placeholder" style={ { padding: '20px', border: '1px dashed #ccc', textAlign: 'center' } }>
				{ __( 'Back to Top (Deprecated)', 'sgs-blocks' ) }
			</div>
		</div>
	);
}
