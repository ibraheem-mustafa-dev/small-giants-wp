/**
 * Every atom's C3 emitter, in print order, which is alphabetical by atom id (PHP's `sgs_media_atom_emitter_ids()` sorts by id). `mediaPreview()` and the tests collect a slot's CSS through this map; PHP's
 * counterpart is the `sgs_media_atom_<id>_emit()` functions. Importing the `shape` atom registers the mask shapes the
 * shadow and overlay emitters ask about.
 *
 * @package SGS\Blocks
 */

import { emit as boxShape } from '../atoms/box-shape.js';
import { emit as caption } from '../atoms/caption.js';
import { emit as filter } from '../atoms/filter.js';
import { emit as focalPoint } from '../atoms/focal-point.js';
import { emit as intrinsic } from '../atoms/intrinsic.js';
import { emit as layout } from '../atoms/layout.js';
import { emit as link } from '../atoms/link.js';
import { emit as mediaPadding } from '../atoms/media-padding.js';
import { emit as mediaType } from '../atoms/media-type.js';
import { emit as meaning } from '../atoms/meaning.js';
import { emit as objectFit } from '../atoms/object-fit.js';
import { emit as opacity } from '../atoms/opacity.js';
import { emit as overlay } from '../atoms/overlay.js';
import { emit as shadow } from '../atoms/shadow.js';
import { emit as shape } from '../atoms/shape.js';
import { emit as sizing } from '../atoms/sizing.js';
import { emit as source } from '../atoms/source.js';
import { emit as svgPresentation } from '../atoms/svg-presentation.js';
import { emit as videoBehaviour } from '../atoms/video-behaviour.js';

export const MEDIA_EMITTERS = Object.freeze( {
	'box-shape': boxShape,
	caption,
	filter,
	'focal-point': focalPoint,
	intrinsic,
	layout,
	link,
	meaning,
	'media-padding': mediaPadding,
	'media-type': mediaType,
	'object-fit': objectFit,
	opacity,
	overlay,
	shadow,
	shape,
	sizing,
	source,
	'svg-presentation': svgPresentation,
	'video-behaviour': videoBehaviour,
} );

/**
 * The CSS of one slot: every atom's rules, in print order (alphabetical by atom id).
 *
 * @param {Object}  slot   Slot `{ prefix, kinds, context, wrapper }`.
 * @param {Object}  attrs  Attributes.
 * @param {string}  uid    Scope class, without the dot.
 * @param {boolean} helper Whether the helper is printed.
 * @return {string} CSS.
 */
export function emitSlot( slot, attrs, uid, helper ) {
	return Object.values( MEDIA_EMITTERS )
		.map( ( emit ) => emit( slot, attrs, uid, helper ) )
		.join( '' );
}
