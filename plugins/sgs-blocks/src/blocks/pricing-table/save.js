import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function save( { attributes } ) {
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

	// Helper to generate colour CSS variable.
	const colourVar = ( slug ) =>
		slug ? `var(--wp--preset--color--${ slug })` : '';

	// Period labels.
	const periodLabels = {
		monthly: __( '/month', 'sgs-blocks' ),
		yearly: __( '/year', 'sgs-blocks' ),
		'one-off': '',
	};

	return (
		<div { ...blockProps }>
			<div className="sgs-pricing-table__grid">
				{ plans.map( ( plan, index ) => {
					const {
						name = '',
						price = '',
						period = 'monthly',
						features = [],
						ctaText = __( 'Get Started', 'sgs-blocks' ),
						ctaUrl = '',
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
										color: colourVar( popularBadgeColour ),
										backgroundColor: colourVar(
											popularBadgeBackground
										),
									} }
								>
									{ popularBadgeText ||
										__( 'Popular', 'sgs-blocks' ) }
								</div>
							) }

							<div className="sgs-pricing-table__header">
								<h3
									className="sgs-pricing-table__title"
									style={ {
										color: colourVar( titleColour ),
									} }
								>
									{ name }
								</h3>

								<div className="sgs-pricing-table__price-wrapper">
									<div
										className="sgs-pricing-table__price"
										style={ {
											color: colourVar( priceColour ),
										} }
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
											style={ {
												color: colourVar(
													featureColour
												),
											} }
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
												color: colourVar( ctaColour ),
												backgroundColor: colourVar(
													ctaBackground
												),
											} }
										>
											{ ctaText }
										</a>
									) : (
										<span
											className={ `sgs-pricing-table__cta sgs-pricing-table__cta--${ ctaStyle }` }
											style={ {
												color: colourVar( ctaColour ),
												backgroundColor: colourVar(
													ctaBackground
												),
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
}
