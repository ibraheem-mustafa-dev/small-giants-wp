/**
 * The icon shape picker and the outline SVG the canvas draws, both from the one shape list
 * (`src/utils/icon-shapes.js`, which reads `includes/data/icon-shapes.json`): the box shapes as simple outlines, the
 * custom outlines from their registry paths. `sgs/icon`'s Shape panel and `sgs/social-icons`' group shape mount
 * ShapeToggle; the canvas mounts CanvasOutline, render.php's `sgs_icon_outline_svg()` twin (same element, classes and
 * clip, so style.css paints both).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useInstanceId } from '@wordpress/compose';
import { ToggleGroupControl, ToggleGroupControlOptionIcon } from '../../components/primitives';
import { BOX_SHAPES, OUTLINE_SHAPES, outlineShape } from '../../utils/icon-shapes';

const BOX_LABELS = {
	square: __( 'Square', 'sgs-blocks' ),
	circle: __( 'Circle', 'sgs-blocks' ),
	pill: __( 'Pill', 'sgs-blocks' ),
};

/**
 * Every shape the picker offers, in the enum's order: the box shapes, then the outlines.
 *
 * @return {Array<{value:string, label:string}>} Options.
 */
export function shapeOptions() {
	return [
		...BOX_SHAPES.map( ( value ) => ( { value, label: BOX_LABELS[ value ] } ) ),
		...OUTLINE_SHAPES.map( ( shape ) => ( { value: shape.slug, label: shape.label } ) ),
	];
}

/**
 * A shape drawn as a 24px line icon for the picker.
 *
 * @param {Object} props
 * @param {string} props.shape A shape value.
 * @return {JSX.Element} SVG.
 */
export function ShapeOptionIcon( { shape } ) {
	const outline = outlineShape( shape );
	let body;
	if ( outline ) {
		body = <path d={ outline.d } />;
	} else if ( 'circle' === shape ) {
		body = <circle cx="50" cy="50" r="50" />;
	} else if ( 'pill' === shape ) {
		body = <rect x="0" y="22" width="100" height="56" rx="28" />;
	} else {
		body = <rect x="0" y="0" width="100" height="100" rx="4" />;
	}
	return (
		<svg
			viewBox="-8 -8 116 116"
			width="24"
			height="24"
			fill="none"
			stroke="currentColor"
			strokeWidth="9"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			{ body }
		</svg>
	);
}

/**
 * The shape picker: one icon option per shape, named by its tooltip.
 *
 * @param {Object}   props
 * @param {string}   props.label          Control label.
 * @param {string}   [props.help]         Help text.
 * @param {string}   props.value          Current shape ('' for none picked).
 * @param {Function} props.onChange       Receives the picked shape (undefined when deselected).
 * @param {boolean}  [props.isDeselectable] Clicking the picked shape clears it (a group default).
 * @return {JSX.Element} The control.
 */
export function ShapeToggle( { label, help, value, onChange, isDeselectable = false } ) {
	return (
		<ToggleGroupControl
			label={ label }
			help={ help }
			value={ value }
			onChange={ onChange }
			isBlock
			isDeselectable={ isDeselectable }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		>
			{ shapeOptions().map( ( option ) => (
				<ToggleGroupControlOptionIcon
					key={ option.value }
					value={ option.value }
					label={ option.label }
					icon={ <ShapeOptionIcon shape={ option.value } /> }
				/>
			) ) }
		</ToggleGroupControl>
	);
}

/**
 * The outline SVG behind the glyph on the canvas. Twin: sgs_icon_outline_svg().
 *
 * @param {Object} props
 * @param {string} props.shape An outline slug.
 * @return {JSX.Element|null} SVG, or null for a box shape.
 */
export function CanvasOutline( { shape } ) {
	const clipId = `sgs-icn-ed-${ useInstanceId( CanvasOutline ) }-oc`;
	const outline = outlineShape( shape );
	if ( ! outline ) {
		return null;
	}
	return (
		<svg className="sgs-icon__outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
			<defs>
				<clipPath id={ clipId }>
					<path d={ outline.d } />
				</clipPath>
			</defs>
			<path className="sgs-icon__outline-path" d={ outline.d } clipPath={ `url(#${ clipId })` } />
		</svg>
	);
}
