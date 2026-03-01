/**
 * Pricing Table block — deprecations.
 *
 * v2: Captures the static save output (current attribute structure: style, plan.name,
 *     plan.highlighted) before the block was converted to server-side rendering.
 * v1: Original structure — cardStyle, plan.title, plan.isPopular, highlightedPlan.
 *     Migrated to the current attribute shape.
 */
import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

// v2 — static save function that existed before render.php conversion.
const v2 = {
	attributes: {
		columns:               { type: 'number', default: 3 },
		plans:                 { type: 'array', default: [] },
		style:                 { type: 'string', default: 'card' },
		titleColour:           { type: 'string' },
		priceColour:           { type: 'string' },
		featureColour:         { type: 'string' },
		ctaStyle:              { type: 'string', default: 'accent' },
		ctaColour:             { type: 'string' },
		ctaBackground:         { type: 'string' },
		popularBadgeText:      { type: 'string', default: 'Popular' },
		popularBadgeColour:    { type: 'string', default: 'white' },
		popularBadgeBackground: { type: 'string', default: 'accent' },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: true, text: true },
		typography: { fontSize: true, lineHeight: true },
		spacing: { margin: true, padding: true, blockGap: true },
	},
	save( { attributes } ) {
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

		const blockProps = useBlockProps.save( { className } );

		const colourVar = ( slug ) =>
			slug ? `var(--wp--preset--color--${ slug })` : '';

		const periodLabels = {
			monthly:  __( '/month', 'sgs-blocks' ),
			yearly:   __( '/year', 'sgs-blocks' ),
			'one-off': '',
		};

		return (
			<div { ...blockProps }>
				<div className="sgs-pricing-table__grid">
					{ plans.map( ( plan, index ) => {
						const {
							name        = '',
							price       = '',
							period      = 'monthly',
							features    = [],
							ctaText     = __( 'Get Started', 'sgs-blocks' ),
							ctaUrl      = '',
							highlighted = false,
						} = plan;

						const planClass = [
							'sgs-pricing-table__plan',
							highlighted && 'sgs-pricing-table__plan--highlighted',
						]
							.filter( Boolean )
							.join( ' ' );

						return (
							<div key={ index } className={ planClass }>
								{ highlighted && (
									<div
										className="sgs-pricing-table__badge"
										style={ {
											color:           colourVar( popularBadgeColour ),
											backgroundColor: colourVar( popularBadgeBackground ),
										} }
									>
										{ popularBadgeText || __( 'Popular', 'sgs-blocks' ) }
									</div>
								) }
								<div className="sgs-pricing-table__header">
									<h3
										className="sgs-pricing-table__title"
										style={ { color: colourVar( titleColour ) } }
									>
										{ name }
									</h3>
									<div className="sgs-pricing-table__price-wrapper">
										<div
											className="sgs-pricing-table__price"
											style={ { color: colourVar( priceColour ) } }
										>
											{ price }
										</div>
										{ periodLabels[ period ] && (
											<div className="sgs-pricing-table__period">
												{ periodLabels[ period ] }
											</div>
										) }
									</div>
								</div>
								{ features.length > 0 && (
									<ul className="sgs-pricing-table__features">
										{ features.map( ( feature, fIndex ) => (
											<li
												key={ fIndex }
												className="sgs-pricing-table__feature"
												style={ { color: colourVar( featureColour ) } }
											>
												{ feature }
											</li>
										) ) }
									</ul>
								) }
								{ ctaText && (
									<>
										{ ctaUrl ? (
											<a
												href={ ctaUrl }
												className={ `sgs-pricing-table__cta sgs-pricing-table__cta--${ ctaStyle }` }
												style={ {
													color:           colourVar( ctaColour ),
													backgroundColor: colourVar( ctaBackground ),
												} }
											>
												{ ctaText }
											</a>
										) : (
											<span
												className={ `sgs-pricing-table__cta sgs-pricing-table__cta--${ ctaStyle }` }
												style={ {
													color:           colourVar( ctaColour ),
													backgroundColor: colourVar( ctaBackground ),
												} }
											>
												{ ctaText }
											</span>
										) }
									</>
								) }
							</div>
						);
					} ) }
				</div>
			</div>
		);
	},
	migrate( attributes ) {
		return attributes;
	},
};

// v1 — original attribute structure with cardStyle, plan.title, plan.isPopular.
const v1 = {
	attributes: {
		columns:               { type: 'number', default: 3 },
		plans:                 { type: 'array', default: [] },
		highlightedPlan:       { type: 'number', default: 1 },
		cardStyle:             { type: 'string', default: 'elevated' },
		titleColour:           { type: 'string' },
		priceColour:           { type: 'string' },
		featureColour:         { type: 'string' },
		ctaStyle:              { type: 'string', default: 'accent' },
		ctaColour:             { type: 'string' },
		ctaBackground:         { type: 'string' },
		popularBadgeText:      { type: 'string', default: 'Popular' },
		popularBadgeColour:    { type: 'string', default: 'white' },
		popularBadgeBackground: { type: 'string', default: 'accent' },
	},
	migrate( attributes ) {
		const { cardStyle, highlightedPlan, plans, ...rest } = attributes;

		let newStyle = cardStyle;
		if ( cardStyle === 'elevated' || cardStyle === 'filled' ) {
			newStyle = 'card';
		}

		const newPlans = plans.map( ( plan, index ) => {
			const { title, isPopular, ...planRest } = plan;
			let highlighted = false;
			if ( typeof isPopular !== 'undefined' ) {
				highlighted = isPopular;
			} else if ( index === highlightedPlan ) {
				highlighted = true;
			}
			return { ...planRest, name: title || planRest.name || '', highlighted };
		} );

		return { ...rest, style: newStyle, plans: newPlans };
	},
	save( { attributes } ) {
		const {
			columns,
			plans,
			cardStyle,
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
			`sgs-pricing-table--${ cardStyle }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );
		const colourVar  = ( slug ) => ( slug ? `var(--wp--preset--color--${ slug })` : '' );
		const periodLabels = {
			monthly:  __( '/month', 'sgs-blocks' ),
			yearly:   __( '/year', 'sgs-blocks' ),
			'one-off': '',
		};

		return (
			<div { ...blockProps }>
				<div className="sgs-pricing-table__grid">
					{ plans.map( ( plan, index ) => {
						const {
							title    = '',
							price    = '',
							period   = 'monthly',
							features = [],
							ctaText  = __( 'Get Started', 'sgs-blocks' ),
							ctaUrl   = '',
							isPopular = false,
						} = plan;

						const planClass = [
							'sgs-pricing-table__plan',
							isPopular && 'sgs-pricing-table__plan--popular',
						]
							.filter( Boolean )
							.join( ' ' );

						return (
							<div key={ index } className={ planClass }>
								{ isPopular && (
									<div
										className="sgs-pricing-table__badge"
										style={ {
											color:           colourVar( popularBadgeColour ),
											backgroundColor: colourVar( popularBadgeBackground ),
										} }
									>
										{ popularBadgeText || __( 'Popular', 'sgs-blocks' ) }
									</div>
								) }
								<div className="sgs-pricing-table__header">
									<h3 className="sgs-pricing-table__title" style={ { color: colourVar( titleColour ) } }>
										{ title }
									</h3>
									<div className="sgs-pricing-table__price-wrapper">
										<div className="sgs-pricing-table__price" style={ { color: colourVar( priceColour ) } }>
											{ price }
										</div>
										{ periodLabels[ period ] && (
											<div className="sgs-pricing-table__period">{ periodLabels[ period ] }</div>
										) }
									</div>
								</div>
								{ features.length > 0 && (
									<ul className="sgs-pricing-table__features">
										{ features.map( ( feature, fIndex ) => (
											<li key={ fIndex } className="sgs-pricing-table__feature" style={ { color: colourVar( featureColour ) } }>
												{ feature }
											</li>
										) ) }
									</ul>
								) }
								{ ctaText && (
									<>
										{ ctaUrl ? (
											<a
												href={ ctaUrl }
												className={ `sgs-pricing-table__cta sgs-pricing-table__cta--${ ctaStyle }` }
												style={ { color: colourVar( ctaColour ), backgroundColor: colourVar( ctaBackground ) } }
											>
												{ ctaText }
											</a>
										) : (
											<span
												className={ `sgs-pricing-table__cta sgs-pricing-table__cta--${ ctaStyle }` }
												style={ { color: colourVar( ctaColour ), backgroundColor: colourVar( ctaBackground ) } }
											>
												{ ctaText }
											</span>
										) }
									</>
								) }
							</div>
						);
					} ) }
				</div>
			</div>
		);
	},
};

export default [ v2, v1 ];
