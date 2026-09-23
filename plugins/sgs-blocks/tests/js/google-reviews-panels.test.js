/**
 * sgs/google-reviews — the six styling sections, the shared Colour panel and the preview safety net.
 *
 * Every panel is rendered for real (react-dom into jsdom). The SGS shared controls
 * (ResponsiveOverride, SgsLengthControl, SgsBoxControl, SgsBorderControl, DesignTokenPicker,
 * TypographyControls, SgsColourPanel) and the core inputs are replaced by small stand-ins that expose
 * their props, so a test can operate a control and read back exactly what the panel wrote.
 * `fillRow`, `textRow` and `typographyAttrKeys` are the REAL implementations. block.json is the REAL
 * schema, so the tests break when a control and the schema drift apart.
 *
 * Negative controls. Each guard was proven able to fail by breaking its binding in the source and
 * re-running this file (every one failed, then the source was restored):
 *   1 logoSize bound to the wrong attribute        -> "logo position, opacity, size and caption"
 *   2 clearing a border style stores ''            -> 4 tests (card, buttons, arrow, borderStyleValue)
 *   3 an attribute dropped from a section          -> "no block.json attribute is left without a control"
 *   4 a button border loses contrastAgainst        -> "each button border keeps Normal + Hover colour"
 *   5 the canvas request loses httpMethod POST     -> "a GET query string would pass the 8 KB limit"
 *   6 a typography target dropped                  -> "every typography prefix ... has a target"
 *   7 the arrow border loses its Hover state       -> "the arrow border keeps Normal + Hover colour"
 *   8 a colour row dropped                         -> "every colour attribute it lists is reachable"
 *   9 the outer border loses contrastAgainst       -> "the outer border control passes contrastAgainst"
 * The last describe block holds the controls that can fail without editing source.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

const BLOCK_DIR = path.join( __dirname, '../../src/blocks/google-reviews' );
const SCHEMA = require( path.join( BLOCK_DIR, 'block.json' ) ).attributes;
const EDIT_JS = fs.readFileSync( path.join( BLOCK_DIR, 'edit.js' ), 'utf8' );

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
		TextControl: ( { label, value, onChange } ) =>
			R.createElement( 'input', { 'aria-label': label, type: 'text', value: value ?? '', onChange: ( e ) => onChange( e.target.value ) } ),
		ToggleControl: ( { label, checked, onChange } ) =>
			R.createElement( 'input', { 'aria-label': label, type: 'checkbox', checked: !! checked, onChange: ( e ) => onChange( e.target.checked ) } ),
		RangeControl: ( { label, value, onChange } ) =>
			R.createElement( 'input', { 'aria-label': label, type: 'number', value: value ?? '', onChange: ( e ) => onChange( Number( e.target.value ) ) } ),
	};
} );

jest.mock( '@wordpress/block-editor', () => ( {
	__esModule: true,
	InspectorControls: ( { group, children } ) => require( 'react' ).createElement( 'div', { 'data-inspector-group': group }, children ),
} ) );

jest.mock( '../../src/components/primitives', () => {
	const R = require( 'react' );
	return {
		__esModule: true,
		ToolsPanel: ( { label, resetAll, children } ) =>
			R.createElement( 'div', { 'data-tools-panel': label }, R.createElement( 'button', { 'data-reset-all': label, onClick: resetAll } ), children ),
		ToolsPanelItem: ( { label, hasValue, onDeselect, children } ) =>
			R.createElement(
				'div',
				{ 'data-row': label, 'data-has-value': String( !! hasValue() ) },
				R.createElement( 'button', { 'data-reset': label, onClick: onDeselect } ),
				children
			),
	};
} );

jest.mock( '../../src/components', () => {
	const R = require( 'react' );
	const btn = ( props, onClick ) => R.createElement( 'button', { type: 'button', ...props, onClick } );
	return {
		__esModule: true,
		BOX_UNITS: [],
		normaliseResponsiveBox: ( box ) => box,
		typographyAttrKeys: jest.requireActual( '../../src/components/TypographyControls' ).typographyAttrKeys,
		fillRow: jest.requireActual( '../../src/components/colour-variants/fillRow' ).default,
		textRow: jest.requireActual( '../../src/components/colour-variants/textRow' ).default,
		ResponsiveOverride: ( { label, value, onChange, children } ) => {
			const tiers = value || {};
			return R.createElement(
				'div',
				{ 'data-tier-control': label },
				children( {
					tier: 'desktop',
					ownValue: tiers.desktop ?? '',
					effectiveValue: tiers.desktop ?? '',
					inherited: false,
					setOwnValue: ( next ) => {
						const out = { ...tiers };
						if ( '' === next || undefined === next ) {
							delete out.desktop;
						} else {
							out.desktop = next;
						}
						onChange( out );
					},
				} )
			);
		},
		SgsLengthControl: ( { label, value, onChange } ) =>
			R.createElement( 'input', { 'aria-label': label, type: 'text', value: value ?? '', onChange: ( e ) => onChange( e.target.value ) } ),
		SgsBoxControl: ( { label, onChange } ) => btn( { 'data-box': label }, () => onChange( { top: '4px', right: '4px', bottom: '4px', left: '4px' } ) ),
		DesignTokenPicker: ( { label, states } ) => btn( { 'data-picker': label }, () => states[ 0 ].onChange( 'primary' ) ),
		ResponsiveBorderRadiusControl: ( { label, onChange } ) => btn( { 'data-radius': label }, () => onChange( 'base', { topLeft: '50%' } ) ),
		TypographyControls: ( { targets } ) =>
			R.createElement( 'div', { 'data-typography': targets.map( ( t ) => t.prefix ).join( ',' ) } ),
		SgsBorderControl: ( props ) =>
			R.createElement(
				'div',
				{
					'data-border': props.label,
					'data-contrast': props.contrastAgainst,
					'data-has-states': String( !! props.colourStates ),
					'data-state-count': String( props.colourStates ? props.colourStates.length : 0 ),
				},
				btn( { 'data-act': 'width' }, () => props.onWidthChange( { top: '1px', right: '1px', bottom: '1px', left: '1px' } ) ),
				btn( { 'data-act': 'style-clear' }, () => props.onStyleChange( '' ) ),
				btn( { 'data-act': 'colour' }, () => ( props.colourStates ? props.colourStates[ 0 ].onChange( 'primary' ) : props.onColourChange( 'primary' ) ) ),
				btn( { 'data-act': 'hover' }, () => props.colourStates && props.colourStates[ 1 ].onChange( 'accent' ) ),
				btn( { 'data-act': 'radius' }, () => props.onRadiusChange && props.onRadiusChange( 'base', { topLeft: '8px' } ) )
			),
		SgsColourPanel: ( { rows } ) =>
			R.createElement(
				'div',
				{ 'data-colour-panel': 'true' },
				rows.map( ( row ) =>
					R.createElement(
						'div',
						{ key: row.key, 'data-colour-row': row.key },
						row.states.map( ( st ) =>
							R.createElement( 'span', { key: st.key },
								btn( { 'data-state': st.key }, () => st.onChange( 'primary' ) ),
								st.onGradientChange ? btn( { 'data-state-gradient': st.key }, () => st.onGradientChange( 'g' ) ) : null
							)
						)
					)
				)
			),
	};
} );

const CardPanel = require( '../../src/blocks/google-reviews/components/CardPanel' );
const HeaderPanel = require( '../../src/blocks/google-reviews/components/HeaderPanel' );
const ReviewerPanel = require( '../../src/blocks/google-reviews/components/ReviewerPanel' );
const ReviewTextPanel = require( '../../src/blocks/google-reviews/components/ReviewTextPanel' );
const ButtonsPanel = require( '../../src/blocks/google-reviews/components/ButtonsPanel' );
const NavigationPanel = require( '../../src/blocks/google-reviews/components/NavigationPanel' );
const ColourPanel = require( '../../src/blocks/google-reviews/components/ColourPanel' );
const kit = require( '../../src/blocks/google-reviews/components/panel-kit' );

const SECTIONS = [
	{ name: 'Card', Panel: CardPanel.default, owned: CardPanel.CARD_ATTRS },
	{ name: 'Header', Panel: HeaderPanel.default, owned: HeaderPanel.HEADER_ATTRS },
	{ name: 'Reviewer', Panel: ReviewerPanel.default, owned: ReviewerPanel.REVIEWER_ATTRS },
	{ name: 'Review text', Panel: ReviewTextPanel.default, owned: ReviewTextPanel.REVIEW_TEXT_ATTRS },
	{ name: 'Buttons', Panel: ButtonsPanel.default, owned: ButtonsPanel.BUTTONS_ATTRS },
	{ name: 'Navigation', Panel: NavigationPanel.default, owned: NavigationPanel.NAVIGATION_ATTRS },
];

/** The attributes as the editor hands them over: every block.json default, with overrides on top. */
function withDefaults( overrides = {} ) {
	const attrs = {};
	for ( const [ name, def ] of Object.entries( SCHEMA ) ) {
		attrs[ name ] = JSON.parse( JSON.stringify( def.default ?? null ) );
		if ( undefined === def.default ) {
			delete attrs[ name ];
		}
	}
	return { ...attrs, ...overrides };
}

function mount( Panel, overrides ) {
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	const setAttributes = jest.fn();
	act( () => root.render( h( Panel, { attributes: withDefaults( overrides ), setAttributes } ) ) );
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

/** The last patch a control wrote, merged. */
const lastPatch = ( m ) => Object.assign( {}, ...m.setAttributes.mock.calls.map( ( c ) => c[ 0 ] ) );

const rowSel = ( label ) => `[data-row="${ label }"]`;

describe( 'the six sections: shape', () => {
	test.each( SECTIONS )( '$name renders one collapsed PanelBody holding a ToolsPanel with rows', ( { name, Panel } ) => {
		const m = mount( Panel );
		expect( m.q( 'section' ).getAttribute( 'data-panel' ) ).toBe( name );
		expect( m.q( `[data-tools-panel="${ name } settings"]` ) ).not.toBeNull();
		expect( m.all( '[data-row]' ).length ).toBeGreaterThan( 0 );
		m.unmount();
	} );

	test.each( SECTIONS )( '$name sits in the Styles tab', ( { Panel } ) => {
		const m = mount( Panel );
		expect( m.q( '[data-inspector-group]' ).getAttribute( 'data-inspector-group' ) ).toBe( 'styles' );
		m.unmount();
	} );

	test.each( SECTIONS )( '$name owns only attributes that block.json declares', ( { owned } ) => {
		expect( owned.filter( ( attr ) => ! ( attr in SCHEMA ) ) ).toEqual( [] );
	} );
} );

describe( 'the sections together own every attribute that needs a control', () => {
	/**
	 * Attributes with a control somewhere other than the six sections + Colour panel, each with the reason.
	 * ContainerWrapperControls (layout kind) owns the container attributes; WrittenReviewsPanel and the
	 * "Reviews source" / "Filters" / "Display Options" panels in edit.js own the data and display toggles.
	 */
	function otherControlsText() {
		return [
			EDIT_JS,
			fs.readFileSync( path.join( BLOCK_DIR, 'components/WrittenReviewsPanel.js' ), 'utf8' ),
			fs.readFileSync( path.join( __dirname, '../../src/blocks/container/components/ContainerWrapperControls.js' ), 'utf8' ),
			...fs
				.readdirSync( path.join( __dirname, '../../src/blocks/container/components' ) )
				.filter( ( f ) => f.endsWith( '.js' ) )
				.map( ( f ) => fs.readFileSync( path.join( __dirname, '../../src/blocks/container/components', f ), 'utf8' ) ),
		].join( '\n' );
	}

	function ownedAttrs() {
		const owned = new Set( [ ...SECTIONS.flatMap( ( s ) => s.owned ), ...ColourPanel.COLOUR_ATTRS ] );
		const text = otherControlsText();
		return { owned, text };
	}

	/** Attributes another system owns: editor extensions (`sgs*`), the reviews data, media atoms. */
	const ELSEWHERE = /^(sgs[A-Z]|reviews$|averageRating$|reviewCount$|businessName$|placeId$)/;

	function uncontrolled( owned, text ) {
		return Object.keys( SCHEMA ).filter( ( attr ) => {
			if ( owned.has( attr ) || ELSEWHERE.test( attr ) ) {
				return false;
			}
			return ! new RegExp( `[\\s,{(]${ attr }\\s*[:,}]|attr(?:Desktop|Tablet|Mobile)?=['"]${ attr }['"]|['"]${ attr }['"]` ).test( text );
		} );
	}

	test( 'no block.json attribute is left without a control', () => {
		const { owned, text } = ownedAttrs();
		expect( uncontrolled( owned, text ) ).toEqual( [] );
	} );

	test( 'a section really is what covers the new attributes (drop one and the census finds them)', () => {
		// NEGATIVE CONTROL: without the Header section, its attributes must show up as uncontrolled.
		const owned = new Set( [
			...SECTIONS.filter( ( s ) => 'Header' !== s.name ).flatMap( ( s ) => s.owned ),
			...ColourPanel.COLOUR_ATTRS,
		] );
		const missing = uncontrolled( owned, otherControlsText() );
		expect( missing ).toEqual( expect.arrayContaining( [ 'logoSize', 'headerGap', 'sourceLabelFontSize' ] ) );
	} );

	test( 'every typography prefix block.json declares has a TypographyControls target', () => {
		const declared = Object.keys( SCHEMA )
			.map( ( attr ) => attr.match( /^(.*)FontSize$/ ) )
			.filter( Boolean )
			.map( ( match ) => match[ 1 ] );
		const targeted = SECTIONS.flatMap( ( { Panel } ) => {
			const m = mount( Panel );
			const prefixes = m.all( '[data-typography]' ).flatMap( ( el ) => el.getAttribute( 'data-typography' ).split( ',' ) );
			m.unmount();
			return prefixes;
		} );
		expect( declared.filter( ( prefix ) => ! targeted.includes( prefix ) ) ).toEqual( [] );
	} );
} );

describe( 'Card', () => {
	test( 'the Card look select offers exactly the cardStyle enum and writes the chosen slug', () => {
		const m = mount( CardPanel.default );
		const options = m.all( 'select[aria-label="Card look"] option' ).map( ( o ) => o.value );
		expect( [ ...options ].sort() ).toEqual( [ ...SCHEMA.cardStyle.enum ].sort() );
		m.type( 'select[aria-label="Card look"]', 'google-card' );
		expect( lastPatch( m ) ).toEqual( { cardStyle: 'google-card' } );
		m.unmount();
	} );

	test( 'padding controls write a tier object keyed desktop', () => {
		const m = mount( CardPanel.default );
		m.click( '[data-box="Panel padding"]' );
		m.click( '[data-box="Review card padding"]' );
		expect( lastPatch( m ) ).toEqual( {
			padding: { desktop: { top: '4px', right: '4px', bottom: '4px', left: '4px' } },
			cardPadding: { desktop: { top: '4px', right: '4px', bottom: '4px', left: '4px' } },
		} );
		m.unmount();
	} );

	test( 'gap and width write one length per device', () => {
		const m = mount( CardPanel.default );
		m.type( 'input[aria-label="Space between the parts of a card"]', '12px' );
		m.type( 'input[aria-label="Card width (slider and wall)"]', '340px' );
		expect( lastPatch( m ) ).toEqual( { cardGap: { desktop: '12px' }, cardWidth: { desktop: '340px' } } );
		m.unmount();
	} );

	test( 'the card border control writes card attributes, keeps colour + gradient, and gets a contrast backdrop', () => {
		const m = mount( CardPanel.default, { cardBackground: 'surface' } );
		const border = '[data-border="Review card border width"]';
		expect( m.q( border ).getAttribute( 'data-contrast' ) ).toBe( 'surface' );
		m.click( `${ border } [data-act="width"]` );
		m.click( `${ border } [data-act="colour"]` );
		m.click( `${ border } [data-act="radius"]` );
		expect( lastPatch( m ) ).toEqual( {
			cardBorderWidth: { top: '1px', right: '1px', bottom: '1px', left: '1px' },
			cardBorderColour: 'primary',
			cardBorderRadius: { desktop: { topLeft: '8px' } },
		} );
		m.unmount();
	} );

	test( 'clearing the border style stores a value the cardBorderStyle enum accepts (no REST 400)', () => {
		const m = mount( CardPanel.default );
		m.click( '[data-border="Review card border width"] [data-act="style-clear"]' );
		const written = lastPatch( m ).cardBorderStyle;
		expect( SCHEMA.cardBorderStyle.enum ).toContain( written );
		m.unmount();
	} );

	test( 'a changed value lights the row and its reset writes the schema default; Reset all resets the section', () => {
		const m = mount( CardPanel.default, { cardGap: { desktop: '12px' } } );
		expect( m.q( rowSel( 'Review card gap' ) ).getAttribute( 'data-has-value' ) ).toBe( 'true' );
		expect( m.q( rowSel( 'Review card width' ) ).getAttribute( 'data-has-value' ) ).toBe( 'false' );
		m.click( '[data-reset="Review card gap"]' );
		expect( lastPatch( m ) ).toEqual( { cardGap: SCHEMA.cardGap.default } );
		m.setAttributes.mockClear();
		m.click( '[data-reset-all="Card settings"]' );
		const patch = lastPatch( m );
		expect( Object.keys( patch ).sort() ).toEqual( [ ...CardPanel.CARD_ATTRS ].sort() );
		expect( patch.cardStyle ).toBe( SCHEMA.cardStyle.default );
		m.unmount();
	} );
} );

describe( 'Header', () => {
	test( 'logo position, opacity, size and caption write their attributes', () => {
		const m = mount( HeaderPanel.default );
		m.type( 'select[aria-label="Google logo position"]', 'leading' );
		m.type( 'input[aria-label="Google logo opacity"]', '1' );
		m.type( 'input[aria-label="Google logo size"]', '30px' );
		m.type( 'input[aria-label="Source caption"]', 'Google Reviews' );
		expect( lastPatch( m ) ).toEqual( {
			logoPosition: 'leading',
			logoOpacity: 1,
			logoSize: { desktop: '30px' },
			sourceLabel: 'Google Reviews',
		} );
		expect( [ 'leading', 'trailing' ].sort() ).toEqual( [ ...SCHEMA.logoPosition.enum ].sort() );
		m.unmount();
	} );

	test( 'header spacing, star size, divider and typography write the right attributes', () => {
		const m = mount( HeaderPanel.default );
		m.type( 'input[aria-label="Space between header items"]', '22px' );
		m.type( 'input[aria-label="Star size in the rating row"]', '18px' );
		m.click( '[data-box="Header padding"]' );
		m.type( 'input[aria-label="Divider line thickness"]', '1px' );
		m.click( '[data-picker="Divider line colour"]' );
		const patch = lastPatch( m );
		expect( patch.headerGap ).toEqual( { desktop: '22px' } );
		expect( patch.aggregateStarSize ).toEqual( { desktop: '18px' } );
		expect( patch.headerPadding.desktop.top ).toBe( '4px' );
		expect( patch.headerDividerWidth ).toBe( '1px' );
		expect( patch.headerDividerColour ).toBe( 'primary' );
		expect( m.q( '[data-typography]' ).getAttribute( 'data-typography' ) ).toBe( 'sourceLabel,score,count' );
		m.unmount();
	} );

	test( 'a changed caption lights its row and reset clears it', () => {
		const m = mount( HeaderPanel.default, { sourceLabel: 'Google Reviews' } );
		expect( m.q( rowSel( 'Source caption' ) ).getAttribute( 'data-has-value' ) ).toBe( 'true' );
		m.click( '[data-reset="Source caption"]' );
		expect( lastPatch( m ) ).toEqual( { sourceLabel: '' } );
		m.unmount();
	} );
} );

describe( 'Reviewer', () => {
	test( 'avatar, star size and card mark controls write their attributes', () => {
		const m = mount( ReviewerPanel.default );
		m.type( 'input[aria-label="Avatar size"]', '40px' );
		m.click( '[data-radius="Avatar corners"]' );
		m.type( 'input[aria-label="Star size on each review card"]', '15px' );
		expect( lastPatch( m ) ).toEqual( {
			avatarSize: { desktop: '40px' },
			avatarBorderRadius: { desktop: { topLeft: '50%' } },
			starSize: { desktop: '15px' },
		} );
		m.unmount();
	} );

	test( 'the card mark size shows only once the mark is switched on, and the toggle writes showCardLogo', () => {
		const off = mount( ReviewerPanel.default );
		expect( off.q( 'input[aria-label="Card Google mark size"]' ) ).toBeNull();
		off.click( 'input[aria-label="Show a small Google mark on each card"]' );
		expect( lastPatch( off ) ).toEqual( { showCardLogo: true } );
		off.unmount();
		const on = mount( ReviewerPanel.default, { showCardLogo: true } );
		on.type( 'input[aria-label="Card Google mark size"]', '17px' );
		expect( lastPatch( on ) ).toEqual( { cardLogoSize: { desktop: '17px' } } );
		on.unmount();
	} );

	test( 'typography covers author, meta, date and avatar', () => {
		const m = mount( ReviewerPanel.default );
		expect( m.q( '[data-typography]' ).getAttribute( 'data-typography' ) ).toBe( 'author,meta,date,avatar' );
		m.unmount();
	} );

	test( 'reset of the avatar size writes the schema default', () => {
		const m = mount( ReviewerPanel.default, { avatarSize: { desktop: '40px' } } );
		m.click( '[data-reset="Avatar size"]' );
		expect( lastPatch( m ) ).toEqual( { avatarSize: SCHEMA.avatarSize.default } );
		m.unmount();
	} );
} );

describe( 'Review text', () => {
	test( 'the clamp toggle writes textClamp and the line count shows only while it is on', () => {
		const on = mount( ReviewTextPanel.default );
		on.type( 'input[aria-label="Lines shown"]', '6' );
		on.click( 'input[aria-label="Cut long reviews to a set number of lines"]' );
		expect( lastPatch( on ) ).toEqual( { textClampLines: 6, textClamp: false } );
		on.unmount();
		const off = mount( ReviewTextPanel.default, { textClamp: false } );
		expect( off.q( 'input[aria-label="Lines shown"]' ) ).toBeNull();
		off.unmount();
	} );

	test( 'the review link toggle, its wording and the footnote write their attributes', () => {
		const m = mount( ReviewTextPanel.default, { showReviewLink: true } );
		m.type( 'input[aria-label="Link wording"]', 'Read the full review' );
		m.type( 'input[aria-label="Footnote"]', 'Scroll for more' );
		expect( lastPatch( m ) ).toEqual( { reviewLinkLabel: 'Read the full review', footnote: 'Scroll for more' } );
		const off = mount( ReviewTextPanel.default );
		expect( off.q( 'input[aria-label="Link wording"]' ) ).toBeNull();
		off.click( 'input[aria-label="Show a link to the full review"]' );
		expect( lastPatch( off ) ).toEqual( { showReviewLink: true } );
		m.unmount();
		off.unmount();
	} );

	test( 'typography covers the text, the link and the footnote; reset of the clamp restores defaults', () => {
		const m = mount( ReviewTextPanel.default, { textClamp: false, textClampLines: 6 } );
		expect( m.q( '[data-typography]' ).getAttribute( 'data-typography' ) ).toBe( 'text,reviewLink,footnote' );
		expect( m.q( rowSel( 'Shorten long reviews' ) ).getAttribute( 'data-has-value' ) ).toBe( 'true' );
		m.click( '[data-reset="Shorten long reviews"]' );
		expect( lastPatch( m ) ).toEqual( { textClamp: true, textClampLines: 8 } );
		m.unmount();
	} );
} );

describe( 'Buttons', () => {
	test( 'both buttons are drawn, See all first', () => {
		const m = mount( ButtonsPanel.default );
		const labels = m.all( '[data-row]' ).map( ( el ) => el.getAttribute( 'data-row' ) );
		expect( labels.findIndex( ( l ) => l.startsWith( 'See all reviews button' ) ) ).toBeLessThan(
			labels.findIndex( ( l ) => l.startsWith( 'Write a review button' ) )
		);
		expect( labels.filter( ( l ) => l.endsWith( ': typography' ) ).length ).toBe( 2 );
		m.unmount();
	} );

	test( 'See all writes its link and wording; Write a review writes its wording (its link stays in Display Options)', () => {
		const m = mount( ButtonsPanel.default );
		m.type( 'input[aria-label="See all reviews button link (web address)"]', 'https://g.page/r/x' );
		m.type( 'input[aria-label="See all reviews button wording"]', 'See all reviews' );
		m.type( 'input[aria-label="Write a review button wording"]', 'Write a review' );
		expect( lastPatch( m ) ).toEqual( {
			seeAllUrl: 'https://g.page/r/x',
			seeAllLabel: 'See all reviews',
			writeReviewLabel: 'Write a review',
		} );
		expect( m.q( 'input[aria-label="Write a review button link (web address)"]' ) ).toBeNull();
		m.unmount();
	} );

	test( 'each button border keeps Normal + Hover colour and writes its own prefixed attributes', () => {
		const m = mount( ButtonsPanel.default, { seeAllColourBackground: 'primary', writeReviewColourBackground: 'surface' } );
		const see = '[data-border="See all reviews button border width"]';
		const write = '[data-border="Write a review button border width"]';
		expect( m.q( see ).getAttribute( 'data-state-count' ) ).toBe( '2' );
		expect( m.q( write ).getAttribute( 'data-state-count' ) ).toBe( '2' );
		expect( m.q( see ).getAttribute( 'data-contrast' ) ).toBe( 'primary' );
		expect( m.q( write ).getAttribute( 'data-contrast' ) ).toBe( 'surface' );
		[ see, write ].forEach( ( sel ) => [ 'width', 'colour', 'hover', 'radius' ].forEach( ( act ) => m.click( `${ sel } [data-act="${ act }"]` ) ) );
		const patch = lastPatch( m );
		expect( patch ).toMatchObject( {
			seeAllColourBorder: 'primary',
			seeAllColourBorderHover: 'accent',
			writeReviewColourBorder: 'primary',
			writeReviewColourBorderHover: 'accent',
			seeAllBorderRadius: { desktop: { topLeft: '8px' } },
			writeReviewBorderRadius: { desktop: { topLeft: '8px' } },
		} );
		expect( Object.keys( patch ).every( ( k ) => k in SCHEMA ) ).toBe( true );
		m.unmount();
	} );

	test( 'padding and minimum height write per button; typography targets are the two prefixes', () => {
		const m = mount( ButtonsPanel.default );
		m.click( '[data-box="See all reviews button padding"]' );
		m.type( 'input[aria-label="Write a review button minimum height"]', '40px' );
		expect( lastPatch( m ) ).toMatchObject( { seeAllPadding: { desktop: { top: '4px' } }, writeReviewMinHeight: { desktop: '40px' } } );
		expect( m.all( '[data-typography]' ).map( ( el ) => el.getAttribute( 'data-typography' ) ) ).toEqual( [ 'seeAll', 'writeReview' ] );
		m.unmount();
	} );

	test( 'clearing a button border style stores a value that button\'s enum accepts', () => {
		const m = mount( ButtonsPanel.default );
		m.click( '[data-border="See all reviews button border width"] [data-act="style-clear"]' );
		m.click( '[data-border="Write a review button border width"] [data-act="style-clear"]' );
		const patch = lastPatch( m );
		expect( SCHEMA.seeAllBorderStyle.enum ).toContain( patch.seeAllBorderStyle );
		expect( SCHEMA.writeReviewBorderStyle.enum ).toContain( patch.writeReviewBorderStyle );
		m.unmount();
	} );

	test( 'Reset all restores every button attribute to its default', () => {
		const m = mount( ButtonsPanel.default, { seeAllLabel: 'x', writeReviewLabel: 'y' } );
		m.click( '[data-reset-all="Buttons settings"]' );
		const patch = lastPatch( m );
		expect( patch.seeAllLabel ).toBe( '' );
		expect( patch.writeReviewLabel ).toBe( '' );
		expect( Object.keys( patch ).sort() ).toEqual( [ ...ButtonsPanel.BUTTONS_ATTRS ].sort() );
		m.unmount();
	} );
} );

describe( 'Navigation', () => {
	test( 'position, size, rail padding and scrollbar write their attributes', () => {
		const m = mount( NavigationPanel.default, { scrollbar: 'thin' } );
		m.type( 'select[aria-label="Arrow position"]', 'below-end' );
		m.type( 'input[aria-label="Arrow button size"]', '40px' );
		m.click( '[data-box="Space around the row of reviews"]' );
		m.type( 'select[aria-label="Scrollbar"]', 'visible' );
		m.click( '[data-picker="Scrollbar colour"]' );
		expect( lastPatch( m ) ).toMatchObject( {
			navPosition: 'below-end',
			arrowSize: { desktop: '40px' },
			railPadding: { desktop: { top: '4px' } },
			scrollbar: 'visible',
			scrollbarColour: 'primary',
		} );
		expect( [ ...m.all( 'select[aria-label="Arrow position"] option' ) ].map( ( o ) => o.value ).sort() ).toEqual( [ ...SCHEMA.navPosition.enum ].sort() );
		expect( [ ...m.all( 'select[aria-label="Scrollbar"] option' ) ].map( ( o ) => o.value ).sort() ).toEqual( [ ...SCHEMA.scrollbar.enum ].sort() );
		m.unmount();
	} );

	test( 'the scrollbar colour is hidden while the scrollbar is hidden', () => {
		const m = mount( NavigationPanel.default );
		expect( m.q( '[data-picker="Scrollbar colour"]' ) ).toBeNull();
		m.unmount();
	} );

	test( 'the arrow border keeps Normal + Hover colour with the arrow attribute names, and gets a contrast backdrop', () => {
		const m = mount( NavigationPanel.default, { arrowColourBackground: 'primary' } );
		const sel = '[data-border="Arrow border width"]';
		expect( m.q( sel ).getAttribute( 'data-state-count' ) ).toBe( '2' );
		expect( m.q( sel ).getAttribute( 'data-contrast' ) ).toBe( 'primary' );
		[ 'width', 'colour', 'hover', 'radius', 'style-clear' ].forEach( ( act ) => m.click( `${ sel } [data-act="${ act }"]` ) );
		const patch = lastPatch( m );
		expect( patch ).toMatchObject( { arrowColourBorder: 'primary', arrowColourBorderHover: 'accent', arrowBorderRadius: { desktop: { topLeft: '8px' } } } );
		expect( SCHEMA.arrowBorderStyle.enum ).toContain( patch.arrowBorderStyle );
		m.unmount();
	} );

	test( 'reset of the scrollbar row restores both the choice and the colour', () => {
		const m = mount( NavigationPanel.default, { scrollbar: 'thin', scrollbarColour: 'primary' } );
		expect( m.q( rowSel( 'Scrollbar' ) ).getAttribute( 'data-has-value' ) ).toBe( 'true' );
		m.click( '[data-reset="Scrollbar"]' );
		expect( lastPatch( m ) ).toEqual( { scrollbar: 'hidden', scrollbarColour: '' } );
		m.unmount();
	} );
} );

describe( 'the Colour panel', () => {
	function rows( overrides ) {
		const m = mount( ColourPanel.default, overrides );
		return m;
	}

	test( 'every colour attribute it lists is reachable through one of its rows, and nothing else is written', () => {
		const m = rows();
		const written = new Set();
		m.all( '[data-state], [data-state-gradient]' ).forEach( ( button ) => {
			m.setAttributes.mockClear();
			act( () => button.click() );
			Object.keys( lastPatch( m ) ).forEach( ( key ) => written.add( key ) );
		} );
		expect( [ ...written ].sort() ).toEqual( [ ...ColourPanel.COLOUR_ATTRS ].sort() );
		m.unmount();
	} );

	test( 'the See all button rows carry Normal + Hover states with gradients', () => {
		const m = rows();
		expect( m.all( '[data-colour-row="see-all-background"] [data-state]' ).map( ( b ) => b.getAttribute( 'data-state' ) ) ).toEqual( [ 'normal', 'hover' ] );
		expect( m.all( '[data-colour-row="see-all-text"] [data-state-gradient]' ).length ).toBe( 2 );
		m.unmount();
	} );

	test( 'a border colour is NOT in this panel (border colours travel with their border control)', () => {
		expect( ColourPanel.COLOUR_ATTRS.filter( ( a ) => /Border/.test( a ) ) ).toEqual( [] );
	} );
} );

describe( 'the preview request stays valid', () => {
	test( 'every enum attribute defaults to one of its own values, and no default is null', () => {
		const bad = Object.entries( SCHEMA )
			.filter( ( [ , def ] ) => null === def.default || ( def.enum && undefined !== def.default && ! def.enum.includes( def.default ) ) )
			.map( ( [ name ] ) => name );
		expect( bad ).toEqual( [] );
	} );

	test( 'borderStyleValue never returns a value outside the attribute\'s enum', () => {
		for ( const attr of [ 'borderStyle', 'cardBorderStyle', 'arrowBorderStyle', 'writeReviewBorderStyle', 'seeAllBorderStyle' ] ) {
			expect( SCHEMA[ attr ].enum ).toContain( kit.borderStyleValue( attr, '' ) );
			expect( kit.borderStyleValue( attr, 'dashed' ) ).toBe( 'dashed' );
		}
	} );

	test( 'a GET query string would pass the 8 KB request-line limit, so the canvas request is a POST', () => {
		const flat = ( key, value ) => {
			if ( null === value || undefined === value ) {
				return [];
			}
			if ( Array.isArray( value ) ) {
				return value.flatMap( ( item, i ) => flat( `${ key }[${ i }]`, item ) );
			}
			if ( 'object' === typeof value ) {
				return Object.entries( value ).flatMap( ( [ k, v ] ) => flat( `${ key }[${ k }]`, v ) );
			}
			return [ `${ encodeURIComponent( key ) }=${ encodeURIComponent( value ) }` ];
		};
		const reviews = Array.from( { length: 13 }, ( _, i ) => ( { author: `Reviewer ${ i }`, text: 'x'.repeat( 300 ), date: '2 months ago', rating: 5 } ) );
		const query = [ ...Object.entries( withDefaults() ).flatMap( ( [ k, v ] ) => flat( k, v ) ), ...flat( 'reviews', reviews ) ].join( '&' );
		expect( query.length ).toBeGreaterThan( 8192 );
		expect( EDIT_JS ).toMatch( /<ServerSideRender[^>]*\shttpMethod="POST"/s );
	} );
} );

describe( 'edit.js wiring (source level)', () => {
	test( 'ToolsPanel still comes only from the primitives boundary (D1141)', () => {
		expect( EDIT_JS ).toContain( "import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';" );
		for ( const file of fs.readdirSync( path.join( BLOCK_DIR, 'components' ) ).filter( ( f ) => f.endsWith( '.js' ) ) ) {
			const src = fs.readFileSync( path.join( BLOCK_DIR, 'components', file ), 'utf8' );
			const fromComponents = src.match( /import \{([^}]*)\} from '@wordpress\/components';/ );
			expect( fromComponents ? fromComponents[ 1 ] : '' ).not.toMatch( /ToolsPanel/ );
		}
	} );

	test( 'the six sections and the Colour panel are mounted, Navigation only for the slider', () => {
		for ( const name of [ 'CardPanel', 'HeaderPanel', 'ReviewerPanel', 'ReviewTextPanel', 'ButtonsPanel' ] ) {
			expect( EDIT_JS ).toContain( `<${ name } attributes={ attributes } setAttributes={ setAttributes } />` );
		}
		expect( EDIT_JS ).toMatch( /'slider' === variant && <NavigationPanel/ );
		expect( EDIT_JS.indexOf( '<ColourPanel' ) ).toBeLessThan( EDIT_JS.indexOf( '<InspectorControls group="styles">' ) );
	} );

	test( 'the outer border control passes contrastAgainst (the wire-border-contrast gate)', () => {
		expect( EDIT_JS ).toMatch( /<SgsBorderControl[\s\S]*?contrastAgainst=\{ googleReviewsContrastAgainst \}/ );
	} );

	test( 'the old three-option Card Style select is gone (Card look replaces it)', () => {
		expect( EDIT_JS ).not.toContain( "label={ __( 'Card Style'" );
	} );
} );

describe( 'negative controls that need no source edit', () => {
	test( 'a control bound to the wrong attribute is caught by the write assertions', () => {
		const m = mount( HeaderPanel.default );
		m.type( 'input[aria-label="Source caption"]', 'X' );
		// If the caption were bound to `footnote` the assertion below would fail; prove it distinguishes them.
		expect( lastPatch( m ) ).not.toEqual( { footnote: 'X' } );
		expect( lastPatch( m ) ).toEqual( { sourceLabel: 'X' } );
		m.unmount();
	} );

	test( 'the enum guard fails for an empty string in an enum that lacks it', () => {
		expect( SCHEMA.cardBorderStyle.enum ).not.toContain( '' );
	} );

	test( 'a row at its default reports no value, so a reset dot only shows for real changes', () => {
		const m = mount( CardPanel.default );
		expect( m.all( '[data-has-value="true"]' ) ).toHaveLength( 0 );
		m.unmount();
	} );

	test( 'isSet treats an empty tier object as unset but a non-empty one as set', () => {
		expect( kit.isSet( { cardGap: { desktop: '' } }, 'cardGap' ) ).toBe( false );
		expect( kit.isSet( { cardGap: { desktop: '8px' } }, 'cardGap' ) ).toBe( true );
		expect( kit.isSet( { cardPadding: { desktop: {} } }, 'cardPadding' ) ).toBe( false );
	} );
} );
