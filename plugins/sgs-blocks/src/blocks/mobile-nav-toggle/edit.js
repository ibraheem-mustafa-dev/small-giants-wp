import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl, TextControl } from '@wordpress/components';
import { IconPicker, IconPreview } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	const { iconSize, ariaLabel, popoverTarget, toggleOpenIcon, toggleCloseIcon } = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-mobile-nav-toggle',
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Toggle Button', 'sgs-blocks' ) }>
					<IconPicker
						label={ __( 'Open icon (hamburger state)', 'sgs-blocks' ) }
						value={ { source: 'lucide', name: toggleOpenIcon } }
						onChange={ ( val ) => setAttributes( { toggleOpenIcon: val ? val.name : 'menu' } ) }
					/>
					<IconPicker
						label={ __( 'Close icon (open state)', 'sgs-blocks' ) }
						value={ { source: 'lucide', name: toggleCloseIcon } }
						onChange={ ( val ) => setAttributes( { toggleCloseIcon: val ? val.name : 'x' } ) }
					/>
					<RangeControl
						label={ __( 'Icon size (px)', 'sgs-blocks' ) }
						value={ iconSize }
						onChange={ ( value ) => setAttributes( { iconSize: value } ) }
						min={ 16 }
						max={ 48 }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Aria label', 'sgs-blocks' ) }
						value={ ariaLabel }
						onChange={ ( value ) => setAttributes( { ariaLabel: value } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Popover target ID', 'sgs-blocks' ) }
						help={ __( 'ID of the popover element this toggle opens. Defaults to sgs-mobile-nav (the SGS Mobile Nav block).', 'sgs-blocks' ) }
						value={ popoverTarget }
						onChange={ ( value ) => setAttributes( { popoverTarget: value } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>
			<button
				{ ...blockProps }
				type="button"
				aria-label={ ariaLabel }
			>
				<span aria-hidden="true">
					<IconPreview
						source="lucide"
						name={ toggleOpenIcon || 'menu' }
						size={ iconSize }
					/>
				</span>
			</button>
		</>
	);
}
