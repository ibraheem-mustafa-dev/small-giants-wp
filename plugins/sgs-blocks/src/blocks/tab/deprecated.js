/**
 * SGS Tab — deprecation history.
 *
 * v1: Original shape. save returned null, so no InnerBlocks HTML was written
 * to post_content. Existing posts serialised as <!-- wp:sgs/tab {"label":"…"} /-->
 * (self-closing, empty innerHTML). When the editor validates such a post against
 * the new save output (a <div> wrapping <InnerBlocks.Content />), it would throw
 * "unexpected content". This entry matches the stored null shape and migrates
 * attributes unchanged — block.json defaults cover all current attributes.
 *
 * No migrate() needed: the only attribute is `label` (string), which is identical
 * in the old and new schemas.
 */
const v1 = {
	attributes: {
		label: {
			type: 'string',
			default: 'Tab',
			role: 'content',
		},
	},
	supports: {
		html: false,
		reusable: false,
	},
	save() {
		return null;
	},
};

export default [ v1 ];
