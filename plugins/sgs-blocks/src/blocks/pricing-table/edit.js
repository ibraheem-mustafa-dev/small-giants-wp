import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
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
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

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
		style,
		titleColour,
		priceColour,
		featureColour,
		ctaStyle,
		ctaColour,
		ctaBackground,
		popularBadgeText,
		popularBadgeColour,
		popularBadgeBackground,
	} = attributes;

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
		`sgs-pricing-table--columns-${ columns }`,
		`sgs-pricing-table--${ style }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

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
			<InspectorControls>
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<RangeControl
						label={ __( 'Columns', 'sgs-blocks' ) }
						value={ columns }
						onChange={ ( val ) =>
							setAttributes( { columns: val } )
						}
						min={ 2 }
						max={ 4 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Style', 'sgs-blocks' ) }
						value={ style }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { style: val } )
						}
						__nextHasNoMarginBottom
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
							/>
							<TextControl
								label={ __( 'Yearly label', 'sgs-blocks' ) }
								value={ billingToggleYearlyLabel }
								onChange={ ( val ) =>
									setAttributes( { billingToggleYearlyLabel: val } )
								}
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={ __( 'Toggle style', 'sgs-blocks' ) }
								value={ toggleStyle }
								options={ TOGGLE_STYLE_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { toggleStyle: val } )
								}
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Colours', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Title colour', 'sgs-blocks' ) }
						value={ titleColour }
						onChange={ ( val ) =>
							setAttributes( { titleColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Price colour', 'sgs-blocks' ) }
						value={ priceColour }
						onChange={ ( val ) =>
							setAttributes( { priceColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Feature colour', 'sgs-blocks' ) }
						value={ featureColour }
						onChange={ ( val ) =>
							setAttributes( { featureColour: val } )
						}
					/>
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
					/>
					<DesignTokenPicker
						label={ __( 'CTA text colour', 'sgs-blocks' ) }
						value={ ctaColour }
						onChange={ ( val ) =>
							setAttributes( { ctaColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'CTA background colour',
							'sgs-blocks'
						) }
						value={ ctaBackground }
						onChange={ ( val ) =>
							setAttributes( { ctaBackground: val } )
						}
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
					/>
					<DesignTokenPicker
						label={ __( 'Badge text colour', 'sgs-blocks' ) }
						value={ popularBadgeColour }
						onChange={ ( val ) =>
							setAttributes( {
								popularBadgeColour: val,
							} )
						}
					/>
					<DesignTokenPicker
						label={ __(
							'Badge background colour',
							'sgs-blocks'
						) }
						value={ popularBadgeBackground }
						onChange={ ( val ) =>
							setAttributes( {
								popularBadgeBackground: val,
							} )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
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
											color: colourVar(
												popularBadgeColour
											),
											backgroundColor: colourVar(
												popularBadgeBackground
											),
										} }
									>
										{ popularBadgeText }
									</div>
								) }

								{ plan.ribbonText && (
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
										tagName="h3"
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
										style={ {
											color:
												colourVar(
													titleColour
												) || undefined,
										} }
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
											style={ {
												color:
													colourVar(
														priceColour
													) || undefined,
											} }
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
													style={ {
														color:
															colourVar(
																priceColour
															) || undefined,
													} }
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
										/>
									</div>
								</div>

								{ /* Per-plan icon name control */ }
								<div className="sgs-pricing-table__plan-meta">
									<TextControl
										label={ __( 'Icon name (Lucide)', 'sgs-blocks' ) }
										value={ plan.iconName || '' }
										onChange={ ( val ) =>
											updatePlan( planIndex, 'iconName', val )
										}
										placeholder={ __( 'e.g. star, zap, shield-check', 'sgs-blocks' ) }
										help={ __( 'Any Lucide icon slug. Leave blank for no icon.', 'sgs-blocks' ) }
										__nextHasNoMarginBottom
									/>
									<TextControl
										label={ __( 'Ribbon text', 'sgs-blocks' ) }
										value={ plan.ribbonText || '' }
										onChange={ ( val ) =>
											updatePlan( planIndex, 'ribbonText', val )
										}
										placeholder={ __( 'e.g. Best value', 'sgs-blocks' ) }
										__nextHasNoMarginBottom
									/>
									{ plan.ribbonText && (
										<DesignTokenPicker
											label={ __( 'Ribbon colour', 'sgs-blocks' ) }
											value={ plan.ribbonColour || 'accent' }
											onChange={ ( val ) =>
												updatePlan( planIndex, 'ribbonColour', val )
											}
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
														color:
															colourVar(
																featureColour
															) || undefined,
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
									/>
									<TextControl
										label={ __(
											'CTA URL',
											'sgs-blocks'
										) }
										value={ plan.ctaUrl }
										onChange={ ( val ) =>
											updatePlan(
												planIndex,
												'ctaUrl',
												val
											)
										}
										type="url"
										__nextHasNoMarginBottom
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
