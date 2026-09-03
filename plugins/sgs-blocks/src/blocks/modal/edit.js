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
import { resolveColourToken, SgsColourPanel } from '../../components';

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
		closeColourBackground,
		closeColourBackgroundHover,
		closeColourBackgroundGradient,
		closeColourBackgroundHoverGradient,
		closeColourText,
		closeColourTextHover,
	} = attributes;

	const [ palette ] = useSettings( 'color.palette' );
	const blockProps = useBlockProps( {
		className: 'sgs-modal',
	} );

	// Mirrors render.php's dialog rules: max-width variant class + the
	// modalBackground colour rule on `.sgs-modal__dialog`. modalBackground's
	// DesignTokenPicker has no `linked` prop, so it always stores a raw CSS
	// value, never a slug -- resolveColourToken() (not colourVar(), which is
	// slug-only) is the correct resolver.
	const contentPreviewStyle = {
		maxWidth: MAX_WIDTH_VALUES[ maxWidth ] || undefined,
		backgroundColor: resolveColourToken( modalBackground, palette ) || undefined,
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
	// resolveColourToken() (not colourVar(), which is slug-only) is the
	// correct resolver.
	const triggerButtonStyle = {
		color: resolveColourToken( triggerColour, palette ) || undefined,
		backgroundColor: resolveColourToken( triggerBackground, palette ) || undefined,
	};

	return (
		<>
			{ /* GROUND-TRUTH: block.json attributes.triggerColour /
			   triggerBackground / modalBackground / overlayColour (4 plain
			   string colour attrs, no shared prefix pairing — triggerColour
			   and triggerBackground live on the SAME `.sgs-modal__trigger`
			   element but different CSS properties, so they are 2 separate
			   rows, not one row with 2 states) + render.php (trigger colours
			   -> render.php:37-43/73-75 scoped `.sgs-modal__trigger` rule;
			   modalBackground -> the dialog's background-color;
			   overlayColour -> the `--sgs-modal-backdrop-colour` custom
			   property) — confirmed 2026-08-15 against the live source and
			   this edit.js's own pre-existing comments before wiring these
			   rows. All 4 are single-state (no hover pair exists for any of
			   them), `linked: true` per D619. None of the old
			   DesignTokenPickers below passed `linked`, so this migration
			   also fixes a pre-existing gap (a converter-written slug would
			   previously have shown as "unset"). */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'triggerText',
						label: __( 'Button text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: triggerColour,
								onChange: ( val ) => setAttributes( { triggerColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'triggerBackground',
						label: __( 'Button background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: triggerBackground,
								onChange: ( val ) => setAttributes( { triggerBackground: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'modalBackground',
						label: __( 'Modal background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: modalBackground,
								onChange: ( val ) => setAttributes( { modalBackground: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'overlay',
						label: __( 'Overlay colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: overlayColour,
								onChange: ( val ) => setAttributes( { overlayColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'closeText',
						label: __( 'Close button icon colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: closeColourText,
								onChange: ( val ) => setAttributes( { closeColourText: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: closeColourTextHover,
								onChange: ( val ) => setAttributes( { closeColourTextHover: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'closeBackground',
						label: __( 'Close button background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: closeColourBackground,
								onChange: ( val ) => setAttributes( { closeColourBackground: val ?? '' } ),
								gradientValue: closeColourBackgroundGradient,
								onGradientChange: ( val ) => setAttributes( { closeColourBackgroundGradient: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: closeColourBackgroundHover,
								onChange: ( val ) => setAttributes( { closeColourBackgroundHover: val ?? '' } ),
								gradientValue: closeColourBackgroundHoverGradient,
								onGradientChange: ( val ) => setAttributes( { closeColourBackgroundHoverGradient: val ?? '' } ),
								linked: true,
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Modal Settings', 'sgs-blocks' ) }>
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
				</PanelBody>

				<PanelBody
					title={ __( 'Overlay', 'sgs-blocks' ) }
					initialOpen={ false }
				>
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
					resolveColourToken, opacity/100) so an operator can see what the
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
								resolveColourToken( overlayColour, palette ) ||
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
