// sgs/gallery, sgs/media, sgs/google-rating-badge and sgs/tabs: a size the client set is the tap area, 44px with none.
// The custom properties are the ones render.php prints (GalleryLinkedTileTest, GoogleRatingBadgeTest).
// sgs/tabs reads --sgs-tab-min-height in its stacked mobile rule too, but that rule only applies under 768px, so a
// tabs reading cannot be red at all three widths and has no sized case here; its unsized floor is covered below.
// The badge's ::after hit box is absolutely positioned and has no layout size to measure, so the cases below carry a
// script that copies the ::after's computed width and height onto a probe element each time a stylesheet is added.
const probeScript = `<script>new MutationObserver(()=>{const a=getComputedStyle(document.querySelector('.sgs-google-rating-badge__link'),'::after');const p=document.getElementById('probe');p.style.width=a.width;p.style.height=a.height;}).observe(document.head,{childList:true});</script>`;
const badge = ( vars ) =>
	`<a class="sgs-google-rating-badge__link" href="#" style="display:block;position:relative;width:30px;height:30px;${ vars }"></a><div id="probe" style="position:absolute;top:100px"></div>${ probeScript }`;

export const CASES = [
	{
		name: 'gallery linked tile 30px high (tileMinHeight)',
		styles: [ 'gallery' ],
		html: '<figure class="sgs-gallery__item" style="width:200px;margin:0;--sgs-gallery-tap-min:0px;min-height:30px"><a class="sgs-gallery__item-link" href="#"><span style="display:block;height:30px"></span></a></figure>',
		sel: '.sgs-gallery__item-link',
		expect: { w: 200, h: 30 },
		sized: true,
	},
	{
		name: 'gallery linked tile with no height set: the 44px floor stays',
		styles: [ 'gallery' ],
		html: '<figure class="sgs-gallery__item" style="width:200px;margin:0"><a class="sgs-gallery__item-link" href="#"><span style="display:block;height:30px"></span></a></figure>',
		sel: '.sgs-gallery__item-link',
		expect: { w: 200, h: 44 },
		sized: false,
	},
	{
		name: 'media link around an image 30px high (height set)',
		styles: [ 'media' ],
		html: '<figure class="wp-block-sgs-media sgs-media sgs-media-x" style="width:200px;margin:0;--sgs-media-tap-min:0px"><a class="sgs-media__link" href="#"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" style="display:block;width:30px;height:30px"></a></figure>',
		sel: '.sgs-media__link',
		expect: { w: 200, h: 30 },
		sized: true,
	},
	{
		name: 'media link around an image with no size set: the 44px floor stays',
		styles: [ 'media' ],
		html: '<figure class="wp-block-sgs-media sgs-media sgs-media-x" style="width:200px;margin:0"><a class="sgs-media__link" href="#"><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" style="display:block;width:30px;height:30px"></a></figure>',
		sel: '.sgs-media__link',
		expect: { w: 200, h: 44 },
		sized: false,
	},
	{
		name: 'rating badge 30px high, minHeight set: the hit box wraps the badge padding box (28px inside its 1px border)',
		styles: [ 'google-rating-badge' ],
		html: badge( '--sgs-grb-tap-min:0px' ),
		sel: '#probe',
		expect: { w: 28, h: 28 },
		sized: true,
	},
	{
		name: 'rating badge with no minHeight: the hit box stays 44px',
		styles: [ 'google-rating-badge' ],
		html: badge( '' ),
		sel: '#probe',
		expect: { w: 44, h: 44 },
		sized: false,
	},
	{
		name: 'tab with no height set: the 44px floor stays',
		styles: [ 'tabs' ],
		html: '<div style="--sgs-tab-padding:0"><button type="button" class="sgs-tabs__tab">x</button></div>',
		sel: '.sgs-tabs__tab',
		expect: { w: 44, h: 44 },
		sized: false,
	},
];
