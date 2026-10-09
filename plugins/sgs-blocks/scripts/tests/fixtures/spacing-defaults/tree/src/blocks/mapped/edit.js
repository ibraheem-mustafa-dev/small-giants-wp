import { SgsBoxControl, ResponsiveOverride, ResponsiveBoxControl } from '../../components';

const BOXES = [ [ 'asidePadding', 'Aside' ], [ 'footPadding', 'Foot' ] ];

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			{ BOXES.map( ( [ attr, label ] ) => (
				<ResponsiveBoxControl
					key={ attr }
					label={ label }
					presets
					values={ { base: attributes[ attr ]?.desktop ?? {} } }
					onChange={ ( tier, next ) => setAttributes( { [ attr ]: { desktop: next } } ) }
				/>
			) ) }
		</>
	);
}
