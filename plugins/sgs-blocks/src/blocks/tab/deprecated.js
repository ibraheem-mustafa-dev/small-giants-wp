/**
 * Tab block — v1 deprecation.
 *
 * Original save() used <InnerBlocks.Content /> which serialised the
 * inner block paragraph HTML as the block's innerHTML. When save() was
 * later changed to null, the stored paragraph HTML no longer matched,
 * causing validation errors.
 *
 * This deprecation bridges that gap: v1 save returns <InnerBlocks.Content />
 * to match the stored HTML, migrate() passes attributes through unchanged.
 */

import { InnerBlocks } from '@wordpress/block-editor';

const v1 = {
	attributes: {
		label: { type: 'string', default: 'Tab' },
	},
	supports: {
		html:     false,
		reusable: false,
	},
	save: () => <InnerBlocks.Content />,
	migrate: ( attributes ) => attributes,
};

export default [ v1 ];
