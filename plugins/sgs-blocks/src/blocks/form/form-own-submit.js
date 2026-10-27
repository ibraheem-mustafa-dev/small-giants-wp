/**
 * Whether a form holds its own submit button: an sgs/button set as a submit button (isSubmit) at any depth among its
 * blocks. The editor mirror of includes/helpers-form-own-submit.php::sgs_form_has_own_submit, which render.php uses to
 * leave out the built-in submit button.
 *
 * @param {Array<{name: string, attributes?: Object, innerBlocks?: Array}>} blocks Editor blocks (core/block-editor getBlocks()).
 * @return {boolean} True when one of them is a submit button.
 */
export function hasOwnSubmit( blocks ) {
	return ( blocks || [] ).some(
		( block ) =>
			( 'sgs/button' === block?.name && !! block.attributes?.isSubmit ) ||
			hasOwnSubmit( block?.innerBlocks )
	);
}
