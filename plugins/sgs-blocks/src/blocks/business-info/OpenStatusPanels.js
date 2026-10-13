/**
 * Business Info: inspector controls for the `open-status` and `map` display types.
 *
 * Kept out of edit.js so that file stays under the length guideline.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl, TextControl } from '@wordpress/components';

/**
 * Colour rows for the shared SgsColourPanel: the dot, the pill text and the pill background,
 * each with an Open and a Closed state.
 *
 * @param {Object}   attributes    Block attributes.
 * @param {Function} setAttributes Block attribute setter.
 * @return {Array} SgsColourPanel rows.
 */
export function openStatusColourRows( attributes, setAttributes ) {
	const row = ( key, label, openAttr, closedAttr ) => ( {
		key,
		label,
		states: [
			{
				key: 'open',
				label: __( 'Open', 'sgs-blocks' ),
				value: attributes[ openAttr ],
				onChange: ( val ) => setAttributes( { [ openAttr ]: val ?? '' } ),
			},
			{
				key: 'closed',
				label: __( 'Closed', 'sgs-blocks' ),
				value: attributes[ closedAttr ],
				onChange: ( val ) => setAttributes( { [ closedAttr ]: val ?? '' } ),
			},
		],
	} );
	return [
		row( 'statusDot', __( 'Status dot', 'sgs-blocks' ), 'openStatusOpenDot', 'openStatusClosedDot' ),
		row( 'statusText', __( 'Status pill text', 'sgs-blocks' ), 'openStatusOpenText', 'openStatusClosedText' ),
		row( 'statusBackground', __( 'Status pill background', 'sgs-blocks' ), 'openStatusOpenBackground', 'openStatusClosedBackground' ),
	];
}

/** Wording and line controls for displayType `open-status`. */
export function OpenStatusPanel( { attributes, setAttributes } ) {
	const text = ( label, attr, placeholder, help ) => (
		<TextControl
			label={ label }
			help={ help }
			value={ attributes[ attr ] ?? '' }
			placeholder={ placeholder }
			onChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
	return (
		<PanelBody title={ __( 'Open Status', 'sgs-blocks' ) } initialOpen>
			<ToggleControl
				label={ __( 'Show closing or opening time', 'sgs-blocks' ) }
				help={ __(
					'The line under the pill: "Closes at 5pm today" while open, "Opens at 9:30am tomorrow" while closed. It is worked out in the visitor’s browser from the Site Info opening hours, in the business’s own time zone (Settings → General).',
					'sgs-blocks'
				) }
				checked={ false !== attributes.openStatusShowLine }
				onChange={ ( val ) => setAttributes( { openStatusShowLine: val } ) }
				__nextHasNoMarginBottom
			/>
			{ text( __( 'Open label', 'sgs-blocks' ), 'openStatusOpenLabel', __( 'Open now', 'sgs-blocks' ) ) }
			{ text( __( 'Closed label', 'sgs-blocks' ), 'openStatusClosedLabel', __( 'Closed', 'sgs-blocks' ) ) }
			{ text( __( 'Closes wording', 'sgs-blocks' ), 'openStatusClosesLabel', __( 'Closes at', 'sgs-blocks' ) ) }
			{ text( __( 'Opens wording', 'sgs-blocks' ), 'openStatusOpensLabel', __( 'Opens at', 'sgs-blocks' ) ) }
			{ text(
				__( 'Reopens wording', 'sgs-blocks' ),
				'openStatusReopensLabel',
				__( 'Closed until', 'sgs-blocks' ),
				__( 'Used between two sessions of the same day, e.g. "Closed until 2:30pm".', 'sgs-blocks' )
			) }
		</PanelBody>
	);
}

/** Source control for displayType `map`. */
export function MapSourcePanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Map', 'sgs-blocks' ) } initialOpen>
			<SelectControl
				label={ __( 'Show the map by', 'sgs-blocks' ) }
				help={ __(
					'Address pins the Site Info address. Business listing searches the business name plus its address, so the map shows the business’s own Google listing card (the name comes from Site Info, else the site title).',
					'sgs-blocks'
				) }
				value={ attributes.mapSource || 'address' }
				options={ [
					{ label: __( 'Address', 'sgs-blocks' ), value: 'address' },
					{ label: __( 'Google business listing', 'sgs-blocks' ), value: 'business' },
				] }
				onChange={ ( val ) => setAttributes( { mapSource: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}
