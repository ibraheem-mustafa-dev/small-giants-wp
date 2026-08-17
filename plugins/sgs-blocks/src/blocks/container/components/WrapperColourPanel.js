/**
 * WrapperColourPanel — shared wrapper panel.
 *
 * Split out of ContainerWrapperControls.js on 2026-08-17 (Bean-requested). That file held six
 * independently-mountable shared panels in one module, which repeatedly read as a "monolith" — an
 * audit in this repo measured the decomposition by its LINE COUNT, concluded no split had happened,
 * and had to retract it. One panel per file removes the ambiguity: the split is visible in `ls`.
 *
 * Blocks may import this directly, or via ContainerWrapperControls.js which re-exports it for the
 * existing ~30 call sites.
 */

import { __ } from '@wordpress/i18n';
import { SgsColourPanel } from '../../../components';
import { isExtensionEnabled } from '../../extensions/hide-extensions';

export function WrapperColourPanel( { attributes, setAttributes, name } ) {
	if ( undefined !== name && ! isExtensionEnabled( name, 'background' ) ) {
		return null;
	}

	const {
		layout = 'stack',
		shapeDividerTop = '',
		shapeDividerBottom = '',
		shapeDividerTopColour,
		shapeDividerBottomColour,
		gridItemBackground = '',
		gridItemTextColour = '',
	} = attributes;

	return (
		<SgsColourPanel
			rows={ [
				shapeDividerTop && {
					key: 'shapeDividerTopColour',
					label: __( 'Top divider colour', 'sgs-blocks' ),
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: shapeDividerTopColour,
							onChange: ( val ) => setAttributes( { shapeDividerTopColour: val } ),
							linked: true,
						},
					],
				},
				shapeDividerBottom && {
					key: 'shapeDividerBottomColour',
					label: __( 'Bottom divider colour', 'sgs-blocks' ),
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: shapeDividerBottomColour,
							onChange: ( val ) => setAttributes( { shapeDividerBottomColour: val } ),
							linked: true,
						},
					],
				},
				'grid' === layout && {
					key: 'gridItemBackground',
					label: __( 'Grid item background colour', 'sgs-blocks' ),
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: gridItemBackground,
							onChange: ( val ) => setAttributes( { gridItemBackground: val } ),
							linked: true,
						},
					],
				},
				'grid' === layout && {
					key: 'gridItemTextColour',
					label: __( 'Grid item text colour', 'sgs-blocks' ),
					states: [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: gridItemTextColour,
							onChange: ( val ) => setAttributes( { gridItemTextColour: val } ),
							linked: true,
						},
					],
				},
			] }
		/>
	);
}

/**
 * Shape dividers panel (top + bottom).
 * Section kind only.
 */
