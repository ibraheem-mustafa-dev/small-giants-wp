/**
 * Runtime attribute injection for declared media elements.
 *
 * A block opts in ONCE, declaratively, and the whole key set arrives:
 *
 *   "supports": { "sgs": { "mediaElements": [
 *       { "prefix": "before", "context": "element" },
 *       { "prefix": "after",  "context": "element" }
 *   ] } }
 *
 * ⛔ INJECTION IS SELECTIVE, driven by the ATOMS an entry names. Without that a
 * single declared prefix injects all 59 bases - 109 keys once tiers are applied
 * - and a surface with three real media attributes gains a hundred nothing
 * reads. Omitting `atoms` means ALL of them, which is the honest default for a
 * layer whose premise is that a missing control is a gap; a surface that
 * genuinely needs less names what it needs:
 *
 *   { "prefix": "image", "context": "element", "atoms": [ "source", "box-shape" ] }
 *
 * Uniformity is not sorted out afterwards - it is a PRECONDITION of the
 * injection, because every key comes from one function (`mediaAttrKeys`).
 *
 * ⛔ NO CODEGEN. This is the mechanism every `sgs*` extension already uses;
 * the shape is copied from `conditional-visibility.js` deliberately rather than
 * invented. Nothing is written to disk and there is no new build step.
 *
 * ⛔ A BLOCK'S OWN DECLARATION ALWAYS WINS. Only keys the block does not already
 * declare are added, matching `extension-attrs-rest-register.php`'s stated rule
 * for the server half. This matters more here than for a new `sgs*` attribute:
 * every v1 surface ALREADY declares its media keys with real defaults, so
 * overwriting them would silently replace the client's stored defaults with
 * ours - a behaviour change wearing the clothes of a registration step.
 */

import { addFilter } from '@wordpress/hooks';

import {
	MEDIA_TIERS,
	MEDIA_TIERED_BASES,
	mediaStoredAttrName,
	mediaAttrType,
} from '../../components/MediaElementControls.js';
import {
	basesForAtoms,
	atomsForElement,
} from '../../components/media/atoms/registry.js';

/**
 * Read a block's declared media elements.
 *
 * @param {Object} settings Block settings from registerBlockType.
 * @return {Array} Declared element descriptors (empty when the block opts out).
 */
function declaredMediaElements( settings ) {
	const declared = settings?.supports?.sgs?.mediaElements;
	return Array.isArray( declared ) ? declared : [];
}

/**
 * Every attribute a descriptor contributes, as name -> definition.
 *
 * Tiers come from MEDIA_TIERED_BASES, not from group membership: presentation is
 * only PARTLY tiered, so a group-derived rule would either miss ObjectPosition
 * or invent tiers for OverlayBlendMode. Declaring attributes nothing reads is
 * the dead-control class the framework gates.
 *
 * @param {string} blockName Block slug, for STORED_AS resolution.
 * @param {Object} element   { prefix, context, atoms? }.
 * @return {Object} attribute name -> { type, default? }.
 */
function attributesForElement( blockName, element ) {
	const prefix = element?.prefix || '';
	const bases = basesForAtoms( atomsForElement( element ) );
	const out = {};

	const add = ( base, tier ) => {
		const name = mediaStoredAttrName( blockName, prefix, base + tier );
		const type = mediaAttrType( base, tier );
		const def = { type };

		// A tiered boolean defaults to null - the inherit sentinel. Everything
		// else is left WITHOUT a default so WordPress applies its own per-type
		// empty value, rather than this filter inventing one the surface never
		// had. Guessing a default here would change stored behaviour.
		if ( tier && Array.isArray( type ) ) {
			def.default = null;
		}
		out[ name ] = def;
	};

	bases.forEach( ( base ) => add( base, '' ) );
	bases
		.filter( ( base ) => MEDIA_TIERED_BASES.includes( base ) )
		.forEach( ( base ) =>
			MEDIA_TIERS.forEach( ( tier ) => add( base, tier ) )
		);

	return out;
}

/**
 * Inject the declared key sets at registration.
 *
 * @param {Object} settings Block settings.
 * @param {string} name     Block slug.
 * @return {Object} Settings, with media attributes merged in.
 */
function addMediaElementAttributes( settings, name ) {
	const elements = declaredMediaElements( settings );
	if ( ! elements.length ) {
		return settings;
	}

	const injected = {};
	elements.forEach( ( element ) => {
		Object.assign( injected, attributesForElement( name, element ) );
	} );

	// The block's own attributes are spread LAST so they win outright.
	return {
		...settings,
		attributes: {
			...injected,
			...settings.attributes,
		},
	};
}

addFilter(
	'blocks.registerBlockType',
	'sgs/media-element-attributes',
	addMediaElementAttributes
);

export { addMediaElementAttributes, attributesForElement, declaredMediaElements };
