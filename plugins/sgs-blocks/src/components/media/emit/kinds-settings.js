/**
 * The C1 settings of the four atoms Spec 49 adds (`sizing`, `shape`, `filter`, `layout`), as data. They use the §8 base
 * names; `atom-settings.js` holds the settings of the bases the older atoms own today.
 *
 * Nothing reads these until a slot declares `kinds`. Each row's `slots` says which kinds and contexts it applies to
 * (Spec 49 §9.3 and Appendix C); the generator writes a row only for a slot whose kinds and context it allows.
 *
 * @package SGS\Blocks
 */

/** The four kinds a slot may allow. */
export const ALL_KINDS = [ 'image', 'video', 'embed', 'svg' ];

/** Every context a `mediaElements` entry may declare. */
export const ALL_CONTEXTS = [ 'element', 'item', 'content', 'background' ];

/** Every context except a container background, which shows media, fit, focal, tile, pinned, overlay and opacity only (§9.3). */
export const NOT_BACKGROUND = [ 'element', 'item', 'content' ];

/**
 * Which slots a row applies to.
 *
 * @param {string[]} kinds    Kinds the row applies to.
 * @param {string[]} contexts Contexts the row applies to.
 * @return {{kinds: string[], contexts: string[]}} Slot descriptor.
 */
export const slotsOf = ( kinds, contexts ) => ( { kinds, contexts } );

/** Colour treatments need pixels to filter: not an embed. */
const FILTER_SLOTS = slotsOf( [ 'image', 'video', 'svg' ], NOT_BACKGROUND );

const SIZES = 'size-and-crop';
const BORDER = 'border-and-shape';
const LAYOUT = 'position-in-layout';

/**
 * One C1 entry.
 *
 * @param {string}      base      Base name.
 * @param {string}      type      Attribute type.
 * @param {boolean}     tiered    Per device.
 * @param {string}      emitter   Emitter kind.
 * @param {string}      property  CSS property, or null.
 * @param {string}      paintNode Paint node.
 * @param {string}      component Control component.
 * @param {string}      label     Control label.
 * @param {string}      panel     Panel id.
 * @param {number}      order     Position in the panel.
 * @param {string}      state     Interaction state the setting styles, if any.
 * @param {Object}      slots     Kinds and contexts the setting applies to.
 * @return {Object} C1 entry.
 */
function entry( base, type, tiered, emitter, property, paintNode, component, label, panel, order, state = '', slots = slotsOf( ALL_KINDS, NOT_BACKGROUND ) ) {
	const css = { property, paintNode };
	if ( state ) {
		css.state = state;
	}
	return {
		base,
		type,
		responsive: tiered,
		since: '2.0',
		emitter,
		role: 'layout',
		css,
		control: { component, label, panel, order },
		slots,
	};
}

export const SIZING_SETTINGS = [
	entry( 'Ratio', 'string', true, 'sizing', 'aspect-ratio', 'surface', 'RatioField', 'Aspect ratio', SIZES, 1 ),
	entry( 'Width', 'string', true, 'sizing', 'width', 'layout', 'WidthField', 'Width', SIZES, 2 ),
	entry( 'Height', 'string', true, 'sizing', 'height', 'surface', 'HeightField', 'Height', SIZES, 3 ),
	entry( 'MinWidth', 'string', true, 'sizing', 'min-width', 'layout', 'LimitsGroup', 'Smallest width', SIZES, 4 ),
	entry( 'MaxWidth', 'string', true, 'sizing', 'max-width', 'layout', 'LimitsGroup', 'Largest width', SIZES, 5 ),
	entry( 'MinHeight', 'string', true, 'sizing', 'min-height', 'surface', 'LimitsGroup', 'Smallest height', SIZES, 6 ),
	entry( 'MaxHeight', 'string', true, 'sizing', 'max-height', 'surface', 'LimitsGroup', 'Largest height', SIZES, 7 ),
];

export const SHAPE_SETTINGS = [
	entry( 'Shape', 'object', true, 'shape', 'mask-image', 'mask', 'ShapeField', 'Shape', BORDER, 1 ),
	entry( 'Radius', 'object', true, 'corners', 'border-radius', 'surface', 'CornersField', 'Corners', BORDER, 2 ),
	entry( 'BorderWidth', 'object', false, 'sides', 'border-width', 'surface', 'SidesField', 'Border width', BORDER, 3 ),
	entry( 'BorderStyle', 'string', false, 'plain', 'border-style', 'surface', 'SelectControl', 'Border style', BORDER, 4 ),
	entry( 'BorderColour', 'string', false, 'colour-states', 'border-color', 'surface', 'ColourField', 'Border colour', BORDER, 5 ),
];

export const FILTER_SETTINGS = [
	entry( 'Colour', 'string', true, 'filter', 'filter', 'media', 'ColourTreatmentField', 'Colour', 'overlay-and-filters', 6, '', FILTER_SLOTS ),
	entry( 'Greyscale', 'number', false, 'filter', 'filter', 'media', 'RangeControl', 'Black and white strength', 'overlay-and-filters', 7, '', FILTER_SLOTS ),
];

export const LAYOUT_SETTINGS = [
	entry( 'Alignment', 'string', true, 'plain', 'margin-inline-start', 'layout', 'AlignmentField', 'Alignment', LAYOUT, 1 ),
	entry( 'Order', 'number', true, 'plain', 'order', 'layout', 'NumberControl', 'Order', LAYOUT, 2 ),
];
