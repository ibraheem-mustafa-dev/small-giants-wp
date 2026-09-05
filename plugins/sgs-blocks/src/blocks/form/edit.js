import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	TextControl,
	TextareaControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { useEffect } from '@wordpress/element';
import { ResponsiveBoxControl, LinkPopoverField, resolveColourToken, SgsColourPanel,
	DesignTokenPicker,
	GradientCapableColourControl,
	SgsBorderControl,
} from '../../components';
import { NumberControl } from '../../components/primitives';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { resolveTextColourPreviewStyle, backgroundPaintPreview } from '../../utils';

const SUBMIT_STYLE_OPTIONS = [
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		formId,
		formName,
		submitLabel,
		submitStyle,
		successMessage,
		successRedirect,
		honeypot,
		storeSubmissions,
		requireLogin,
		rateLimit,
		submitColour,
		submitBackground,
		progressBarColour,
		progressBarColourGradient,
		formFocusRingColour,
		formFocusRingWidth,
		formFocusRingOpacity,
		formFocusRingOffset,
		prevColourBackground,
		prevColourBackgroundHover,
		prevColourBackgroundGradient,
		prevColourBackgroundHoverGradient,
		tileBorderColour,
		tileBorderColourHover,
		tileBorderColourGradient,
		tileBorderColourHoverGradient,
		fileLabelBorderColour,
		fileLabelBorderColourHover,
		fileLabelBorderColourGradient,
		fileLabelBorderColourHoverGradient,
		fileLabelBackgroundColour,
		fileLabelBackgroundColourHover,
		fileLabelBackgroundColourGradient,
		fileLabelBackgroundColourHoverGradient,
	} = attributes;

	// Auto-generate formId from clientId on first insert.
	useEffect( () => {
		if ( ! formId ) {
			setAttributes( {
				formId: `form-${ clientId.substr( 0, 8 ) }`,
			} );
		}
	}, [ formId, clientId, setAttributes ] );

	// submitColour/submitBackground/progressBarColour's DesignTokenPickers
	// have no `linked` prop, so they always store a raw CSS value, never a
	// slug -- resolveColourToken() (not colourVar(), which is slug-only) is
	// the correct resolver. Mirrors render.php's scoped `.sgs-form__button
	// --submit`/`.sgs-form__progress` rules (render.php:211-241).
	const [ palette ] = useSettings( 'color.palette' );
	// submitColourGradient (D636 gradient rollout finish, 2026-09-04) — the
	// gradient sibling wins over the flat submitColour when set+valid, same
	// precedence as render.php's sgs_resolve_text_colour_or_gradient().
	const submitTextPreviewStyle = resolveTextColourPreviewStyle(
		submitColour,
		attributes.submitColourGradient,
		( val ) => resolveColourToken( val, palette ) || undefined
	);
	const submitButtonStyle = {
		...submitTextPreviewStyle,
		backgroundColor: resolveColourToken( submitBackground, palette ) || undefined,
	};
	const progressBarStyle = {
		backgroundColor: resolveColourToken( progressBarColour, palette ) || undefined,
	};

	// prevColourBackground(Gradient) canvas preview (2026-09-05) — CHECK A
	// finding. render.php's `.sgs-form__button--prev` mechanism
	// (sgs_button_element_style_css( $attributes, 'prev', … )) already paints
	// this correctly on the frontend; the editor canvas never rendered a
	// Previous-button element at all (multi-step "previous" state has no
	// natural moment to show without real step navigation), same gap the
	// Submit button preview below was built to close. Resting state only —
	// the Hover-suffixed siblings are already canvas-exempted, same doctrine
	// as every other hover value this session.
	const prevButtonStyle = backgroundPaintPreview(
		prevColourBackground,
		prevColourBackgroundGradient,
		palette
	);

	// GROUND-TRUTH: source=file, confirmed against render.php:311-373 +
	// helpers-colour-variants.php's sgs_border_states_css()/sgs_fill_states_css()
	// this session. RESTING state only — the Hover-suffixed siblings are
	// already canvas-exempted. tileBorderColour(Gradient) paints
	// `.sgs-form-tile` and fileLabelBorderColour(Gradient)/
	// fileLabelBackgroundColour(Gradient) paint `.sgs-form-field__file-label` —
	// BOTH elements are rendered by CHILD blocks (sgs/form-field-tiles /
	// sgs/form-field-file) nested inside this block's own InnerBlocks tree, not
	// by sgs/form's own JSX. A plain inline `style` prop on this block's own
	// markup cannot reach a child block's DOM, so this mirrors render.php's
	// `.{uid} .sgs-form-tile{…}` scoped rule with a `clientId`-scoped `<style>`
	// tag instead — same shape as the frontend's own scoped `<style>` block,
	// just keyed to the editor's per-instance identity rather than the
	// render-time uid hash. Border-gradient mirroring is the same
	// `border-image` APPROXIMATION `borderPaintPreview()` documents (the real
	// frontend paints a masked `::before` ring via `sgs_border_gradient_css()`,
	// which a static `<style>` string can't reproduce faithfully).
	const FORM_PREVIEW_GRADIENT_RE = /^(repeating-)?(linear|radial|conic)-gradient\(/i;
	const formPreviewScope = `sgs-form-editor-${ clientId }`;

	const tileBorderPreviewDecl =
		tileBorderColourGradient && FORM_PREVIEW_GRADIENT_RE.test( tileBorderColourGradient )
			? `border-image:${ tileBorderColourGradient } 1;`
			: resolveColourToken( tileBorderColour, palette )
				? `border-color:${ resolveColourToken( tileBorderColour, palette ) };`
				: '';

	const fileLabelBorderPreviewDecl =
		fileLabelBorderColourGradient && FORM_PREVIEW_GRADIENT_RE.test( fileLabelBorderColourGradient )
			? `border-image:${ fileLabelBorderColourGradient } 1;`
			: resolveColourToken( fileLabelBorderColour, palette )
				? `border-color:${ resolveColourToken( fileLabelBorderColour, palette ) };`
				: '';

	const fileLabelBackgroundPreviewDecl =
		fileLabelBackgroundColourGradient && FORM_PREVIEW_GRADIENT_RE.test( fileLabelBackgroundColourGradient )
			? `background-image:${ fileLabelBackgroundColourGradient };`
			: resolveColourToken( fileLabelBackgroundColour, palette )
				? `background-color:${ resolveColourToken( fileLabelBackgroundColour, palette ) };`
				: '';

	const formPreviewCss = [
		tileBorderPreviewDecl && `.${ formPreviewScope } .sgs-form-tile{${ tileBorderPreviewDecl }}`,
		( fileLabelBorderPreviewDecl || fileLabelBackgroundPreviewDecl ) &&
			`.${ formPreviewScope } .sgs-form-field__file-label{${ fileLabelBorderPreviewDecl }${ fileLabelBackgroundPreviewDecl }}`,
	]
		.filter( Boolean )
		.join( '' );

	const blockProps = useBlockProps( {
		className: `sgs-form ${ formPreviewScope }`,
	} );

	// Base roster of blocks a form's own children may ever sensibly be — unlike
	// sgs/container, this list is NEVER relaxed to "no restriction": a form's
	// children are always form-structural (steps/fields/review), so `free`
	// keeps this exact roster rather than allowing arbitrary blocks in (that
	// would be a real regression — a stray sgs/hero dropped into a form breaks
	// its step/field layout and submission handling).
	const FORM_BASE_ALLOWED = [
		'sgs/form-step',
		'sgs/form-field-text',
		'sgs/form-field-email',
		'sgs/form-field-phone',
		'sgs/form-field-textarea',
		'sgs/form-field-select',
		'sgs/form-field-radio',
		'sgs/form-field-checkbox',
		'sgs/form-field-tiles',
		'sgs/form-field-file',
		'sgs/form-field-consent',
		'sgs/form-review',
	];

	const allowedBlocks = FORM_BASE_ALLOWED;

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-form__inner' },
		{
			allowedBlocks,
			template: [ [ 'sgs/form-step', { label: 'Step 1' } ] ],
			orientation: 'vertical',
		}
	);

	return (
		<>
			{ /* D619 — ONE grouped, SGS-OWNED colour panel, rendered FIRST so it
			   sits at the top of the inspector. Replaces the inline
			   `DesignTokenPicker` rows that used to sit in the "Submit
			   Button" / "Progress Bar" / "Focus State" panels below.
			   `supports.color` sub-flags are now false so WordPress
			   generates no native colour UI to overlap with this panel.
			   submitColour/submitBackground are TWO separate rows (different
			   CSS properties on the SAME element — text vs background — not
			   two states of one property). No hover pair exists for any of
			   these four attributes on this block. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'progress-bar',
						label: __( 'Progress bar colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: progressBarColour,
								onChange: ( val ) => setAttributes( { progressBarColour: val ?? '' } ),
								linked: true,
								gradientValue: progressBarColourGradient,
								onGradientChange: ( val ) => setAttributes( { progressBarColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'prev-button-background',
						label: __( 'Previous button background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: prevColourBackground,
								onChange: ( val ) => setAttributes( { prevColourBackground: val ?? '' } ),
								linked: true,
								gradientValue: prevColourBackgroundGradient,
								onGradientChange: ( val ) =>
									setAttributes( { prevColourBackgroundGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: prevColourBackgroundHover,
								onChange: ( val ) => setAttributes( { prevColourBackgroundHover: val ?? '' } ),
								linked: true,
								gradientValue: prevColourBackgroundHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { prevColourBackgroundHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'tile-border',
						label: __( 'Tile border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: tileBorderColour,
								onChange: ( val ) => setAttributes( { tileBorderColour: val ?? '' } ),
								linked: true,
								gradientValue: tileBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { tileBorderColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: tileBorderColourHover,
								onChange: ( val ) => setAttributes( { tileBorderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: tileBorderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { tileBorderColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'file-label-border',
						label: __( 'File upload border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: fileLabelBorderColour,
								onChange: ( val ) => setAttributes( { fileLabelBorderColour: val ?? '' } ),
								linked: true,
								gradientValue: fileLabelBorderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { fileLabelBorderColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: fileLabelBorderColourHover,
								onChange: ( val ) => setAttributes( { fileLabelBorderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: fileLabelBorderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { fileLabelBorderColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'file-label-background',
						label: __( 'File upload background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: fileLabelBackgroundColour,
								onChange: ( val ) => setAttributes( { fileLabelBackgroundColour: val ?? '' } ),
								linked: true,
								gradientValue: fileLabelBackgroundColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { fileLabelBackgroundColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: fileLabelBackgroundColourHover,
								onChange: ( val ) => setAttributes( { fileLabelBackgroundColourHover: val ?? '' } ),
								linked: true,
								gradientValue: fileLabelBackgroundColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { fileLabelBackgroundColourHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Form Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Form ID', 'sgs-blocks' ) }
						value={ formId }
						onChange={ ( value ) =>
							setAttributes( { formId: value } )
						}
						help={ __(
							'Unique identifier for this form. Used for analytics and tracking submissions.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Form Name', 'sgs-blocks' ) }
						value={ formName }
						onChange={ ( value ) =>
							setAttributes( { formName: value } )
						}
						help={ __(
							'Human-readable name for admin display.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Submission', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextareaControl
						label={ __( 'Success Message', 'sgs-blocks' ) }
						value={ successMessage }
						onChange={ ( value ) =>
							setAttributes( { successMessage: value } )
						}
						rows={ 3 }
						__nextHasNoMarginBottom
					/>
					{ /* Spec 35 §2 LINK standard — replaces the superseded inline
					   `SgsLinkControl` mount. `successRedirect` is a plain
					   URL string with no target/rel concept, so `searchOnly`
					   matches its existing contract exactly. */ }
					<LinkPopoverField
						label={ __( 'Success Redirect URL', 'sgs-blocks' ) }
						help={ __(
							'Optional. Redirect to this URL after successful submission.',
							'sgs-blocks'
						) }
						value={ successRedirect || '' }
						searchOnly
						onChange={ ( url ) =>
							setAttributes( { successRedirect: url } )
						}
					/>
					<p className="components-base-control__help">
						{ __(
							'Webhook URL is configured in Settings → SGS Forms for security.',
							'sgs-blocks'
						) }
					</p>
					<ToggleControl
						label={ __( 'Store Submissions', 'sgs-blocks' ) }
						checked={ storeSubmissions }
						onChange={ ( value ) =>
							setAttributes( { storeSubmissions: value } )
						}
						help={ __(
							'Save submissions to the WordPress database.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Honeypot Protection', 'sgs-blocks' ) }
						checked={ honeypot }
						onChange={ ( value ) =>
							setAttributes( { honeypot: value } )
						}
						help={ __(
							'Add a hidden field to catch spam bots.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Require Login', 'sgs-blocks' ) }
						checked={ requireLogin }
						onChange={ ( value ) =>
							setAttributes( { requireLogin: value } )
						}
						help={ __(
							'Only allow logged-in users to submit this form.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<NumberControl
						label={ __( 'Rate Limit', 'sgs-blocks' ) }
						value={ rateLimit }
						min={ 1 }
						onChange={ ( value ) =>
							setAttributes( { rateLimit: parseInt( value, 10 ) || 5 } )
						}
						help={ __(
							'Maximum submissions allowed per IP address, per hour.',
							'sgs-blocks'
						) }
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Submit Button', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Button Label', 'sgs-blocks' ) }
						value={ submitLabel }
						onChange={ ( value ) =>
							setAttributes( { submitLabel: value } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Button Style', 'sgs-blocks' ) }
						value={ submitStyle }
						options={ SUBMIT_STYLE_OPTIONS }
						onChange={ ( value ) =>
							setAttributes( { submitStyle: value } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* Moved in from the shared top-level SgsColourPanel — CO-2,
					   THE PLACEMENT RULE names "Submit button" a TIER-1 element,
					   so its colours belong in this same panel alongside label
					   and style. Two separate rows (different CSS properties —
					   text vs background — not two states of one property). */ }
					<GradientCapableColourControl
						label={ __( 'Submit button text colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: submitColour,
								onChange: ( val ) => setAttributes( { submitColour: val ?? '' } ),
								linked: true,
								gradientValue: attributes.submitColourGradient,
								onGradientChange: ( val ) => setAttributes( { submitColourGradient: val ?? '' } ),
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Submit button background colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: submitBackground,
								onChange: ( val ) => setAttributes( { submitBackground: val ?? '' } ),
								gradientValue: attributes.submitBackgroundGradient,
								onGradientChange: ( val ) => setAttributes( { submitBackgroundGradient: val ?? '' } ),
								linked: true,
							},
						] }
					/>
				</PanelBody>

			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Focus State', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* Moved in from the shared top-level SgsColourPanel — CO-2,
					   THE PLACEMENT RULE names "Focus ring" a TIER-1 element,
					   so its colour belongs in this same panel alongside
					   width/opacity/offset below. */ }
					<DesignTokenPicker
						label={ __( 'Focus ring colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: formFocusRingColour,
								onChange: ( val ) => setAttributes( { formFocusRingColour: val || 'primary' } ),
								linked: true,
							},
						] }
					/>
					<RangeControl
						label={ __( 'Focus ring width (px)', 'sgs-blocks' ) }
						help={ __( 'Outline width in pixels when an input is keyboard-focused.', 'sgs-blocks' ) }
						value={ formFocusRingWidth }
						onChange={ ( value ) =>
							setAttributes( { formFocusRingWidth: value } )
						}
						min={ 1 }
						max={ 6 }
						step={ 1 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Focus ring opacity (%)', 'sgs-blocks' ) }
						help={ __( '100 = fully opaque, 40 = subtle glow (recommended).', 'sgs-blocks' ) }
						value={ formFocusRingOpacity }
						onChange={ ( value ) =>
							setAttributes( { formFocusRingOpacity: value } )
						}
						min={ 10 }
						max={ 100 }
						step={ 5 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Focus ring offset (px)', 'sgs-blocks' ) }
						help={ __( 'Gap between input edge and focus ring.', 'sgs-blocks' ) }
						value={ formFocusRingOffset }
						onChange={ ( value ) =>
							setAttributes( { formFocusRingOffset: value } )
						}
						min={ 0 }
						max={ 8 }
						step={ 1 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* Responsive spacing (padding + margin) — box-object interface contract
					(.claude/plans/2026-07-09-box-object-interface-contract.md §5). Base tier
					writes to the WP-native style.spacing object (also visible in the Styles >
					Dimensions panel); tablet/mobile write to the paddingTablet/paddingMobile
					and marginTablet/marginMobile object attrs read by the wrapper's @media tiers. */ }
				<PanelBody title={ __( 'Padding & margin', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: attributes.style?.spacing?.padding ?? {},
							tablet: attributes.paddingTablet ?? {},
							mobile: attributes.paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, padding: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'paddingTablet' : 'paddingMobile' ]: next,
								} );
							}
						} }
					/>
					<hr style={ { margin: '16px 0' } } />
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: attributes.style?.spacing?.margin ?? {},
							tablet: attributes.marginTablet ?? {},
							mobile: attributes.marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, margin: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'marginTablet' : 'marginMobile' ]: next,
								} );
							}
						} }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						radiusValues={ {
							base: attributes.borderRadius ?? {},
							tablet: attributes.borderRadiusTablet ?? {},
							mobile: attributes.borderRadiusMobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const radiusKey = tier === 'base' ? 'borderRadius' : tier === 'tablet' ? 'borderRadiusTablet' : 'borderRadiusMobile';
							setAttributes( { [ radiusKey ]: next } );
						} }
					/>
				</PanelBody>
			</InspectorControls>
			<ContainerWrapperControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				kind="layout"
			/>

			<div { ...blockProps }>
				{ formPreviewCss && <style>{ formPreviewCss }</style> }
				<div { ...innerBlocksProps } />
				{ /* Editor-canvas-only submit button preview — render.php mirror.
					There is no real <form> in the editor canvas, so without this
					element neither submitLabel nor submitStyle showed any visible
					effect while editing (see render.php:351-360 for the frontend
					equivalent). type="button" so it can never submit anything.
					submitColour/submitBackground added 2026-08-13 — render.php:
					211-228 emits a real, unconditional `color`/`background-color`
					rule on this exact element; the preview had never carried it. */ }
				<div className="sgs-form__actions">
					{ /* Editor-canvas-only Previous-button preview (2026-09-05) — same
						reasoning as the Submit button preview above: no real multi-step
						navigation exists in the editor canvas, so without this element
						prevColourBackground(Gradient) showed no visible effect while
						editing, even though render.php already paints it correctly via
						`.sgs-form__button--prev` (sgs_button_element_style_css()). */ }
					<button
						type="button"
						className="sgs-form__button sgs-form__button--prev"
						style={ prevButtonStyle }
					>
						{ __( 'Previous', 'sgs-blocks' ) }
					</button>
					<button
						type="button"
						className={ `sgs-form__button sgs-form__button--submit sgs-form__button--${ submitStyle }` }
						style={ submitButtonStyle }
					>
						{ submitLabel || __( 'Submit', 'sgs-blocks' ) }
					</button>
				</div>
				{ /* progressBarColour preview (2026-08-13) — render.php:230-241
					drives `--sgs-progress-colour` on `.sgs-form__progress`, but the
					real progress bar only renders once real sgs/form-step
					InnerBlocks children resolve their step list (Interactivity-API
					state, frontend only). A REPRESENTATIVE sample swatch — not the
					full stepped UI — is the honest editor-canvas equivalent, same
					pattern as this session's table-of-contents active-link preview. */ }
				{ progressBarColour && (
					<div
						className="sgs-form__progress-wrapper"
						style={ { marginTop: '12px' } }
					>
						<div className="sgs-form__progress">
							<div
								className="sgs-form__progress-bar"
								style={ { ...progressBarStyle, width: '40%' } }
							/>
						</div>
					</div>
				) }
			</div>
		</>
	);
}
