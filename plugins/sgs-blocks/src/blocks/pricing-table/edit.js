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
} from '@wordpress/components';
import { Icon, plus, close } from '@wordpress/icons';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

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

const CTA_STYLE_OPTIONS = [
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Secondary', 'sgs-blocks' ), value: 'secondary' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		columns,
		plans,
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

	const updatePlanFeature = ( planIndex, featureIndex, value ) => {
		const newPlans = [ ...plans ];
		const newFeatures = [ ...newPlans[ planIndex ].features ];
		newFeatures[ featureIndex ] = value;
		newPlans[ planIndex ] = {
			...newPlans[ planIndex ],
			features: newFeatures,
		};
		setAttributes( { plans: newPlans } );
	};

	const addFeature = ( planIndex ) => {
		const newPlans = [ ...plans ];
		newPlans[ planIndex ].features = [
			...newPlans[ planIndex ].features,
			'',
		];
		setAttributes( { plans: newPlans } );
	};

	const removeFeature = ( planIndex, featureIndex ) => {
		const newPlans = [ ...plans ];
		newPlans[ planIndex ].features = newPlans[
			planIndex
		].features.filter( ( _, i ) => i !== featureIndex );
		setAttributes( { plans: newPlans } );
	};

	const addPlan = () => {
		setAttributes( {
			plans: [
				...plans,
				{
					name: __( 'New Plan', 'sgs-blocks' ),
					price: '£0.00',
					period: 'monthly',
					features: [ __( 'Feature 1', 'sgs-blocks' ) ],
					ctaText: __( 'Get Started', 'sgs-blocks' ),
					ctaUrl: '',
					highlighted: false,
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

								<div className="sgs-pricing-table__header">
									<RichText
										tagName="h3"
										className="sgs-pricing-table__title"
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
											className="sgs-pricing-table__price"
											value={ plan.price }
											onChange={ ( val ) =>
												updatePlan(
													planIndex,
													'price',
													val
												)
											}
											placeholder={ __(
												'£0.00',
												'sgs-blocks'
											) }
											style={ {
												color:
													colourVar(
														priceColour
													) || undefined,
											} }
										/>
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

								<ul className="sgs-pricing-table__features">
									{ plan.features.map(
										( feature, featureIndex ) => (
											<li
												key={ featureIndex }
												className="sgs-pricing-table__feature"
											>
												<RichText
													tagName="span"
													value={ feature }
													onChange={ ( val ) =>
														updatePlanFeature(
															planIndex,
															featureIndex,
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
