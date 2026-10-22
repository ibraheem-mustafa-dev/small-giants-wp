/**
 * Business Info: inspector controls for the `open-status` and `map` display types.
 *
 * Kept out of edit.js so that file stays under the length guideline.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl, TextControl, RangeControl } from '@wordpress/components';
import { ResponsiveLengthControl, BOX_UNITS, textRow, fillRow } from '../../components';

/**
 * Colour rows for today's row of the opening hours: text and background.
 *
 * @param {Object}   attributes    Block attributes.
 * @param {Function} setAttributes Block attribute setter.
 * @return {Array} SgsColourPanel rows.
 */
export function todayRowColourRows( attributes, setAttributes ) {
	return [
		textRow( {
			key: 'hoursTodayText',
			label: __( 'Today’s row text', 'sgs-blocks' ),
			attrs: { base: 'hoursTodayColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'hoursTodayBackground',
			label: __( 'Today’s row background', 'sgs-blocks' ),
			attrs: { base: 'hoursTodayBackground' },
			attributes,
			setAttributes,
		} ),
	];
}

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
			<ToggleControl
				label={ __( 'Pulse the dot while open', 'sgs-blocks' ) }
				help={ __( 'An endless expanding ring around the dot while the business is open. It does not play for visitors who ask their device for reduced motion.', 'sgs-blocks' ) }
				checked={ !! attributes.openStatusDotPulse }
				onChange={ ( val ) => setAttributes( { openStatusDotPulse: val } ) }
				__nextHasNoMarginBottom
			/>
			{ attributes.openStatusDotPulse && (
				<RangeControl
					label={ __( 'Pulse length (milliseconds)', 'sgs-blocks' ) }
					value={ attributes.openStatusDotPulseDuration ?? 1600 }
					min={ 200 }
					max={ 10000 }
					step={ 100 }
					onChange={ ( val ) => setAttributes( { openStatusDotPulseDuration: val ?? 1600 } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
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

const MAP_FILTER_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Greyscale', 'sgs-blocks' ), value: 'greyscale' },
	{ label: __( 'Muted', 'sgs-blocks' ), value: 'muted' },
	{ label: __( 'Sepia', 'sgs-blocks' ), value: 'sepia' },
	{ label: __( 'High contrast', 'sgs-blocks' ), value: 'high-contrast' },
	{ label: __( 'Dark', 'sgs-blocks' ), value: 'dark' },
];

const TODAY_WEIGHT_OPTIONS = [
	{ label: __( 'Keep the row’s weight', 'sgs-blocks' ), value: '' },
	{ label: __( 'Light (300)', 'sgs-blocks' ), value: '300' },
	{ label: __( 'Regular (400)', 'sgs-blocks' ), value: '400' },
	{ label: __( 'Medium (500)', 'sgs-blocks' ), value: '500' },
	{ label: __( 'Semi-bold (600)', 'sgs-blocks' ), value: '600' },
	{ label: __( 'Bold (700)', 'sgs-blocks' ), value: '700' },
	{ label: __( 'Extra bold (800)', 'sgs-blocks' ), value: '800' },
	{ label: __( 'Black (900)', 'sgs-blocks' ), value: '900' },
];

/** Font weight of today's row in the opening hours (its colours sit in the colour panel). */
export function TodayRowPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Today’s row', 'sgs-blocks' ) } initialOpen={ false }>
			<SelectControl
				label={ __( 'Today’s row weight', 'sgs-blocks' ) }
				help={ __( 'The row for the visitor’s current day (in the business’s time zone) is marked in their browser.', 'sgs-blocks' ) }
				value={ attributes.hoursTodayWeight || '' }
				options={ TODAY_WEIGHT_OPTIONS }
				onChange={ ( val ) => setAttributes( { hoursTodayWeight: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
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
			<ResponsiveLengthControl
				label={ __( 'Map height', 'sgs-blocks' ) }
				help={ __( 'Empty keeps 400px.', 'sgs-blocks' ) }
				units={ BOX_UNITS }
				value={ attributes.mapHeight }
				onChange={ ( obj ) => setAttributes( { mapHeight: obj } ) }
			/>
			<RangeControl
				label={ __( 'Zoom', 'sgs-blocks' ) }
				help={ __( '1 shows the world, 20 a single building.', 'sgs-blocks' ) }
				value={ attributes.mapZoom ?? 15 }
				min={ 1 }
				max={ 20 }
				step={ 1 }
				onChange={ ( val ) => setAttributes( { mapZoom: val ?? 15 } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<SelectControl
				label={ __( 'Map filter', 'sgs-blocks' ) }
				value={ attributes.mapFilterPreset || 'none' }
				options={ MAP_FILTER_OPTIONS }
				onChange={ ( val ) => setAttributes( { mapFilterPreset: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Custom map filter', 'sgs-blocks' ) }
				help={ __( 'Overrides the preset. CSS filter functions with numbers only, e.g. grayscale(.35) contrast(1.05). Anything else is ignored.', 'sgs-blocks' ) }
				value={ attributes.mapFilter ?? '' }
				onChange={ ( val ) => setAttributes( { mapFilter: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</PanelBody>
	);
}
