/**
 * Deprecations — sgs/accordion-item.
 *
 * v1 — the original shape shipped with save: () => null.
 *
 * Existing posts stored no serialised child markup in post_content because the
 * null save never wrote InnerBlocks HTML. WordPress matches the stored block
 * comment (attributes only, no innerHTML) against v1's null-save and accepts
 * it. The migrate() function is a no-op — attributes are unchanged; child
 * blocks are untouched (they are always re-rendered from the editor tree, not
 * from saved innerHTML). On the next editor save the current save.js takes
 * over and persists <InnerBlocks.Content /> correctly.
 */

const v1 = {
	/**
	 * Attribute schema must exactly match the block.json schema that was live
	 * when these posts were saved (title + isOpen, no other custom attrs).
	 */
	attributes: {
		title: {
			type: 'string',
			default: '',
		},
		isOpen: {
			type: 'boolean',
			default: false,
		},
	},

	/**
	 * supports must match the block.json supports at the time of the original save.
	 * accordion-item had html:false and reusable:false — no other supports were set.
	 */
	supports: {
		html: false,
		reusable: false,
	},

	/**
	 * The original save returned null. WordPress stored no innerHTML in the block
	 * comment, so null is the only valid match for pre-existing posts.
	 *
	 * @return {null} No serialised output.
	 */
	save() {
		return null;
	},

	/**
	 * Attributes are unchanged between v1 and the current schema — pass through
	 * as-is. No field renames, no new required attrs.
	 *
	 * @param {Object} attributes Existing block attributes.
	 * @return {Object} Unchanged attributes for the current schema.
	 */
	migrate( attributes ) {
		return { ...attributes };
	},
};

export default [ v1 ];
