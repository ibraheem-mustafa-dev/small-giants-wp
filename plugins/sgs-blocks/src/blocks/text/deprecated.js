/**
 * deprecated.js — sgs/text block deprecation records.
 *
 * v1: blocks saved when `variantStyle` was a scalar attribute (enum:
 * default/quote/caption/lead). The attribute has been replaced by proper
 * WordPress block styles (is-style-quote / is-style-caption / is-style-lead).
 *
 * Migration: moves the old `variantStyle` value into `className` as the
 * canonical `is-style-{value}` string so existing posts continue to render
 * correctly after the next editor save.
 *
 * sgs/text is a dynamic block (save.js returns null), so no `save()` function
 * is required on the deprecation record — WordPress only needs `attributes`,
 * `isEligible`, and `migrate` to perform the migration at parse time.
 */

/**
 * v1 — variantStyle scalar attribute era.
 */
const v1 = {
	attributes: {
		text: {
			type: 'string',
			default: '',
			role: 'content',
		},
		tag: {
			type: 'string',
			enum: [ 'p', 'span', 'div', 'blockquote', 'em', 'strong' ],
			default: 'p',
		},
		variantStyle: {
			type: 'string',
			enum: [ 'default', 'quote', 'caption', 'lead' ],
			default: 'default',
		},
	},

	/**
	 * Only trigger migration when a non-default variantStyle was saved.
	 * Blocks with variantStyle === 'default' (or absent) need no change.
	 *
	 * @param {Object} attributes Stored block attributes.
	 * @return {boolean} True when migration is required.
	 */
	isEligible( attributes ) {
		return (
			typeof attributes.variantStyle === 'string' &&
			attributes.variantStyle !== 'default' &&
			attributes.variantStyle !== ''
		);
	},

	/**
	 * Migrate old variantStyle value into className as `is-style-{value}`.
	 * Preserves any existing className the editor may have assigned.
	 *
	 * @param {Object} attributes Stored block attributes.
	 * @return {Object} Migrated attributes with variantStyle removed.
	 */
	migrate( attributes ) {
		const { variantStyle, ...rest } = attributes;
		const styleClass = 'is-style-' + variantStyle;
		const existingClass = rest.className || '';
		const merged = [ existingClass, styleClass ]
			.filter( Boolean )
			.join( ' ' );
		return { ...rest, className: merged };
	},

	/**
	 * Dynamic block — save returns null; WordPress only stores the block
	 * comment + JSON attributes, render.php handles all output.
	 *
	 * @return {null}
	 */
	save() {
		return null;
	},
};

export default [ v1 ];
