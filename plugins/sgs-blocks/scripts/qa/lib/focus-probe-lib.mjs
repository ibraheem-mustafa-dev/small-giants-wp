/**
 * Pure helpers for probe-focus-system.mjs (unified keyboard focus system, plan 2026-10-17 Task 2): colour maths, the
 * box-shadow layer reader, the sample-point geometry, the per-stop and per-run judges and the argument parser. Nothing
 * here touches a browser, so `--self-test` runs the judges offline and a judge that cannot fail is caught there.
 *
 * @package SGS\Blocks
 */

/** The acceptance numbers (plan section 1). */
export const MIN_CONTRAST = 3;
export const GROW = 8;
export const SAMPLE_FRACTIONS = [ 0.2, 0.4, 0.6, 0.8 ];

/** Parse `rgb()`, `rgba()` or `color(srgb r g b / a)` into [r, g, b, a] (0-255, alpha 0-1), or null. */
export function parseColour( text ) {
	if ( typeof text !== 'string' ) return null;
	const rgb = text.match( /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/ );
	if ( rgb ) {
		let a = 1;
		if ( rgb[ 4 ] !== undefined ) a = rgb[ 4 ].endsWith( '%' ) ? parseFloat( rgb[ 4 ] ) / 100 : parseFloat( rgb[ 4 ] );
		return [ +rgb[ 1 ], +rgb[ 2 ], +rgb[ 3 ], a ];
	}
	const srgb = text.match( /color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/ );
	if ( srgb ) {
		let a = 1;
		if ( srgb[ 4 ] !== undefined ) a = srgb[ 4 ].endsWith( '%' ) ? parseFloat( srgb[ 4 ] ) / 100 : parseFloat( srgb[ 4 ] );
		return [ +srgb[ 1 ] * 255, +srgb[ 2 ] * 255, +srgb[ 3 ] * 255, a ];
	}
	return null;
}

/** WCAG relative luminance of an [r, g, b] triple (0-255). */
export function luminance( [ r, g, b ] ) {
	const lin = ( c ) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ( ( s + 0.055 ) / 1.055 ) ** 2.4;
	};
	return 0.2126 * lin( r ) + 0.7152 * lin( g ) + 0.0722 * lin( b );
}

/** WCAG contrast ratio of two [r, g, b] triples. */
export function contrast( a, b ) {
	const la = luminance( a );
	const lb = luminance( b );
	return ( Math.max( la, lb ) + 0.05 ) / ( Math.min( la, lb ) + 0.05 );
}

/** Split on top-level commas only (colour functions carry their own commas). */
export function splitTop( text ) {
	const out = [];
	let depth = 0;
	let cur = '';
	for ( const ch of text ) {
		if ( ch === '(' ) depth++;
		if ( ch === ')' ) depth--;
		if ( ch === ',' && depth === 0 ) {
			out.push( cur.trim() );
			cur = '';
		} else {
			cur += ch;
		}
	}
	if ( cur.trim() ) out.push( cur.trim() );
	return out;
}

/**
 * The first box-shadow layer of a computed value: { inset, blur, spread, colour } or null. Chromium serialises the colour
 * first, Firefox and WebKit may put it last, so the colour token is removed and the lengths read from what is left.
 */
export function firstShadowLayer( computed ) {
	if ( typeof computed !== 'string' || computed === 'none' ) return null;
	const layer = splitTop( computed )[ 0 ];
	if ( ! layer ) return null;
	const colourMatch = layer.match( /(?:rgba?|color|hsla?|oklch|oklab|lab|lch)\([^)]*\)/ );
	const rest = colourMatch ? layer.replace( colourMatch[ 0 ], ' ' ) : layer;
	const nums = ( rest.match( /-?[\d.]+px/g ) || [] ).map( ( n ) => parseFloat( n ) );
	if ( nums.length < 2 ) return null;
	return {
		inset: /\binset\b/.test( rest ),
		blur: nums[ 2 ] || 0,
		spread: nums[ 3 ] || 0,
		colour: colourMatch ? parseColour( colourMatch[ 0 ] ) : null,
	};
}

/** The colour-free shape of a computed box-shadow, so two looks that differ only in colour compare equal. */
export function shadowShape( computed ) {
	if ( typeof computed !== 'string' || computed === 'none' ) return 'none';
	return splitTop( computed )
		.map( ( layer ) => {
			const colour = layer.match( /(?:rgba?|color|hsla?|oklch|oklab|lab|lch)\([^)]*\)/ );
			const rest = colour ? layer.replace( colour[ 0 ], ' ' ) : layer;
			return ( /\binset\b/.test( rest ) ? 'i' : '' ) + ( rest.match( /-?[\d.]+px/g ) || [] ).join( '/' );
		} )
		.join( ' + ' );
}

/** True when the first layer is a solid band (no blur, a spread, a visible colour): the hairline the system draws. */
export function hasSolidHairline( layer ) {
	return Boolean( layer && layer.blur === 0 && layer.spread > 0 && layer.colour && layer.colour[ 3 ] > 0.5 );
}

/**
 * The sample points for one stop, as { kind, x, y } in viewport CSS px. For each of the four edges, points at 20/40/60/80
 * per cent along the edge that sit on the straight part (further than the corner radius from either end); an edge too
 * short for that gets its midpoint, which is on the ring for any radius. `kind` is ring, inner or bg.
 * Distances are measured outward from the border box: the ring centre at offset + width / 2, the inner band centre at
 * half the hairline spread, the neighbour 1px outside the ring.
 */
export function samplePlan( rect, radius, outline, hairline ) {
	const o = outline.offset;
	const w = outline.width;
	const dRing = o + w / 2;
	const dBg = o + w + 1;
	let dInner = null;
	if ( hairline ) dInner = hairline.inset ? -hairline.spread * 0.75 : hairline.spread / 2;
	const edges = [
		{ len: rect.width, at: ( f, d ) => [ rect.x + f * rect.width, rect.y - d ] },
		{ len: rect.width, at: ( f, d ) => [ rect.x + f * rect.width, rect.y + rect.height + d ] },
		{ len: rect.height, at: ( f, d ) => [ rect.x - d, rect.y + f * rect.height ] },
		{ len: rect.height, at: ( f, d ) => [ rect.x + rect.width + d, rect.y + f * rect.height ] },
	];
	const points = [];
	for ( const edge of edges ) {
		let fractions = SAMPLE_FRACTIONS.filter( ( f ) => f * edge.len >= radius && ( 1 - f ) * edge.len >= radius );
		if ( fractions.length === 0 ) fractions = [ 0.5 ];
		for ( const f of fractions ) {
			const ring = edge.at( f, dRing );
			const bg = edge.at( f, dBg );
			points.push( { kind: 'ring', x: ring[ 0 ], y: ring[ 1 ], f, edge: points.length } );
			points.push( { kind: 'bg', x: bg[ 0 ], y: bg[ 1 ], f, edge: points.length } );
			if ( dInner !== null ) {
				const inner = edge.at( f, dInner );
				points.push( { kind: 'inner', x: inner[ 0 ], y: inner[ 1 ], f, edge: points.length } );
			}
		}
	}
	return points;
}

/** The pixel index whose centre is nearest a continuous coordinate. */
export const pixelOf = ( coord ) => Math.round( coord - 0.5 );

/**
 * The stop's pixel contrast: the minimum over points of max(contrast(ring, bg), contrast(inner, bg)). `readings` is
 * [{ kind, ring: rgb, bg: rgb, inner: rgb|null }] already paired per point. Returns { min, points } or { min: null }.
 */
export function judgeContrast( readings ) {
	const per = readings
		.filter( ( r ) => r.ring && r.bg )
		.map( ( r ) => {
			const cr = contrast( r.ring, r.bg );
			const ci = r.inner ? contrast( r.inner, r.bg ) : 0;
			return { value: Math.max( cr, ci ), ring: r.ring, bg: r.bg, inner: r.inner };
		} );
	if ( per.length === 0 ) return { min: null, points: 0 };
	const worst = per.reduce( ( a, b ) => ( b.value < a.value ? b : a ) );
	return { min: worst.value, points: per.length, worst: { ring: worst.ring, bg: worst.bg, inner: worst.inner } };
}

/** The look tuple that must be identical across stops. */
export const lookKey = ( s ) => `${ s.outline.width } ${ s.outline.style } ${ s.outline.offset }`;

/** The wider tuple report C used (colour, shadow shape, radius), kept as a diagnostic beside the acceptance count. */
export const fullLookKey = ( s ) => `${ lookKey( s ) } | ${ s.outline.colour } | ${ s.shadowShape } | ${ s.radius }`;

/** Stops that are allowed their own look: inset and signature (and their kind names for the printed suffix). */
export const isExempt = ( s ) => s.kinds.inset || s.kinds.signature;

/**
 * Judge one stop. Returns the list of failure strings (empty when the stop passes). Rules: contrast under 3 (when
 * measured), clipped and not inset, radius at rest differs from radius on focus, and, in forced-colours mode, a missing
 * Highlight outline. An obscured stop (something else sits over its centre) is reported, never failed on contrast.
 */
export function judgeStop( s, mode ) {
	const fails = [];
	if ( mode.forcedColors ) {
		if ( ! s.forced || ! s.forced.ok ) fails.push( 'forced-colours: no solid Highlight outline' );
	} else if ( s.contrast && s.contrast.min !== null && s.contrast.min < MIN_CONTRAST && ! s.obscured ) {
		fails.push( `contrast ${ s.contrast.min.toFixed( 2 ) } < ${ MIN_CONTRAST }` );
	}
	if ( s.noOutline && ! mode.forcedColors ) fails.push( 'no outline (the core must be a real outline)' );
	if ( s.clip.clipped && ! s.kinds.inset ) fails.push( `outline clipped by ${ s.clip.by }` );
	if ( s.radiusRest !== s.radius ) fails.push( `radius ${ s.radiusRest } -> ${ s.radius } on focus` );
	if ( mode.reducedMotion && s.kinds.signature && s.signatureAnimation !== 'none' ) {
		fails.push( `signature animation ${ s.signatureAnimation } under reduced motion` );
	}
	return fails;
}

/** Summarise a list of judged stops: looks, min contrast, clipped, radius changes, failures. */
export function summarise( stops, mode ) {
	const plain = stops.filter( ( s ) => ! isExempt( s ) );
	const looks = new Set( plain.map( lookKey ) );
	const fullLooks = new Set( plain.map( fullLookKey ) );
	const measured = stops.map( ( s ) => ( s.contrast ? s.contrast.min : null ) ).filter( ( v ) => v !== null );
	const exempt = [];
	if ( stops.some( ( s ) => s.kinds.inset ) ) exempt.push( 'inset' );
	if ( stops.some( ( s ) => s.kinds.signature ) ) exempt.push( 'signature' );
	const fails = [];
	stops.forEach( ( s, i ) => judgeStop( s, mode ).forEach( ( f ) => fails.push( `#${ i + 1 } ${ s.label }: ${ f }` ) ) );
	if ( looks.size > 1 ) fails.push( `looks ${ looks.size } > 1 (${ [ ...looks ].join( ' ; ' ) })` );
	return {
		stops: stops.length,
		looks: looks.size,
		looksList: [ ...looks ],
		looksFull: fullLooks.size,
		exempt,
		minContrast: measured.length ? Math.min( ...measured ) : null,
		clipped: stops.filter( ( s ) => s.clip.clipped && ! s.kinds.inset ).length,
		clippedInset: stops.filter( ( s ) => s.clip.clipped && s.kinds.inset ).length,
		radiusChanged: stops.filter( ( s ) => s.radiusRest !== s.radius ).length,
		obscured: stops.filter( ( s ) => s.obscured ).length,
		fails,
	};
}

/** Parse argv into the options object. Throws a usage Error on an unknown flag or a missing value. */
export function parseArgs( argv ) {
	const o = {
		local: false, site: null, pages: [], widths: [ 1440, 768, 375 ], engines: [], css: null,
		forcedColors: false, reducedMotion: false, axe: false, shots: null, json: null,
		openDrawer: false, openMega: false, maxStops: 60, settle: 350, pause: 2500,
		negativeControl: false, selfTest: false, help: false,
	};
	const value = ( i, flag ) => {
		if ( i + 1 >= argv.length ) throw new Error( `${ flag } needs a value` );
		return argv[ i + 1 ];
	};
	for ( let i = 0; i < argv.length; i++ ) {
		const a = argv[ i ];
		switch ( a ) {
			case '--local': o.local = true; break;
			case '--site': o.site = value( i++, a ); break;
			case '--pages': o.pages = value( i++, a ).split( ',' ).map( ( p ) => p.trim() ).filter( Boolean ); break;
			case '--widths': o.widths = value( i++, a ).split( ',' ).map( Number ).filter( Boolean ); break;
			case '--engine': o.engines.push( value( i++, a ) ); break;
			case '--css': o.css = value( i++, a ); break;
			case '--forced-colors': o.forcedColors = true; break;
			case '--reduced-motion': o.reducedMotion = true; break;
			case '--axe': o.axe = true; break;
			case '--shots': o.shots = value( i++, a ); break;
			case '--json': o.json = value( i++, a ); break;
			case '--open-drawer': o.openDrawer = true; break;
			case '--open-mega': o.openMega = true; break;
			case '--max-stops': o.maxStops = Number( value( i++, a ) ); break;
			case '--settle': o.settle = Number( value( i++, a ) ); break;
			case '--pause': o.pause = Number( value( i++, a ) ); break;
			case '--negative-control': o.negativeControl = true; break;
			case '--self-test': o.selfTest = true; break;
			case '--help': case '-h': o.help = true; break;
			default: throw new Error( `unknown argument ${ a }` );
		}
	}
	if ( o.engines.length === 0 ) o.engines = [ 'chromium' ];
	for ( const e of o.engines ) {
		if ( ! [ 'chromium', 'firefox', 'webkit' ].includes( e ) ) throw new Error( `unknown engine ${ e }` );
	}
	if ( ! o.help && ! o.selfTest && ! o.local && ! o.negativeControl && ! o.site ) throw new Error( 'give --local, --negative-control or --site <target>' );
	if ( o.site && o.pages.length === 0 ) throw new Error( '--site needs --pages <list>' );
	return o;
}

/** Offline checks of the judges: each positive has a negative control that must come out the other way. */
export function selfTest() {
	let failed = 0;
	const check = ( name, ok ) => {
		if ( ! ok ) failed++;
		console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ name }` );
	};
	check( 'black on white is 21:1', Math.abs( contrast( [ 0, 0, 0 ], [ 255, 255, 255 ] ) - 21 ) < 0.01 );
	check( 'same colour is 1:1', contrast( [ 9, 9, 9 ], [ 9, 9, 9 ] ) === 1 );
	check( 'parses rgb', parseColour( 'rgb(1, 2, 3)' ).slice( 0, 3 ).join() === '1,2,3' );
	check( 'parses color(srgb)', Math.round( parseColour( 'color(srgb 1 0 0 / 0.5)' )[ 0 ] ) === 255 );
	const g1 = firstShadowLayer( 'rgb(255, 255, 255) 0px 0px 0px 2px, color(srgb 0 0 1 / 0.55) 0px 0px 12px 4px' );
	check( 'first layer is a solid hairline', hasSolidHairline( g1 ) && g1.spread === 2 );
	const glow = firstShadowLayer( 'rgba(245, 208, 80, 0.4) 0px 0px 8px 2px' );
	check( 'a blurred glow is not a hairline', ! hasSolidHairline( glow ) );
	check( 'none has no layer', firstShadowLayer( 'none' ) === null );
	const plan = samplePlan( { x: 100, y: 100, width: 200, height: 40 }, 4, { width: 2, offset: 2 }, { inset: false, spread: 2 } );
	check( 'a wide box gets 16 ring points', plan.filter( ( p ) => p.kind === 'ring' ).length === 16 );
	const small = samplePlan( { x: 0, y: 0, width: 24, height: 24 }, 12, { width: 2, offset: 2 }, null );
	check( 'a circle gets the four midpoints', small.filter( ( p ) => p.kind === 'ring' ).length === 4 );
	check( 'pass at 3.5', judgeContrast( [ { ring: [ 0, 0, 0 ], bg: [ 255, 255, 255 ], inner: null } ] ).min > 3 );
	check( 'fail at 1.04', judgeContrast( [ { ring: [ 245, 208, 80 ], bg: [ 255, 255, 255 ], inner: null } ] ).min < 3 );
	check( 'inner band can carry the stop', judgeContrast( [ { ring: [ 128, 128, 128 ], bg: [ 128, 128, 128 ], inner: [ 255, 255, 255 ] } ] ).min > 3 );
	const stop = ( over ) => ( {
		label: 'x', outline: { width: '2px', style: 'solid', offset: '2px', colour: 'c' }, shadowShape: 's', radius: '4px', radiusRest: '4px',
		kinds: {}, clip: { clipped: false }, contrast: { min: 5 }, obscured: false, ...over,
	} );
	const mode = {};
	check( 'a good stop passes', judgeStop( stop( {} ), mode ).length === 0 );
	check( 'low contrast fails', judgeStop( stop( { contrast: { min: 1.04 } } ), mode ).length === 1 );
	check( 'a clipped non-inset stop fails', judgeStop( stop( { clip: { clipped: true, by: 'div' } } ), mode ).length === 1 );
	check( 'a clipped inset stop passes', judgeStop( stop( { clip: { clipped: true, by: 'div' }, kinds: { inset: true } } ), mode ).length === 0 );
	check( 'a radius change fails', judgeStop( stop( { radiusRest: '10px' } ), mode ).length === 1 );
	const two = summarise( [ stop( {} ), stop( { outline: { width: '3px', style: 'solid', offset: '2px', colour: 'c' } } ) ], mode );
	check( 'two looks fail the run', two.looks === 2 && two.fails.length === 1 );
	const exempt = summarise( [ stop( {} ), stop( { kinds: { signature: true }, outline: { width: '3px', style: 'solid', offset: '9px', colour: 'c' } } ) ], mode );
	check( 'a signature stop is exempt from the look count', exempt.looks === 1 && exempt.exempt.join() === 'signature' );
	return failed;
}
