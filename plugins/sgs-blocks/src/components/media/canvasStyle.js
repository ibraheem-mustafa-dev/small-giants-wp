/**
 * L4 (JS half) — the media element's CANVAS style composer.
 *
 * The JS twin of `sgs_media_element_style()` / `SGS_Media_Element`
 * (PHP — `includes/helpers-media-element.php` +
 * `includes/class-sgs-media-element.php`). PHP composes a scoped `<style>`
 * rule for the FRONTEND, and `sgs/before-after`'s editor canvas gets the
 * same treatment for free because it renders via `<ServerSideRender>` (a
 * real REST call into render.php). This module exists for the blocks that
 * render their OWN React canvas markup instead — `sgs/media` today, any
 * Wave 6/7 surface with a hand-built canvas element tomorrow — which never
 * call render.php while editing, so nothing ever emitted the atoms'
 * custom-property VALUES onto the canvas node and the shared stylesheet's
 * `var(--sgs-media-*, default)` rules silently fell back to their defaults
 * no matter what the client set.
 *
 * ⛔ Root cause, confirmed live 2026-09-01: `sgs/media/edit.js`'s canvas
 * `<img>` carried `className="sgs-media__img"` only — never the universal
 * `.sgs-media-el` marker the shared stylesheet (`assets/css/media-
 * element.css`) keys on, and never any per-instance scope class. Changing
 * object-fit/opacity/etc in the inspector updated the attribute correctly
 * but the canvas never visibly reacted, because the marker+value mechanism
 * `class-sgs-media-element.php` builds for the frontend was never mirrored
 * into the editor's own React tree.
 *
 * ── Why inline custom properties, not an injected class + stylesheet ───────
 * PHP scopes each element's VALUES to a unique CLASS
 * (`sgs_media_element_scope_class()`) because it prints ONE shared
 * `<style>` block that may hold rules for SEVERAL media elements on the same
 * page (`sgs/before-after`'s before/after slots) — the class is what stops
 * a second element's values from colliding with the first's on the fixed
 * custom-property names. A single React canvas node has no such collision
 * risk: setting the same custom properties directly as INLINE VALUES on
 * that one element reaches the identical effective result — the shared,
 * globally-enqueued `media-element.css` reads `var(--sgs-media-x, default)`
 * on `.sgs-media-el`, and an inline custom-property VALUE on that exact
 * node always wins the cascade — without printing a second stylesheet into
 * the iframe. This is a custom-property VALUE override, not a competing
 * property declaration: allowed under Spec 32's "no inline style PROPERTY
 * declaration" rule, which targets real CSS properties (colour, padding,
 * …), not custom-property values feeding a rule that already exists in the
 * shared sheet.
 *
 * `elementScopeClass()` is still exported and still meant to be applied to
 * a canvas node — not because inline values need it (they don't), but
 * because a future multi-element canvas block (the `sgs/before-after` shape
 * reproduced in React rather than via ServerSideRender) will, and a second
 * implementation invented at that point would drift from this one.
 *
 * @package SGS\Blocks
 */
import { MEDIA_ATOMS } from './atoms/registry.js';

import { css as sourceCss } from './atoms/source.js';
import { css as mediaTypeCss } from './atoms/media-type.js';
import { css as videoBehaviourCss } from './atoms/video-behaviour.js';
import { css as meaningCss } from './atoms/meaning.js';
import { css as intrinsicCss } from './atoms/intrinsic.js';
import { css as svgPresentationCss } from './atoms/svg-presentation.js';
import { css as objectFitCss } from './atoms/object-fit.js';
import { css as focalPointCss } from './atoms/focal-point.js';
import { css as boxShapeCss } from './atoms/box-shape.js';
import { css as overlayCss } from './atoms/overlay.js';
import { css as motionCss } from './atoms/motion.js';
import { css as opacityCss } from './atoms/opacity.js';
import { css as shadowCss } from './atoms/shadow.js';
import { css as mediaPaddingCss } from './atoms/media-padding.js';
import { css as captionCss } from './atoms/caption.js';
import { css as linkCss } from './atoms/link.js';

/**
 * Atom id -> its `css()` function.
 *
 * Held here rather than in an `atoms/` index for the same reason
 * `MediaElementPanel.js` holds its own `ATOM_CONTROLS` map here: mirroring
 * a dispatch pattern a reader has already seen is a smaller surprise than a
 * new one, even though a barrel importing all sixteen would still satisfy
 * `check-media-atom-purity.js`'s plain-Node-importable rule for every
 * non-`.control.js` module under `atoms/`.
 */
const ATOM_CSS = {
	source: sourceCss,
	'media-type': mediaTypeCss,
	'video-behaviour': videoBehaviourCss,
	meaning: meaningCss,
	intrinsic: intrinsicCss,
	'svg-presentation': svgPresentationCss,
	'object-fit': objectFitCss,
	'focal-point': focalPointCss,
	'box-shape': boxShapeCss,
	overlay: overlayCss,
	motion: motionCss,
	opacity: opacityCss,
	shadow: shadowCss,
	'media-padding': mediaPaddingCss,
	caption: captionCss,
	link: linkCss,
};

/**
 * The per-ELEMENT scope class for one media element on a block.
 *
 * Exact JS port of `sgs_media_element_scope_class()`
 * (`includes/helpers-media-element.php`) — same sanitisation, same
 * `{uid}--{prefix}` join, same empty-uid short-circuit. Kept byte-for-byte
 * identical on purpose: a block that ever needs both the PHP path (real
 * frontend render) and a hand-built JS canvas must get the same class from
 * either.
 *
 * @param {string} uid    The block instance's uid (e.g. `clientId`).
 * @param {string} [prefix] Surface prefix ('' for a single-element block).
 * @return {string} Scope class, with no leading dot. '' when uid is empty.
 */
export function elementScopeClass( uid, prefix = '' ) {
	const safeUid = String( uid || '' ).replace( /[^a-zA-Z0-9_-]/g, '' );
	if ( '' === safeUid ) {
		return '';
	}
	if ( '' === String( prefix || '' ) ) {
		return safeUid;
	}
	const safePrefix = String( prefix )
		.replace( /[^a-zA-Z0-9]/g, '' )
		.toLowerCase();
	return '' === safePrefix ? safeUid : `${ safeUid }--${ safePrefix }`;
}

/**
 * Every declared atom's custom-property VALUES for one media element, as a
 * plain style object ready to spread onto a canvas node's `style` prop.
 *
 * JS twin of `sgs_media_element_style()`, returning a style OBJECT
 * (`{ '--sgs-media-object-fit': 'cover' }`) rather than CSS text — a React
 * canvas node takes a style object, not a stylesheet string, and there is
 * no need for the PHP version's scope-class selector wrapper when the
 * value is being set directly on the one node it belongs to.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {string}   [props.prefix]      Surface prefix ('' when unprefixed).
 * @param {string}   [props.blockSlug]   Block slug, for `STORED_AS` resolution.
 * @param {string[]} [props.atoms]       Declared atom ids for this element.
 * @return {Object} `{ '--custom-property': 'value' }` pairs, possibly empty.
 */
export function elementCustomProperties( { attributes, prefix = '', blockSlug = '', atoms = [] } ) {
	const style = {};
	( atoms || [] ).forEach( ( id ) => {
		const fn = ATOM_CSS[ id ];
		if ( ! fn ) {
			return;
		}
		const decls = fn( { attributes, prefix, blockSlug } ) || [];
		decls.forEach( ( decl ) => {
			const splitAt = decl.indexOf( ':' );
			if ( splitAt < 1 ) {
				return;
			}
			const prop = decl.slice( 0, splitAt ).trim();
			const value = decl.slice( splitAt + 1 ).trim();
			if ( prop && value ) {
				style[ prop ] = value;
			}
		} );
	} );
	return style;
}

/**
 * Does this element's CURRENT attribute values need a container to attach
 * to? JS twin of `SGS_Media_Element::requires_box()` — value-aware, not
 * declaration-aware, for the identical reason: `overlay` with no colour/
 * gradient set, or `source` on a block painting a real `<img>` rather than
 * a CSS background, must not force a wrapper nothing will use.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {string}   [props.prefix]      Surface prefix.
 * @param {string}   [props.blockSlug]   Block slug.
 * @param {string[]} [props.atoms]       Declared atom ids.
 * @return {boolean} True when at least one box atom emits real CSS for these values.
 */
export function requiresBox( { attributes, prefix = '', blockSlug = '', atoms = [] } ) {
	const boxAtomIds = ( atoms || [] ).filter(
		( id ) => MEDIA_ATOMS[ id ] && 'box' === MEDIA_ATOMS[ id ].attachesTo
	);
	return boxAtomIds.some( ( id ) => {
		const fn = ATOM_CSS[ id ];
		if ( ! fn ) {
			return false;
		}
		const decls = fn( { attributes, prefix, blockSlug } ) || [];
		return decls.length > 0;
	} );
}
