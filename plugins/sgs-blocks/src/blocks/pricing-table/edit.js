import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
	useSettings,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	TextControl,
	Button,
	ToggleControl,
	CheckboxControl,
} from '@wordpress/components';
import { Icon, plus, close } from '@wordpress/icons';
import { DesignTokenPicker, IconPicker, LinkPopoverField, SgsColourPanel, resolveColourToken,
	SgsBorderControl,
	TypographyControls,
	fillRow,
} from '../../components';
import { colourVar, resolveResponsiveTier, resolveTextColourPreviewStyle, resolveBackgroundPaintPreviewStyle } from '../../utils';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

// ⛔ `templateMode` (the container-family allowed-children preset) was
// declared in block.json but REMOVED (was never wired): this block has no
// InnerBlocks slot — every plan is a typed repeater ITEM inside the `plans`
// array attribute (arrayContentLift, block.json), edited via RichText/
// TextControl/IconPicker bound to array indices, not a child-block tree.
// There is no children roster to restrict. Do not re-add templateMode
// without first adding a genuine InnerBlocks slot.

const STYLE_OPTIONS = [
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
];

const PERIOD_OPTIONS = [
	{ label: __( 'Monthly', 'sgs-blocks' ), value: 'monthly' },
	{ label: __( 'Yearly', 'sgs-blocks' ), value: 'yearly' },
	{ label: __( 'One-off', 'sgs-blocks' ), value: 'one-off' },
];

const TOGGLE_STYLE_OPTIONS = [
	{ label: __( 'Text (bold + colour)', 'sgs-blocks' ), value: 'text' },
	{ label: __( 'Button (filled / outline)', 'sgs-blocks' ), value: 'button' },
];

/**
 * billingToggle enum options.
 * Backward-compat: legacy boolean true was equivalent to 'monthly-yearly'.
 */
const BILLING_TOGGLE_OPTIONS = [
	{ label: __( 'Monthly & Yearly (toggle)', 'sgs-blocks' ), value: 'monthly-yearly' },
	{ label: __( 'Monthly only', 'sgs-blocks' ), value: 'monthly-only' },
	{ label: __( 'Yearly only', 'sgs-blocks' ), value: 'yearly-only' },
	{ label: __( 'No toggle', 'sgs-blocks' ), value: 'none' },
];

// D649 — no JSON `enum` reliance in the UI list order; mirrors sgs/icon-list's
// allow-list exactly (render.php validates the same set independently).
const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'Heading 2', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'Heading 3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'Heading 4', 'sgs-blocks' ), value: 'h4' },
	{ label: __( 'Heading 5', 'sgs-blocks' ), value: 'h5' },
	{ label: __( 'Heading 6', 'sgs-blocks' ), value: 'h6' },
	{ label: __( 'Paragraph (not a heading)', 'sgs-blocks' ), value: 'p' },
];

const CTA_STYLE_OPTIONS = [
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Secondary', 'sgs-blocks' ), value: 'secondary' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
];

/**
 * Normalise a billingToggle value to the enum string.
 * Handles the legacy boolean → string migration.
 *
 * @param {*} raw Raw attribute value.
 * @return {string} Normalised enum string.
 */
function normaliseBillingToggle( raw ) {
	if ( raw === true || raw === 'true' ) {
		return 'monthly-yearly';
	}
	if ( raw === false || raw === 'false' ) {
		return 'none';
	}
	const valid = [ 'none', 'monthly-yearly', 'monthly-only', 'yearly-only' ];
	return valid.includes( raw ) ? raw : 'monthly-yearly';
}

/**
 * Normalise a single feature to the object shape.
 * Handles legacy string features.
 *
 * @param {*} f Raw feature value.
 * @return {{ text: string, included: boolean }} Normalised feature.
 */
function normaliseFeature( f ) {
	if ( typeof f === 'string' ) {
		return { text: f, included: true };
	}
	return {
		text: typeof f.text === 'string' ? f.text : '',
		included: typeof f.included === 'boolean' ? f.included : true,
	};
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		columns,
		billingToggle: billingToggleRaw,
		toggleStyle,
		billingToggleMonthlyLabel,
		billingToggleYearlyLabel,
		plans: plansRaw,
		pricingTableStyle: style,
		headingLevel,
		titleColour,
		titleColourGradient,
		priceColour,
		priceColourHover,
		priceColourGradient,
		featureColour,
		featureColourGradient,
		ctaStyle,
		ctaColour,
		ctaColourGradient,
		ctaBackground,
		ctaBackgroundGradient,
		popularBadgeText,
		popularBadgeColour,
		popularBadgeColourGradient,
		popularBadgeBackground,
		popularBadgeBackgroundGradient,
		toggleLabelHoverColour,
		toggleLabelHoverColourGradient,
		titleColourHover,
		featureColourHover,
		ctaColourHover,
		popularBadgeColourHover,
		ctaBackgroundHover,
		popularBadgeBackgroundHover,
	} = attributes;

	const [ palette ] = useSettings( 'color.palette' );

	// columns is a TIER OBJECT (Spec 35 pass 4) — this block only ever
	// exposes/uses the desktop tier (no per-device columns UI exists), so
	// resolve it rather than reading the raw object, or the className/preview
	// would render "sgs-pricing-table--columns-[object Object]" and a raw
	// setAttributes({ columns: val }) would coerce the whole object-typed
	// attr to its default (D563 bug class).
	const columnsDesktop = resolveResponsiveTier( columns, 'desktop' )?.value || 3;
	const setColumnsDesktop = ( val ) =>
		setAttributes( { columns: { ...( columns && typeof columns === 'object' ? columns : {} ), desktop: val } } );

	// Normalise values from any legacy state.
	const billingToggle = normaliseBillingToggle( billingToggleRaw );
	const showToggle = billingToggle === 'monthly-yearly';

	// Normalise plans so features are always objects.
	const plans = ( plansRaw || [] ).map( ( plan ) => ( {
		...plan,
		features: ( plan.features || [] ).map( normaliseFeature ),
	} ) );

	const className = [
		'sgs-pricing-table',
		`sgs-pricing-table--columns-${ columnsDesktop }`,
		`sgs-pricing-table--${ style }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	// D649 — heading level is an identity control (document-outline
	// placement), not a style control; mirrors render.php's own fallback.
	const HeadingTag = headingLevel || 'h3';

	const updatePlan = ( index, key, value ) => {
		const newPlans = [ ...plans ];
		newPlans[ index ] = { ...newPlans[ index ], [ key ]: value };
		setAttributes( { plans: newPlans } );
	};

	const updatePlanFeature = ( planIndex, featureIndex, key, value ) => {
		const newPlans = [ ...plans ];
		const newFeatures = [ ...newPlans[ planIndex ].features ];
		newFeatures[ featureIndex ] = { ...newFeatures[ featureIndex ], [ key ]: value };
		newPlans[ planIndex ] = {
			...newPlans[ planIndex ],
			features: newFeatures,
		};
		setAttributes( { plans: newPlans } );
	};

	const addFeature = ( planIndex ) => {
		const newPlans = [ ...plans ];
		newPlans[ planIndex ] = {
			...newPlans[ planIndex ],
			features: [
				...newPlans[ planIndex ].features,
				{ text: '', included: true },
			],
		};
		setAttributes( { plans: newPlans } );
	};

	const removeFeature = ( planIndex, featureIndex ) => {
		const newPlans = [ ...plans ];
		newPlans[ planIndex ] = {
			...newPlans[ planIndex ],
			features: newPlans[ planIndex ].features.filter( ( _, i ) => i !== featureIndex ),
		};
		setAttributes( { plans: newPlans } );
	};

	const addPlan = () => {
		setAttributes( {
			plans: [
				...plans,
				{
					name: __( 'New Plan', 'sgs-blocks' ),
					price: '£0.00',
					priceYearly: '',
					period: 'monthly',
					description: '',
					features: [ { text: __( 'Feature 1', 'sgs-blocks' ), included: true } ],
					ctaText: __( 'Get Started', 'sgs-blocks' ),
					ctaUrl: '',
					ctaTarget: '_self',
					ctaRel: '',
					highlighted: false,
					iconName: '',
					ribbonText: '',
					ribbonColour: 'accent',
					savingsBadgeText: '',
				},
			],
		} );
	};

	const removePlan = ( index ) => {
		setAttributes( {
			plans: plans.filter( ( _, i ) => i !== index ),
		} );
	};

	return (
		<>
			{ /* D619 — ONE grouped, SGS-OWNED colour panel (own PanelBody, default
			   InspectorControls group), rendered FIRST. All 7 original colour attrs
			   on this block are BLOCK-LEVEL (uniform across every plan/tier,
			   confirmed via render.php's "BLOCK-LEVEL — emitted once as a scoped
			   rule" comments) and single-state — no hover attribute existed for
			   any of them (ctaStyle's `:hover` rules in style.css are static
			   CSS-preset selectors keyed on the class, not an attribute-driven
			   colour state). `toggleLabelHoverColour` below is the one genuine
			   hover-only exception — it replaces a previously hardcoded
			   `color-mix()` hover tint on the billing-toggle label with no
			   backing attribute (mirrors business-info's hover-only rows).
			   Replaces the DesignTokenPicker rows previously scattered across the
			   Colours/CTA Button/Popular Badge panels below. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'price',
						label: __( 'Price colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: priceColour,
								onChange: ( val ) => setAttributes( { priceColour: val ?? '' } ),
								linked: true,
								gradientValue: priceColourGradient,
								onGradientChange: ( val ) => setAttributes( { priceColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: priceColourHover,
								onChange: ( val ) => setAttributes( { priceColourHover: val ?? '' } ),
								linked: true,
								},
						],
					},
					{
						key: 'feature',
						label: __( 'Feature colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: featureColour,
								onChange: ( val ) => setAttributes( { featureColour: val ?? '' } ),
								linked: true,
								gradientValue: featureColourGradient,
								onGradientChange: ( val ) => setAttributes( { featureColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: featureColourHover,
								onChange: ( val ) => setAttributes( { featureColourHover: val ?? '' } ),
								linked: true,
								},
						],
					},
					{
						key: 'toggle-label-hover',
						label: __( 'Billing toggle label hover colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: toggleLabelHoverColour,
								onChange: ( val ) => setAttributes( { toggleLabelHoverColour: val ?? '' } ),
								linked: true,
								gradientValue: toggleLabelHoverColourGradient,
								onGradientChange: ( val ) => setAttributes( { toggleLabelHoverColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<RangeControl
						label={ __( 'Columns', 'sgs-blocks' ) }
						value={ columnsDesktop }
						onChange={ setColumnsDesktop }
						min={ 2 }
						max={ 4 }
						step={ 1 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Style', 'sgs-blocks' ) }
						value={ style }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { pricingTableStyle: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Billing toggle', 'sgs-blocks' ) }
						value={ billingToggle }
						options={ BILLING_TOGGLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { billingToggle: val } )
						}
						help={ __( 'Controls whether a monthly/yearly switcher appears and which prices show.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ showToggle && (
						<>
							<TextControl
								label={ __( 'Monthly label', 'sgs-blocks' ) }
								value={ billingToggleMonthlyLabel }
								onChange={ ( val ) =>
									setAttributes( { billingToggleMonthlyLabel: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<TextControl
								label={ __( 'Yearly label', 'sgs-blocks' ) }
								value={ billingToggleYearlyLabel }
								onChange={ ( val ) =>
									setAttributes( { billingToggleYearlyLabel: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<SelectControl
								label={ __( 'Toggle style', 'sgs-blocks' ) }
								value={ toggleStyle }
								options={ TOGGLE_STYLE_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { toggleStyle: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'CTA Button', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'CTA style', 'sgs-blocks' ) }
						value={ ctaStyle }
						options={ CTA_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { ctaStyle: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* Moved in from the shared SgsColourPanel (D622 — an
					     element-scoped colour belongs in its own element's
					     TIER 1 panel; "cta button" is a declared element whose
					     attrMap claims ctaColour/ctaBackground). */ }
					<DesignTokenPicker
						label={ __( 'CTA text colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: ctaColour,
								onChange: ( val ) => setAttributes( { ctaColour: val ?? '' } ),
								linked: true,
								gradientValue: ctaColourGradient,
								onGradientChange: ( val ) => setAttributes( { ctaColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: ctaColourHover,
								onChange: ( val ) => setAttributes( { ctaColourHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'CTA background colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: ctaBackground,
								onChange: ( val ) => setAttributes( { ctaBackground: val ?? '' } ),
								linked: true,
								gradientValue: ctaBackgroundGradient,
								onGradientChange: ( val ) => setAttributes( { ctaBackgroundGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: ctaBackgroundHover,
								onChange: ( val ) => setAttributes( { ctaBackgroundHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
				</PanelBody>

				{ /* Container wrapper (WS-4 mirror) */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="layout"
				/>

				<PanelBody
					title={ __( 'Popular Badge', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Badge text', 'sgs-blocks' ) }
						value={ popularBadgeText }
						onChange={ ( val ) =>
							setAttributes( { popularBadgeText: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* Moved in from the shared SgsColourPanel (D622); "popular
					     badge" is a declared element whose attrMap claims
					     popularBadgeColour/popularBadgeBackground. */ }
					<DesignTokenPicker
						label={ __( 'Popular badge text colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: popularBadgeColour,
								onChange: ( val ) => setAttributes( { popularBadgeColour: val ?? '' } ),
								linked: true,
								gradientValue: popularBadgeColourGradient,
								onGradientChange: ( val ) => setAttributes( { popularBadgeColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: popularBadgeColourHover,
								onChange: ( val ) => setAttributes( { popularBadgeColourHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Popular badge background colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: popularBadgeBackground,
								onChange: ( val ) => setAttributes( { popularBadgeBackground: val ?? '' } ),
								linked: true,
								gradientValue: popularBadgeBackgroundGradient,
								onGradientChange: ( val ) => setAttributes( { popularBadgeBackgroundGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: popularBadgeBackgroundHover,
								onChange: ( val ) => setAttributes( { popularBadgeBackgroundHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Pricing Table Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Heading level', 'sgs-blocks' ) }
						value={ headingLevel || 'h3' }
						options={ HEADING_LEVEL_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { headingLevel: val } )
						}
						help={ __(
							'Pick the level that fits your page outline — usually H3 under a page-level H2.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* Moved in from the shared SgsColourPanel (D622); "plan
					     name" is a declared element whose attrMap claims
					     titleColour. */ }
					<DesignTokenPicker
						label={ __( 'Title colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: titleColour,
								onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
								linked: true,
								gradientValue: titleColourGradient,
								onGradientChange: ( val ) => setAttributes( { titleColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: titleColourHover,
								onChange: ( val ) => setAttributes( { titleColourHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
				</PanelBody>
				{ /* Typography — replaces the old WP-native supports.typography (fontSize/
				   lineHeight only, mis-scoped onto the block root) with the shared
				   TypographyControls component + sgs_typography_css_rule() render.php helper
				   (D971/D972 full-replacement track). Prefix "title" — the native support this
				   panel replaces always rendered onto `.sgs-pricing-table__name`
				   (block.json `selectors.typography`), the "title" element, not the wrapper. */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="title"
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
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ showToggle && (
					<div
						className={ `sgs-pricing-table__billing-toggle sgs-pricing-table__billing-toggle--style-${ toggleStyle }` }
						role="group"
						aria-label={ __( 'Billing period', 'sgs-blocks' ) }
					>
						<span className="sgs-pricing-table__toggle-label">
							{ billingToggleMonthlyLabel }
						</span>
						<span className="sgs-pricing-table__toggle-label">
							{ billingToggleYearlyLabel }
						</span>
						<span
							className="sgs-pricing-table__toggle-track"
							aria-hidden="true"
						/>
					</div>
				) }
				<div className="sgs-pricing-table__grid">
					{ plans.map( ( plan, planIndex ) => {
						const planClass = [
							'sgs-pricing-table__plan',
							plan.highlighted &&
								'sgs-pricing-table__plan--highlighted',
						]
							.filter( Boolean )
							.join( ' ' );

						return (
							<div key={ planIndex } className={ planClass }>
								{ plan.highlighted && (
									<div
										className="sgs-pricing-table__badge"
										style={ {
											...resolveTextColourPreviewStyle(
												popularBadgeColour,
												popularBadgeColourGradient,
												colourVar
											),
											...resolveBackgroundPaintPreviewStyle(
												popularBadgeBackground,
												popularBadgeBackgroundGradient
											),
										} }
									>
										{ popularBadgeText }
									</div>
								) }

								{ /* Single-choice marker semantics — mirrors render.php: the
									 badge (highlighted) and ribbon (ribbonText) both render
									 top-right on the card, so showing both at once looks like
									 two "popular" labels stacked on the same plan. Badge wins;
									 the ribbon is suppressed while highlighted is on. */ }
								{ plan.ribbonText && ! plan.highlighted && (
									<div
										className="sgs-pricing-table__ribbon"
										style={ {
											backgroundColor: colourVar(
												plan.ribbonColour || 'accent'
											),
										} }
									>
										{ plan.ribbonText }
									</div>
								) }

								<div className="sgs-pricing-table__header">
									<RichText
										tagName={ HeadingTag }
										className="sgs-pricing-table__name"
										value={ plan.name }
										onChange={ ( val ) =>
											updatePlan(
												planIndex,
												'name',
												val
											)
										}
										placeholder={ __(
											'Plan name…',
											'sgs-blocks'
										) }
										style={ resolveTextColourPreviewStyle(
											titleColour,
											titleColourGradient,
											colourVar
										) }
									/>
									<div className="sgs-pricing-table__price-wrapper">
										<RichText
											tagName="div"
											className="sgs-pricing-table__price sgs-pricing-table__price--monthly"
											value={ plan.price }
											onChange={ ( val ) =>
												updatePlan(
													planIndex,
													'price',
													val
												)
											}
											placeholder={ __(
												'£0 /mo',
												'sgs-blocks'
											) }
											style={ resolveTextColourPreviewStyle(
												priceColour,
												priceColourGradient,
												colourVar
											) }
										/>
										{ billingToggle !== 'none' && billingToggle !== 'monthly-only' && (
											<>
												<RichText
													tagName="div"
													className="sgs-pricing-table__price sgs-pricing-table__price--yearly"
													value={ plan.priceYearly || '' }
													onChange={ ( val ) =>
														updatePlan(
															planIndex,
															'priceYearly',
															val
														)
													}
													placeholder={ __(
														'£0 /yr',
														'sgs-blocks'
													) }
													style={ resolveTextColourPreviewStyle(
														priceColour,
														priceColourGradient,
														colourVar
													) }
												/>
												<TextControl
													label={ __( 'Savings badge (yearly)', 'sgs-blocks' ) }
													value={ plan.savingsBadgeText || '' }
													onChange={ ( val ) =>
														updatePlan(
															planIndex,
															'savingsBadgeText',
															val
														)
													}
													placeholder={ __( 'e.g. Save 20%', 'sgs-blocks' ) }
													__nextHasNoMarginBottom
													__next40pxDefaultSize
												/>
											</>
										) }
										<SelectControl
											value={ plan.period }
											options={ PERIOD_OPTIONS }
											onChange={ ( val ) =>
												updatePlan(
													planIndex,
													'period',
													val
												)
											}
											__nextHasNoMarginBottom
											__next40pxDefaultSize
										/>
									</div>
								</div>

								{ /* Per-plan icon control */ }
								<div className="sgs-pricing-table__plan-meta">
									<IconPicker
										label={ __( 'Plan icon (optional)', 'sgs-blocks' ) }
										value={ { source: 'lucide', name: plan.iconName || '' } }
										onChange={ ( { name } ) =>
											updatePlan( planIndex, 'iconName', name )
										}
										sources={ [ 'lucide' ] }
									/>
									<TextControl
										label={ __( 'Ribbon text', 'sgs-blocks' ) }
										value={ plan.ribbonText || '' }
										onChange={ ( val ) =>
											updatePlan( planIndex, 'ribbonText', val )
										}
										placeholder={ __( 'e.g. Best value', 'sgs-blocks' ) }
										help={
											plan.highlighted
												? __( 'Hidden while "Highlight this plan" is on — the popular badge already marks this card.', 'sgs-blocks' )
												: undefined
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ plan.ribbonText && (
										<SgsColourPanel
											rows={ [
												fillRow( {
													key: 'plan-ribbon-colour',
													label: __( 'Ribbon colour', 'sgs-blocks' ),
													get: () => plan.ribbonColour || 'accent',
													set: ( val ) =>
												updatePlan( planIndex, 'ribbonColour', val ),
												} ),
											] }
										/>
									) }
								</div>

								<ul className="sgs-pricing-table__features">
									{ plan.features.map(
										( feature, featureIndex ) => (
											<li
												key={ featureIndex }
												className={ [
													'sgs-pricing-table__feature',
													feature.included
														? 'sgs-pricing-table__feature--included'
														: 'sgs-pricing-table__feature--excluded',
												].join( ' ' ) }
											>
												<CheckboxControl
													label={ __( 'Included', 'sgs-blocks' ) }
													checked={ feature.included }
													onChange={ ( val ) =>
														updatePlanFeature(
															planIndex,
															featureIndex,
															'included',
															val
														)
													}
													__nextHasNoMarginBottom
												/>
												<RichText
													tagName="span"
													value={ feature.text }
													onChange={ ( val ) =>
														updatePlanFeature(
															planIndex,
															featureIndex,
															'text',
															val
														)
													}
													placeholder={ __(
														'Feature…',
														'sgs-blocks'
													) }
													style={ {
														...resolveTextColourPreviewStyle(
															featureColour,
															featureColourGradient,
															colourVar
														),
														opacity: feature.included ? 1 : 0.5,
													} }
												/>
												<Button
													icon={ close }
													label={ __(
														'Remove feature',
														'sgs-blocks'
													) }
													onClick={ () =>
														removeFeature(
															planIndex,
															featureIndex
														)
													}
													className="sgs-pricing-table__remove-feature"
													isSmall
												/>
											</li>
										)
									) }
								</ul>

								<Button
									icon={ plus }
									onClick={ () =>
										addFeature( planIndex )
									}
									className="sgs-pricing-table__add-feature"
									variant="secondary"
									isSmall
								>
									{ __( 'Add feature', 'sgs-blocks' ) }
								</Button>

								<div className="sgs-pricing-table__footer">
									<TextControl
										label={ __(
											'CTA Text',
											'sgs-blocks'
										) }
										value={ plan.ctaText }
										onChange={ ( val ) =>
											updatePlan(
												planIndex,
												'ctaText',
												val
											)
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									{ /* Spec 35 §2 LINK standard — replaces the superseded
									   inline `SgsLinkControl` mount. `plan.ctaTarget` is a
									   boolean-shaped enum ('_self'/'_blank' only per
									   block.json), so targetMode="boolean" matches the
									   declared schema exactly. */ }
									<LinkPopoverField
										label={ __(
											'CTA link',
											'sgs-blocks'
										) }
										value={ {
											url: plan.ctaUrl || '',
											linkTarget: plan.ctaTarget || '_self',
											rel: plan.ctaRel || '',
										} }
										targetMode="boolean"
										onChange={ ( next ) => {
											const newPlans = [ ...plans ];
											const patch = { ...newPlans[ planIndex ] };
											if ( undefined !== next.url ) patch.ctaUrl = next.url;
											if ( undefined !== next.linkTarget ) patch.ctaTarget = next.linkTarget;
											if ( undefined !== next.rel ) patch.ctaRel = next.rel;
											newPlans[ planIndex ] = patch;
											setAttributes( { plans: newPlans } );
										} }
									/>
									<ToggleControl
										label={ __(
											'Highlight this plan',
											'sgs-blocks'
										) }
										checked={ plan.highlighted }
										onChange={ ( val ) =>
											updatePlan(
												planIndex,
												'highlighted',
												val
											)
										}
										__nextHasNoMarginBottom
									/>
								</div>

								{ /* render.php only emits the CTA when $plan_cta_text is
								     non-empty (empty string is a real "no CTA" state --
								     an unset ctaText defaults to "Get started" via `??`,
								     but an explicitly-emptied one stays hidden). Mirror
								     that gate rather than always rendering a placeholder.
								     ctaColour previews via resolveColourToken() (palette
								     lookup, not slug-only colourVar()) since its picker
								     can store a raw CSS value.
								     ctaColourGradient (D956) previews via the shared
								     resolveTextColourPreviewStyle() -- byte-identical to
								     the old flat-only style for an unset gradient.
								     ctaBackground/ctaBackgroundGradient preview via the
								     shared resolveBackgroundPaintPreviewStyle() (colourVar-
								     based, matching the popular-badge background preview
								     above) -- gradient wins when set+valid, same precedence
								     as render.php's sgs_background_paint_decl(). */ }
								{ '' !== ( plan.ctaText ?? __( 'Get started', 'sgs-blocks' ) ) && (
								<div
									className={ `sgs-pricing-table__cta sgs-pricing-table__cta--${ ctaStyle }` }
									style={ {
										...resolveTextColourPreviewStyle(
											ctaColour,
											ctaColourGradient,
											( v ) => resolveColourToken( v, palette )
										),
										...resolveBackgroundPaintPreviewStyle(
											ctaBackground,
											ctaBackgroundGradient
										),
									} }
								>
									{ plan.ctaText ||
										__( 'Get started', 'sgs-blocks' ) }
								</div>
								) }

								<Button
									icon={ close }
									label={ __(
										'Remove plan',
										'sgs-blocks'
									) }
									onClick={ () =>
										removePlan( planIndex )
									}
									className="sgs-pricing-table__remove-plan"
									isDestructive
									variant="secondary"
									isSmall
								>
									{ __( 'Remove plan', 'sgs-blocks' ) }
								</Button>
							</div>
						);
					} ) }
				</div>

				<Button
					icon={ plus }
					onClick={ addPlan }
					variant="primary"
					className="sgs-pricing-table__add-plan"
				>
					{ __( 'Add plan', 'sgs-blocks' ) }
				</Button>
			</div>
		</>
	);
}
