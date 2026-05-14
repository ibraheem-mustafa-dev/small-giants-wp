import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar } from '../../utils';

/**
 * Build the CSS custom property map for this block instance.
 * All values feed through CSS vars so style.css rules can consume them
 * without relying on inline style overrides in the selectors.
 */
function buildStyle( attributes ) {
	const {
		textColour,
		backgroundColour,
		fontFamily,
		fontSize,
		fontSizeUnit,
		fontWeight,
		lineHeight,
		lineHeightUnit,
		letterSpacing,
		letterSpacingUnit,
		textTransform,
		textDecoration,
		paddingTop,
		paddingRight,
		paddingBottom,
		paddingLeft,
		borderRadius,
		variantStyle,
	} = attributes;

	const style = {
		'--sgs-label-colour': colourVar( textColour ) || undefined,
		'--sgs-label-bg': colourVar( backgroundColour ) || undefined,
		'--sgs-label-font-size': fontSize
			? `${ fontSize }${ fontSizeUnit }`
			: undefined,
		'--sgs-label-font-weight': fontWeight || undefined,
		'--sgs-label-line-height': lineHeight
			? `${ lineHeight }${ lineHeightUnit }`
			: undefined,
		'--sgs-label-letter-spacing': letterSpacing
			? `${ letterSpacing }${ letterSpacingUnit }`
			: undefined,
		'--sgs-label-text-transform': textTransform || undefined,
		'--sgs-label-text-decoration': textDecoration || undefined,
		'--sgs-label-border-radius': `${ borderRadius }px`,
	};

	if ( variantStyle !== 'plain' ) {
		style[ '--sgs-label-padding' ] =
			`${ paddingTop }px ${ paddingRight }px ${ paddingBottom }px ${ paddingLeft }px`;
	}

	if ( fontFamily ) {
		style[ '--sgs-label-font-family' ] = fontFamily;
	}

	return Object.fromEntries(
		Object.entries( style ).filter( ( [ , v ] ) => v !== undefined )
	);
}

export default function Save( { attributes } ) {
	const { text, tag, variantStyle } = attributes;

	const classNames = [
		'wp-block-sgs-label',
		`is-style-${ variantStyle }`,
	].join( ' ' );

	const blockProps = useBlockProps.save( {
		className: classNames,
		style: buildStyle( attributes ),
	} );

	return (
		<RichText.Content
			{ ...blockProps }
			tagName={ tag }
			value={ text }
		/>
	);
}
