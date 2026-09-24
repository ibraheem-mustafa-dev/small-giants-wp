import { __, sprintf } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import { useEntityRecords } from '@wordpress/core-data';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	Notice,
} from '@wordpress/components';
import { resolveColourToken, DesignTokenPicker, GradientCapableColourControl, SgsColourPanel, ScrimControls, scrimColourRow } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanel } from '../../components/primitives';
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
		modalRef,
		triggerText,
		triggerStyle,
		triggerColour,
		triggerColourGradient,
		triggerColourHover,
		triggerColourHoverGradient,
		triggerBackground,
		triggerBackgroundHover,
		triggerBackgroundHoverGradient,
		maxWidth,
		closeOnOverlay,
		modalBackground,
		scrimColour,
		scrimColourGradient,
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

	// modalRef (Task 1, 2026-09-14) — lets one sgs/modal instance open a
	// `sgs_modal` post's content instead of its own InnerBlocks, so the same
	// content can be opened from any number of trigger instances across the
	// site. Only PUBLISHED posts are offered — an unpublished one wouldn't
	// resolve on the frontend either (render.php / Sgs_Block_CPTs::resolve_modal()
	// applies the same status check), so offering it here would be a picker
	// option that silently renders nothing. Mirrors useNavMenuSource.js's
	// useEntityRecords( 'postType', … ) + manual-options-array shape.
	const { records: modalPosts, isResolving: isResolvingModals } = useEntityRecords(
		'postType',
		'sgs_modal',
		{ per_page: -1, status: [ 'publish' ], context: 'edit' }
	);
	const modalRefOptions = [
		{
			label: __( "This block's own content (below)", 'sgs-blocks' ),
			value: 0,
		},
		...( modalPosts || [] ).map( ( post ) => ( {
			label: post.title?.rendered || __( '(untitled modal)', 'sgs-blocks' ),
			value: post.id,
		} ) ),
	];
	const referencedModalPost = ( modalPosts || [] ).find( ( post ) => post.id === modalRef );
	// A non-zero modalRef whose post is missing from the published list above
	// — trashed, unpublished, or deleted since this block last saved — degrades
	// the same way render.php does: nothing is rendered from the reference, and
	// this notice tells the operator why rather than showing a silently-empty
	// dialog.
	const modalRefIsDangling = 0 !== modalRef && ! isResolvingModals && ! referencedModalPost;

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
	 * triggerBackgroundHover(Gradient) canvas mirror (CHECK A, 2026-09-06).
	 * render.php already paints this hover pair on the frontend via
	 * sgs_fill_states_css(), out-specifying the static
	 * `.sgs-modal__trigger--{style}:hover` class default — the editor canvas
	 * never showed it because nothing outside the control read the Hover
	 * attrs. Targets the REAL `.sgs-modal__trigger` button rendered below.
	 *
	 * The scrim's own former colour hover pair
	 * was REMOVED in the U-2 Addendum A modal migration (2026-09-24) — the
	 * scrim div sits under the top layer and cannot be hovered by a pointer
	 * that is over the dialog's own top-layer content, so there was no real
	 * hover state to mirror here either.
	 *
	 * `!important` is required because the resting style above sets the SAME
	 * background-color/-image properties as an inline `style` prop on this
	 * same element — an inline declaration always out-ranks an external
	 * stylesheet rule for the same property regardless of `:hover` matching,
	 * so without it this rule would parse correctly and still never paint
	 * whenever a resting colour is also set (the common case).
	 */
	const triggerBgHoverDecl =
		triggerBackgroundHoverGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( triggerBackgroundHoverGradient )
			? `background-image:${ triggerBackgroundHoverGradient } !important;background-color:transparent !important;`
			: triggerBackgroundHover
				? `background-color:${ resolveColourToken( triggerBackgroundHover, palette ) } !important;`
				: '';
	const modalHoverPreviewCss = [
		triggerBgHoverDecl &&
			`.${ modalPreviewScope } .sgs-modal__trigger:hover,.${ modalPreviewScope } .sgs-modal__trigger:focus-visible{${ triggerBgHoverDecl }}`,
	]
		.filter( Boolean )
		.join( '' );

	return (
		<>
			{ /* Close button colour — was two DesignTokenPickers inside "Modal
			   Settings" (comment there cited D622, since superseded — every
			   fill/text/link colour lives in this shared panel now, see
			   SgsColourPanel.js's own docblock). Rendered first per that
			   component's own ordering requirement (before any other
			   same-group InspectorControls Fill, e.g. the "Backdrop" panel
			   below). The scrim colour row (U-2 Addendum A, 2026-09-24) is
			   added here too via the shared `scrimColourRow()` — its
			   strength/blur siblings, which are not colours, live in their
			   own "Backdrop" ToolsPanel instead (ScrimControls.js). */ }
			<SgsColourPanel
				rows={ [
					scrimColourRow( { attributes, setAttributes } ),
					{
						key: 'closeText',
						label: __( 'Close button icon colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
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
						],
					},
					{
						key: 'closeBackground',
						label: __( 'Close button background colour', 'sgs-blocks' ),
						gradientCapable: true,
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
			{ /* GROUND-TRUTH: block.json attributes.triggerColour /
			   triggerBackground / modalBackground (3 plain string colour
			   attrs, no shared prefix pairing — triggerColour and
			   triggerBackground live on the SAME `.sgs-modal__trigger`
			   element but different CSS properties, so they are 2 separate
			   rows, not one row with 2 states) + render.php (trigger colours
			   -> render.php's scoped `.sgs-modal__trigger` rule;
			   modalBackground -> the dialog's background-color) — confirmed
			   2026-08-15 against the live source and this edit.js's own
			   pre-existing comments before wiring these rows. triggerColour
			   gained a hover pair 2026-09-07 (Task 1, colour-conformance);
			   the other 2 remain single-state. scrimColour (the former
			   overlayColour) moved into the row above via `scrimColourRow()`
			   in the U-2 Addendum A modal migration (2026-09-24) — it now
			   paints the shared viewport scrim, not this block's own
			   `::backdrop`. `linked: true` per D619. None of the old
			   DesignTokenPickers below passed `linked`, so this migration
			   also fixes a pre-existing gap (a converter-written slug would
			   previously have shown as "unset"). */ }
			<InspectorControls>
				<PanelBody title={ __( 'Modal Settings', 'sgs-blocks' ) }>
					{ /* modalRef (Task 1, 2026-09-14) — placed first: it decides
					   whether the "Modal content" section further down the canvas
					   is this instance's own InnerBlocks or a read-only summary of
					   a shared sgs_modal post, so an operator needs to see this
					   choice before anything content-shaped below it. */ }
					<SelectControl
						label={ __( 'Modal content', 'sgs-blocks' ) }
						help={ __(
							'Point several triggers at the same modal content — edit it once on its own screen (SGS admin menu -> Modals) and every trigger stays in sync.',
							'sgs-blocks'
						) }
						value={ modalRef }
						options={ modalRefOptions }
						onChange={ ( val ) =>
							setAttributes( { modalRef: Number( val ) || 0 } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ modalRefIsDangling && (
						<Notice status="warning" isDismissible={ false }>
							{ __(
								'The referenced modal is missing, unpublished, or was deleted. This trigger will open an empty dialog until a valid modal is chosen above.',
								'sgs-blocks'
							) }
						</Notice>
					) }
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
					<GradientCapableColourControl
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
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: triggerColourHover,
								onChange: ( val ) => setAttributes( { triggerColourHover: val ?? '' } ),
								gradientValue: triggerColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { triggerColourHoverGradient: val ?? '' } ),
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
				</PanelBody>
			</InspectorControls>

			{ /* Backdrop strength + blur (U-2 Addendum A, modal migration,
			   2026-09-24) — the shared `<ScrimControls>`, replacing the old
			   "Overlay" panel's opacity slider (and its hover-colour row,
			   removed — see the block.json/render.php comments). The colour
			   row moved into the top SgsColourPanel above via
			   `scrimColourRow()`; this panel carries only the non-colour
			   siblings (strength, blur), per ScrimControls.js's own docblock. */ }
			<InspectorControls group="styles">
				<ToolsPanel
					label={ __( 'Backdrop', 'sgs-blocks' ) }
					resetAll={ () =>
						// Reset to the block's own defaults (block.json), not to an
						// empty object — scrimOpacity's default is desktop 0.5 (the
						// old opacity attribute's 50/100 default), so a blank reset would
						// silently change the default look.
						setAttributes( { scrimOpacity: { desktop: 0.5 }, scrimBlur: {} } )
					}
				>
					<ScrimControls attributes={ attributes } setAttributes={ setAttributes } />
				</ToolsPanel>
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

				{ /* The scrim preview swatch that used to live here (reproducing
				   render.php's old backdrop-colour/opacity maths) is REMOVED in
				   the U-2 Addendum A modal migration (2026-09-24): the canvas does
				   not preview the scrim at all now (ScrimControls.js's own
				   docblock — "a closed drawer or panel has none"), the same as
				   every other scrim adopter (nav-drawer, nav-bar-menu). A closed
				   modal has no scrim to show, so there is nothing honest to
				   render here. */ }

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

				{ /* modalRef (Task 1, 2026-09-14) — 0 (the original shape) keeps
				   this instance's own editable InnerBlocks exactly as before;
				   a non-zero reference REPLACES that editable area with a
				   read-only summary, because the real content now lives on
				   the referenced sgs_modal post's own edit screen and editing
				   it here would silently do nothing on the frontend (render.php
				   only ever reads the referenced post's content in that mode). */ }
				{ 0 === modalRef ? (
					<div className="sgs-modal__editor-preview">
						<p className="sgs-modal__editor-hint">
							{ __(
								'⬇ Modal content (not visible on frontend until button is clicked):',
								'sgs-blocks'
							) }
						</p>
						<div { ...innerBlocksProps } />
					</div>
				) : (
					<div className="sgs-modal__editor-preview sgs-modal__editor-preview--referenced">
						<p className="sgs-modal__editor-hint">
							{ referencedModalPost
								? sprintf(
										/* translators: %s: title of the referenced modal post. */
										__(
											'⬇ Content: "%s" — edit it on its own screen (SGS admin menu -> Modals), not here.',
											'sgs-blocks'
										),
										referencedModalPost.title?.rendered ||
											__( '(untitled modal)', 'sgs-blocks' )
								  )
								: __(
										'⬇ This trigger points at a modal that no longer resolves — pick another above.',
										'sgs-blocks'
								  ) }
						</p>
					</div>
				) }
			</div>
		</>
	);
}
