/**
 * The icon shapes in the editor: the box shapes style.css draws, and the custom outlines read from the same
 * `includes/data/icon-shapes.json` PHP reads through `includes/helpers-icon.php::sgs_icon_outline_shapes()`, so there
 * is one list. Every function below is the twin of a PHP function of the same purpose;
 * `tests/js/icon-shapes-parity.test.js` runs both and compares them.
 *
 * @package SGS\Blocks
 */

import registry from '../../includes/data/icon-shapes.json';

/** The shapes style.css draws as a box (background and CSS border). Twin: sgs_icon_box_shapes(). */
export const BOX_SHAPES = Object.freeze( [ 'square', 'circle', 'pill' ] );

const PATH = /^[MLHVCSQTAZmlhvcsqtaz0-9.,\s-]+$/;

/**
 * The custom outlines in registry order, with the same validation as `sgs_icon_outline_shapes()`.
 *
 * @type {Array<{slug:string, label:string, d:string}>}
 */
export const OUTLINE_SHAPES = Object.freeze(
	( Array.isArray( registry?.shapes ) ? registry.shapes : [] )
		.map( ( entry ) => ( {
			slug: 'string' === typeof entry?.slug ? entry.slug : '',
			label: 'string' === typeof entry?.label ? entry.label : String( entry?.slug ?? '' ),
			d: 'string' === typeof entry?.d ? entry.d.trim() : '',
		} ) )
		.filter( ( entry ) => /^[a-z][a-z0-9-]*$/.test( entry.slug ) && ! BOX_SHAPES.includes( entry.slug ) && PATH.test( entry.d ) )
);

/** Every `shape` value an icon accepts, box shapes first. Twin: sgs_icon_shape_slugs(). */
export const SHAPE_SLUGS = Object.freeze( [ ...BOX_SHAPES, ...OUTLINE_SHAPES.map( ( s ) => s.slug ) ] );

/**
 * @param {string} shape A `shape` value.
 * @return {Object|null} The outline entry, or null for a box shape or unknown value.
 */
export function outlineShape( shape ) {
	return OUTLINE_SHAPES.find( ( s ) => s.slug === shape ) || null;
}

/**
 * @param {string} shape A `shape` value.
 * @return {boolean} True for a custom outline. Twin: sgs_icon_is_outline_shape().
 */
export function isOutlineShape( shape ) {
	return null !== outlineShape( shape );
}

/**
 * @param {string} shape A `shape` value.
 * @return {boolean} True when the height always equals the width (circle and outlines). Twin: sgs_icon_shape_width_only().
 */
export function shapeUsesWidthOnly( shape ) {
	return 'circle' === shape || isOutlineShape( shape );
}
