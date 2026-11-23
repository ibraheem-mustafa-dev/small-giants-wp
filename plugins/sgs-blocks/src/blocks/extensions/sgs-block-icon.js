/**
 * Every SGS block's inserter icon in SGS teal.
 *
 * The custom icons in utils/icons.js carry the teal foreground; a block whose block.json names a dashicon carried
 * none, so the inserter showed some SGS blocks teal and others in WordPress's own grey. This filter gives every
 * `sgs/*` block, and each of its variations with an icon, the teal foreground (a colour the icon already sets is
 * kept). It runs before the other registration filters (priority 5), so the site-default variation
 * (block-defaults.js) copies the teal icon.
 *
 * @package SGS\Blocks
 */

import { addFilter } from '@wordpress/hooks';
import { isValidElement } from '@wordpress/element';
import { SGS_TEAL } from '../../utils/icons';

/**
 * An icon as `{ src, foreground }` with the SGS teal foreground: a name, an element or a component becomes the
 * `src`; an icon object keeps its own foreground; no icon becomes WordPress's default block icon in teal.
 *
 * @param {*} icon A block or variation icon.
 * @return {Object} The icon object.
 */
export function withSgsTeal( icon ) {
	if (
		icon &&
		'object' === typeof icon &&
		! isValidElement( icon ) &&
		'src' in icon
	) {
		return icon.foreground ? icon : { ...icon, foreground: SGS_TEAL };
	}
	return { src: icon || 'block-default', foreground: SGS_TEAL };
}

/**
 * @param {Object} settings Block settings.
 * @param {string} name     Block name.
 * @return {Object} Settings with teal icons for an SGS block.
 */
export function tealBlockIcon( settings, name ) {
	if ( 'string' !== typeof name || ! name.startsWith( 'sgs/' ) ) {
		return settings;
	}
	const out = { ...settings, icon: withSgsTeal( settings.icon ) };
	if ( Array.isArray( settings.variations ) ) {
		out.variations = settings.variations.map( ( v ) =>
			v && v.icon ? { ...v, icon: withSgsTeal( v.icon ) } : v
		);
	}
	return out;
}

addFilter(
	'blocks.registerBlockType',
	'sgs/teal-block-icon',
	tealBlockIcon,
	5
);
