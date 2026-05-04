import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block — render.php handles frontend output.
 * Save stores the InnerBlocks content inside a wrapper div for
 * correct block serialisation and validation.
 */
export default function save() {
	return (
		<div { ...useBlockProps.save() }>
			<InnerBlocks.Content />
		</div>
	);
}
