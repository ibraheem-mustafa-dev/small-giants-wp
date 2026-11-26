/**
 * The carousel dots kit's editor panel mount.
 *
 * A slider block that draws navigation dots declares them in `supports.sgs.carouselDots`: `{ prefix, part, label }`. One
 * `<CarouselDotsPanel prefix="…" />` shows the look settings the kit generates for that prefix
 * (`carousel-dots/registry.json`): size, current dot width, gap, colour with hover and current states, border and radius. A
 * prefix the block does not declare renders nothing.
 *
 * The panel loads on first use as one shared chunk, so the block bundles that import this component do not each carry a
 * copy of the controls.
 *
 * The declaration may carry `showWhen` (the condition under which the PHP prints the dots, `kitShown.js`): while it does not
 * hold, the panel and the colour rows are not offered. The colour rows go in the block's one main Colour panel when the block
 * passes `colourInMainPanel` and spreads `carouselDotsColourRows()` into that panel's `rows`; otherwise they stay in the
 * kit's own Colour panel.
 *
 * @package
 */
import { getBlockType } from '@wordpress/blocks';
import { Suspense, lazy } from '@wordpress/element';

import registry from './carousel-dots/registry.json';
import { dotsColourRows } from './carousel-dots/colour-rows';
import { kitShown } from './kitShown';

const CarouselDotsPanelBody = lazy( () =>
	import(
		/* webpackChunkName: "carousel-dots-panel" */ './carousel-dots/CarouselDotsPanelBody.js'
	)
);

/**
 * The attribute name for one registry base of the declared dots (the twin of PHP `sgs_carousel_dots_attr()`).
 *
 * @param {string} prefix Dots prefix, for example 'dot'.
 * @param {string} base   Registry base, for example 'ColourActive'.
 * @return {string} `prefix + base`.
 */
export function carouselDotsAttrName( prefix, base ) {
	return prefix + base;
}

/**
 * Every attribute name the kit generates for the dots.
 *
 * @param {string} prefix Dots prefix.
 * @return {string[]} The attribute names.
 */
export function carouselDotsAttrKeys( prefix ) {
	return registry.rows.map( ( row ) =>
		carouselDotsAttrName( prefix, row.base )
	);
}

/**
 * A block's declaration for its carousel dots, or null.
 *
 * @param {string} blockName Block name, for example 'sgs/testimonial-slider'.
 * @param {string} prefix    Dots prefix.
 * @return {Object|null} The `carouselDots` entry when its prefix matches.
 */
export function declaredDots( blockName, prefix ) {
	const entry = getBlockType( blockName )?.supports?.sgs?.carouselDots;
	return entry && 'object' === typeof entry && entry.prefix === prefix
		? entry
		: null;
}

/**
 * The kit's colour rows for the declared dots, for a block's own main `SgsColourPanel`: the headed Dot row (Normal, Hover,
 * Current) and the Dot border row. Empty when the block does not declare the prefix or the dots are not printed (`showWhen`).
 *
 * @param {Object}   args
 * @param {Object}   args.attributes    Block attributes.
 * @param {Function} args.setAttributes Block `setAttributes`.
 * @param {string}   args.blockName     Block name.
 * @param {string}   args.prefix        The dots' attribute prefix.
 * @return {Array} Rows to spread into `SgsColourPanel`'s `rows`.
 */
export function carouselDotsColourRows( {
	attributes,
	setAttributes,
	blockName,
	prefix,
} ) {
	const entry = declaredDots( blockName, prefix );
	if ( ! entry || ! kitShown( entry, attributes ) ) {
		return [];
	}
	return dotsColourRows( {
		attributes,
		setAttributes,
		prefix,
		label: entry.label,
	} );
}

/**
 * Mount the carousel dots panels.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   props.blockName     Block name, to read its `supports.sgs.carouselDots` entry.
 * @param {string}   props.prefix        The dots' attribute prefix.
 * @param {boolean}  [props.colourInMainPanel=false] True when the block draws these colour rows in its own main Colour panel
 *                                       through `carouselDotsColourRows()`, so the kit draws none.
 * @return {Object|null} The mounted panels, or null.
 */
export default function CarouselDotsPanel( {
	attributes,
	setAttributes,
	blockName,
	prefix,
	colourInMainPanel = false,
} ) {
	const entry = declaredDots( blockName, prefix );
	if ( ! entry || ! kitShown( entry, attributes ) ) {
		return null;
	}
	return (
		<Suspense fallback={ null }>
			<CarouselDotsPanelBody
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix={ prefix }
				label={ entry.label }
				colourInMainPanel={ colourInMainPanel }
			/>
		</Suspense>
	);
}
