import { LinkControl } from '@wordpress/block-editor';

// The canonical link wrapper's own internals mount core LinkControl by design.
export default function LinkPopoverContent( { value, onChange } ) {
	return <LinkControl value={ value } onChange={ onChange } />;
}
