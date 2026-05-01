import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { iconSize, ariaLabel, popoverTarget } = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-mobile-nav-toggle',
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Toggle Button', 'sgs-blocks' ) }>
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
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width={ iconSize }
					height={ iconSize }
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M3 6h18M3 12h18M3 18h18" />
				</svg>
			</button>
		</>
	);
}
