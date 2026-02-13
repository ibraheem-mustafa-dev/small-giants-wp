/**
 * Responsive class name helpers.
 */

export function responsiveClasses( attributes ) {
	const classes = [];

	if ( attributes.sgsHideOnMobile ) {
		classes.push( 'sgs-hide-mobile' );
	}
	if ( attributes.sgsHideOnTablet ) {
		classes.push( 'sgs-hide-tablet' );
	}
	if ( attributes.sgsHideOnDesktop ) {
		classes.push( 'sgs-hide-desktop' );
	}

	return classes.join( ' ' );
}

export function gridColumnClasses( desktop, tablet, mobile ) {
	return [
		`sgs-cols-${ desktop }`,
		tablet && `sgs-cols-tablet-${ tablet }`,
		mobile && `sgs-cols-mobile-${ mobile }`,
	]
		.filter( Boolean )
		.join( ' ' );
}
