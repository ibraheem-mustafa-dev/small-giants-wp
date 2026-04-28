import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

function isNumeric( val ) {
	if ( ! val ) return false;
	const cleaned = val.replace( /[,\s]/g, '' );
	return ! isNaN( cleaned ) && cleaned.length > 0;
}

function parseDisplayNumber( val ) {
	return parseInt( val.replace( /[,\s]/g, '' ), 10 );
}

/**
 * V2 — Save before showItemIcons / dividers attributes were added.
 * No icon slot, no divider class.
 */
const v2 = {
	attributes: {
		items: {
			type: 'array',
			default: [
				{ value: '5,000', suffix: '+', label: 'Businesses Served', animated: true },
				{ value: '60', suffix: '+', label: 'Years Experience', animated: true },
				{ value: 'Next-Day', suffix: '', label: 'Delivery Available', animated: false },
			],
		},
		animated: { type: 'boolean', default: true },
		valueColour: { type: 'string' },
		labelColour: { type: 'string' },
		labelFontSize: { type: 'string' },
		labelFontSizeTablet: { type: 'string', default: '' },
		labelFontSizeMobile: { type: 'string', default: '' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour: { type: 'string', default: '' },
		hoverBorderColour: { type: 'string', default: '' },
		hoverEffect: { type: 'string', default: 'none' },
		transitionDuration: { type: 'string', default: '300' },
		transitionEasing: { type: 'string', default: 'ease-in-out' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true, gradients: true },
		typography: {
			fontSize: true,
			lineHeight: true,
			textAlign: true,
			letterSpacing: true,
			textTransform: true,
			fontWeight: true,
			fontStyle: true,
		},
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width: true,
			color: true,
			style: true,
		},
	},
	save( { attributes } ) {
		const {
			items,
			animated,
			valueColour,
			labelColour,
			labelFontSize,
			labelFontSizeTablet,
			labelFontSizeMobile,
			hoverBackgroundColour,
			hoverTextColour,
			hoverBorderColour,
			transitionDuration,
			transitionEasing,
		} = attributes;

		const wrapperStyle = {
			'--sgs-hover-bg': hoverBackgroundColour ? colourVar( hoverBackgroundColour ) : undefined,
			'--sgs-hover-text': hoverTextColour ? colourVar( hoverTextColour ) : undefined,
			'--sgs-hover-border': hoverBorderColour ? colourVar( hoverBorderColour ) : undefined,
			'--sgs-transition-duration': transitionDuration ? `${ transitionDuration }ms` : undefined,
			'--sgs-transition-easing': transitionEasing || undefined,
		};

		const responsiveDataAttrs = {};
		if ( labelFontSizeTablet ) {
			responsiveDataAttrs[ 'data-label-fs-tablet' ] = labelFontSizeTablet;
		}
		if ( labelFontSizeMobile ) {
			responsiveDataAttrs[ 'data-label-fs-mobile' ] = labelFontSizeMobile;
		}

		const blockProps = useBlockProps.save( {
			className: 'sgs-trust-bar',
			style: wrapperStyle,
			...responsiveDataAttrs,
		} );

		const valueStyle = { color: colourVar( valueColour ) || undefined };
		const labelStyle = {
			color: colourVar( labelColour ) || undefined,
			fontSize: fontSizeVar( labelFontSize ) || undefined,
		};

		return (
			<div { ...blockProps }>
				{ items.map( ( item, index ) => {
					const shouldAnimate =
						animated && item.animated !== false && isNumeric( item.value );
					const dataAttrs = {};
					if ( shouldAnimate ) {
						dataAttrs[ 'data-target' ] = parseDisplayNumber( item.value );
						dataAttrs[ 'data-separator' ] = 'true';
						if ( item.suffix ) {
							dataAttrs[ 'data-suffix' ] = item.suffix;
						}
					}
					return (
						<div key={ index } className="sgs-trust-bar__item">
							<span className="sgs-sr-only">
								{ item.value }{ item.suffix } { item.label }
							</span>
							<span
								className="sgs-trust-bar__value"
								style={ valueStyle }
								aria-hidden="true"
								{ ...dataAttrs }
							>
								{ item.value }{ item.suffix }
							</span>
							<span
								className="sgs-trust-bar__label"
								style={ labelStyle }
								aria-hidden="true"
							>
								{ item.label }
							</span>
						</div>
					);
				} ) }
			</div>
		);
	},
	migrate( attributes ) {
		return {
			...attributes,
			showItemIcons: false,
			dividers: false,
			items: ( attributes.items || [] ).map( ( item ) => ( { ...item, icon: '' } ) ),
		};
	},
};

/**
 * V1 — Initial version: save returned null (blocks created via WP-CLI
 * have empty innerHTML).
 */
const v1 = {
	attributes: {
		items: {
			type: 'array',
			default: [
				{ value: '5,000', suffix: '+', label: 'Businesses Served', animated: true },
				{ value: '60', suffix: '+', label: 'Years Experience', animated: true },
				{ value: 'Next-Day', suffix: '', label: 'Delivery Available', animated: false },
			],
		},
		animated: { type: 'boolean', default: true },
		valueColour: { type: 'string' },
		labelColour: { type: 'string' },
		labelFontSize: { type: 'string' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true, gradients: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width: true,
			color: true,
			style: true,
		},
	},
	save() {
		return null;
	},
	migrate( attributes ) {
		return {
			...attributes,
			showItemIcons: false,
			dividers: false,
			items: ( attributes.items || [] ).map( ( item ) => ( { ...item, icon: '' } ) ),
		};
	},
};

export default [ v2, v1 ];
