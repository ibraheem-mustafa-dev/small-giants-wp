/**
 * The atoms' settings, as data (Spec 49 C1).
 *
 * One entry per base an atom owns today, built from the vocabulary in
 * `MediaElementControls.js` (type, tiering) and a per-base table of what the
 * base paints and how the editor shows it. The registry hangs each atom's list
 * on its `settings` field; the generator reads the same lists to write the
 * framework's attribute classification overrides.
 *
 * Nothing in the editor or the renderer reads this file yet: it is the table
 * the emitters, controls and seeder read once the media system adopts it.
 *
 * `css.property` is the CSS property the setting prints (`null` when it prints
 * none), `css.paintNode` the node it paints (`media`, `surface`, `layout`,
 * `overlay`, `mask`), `css.state` the interaction state it styles. `role` is
 * the classification role the framework database stores for the attribute.
 *
 * @package
 */

import {
	MEDIA_ATTR_TYPES,
	MEDIA_TIERED_BASES,
} from '../MediaElementControls.js';

/**
 * Per-base facts, as `[ cssProperty, paintNode, emitter, role, component, label, panel, cssState ]`.
 *
 * `emitter` is the kind of twin that prints the value (`plain`, `sizing`,
 * `focal`, `sides`, `corners`, `shadow`, `colour-states`, `shape`) or `none`
 * for a value that prints no CSS.
 */
const BASE_TABLE = {
	// Source atom.
	ImageId: [ null, null, 'none', 'content', 'MediaSlotField', 'Photo', 'media' ],
	ImageUrl: [ null, null, 'none', 'content', 'MediaSlotField', 'Photo', 'media' ],
	VideoId: [ null, null, 'none', 'content', 'MediaSlotField', 'Video', 'media' ],
	VideoUrl: [ null, null, 'none', 'content', 'MediaSlotField', 'Video', 'media' ],
	SvgContent: [ null, null, 'none', 'content', 'MediaSlotField', 'SVG', 'media' ],
	Thumbnail: [ null, null, 'none', 'content', 'MediaSlotField', 'Cover image', 'media' ],
	ThumbnailId: [ null, null, 'none', 'content', 'MediaSlotField', 'Cover image', 'media' ],
	LottieId: [ null, null, 'none', 'content', 'MediaSlotField', 'Animation file', 'media' ],
	// Media-type atom.
	MediaType: [ null, null, 'none', 'behaviour', 'MediaKindField', 'Kind', 'media' ],
	VideoSource: [ null, null, 'none', 'behaviour', 'MediaKindField', 'Video source', 'media' ],
	VideoMimeType: [ null, null, 'none', 'technical', 'MediaKindField', 'Video type', 'media' ],
	// Video-behaviour atom.
	VideoAutoplay: [ null, null, 'none', 'behaviour', 'ToggleControl', 'Autoplay', 'video' ],
	VideoLoop: [ null, null, 'none', 'behaviour', 'ToggleControl', 'Loop', 'video' ],
	VideoMuted: [ null, null, 'none', 'behaviour', 'ToggleControl', 'Muted', 'video' ],
	VideoControls: [ null, null, 'none', 'behaviour', 'ToggleControl', 'Show controls', 'video' ],
	VideoPlaysInline: [ null, null, 'none', 'behaviour', 'ToggleControl', 'Play inline', 'video' ],
	VideoLazyLoad: [ null, null, 'none', 'behaviour', 'ToggleControl', 'Load when visible', 'video' ],
	VideoCaptionsId: [ null, null, 'none', 'content', 'MediaSlotField', 'Captions file', 'video' ],
	VideoCaptionsUrl: [ null, null, 'none', 'content', 'MediaSlotField', 'Captions file', 'video' ],
	VideoCaptionsLabel: [ null, null, 'none', 'content', 'TextControl', 'Captions label', 'video' ],
	VideoCaptionsSrcLang: [ null, null, 'none', 'content', 'TextControl', 'Captions language', 'video' ],
	LottieTrigger: [ null, null, 'none', 'behaviour', 'SelectControl', 'Play when', 'video' ],
	LottieSpeed: [ null, null, 'none', 'behaviour', 'RangeControl', 'Speed', 'video' ],
	// Meaning atom.
	ImageAlt: [ null, null, 'none', 'image-alt', 'AltField', 'Alt text', 'media' ],
	VideoAlt: [ null, null, 'none', 'a11y-text', 'AltField', 'Video description', 'media' ],
	ImageDecorative: [ null, null, 'none', 'behaviour', 'ToggleControl', 'Decorative', 'media' ],
	// Intrinsic atom: written from the chosen file, never edited.
	ImageWidth: [ null, null, 'none', 'technical', null, 'Width', 'media' ],
	ImageHeight: [ null, null, 'none', 'technical', null, 'Height', 'media' ],
	// SVG-presentation atom.
	SvgAnimation: [ null, null, 'none', 'behaviour', 'SelectControl', 'Animation', 'svg' ],
	SvgAnimationSpeed: [ null, null, 'none', 'behaviour', 'SelectControl', 'Animation speed', 'svg' ],
	SvgOpacity: [ 'opacity', 'media', 'plain', 'visual', 'RangeControl', 'Opacity', 'svg' ],
	SvgPosition: [ null, null, 'none', 'layout', 'SelectControl', 'Layer order', 'svg' ],
	SvgMinHeight: [ 'min-height', 'surface', 'plain', 'layout', 'LengthField', 'Smallest height', 'svg' ],
	SvgTextShadow: [ null, null, 'none', 'behaviour', 'ToggleControl', 'Text shadow', 'svg' ],
	// Object-fit atom.
	ObjectFit: [ 'object-fit', 'media', 'plain', 'visual', 'FitField', 'How it fills', 'size-and-crop' ],
	Size: [ 'background-size', 'media', 'plain', 'visual', 'FitField', 'How it fills', 'size-and-crop' ],
	// Focal-point atom.
	ObjectPosition: [ 'object-position', 'media', 'focal', 'visual', 'FocalField', 'Focal point', 'size-and-crop' ],
	Position: [ 'background-position', 'media', 'focal', 'visual', 'FocalField', 'Focal point', 'size-and-crop' ],
	Repeat: [ 'background-repeat', 'media', 'plain', 'visual', 'SelectControl', 'Tile', 'size-and-crop' ],
	Attachment: [ 'background-attachment', 'media', 'plain', 'visual', 'ToggleControl', 'Pinned', 'size-and-crop' ],
	// Box-shape atom.
	MediaSizing: [ null, null, 'none', 'behaviour', 'SizingField', 'Sizing', 'size-and-crop' ],
	AspectRatio: [ 'aspect-ratio', 'surface', 'sizing', 'layout', 'RatioField', 'Aspect ratio', 'size-and-crop' ],
	Shape: [ 'mask-image', 'mask', 'shape', 'visual', 'ShapeField', 'Shape', 'border-and-shape' ],
	Height: [ 'height', 'surface', 'sizing', 'layout', 'LengthField', 'Height', 'size-and-crop' ],
	MaxHeight: [ 'max-height', 'surface', 'plain', 'layout', 'LengthField', 'Largest height', 'size-and-crop' ],
	MaxWidth: [ 'max-width', 'layout', 'sizing', 'layout', 'LengthField', 'Largest width', 'size-and-crop' ],
	MinHeight: [ 'min-height', 'surface', 'plain', 'layout', 'LengthField', 'Smallest height', 'size-and-crop' ],
	Width: [ 'width', 'layout', 'sizing', 'layout', 'LengthField', 'Width', 'size-and-crop' ],
	BorderRadius: [ 'border-radius', 'surface', 'corners', 'visual', 'CornersField', 'Corners', 'border-and-shape' ],
	BorderWidth: [ 'border-width', 'surface', 'sides', 'visual', 'SidesField', 'Border width', 'border-and-shape' ],
	BorderStyle: [ 'border-style', 'surface', 'plain', 'visual', 'SelectControl', 'Border style', 'border-and-shape' ],
	BorderColour: [ 'border-color', 'surface', 'colour-states', 'color', 'ColourField', 'Border colour', 'border-and-shape' ],
	BorderColourGradient: [ 'border-image-source', 'surface', 'colour-states', 'colour-gradient', 'ColourField', 'Border gradient', 'border-and-shape' ],
	// Overlay atom.
	OverlayColour: [ 'background-color', 'overlay', 'colour-states', 'color', 'ColourField', 'Overlay colour', 'overlay-and-filters' ],
	OverlayColourHover: [ 'background-color', 'overlay', 'colour-states', 'color', 'ColourField', 'Overlay colour on hover', 'overlay-and-filters', 'hover' ],
	OverlayGradient: [ 'background-image', 'overlay', 'colour-states', 'colour-gradient', 'ColourField', 'Overlay gradient', 'overlay-and-filters' ],
	OverlayGradientHover: [ 'background-image', 'overlay', 'colour-states', 'colour-gradient', 'ColourField', 'Overlay gradient on hover', 'overlay-and-filters', 'hover' ],
	OverlayOpacity: [ 'opacity', 'overlay', 'plain', 'visual', 'RangeControl', 'Overlay strength', 'overlay-and-filters' ],
	OverlayBlendMode: [ 'mix-blend-mode', 'overlay', 'plain', 'visual', 'SelectControl', 'Overlay blend', 'overlay-and-filters' ],
	// Opacity atom.
	Opacity: [ 'opacity', 'media', 'plain', 'visual', 'RangeControl', 'Photo opacity', 'overlay-and-filters' ],
	// Shadow atom.
	BoxShadow: [ 'box-shadow', 'surface', 'shadow', 'visual', 'ShadowControl', 'Shadow', 'shadow' ],
	BoxShadowColour: [ 'box-shadow', 'surface', 'shadow', 'color', 'ColourField', 'Shadow colour', 'shadow' ],
	BoxShadowColourHover: [ 'box-shadow', 'surface', 'shadow', 'color', 'ColourField', 'Shadow colour on hover', 'shadow', 'hover' ],
	// Media-padding atom.
	Padding: [ 'padding', 'surface', 'sides', 'layout', 'SidesField', 'Padding', 'border-and-shape' ],
	// Caption atom.
	Caption: [ null, null, 'none', 'content', 'RichTextField', 'Caption', 'caption-and-link' ],
	CaptionTag: [ null, null, 'none', 'tag-identity', 'SelectControl', 'Caption tag', 'caption-and-link' ],
	// Link atom.
	LinkUrl: [ null, null, 'none', 'link-href', 'LinkField', 'Link', 'caption-and-link' ],
	LinkOpensNewTab: [ null, null, 'none', 'behaviour', 'ToggleControl', 'Open in a new tab', 'caption-and-link' ],
	LinkRel: [ null, null, 'none', 'technical', 'TextControl', 'Link relationship', 'caption-and-link' ],
	LinkUrlSource: [ null, null, 'none', 'technical', 'SelectControl', 'Link source', 'caption-and-link' ],
};

/**
 * Build the C1 settings list for one atom.
 *
 * @param {string[]} bases The bases the atom owns.
 * @param {string}   since The release the atom first shipped in.
 * @return {Object[]} One C1 entry per base, in the atom's base order.
 */
export function settingsForBases( bases, since = '1.0' ) {
	return bases.map( ( base, index ) => {
		const row = BASE_TABLE[ base ];
		if ( ! row ) {
			throw new Error(
				`sgs/media-atoms: base "${ base }" has no row in atom-settings.js BASE_TABLE.`
			);
		}
		const [ property, paintNode, emitter, role, component, label, panel, state ] = row;
		const css = { property, paintNode };
		if ( state ) {
			css.state = state;
		}
		return {
			base,
			type: MEDIA_ATTR_TYPES[ base ] || 'string',
			responsive: MEDIA_TIERED_BASES.includes( base ),
			since,
			emitter,
			role,
			css,
			control: component ? { component, label, panel, order: index + 1 } : null,
			slots: 'all',
		};
	} );
}

export { BASE_TABLE };
