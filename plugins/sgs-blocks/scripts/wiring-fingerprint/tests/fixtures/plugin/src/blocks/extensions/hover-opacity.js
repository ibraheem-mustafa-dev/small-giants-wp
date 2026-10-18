import { addFilter } from '@wordpress/hooks';

addFilter( 'editor.BlockEdit', 'sgs/hover-opacity', ( Edit ) => ( props ) => {
	const { attributes, setAttributes } = props;
	return <RangeControl value={ attributes.sgsFixtureHoverOpacity } onChange={ ( v ) => setAttributes( { sgsFixtureHoverOpacity: v } ) } />;
} );
