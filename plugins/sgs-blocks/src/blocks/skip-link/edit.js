/**
 * SGS Skip Link — editor component.
 *
 * @since 1.0.0
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { target, label } = attributes;
	const blockProps = useBlockProps( {
		className: 'sgs-skip-link-editor',
		style: {
			padding: '8px 12px',
			background: '#f0f0f0',
			borderRadius: '4px',
			fontSize: '13px',
			color: '#757575',
		},
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Skip Link Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Link text', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Target anchor', 'sgs-blocks' ) }
						help={ __( 'CSS selector for the skip target, e.g. #main-content', 'sgs-blocks' ) }
						value={ target }
						onChange={ ( val ) => setAttributes( { target: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<span>⌨️ { label } → { target }</span>
			</div>
		</>
	);
}
