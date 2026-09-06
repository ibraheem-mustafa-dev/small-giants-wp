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
import { resolveColourToken, DesignTokenPicker } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { resolveTextColourPreviewStyle, resolveBackgroundPaintPreviewStyle } from '../../utils';

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

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		triggerText,
		triggerStyle,
		triggerColour,
		triggerColourGradient,
		triggerBackground,
		triggerBackgroundHover,
		triggerBackgroundHoverGradient,
		maxWidth,
		closeOnOverlay,
		modalBackground,
		overlayColour,
		overlayColourGradient,
		overlayColourHover,
		overlayColourHoverGradient,
		overlayOpacity,
		closeColourBackground,
		closeColourBackgroundHover,
		closeColourBackgroundGradient,
		closeColourBackgroundHoverGradient,
		closeColourText,
		closeColourTextHover,
		closeColourTextGradient,
		closeColourTextHoverGradient,
	} = attributes;

	const [ palette ] = useSettings( 'color.palette' );
	const modalPreviewScope = `sgs-modal-preview-${ clientId }`;
	const blockProps = useBlockProps( {
		className: `sgs-modal ${ modalPreviewScope }`,
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
		...resolveTextColourPreviewStyle( triggerColour, triggerColourGradient, ( v ) => resolveColourToken( v, palette ) ),
		backgroundColor: resolveColourToken( triggerBackground, palette ) || undefined,
	};

	/*
	 * triggerBackgroundHover(Gradient) + overlayColourHover(Gradient) canvas
	 * mirror (CHECK A, 2026-09-06). render.php already paints both hover
	 * pairs on the frontend — triggerBackgroundHover via sgs_fill_states_css()
	 * out-specifying the static `.sgs-modal__trigger--{style}:hover` class
	 * default, overlayColourHover via sgs_custom_property_gradient_decls()
	 * feeding the `::backdrop`'s hover custom properties — the editor canvas
	 * never showed either because nothing outside the two controls read the
	 * Hover attrs. The trigger mirror targets the REAL `.sgs-modal__trigger`
	 * button rendered below; the overlay mirror targets the SAME decorative
	 * "Overlay preview" swatch that already reproduces the resting overlay
	 * colour (see the swatch's own comment above) — hovering that swatch is
	 * the honest editor-canvas equivalent of hovering the real ::backdrop,
	 * which the canvas can never render open.
	 *
	 * `!important` is required because the resting styles above set the SAME
	 * background-color/-image properties as an inline `style` prop on these
	 * same elements — an inline declaration always out-ranks an external
	 * stylesheet rule for the same property regardless of `:hover` matching,
	 * so without it these rules would parse correctly and still never paint
	 * whenever a resting colour is also set (the common case).
	 */
	const triggerBgHoverDecl =
		triggerBackgroundHoverGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( triggerBackgroundHoverGradient )
			? `background-image:${ triggerBackgroundHoverGradient } !important;background-color:transparent !important;`
			: triggerBackgroundHover
				? `background-color:${ resolveColourToken( triggerBackgroundHover, palette ) } !important;`
				: '';
	const overlayHoverDecl =
		overlayColourHoverGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( overlayColourHoverGradient )
			? `background-image:${ overlayColourHoverGradient } !important;background-color:transparent !important;`
			: overlayColourHover
				? `background-color:${ resolveColourToken( overlayColourHover, palette ) } !important;`
				: '';
	const modalHoverPreviewCss = [
		triggerBgHoverDecl &&
			`.${ modalPreviewScope } .sgs-modal__trigger:hover,.${ modalPreviewScope } .sgs-modal__trigger:focus-visible{${ triggerBgHoverDecl }}`,
		overlayHoverDecl &&
			`.${ modalPreviewScope } .sgs-modal__overlay-preview-swatch:hover{${ overlayHoverDecl }}`,
	]
		.filter( Boolean )
		.join( '' );

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
					<ToggleGroupControl
						label={ __( 'Button style', 'sgs-blocks' ) }
						value={ triggerStyle }
						onChange={ ( val ) =>
							setAttributes( { triggerStyle: val || 'primary' } )
						}
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="primary" label={ __( 'Primary', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="secondary" label={ __( 'Secondary', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="text-link" label={ __( 'Text Link', 'sgs-blocks' ) } />
					</ToggleGroupControl>
					{ /* Moved in from the shared SgsColourPanel (D622 — an
					     element-scoped colour belongs in its own element's
					     TIER 1 panel; "trigger button" is a declared element
					     whose attrMap claims triggerColour/triggerBackground). */ }
					<DesignTokenPicker
						label={ __( 'Button text colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: triggerColour,
								onChange: ( val ) => setAttributes( { triggerColour: val ?? '' } ),
								gradientValue: triggerColourGradient,
								onGradientChange: ( val ) => setAttributes( { triggerColourGradient: val ?? '' } ),
								linked: true,
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Button background colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: triggerBackground,
								onChange: ( val ) => setAttributes( { triggerBackground: val ?? '' } ),
								gradientValue: attributes.triggerBackgroundGradient,
								onGradientChange: ( val ) => setAttributes( { triggerBackgroundGradient: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: triggerBackgroundHover,
								onChange: ( val ) => setAttributes( { triggerBackgroundHover: val ?? '' } ),
								gradientValue: attributes.triggerBackgroundHoverGradient,
								onGradientChange: ( val ) => setAttributes( { triggerBackgroundHoverGradient: val ?? '' } ),
								linked: true,
							},
						] }
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
					{ /* Moved in from the shared SgsColourPanel (D622); "dialog"
					     is a declared element whose attrMap claims
					     modalBackground. */ }
					<DesignTokenPicker
						label={ __( 'Modal background colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: modalBackground,
								onChange: ( val ) => setAttributes( { modalBackground: val ?? '' } ),
								gradientValue: attributes.modalBackgroundGradient,
								onGradientChange: ( val ) => setAttributes( { modalBackgroundGradient: val ?? '' } ),
								linked: true,
							},
						] }
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
					{ /* Moved in from the shared SgsColourPanel (D622); "close
					     button" is a declared element whose attrMap claims
					     closeColourText/closeColourBackground. */ }
					<DesignTokenPicker
						label={ __( 'Close button icon colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: closeColourText,
								onChange: ( val ) => setAttributes( { closeColourText: val ?? '' } ),
								linked: true,
								gradientValue: closeColourTextGradient,
								onGradientChange: ( val ) => setAttributes( { closeColourTextGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: closeColourTextHover,
								onChange: ( val ) => setAttributes( { closeColourTextHover: val ?? '' } ),
								linked: true,
								gradientValue: closeColourTextHoverGradient,
								onGradientChange: ( val ) => setAttributes( { closeColourTextHoverGradient: val ?? '' } ),
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Close button background colour', 'sgs-blocks' ) }
						states={ [
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
						] }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* Overlay colour + opacity live together in one Styles-tab panel,
			   matching the precedent BackgroundPanel.js already sets for
			   container/cta-section/hero/multi-button/physics-canvas/site-
			   footer/site-header/trust-bar (D717): a colour picker with alpha
			   OFF (opacity is a separate CSS property with its own control,
			   so two transparency mechanisms never fight over the same
			   stored value) followed by a plain opacity slider, both in the
			   panel for whatever they're applied to — not paired via the
			   colour picker's own API. */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Overlay', 'sgs-blocks' ) }>
					<DesignTokenPicker
						label={ __( 'Overlay colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: overlayColour,
								onChange: ( val ) =>
									setAttributes( { overlayColour: val ?? '' } ),
								linked: true,
								gradientValue: overlayColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { overlayColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: overlayColourHover,
								onChange: ( val ) =>
									setAttributes( { overlayColourHover: val ?? '' } ),
								linked: true,
								gradientValue: overlayColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { overlayColourHoverGradient: val ?? '' } ),
							},
						] }
						enableAlpha={ false }
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
				{ modalHoverPreviewCss && <style>{ modalHoverPreviewCss }</style> }
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
							// overlayColourGradient (2026-09-06) — mirrors render.php's
							// gradient-wins-over-flat precedence (sgs_custom_property_
							// gradient_decls()); resolveColourToken (not colourVar) is
							// used for the flat branch since this picker stores a raw
							// resolved value via resolveColourToken above, not a slug-only var().
							...( overlayColourGradient
								? { backgroundImage: overlayColourGradient }
								: {
										backgroundColor:
											resolveColourToken( overlayColour, palette ) ||
											undefined,
								  } ),
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

				{ /* GROUND-TRUTH: source=file, confirmed against render.php:110-122 +
				   helpers-button-style.php:79-313 this session. The close button
				   (`.sgs-modal__close`) only exists inside the real `<dialog>`,
				   which — like the overlay above — the editor canvas never opens.
				   render.php calls `sgs_button_element_style_css( $attributes,
				   'close', …, $bg_layer = true, $bg_layer_positioned = true )`:
				   closeColourBackground(Gradient) paints a `::after` layer BEHIND
				   the button (never the base selector), while
				   closeColourText(Gradient) paints the base selector directly
				   (safe because $bg_layer moved the fill off it) — the exact
				   mechanism the icon's `stroke="currentColor"` depends on. A
				   plain inline `style` prop cannot target a `::after` pseudo
				   -element, so this preview uses two nested elements instead of
				   one to keep the two paints from colliding on the same style
				   object: the outer swatch carries the BACKGROUND paint (mirrors
				   the ::after layer), the inner icon wrapper carries the TEXT
				   paint via the same `resolveTextColourPreviewStyle()` helper
				   `triggerButtonStyle` above already uses — including the
				   gradient branch's `color:transparent`, which correctly mirrors
				   the real frontend making the icon invisible when a gradient
				   text colour is set (this is what render.php actually paints,
				   not a bug this preview should hide). */ }
				<div
					className="sgs-modal__close-preview-row"
					style={ { display: 'flex', alignItems: 'center', gap: '8px' } }
				>
					<span
						className="sgs-modal__close-preview-swatch"
						style={ {
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							width: '28px',
							height: '28px',
							flexShrink: 0,
							borderRadius: '50%',
							border: '1px solid #e5e5e5',
							...resolveBackgroundPaintPreviewStyle( closeColourBackground, closeColourBackgroundGradient ),
						} }
						aria-hidden="true"
					>
						<span
							style={ resolveTextColourPreviewStyle(
								closeColourText,
								closeColourTextGradient,
								( v ) => resolveColourToken( v, palette )
							) }
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</span>
					</span>
					<span
						className="sgs-modal__close-preview-label"
						style={ { fontSize: '0.8125rem', color: '#6b6b6b' } }
					>
						{ __( 'Close button preview', 'sgs-blocks' ) }
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
