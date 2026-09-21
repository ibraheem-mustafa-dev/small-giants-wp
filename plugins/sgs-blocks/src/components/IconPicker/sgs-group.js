/**
 * SGS icon-library group for the shared IconPicker.
 *
 * The SGS library (assets/icons/sgs-icons.json) holds generic pictograms promoted
 * from client drafts. Its slugs render through the same `sgs_get_lucide_icon()` PHP
 * map as Lucide (scripts/generate-icons.js merges them), so the block stores
 * { source: 'lucide', name: '<slug>' } and nothing else changes. Here they are
 * merged into the Lucide dataset in the picker and shown under their own "SGS"
 * category. Lucide names are reserved, so a library slug can never shadow one.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';

/** Category key the SGS group lives under (also the search tag on each SGS icon). */
export const SGS_CATEGORY_KEY = '__sgs__';
const SGS_TAG = 'sgs';

/**
 * Merge the SGS library into a loaded Lucide dataset without mutating it.
 *
 * @param {{map:Object, tags:Object}} lucide Lucide map + tags.
 * @param {Object}                    sgs    SGS library { slug: svg } (may be empty / invalid).
 * @return {{map:Object, tags:Object, names:string[], sgsNames:string[]}} Merged dataset.
 */
export function mergeSgsIcons( lucide, sgs ) {
	const map = { ...lucide.map };
	const tags = { ...lucide.tags };
	const sgsNames = [];
	if ( sgs && 'object' === typeof sgs && ! Array.isArray( sgs ) ) {
		for ( const slug of Object.keys( sgs ).sort() ) {
			// Own-property test, matching scripts/generate-icons.js (`has`). `slug in map`
			// walks the prototype chain, so a slug such as `constructor` looked "reserved"
			// here while the generator accepted it and the frontend rendered it.
			// `__proto__` can never be a plain map key, so it is skipped outright.
			if (
				'string' !== typeof sgs[ slug ] ||
				'__proto__' === slug ||
				Object.prototype.hasOwnProperty.call( lucide.map, slug )
			) {
				continue;
			}
			map[ slug ] = sgs[ slug ];
			tags[ slug ] = [ SGS_TAG ];
			sgsNames.push( slug );
		}
	}
	return { map, tags, names: Object.keys( map ), sgsNames };
}

/**
 * Put an "SGS" category directly after "All". The tag-derived 'sgs' bucket that
 * buildLucideCategories() creates for these icons is replaced by it. With an empty
 * library nothing is added, so the picker looks exactly as before.
 *
 * @param {Array<{key:string,label:string,names:string[]}>} categories Lucide categories.
 * @param {string[]}                                        sgsNames   Library slugs.
 * @return {Array<{key:string,label:string,names:string[]}>} Categories with the SGS group.
 */
export function withSgsCategory( categories, sgsNames ) {
	if ( ! sgsNames || ! sgsNames.length ) {
		return categories;
	}
	const rest = categories.filter( ( c ) => SGS_TAG !== c.key );
	const [ all, ...others ] = rest;
	return [
		all,
		{ key: SGS_CATEGORY_KEY, label: __( 'SGS', 'sgs-blocks' ), names: sgsNames },
		...others,
	];
}
