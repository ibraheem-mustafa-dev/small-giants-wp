import { __ } from '@wordpress/i18n';
import { useBlockProps } from '@wordpress/block-editor';
import { Notice } from '@wordpress/components';

export default function Edit() {
	return (
		<div { ...useBlockProps() }>
			<Notice status="warning" isDismissible={ false }>
				{ __( 'This block is deprecated. Configure Reading Progress in Appearance → Customise → SGS Floating UI.', 'sgs-blocks' ) }
			</Notice>
			<div className="sgs-reading-progress-placeholder" style={ { padding: '20px', border: '1px dashed #ccc', textAlign: 'center' } }>
				{ __( 'Reading Progress (Deprecated)', 'sgs-blocks' ) }
			</div>
		</div>
	);
}
