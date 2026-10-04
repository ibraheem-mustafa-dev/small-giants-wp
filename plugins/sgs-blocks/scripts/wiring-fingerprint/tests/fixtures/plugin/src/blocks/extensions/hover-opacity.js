import { addFilter } from '@wordpress/hooks';

addFilter( 'editor.BlockEdit', 'sgs/hover-opacity', ( Edit ) => ( props ) => {
	const { attributes, setAttributes } = props;
	return <RangeControl value={ attributes.sgsHoverOpacity } onChange={ ( v ) => setAttributes( { sgsHoverOpacity: v } ) } />;
} );
