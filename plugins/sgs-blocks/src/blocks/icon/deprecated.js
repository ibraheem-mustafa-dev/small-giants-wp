/**
 * Deprecated block definitions for sgs/icon.
 *
 * Entry 0 handles migration from the retired sgs/icon-block.
 *
 * Because sgs/icon is a dynamic block (save returns null), the editor never
 * needs to reconcile serialised HTML — the deprecated entry is used by the
 * block editor's migrate() callback when a sgs/icon-block instance is
 * converted to sgs/icon via a block transform.
 *
 * Frontend compatibility for existing sgs/icon-block content is handled by
 * a PHP compat shim in build/blocks/icon-block/render.php which maps old
 * attribute names and delegates rendering to the canonical icon render.php.
 */

const deprecated = [
	{
		/**
		 * Attribute schema from the retired sgs/icon-block block type.
		 * Differences from sgs/icon:
		 *   iconSize (number) → size (number)
		 *   shape   (string) → backgroundShape (string)
		 */
		attributes: {
			icon:             { type: 'string',  default: 'star'    },
			iconColour:       { type: 'string',  default: 'primary' },
			iconSize:         { type: 'number',  default: 48        },
			backgroundColour: { type: 'string',  default: ''        },
			link:             { type: 'string',  default: ''        },
			linkOpensNewTab:  { type: 'boolean', default: false     },
			shape:            { type: 'string',  default: 'none'    },
		},

		/**
		 * Map sgs/icon-block attribute names to the sgs/icon schema.
		 *
		 * @param {Object} oldAttrs Attributes stored under the old block name.
		 * @return {Object} Attributes compatible with the current sgs/icon schema.
		 */
		migrate( oldAttrs ) {
			const { iconSize, shape, icon, iconColour, backgroundColour, link, linkOpensNewTab } = oldAttrs;
			return {
				icon,
				size:             iconSize,
				iconColour,
				backgroundColour,
				backgroundShape:  shape,
				link,
				linkOpensNewTab,
			};
		},

		/** Dynamic block — serialised save output is always null. */
		save: () => null,
	},
];

export default deprecated;
