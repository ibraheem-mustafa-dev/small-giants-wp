/**
 * sgs/social-icons editor logic: the children a new row starts with and the inspector's Links checklist, built
 * from the brand registry (includes/data/brand-registry.json, registry order) and the editor's Site Info data
 * (`window.sgsBlocksData.siteInfo`, Sgs_Site_Info_Binding::editor_site_info()). Pure functions, so
 * tests/js/social-icons-links.test.js covers them without an editor.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { BRANDS } from '../../utils/brand-registry';
import { boundLinkKey } from '../icon/icon-state';

/**
 * Every Site Info key a row can link, in registry order, with its registry entry.
 *
 * @type {Array<{key:string, brand:Object}>}
 */
export const LINK_KEYS = BRANDS.filter( ( b ) => b.siteInfoKey ).map( ( b ) => ( { key: b.siteInfoKey, brand: b } ) );

/**
 * The attributes of an `sgs/icon` child bound to a Site Info key, drawing that key's registry glyph.
 *
 * @param {string} key Site Info key ('phone', 'socials.whatsapp').
 * @return {Object|null} Block attributes, or null for a key the registry lacks.
 */
export function childAttributesForKey( key ) {
	const entry = LINK_KEYS.find( ( k ) => k.key === key );
	if ( ! entry ) {
		return null;
	}
	return {
		iconSource: 'brand',
		brandName: entry.brand.slug,
		metadata: { bindings: { linkUrl: { source: 'sgs/site-info', args: { key } } } },
	};
}

/**
 * The children a new row starts with: one bound icon per filled Site Info key, in registry order. With no filled
 * key (or no editor data) every key gets an icon; each shows the editor's "empty in Site Info" notice and stays
 * hidden on the site until its field is filled.
 *
 * @param {Object} siteInfo `{ [key]: { value, link, filled } }`.
 * @return {Array} An InnerBlocks template.
 */
export function templateFromSiteInfo( siteInfo ) {
	const info = siteInfo && 'object' === typeof siteInfo ? siteInfo : {};
	const filled = LINK_KEYS.filter( ( k ) => info[ k.key ]?.filled );
	return ( filled.length ? filled : LINK_KEYS ).map( ( k ) => [ 'sgs/icon', childAttributesForKey( k.key ) ] );
}

/**
 * One Links checklist row per key.
 *
 * @param {Array}    children    The row's inner blocks (`{ clientId, name, attributes }`).
 * @param {string[]} hiddenLinks The row's `hiddenLinks`.
 * @param {Object}   siteInfo    Editor Site Info data.
 * @return {Array<{key:string, label:string, filled:boolean, hasChild:boolean, checked:boolean, missing:boolean}>}
 *         `checked`: a child shows on the site row; `missing`: Site Info has a value but the row has no icon for it.
 */
export function checklistRows( children, hiddenLinks, siteInfo ) {
	const info = siteInfo && 'object' === typeof siteInfo ? siteInfo : {};
	const hidden = Array.isArray( hiddenLinks ) ? hiddenLinks : [];
	const bound = new Set( ( children || [] ).map( ( c ) => boundLinkKey( c?.attributes ) ).filter( Boolean ) );
	return LINK_KEYS.map( ( { key, brand } ) => {
		const filled = !! info[ key ]?.filled;
		const hasChild = bound.has( key );
		const label = filled
			? brand.label
			: sprintf(
					/* translators: %s: Site Info field, e.g. WhatsApp. */
					__( '%s (empty — hidden on your site)', 'sgs-blocks' ),
					brand.label
			  );
		return { key, label, filled, hasChild, checked: hasChild && ! hidden.includes( key ), missing: filled && ! hasChild };
	} );
}

/**
 * What ticking or unticking a key does: unticking keeps the child and hides it; ticking shows it again, or adds a
 * child at the end when the row has none for that key.
 *
 * @param {string}   key         Site Info key.
 * @param {boolean}  checked     The new tick state.
 * @param {Array}    children    The row's inner blocks.
 * @param {string[]} hiddenLinks The row's `hiddenLinks`.
 * @return {{hiddenLinks:string[], append:Object|null}} The next `hiddenLinks`, and the attributes of a child to
 *         append (null when none is needed).
 */
export function toggleLink( key, checked, children, hiddenLinks ) {
	const hidden = ( Array.isArray( hiddenLinks ) ? hiddenLinks : [] ).filter( ( k ) => k !== key );
	if ( ! checked ) {
		return { hiddenLinks: [ ...hidden, key ], append: null };
	}
	const hasChild = ( children || [] ).some( ( c ) => boundLinkKey( c?.attributes ) === key );
	return { hiddenLinks: hidden, append: hasChild ? null : childAttributesForKey( key ) };
}
