/**
 * sgs/icon visible label in the editor: the label text's fallback chain (own text, then the accessible name), the
 * position rule, the row's group switch and position through block context, the canvas twin (the same elements and
 * classes render.php prints, the label inside the link, an unlinked label wrapped in .sgs-icon__inner, the gap and own
 * colours as root custom properties) and the row's group label preview rule.
 *
 * Negative control: 'own label text wins, else the accessible name' fails when visibleLabel() ignores labelText, and
 * 'the canvas label sits inside the link' fails when the canvas drops the label (both proved by planting the break and
 * running this file).
 */

const React = require( 'react' );
const { createRoot } = require( 'react-dom/client' );
const { act } = require( 'react' );

import { visibleLabel, labelPositionFor, iconGroupContext, attributesInGroup } from '../../src/blocks/icon/icon-state';
import { brandBySlug } from '../../src/utils/brand-registry';
import { rowLabelPreviewCss } from '../../src/blocks/social-icons/labels';
import { rowCanvasStyle } from '../../src/blocks/social-icons/edit';
import { canvasLabelRootStyle } from '../../src/blocks/icon/edit';

const ROW_CONTEXT = {
	'sgs/socialIconsColourMode': 'inherit',
	'sgs/socialIconsShowLabel': true,
	'sgs/socialIconsLabelPosition': 'below',
};

describe( 'label text', () => {
	it( 'own label text wins, else the accessible name', () => {
		expect( visibleLabel( '  Insta ', { ariaLabel: 'Instagram', boundKey: '', glyphBrand: null, url: '' } ) ).toBe( 'Insta' );
		expect( visibleLabel( '', { ariaLabel: 'Instagram', boundKey: 'socials.instagram', glyphBrand: null, url: '' } ) ).toBe( 'Instagram' );
		expect( visibleLabel( '', { ariaLabel: '', boundKey: 'socials.instagram', glyphBrand: null, url: '' } ) ).toBe( 'Follow us on Instagram' );
		expect( visibleLabel( '', { ariaLabel: '', boundKey: '', glyphBrand: brandBySlug( 'whatsapp' ), url: '' } ) ).toBe( 'Message us on WhatsApp' );
		expect( visibleLabel( '', { ariaLabel: '', boundKey: '', glyphBrand: null, url: 'tel:+441217298233' } ) ).toBe( 'Call' );
		expect( visibleLabel( '', { ariaLabel: '', boundKey: '', glyphBrand: null, url: '/contact/' } ) ).toBe( '' );
	} );
} );

describe( 'label position and the row', () => {
	it( 'an icon left on end takes the row position; an own position wins', () => {
		expect( labelPositionFor( 'end', 'below' ) ).toBe( 'below' );
		expect( labelPositionFor( undefined, 'start' ) ).toBe( 'start' );
		expect( labelPositionFor( 'start', 'below' ) ).toBe( 'start' );
		expect( labelPositionFor( 'sideways', '' ) ).toBe( 'end' );
	} );

	it( 'the row switch and position reach the icon through context', () => {
		const group = iconGroupContext( ROW_CONTEXT );
		expect( group.showLabel ).toBe( true );
		expect( group.labelPosition ).toBe( 'below' );
		expect( attributesInGroup( { showLabel: false }, group ) ).toMatchObject( { showLabel: true, labelPosition: 'below' } );
		expect( attributesInGroup( { labelPosition: 'start' }, group ).labelPosition ).toBe( 'start' );
		expect( iconGroupContext( { 'sgs/socialIconsColourMode': 'inherit', 'sgs/socialIconsLabelPosition': 'x' } ) ).toMatchObject( { showLabel: false, labelPosition: '' } );
	} );
} );

describe( 'editor canvas', () => {
	let container;
	let root;

	beforeEach( () => {
		window.sgsBlocksData = { siteInfo: {} };
		container = document.createElement( 'div' );
		document.body.appendChild( container );
		root = createRoot( container );
	} );

	afterEach( () => {
		act( () => root.unmount() );
		container.remove();
	} );

	const mount = ( attributes, context ) => {
		const Edit = require( '../../src/blocks/icon/edit' ).default;
		act( () => {
			root.render( React.createElement( Edit, { attributes: { iconSource: 'lucide', iconName: 'star', ...attributes }, setAttributes: jest.fn(), clientId: 'c1', context } ) );
		} );
	};

	it( 'the canvas label sits inside the link with render.php classes', () => {
		mount( { showLabel: true, ariaLabel: 'Our shop', linkUrl: 'https://example.test/', labelGap: { desktop: '12px' }, labelColour: 'text-inverse' } );
		const label = container.querySelector( '.sgs-icon__link > .sgs-icon__label-text' );
		expect( label ).not.toBeNull();
		expect( label.textContent ).toBe( 'Our shop' );
		const rootEl = container.querySelector( '.sgs-icon' );
		expect( rootEl.classList.contains( 'sgs-icon--has-label' ) ).toBe( true );
		expect( rootEl.classList.contains( 'sgs-icon--own-label-colour' ) ).toBe( true );
		expect( container.querySelector( '.sgs-icon__label' ) ).toBeNull();
	} );

	it( 'the label gap and own colours are root custom properties (render.php twin)', () => {
		const style = canvasLabelRootStyle( { labelGap: { desktop: '12px', mobile: '4px;}x{' }, labelColour: 'text-inverse', labelColourHover: 'accent' }, 'desktop', [] );
		expect( style[ '--sgs-icon-label-gap' ] ).toBe( '12px' );
		expect( style[ '--sgs-icon-label-colour' ] ).toContain( '--wp--preset--color--text-inverse' );
		expect( style[ '--sgs-icon-label-colour-hover' ] ).toContain( '--wp--preset--color--accent' );
		expect( canvasLabelRootStyle( { labelGap: { desktop: '12px', mobile: '4px;}x{' } }, 'mobile', [] )[ '--sgs-icon-label-gap' ] ).toBeUndefined();
		expect( canvasLabelRootStyle( {}, 'desktop', [] ) ).toEqual( {} );
	} );

	it( 'no label without the switch, and an unlinked label wraps in .sgs-icon__inner', () => {
		mount( { ariaLabel: 'Our shop', linkUrl: 'https://example.test/' } );
		expect( container.querySelector( '.sgs-icon__label-text' ) ).toBeNull();
		mount( { showLabel: true, labelText: 'Free delivery', labelPosition: 'start' } );
		expect( container.querySelector( '.sgs-icon__inner > .sgs-icon__label-text' ).textContent ).toBe( 'Free delivery' );
		expect( container.querySelector( '.sgs-icon' ).classList.contains( 'sgs-icon--label-start' ) ).toBe( true );
	} );

	it( 'the row switch and position show on a child in the canvas', () => {
		mount( { ariaLabel: 'Instagram', linkUrl: 'https://instagram.com/shop' }, ROW_CONTEXT );
		expect( container.querySelector( '.sgs-icon__label-text' ).textContent ).toBe( 'Instagram' );
		expect( container.querySelector( '.sgs-icon' ).classList.contains( 'sgs-icon--label-below' ) ).toBe( true );
	} );
} );

describe( 'row group label preview', () => {
	it( 'prints the group colours, typography and gradient for the canvas', () => {
		const attributes = {
			childIconLabelColour: 'text-inverse',
			childIconLabelColourHover: 'accent',
			childIconLabelFontSize: { desktop: 13 },
			childIconLabelFontSizeUnit: 'px',
			childIconLabelColourGradient: 'linear-gradient(90deg,#ff0000 0%,#0000ff 100%)',
		};
		const style = rowCanvasStyle( attributes, 'desktop', [], [] );
		expect( style[ '--sgs-si-label-colour' ] ).toContain( '--wp--preset--color--text-inverse' );
		expect( style[ '--sgs-si-label-colour-hover' ] ).toContain( '--wp--preset--color--accent' );
		const css = rowLabelPreviewCss( 'sc', attributes, 'desktop' );
		expect( css ).toContain( '.sc .sgs-icon__label-text{' );
		expect( css ).toMatch( /font-size:13px/ );
		expect( css ).toContain( '.sc .sgs-icon:not(.sgs-icon--own-label-colour) .sgs-icon__label-text{background-image:linear-gradient' );
		expect( rowLabelPreviewCss( 'sc', { childIconLabelColourGradient: 'linear-gradient(red,blue)}body{color:red' }, 'desktop' ) ).toBe( '' );
	} );
} );
