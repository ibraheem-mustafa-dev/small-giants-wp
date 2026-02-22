import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

export default function Edit( { attributes, setAttributes } ) {
	const { buttonColour, iconColour, size, offset, showAfter } = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-back-to-top sgs-back-to-top--visible',
		style: {
			'--sgs-btt-bg': colourVar( buttonColour ) || undefined,
			'--sgs-btt-color': colourVar( iconColour ) || undefined,
			'--sgs-btt-size': size + 'px',
			position: 'relative',
			bottom: 'auto',
			right: 'auto',
		},
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Back to Top', 'sgs-blocks' ) }>
					<DesignTokenPicker label={ __( 'Button colour', 'sgs-blocks' ) } value={ buttonColour } onChange={ ( val ) => setAttributes( { buttonColour: val } ) } />
					<DesignTokenPicker label={ __( 'Icon colour', 'sgs-blocks' ) } value={ iconColour } onChange={ ( val ) => setAttributes( { iconColour: val } ) } />
					<RangeControl label={ __( 'Size (px)', 'sgs-blocks' ) } value={ size } onChange={ ( val ) => setAttributes( { size: val } ) } min={ 32 } max={ 72 } __nextHasNoMarginBottom />
					<RangeControl label={ __( 'Offset from edge (px)', 'sgs-blocks' ) } value={ offset } onChange={ ( val ) => setAttributes( { offset: val } ) } min={ 8 } max={ 60 } __nextHasNoMarginBottom />
					<RangeControl label={ __( 'Show after scroll (px)', 'sgs-blocks' ) } value={ showAfter } onChange={ ( val ) => setAttributes( { showAfter: val } ) } min={ 100 } max={ 1000 } step={ 50 } __nextHasNoMarginBottom />
				</PanelBody>
			</InspectorControls>
			<button { ...blockProps } type="button" aria-label={ __( 'Back to top', 'sgs-blocks' ) }>
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>
				</svg>
			</button>
		</>
	);
}
