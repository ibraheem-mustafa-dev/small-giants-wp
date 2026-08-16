/**
 * SGS fork of WordPress core's `custom-gradient-picker/serializer.ts`,
 * forked verbatim at commit 28c0dedc4eaf001a24237a1fbba4b0887698b000
 * (WP 7.0.4). Type annotations stripped only — no behavioural change.
 *
 * `type: 'var'` (line ~15) is the branch this whole fork exists to use:
 * a gradient-parser AST colour stop can already round-trip
 * `var(--wp--preset--color--x)` — confirmed live via a spike (2026-08-16)
 * before this fork was built, not assumed.
 */

export function serializeGradientColor( { type, value } ) {
	if ( type === 'literal' ) {
		return value;
	}
	if ( type === 'hex' ) {
		return `#${ value }`;
	}
	if ( type === 'var' ) {
		return `var(${ value })`;
	}
	if ( type === 'hsl' ) {
		const [ hue, saturation, lightness ] = value;
		return `hsl(${ hue },${ saturation }%,${ lightness }%)`;
	}
	if ( type === 'hsla' ) {
		const [ hue, saturation, lightness, alpha ] = value;
		return `hsla(${ hue },${ saturation }%,${ lightness }%,${ alpha })`;
	}
	return `${ type }(${ value.join( ',' ) })`;
}

export function serializeGradientPosition( position ) {
	if ( ! position ) {
		return '';
	}
	const { value, type } = position;
	if ( type === 'calc' ) {
		return `calc(${ value })`;
	}
	return `${ value }${ type }`;
}

export function serializeGradientColorStop( { type, value, length } ) {
	return `${ serializeGradientColor( { type, value } ) } ${ serializeGradientPosition(
		length
	) }`;
}

export function serializeGradientOrientation( orientation ) {
	if (
		Array.isArray( orientation ) ||
		! orientation ||
		orientation.type !== 'angular'
	) {
		return;
	}
	return `${ orientation.value }deg`;
}

export function serializeGradient( { type, orientation, colorStops } ) {
	const serializedOrientation = serializeGradientOrientation( orientation );
	const serializedColorStops = colorStops
		.slice()
		.sort( ( colorStop1, colorStop2 ) => {
			const getNumericStopValue = ( colorStop ) => {
				return colorStop?.length?.value === undefined
					? 0
					: parseInt( colorStop.length.value, 10 );
			};

			return (
				getNumericStopValue( colorStop1 ) -
				getNumericStopValue( colorStop2 )
			);
		} )
		.map( serializeGradientColorStop );
	return `${ type }(${ [ serializedOrientation, ...serializedColorStops ]
		.filter( Boolean )
		.join( ',' ) })`;
}
