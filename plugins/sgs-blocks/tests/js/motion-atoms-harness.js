/**
 * Shared test harness for the motion atoms' render tests (Spec 38A FR-38A-54): the stand-ins for core's inputs, a
 * minimal `@wordpress/blocks`, and the schema assertion. Require this file FIRST in a test, before anything under
 * `src/components/motion/`, so the mocks are registered before the atoms load.
 *
 * Core's inputs are replaced by stand-ins that expose their props, so a test operates a control and reads what the atom
 * wrote. `@wordpress/blocks` is a webpack external (not installed), so the round trip uses a small comment-delimiter
 * serialiser and parser that follow the block grammar for a comment-stored object attribute.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { act } = require( 'react' );

// The editor atoms read the build-time extract; loading the whole schema into the editor bundle is a failure.
jest.mock( '../../schemas/motion.schema.json', () => {
	throw new Error( 'the atoms must not load the whole motion schema' );
} );

// Real i18n, so positional placeholders (%1$s) format as they do in WordPress.
jest.mock( '@wordpress/i18n', () => jest.requireActual( '../../node_modules/@wordpress/i18n' ) );

jest.mock( '@wordpress/icons', () => ( {
	link: require( 'react' ).createElement( 'i', { 'data-icon': 'link' } ),
} ) );

jest.mock( '@wordpress/data', () => ( {
	useSelect: ( fn ) =>
		fn( ( store ) =>
			store === 'core/editor'
				? { getDeviceType: () => global.__motionDevice || 'Desktop' }
				: { getMedia: () => null }
		),
} ) );

jest.mock( '@wordpress/block-editor', () => {
	const R = require( 'react' );
	return {
		useSettings: () => [ undefined ],
		MediaUploadCheck: ( { children } ) => R.createElement( R.Fragment, null, children ),
		MediaUpload: ( { onSelect, render } ) =>
			render( { open: () => onSelect( global.__motionPickedMedia ) } ),
	};
} );

jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const el = R.createElement;
	const Field = ( { label, value, onChange, min, max, step, placeholder } ) =>
		el( 'input', {
			'aria-label': label,
			'data-min': min,
			'data-max': max,
			'data-step': step,
			placeholder,
			value: value ?? '',
			onChange: ( e ) => onChange( e.target.value ),
		} );
	const mocked = {
		SelectControl: ( { label, value, options, onChange } ) =>
			el(
				'select',
				{ 'aria-label': label, value, onChange: ( e ) => onChange( e.target.value ) },
				options.map( ( o ) => el( 'option', { key: o.value, value: o.value }, o.label ) )
			),
		TextControl: Field,
		__experimentalNumberControl: Field,
		__experimentalUnitControl: Field,
		Button: ( { children, onClick, ...rest } ) =>
			el(
				'button',
				{
					type: 'button',
					onClick,
					'aria-label': rest[ 'aria-label' ],
					disabled: rest.disabled,
					'aria-busy': rest[ 'aria-busy' ],
				},
				children
			),
		ToggleControl: ( { label, checked, onChange } ) =>
			el( 'input', {
				type: 'checkbox',
				'aria-label': label,
				checked: !! checked,
				onChange: ( e ) => onChange( e.target.checked ),
			} ),
		BaseControl: ( { label, children } ) => el( 'div', { role: 'group', 'aria-label': label }, children ),
		Flex: ( { children } ) => el( 'div', null, children ),
		FlexBlock: ( { children } ) => el( 'div', null, children ),
		FlexItem: ( { children } ) => el( 'div', null, children ),
		// No aria-label: the value box keeps the field's accessible name, so a query by label finds one input.
		RangeControl: ( { value, min, max, step } ) =>
			el( 'input', { type: 'range', 'data-testid': 'slider', value, min, max, step, readOnly: true } ),
		__experimentalToggleGroupControl: ( { label, value, onChange, children } ) =>
			el(
				'div',
				{ role: 'radiogroup', 'aria-label': label, 'data-value': value },
				R.Children.map( children, ( child ) =>
					el(
						'button',
						{
							type: 'button',
							role: 'radio',
							'data-option': child.props.value,
							onClick: () => onChange( child.props.value ),
						},
						child.props.label
					)
				)
			),
		__experimentalToggleGroupControlOption: () => null,
	};
	// SgsLengthControl labels itself with `<BaseControl.VisualLabel>`, as core ships it.
	mocked.BaseControl.VisualLabel = ( { children } ) => el( 'span', null, children );
	return mocked;
} );

jest.mock( '../../src/components/DesignTokenPicker', () => ( {
	__esModule: true,
	default: ( { label, value, onChange, linked } ) =>
		require( 'react' ).createElement( 'input', {
			'aria-label': label,
			'data-linked': String( linked ),
			value,
			onChange: ( e ) => onChange( e.target.value ),
		} ),
} ) );

// A minimal @wordpress/blocks: registration, and the comment-delimited serialise and parse of a stored attribute.
jest.mock( '@wordpress/blocks', () => {
	const registered = {};
	return {
		registerBlockType: ( name, settings ) => {
			registered[ name ] = settings;
			return settings;
		},
		getBlockType: ( name ) => registered[ name ],
		serialize: ( blocks ) =>
			blocks
				.map( ( block ) => {
					const defs = registered[ block.name ].attributes;
					const stored = Object.fromEntries(
						Object.entries( block.attributes ).filter(
							( [ key, v ] ) => defs[ key ] && v !== undefined && v !== defs[ key ].default
						)
					);
					return `<!-- wp:${ block.name } ${ JSON.stringify( stored ) } /-->`;
				} )
				.join( '\n' ),
		parse: ( content ) => {
			const match = /^<!-- wp:(\S+) (\{.*\}) \/-->$/s.exec( content );
			if ( ! match ) {
				return [];
			}
			const defs = registered[ match[ 1 ] ].attributes;
			const raw = JSON.parse( match[ 2 ] );
			// A stored value of the wrong type is dropped, as the real parser does for a comment attribute.
			const kept = Object.fromEntries(
				Object.entries( raw ).filter( ( [ key, v ] ) => {
					const type = defs[ key ]?.type;
					return type === 'object' ? v && typeof v === 'object' && ! Array.isArray( v ) : !! type;
				} )
			);
			return [ { name: match[ 1 ], attributes: kept, innerBlocks: [] } ];
		},
	};
} );

const { validateField } = require( '../../src/components/motion/field-types' );

// The full schema is read as data for field nodes and the Ajv witness; it is never imported as a module.
const SCHEMA = JSON.parse(
	fs.readFileSync( path.join( __dirname, '..', '..', 'schemas', 'motion.schema.json' ), 'utf8' )
);
const DEFS = SCHEMA.$defs;
const HOVER = DEFS.HoverStateValues.properties;

function setText( el, value ) {
	const setter = Object.getOwnPropertyDescriptor( Object.getPrototypeOf( el ), 'value' ).set;
	act( () => {
		setter.call( el, value );
		el.dispatchEvent( new Event( el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true } ) );
	} );
}
const click = ( el ) => act( () => el.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) ) );


// The schema assertion: a value is accepted only when the field type and Ajv over the full schema both accept it.
const Ajv = require( 'ajv' );
const ajv = new Ajv( { extendRefs: true, unknownFormats: 'ignore', logger: false } );
function assertSchemaValid( type, value, fieldNode = null ) {
	if ( value === undefined ) {
		return;
	}
	const verdict = validateField( type, value, fieldNode );
	if ( ! verdict.ok ) {
		throw new Error( `not schema-valid: ${ verdict.error }` );
	}
	const node = { $ref: `#/$defs/${ type }`, ...( fieldNode || {} ) };
	if ( ! ajv.compile( { $defs: DEFS, ...node } )( value ) ) {
		throw new Error( `Ajv refuses ${ JSON.stringify( value ) } as a ${ type }` );
	}
}
const allValid = ( type, emitted, fieldNode ) => emitted.forEach( ( v ) => assertSchemaValid( type, v, fieldNode ) );

module.exports = { DEFS, HOVER, ajv, setText, click, assertSchemaValid, allValid };
