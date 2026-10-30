/**
 * Text by time of day (Spec 02 FR-2-14): a block's words change with the
 * hour, in the visitor's browser, so the page cache stays on.
 *
 * One shared setting any text block opts into with
 *
 *   "supports": { "sgs": { "enabledExtensions": [ "timeText" ], "timeTextWords": "<attribute holding its words>" } }
 *
 * (sgs/heading, sgs/text and sgs/label). Attributes:
 *   - sgsTimeText:     [ { start, end, text } ]: whole hours, start 0-23 and
 *     end 1-24; a range covers start <= hour < end, and a range whose start
 *     is after its end spans midnight (21 to 5). The first range covering
 *     the hour shows; an hour no range covers shows the block's own words.
 *   - sgsTimeTextZone: '' (the visitor's own time), 'site' (the site's time
 *     zone, Settings > General) or a time zone name such as Europe/London.
 *
 * The server half is includes/time-text.php (fallback words, data attributes,
 * the `@sgs/time-text` swap module). The canvas shows the block's own words;
 * the panel's "Showing now" line says which range a visitor sees this hour.
 * Business opening hours are not this setting: sgs/business-info's open
 * status display computes them from Site Info.
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import {
	Button,
	ComboboxControl,
	PanelBody,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { getSettings as getDateSettings } from '@wordpress/date';
import { isExtensionEnabled } from './hide-extensions';
import { hourIn, normaliseRanges, rangeFor } from '../../shared/time-text-range';
import './time-text.scss';

const SLUG = 'timeText';
const pad = ( h ) => `${ String( h ).padStart( 2, '0' ) }:00`;
const START_OPTIONS = Array.from( { length: 24 }, ( _, h ) => ( { value: String( h ), label: pad( h ) } ) );
const END_OPTIONS = Array.from( { length: 24 }, ( _, i ) => ( { value: String( i + 1 ), label: pad( i + 1 ) } ) );
const ZONE_MODES = [
	{ value: '', label: __( "Visitor's local time", 'sgs-blocks' ) },
	{ value: 'site', label: __( 'Site time zone', 'sgs-blocks' ) },
	{ value: 'named', label: __( 'A named time zone', 'sgs-blocks' ) },
];

addFilter( 'blocks.registerBlockType', 'sgs/time-text/attributes', ( settings ) => {
	if ( ! isExtensionEnabled( settings, SLUG ) ) {
		return settings;
	}
	return {
		...settings,
		attributes: {
			...settings.attributes,
			sgsTimeText: { type: 'array', default: [] },
			sgsTimeTextZone: { type: 'string', default: '' },
		},
	};
} );

/**
 * Every time zone name the browser knows, for the named-zone picker.
 *
 * @return {Array<{value: string, label: string}>} Picker options.
 */
function zoneOptions() {
	const names = 'function' === typeof Intl.supportedValuesOf ? Intl.supportedValuesOf( 'timeZone' ) : [];
	return names.map( ( z ) => ( { value: z, label: z.replace( /_/g, ' ' ) } ) );
}

/**
 * The zone the "Showing now" line reads: the site's zone for 'site' (its name,
 * else its UTC offset), else the stored value.
 *
 * @param {string} zone Stored sgsTimeTextZone.
 * @return {string} '' or a zone name or offset.
 */
function previewZone( zone ) {
	if ( 'site' !== zone ) {
		return zone;
	}
	const tz = getDateSettings()?.timezone || {};
	if ( tz.string ) {
		return tz.string;
	}
	const offset = Number( tz.offset );
	if ( ! Number.isFinite( offset ) ) {
		return '';
	}
	const minutes = Math.round( Math.abs( offset ) * 60 );
	return `${ offset < 0 ? '-' : '+' }${ String( Math.floor( minutes / 60 ) ).padStart( 2, '0' ) }:${ String( minutes % 60 ).padStart( 2, '0' ) }`;
}

function TimeTextPanel( { attributes, setAttributes } ) {
	const ranges = Array.isArray( attributes.sgsTimeText ) ? attributes.sgsTimeText : [];
	const zone = 'string' === typeof attributes.sgsTimeTextZone ? attributes.sgsTimeTextZone : '';
	const zoneMode = '' === zone || 'site' === zone ? zone : 'named';
	const write = ( next ) => setAttributes( { sgsTimeText: next } );
	const update = ( i, patch ) => write( ranges.map( ( r, j ) => ( j === i ? { ...r, ...patch } : r ) ) );
	const last = ranges[ ranges.length - 1 ];
	const addRange = () => {
		const start = last ? Number( last.end ) % 24 : 0;
		write( [ ...ranges, { start, end: Math.min( start + 6, 24 ), text: '' } ] );
	};

	const hour = hourIn( new Date(), previewZone( zone ) );
	const showing = rangeFor( ranges, hour );
	const usable = normaliseRanges( ranges ).length;
	let preview = __( 'Add a range to change the words by the hour.', 'sgs-blocks' );
	if ( usable ) {
		preview = showing
			? sprintf(
				/* translators: 1: the hour now, 2: range start, 3: range end, 4: the words shown. */
				__( 'Showing now (%1$s): %2$s to %3$s, "%4$s".', 'sgs-blocks' ),
				pad( hour ),
				pad( showing.start ),
				pad( showing.end ),
				showing.text
			)
			: sprintf(
				/* translators: %s: the hour now. */
				__( "Showing now (%s): the block's own words, as no range covers this hour.", 'sgs-blocks' ),
				pad( hour )
			);
	}

	return (
		<PanelBody title={ __( 'Text by time of day', 'sgs-blocks' ) } initialOpen={ ranges.length > 0 }>
			<p className="components-base-control__help">
				{ __( 'Each range shows its own words from its start hour until its end hour. A range can run past midnight (21:00 to 05:00). Hours no range covers show the block\'s own words, which visitors without JavaScript and search engines always see.', 'sgs-blocks' ) }
			</p>
			{ ranges.map( ( range, i ) => (
				<fieldset key={ i } className="sgs-time-text-range">
					<legend className="screen-reader-text">
						{ sprintf(
							/* translators: %d: the range's number. */
							__( 'Range %d', 'sgs-blocks' ),
							i + 1
						) }
					</legend>
					<SelectControl
						label={ __( 'From', 'sgs-blocks' ) }
						value={ String( range.start ?? 0 ) }
						options={ START_OPTIONS }
						onChange={ ( v ) => update( i, { start: Number( v ) } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Until', 'sgs-blocks' ) }
						value={ String( range.end ?? 24 ) }
						options={ END_OPTIONS }
						onChange={ ( v ) => update( i, { end: Number( v ) } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Words', 'sgs-blocks' ) }
						value={ range.text ?? '' }
						onChange={ ( v ) => update( i, { text: v } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<Button
						variant="link"
						isDestructive
						onClick={ () => write( ranges.filter( ( _, j ) => j !== i ) ) }
					>
						{ sprintf(
							/* translators: %d: the range's number. */
							__( 'Remove range %d', 'sgs-blocks' ),
							i + 1
						) }
					</Button>
				</fieldset>
			) ) }
			<Button variant="secondary" onClick={ addRange } __next40pxDefaultSize>
				{ __( 'Add range', 'sgs-blocks' ) }
			</Button>
			<SelectControl
				label={ __( 'Whose time decides', 'sgs-blocks' ) }
				value={ zoneMode }
				options={ ZONE_MODES }
				onChange={ ( v ) => {
					if ( 'named' === v ) {
						setAttributes( { sgsTimeTextZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } );
					} else {
						setAttributes( { sgsTimeTextZone: v } );
					}
				} }
				help={ __( "The visitor's local time suits a greeting; a set time zone suits words tied to a place.", 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ 'named' === zoneMode && (
				<ComboboxControl
					label={ __( 'Time zone', 'sgs-blocks' ) }
					value={ zone }
					options={ zoneOptions() }
					onChange={ ( v ) => setAttributes( { sgsTimeTextZone: v || '' } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			<p className="components-base-control__help">{ preview }</p>
		</PanelBody>
	);
}

const withTimeTextControls = createHigherOrderComponent( ( BlockEdit ) => ( props ) => {
	if ( ! isExtensionEnabled( props.name, SLUG ) ) {
		return <BlockEdit { ...props } />;
	}
	return (
		<>
			<BlockEdit { ...props } />
			<InspectorControls>
				<TimeTextPanel attributes={ props.attributes } setAttributes={ props.setAttributes } />
			</InspectorControls>
		</>
	);
}, 'withTimeTextControls' );

addFilter( 'editor.BlockEdit', 'sgs/time-text/controls', withTimeTextControls );
