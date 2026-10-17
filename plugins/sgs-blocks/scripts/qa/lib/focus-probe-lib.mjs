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
 * half the hairline spread, the neighbour 1px outside the ring (1px inside the ring for an inset stop).
 */
export function samplePlan( rect, radius, outline, hairline ) {
	const o = outline.offset;
	const w = outline.width;
	const dRing = o + w / 2;
	// An inset ring (negative offset) sits on the element's own fill: the neighbour is 1px inside the ring's inner edge.
	// Either way the neighbour is at least 2px from the element edge, clear of an antialiased fractional edge.
	const dRaw = o < 0 ? o - 1 : o + w + 1;
	const dBg = Math.abs( dRaw ) < 2 ? ( dRaw < 0 ? -2 : 2 ) : dRaw;
	let dInner = null;
	if ( hairline ) dInner = hairline.inset ? -hairline.spread * 0.75 : hairline.spread / 2;
	// Every point is moved to the centre of the device pixel it falls in, so a fractional rect never reads a blended pixel.
	const snap = ( [ x, y ] ) => [ Math.round( x - 0.5 ) + 0.5, Math.round( y - 0.5 ) + 0.5 ];
	const edges = [
		{ len: rect.width, at: ( f, d ) => snap( [ rect.x + f * rect.width, rect.y - d ] ) },
		{ len: rect.width, at: ( f, d ) => snap( [ rect.x + f * rect.width, rect.y + rect.height + d ] ) },
		{ len: rect.height, at: ( f, d ) => snap( [ rect.x - d, rect.y + f * rect.height ] ) },
		{ len: rect.height, at: ( f, d ) => snap( [ rect.x + rect.width + d, rect.y + f * rect.height ] ) },
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

/** Every layer of a computed box-shadow as { inset, blur, spread, colour }; layers with fewer than two lengths are dropped. */
export function shadowLayers( computed ) {
	if ( typeof computed !== 'string' || computed === 'none' ) return [];
	return splitTop( computed ).map( ( layer ) => firstShadowLayer( layer ) ).filter( Boolean );
}

/** True when two parsed colours are the same within one 8-bit step per channel and 0.02 alpha. */
export function sameColour( a, b ) {
	if ( ! a || ! b ) return false;
	return [ 0, 1, 2 ].every( ( i ) => Math.abs( a[ i ] - b[ i ] ) <= 1.01 ) && Math.abs( a[ 3 ] - b[ 3 ] ) <= 0.02;
}

/**
 * The token check for one stop. `s.tokens` is { defined, ring, ink, inner, expect } (colour strings resolved in the page;
 * `expect` is 'ink' for a G2 or signature stop, 'inner' for a G2 stop on a dark ground, else 'ring'). Returns { status: 'undefined' | 'ok' | 'mismatch', detail }.
 * 'undefined' means the page has no --sgs-focus-* properties, so nothing is judged.
 */
export function judgeTokens( s ) {
	const t = s.tokens;
	if ( ! t || ! t.defined ) return { status: 'undefined', detail: 'tokens not defined' };
	if ( s.noOutline ) return { status: 'ok', detail: '' };
	const wantToken = { ink: [ t.ink, '--sgs-focus-ink' ], inner: [ t.inner, '--sgs-focus-inner' ], ring: [ t.ring, '--sgs-focus-ring' ] }[ t.expect ] || [ t.ring, '--sgs-focus-ring' ];
	const want = parseColour( wantToken[ 0 ] );
	const got = parseColour( s.outline.colour );
	if ( ! sameColour( got, want ) ) {
		return { status: 'mismatch', detail: `outline-color ${ s.outline.colour } is not the resolved ${ wantToken[ 1 ] } ${ wantToken[ 0 ] }` };
	}
	const inner = parseColour( t.inner );
	const hairline = shadowLayers( s.boxShadow ).some( ( l ) => l.blur === 0 && l.spread > 0 && l.colour && l.colour[ 3 ] > 0.5 && sameColour( l.colour, inner ) );
	if ( ! hairline ) return { status: 'mismatch', detail: `box-shadow has no solid hairline in the resolved --sgs-focus-inner ${ t.inner } (${ s.boxShadow })` };
	return { status: 'ok', detail: '' };
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
	const ringMin = Math.min( ...readings.filter( ( r ) => r.ring && r.bg ).map( ( r ) => contrast( r.ring, r.bg ) ) );
	return { min: worst.value, ringMin, points: per.length, worst: { ring: worst.ring, bg: worst.bg, inner: worst.inner } };
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
 * Highlight outline, and token-mismatch (the computed outline colour or the box-shadow hairline is not the resolved
 * --sgs-focus-* token for the stop). An obscured stop (something else sits over its centre) is reported, never failed on contrast.
 */
export function judgeStop( s, mode ) {
	const fails = [];
	if ( mode.forcedColors ) {
		if ( ! s.forced || ! s.forced.ok ) fails.push( 'forced-colours: no solid Highlight outline' );
	} else if ( s.contrast && s.contrast.min !== null && s.contrast.min < MIN_CONTRAST && ! s.obscured ) {
		fails.push( `contrast ${ s.contrast.min.toFixed( 2 ) } < ${ MIN_CONTRAST }` );
	}
	if ( s.noOutline && ! mode.forcedColors ) fails.push( 'no outline (the core must be a real outline)' );
	// A stop that asks for it (data-focus-assert="ring") must have the ring itself, not only the inner band, clear 3:1.
	if ( s.kinds.assertRing && ! mode.forcedColors && s.contrast && s.contrast.ringMin !== undefined && s.contrast.ringMin < MIN_CONTRAST && ! s.obscured ) {
		fails.push( `ring contrast ${ s.contrast.ringMin.toFixed( 2 ) } < ${ MIN_CONTRAST } (the ring alone, not the inner band)` );
	}
	// A card proxy: one ring, on the card; the source link inside it paints none.
	if ( s.card ) {
		if ( ! s.card.cardRing ) fails.push( 'card proxy draws no ring on the card' );
		if ( s.card.linkRing ) fails.push( 'a second ring paints on the source link inside the card' );
	}
	if ( ! mode.forcedColors ) {
		const tokens = judgeTokens( s );
		if ( tokens.status === 'mismatch' ) fails.push( `token-mismatch: ${ tokens.detail }` );
	}
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
	const tokenised = stops.filter( ( s ) => s.tokens && s.tokens.defined ).length;
	const tokenStatus = tokenised === 0 ? 'tokens not defined' : `token match checked on ${ tokenised } of ${ stops.length } stops`;
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
		tokenStatus,
		tokenised,
		tokenMismatches: mode.forcedColors ? 0 : stops.filter( ( s ) => judgeTokens( s ).status === 'mismatch' ).length,
		fails,
	};
}

/** Parse argv into the options object. Throws a usage Error on an unknown flag or a missing value. */
export function parseArgs( argv ) {
	const o = {
		local: false, site: null, pages: [], widths: [ 1440, 768, 375 ], engines: [], css: null,
		forcedColors: false, reducedMotion: false, axe: false, shots: null, json: null,
		openDrawer: false, openMega: false, maxStops: 130, settle: 350, pause: 2500,
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
	// Token match (plan section 1: outline-color and box-shadow match the token set for the stop's ground).
	const rgb = ( r, g, b ) => `rgb(${ r }, ${ g }, ${ b })`;
	const tok = ( over ) => ( { defined: true, ring: rgb( 190, 123, 19 ), ink: rgb( 26, 32, 44 ), inner: rgb( 250, 249, 246 ), expect: 'ring', ...over } );
	const shadow = 'rgb(250, 249, 246) 0px 0px 0px 2px, color(srgb 0.96 0.62 0.04 / 0.55) 0px 0px 12px 4px';
	const ringOutline = ( colour ) => ( { width: '2px', style: 'solid', offset: '2px', colour } );
	const tokenStop = ( over ) => stop( { outline: ringOutline( rgb( 190, 123, 19 ) ), boxShadow: shadow, tokens: tok( {} ), ...over } );
	check( 'tokens: a matching ring and hairline pass', judgeStop( tokenStop( {} ), mode ).length === 0 );
	const rogue = judgeStop( tokenStop( { outline: ringOutline( rgb( 200, 0, 0 ) ) } ), mode );
	check( 'tokens: a rogue ring colour fails as token-mismatch', rogue.length === 1 && rogue[ 0 ].startsWith( 'token-mismatch' ) );
	const noHair = judgeStop( tokenStop( { boxShadow: 'rgb(9, 9, 9) 0px 0px 0px 2px' } ), mode );
	check( 'tokens: a hairline in the wrong colour fails as token-mismatch', noHair.length === 1 && noHair[ 0 ].startsWith( 'token-mismatch' ) );
	check( 'tokens: a glow with no solid hairline fails', judgeStop( tokenStop( { boxShadow: 'color(srgb 0.96 0.62 0.04 / 0.55) 0px 0px 12px 4px' } ), mode ).length === 1 );
	const g2 = tokenStop( { outline: ringOutline( rgb( 26, 32, 44 ) ), tokens: tok( { expect: 'ink' } ) } );
	check( 'tokens: a G2 or signature stop compares with ink', judgeStop( g2, mode ).length === 0 );
	check( 'tokens: a G2 stop painted in the accent fails', judgeStop( tokenStop( { tokens: tok( { expect: 'ink' } ) } ), mode ).length === 1 );
	check( 'tokens: undefined tokens judge nothing', judgeStop( tokenStop( { outline: ringOutline( rgb( 1, 2, 3 ) ), tokens: { defined: false } } ), mode ).length === 0 );
	check( 'tokens: the run says "tokens not defined" when no stop has them', summarise( [ tokenStop( { tokens: { defined: false } } ) ], mode ).tokenStatus === 'tokens not defined' );
	check( 'tokens: the run counts checked stops when they exist', summarise( [ tokenStop( {} ), tokenStop( {} ) ], mode ).tokenStatus === 'token match checked on 2 of 2 stops' );
	check( 'tokens: forced colours skips the token match', judgeStop( tokenStop( { forced: { ok: true }, outline: ringOutline( rgb( 0, 0, 0 ) ) } ), { forcedColors: true } ).length === 0 );
	// Sample geometry: inset stops read the fill inside the ring; fractional rects snap to whole pixels.
	const inset = samplePlan( { x: 100, y: 100, width: 200, height: 40 }, 4, { width: 2, offset: -2 }, { inset: true, spread: 4 } );
	check( 'inset: the neighbour sample is 3px INSIDE the element edge, not outside it', inset.find( ( p ) => p.kind === 'bg' ).y === 103.5 );
	const frac = samplePlan( { x: 100.37, y: 100.62, width: 200.4, height: 40.3 }, 4, { width: 2, offset: 2 }, { inset: false, spread: 2 } );
	check( 'fractional rect: every sample sits on a pixel centre', frac.every( ( p ) => Math.abs( ( p.x % 1 ) - 0.5 ) < 1e-9 && Math.abs( ( p.y % 1 ) - 0.5 ) < 1e-9 ) );
	const thin = samplePlan( { x: 100, y: 100, width: 200, height: 40 }, 4, { width: 1, offset: -0.5 }, null );
	check( 'inset: a neighbour sample is at least 2px from the edge', thin.filter( ( p ) => p.kind === 'bg' ).every( ( p ) => Math.min( Math.abs( p.y - 100 ), Math.abs( p.y - 140 ), Math.abs( p.x - 100 ), Math.abs( p.x - 300 ) ) >= 1.5 ) );
	return failed;
}
