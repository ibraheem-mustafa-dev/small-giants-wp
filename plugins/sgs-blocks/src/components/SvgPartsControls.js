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

const EASING_OPTIONS = [
	{ value: 'ease-out', label: __( 'Ease out', 'sgs-blocks' ) },
	{ value: 'ease', label: __( 'Ease', 'sgs-blocks' ) },
	{ value: 'ease-in', label: __( 'Ease in', 'sgs-blocks' ) },
	{ value: 'ease-in-out', label: __( 'Ease in and out', 'sgs-blocks' ) },
	{ value: 'linear', label: __( 'Linear', 'sgs-blocks' ) },
	{ value: 'spring', label: __( 'Spring (overshoots)', 'sgs-blocks' ) },
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
 */
export default function SvgPartsControls( {
	attributes,
	setAttributes,
	names,
	label,
	defaultTrigger = 'visible',
} ) {
	const parts = Array.isArray( attributes[ names.parts ] )
		? attributes[ names.parts ]
		: [];
	const trigger = attributes[ names.trigger ] || defaultTrigger;
	const cooldown = attributes[ names.cooldown ] ?? 1400;
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
			resetAll={ () =>
				setAttributes( {
					[ names.parts ]: [],
					[ names.trigger ]: defaultTrigger,
					[ names.cooldown ]: 1400,
				} )
			}
		>
			<ToolsPanelItem
				label={ label }
				hasValue={ () => parts.length > 0 }
				onDeselect={ () =>
					setAttributes( {
						[ names.parts ]: [],
						[ names.trigger ]: defaultTrigger,
						[ names.cooldown ]: 1400,
					} )
				}
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
						{ NUMBER_FIELDS.map(
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
							label={ __( 'Entrance easing', 'sgs-blocks' ) }
							value={ part.easing || 'ease-out' }
							options={ EASING_OPTIONS }
							onChange={ ( value ) =>
								setPart( index, { easing: value } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
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
						<ToggleControl
							label={ __(
								'Replay the entrance on hover',
								'sgs-blocks'
							) }
							checked={ !! part.hoverReplay }
							onChange={ ( value ) =>
								setPart( index, { hoverReplay: value } )
							}
							__nextHasNoMarginBottom
						/>
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
			</ToolsPanelItem>
		</ToolsPanel>
	);
}
