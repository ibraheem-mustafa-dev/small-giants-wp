/**
 * SGS Local Time — editor component.
 *
 * Renders a static preview (the server time at edit-time; it does not tick in
 * the editor canvas) so the operator can see label/separator/colour choices.
 * Frontend ticking is view.js's job (Intl.DateTimeFormat), never the editor's.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	ComboboxControl,
} from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import {
	SgsColourPanel,
	textRow,
	TypographyControls,
	ResponsiveOverride,
	SpacingControl,
} from '../../components';

/**
 * The IANA time-zone list, from the runtime when available. Every evergreen
 * browser and Node 18+ support Intl.supportedValuesOf; a handful of stable
 * fallbacks cover an editor running in an older embedded webview.
 *
 * @return {string[]} Sorted IANA zone identifiers.
 */
function getTimeZoneOptions() {
	if (
		typeof Intl !== 'undefined' &&
		typeof Intl.supportedValuesOf === 'function'
	) {
		try {
			return Intl.supportedValuesOf( 'timeZone' );
		} catch ( e ) {
			// Fall through to the static fallback below.
		}
	}
	return [
		'UTC',
		'Europe/London',
		'Europe/Paris',
		'America/New_York',
		'America/Los_Angeles',
		'Asia/Hong_Kong',
		'Asia/Tokyo',
		'Asia/Dubai',
		'Australia/Sydney',
	];
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		timeZone,
		label,
		labelPosition,
		separator,
		hourCycle,
		showSeconds,
		showPeriod,
		gap,
		labelColour,
		labelColourHover,
		labelColourGradient,
		labelColourHoverGradient,
		timeColour,
		timeColourHover,
		timeColourGradient,
		timeColourHoverGradient,
	} = attributes;

	const blockProps = useBlockProps( { className: 'sgs-local-time' } );

	const zoneOptions = getTimeZoneOptions().map( ( zone ) => ( {
		value: zone,
		label: zone,
	} ) );

	// Editor-canvas preview — the current time in the chosen zone (or the
	// browser's local zone when none is set, a reasonable editor-only stand-in
	// for the site zone view.js/render.php resolve to on the frontend). Static:
	// it does not tick, matching countdown-timer's "editor shows a snapshot"
	// precedent — a ticking editor canvas re-renders on every second for no
	// operator benefit.
	let previewText = '--:--';
	try {
		previewText = new Intl.DateTimeFormat( undefined, {
			timeZone: timeZone || undefined,
			hourCycle,
			hour: 'numeric',
			minute: '2-digit',
			second: showSeconds ? '2-digit' : undefined,
		} ).format( new Date() );
		if ( 'h12' === hourCycle && ! showPeriod ) {
			previewText = previewText.replace( /\s*[AP]M\s*$/i, '' );
		}
	} catch ( e ) {
		previewText = '--:--';
	}

	const labelNode = label ? (
		<span className="sgs-local-time__label">{ label }</span>
	) : null;
	const sepNode =
		separator && 'above' !== labelPosition ? (
			<span className="sgs-local-time__sep" aria-hidden="true">
				{ separator }
			</span>
		) : null;
	const timeNode = (
		<time className="sgs-local-time__time">{ previewText }</time>
	);

	let orderedChildren;
	if ( 'after' === labelPosition ) {
		orderedChildren = [ timeNode, sepNode, labelNode ];
	} else if ( 'above' === labelPosition ) {
		orderedChildren = [ labelNode, timeNode ];
	} else {
		orderedChildren = [ labelNode, sepNode, timeNode ];
	}

	return (
		<>
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'label',
						label: __( 'Label colour', 'sgs-blocks' ),
						attrs: {
							base: 'labelColour',
							hover: 'labelColourHover',
							gradient: 'labelColourGradient',
							hoverGradient: 'labelColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'time',
						label: __( 'Time colour', 'sgs-blocks' ),
						attrs: {
							base: 'timeColour',
							hover: 'timeColourHover',
							gradient: 'timeColourGradient',
							hoverGradient: 'timeColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Local Time Settings', 'sgs-blocks' ) }>
					<ComboboxControl
						label={ __( 'Time zone', 'sgs-blocks' ) }
						help={ __(
							'Leave blank to use the site’s own time zone.',
							'sgs-blocks'
						) }
						value={ timeZone }
						options={ zoneOptions }
						onChange={ ( val ) =>
							setAttributes( { timeZone: val || '' } )
						}
						allowReset
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Label', 'sgs-blocks' ) }
						help={ __(
							'e.g. a city name — "London", "LA".',
							'sgs-blocks'
						) }
						value={ label }
						onChange={ ( val ) =>
							setAttributes( { label: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleGroupControl
						label={ __( 'Label position', 'sgs-blocks' ) }
						value={ labelPosition }
						onChange={ ( val ) =>
							setAttributes( { labelPosition: val } )
						}
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption
							value="before"
							label={ __( 'Before', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="after"
							label={ __( 'After', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="above"
							label={ __( 'Above', 'sgs-blocks' ) }
						/>
					</ToggleGroupControl>
					{ 'above' !== labelPosition && (
						<TextControl
							label={ __( 'Separator', 'sgs-blocks' ) }
							help={ __(
								'Shown between the label and the time, e.g. "→" or ",".',
								'sgs-blocks'
							) }
							value={ separator }
							onChange={ ( val ) =>
								setAttributes( { separator: val } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
					<ToggleGroupControl
						label={ __( 'Hour cycle', 'sgs-blocks' ) }
						value={ hourCycle }
						onChange={ ( val ) =>
							setAttributes( { hourCycle: val } )
						}
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption
							value="h12"
							label={ __( '12-hour', 'sgs-blocks' ) }
						/>
						<ToggleGroupControlOption
							value="h23"
							label={ __( '24-hour', 'sgs-blocks' ) }
						/>
					</ToggleGroupControl>
					<ToggleControl
						label={ __( 'Show seconds', 'sgs-blocks' ) }
						checked={ !! showSeconds }
						onChange={ ( val ) =>
							setAttributes( { showSeconds: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ 'h12' === hourCycle && (
						<ToggleControl
							label={ __( 'Show AM/PM', 'sgs-blocks' ) }
							checked={ !! showPeriod }
							onChange={ ( val ) =>
								setAttributes( { showPeriod: val } )
							}
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="sgs-local-time__typography-heading">
						{ __( 'Label', 'sgs-blocks' ) }
					</p>
					<TypographyControls
						fontSizePresets
						showFontFamily
						showDecoration
						showTransform
						showLetterSpacing
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="label"
					/>
					<p className="sgs-local-time__typography-heading">
						{ __( 'Time', 'sgs-blocks' ) }
					</p>
					<TypographyControls
						fontSizePresets
						showFontFamily
						showDecoration
						showTransform
						showLetterSpacing
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="time"
					/>
				</PanelBody>
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						label={ __( 'Gap', 'sgs-blocks' ) }
						value={ gap }
						onChange={ ( obj ) => setAttributes( { gap: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SpacingControl
								freeInput
								value={ ownValue }
								onChange={ setOwnValue }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>{ orderedChildren }</div>
		</>
	);
}
