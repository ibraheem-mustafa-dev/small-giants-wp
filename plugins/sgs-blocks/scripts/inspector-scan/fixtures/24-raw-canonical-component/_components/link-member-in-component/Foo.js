import * as BE from '@wordpress/block-editor';

export default function Foo( { value, onChange } ) {
	return wp.element.createElement( BE.URLInput, { value, onChange } );
}
