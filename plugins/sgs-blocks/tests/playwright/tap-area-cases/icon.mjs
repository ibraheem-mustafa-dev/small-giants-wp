// sgs/icon and its sgs/social-icons row: the link wraps the shape when a size is set, 44px with none.
// The custom properties are the ones render.php prints (IconRenderTest, SocialIconsRenderTest).
const glyph = '<span class="sgs-icon__svg"><svg viewBox="0 0 24 24" width="1em" height="1em"></svg></span>';
const linked = ( classes, vars = '' ) =>
	`<div class="sgs-icon wp-block-sgs-icon ${ classes }" style="${ vars }"><a class="sgs-icon__link" href="#"><span class="sgs-icon__shape">${ glyph }</span><span class="sgs-icon__label">Facebook</span></a></div>`;
const row = ( vars, child ) => `<ul class="sgs-social-icons wp-block-sgs-social-icons" style="${ vars };display:flex;list-style:none;margin:0;padding:0"><li>${ child }</li></ul>`;

export const CASES = [
	{
		name: 'row circle 34px (the Indus header)',
		styles: [ 'icon', 'social-icons' ],
		html: row( '--sgs-si-shape-w:34px;--sgs-si-tap-min:0px', linked( 'sgs-icon--shape-circle sgs-icon--has-bg sgs-icon--boxed', '--sgs-icon-size:17px;--sgs-icon-tap-min:0px' ) ),
		sel: '.sgs-icon__link',
		expect: { w: 34, h: 34 },
		sized: true,
	},
	{
		name: 'row circle 34px, the icon sets no size of its own',
		styles: [ 'icon', 'social-icons' ],
		html: row( '--sgs-si-shape-w:34px;--sgs-si-tap-min:0px', linked( 'sgs-icon--shape-circle sgs-icon--has-bg sgs-icon--boxed' ) ),
		sel: '.sgs-icon__link',
		expect: { w: 34, h: 34 },
		sized: true,
	},
	{
		name: 'own shape 30px, square',
		styles: [ 'icon' ],
		html: linked( 'sgs-icon--shape-square sgs-icon--has-bg sgs-icon--boxed', '--sgs-icon-shape-w:30px;--sgs-icon-tap-min:0px' ),
		sel: '.sgs-icon__link',
		expect: { w: 30, h: 30 },
		sized: true,
	},
	{
		name: 'own glyph 20px, no shape',
		styles: [ 'icon' ],
		html: linked( 'sgs-icon--shape-none', '--sgs-icon-size:20px;--sgs-icon-tap-min:0px' ),
		sel: '.sgs-icon__link',
		expect: { w: 20, h: 20 },
		sized: true,
	},
	{
		name: 'no size set: the 44px floor stays',
		styles: [ 'icon' ],
		html: linked( 'sgs-icon--shape-none' ),
		sel: '.sgs-icon__link',
		expect: { w: 44, h: 44 },
		sized: false,
	},
	{
		name: 'no size set in a row with only a gap: the 44px floor stays',
		styles: [ 'icon', 'social-icons' ],
		html: row( 'gap:8px', linked( 'sgs-icon--shape-circle sgs-icon--has-bg sgs-icon--boxed' ) ),
		sel: '.sgs-icon__link',
		expect: { w: 48, h: 48 },
		sized: false,
	},
];
