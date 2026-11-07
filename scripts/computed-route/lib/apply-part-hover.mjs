// The applier's part hover read. A hover look held by a calibrated part of a block (an icon list's text and icons, an icon's
// circle) is read on that part: a real pointer is put on the part's own element, and the part's computed style is read at rest
// and under the hover. The part is found by the slot selector calibration tied the setting to (cache/<block>.json
// settings[ attr ].slot), among the elements inside the block's own element. The read lands in facts[ key ].parts[ slot ] and a
// check with `part: <slot>` reads it (apply.mjs::judge).

// The finder of the part inside the block found by `rootFinder` (a selector string), or null when the root has no such finder.
// A block variant that lacks an ancestor the slot names (an icon that is not a link has no `.sgs-icon__link` around its shape) is
// found by the slot's last compound selector inside the block.
export function partFinder( rootFinder, slot ) {
	if ( 'string' !== typeof rootFinder || 'string' !== typeof slot || '' === slot ) {
		return null;
	}
	const last = slot.split( /\s*[>+~]\s*|\s+/ ).filter( Boolean ).pop();
	return { within: rootFinder, js: `(root) => { const inside = ( sel ) => [ ...document.querySelectorAll( sel ) ].find( ( e ) => e !== root && root.contains( e ) ); return inside( ${ JSON.stringify( slot ) } ) || inside( ${ JSON.stringify( last ) } ) || null; }` };
}

// The parts the ops' checks name, as { key: { slot: [ prop ] } }, for the read.
export function partsOf( ops ) {
	const out = {};
	for ( const op of ops ) {
		for ( const c of op.checks || [] ) {
			if ( c.part && c.prop ) {
				const slots = ( out[ op.ref ] ??= {} );
				const props = ( slots[ c.part ] ??= [] );
				props.includes( c.prop ) || props.push( c.prop );
			}
		}
	}
	return out;
}

// In page: a point on the part that no other element covers (a floating button can sit over a part's middle), scrolled into view.
function partPointOf( [ finder, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const el = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! el ) {
		return null;
	}
	el.scrollIntoView( { block: 'center', inline: 'nearest', behavior: 'instant' } );
	const r = el.getBoundingClientRect();
	const left = Math.max( r.left, 0 );
	const right = Math.min( r.right, document.documentElement.clientWidth );
	const top = Math.max( r.top, 0 );
	const bottom = Math.min( r.bottom, window.innerHeight );
	if ( right <= left || bottom <= top ) {
		return { unreached: true };
	}
	for ( const fy of [ 0.5, 0.25, 0.75, 0.1, 0.9 ] ) {
		for ( const fx of [ 0.5, 0.25, 0.75, 0.1, 0.9 ] ) {
			const x = left + ( right - left ) * fx;
			const y = top + ( bottom - top ) * fy;
			const hit = document.elementFromPoint( x, y );
			if ( hit && ( hit === el || el.contains( hit ) ) ) {
				return { x, y };
			}
		}
	}
	return { unreached: true };
}

// In page: the computed value of each prop on an element, colours as sRGB.
function styleOf( [ finder, props, resolveSrc ] ) {
	// eslint-disable-next-line no-new-func
	const el = new Function( `return (${ resolveSrc });` )()( finder );
	if ( ! el ) {
		return null;
	}
	const cs = getComputedStyle( el );
	const ctx = document.createElement( 'canvas' ).getContext( '2d' );
	const srgb = ( v ) => {
		if ( ! /^(oklab|oklch|lab|lch|color)\(/.test( v ) ) {
			return v;
		}
		ctx.fillStyle = '#000';
		ctx.fillStyle = v;
		const f = ctx.fillStyle;
		if ( ! f.startsWith( '#' ) ) {
			return f;
		}
		const n = parseInt( f.slice( 1 ), 16 );
		return `rgb(${ ( n >> 16 ) & 255 }, ${ ( n >> 8 ) & 255 }, ${ n & 255 })`;
	};
	return Object.fromEntries( props.map( ( p ) => {
		const v = cs.getPropertyValue( p ).trim();
		return [ p, /color$/.test( p ) && 'none' !== v ? srgb( v ) : v ];
	} ) );
}

// { key: { slot: { rest, hover } | { unreached } } } for each key's parts. `settled` waits out an entrance (apply-hover.mjs::settled).
export async function partReads( page, { parts, finderOf, resolveSrc, settled, wait = 700 } ) {
	const out = {};
	for ( const [ key, slots ] of Object.entries( parts ) ) {
		let root = null;
		try {
			root = finderOf( key );
		} catch {
			continue;
		}
		for ( const [ slot, props ] of Object.entries( slots ) ) {
			const finder = partFinder( root, slot );
			if ( ! finder ) {
				continue;
			}
			( out[ key ] ??= {} )[ slot ] = { unreached: true };
			await page.mouse.move( 1, 1 );
			await settled( page, finder, resolveSrc );
			await page.waitForTimeout( 150 );
			const rest = await page.evaluate( styleOf, [ finder, props, resolveSrc ] );
			let over = false;
			for ( let tries = 0; tries < 3 && ! over; tries++ ) {
				const at = await page.evaluate( partPointOf, [ finder, resolveSrc ] );
				if ( ! at || at.unreached ) {
					break;
				}
				await page.mouse.move( at.x, at.y );
				await page.waitForTimeout( 80 );
				over = await page.evaluate( ( [ f, src, x, y ] ) => {
					// eslint-disable-next-line no-new-func
					const el = new Function( `return (${ src });` )()( f );
					// The pointer is on the part when the element under it is the part or inside it (a part's :hover can read false for an inline element).
					const hit = document.elementFromPoint( x, y );
					return !! el && !! hit && ( el === hit || el.contains( hit ) );
				}, [ finder, resolveSrc, at.x, at.y ] );
			}
			if ( over ) {
				await page.waitForTimeout( wait );
				out[ key ][ slot ] = { rest, hover: await page.evaluate( styleOf, [ finder, props, resolveSrc ] ) };
			}
			await page.mouse.move( 1, 1 );
			await page.waitForTimeout( 150 );
		}
	}
	return out;
}

// The part's styles for a check: its hover read, or its resting read.
export function partStyles( facts, c ) {
	const part = facts?.parts?.[ c.part ];
	return part && ! part.unreached ? ( 'hover' === c.state ? part.hover : part.rest ) ?? null : null;
}
