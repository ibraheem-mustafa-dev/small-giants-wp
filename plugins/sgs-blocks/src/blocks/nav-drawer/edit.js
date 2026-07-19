import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

/**
 * Nav Drawer Editor.
 *
 * Phase-1 scaffold — renders a minimal placeholder with InnerBlocks slot
 * for drawer menu content. Inspector controls are deferred to Phase 2.
 */
export default function Edit() {
	const blockProps = useBlockProps( {
		className: 'sgs-nav-drawer',
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-nav-drawer__content' },
		{
			template: [],
			templateLock: false,
			placeholder: __( 'Add navigation items…', 'sgs-blocks' ),
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Nav Drawer (Phase 1)', 'sgs-blocks' ) }>
					<p style={ { fontSize: '12px', color: '#666' } }>
						{ __( 'Full configuration pending Phase 2 build.', 'sgs-blocks' ) }
					</p>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
