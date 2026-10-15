/**
 * Stand-ins for the core controls the Hover panel's rendered tests operate: a select, a radio group, a number and a
 * text input, each labelled the way core labels them. Loaded by `jest.mock` in `motion-hover-panel-controls.test.js`.
 */
module.exports = () => {
	const R = require( 'react' );
	const base = jest.requireActual( '@wordpress/components' );
	const Group = R.createContext( null );
	const over = {
		PanelBody: ( { title, children } ) =>
			R.createElement(
				'section',
				null,
				R.createElement( 'h2', null, title ),
				children
			),
		SelectControl: ( { label, value, options, onChange } ) =>
			R.createElement(
				'select',
				{
					'aria-label': label,
					value,
					onChange: ( e ) => onChange( e.target.value ),
				},
				options.map( ( o ) =>
					R.createElement(
						'option',
						{ key: o.value, value: o.value },
						o.label
					)
				)
			),
		__experimentalToggleGroupControl: ( {
			label,
			value,
			onChange,
			children,
		} ) =>
			R.createElement(
				Group.Provider,
				{ value: { value, onChange } },
				R.createElement(
					'div',
					{ role: 'radiogroup', 'aria-label': label },
					children
				)
			),
		__experimentalToggleGroupControlOption: ( { value, label } ) => {
			const group = R.useContext( Group );
			return R.createElement(
				'button',
				{
					role: 'radio',
					'aria-checked': group.value === value,
					onClick: () => group.onChange( value ),
				},
				label
			);
		},
		__experimentalNumberControl: ( { label, value, onChange } ) =>
			R.createElement( 'input', {
				'aria-label': label,
				value: value ?? '',
				onChange: ( e ) => onChange( e.target.value ),
			} ),
		TextControl: ( { label, value, onChange } ) =>
			R.createElement( 'input', {
				'aria-label': label,
				value: value ?? '',
				onChange: ( e ) => onChange( e.target.value ),
			} ),
		Notice: ( { children } ) =>
			R.createElement( 'div', { role: 'alert' }, children ),
	};
	return new Proxy( over, {
		get: ( t, k ) => ( k in t ? t[ k ] : base[ k ] ),
	} );
};
