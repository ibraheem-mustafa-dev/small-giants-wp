import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import { DesignTokenPicker, resolveColorToken } from '../../components';

const TRIGGER_STYLE_OPTIONS = [
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Secondary', 'sgs-blocks' ), value: 'secondary' },
	{ label: __( 'Text Link', 'sgs-blocks' ), value: 'text-link' },
];

const MAX_WIDTH_OPTIONS = [
	{ label: __( 'Small (480px)', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium (640px)', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large (800px)', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'Full Width', 'sgs-blocks' ), value: 'full' },
];

// Mirrors the `.sgs-modal__dialog--{maxWidth}` width variants in style.css.
const MAX_WIDTH_VALUES = {
	small: '480px',
	medium: '640px',
	large: '800px',
	full: '95vw',
};

const TEMPLATE = [
	[
		'sgs/heading',
		{
			level: 2,
			placeholder: __( 'Modal heading…', 'sgs-blocks' ),
		},
	],
	[
		'sgs/text',
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
		maxWidth,
		closeOnOverlay,
		modalBackground,
		overlayColour,
		overlayOpacity,
	} = attributes;

	const [ palette ] = useSettings( 'color.palette' );
	const blockProps = useBlockProps( {
		className: 'sgs-modal',
	} );

	// Mirrors render.php's dialog rules: max-width variant class + the
	// modalBackground colour rule on `.sgs-modal__dialog`. modalBackground's
	// DesignTokenPicker has no `linked` prop, so it always stores a raw CSS
	// value, never a slug -- resolveColorToken() (not colourVar(), which is
	// slug-only) is the correct resolver.
	const contentPreviewStyle = {
		maxWidth: MAX_WIDTH_VALUES[ maxWidth ] || undefined,
		backgroundColor: resolveColorToken( modalBackground, palette ) || undefined,
	};

	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'sgs-modal__content-preview',
			style: contentPreviewStyle,
		},
		{
			template: TEMPLATE,
			templateLock: false,
		}
	);

	// triggerColour/triggerBackground's DesignTokenPickers have no `linked`
	// prop, so they always store a raw CSS value, never a slug --
	// resolveColorToken() (not colourVar(), which is slug-only) is the
	// correct resolver.
	const triggerButtonStyle = {
		color: resolveColorToken( triggerColour, palette ) || undefined,
		backgroundColor: resolveColorToken( triggerBackground, palette ) || undefined,
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
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Button style', 'sgs-blocks' ) }
						value={ triggerStyle }
						options={ TRIGGER_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { triggerStyle: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
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
						label={ __( 'Max width', 'sgs-blocks' ) }
						value={ maxWidth }
						options={ MAX_WIDTH_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { maxWidth: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __(
							'Close on overlay click',
							'sgs-blocks'
						) }
						help={ __(
							'Allow users to close the modal by clicking outside it.',
							'sgs-blocks'
						) }
						checked={ closeOnOverlay }
						onChange={ ( val ) =>
							setAttributes( { closeOnOverlay: val } )
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
						__next40pxDefaultSize
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

				{ /* Overlay colour/opacity are only visible on a real OPEN <dialog>
					(native ::backdrop), which the editor canvas never shows — there
					is no "open modal" preview here, only the trigger + an inline
					content preview. Rather than leaving overlayColour/overlayOpacity
					with zero editor representation, this swatch reproduces the exact
					same maths render.php uses for the backdrop (colour resolved via
					resolveColorToken, opacity/100) so an operator can see what the
					dimmed backdrop will look like without it needing to visually BE
					an open dialog.

					Sizing/layout is set INLINE (not left to editor.css alone) —
					this project's own mega-panel/editor.css header documents that
					WP 7.0's iframed canvas does not always load a block's
					editorStyle, so a class-only box could render at 0x0 and stay
					invisible; editor.css still supplies the border/radius/colour
					polish on top when it does load. */ }
				<div
					className="sgs-modal__overlay-preview-row"
					style={ { display: 'flex', alignItems: 'center', gap: '8px' } }
				>
					<span
						className="sgs-modal__overlay-preview-swatch"
						style={ {
							display: 'inline-block',
							width: '28px',
							height: '28px',
							flexShrink: 0,
							borderRadius: '4px',
							border: '1px solid #e5e5e5',
							backgroundColor:
								resolveColorToken( overlayColour, palette ) ||
								undefined,
							opacity: ( overlayOpacity ?? 50 ) / 100,
						} }
						aria-hidden="true"
					/>
					<span
						className="sgs-modal__overlay-preview-label"
						style={ { fontSize: '0.8125rem', color: '#6b6b6b' } }
					>
						{ __( 'Overlay preview', 'sgs-blocks' ) }
					</span>
				</div>

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
