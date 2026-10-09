// Measures round social-icon links on a rendered page (a Claude Design draft or an SGS page) so two renders can be
// compared property by property: the painted box, its glyph and the link, at rest, with :hover forced through the
// DevTools protocol and with :focus-visible forced. Used by social-icon-draft-compare.mjs.
//
// A target names three elements: the link (focus and hover target, carries the accessible name), the paint element
// (the draft's `a` itself; SGS's `.sgs-icon__shape` inside the link) and the glyph svg.

const BOX_PROPS = [
	'boxSizing',
	'borderTopWidth',
	'borderTopStyle',
	'borderTopColor',
	'borderTopLeftRadius',
	'backgroundColor',
	'backgroundImage',
	'color',
	'boxShadow',
	'transform',
	'opacity',
	'display',
	'cursor',
];

const GLYPH_PROPS = [ 'fill', 'stroke', 'strokeWidth', 'color', 'opacity' ];
const LINK_PROPS = [ 'outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset', 'cursor', 'opacity' ];

/** Everything the page reports for one target in its current state. Runs in the page; the property lists come in as arguments. */
function readTarget( { target, boxProps, glyphProps, linkProps } ) {
	const { linkSel, paintSel, glyphSel, root } = target;
	const scope = root ? document.querySelector( root ) : document;
	const link = scope.querySelector( linkSel );
	if ( ! link ) {
		return null;
	}
	const paint = paintSel ? link.querySelector( paintSel ) : link;
	const glyph = glyphSel ? link.querySelector( glyphSel ) : null;
	const pick = ( el, props ) => {
		const cs = getComputedStyle( el );
		const out = {};
		for ( const p of props ) {
			out[ p ] = cs[ p ];
		}
		return out;
	};
	const rect = ( el ) => {
		const r = el.getBoundingClientRect();
		return { left: r.left, top: r.top, width: r.width, height: r.height };
	};
	const cs = getComputedStyle( paint );
	return {
		paint: {
			...pick( paint, boxProps ),
			rect: rect( paint ),
			transition: {
				property: cs.transitionProperty,
				duration: cs.transitionDuration,
				timing: cs.transitionTimingFunction,
				delay: cs.transitionDelay,
			},
		},
		glyph: glyph ? { ...pick( glyph, glyphProps ), rect: rect( glyph ) } : null,
		link: { ...pick( link, linkProps ), rect: rect( link ), href: link.getAttribute( 'href' ), name: ( link.getAttribute( 'aria-label' ) || link.textContent || '' ).trim() },
	};
}

/**
 * @param {import('playwright').Page} page   Loaded page.
 * @param {Object}                    target { name, linkSel, paintSel, glyphSel, root }
 * @return {Promise<Object>} { rest, hover, focus } readings, or null when the link is missing.
 */
export async function measureTarget( page, target ) {
	const read = () => page.evaluate( readTarget, { target, boxProps: BOX_PROPS, glyphProps: GLYPH_PROPS, linkProps: LINK_PROPS } );
	const marked = await page.evaluate(
		( { linkSel, root } ) => {
			document.querySelectorAll( '[data-qa-target]' ).forEach( ( e ) => e.removeAttribute( 'data-qa-target' ) );
			const scope = root ? document.querySelector( root ) : document;
			const link = scope.querySelector( linkSel );
			if ( ! link ) {
				return false;
			}
			link.setAttribute( 'data-qa-target', '1' );
			link.scrollIntoView( { block: 'center' } );
			return true;
		},
		target
	);
	if ( ! marked ) {
		return null;
	}
	const client = await page.context().newCDPSession( page );
	await client.send( 'DOM.enable' );
	await client.send( 'CSS.enable' );
	const { root } = await client.send( 'DOM.getDocument', { depth: 0 } );
	const { nodeId } = await client.send( 'DOM.querySelector', { nodeId: root.nodeId, selector: '[data-qa-target]' } );
	const force = async ( states ) => {
		await client.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: states } );
		await page.waitForTimeout( 900 );
	};
	await page.mouse.move( 0, 0 );
	await force( [] );
	const rest = await read();
	await force( [ 'hover' ] );
	const hover = await read();
	await force( [ 'focus', 'focus-visible' ] );
	const focus = await read();
	await force( [] );
	await client.detach();
	return { rest, hover, focus };
}

/** Measures every target of a set; returns { name: readings }. */
export async function measureAll( page, targets ) {
	const out = {};
	for ( const t of targets ) {
		out[ t.name ] = await measureTarget( page, t );
	}
	return out;
}
