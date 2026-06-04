import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

export default function Edit( { attributes, setAttributes } ) {
	const { label } = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-form-step',
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-form-step__inner' },
		{
			orientation: 'vertical',
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Step Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Step Label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( value ) =>
							setAttributes( { label: value } )
						}
						help={ __(
							'Label shown in the progress bar.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
				{ /* Width / spacing (WS-4 container mirror) */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="sgs-form-step__header">
					<strong>{ label }</strong>
				</div>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
