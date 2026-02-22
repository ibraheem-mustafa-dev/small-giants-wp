import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const TRIGGER_STYLE_OPTIONS = [
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Secondary', 'sgs-blocks' ), value: 'secondary' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
];

const MODAL_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'Full', 'sgs-blocks' ), value: 'full' },
];

const TEMPLATE = [
	[
		'core/heading',
		{
			level: 2,
			placeholder: __( 'Modal heading…', 'sgs-blocks' ),
		},
	],
	[
		'core/paragraph',
		{
			placeholder: __(
				'Add any blocks you like inside the modal.',
				'sgs-blocks'
			),
		},
	],
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		triggerText,
		triggerStyle,
		triggerColour,
		triggerBackground,
		modalSize,
		closeOnBackdrop,
		modalBackground,
		overlayColour,
		overlayOpacity,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-modal',
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'sgs-modal__content-preview',
		},
		{
			template: TEMPLATE,
			templateLock: false,
		}
	);

	const triggerButtonStyle = {
		color: colourVar( triggerColour ) || undefined,
		backgroundColor: colourVar( triggerBackground ) || undefined,
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Trigger Button', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Button text', 'sgs-blocks' ) }
						value={ triggerText }
						onChange={ ( val ) =>
							setAttributes( { triggerText: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Button style', 'sgs-blocks' ) }
						value={ triggerStyle }
						options={ TRIGGER_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { triggerStyle: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Button text colour', 'sgs-blocks' ) }
						value={ triggerColour }
						onChange={ ( val ) =>
							setAttributes( { triggerColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Button background colour',
							'sgs-blocks'
						) }
						value={ triggerBackground }
						onChange={ ( val ) =>
							setAttributes( {
								triggerBackground: val,
							} )
						}
					/>
				</PanelBody>

				<PanelBody title={ __( 'Modal Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Modal size', 'sgs-blocks' ) }
						value={ modalSize }
						options={ MODAL_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { modalSize: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __(
							'Close on backdrop click',
							'sgs-blocks'
						) }
						help={ __(
							'Allow users to close the modal by clicking outside it.',
							'sgs-blocks'
						) }
						checked={ closeOnBackdrop }
						onChange={ ( val ) =>
							setAttributes( { closeOnBackdrop: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __(
							'Modal background colour',
							'sgs-blocks'
						) }
						value={ modalBackground }
						onChange={ ( val ) =>
							setAttributes( { modalBackground: val } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Overlay', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Overlay colour', 'sgs-blocks' ) }
						value={ overlayColour }
						onChange={ ( val ) =>
							setAttributes( { overlayColour: val } )
						}
					/>
					<RangeControl
						label={ __( 'Overlay opacity', 'sgs-blocks' ) }
						value={ overlayOpacity }
						onChange={ ( val ) =>
							setAttributes( { overlayOpacity: val } )
						}
						min={ 0 }
						max={ 100 }
						step={ 5 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<button
					className={ `sgs-modal__trigger sgs-modal__trigger--${ triggerStyle }` }
					style={ triggerButtonStyle }
					type="button"
				>
					{ triggerText }
				</button>

				<div className="sgs-modal__editor-preview">
					<p className="sgs-modal__editor-hint">
						{ __(
							'⬇ Modal content (not visible on frontend until button is clicked):',
							'sgs-blocks'
						) }
					</p>
					<div { ...innerBlocksProps } />
				</div>
			</div>
		</>
	);
}
