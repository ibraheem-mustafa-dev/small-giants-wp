/**
 * Deprecation record for sgs/icon-block.
 *
 * This block is deprecated in favour of sgs/icon, which has identical
 * functionality plus hover colour / hover scale controls and alignment support.
 *
 * The block remains registered (so existing posts continue to parse) but is
 * hidden from the inserter via supports.inserter = false.
 *
 * Both blocks are fully dynamic (render.php) so save() returns null in every
 * version. No migrate() is needed — existing posts keep their own attributes
 * and the render.php for sgs/icon-block continues to serve them correctly.
 *
 * @package SGS\Blocks
 */

export default [
	{
		attributes: {
			icon: {
				type: 'string',
				default: 'star',
			},
			iconColour: {
				type: 'string',
				default: 'primary',
			},
			iconSize: {
				type: 'number',
				default: 48,
			},
			backgroundColour: {
				type: 'string',
				default: '',
			},
			link: {
				type: 'string',
				default: '',
			},
			linkLabel: {
				type: 'string',
				default: '',
			},
			linkOpensNewTab: {
				type: 'boolean',
				default: false,
			},
			shape: {
				type: 'string',
				default: 'none',
			},
			sgsAnimation: {
				type: 'string',
				default: 'fade-up',
			},
			sgsAnimationDuration: {
				type: 'string',
				default: 'medium',
			},
			sgsAnimationEasing: {
				type: 'string',
				default: 'default',
			},
		},
		/**
		 * Dynamic block — save always returns null; PHP render.php owns the output.
		 *
		 * @return {null}
		 */
		save() {
			return null;
		},
	},
];
