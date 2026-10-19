import * as C from '@wordpress/components';

export { PanelBody } from '@wordpress/components';
export * from './helpers';

export default function Panel( { children } ) {
	const { TextControl } = wp.components;
	return <C.PanelBody title="Panel"><TextControl label="x" value="" onChange={ () => {} } />{ children }</C.PanelBody>;
}
