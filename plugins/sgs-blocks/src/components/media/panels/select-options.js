/**
 * The option lists of the media panels' select fields, keyed by base (Spec 49 §9.4).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

/** @param {Array<[string,string]>} pairs `[ value, label ]` pairs. @return {Array} Options. */
const options = ( pairs ) => pairs.map( ( [ value, label ] ) => ( { value, label } ) );

export const SELECT_OPTIONS = {
	SvgAnimation: options( [
		[ 'none', __( 'None', 'sgs-blocks' ) ],
		[ 'pulse', __( 'Pulse', 'sgs-blocks' ) ],
		[ 'float', __( 'Float', 'sgs-blocks' ) ],
		[ 'wave', __( 'Wave', 'sgs-blocks' ) ],
	] ),
	SvgAnimationSpeed: options( [
		[ 'slow', __( 'Slow', 'sgs-blocks' ) ],
		[ 'medium', __( 'Medium', 'sgs-blocks' ) ],
		[ 'fast', __( 'Fast', 'sgs-blocks' ) ],
	] ),
	SvgLayer: options( [
		[ 'behind', __( 'Behind content', 'sgs-blocks' ) ],
		[ 'front', __( 'In front of content', 'sgs-blocks' ) ],
	] ),
	SvgPosition: options( [
		[ 'background', __( 'Behind content', 'sgs-blocks' ) ],
		[ 'foreground', __( 'In front of content', 'sgs-blocks' ) ],
	] ),
	Repeat: options( [
		[ 'no-repeat', __( "Don't repeat", 'sgs-blocks' ) ],
		[ 'repeat', __( 'Repeat both ways', 'sgs-blocks' ) ],
		[ 'repeat-x', __( 'Repeat across', 'sgs-blocks' ) ],
		[ 'repeat-y', __( 'Repeat down', 'sgs-blocks' ) ],
	] ),
	BorderStyle: options( [
		[ 'solid', __( 'Solid', 'sgs-blocks' ) ],
		[ 'dashed', __( 'Dashed', 'sgs-blocks' ) ],
		[ 'dotted', __( 'Dotted', 'sgs-blocks' ) ],
	] ),
	OverlayBlendMode: options( [
		[ 'normal', __( 'Normal', 'sgs-blocks' ) ],
		[ 'multiply', __( 'Multiply (darker)', 'sgs-blocks' ) ],
		[ 'screen', __( 'Screen (lighter)', 'sgs-blocks' ) ],
		[ 'overlay', __( 'Overlay', 'sgs-blocks' ) ],
		[ 'darken', __( 'Darken', 'sgs-blocks' ) ],
		[ 'lighten', __( 'Lighten', 'sgs-blocks' ) ],
		[ 'color-dodge', __( 'Colour dodge', 'sgs-blocks' ) ],
		[ 'color-burn', __( 'Colour burn', 'sgs-blocks' ) ],
		[ 'soft-light', __( 'Soft light', 'sgs-blocks' ) ],
		[ 'hard-light', __( 'Hard light', 'sgs-blocks' ) ],
		[ 'difference', __( 'Difference', 'sgs-blocks' ) ],
		[ 'exclusion', __( 'Exclusion', 'sgs-blocks' ) ],
	] ),
	Loading: options( [
		[ 'auto', __( 'Automatic', 'sgs-blocks' ) ],
		[ 'first', __( 'Load first', 'sgs-blocks' ) ],
		[ 'later', __( 'Load later', 'sgs-blocks' ) ],
	] ),
	CaptionTag: options( [
		[ 'figcaption', __( 'Figure caption', 'sgs-blocks' ) ],
		[ 'div', __( 'Div', 'sgs-blocks' ) ],
	] ),
};

SELECT_OPTIONS.OverlayBlend = SELECT_OPTIONS.OverlayBlendMode;
SELECT_OPTIONS.Blend = SELECT_OPTIONS.OverlayBlendMode;
