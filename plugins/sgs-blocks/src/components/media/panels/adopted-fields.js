/**
 * The fields Spec 49 §9.2 names that an adopted slot's panels need beyond WP-4's: shadow preset chips, one-slider
 * corners, Colour, Alignment, Order, the surface Background and Playback.
 *
 * Every field takes the panel-row props `{ row, io, attributes, setAttributes, prefix, slot, kind }`. `io` is the row's
 * device-aware value (`own`, `resolved`, `write`); `PanelRow` prints the device note under a field that does not print
 * its own.
 *
 * @package SGS\Blocks
 */
import { Button, RangeControl, ToggleControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useShadowPresets } from '../../shadow-control/useShadowPresets.js';

import GradientCapableColourControl from '../../GradientCapableColourControl.js';
import SgsBoxControl from '../../SgsBoxControl.js';
import ShadowControl from '../../ShadowControl.js';
import { mediaAttrName } from '../../MediaElementControls.js';
import Chips from '../Chips.js';
import { REASONS, isSet } from './disclosure-context.js';
import { translateReason } from './reasons.js';

const labelOf = ( row ) => row.setting.control.label;

/** The surface Background: one flat colour. */
export function SurfaceColourField( { row, attributes, setAttributes, prefix } ) {
	const key = mediaAttrName( prefix, row.setting.base );
	return (
		<GradientCapableColourControl
			label={ labelOf( row ) }
			states={ [
				{
					key: 'rest',
					label: __( 'Normal', 'sgs-blocks' ),
					value: attributes[ key ],
					onChange: ( v ) => setAttributes( { [ key ]: v ?? '' } ),
				},
			] }
		/>
	);
}

/** Shadow: preset chips from the theme, then Custom, which opens `ShadowControl`. */
export function ShadowField( { row, attributes, setAttributes, prefix } ) {
	const presets = useShadowPresets();
	const name = ( base ) => mediaAttrName( prefix, base );
	const stored = String( attributes[ name( 'BoxShadow' ) ] || '' );
	const isPreset = presets.some( ( p ) => p.slug === stored );
	const [ custom, setCustom ] = useState( false );
	const customOpen = custom || ( '' !== stored && 'none' !== stored && ! isPreset );
	let current = '';
	if ( customOpen ) {
		current = 'custom';
	} else if ( 'none' === stored ) {
		current = 'none';
	} else if ( isPreset ) {
		current = stored;
	}
	const choose = ( value ) => {
		if ( 'custom' === value ) {
			setCustom( true );
			return;
		}
		setCustom( false );
		setAttributes( { [ name( 'BoxShadow' ) ]: value, [ name( 'BoxShadowColour' ) ]: '' } );
	};
	const options = [
		{ value: 'none', label: __( 'None', 'sgs-blocks' ) },
		...presets.map( ( p ) => ( { value: p.slug, label: p.name } ) ),
		{ value: 'custom', label: __( 'Custom', 'sgs-blocks' ) },
	];
	return (
		<div className="sgs-media-shadow">
			<Chips label={ labelOf( row ) } options={ options } value={ current } onChange={ choose } />
			{ row.state.note && <p className="sgs-media-panel__hint">{ translateReason( row.state.note ) }</p> }
			{ customOpen && (
				<ShadowControl
					label={ __( 'Custom shadow', 'sgs-blocks' ) }
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrNames={ {
						base: name( 'BoxShadow' ),
						colour: name( 'BoxShadowColour' ),
						hoverColour: name( 'BoxShadowColourHover' ),
					} }
					liftPrefix={ prefix }
					hide={ row.state.hide || [] }
				/>
			) }
		</div>
	);
}

const CORNER_SIDES = [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ];
const CORNER_LABELS = {
	topLeft: __( 'Top left', 'sgs-blocks' ),
	topRight: __( 'Top right', 'sgs-blocks' ),
	bottomRight: __( 'Bottom right', 'sgs-blocks' ),
	bottomLeft: __( 'Bottom left', 'sgs-blocks' ),
};
const ROUND = '9999px';

/** Corners: one slider, a link for four separate corners and a Round preset. */
export function RadiusField( { row, io } ) {
	const own = io.own && 'object' === typeof io.own ? io.own : {};
	const values = CORNER_SIDES.map( ( side ) => own[ side ] || '' );
	const same = values.every( ( v ) => v === values[ 0 ] );
	const [ separate, setSeparate ] = useState( ! same );
	const px = parseFloat( values[ 0 ] );
	const all = ( value ) => Object.fromEntries( CORNER_SIDES.map( ( side ) => [ side, value ] ) );
	return (
		<div className="sgs-media-corners">
			<span className="sgs-media-corners__label">{ labelOf( row ) }</span>
			{ separate ? (
				<SgsBoxControl
					label={ labelOf( row ) }
					values={ own }
					sides={ CORNER_SIDES }
					labels={ CORNER_LABELS }
					units={ [ 'px', 'rem', 'em', '%' ] }
					onChange={ ( next ) => io.write( next ) }
				/>
			) : (
				<RangeControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'All corners', 'sgs-blocks' ) }
					value={ Number.isFinite( px ) && px < 9999 ? px : undefined }
					min={ 0 }
					max={ 200 }
					step={ 1 }
					onChange={ ( v ) => io.write( undefined === v ? '' : all( `${ v }px` ) ) }
				/>
			) }
			<div className="sgs-media-corners__actions">
				<Button variant="secondary" __next40pxDefaultSize aria-pressed={ separate } onClick={ () => setSeparate( ! separate ) }>
					{ separate ? __( 'Link the four corners', 'sgs-blocks' ) : __( 'Set each corner', 'sgs-blocks' ) }
				</Button>
				<Button variant="secondary" __next40pxDefaultSize onClick={ () => io.write( all( ROUND ) ) }>
					{ __( 'Round', 'sgs-blocks' ) }
				</Button>
			</div>
		</div>
	);
}

/** Colour: Natural, Black and white, White. */
export function ColourTreatmentField( { row, io } ) {
	return (
		<Chips
			label={ labelOf( row ) }
			options={ [
				{ value: 'natural', label: __( 'Natural', 'sgs-blocks' ) },
				{ value: 'greyscale', label: __( 'Black and white', 'sgs-blocks' ) },
				{ value: 'white', label: __( 'White', 'sgs-blocks' ) },
			] }
			value={ io.resolved || 'natural' }
			onChange={ ( v ) => io.write( 'natural' === v ? '' : v ) }
		/>
	);
}

/** Alignment on the layout box. */
export function AlignmentField( { row, io } ) {
	return (
		<Chips
			label={ labelOf( row ) }
			options={ [
				{ value: 'start', label: __( 'Start', 'sgs-blocks' ) },
				{ value: 'center', label: __( 'Centre', 'sgs-blocks' ) },
				{ value: 'end', label: __( 'End', 'sgs-blocks' ) },
			] }
			value={ io.resolved || '' }
			onChange={ ( v ) => io.write( v === io.own ? '' : v ) }
		/>
	);
}

/** Order in the row, -20 to 20. */
export function OrderField( { row, io } ) {
	return (
		<RangeControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={ labelOf( row ) }
			value={ isSet( io.resolved ) ? Number( io.resolved ) : undefined }
			min={ -20 }
			max={ 20 }
			step={ 1 }
			onChange={ ( v ) => io.write( undefined === v ? '' : v ) }
		/>
	);
}

/** Playback: the toggles §9.3 gives each kind, with Muted and Inline locked on while Autoplay is on. */
export function PlaybackField( { row, io, kind, slot } ) {
	const value = io.own && 'object' === typeof io.own ? io.own : {};
	const set = ( patch ) => io.write( { ...value, ...patch } );
	const background = 'background' === slot?.context;
	const autoplay = !! value.autoplay;
	const toggle = ( key, label, extra = {} ) => (
		<ToggleControl
			key={ key }
			__nextHasNoMarginBottom
			label={ label }
			checked={ !! value[ key ] || !! extra.locked }
			disabled={ !! extra.locked }
			help={ extra.locked ? translateReason( extra.reason ) : undefined }
			onChange={ ( v ) => set( { [ key ]: v } ) }
		/>
	);
	const lock = autoplay ? { locked: true, reason: REASONS.autoplayLock } : {};
	let toggles;
	if ( background ) {
		toggles = [ toggle( 'pause', __( 'Show a pause button', 'sgs-blocks' ) ) ];
	} else if ( 'embed' === kind ) {
		toggles = [
			toggle( 'autoplay', __( 'Autoplay', 'sgs-blocks' ) ),
			toggle( 'muted', __( 'Muted', 'sgs-blocks' ) ),
			toggle( 'loop', __( 'Loop', 'sgs-blocks' ) ),
			toggle( 'controls', __( 'Show controls', 'sgs-blocks' ) ),
		];
	} else {
		toggles = [
			toggle( 'autoplay', __( 'Autoplay', 'sgs-blocks' ) ),
			toggle( 'muted', __( 'Muted', 'sgs-blocks' ), lock ),
			toggle( 'inline', __( 'Play inline', 'sgs-blocks' ), lock ),
			toggle( 'loop', __( 'Loop', 'sgs-blocks' ) ),
			toggle( 'controls', __( 'Show controls', 'sgs-blocks' ) ),
			toggle( 'lazy', __( 'Load when visible', 'sgs-blocks' ) ),
			toggle( 'pause', __( 'Show a pause button', 'sgs-blocks' ) ),
		];
	}
	return (
		<div className="sgs-media-playback" role="group" aria-label={ labelOf( row ) }>
			{ toggles }
			{ 'embed' === kind && ! background && (
				<RangeControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Start at (seconds)', 'sgs-blocks' ) }
					value={ isSet( value.start ) ? Number( value.start ) : undefined }
					min={ 0 }
					max={ 3600 }
					allowReset
					onChange={ ( v ) => set( { start: undefined === v ? '' : v } ) }
				/>
			) }
		</div>
	);
}
