/**
 * Disclosure for an adopted slot's §8 bases (Spec 49 §9.3, C4).
 *
 * The older atoms' rules are written against today's bases and stay the one place each rule lives. This module runs
 * them with `opts.adopted` set, so `createContext()` reads every base through `ADOPTED_ALIAS` and the slot's kind from
 * its `Source`, then renames the answers to §8's bases. The four new atoms already speak §8, so they run as they are,
 * with the Background context and kind limits §9.3 adds applied here. Pure: no JSX, no `@wordpress/*`.
 *
 * @package SGS\Blocks
 */
import { disclosure as captionDisclosure } from '../atoms/caption.js';
import { disclosure as filterDisclosure } from '../atoms/filter.js';
import { disclosure as focalDisclosure } from '../atoms/focal-point.js';
import { disclosure as layoutDisclosure } from '../atoms/layout.js';
import { disclosure as linkDisclosure } from '../atoms/link.js';
import { disclosure as meaningDisclosure } from '../atoms/meaning.js';
import { disclosure as objectFitDisclosure } from '../atoms/object-fit.js';
import { disclosure as opacityDisclosure } from '../atoms/opacity.js';
import { disclosure as overlayDisclosure } from '../atoms/overlay.js';
import { disclosure as paddingDisclosure } from '../atoms/media-padding.js';
import { disclosure as shadowDisclosure } from '../atoms/shadow.js';
import { disclosure as shapeDisclosure } from '../atoms/shape.js';
import { disclosure as sizingDisclosure } from '../atoms/sizing.js';
import { disclosure as svgDisclosure } from '../atoms/svg-presentation.js';
import { disclosure as videoDisclosure } from '../atoms/video-behaviour.js';

import { createContext, kindIn, omitted, shown } from './disclosure-context.js';

const NOT_ON_BACKGROUNDS = 'Not available on a background.';

/** First answer that is not omitted, else the last one. */
const firstShown = ( ...states ) => states.find( ( s ) => s && 'omitted' !== s.state ) || states[ states.length - 1 ];

/**
 * @param {string} id    Adopted atom id.
 * @param {Object} attrs Block attributes.
 * @param {string} device Device.
 * @param {string} prefix Slot prefix.
 * @param {Object} opts  `{ blockSlug, kinds, context, parallax }`.
 * @return {Object<string,{state:string,hiddenReason:(string|null)}>} §8 base to state.
 */
export function adoptedDisclosure( id, attrs, device, prefix = '', opts = {} ) {
	const o = { ...opts, adopted: true };
	const c = createContext( attrs, device, prefix, o );
	const run = ( fn ) => fn( attrs, device, prefix, o );

	switch ( id ) {
		case 'source':
			return {
				Source: shown(),
				Loading: kindIn( c, 'image', 'video' ) ? shown() : omitted(),
			};
		case 'meaning': {
			const m = run( meaningDisclosure );
			return { Alt: firstShown( m.ImageAlt, m.VideoAlt ), Decorative: m.ImageDecorative };
		}
		case 'object-fit': {
			const m = run( objectFitDisclosure );
			const f = run( focalDisclosure );
			return { Fit: c.background ? m.Size : m.ObjectFit, Repeat: f.Repeat, TileSize: f.Repeat };
		}
		case 'focal-point': {
			const f = run( focalDisclosure );
			return { Focal: c.background ? f.Position : f.ObjectPosition, Pinned: f.Attachment };
		}
		case 'media-padding': {
			const m = run( paddingDisclosure );
			return { Padding: m.Padding, Background: m.Padding };
		}
		case 'overlay': {
			const m = run( overlayDisclosure );
			return { ...m, OverlayBlend: m.OverlayBlendMode };
		}
		case 'opacity': {
			const m = run( opacityDisclosure );
			return { Opacity: m.Opacity, Blend: ! c.background && kindIn( c, 'image', 'video' ) ? shown() : omitted() };
		}
		case 'shadow':
			return run( shadowDisclosure );
		case 'svg-presentation': {
			const m = run( svgDisclosure );
			return { SvgLayer: m.SvgPosition, SvgTextShadow: m.SvgTextShadow };
		}
		case 'video-behaviour':
			return { Playback: kindIn( c, 'video', 'embed' ) ? shown() : omitted() };
		case 'caption':
			return run( captionDisclosure );
		case 'link':
			return run( linkDisclosure );
		case 'sizing':
		case 'shape':
		case 'layout':
		case 'filter': {
			const fn = { sizing: sizingDisclosure, shape: shapeDisclosure, layout: layoutDisclosure, filter: filterDisclosure }[ id ];
			const map = fn( attrs, device, prefix );
			// A base with no rule of its own (the hover border colour) follows its resting form.
			map.BorderColourHover = map.BorderColourHover || map.BorderColour;
			const out = {};
			Object.keys( map ).forEach( ( base ) => {
				out[ base ] = c.background || ( 'filter' === id && ! kindIn( c, 'image', 'video', 'svg' ) ) ? omitted( NOT_ON_BACKGROUNDS ) : map[ base ];
			} );
			return out;
		}
		default:
			return {};
	}
}
