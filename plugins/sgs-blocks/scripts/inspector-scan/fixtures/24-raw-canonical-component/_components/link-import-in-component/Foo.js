import { LinkControl } from '@wordpress/block-editor';

export default function Foo( { value, onChange } ) {
	return <LinkControl value={ value } onChange={ onChange } />;
}
