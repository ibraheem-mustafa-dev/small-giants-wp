/**
 * components/BuiltinButtonPanel.js — the built-in button kit's one editor panel.
 *
 * The panel is rendered for real (react-dom into jsdom). The SGS shared controls it mounts are replaced by small stand-ins
 * that expose their props, so a test can operate a control and read back exactly what the panel wrote. `fillRow`, `textRow`
 * and `registry.json` are the real ones. The block's declaration is served through the mocked `getBlockType`.
 *
 * Negative controls (each guard was proven able to fail by breaking the source and re-running this file):
 *   1 the panel ignores `groups`                       -> "shows only the declared groups"
 *   2 the preset select writes undefined for "Block default" -> "Block default writes an empty string"
 *   3 the typography seed `{}` is removed              -> "typography writes the size as a tier object"
 *   4 an unknown prefix still mounts the panel         -> "an unknown prefix renders nothing"
 *   5 a control writes a name the registry lacks       -> "every attribute the panel writes is in the registry"
 *   6 `children` is not passed on to the panel body    -> "rows the block hands in as children sit inside the one button panel"
 */

'use strict';

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );
const { getBlockType } = require( '@wordpress/blocks' );

const registry = require( '../../src/components/button-kit/registry.json' );
// The box values the stand-in controls hand the panel; the PHP test prints the same file (ButtonKitCssTest).
const panelValues = require( '../fixtures/button-kit/panel-values.json' ).values;

const h = React.createElement;

jest.mock( '@wordpress/components', () => {
	const R = require( 'react' );
	return {
		__esModule: true,
		PanelBody: ( { title, children } ) => R.createElement( 'section', { 'data-panel': title }, children ),
		SelectControl: ( { label, value, options, onChange } ) =>
			R.createElement(
				'select',
				{ 'aria-label': label, value, onChange: ( e ) => onChange( e.target.value ) },
				options.map( ( o ) => R.createElement( 'option', { key: o.value, value: o.value }, o.label ) )
			),
	};
} );

jest.mock( '@wordpress/block-editor', () => ( {
	__esModule: true,
	InspectorControls: ( { group, children } ) => require( 'react' ).createElement( 'div', { 'data-inspector-group': group }, children ),
} ) );

const mockPanelValues = () => require( '../fixtures/button-kit/panel-values.json' ).values;
const mockBtn = ( props, onClick ) => require( 'react' ).createElement( 'button', { type: 'button', ...props, onClick } );

jest.mock( '../../src/components/ResponsiveOverride', () => ( {
	__esModule: true,
	default: ( { label, value, onChange, children } ) => {
		const tiers = value || {};
		return require( 'react' ).createElement(
			'div',
			{ 'data-tier-control': label || 'tier' },
			children( {
				tier: 'desktop',
				ownValue: tiers.desktop ?? '',
				effectiveValue: tiers.desktop ?? '',
				inherited: false,
				setOwnValue: ( next ) => onChange( { ...tiers, desktop: next } ),
			} )
		);
	},
} ) );

jest.mock( '../../src/components/SgsLengthControl', () => ( {
	__esModule: true,
	default: ( { label, value, onChange } ) =>
		require( 'react' ).createElement( 'input', { 'aria-label': label, type: 'text', value: value ?? '', onChange: ( e ) => onChange( e.target.value ) } ),
} ) );

jest.mock( '../../src/components/SgsBoxControl', () => ( {
	__esModule: true,
	default: ( { label, onChange } ) => mockBtn( { 'data-box': label }, () => onChange( mockPanelValues().Padding.desktop ) ),
} ) );

jest.mock( '../../src/components/ResponsiveBoxControl', () => ( {
	__esModule: true,
	BOX_UNITS: [],
	normaliseResponsiveBox: ( box ) => box,
} ) );

jest.mock( '../../src/components/SgsBorderControl', () => ( {
	__esModule: true,
	default: ( props ) =>
		require( 'react' ).createElement(
			'div',
			{ 'data-border': 'true', 'data-show-colour': String( props.showColour ) },
			mockBtn( { 'data-act': 'width' }, () => props.onWidthChange( mockPanelValues().BorderWidth ) ),
			mockBtn( { 'data-act': 'style' }, () => props.onStyleChange( 'dashed' ) ),
			mockBtn( { 'data-act': 'colour' }, () => props.colourStates[ 0 ].onChange( 'primary' ) ),
			mockBtn( { 'data-act': 'hover' }, () => props.colourStates[ 1 ].onChange( 'accent' ) ),
			mockBtn( { 'data-act': 'radius' }, () => props.onRadiusChange( 'base', mockPanelValues().BorderRadius.desktop ) )
		),
} ) );

jest.mock( '../../src/components/ShadowControl', () => ( {
	__esModule: true,
	default: ( { attrNames, setAttributes } ) =>
		require( 'react' ).createElement(
			'div',
			{ 'data-shadow': Object.values( attrNames ).join( ',' ) },
			mockBtn( { 'data-act': 'shadow' }, () => setAttributes( { [ attrNames.base ]: '0 2px 4px', [ attrNames.hover ]: '0 4px 8px' } ) )
		),
} ) );

// A stand-in for the typography panel with the real control's storage rule: a size is written as a `{desktop,...}` object
// when the stored value is an object (TypographyControls.js::isTieredValue), and as a flat number otherwise.
jest.mock( '../../src/components/TypographyControls', () => ( {
	__esModule: true,
	default: ( { attributes, setAttributes, prefix } ) => {
		const raw = attributes[ prefix + 'FontSize' ];
		const tiered = Array.isArray( raw ) ? 0 === raw.length : null !== raw && 'object' === typeof raw;
		return require( 'react' ).createElement( 'div', { 'data-typography': prefix }, mockBtn( { 'data-act': 'size' }, () =>
			setAttributes( { [ prefix + 'FontSize' ]: tiered ? { ...raw, desktop: 18 } : 18 } )
		) );
	},
} ) );

jest.mock( '../../src/components/SgsColourPanel', () => ( {
	__esModule: true,
	default: ( { rows } ) =>
		require( 'react' ).createElement(
			'div',
			{ 'data-colour-panel': 'true' },
			rows.filter( Boolean ).map( ( row ) =>
				require( 'react' ).createElement(
					'div',
					{ key: row.key, 'data-colour-row': row.key, 'data-heading': row.heading },
					row.states.map( ( st ) =>
						require( 'react' ).createElement(
							'span',
							{ key: st.key },
							mockBtn( { 'data-state': st.key }, () => st.onChange( 'primary' ) ),
							st.onGradientChange ? mockBtn( { 'data-state-gradient': st.key }, () => st.onGradientChange( 'g' ) ) : null
						)
					)
				)
			)
		),
} ) );

const BuiltinButtonPanel = require( '../../src/components/BuiltinButtonPanel' ).default;

const ALL_GROUPS = [ 'preset', 'colour', 'border', 'padding', 'width', 'minHeight', 'shadow', 'typography' ];

/** Serve one declaration, as `getBlockType( 'sgs/buybox' ).supports.sgs.builtinButtons`. */
function declare( entries ) {
	getBlockType.mockImplementation( () => ( { supports: { sgs: { builtinButtons: entries } } } ) );
}

const FLOW_OPENER = { prefix: 'flowOpener', part: 'flow-opener', label: 'Flow opener button' };

async function mount( props = {}, attributes = {} ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	const setAttributes = jest.fn();
	await act( async () => {
		root.render( h( BuiltinButtonPanel, { attributes, setAttributes, blockName: 'sgs/buybox', prefix: 'flowOpener', ...props } ) );
	} );
	return {
		container,
		setAttributes,
		q: ( selector ) => container.querySelector( selector ),
		all: ( selector ) => [ ...container.querySelectorAll( selector ) ],
		click: ( selector ) => act( () => container.querySelector( selector ).click() ),
		type( selector, value ) {
			const el = container.querySelector( selector );
			const proto = 'SELECT' === el.tagName ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
			act( () => {
				Object.getOwnPropertyDescriptor( proto, 'value' ).set.call( el, value );
				el.dispatchEvent( new Event( 'SELECT' === el.tagName ? 'change' : 'input', { bubbles: true } ) );
			} );
		},
		unmount: () => {
			act( () => root.unmount() );
			container.remove();
		},
	};
}

/** Every key every control wrote, merged. */
const written = ( m ) => Object.assign( {}, ...m.setAttributes.mock.calls.map( ( c ) => c[ 0 ] ) );

afterEach( () => {
	getBlockType.mockReset();
	getBlockType.mockImplementation( () => null );
	delete window.sgsButtonPresetNames;
} );

describe( 'BuiltinButtonPanel: which groups show', () => {
	test( 'an unknown prefix renders nothing', async () => {
		declare( [ { ...FLOW_OPENER, groups: ALL_GROUPS } ] );
		const m = await mount( { prefix: 'noSuchButton' } );
		expect( m.container.innerHTML ).toBe( '' );
		m.unmount();
	} );

	test( 'a block with no declaration renders nothing', async () => {
		const m = await mount();
		expect( m.container.innerHTML ).toBe( '' );
		m.unmount();
	} );

	test( 'shows only the declared groups', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'preset', 'colour' ] } ] );
		const m = await mount();
		expect( m.q( 'select[aria-label="Button style"]' ) ).not.toBeNull();
		expect( m.q( '[data-colour-panel]' ) ).not.toBeNull();
		[ '[data-border]', '[data-box]', '[data-shadow]', '[data-typography]', '[data-tier-control]', 'select[aria-label="Width"]' ].forEach(
			( selector ) => expect( m.q( selector ) ).toBeNull()
		);
		m.unmount();
	} );

	test( 'a typography-only declaration shows no preset, colour or layout control', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'typography' ] } ] );
		const m = await mount();
		expect( m.q( '[data-typography="flowOpener"]' ) ).not.toBeNull();
		[ 'select', '[data-colour-panel]', '[data-border]', '[data-box]', '[data-shadow]', '[data-tier-control]' ].forEach(
			( selector ) => expect( m.q( selector ) ).toBeNull()
		);
		m.unmount();
	} );

	test( 'no `groups` means every group except gradient', async () => {
		declare( [ FLOW_OPENER ] );
		const m = await mount();
		[ 'select[aria-label="Button style"]', 'select[aria-label="Width"]', '[data-colour-panel]', '[data-border]', '[data-box]', '[data-shadow]', '[data-typography]' ].forEach(
			( selector ) => expect( m.q( selector ) ).not.toBeNull()
		);
		expect( m.q( 'input[aria-label="Minimum height"]' ) ).not.toBeNull();
		expect( m.all( '[data-state-gradient]' ) ).toHaveLength( 0 );
		m.unmount();
	} );

	test( 'the gradient group adds the gradient choice to the colour rows', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'colour', 'gradient' ] } ] );
		const m = await mount();
		expect( m.all( '[data-state-gradient]' ).length ).toBeGreaterThan( 0 );
		m.click( '[data-colour-row="flowOpener-background"] [data-state-gradient="hover"]' );
		expect( written( m ) ).toEqual( { flowOpenerColourBackgroundHoverGradient: 'g' } );
		m.unmount();
	} );

	test( 'the panel is titled with the declared label', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'preset' ] } ] );
		const m = await mount();
		expect( m.q( '[data-panel="Flow opener button"]' ) ).not.toBeNull();
		m.unmount();
	} );

	test( 'rows the block hands in as children sit inside the one button panel, not in a second panel of the same name', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'preset' ] } ] );
		const m = await mount( { children: h( 'p', { 'data-block-row': 'price-switch' }, 'Show the price' ) } );
		const panels = m.all( '[data-panel="Flow opener button"]' );
		expect( panels ).toHaveLength( 1 );
		expect( panels[ 0 ].querySelector( '[data-block-row="price-switch"]' ) ).not.toBeNull();
		m.unmount();
	} );

	test( 'no children means no extra row', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'preset' ] } ] );
		const m = await mount();
		expect( m.q( '[data-block-row]' ) ).toBeNull();
		m.unmount();
	} );
} );

describe( 'BuiltinButtonPanel: the preset choice', () => {
	test( 'offers Block default first, then the starters, then the site\'s named presets', async () => {
		window.sgsButtonPresetNames = [ 'gold-large' ];
		declare( [ { ...FLOW_OPENER, groups: [ 'preset' ] } ] );
		const m = await mount();
		const options = m.all( 'select[aria-label="Button style"] option' ).map( ( o ) => [ o.value, o.textContent ] );
		expect( options ).toEqual( [
			[ '', 'Block default' ],
			[ 'primary', 'Primary' ],
			[ 'secondary', 'Secondary' ],
			[ 'outline', 'Outline' ],
			[ 'gold-large', 'Gold large' ],
		] );
		m.unmount();
	} );

	test( 'choosing a preset writes {prefix}Style', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'preset' ] } ] );
		const m = await mount();
		m.type( 'select[aria-label="Button style"]', 'secondary' );
		expect( m.setAttributes ).toHaveBeenCalledWith( { flowOpenerStyle: 'secondary' } );
		m.unmount();
	} );

	test( 'a block that hands a seed gets it written with the pick, and one that hands none gets the pick alone', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'preset' ] } ] );
		const seeded = await mount( { seedForPreset: ( slug ) => ( 'outline' === slug ? { flowOpenerColourText: '#111' } : {} ) } );
		seeded.type( 'select[aria-label="Button style"]', 'outline' );
		expect( seeded.setAttributes ).toHaveBeenCalledWith( { flowOpenerStyle: 'outline', flowOpenerColourText: '#111' } );
		seeded.unmount();
		const plain = await mount();
		plain.type( 'select[aria-label="Button style"]', 'outline' );
		expect( plain.setAttributes ).toHaveBeenCalledWith( { flowOpenerStyle: 'outline' } );
		plain.unmount();
	} );

	test( 'Block default writes an empty string', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'preset' ] } ] );
		const m = await mount( {}, { flowOpenerStyle: 'primary' } );
		expect( m.q( 'select[aria-label="Button style"]' ).value ).toBe( 'primary' );
		m.type( 'select[aria-label="Button style"]', '' );
		expect( m.setAttributes ).toHaveBeenCalledWith( { flowOpenerStyle: '' } );
		m.unmount();
	} );
} );

describe( 'BuiltinButtonPanel: colour and typography', () => {
	test( 'a colour row writes {prefix}ColourBackground, and its hover state {prefix}ColourBackgroundHover', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'colour' ] } ] );
		const m = await mount();
		m.click( '[data-colour-row="flowOpener-background"] [data-state="normal"]' );
		m.click( '[data-colour-row="flowOpener-background"] [data-state="hover"]' );
		m.click( '[data-colour-row="flowOpener-text"] [data-state="normal"]' );
		expect( written( m ) ).toEqual( {
			flowOpenerColourBackground: 'primary',
			flowOpenerColourBackgroundHover: 'primary',
			flowOpenerColourText: 'primary',
		} );
		expect( m.q( '[data-colour-row="flowOpener-background"]' ).getAttribute( 'data-heading' ) ).toBe( 'Flow opener button' );
		m.unmount();
	} );

	test( 'with no border group, border colour is a colour row; with one, it is inside the border control', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'colour' ] } ] );
		let m = await mount();
		m.click( '[data-colour-row="flowOpener-border"] [data-state="hover"]' );
		expect( written( m ) ).toEqual( { flowOpenerColourBorderHover: 'primary' } );
		m.unmount();

		declare( [ { ...FLOW_OPENER, groups: [ 'colour', 'border' ] } ] );
		m = await mount();
		expect( m.q( '[data-colour-row="flowOpener-border"]' ) ).toBeNull();
		expect( m.q( '[data-border]' ).getAttribute( 'data-show-colour' ) ).toBe( 'true' );
		m.unmount();

		declare( [ { ...FLOW_OPENER, groups: [ 'border' ] } ] );
		m = await mount();
		expect( m.q( '[data-border]' ).getAttribute( 'data-show-colour' ) ).toBe( 'false' );
		m.unmount();
	} );

	test( 'typography writes the size as a tier object, though the generated attribute is absent until set', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'typography' ] } ] );
		const m = await mount();
		m.click( '[data-typography="flowOpener"] [data-act="size"]' );
		expect( m.setAttributes ).toHaveBeenCalledWith( { flowOpenerFontSize: { desktop: 18 } } );
		m.unmount();
	} );

	test( 'typography keeps the devices a stored size already holds', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'typography' ] } ] );
		const m = await mount( {}, { flowOpenerFontSize: { mobile: 14 } } );
		m.click( '[data-typography="flowOpener"] [data-act="size"]' );
		expect( m.setAttributes ).toHaveBeenCalledWith( { flowOpenerFontSize: { mobile: 14, desktop: 18 } } );
		m.unmount();
	} );
} );

describe( 'BuiltinButtonPanel: the box shapes it writes', () => {
	test( 'padding and radius are written per device, border width as one box of sides (the shapes sgs_button_kit_css reads)', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'border', 'padding' ] } ] );
		const m = await mount();
		m.click( '[data-box]' );
		m.click( '[data-border] [data-act="width"]' );
		m.click( '[data-border] [data-act="radius"]' );
		expect( written( m ) ).toEqual( {
			flowOpenerPadding: panelValues.Padding,
			flowOpenerBorderWidth: panelValues.BorderWidth,
			flowOpenerBorderRadius: panelValues.BorderRadius,
		} );
		// The registry names the same three as boxes, so the generator can compare a block's own attribute with them.
		const shapes = Object.fromEntries( Object.values( registry.groups ).flat().map( ( row ) => [ row.base, row.value_shape ] ) );
		expect( [ shapes.Padding, shapes.BorderWidth, shapes.BorderRadius ] ).toEqual( [ 'device_sides', 'sides', 'device_corners' ] );
		m.unmount();
	} );
} );

describe( 'BuiltinButtonPanel: names come from the registry', () => {
	test( 'every attribute the panel writes is in the registry, under the prefix', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ ...ALL_GROUPS, 'gradient' ] } ] );
		const m = await mount();
		m.type( 'select[aria-label="Button style"]', 'outline' );
		m.type( 'select[aria-label="Width"]', 'full' );
		m.type( 'input[aria-label="Minimum height"]', '48px' );
		[
			'[data-box]',
			'[data-border] [data-act="width"]',
			'[data-border] [data-act="style"]',
			'[data-border] [data-act="colour"]',
			'[data-border] [data-act="hover"]',
			'[data-border] [data-act="radius"]',
			'[data-shadow] [data-act="shadow"]',
			'[data-typography] [data-act="size"]',
		].forEach( ( selector ) => m.click( selector ) );
		m.all( '[data-colour-row] [data-state], [data-colour-row] [data-state-gradient]' ).forEach( ( el ) => act( () => el.click() ) );

		const bases = new Set( Object.values( registry.groups ).flat().map( ( row ) => row.base ) );
		const names = Object.keys( written( m ) );
		expect( names.length ).toBeGreaterThan( 15 );
		names.forEach( ( name ) => {
			expect( name.startsWith( 'flowOpener' ) ).toBe( true );
			expect( bases.has( name.slice( 'flowOpener'.length ) ) ).toBe( true );
		} );

		// The shadow control's four attribute names are registry names too.
		const shadowNames = m.q( '[data-shadow]' ).getAttribute( 'data-shadow' ).split( ',' );
		expect( shadowNames ).toEqual( [ 'flowOpenerShadow', 'flowOpenerShadowColour', 'flowOpenerShadowHover', 'flowOpenerShadowColourHover' ] );
		shadowNames.forEach( ( name ) => expect( bases.has( name.slice( 'flowOpener'.length ) ) ).toBe( true ) );

		expect( written( m ).flowOpenerMinHeight ).toEqual( { desktop: '48px' } );
		expect( written( m ).flowOpenerWidthType ).toBe( 'full' );
		m.unmount();
	} );
} );

describe( 'BuiltinButtonPanel: the size group (a square control)', () => {
	const ARROW = { prefix: 'arrow', part: 'arrow', label: 'Carousel arrows', groups: [ 'colour', 'border', 'size', 'shadow' ] };

	test( 'shows one Size length per device only when the group is declared, and not in the default groups', async () => {
		declare( [ ARROW ] );
		let m = await mount( { prefix: 'arrow' } );
		expect( m.q( 'input[aria-label="Size"]' ) ).not.toBeNull();
		expect( m.q( 'input[aria-label="Minimum height"]' ) ).toBeNull();
		m.unmount();

		declare( [ { ...ARROW, groups: undefined } ] );
		m = await mount( { prefix: 'arrow' } );
		expect( m.q( 'input[aria-label="Size"]' ) ).toBeNull();
		expect( registry.defaultGroups ).not.toContain( 'size' );
		m.unmount();
	} );

	test( 'typing a size writes {prefix}Size as a {desktop} object', async () => {
		declare( [ ARROW ] );
		const m = await mount( { prefix: 'arrow' } );
		m.type( 'input[aria-label="Size"]', '36px' );
		expect( m.setAttributes ).toHaveBeenCalledWith( { arrowSize: { desktop: '36px' } } );
		const base = new Set( Object.values( registry.groups ).flat().map( ( row ) => row.base ) );
		expect( base.has( 'Size' ) ).toBe( true );
		m.unmount();
	} );
} );

describe( 'BuiltinButtonPanel: content alignment and the hover lift', () => {
	const ALIGN_SELECT = '[data-tier-control="Content alignment"] select';

	test( 'content alignment shows only when the group is declared, and is not a default group', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ ...ALL_GROUPS, 'contentAlign' ] } ] );
		let m = await mount();
		expect( m.q( ALIGN_SELECT ) ).not.toBeNull();
		expect( m.all( `${ ALIGN_SELECT } option` ).map( ( o ) => o.value ) ).toEqual( [ '', 'flex-start', 'center', 'flex-end', 'space-between' ] );
		m.unmount();

		declare( [ FLOW_OPENER ] );
		m = await mount();
		expect( m.q( ALIGN_SELECT ) ).toBeNull();
		expect( registry.defaultGroups ).not.toContain( 'contentAlign' );
		m.unmount();
	} );

	test( 'choosing a content alignment writes {prefix}ContentAlign as a {desktop} object, and the empty choice clears it', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'contentAlign' ] } ] );
		const m = await mount();
		m.type( ALIGN_SELECT, 'space-between' );
		expect( m.setAttributes ).toHaveBeenCalledWith( { flowOpenerContentAlign: { desktop: 'space-between' } } );
		m.type( ALIGN_SELECT, '' );
		expect( m.setAttributes ).toHaveBeenLastCalledWith( { flowOpenerContentAlign: { desktop: undefined } } );
		m.unmount();
	} );

	test( 'the hover lift shows in the default groups, and typing a length writes {prefix}HoverLiftDistance as that string', async () => {
		declare( [ FLOW_OPENER ] );
		const m = await mount();
		expect( m.q( 'input[aria-label="Hover lift"]' ) ).not.toBeNull();
		expect( registry.defaultGroups ).toContain( 'hoverLift' );
		m.type( 'input[aria-label="Hover lift"]', '2px' );
		expect( m.setAttributes ).toHaveBeenCalledWith( { flowOpenerHoverLiftDistance: '2px' } );
		m.type( 'input[aria-label="Hover lift"]', '0px' );
		expect( m.setAttributes ).toHaveBeenLastCalledWith( { flowOpenerHoverLiftDistance: '0px' } );
		m.unmount();

		const set = await mount( {}, { flowOpenerHoverLiftDistance: '2px' } );
		expect( set.q( 'input[aria-label="Hover lift"]' ).value ).toBe( '2px' );
		set.type( 'input[aria-label="Hover lift"]', '' );
		expect( set.setAttributes ).toHaveBeenCalledWith( { flowOpenerHoverLiftDistance: undefined } );
		set.unmount();
	} );

	test( 'a declaration that names no hoverLift group (a square arrow) shows no hover lift', async () => {
		declare( [ { ...FLOW_OPENER, groups: [ 'colour', 'size' ] } ] );
		const m = await mount();
		expect( m.q( 'input[aria-label="Hover lift"]' ) ).toBeNull();
		m.unmount();
	} );
} );
