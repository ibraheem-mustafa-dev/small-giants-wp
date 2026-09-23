/**
 * Google Reviews — editor preview logic (pure, no WordPress imports).
 *
 * Kept apart from editor-preview.js so it can be unit-tested without the editor runtime.
 *
 * WHY attributes are sanitised before ServerSideRender sees them
 * --------------------------------------------------------------
 * `<ServerSideRender>` sends its `attributes` prop as REST query args. `@wordpress/url`'s
 * `addQueryArgs` turns a JS `null` into an EMPTY STRING, and the `/wp/v2/block-renderer`
 * route then validates that string against the block's own attribute schema. A `null`
 * against a typed attribute (`boolean`, `number`, `object`) fails as `rest_invalid_param`,
 * the request 400s and the canvas shows "Preview failed to load". An omitted key is never
 * validated at all, and render.php reads every attribute through an `??` default, so
 * dropping a null changes nothing about what the server renders. The same holds for a
 * `null` nested inside an object or an array item (a written review with `photo: null`).
 *
 * Checked 2026-09-21 (after the redesign, 316 attributes): none declares a null default, so
 * the guard protects values that arrive at runtime (an editor control clearing a value with
 * `undefined`/`null`, a converter-emitted object with a null leaf) rather than defaults.
 *
 * The same route also rejects a value outside an attribute's `enum`, and an attribute block.json
 * does not declare. Controls therefore never store '' in an enum that lacks it (see
 * `borderStyleValue` in components/panel-kit.js), and tests/js/google-reviews-panels.test.js
 * asserts every enum default is a member of its own enum.
 *
 * @package SGS\Blocks
 */

/**
 * Recursively remove `null` and `undefined` from a value. `false`, `0` and `''` are real
 * values and are kept. Arrays keep their order; a null item is dropped from the array.
 *
 * Takes ONE argument and returns the same attributes minus the nulls, so it is a pass-through
 * wrapper in the sense check-editor-render-parity.js accepts for `attributes={ omitNullish(
 * attributes ) }`: every attribute still reaches the server render.
 *
 * @param {*} value Any attribute value.
 * @return {*} The value without null/undefined leaves.
 */
export function omitNullish( value ) {
	if ( Array.isArray( value ) ) {
		return value.filter( ( item ) => null !== item && undefined !== item ).map( omitNullish );
	}
	if ( value && 'object' === typeof value ) {
		const out = {};
		for ( const key of Object.keys( value ) ) {
			if ( null !== value[ key ] && undefined !== value[ key ] ) {
				out[ key ] = omitNullish( value[ key ] );
			}
		}
		return out;
	}
	return value;
}

/**
 * Whether the canvas shows the "invented sample reviews" notice above the preview.
 *
 * Only when the author picked "Sample reviews". Real data (written, Google, or Automatic) is
 * never labelled as invented.
 *
 * "Nothing to show" is deliberately NOT decided here. The server renders nothing when there
 * are no real reviews (no written reviews, no place ID, or no live Google data), and
 * ServerSideRender then shows its empty-state placeholder. Deciding it in JS as well would
 * be a second copy of `sgs_reviews_resolve()` that drifts (the canvas cannot check Google).
 *
 * @param {Object} attributes The block's attributes.
 * @return {boolean} True when the sample notice belongs above the preview.
 */
export function showsSampleNotice( attributes ) {
	return 'placeholder' === ( attributes || {} ).dataSource;
}
