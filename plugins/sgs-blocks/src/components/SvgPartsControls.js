/**
 * Editor controls for SVG part animation (the `svgParts`, trigger and hover-cooldown attributes of a block that
 * prints an inline SVG, read on the front end by src/shared/svg-parts/svg-parts.js).
 *
 * One ToolsPanel item holds the list: per part an element id (or CSS selector), the entrance (opacity, scale, offset,
 * rotation, stroke draw, timing), a continuous rotation and the hover. The attribute names are passed in, so the
 * responsive logo (`svgParts`) and the nav drawer logo (`chromeLogoSvgParts`) share this one component.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import {
	Button,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem, NumberControl } from './primitives';
import { NAV_EASING_OPTIONS } from './motion/easing-master-list';

const EASING_OPTIONS = NAV_EASING_OPTIONS;
const CLIP_OPTIONS = [
	{ value: '', label: __( 'No wipe', 'sgs-blocks' ) },
	{ value: 'up', label: __( 'Wipe upwards', 'sgs-blocks' ) },
	{ value: 'down', label: __( 'Wipe downwards', 'sgs-blocks' ) },
	{ value: 'left', label: __( 'Wipe to the left', 'sgs-blocks' ) },
	{ value: 'right', label: __( 'Wipe to the right', 'sgs-blocks' ) },
];
const ORIGIN_OPTIONS = [
	{ value: 'center', label: __( 'Centre', 'sgs-blocks' ) },
	{ value: 'top', label: __( 'Top', 'sgs-blocks' ) },
	{ value: 'bottom', label: __( 'Bottom', 'sgs-blocks' ) },
	{ value: 'left', label: __( 'Left', 'sgs-blocks' ) },
	{ value: 'right', label: __( 'Right', 'sgs-blocks' ) },
];
const TRIGGER_OPTIONS = [
	{
		value: 'visible',
		label: __( 'The first time it is on screen', 'sgs-blocks' ),
	},
	{ value: 'load', label: __( 'When the page loads', 'sgs-blocks' ) },
	{
		value: 'every-visible',
		label: __( 'Each time it comes on screen', 'sgs-blocks' ),
	},
];
const TEXT_FIELDS = [
	[ 'fromFill', __( 'Start colour (hex or palette slug)', 'sgs-blocks' ) ],
	[
		'toFill',
		__( 'End colour (hex or palette slug, kept after)', 'sgs-blocks' ),
	],
	[
		'copyShapeFrom',
		__( 'Copy the outline from this element id', 'sgs-blocks' ),
	],
];
const HOVER_FIELDS = [
	[
		'hoverScale',
		__( 'Hover bob: scale at the peak', 'sgs-blocks' ),
		0,
		20,
		0.01,
	],
	[
		'hoverX',
		__( 'Hover bob: move across (SVG units)', 'sgs-blocks' ),
		-5000,
		5000,
		1,
	],
	[
		'hoverY',
		__( 'Hover bob: move down (SVG units)', 'sgs-blocks' ),
		-5000,
		5000,
		1,
	],
	[
		'hoverRotate',
		__( 'Hover bob: rotate (degrees)', 'sgs-blocks' ),
		-3600,
		3600,
		1,
	],
	[
		'hoverDuration',
		__( 'Hover bob duration (ms)', 'sgs-blocks' ),
		0,
		60000,
		50,
	],
	[
		'hoverStagger',
		__( 'Hover bob stagger between matches (ms)', 'sgs-blocks' ),
		0,
		5000,
		4,
	],
];
const NUMBER_FIELDS = [
	[ 'fromOpacity', __( 'Start opacity (0 to 1)', 'sgs-blocks' ), 0, 1, 0.1 ],
	[
		'fromScale',
		__( 'Start scale (1 is full size)', 'sgs-blocks' ),
		0,
		20,
		0.1,
	],
	[
		'fromX',
		__( 'Start offset across (SVG units)', 'sgs-blocks' ),
		-5000,
		5000,
		1,
	],
	[
		'fromY',
		__( 'Start offset down (SVG units)', 'sgs-blocks' ),
		-5000,
		5000,
		1,
	],
	[
		'fromRotate',
		__( 'Start rotation (degrees)', 'sgs-blocks' ),
		-3600,
		3600,
		1,
	],
	[
		'toScale',
		__( 'End scale (kept after the entrance)', 'sgs-blocks' ),
		0,
		20,
		0.1,
	],
	[
		'settleAt',
		__( 'Reaches full size at (0 to 1 of the duration)', 'sgs-blocks' ),
		0,
		1,
		0.05,
	],
	[
		'holdUntil',
		__( 'Holds that look until (0 to 1 of the duration)', 'sgs-blocks' ),
		0,
		1,
		0.05,
	],
	[ 'duration', __( 'Entrance duration (ms)', 'sgs-blocks' ), 0, 60000, 50 ],
	[ 'delay', __( 'Entrance delay (ms)', 'sgs-blocks' ), 0, 60000, 50 ],
	[
		'stagger',
		__( 'Stagger between matches (ms)', 'sgs-blocks' ),
		0,
		5000,
		5,
	],
	[
		'loopRotate',
		__( 'Turn continuously by (degrees per loop)', 'sgs-blocks' ),
		-36000,
		36000,
		1,
	],
	[
		'loopDuration',
		__( 'Loop duration (ms)', 'sgs-blocks' ),
		0,
		3600000,
		1000,
	],
	[
		'hoverRate',
		__( 'Loop speed on hover (1 is normal)', 'sgs-blocks' ),
		0,
		100,
		1,
	],
	[
		'hoverRateDuration',
		__( 'Hover speed-up lasts (ms)', 'sgs-blocks' ),
		0,
		60000,
		50,
	],
];

/**
 * @param {Object}   props                Component props.
 * @param {Object}   props.attributes     The block attributes.
 * @param {Function} props.setAttributes  The block's setAttributes.
 * @param {Object}   props.names          Attribute names: `parts`, `trigger`, `cooldown`.
 * @param {string}   props.label          The ToolsPanel label (unique within the block).
 * @param {string}   props.defaultTrigger The trigger the block's attribute defaults to.
 * @param {boolean}  props.hover          Whether the hover controls show (a layer that cannot be hovered hides them).
 */
export default function SvgPartsControls( {
	attributes,
	setAttributes,
	names,
	label,
	defaultTrigger = 'visible',
	hover = true,
} ) {
	const parts = Array.isArray( attributes[ names.parts ] )
		? attributes[ names.parts ]
		: [];
	const trigger = attributes[ names.trigger ] || defaultTrigger;
	const cooldown = attributes[ names.cooldown ] ?? 1400;
	const resetValues = {
		[ names.parts ]: [],
		[ names.trigger ]: defaultTrigger,
		...( names.cooldown ? { [ names.cooldown ]: 1400 } : {} ),
	};
	const setParts = ( next ) => setAttributes( { [ names.parts ]: next } );
	const setPart = ( index, patch ) =>
		setParts(
			parts.map( ( part, i ) =>
				i === index ? { ...part, ...patch } : part
			)
		);

	return (
		<ToolsPanel
			label={ label }
			resetAll={ () => setAttributes( resetValues ) }
		>
			<ToolsPanelItem
				label={ label }
				hasValue={ () => parts.length > 0 }
				onDeselect={ () => setAttributes( resetValues ) }
				isShownByDefault
			>
				<p>
					{ __(
						'Animate named parts of the SVG. Name each part by its element id in the SVG file, or by a CSS selector starting with a dot, a square bracket or a colon.',
						'sgs-blocks'
					) }
				</p>
				{ parts.map( ( part, index ) => (
					<div key={ index }>
						<TextControl
							label={ __(
								'Part (element id or selector)',
								'sgs-blocks'
							) }
							value={ part.target || '' }
							onChange={ ( value ) =>
								setPart( index, { target: value } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						<ToggleControl
							label={ __(
								'Animate each child separately',
								'sgs-blocks'
							) }
							checked={ !! part.eachChild }
							onChange={ ( value ) =>
								setPart( index, { eachChild: value } )
							}
							__nextHasNoMarginBottom
						/>
						<ToggleControl
							label={ __( 'Draw the outline in', 'sgs-blocks' ) }
							checked={ !! part.draw }
							onChange={ ( value ) =>
								setPart( index, { draw: value } )
							}
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Wipe in from', 'sgs-blocks' ) }
							value={ part.fromClip || '' }
							options={ CLIP_OPTIONS }
							onChange={ ( value ) =>
								setPart( index, {
									fromClip: value || undefined,
								} )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						{ TEXT_FIELDS.map( ( [ key, text ] ) => (
							<TextControl
								key={ key }
								label={ text }
								value={ part[ key ] || '' }
								onChange={ ( value ) =>
									setPart( index, {
										[ key ]: value || undefined,
									} )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) ) }
						{ NUMBER_FIELDS.filter(
							( [ key ] ) => hover || ! key.startsWith( 'hover' )
						).map( ( [ key, text, min, max, step ] ) => (
							<NumberControl
								key={ key }
								label={ text }
								value={ part[ key ] ?? '' }
								min={ min }
								max={ max }
								step={ step }
								onChange={ ( value ) =>
									setPart( index, {
										[ key ]:
											'' === value || undefined === value
												? undefined
												: Number( value ),
									} )
								}
								__next40pxDefaultSize
							/>
						) ) }
						<SelectControl
							label={ __( 'Entrance easing', 'sgs-blocks' ) }
							value={ part.easing || 'ease-out' }
							options={ EASING_OPTIONS }
							onChange={ ( value ) =>
								setPart( index, { easing: value } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						{ 'custom' === part.easing && (
							<TextControl
								label={ __(
									'Custom curve, cubic-bezier(x1, y1, x2, y2)',
									'sgs-blocks'
								) }
								value={ part.easingCustom || '' }
								onChange={ ( value ) =>
									setPart( index, {
										easingCustom: value || undefined,
									} )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
						<SelectControl
							label={ __(
								'Scale and rotate from',
								'sgs-blocks'
							) }
							value={ part.origin || 'center' }
							options={ ORIGIN_OPTIONS }
							onChange={ ( value ) =>
								setPart( index, { origin: value } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						{ hover && (
							<>
								<ToggleControl
									label={ __(
										'Replay the entrance on hover',
										'sgs-blocks'
									) }
									checked={ !! part.hoverReplay }
									onChange={ ( value ) =>
										setPart( index, {
											hoverReplay: value,
										} )
									}
									__nextHasNoMarginBottom
								/>
								{ HOVER_FIELDS.map(
									( [ key, text, min, max, step ] ) => (
										<NumberControl
											key={ key }
											label={ text }
											value={ part[ key ] ?? '' }
											min={ min }
											max={ max }
											step={ step }
											onChange={ ( value ) =>
												setPart( index, {
													[ key ]:
														'' === value ||
														undefined === value
															? undefined
															: Number( value ),
												} )
											}
											__next40pxDefaultSize
										/>
									)
								) }
								<SelectControl
									label={ __(
										'Hover bob easing',
										'sgs-blocks'
									) }
									value={ part.hoverEasing || 'ease-out' }
									options={ EASING_OPTIONS }
									onChange={ ( value ) =>
										setPart( index, { hoverEasing: value } )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
								{ 'custom' === part.hoverEasing && (
									<TextControl
										label={ __(
											'Hover custom curve, cubic-bezier(x1, y1, x2, y2)',
											'sgs-blocks'
										) }
										value={ part.hoverEasingCustom || '' }
										onChange={ ( value ) =>
											setPart( index, {
												hoverEasingCustom:
													value || undefined,
											} )
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								) }
							</>
						) }
						<Button
							variant="tertiary"
							isDestructive
							onClick={ () =>
								setParts(
									parts.filter( ( p, i ) => i !== index )
								)
							}
						>
							{ __( 'Remove this part', 'sgs-blocks' ) }
						</Button>
					</div>
				) ) }
				<Button
					variant="secondary"
					onClick={ () => setParts( [ ...parts, { target: '' } ] ) }
				>
					{ __( 'Add a part', 'sgs-blocks' ) }
				</Button>
				<SelectControl
					label={ __( 'Entrance plays', 'sgs-blocks' ) }
					value={ trigger }
					options={ TRIGGER_OPTIONS }
					onChange={ ( value ) =>
						setAttributes( { [ names.trigger ]: value } )
					}
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ hover && names.cooldown && (
					<NumberControl
						label={ __(
							'Least time between hover replays (ms)',
							'sgs-blocks'
						) }
						value={ cooldown }
						min={ 0 }
						max={ 60000 }
						step={ 100 }
						onChange={ ( value ) =>
							setAttributes( {
								[ names.cooldown ]: Number( value ) || 0,
							} )
						}
						__next40pxDefaultSize
					/>
				) }
			</ToolsPanelItem>
		</ToolsPanel>
	);
}
