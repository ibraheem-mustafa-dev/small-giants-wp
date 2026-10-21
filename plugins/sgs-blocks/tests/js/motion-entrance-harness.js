/**
 * Shared harness for the Entrance panel tests (Spec 38A M3.5): the component, data and block mocks, a panel mounted over
 * real layer operations, and the DOM helpers. Require this file FIRST in a test, before anything under `src/`, so the
 * mocks are registered before the panel loads.
 */
const React = require( 'react' );
const { act } = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { Simulate } = require( 'react-dom/test-utils' );
const { optionNode, activateOption, choiceLabels } = require( './motion-choice-helpers' );

global.IS_REACT_ACT_ENVIRONMENT = true;

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	const el = R.createElement;
	const Field = ( { label, value, onChange } ) =>
		el( 'input', {
			'aria-label': label,
			value: value ?? '',
			onChange: ( e ) => onChange( e.target.value ),
		} );
	const Button = R.forwardRef( ( { children, onClick, disabled, label, ...rest }, ref ) =>
		el(
			'button',
			{
				type: 'button',
				ref,
				onClick,
				disabled,
				'aria-label': label || rest[ 'aria-label' ],
			},
			children
		)
	);
	const mocked = {
		__esModule: true,
		Flex: ( { children } ) => el( 'div', null, children ),
		FlexBlock: ( { children } ) => el( 'div', null, children ),
		FlexItem: ( { children } ) => el( 'div', null, children ),
		// No aria-label: the value box keeps the field's accessible name, so a query by label finds one input.
		RangeControl: ( { value, min, max, step } ) =>
			el( 'input', { type: 'range', 'data-testid': 'slider', value, min, max, step, readOnly: true } ),
		Button,
		PanelBody: ( { title, children } ) =>
			el( 'section', { 'aria-label': title }, children ),
		Notice: ( { children } ) => el( 'div', { role: 'status' }, children ),
		SelectControl: ( { label, value, options, onChange } ) =>
			el(
				'select',
				{
					'aria-label': label,
					value: value ?? '',
					onChange: ( e ) => onChange( e.target.value ),
				},
				options.map( ( o ) =>
					el( 'option', { key: o.value, value: o.value }, o.label )
				)
			),
		TextControl: Field,
		__experimentalNumberControl: Field,
		__experimentalUnitControl: Field,
		ToggleControl: ( { label, checked, onChange } ) =>
			el( 'input', {
				type: 'checkbox',
				'aria-label': label,
				checked: !! checked,
				onChange: ( e ) => onChange( e.target.checked ),
			} ),
		BaseControl: ( { label, children } ) =>
			el( 'div', { role: 'group', 'aria-label': label }, children ),
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
		Dropdown: ( { renderToggle, renderContent } ) =>
			el(
				R.Fragment,
				null,
				renderToggle( { isOpen: true, onToggle: () => {} } ),
				renderContent( { onClose: () => {} } )
			),
		MenuGroup: ( { children } ) => el( 'div', { role: 'menu' }, children ),
		MenuItem: ( { children, onClick, disabled, info } ) =>
			el(
				R.Fragment,
				null,
				el(
					'button',
					{ type: 'button', role: 'menuitem', onClick, disabled },
					children
				),
				info ? el( 'span', { 'data-info': children }, info ) : null
			),
	};
	// SgsLengthControl labels itself with `<BaseControl.VisualLabel>`, as core ships it.
	mocked.BaseControl.VisualLabel = ( { children } ) => el( 'span', null, children );
	return mocked;
} );

jest.mock( '@wordpress/data', () => {
	const stores = () => ( {
		'core/editor': { getDeviceType: () => global.__device || 'Desktop' },
		'core/block-editor': {
			getBlockOrder: () => ( global.__children || [] ).map( ( c ) => c.clientId ),
			getBlockAttributes: () => global.__attributes,
			getBlocks: () => global.__children || [],
		},
	} );
	const select = ( store ) => stores()[ store ] || {};
	return {
		useSelect: ( fn ) => fn( select ),
		useDispatch: () => ( { updateBlockAttributes: global.__update } ),
		useRegistry: () => ( { select } ),
	};
} );

// Icons are elements here (ResponsiveOverride prints its link icon as a child).
jest.mock( '@wordpress/icons', () => {
	const R = require( 'react' );
	return new Proxy(
		{ __esModule: true },
		{ get: ( target, key ) => ( key in target ? target[ key ] : R.createElement( 'i', { 'data-icon': String( key ) } ) ) }
	);
} );

jest.mock( '@wordpress/blocks', () => ( {
	getBlockType: ( name ) => global.__types?.[ name ],
} ) );

// The colour picker of the colour to-values: a stand-in input that exposes its label and passes its value on.
jest.mock( '../../src/components/DesignTokenPicker', () => ( {
	__esModule: true,
	default: ( { label, value, onChange } ) =>
		require( 'react' ).createElement( 'input', {
			'aria-label': label,
			value,
			onChange: ( e ) => onChange( e.target.value ),
		} ),
} ) );

jest.mock( '../../src/blocks/extensions/motion/canvas/use-canvas-motion', () => ( {
	replay: jest.fn( () => Promise.resolve( { played: true } ) ),
	canReplay: jest.fn( () => true ),
} ) );


const { replay } = require( '../../src/blocks/extensions/motion/canvas/use-canvas-motion' );
const EntrancePanel = require( '../../src/blocks/extensions/motion/EntrancePanel' ).default;
const {
	addLayer,
	useMotionLayers,
} = require( '../../src/blocks/extensions/motion/layers/use-motion-layers' );
const { MOTION_ATTRIBUTE_NAME } = require( '../../src/blocks/extensions/motion/register' );

// Title is a text part (its block.json kind marker), so the text effects reach it; a test passes `elements` for others.
const ELEMENTS = { panel: { label: 'Panel' }, title: { label: 'Title', text: true } };
const motionType = ( motion ) => ( { supports: { sgs: { motion } } } );

let root;
let container;
let latest;

function Harness( { initial, blockName = 'sgs/card', elements = ELEMENTS } ) {
	const [ motion, setMotion ] = React.useState( initial );
	const layers = useMotionLayers(
		motion,
		( attrs ) => setMotion( attrs[ MOTION_ATTRIBUTE_NAME ] ),
		elements
	);
	latest = { motion, layers };
	return React.createElement( EntrancePanel, {
		blockName,
		clientId: 'client-1',
		elements,
		motion,
		layers,
	} );
}

const mount = ( props ) => {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	root = createRoot( container );
	act( () => root.render( React.createElement( Harness, props ) ) );
};

const byLabel = ( label ) => container.querySelector( `[aria-label="${ label }"]` );
const buttonText = ( text ) =>
	[ ...container.querySelectorAll( 'button' ) ].find(
		( b ) => b.textContent.trim() === text
	);
// An option of any choice field by its label, whether the field rendered as a segmented group or as a select.
const radio = ( text ) => optionNode( container, text );
const choose = ( label, value ) =>
	act( () => Simulate.change( byLabel( label ), { target: { value } } ) );
// The Target row is a short segmented choice; a marked part reads "Panel •".
const pick = ( text ) =>
	act( () =>
		Simulate.click(
			[ ...container.querySelectorAll( '[role="radio"]' ) ].find(
				( b ) => b.textContent.replace( /\s*•$/, '' ).trim() === text
			)
		)
	);
const click = async ( node ) => {
	if ( node.tagName === 'OPTION' ) {
		activateOption( node );
		return;
	}
	await act( async () => Simulate.click( node ) );
};
const base = ( target = 'root' ) => latest.layers.layersOf( target, 'entrance.base' )[ 0 ];
const withBase = ( target, trigger ) => {
	const result = addLayer( undefined, target, 'entrance.base', {
		preset: 'entrance-fade-up',
	} );
	return {
		...result.motion,
		elements: {
			[ target ]: {
				entrance: { base: { ...result.layer, trigger } },
			},
		},
	};
};


module.exports = {
	React,
	act,
	Simulate,
	replay,
	EntrancePanel,
	addLayer,
	useMotionLayers,
	MOTION_ATTRIBUTE_NAME,
	ELEMENTS,
	motionType,
	mount,
	byLabel,
	buttonText,
	radio,
	// The option labels the named choice field offers, whether it rendered as a segmented group or a select.
	optionsOf: ( label ) => choiceLabels( container, label ),
	choose,
	pick,
	click,
	base,
	withBase,
	latest: () => latest,
	text: () => container.textContent,
	all: ( selector ) => [ ...container.querySelectorAll( selector ) ],
	setup: () => {
		beforeEach( () => {
			global.__types = { 'sgs/card': motionType( true ) };
			global.__children = [];
			global.__attributes = {};
			global.__device = 'Desktop';
			global.__update = jest.fn();
			replay.mockClear();
		} );
		afterEach( () => {
			if ( root ) {
				act( () => root.unmount() );
				container.remove();
				root = null;
			}
		} );
	},
	remount: () => {
		act( () => root.unmount() );
		container.remove();
		root = null;
	},
};
