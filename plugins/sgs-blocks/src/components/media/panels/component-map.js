/**
 * The one component map for the media panels (Spec 49 §9.4): a setting's
 * `control.component` name to the field that edits it.
 *
 * Every field takes the same props: `{ row, io, attributes, setAttributes,
 * prefix, blockSlug, kind }`. `row.setting.control.label` is the label,
 * `row.state` the disclosure state (`disabled` carries `hiddenReason`), `io`
 * the row's device-aware value (`own`, `resolved`, `write`).
 *
 * A name with no entry here is not drawn. `unmappedComponents()` lists those.
 *
 * @package SGS\Blocks
 */
import {
	RangeControl,
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import GradientCapableColourControl from '../../GradientCapableColourControl.js';
import LinkPopoverField from '../../LinkPopoverControl.js';
import SgsBoxControl from '../../SgsBoxControl.js';
import SgsLengthControl from '../../SgsLengthControl.js';
import ShadowControl from '../../ShadowControl.js';
import { LINK_SOURCES_ALL } from '../../../shared/link-source-options.js';
import { mediaAttrName, mediaStoredAttrName } from '../../MediaElementControls.js';
import FitField from '../FitField.js';
import FocalField from '../FocalField.js';
import MediaSlotCaptions from '../MediaSlotCaptions.js';
import MediaSlotField from '../MediaSlotField.js';
import ShapeField from '../ShapeField.js';
import { AspectRatioField, HeightField, LimitsGroup, WidthField } from '../SizingFields.js';
import {
	AlignmentField,
	ColourTreatmentField,
	OrderField,
	PlaybackField,
	RadiusField,
	ShadowField,
	SurfaceColourField,
} from './adopted-fields.js';
import SvgPartsField from './SvgPartsField.js';
import { REASONS, isSet } from './disclosure-context.js';
import { translateReason } from './reasons.js';
import { SELECT_OPTIONS } from './select-options.js';

const labelOf = ( row ) => row.setting.control.label;
const reasonOf = ( row ) => ( 'disabled' === row.state.state ? translateReason( row.state.hiddenReason ) || undefined : undefined );
/** A row's stored attribute name: an adopted row keeps its §8 name, an older one what its block stores. */
const attrKey = ( row, prefix, blockSlug, base ) =>
	row.setting.adopted ? mediaAttrName( prefix, base ) : mediaStoredAttrName( blockSlug, prefix, base );
const isOff = ( row ) => 'disabled' === row.state.state;

const CORNER_SIDES = [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ];
const CORNER_LABELS = {
	topLeft: __( 'Top left', 'sgs-blocks' ),
	topRight: __( 'Top right', 'sgs-blocks' ),
	bottomRight: __( 'Bottom right', 'sgs-blocks' ),
	bottomLeft: __( 'Bottom left', 'sgs-blocks' ),
};
const BOX_UNITS = [ 'px', 'rem', 'em', '%' ];

function Toggle( { row, io } ) {
	return (
		<ToggleControl
			__nextHasNoMarginBottom
			label={ labelOf( row ) }
			checked={ !! io.resolved }
			disabled={ isOff( row ) }
			help={ reasonOf( row ) }
			onChange={ ( v ) => io.write( v ) }
		/>
	);
}

function Text( { row, io } ) {
	return (
		<TextControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={ labelOf( row ) }
			value={ isSet( io.own ) ? String( io.own ) : '' }
			disabled={ isOff( row ) }
			help={ reasonOf( row ) }
			onChange={ ( v ) => io.write( v ) }
		/>
	);
}

function Range( { row, io } ) {
	return (
		<RangeControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={ labelOf( row ) }
			value={ isSet( io.resolved ) ? Number( io.resolved ) : undefined }
			min={ 0 }
			max={ 100 }
			step={ 1 }
			allowReset={ ! ( row.setting.adopted && io.responsive ) }
			disabled={ isOff( row ) }
			help={ reasonOf( row ) }
			onChange={ ( v ) => io.write( undefined === v ? '' : v ) }
		/>
	);
}

function Select( { row, io } ) {
	const list = SELECT_OPTIONS[ row.setting.base ];
	if ( ! list ) {
		return null;
	}
	return (
		<SelectControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={ labelOf( row ) }
			value={ isSet( io.own ) ? String( io.own ) : '' }
			options={ [ { value: '', label: __( 'Default', 'sgs-blocks' ) }, ...list ] }
			disabled={ isOff( row ) }
			help={ reasonOf( row ) }
			onChange={ ( v ) => io.write( v ) }
		/>
	);
}

/** Alt text as a multi-line box; the label follows the kind. */
function Alt( { row, io, kind } ) {
	const isTitle = 'VideoAlt' === row.setting.base;
	let label = __( 'Alt text', 'sgs-blocks' );
	if ( isTitle ) {
		label = __( 'Title (for screen readers)', 'sgs-blocks' );
	} else if ( 'svg' === kind ) {
		label = __( 'Accessible name (aria-label)', 'sgs-blocks' );
	}
	return (
		<TextareaControl
			__nextHasNoMarginBottom
			label={ label }
			rows={ 3 }
			value={ isSet( io.own ) ? String( io.own ) : '' }
			help={
				isTitle
					? undefined
					: __( 'Describe the photo for someone who cannot see it.', 'sgs-blocks' )
			}
			onChange={ ( v ) => io.write( v ) }
		/>
	);
}

function Length( { row, io } ) {
	return (
		<SgsLengthControl
			label={ labelOf( row ) }
			value={ isSet( io.own ) ? String( io.own ) : '' }
			placeholder={ ! isSet( io.own ) && isSet( io.resolved ) ? String( io.resolved ) : undefined }
			presets={ false }
			onChange={ ( v ) => io.write( v ) }
		/>
	);
}

function Sides( { row, io } ) {
	return (
		<SgsBoxControl
			label={ labelOf( row ) }
			values={ io.own && 'object' === typeof io.own ? io.own : {} }
			units={ BOX_UNITS }
			onChange={ ( next ) => io.write( next ) }
		/>
	);
}

function Corners( { row, io } ) {
	return (
		<SgsBoxControl
			label={ labelOf( row ) }
			values={ io.own && 'object' === typeof io.own ? io.own : {} }
			sides={ CORNER_SIDES }
			labels={ CORNER_LABELS }
			units={ BOX_UNITS }
			onChange={ ( next ) => io.write( next ) }
		/>
	);
}

/** The colour leader of a pair or trio: a flat colour, its gradient and, for the overlay, hover forms. */
function Colour( { row, attributes, setAttributes, prefix, blockSlug } ) {
	const key = ( base ) => attrKey( row, prefix, blockSlug, base );
	const isOverlay = 'OverlayColour' === row.setting.base;
	const forms = isOverlay
		? [
				[ 'rest', __( 'Normal', 'sgs-blocks' ), 'OverlayColour', 'OverlayGradient' ],
				[ 'hover', __( 'Hover', 'sgs-blocks' ), 'OverlayColourHover', 'OverlayGradientHover' ],
		  ]
		: row.setting.adopted
		? [
				[ 'rest', __( 'Normal', 'sgs-blocks' ), 'BorderColour', null ],
				[ 'hover', __( 'Hover', 'sgs-blocks' ), 'BorderColourHover', null ],
		  ]
		: [ [ 'rest', __( 'Normal', 'sgs-blocks' ), 'BorderColour', 'BorderColourGradient' ] ];

	const write = ( patch ) => {
		const colourKey = key( 'OverlayColour' );
		const noPaint = ! attributes[ colourKey ] && ! attributes[ key( 'OverlayGradient' ) ];
		if ( isOverlay && noPaint && ! isSet( attributes[ key( 'OverlayOpacity' ) ] ) ) {
			const first = Object.entries( patch ).find(
				( [ k, v ] ) => ( k === colourKey || k === key( 'OverlayGradient' ) ) && v
			);
			if ( first ) {
				patch[ key( 'OverlayOpacity' ) ] = row.setting.adopted ? { desktop: 40 } : 40;
			}
		}
		setAttributes( patch );
	};

	return (
		<GradientCapableColourControl
			label={ row.setting.control.label }
			states={ forms.map( ( [ id, label, colour, gradient ] ) => ( {
				key: id,
				label,
				value: attributes[ key( colour ) ],
				onChange: ( v ) => write( { [ key( colour ) ]: v ?? '' } ),
				...( gradient
					? {
							gradientValue: attributes[ key( gradient ) ],
							onGradientChange: ( v ) => write( { [ key( gradient ) ]: v ?? '' } ),
					  }
					: {} ),
				linked: true,
			} ) ) }
		/>
	);
}

function Shadow( { row, attributes, setAttributes, prefix, blockSlug } ) {
	const key = ( base ) => attrKey( row, prefix, blockSlug, base );
	return (
		<ShadowControl
			label={ labelOf( row ) }
			attributes={ attributes }
			setAttributes={ setAttributes }
			attrNames={ {
				base: key( 'BoxShadow' ),
				colour: key( 'BoxShadowColour' ),
				hoverColour: key( 'BoxShadowColourHover' ),
			} }
			liftPrefix={ prefix }
			help={ row.state.note }
		/>
	);
}

function Link( { row, attributes, setAttributes, prefix, blockSlug } ) {
	const key = ( base ) => attrKey( row, prefix, blockSlug, base );
	const k = {
		url: key( 'LinkUrl' ),
		newTab: key( 'LinkOpensNewTab' ),
		rel: key( 'LinkRel' ),
		source: key( 'LinkUrlSource' ),
	};
	return (
		<LinkPopoverField
			label={ labelOf( row ) }
			help={ __(
				'Search your site or paste a URL to wrap the image in a link. Leave empty for no link.',
				'sgs-blocks'
			) }
			value={ {
				url: attributes[ k.url ] || '',
				linkTarget: attributes[ k.newTab ] ? '_blank' : '_self',
				rel: attributes[ k.rel ] || '',
				linkSource: attributes[ k.source ] || '',
			} }
			linkSources={ LINK_SOURCES_ALL }
			targetMode="boolean"
			onChange={ ( next ) => {
				const patch = {};
				if ( undefined !== next.url ) {
					patch[ k.url ] = next.url;
				}
				if ( undefined !== next.linkSource ) {
					patch[ k.source ] = next.linkSource;
				}
				if ( undefined !== next.linkTarget ) {
					patch[ k.newTab ] = '_blank' === next.linkTarget;
				}
				if ( undefined !== next.rel ) {
					patch[ k.rel ] = next.rel;
				}
				setAttributes( patch );
			} }
		/>
	);
}

/** Fit, or the one hint line in its place while the box does not crop. */
function Fit( props ) {
	if ( isOff( props.row ) ) {
		return <p className="sgs-media-panel__hint">{ reasonOf( props.row ) }</p>;
	}
	return <FitField { ...props } />;
}

/** Focal; Fit prints the shared "give it a shape" hint, so Focal prints only its own reason. */
function Focal( props ) {
	if ( isOff( props.row ) ) {
		return props.row.state.hiddenReason === REASONS.noCrop ? null : <p className="sgs-media-panel__hint">{ reasonOf( props.row ) }</p>;
	}
	return <FocalField { ...props } />;
}

/** The older four-corner box, or the adopted slider with a link and a Round preset. */
const CornersOrRadius = ( props ) => ( props.row.setting.adopted ? <RadiusField { ...props } /> : <Corners { ...props } /> );

/** Components that print their own device note: `PanelRow` adds none under them. */
export const OWN_NOTE = [
	'MediaSlotField',
	'CaptionsField',
	'FitField',
	'FocalField',
	'ShapeField',
	'RatioField',
	'WidthField',
	'HeightField',
	'LimitsGroup',
];

/** `control.component` name to field. */
export const COMPONENT_MAP = {
	ToggleControl: Toggle,
	TextControl: Text,
	RangeControl: Range,
	SelectControl: Select,
	AltField: Alt,
	LengthField: Length,
	SidesField: Sides,
	CornersField: CornersOrRadius,
	ColourField: Colour,
	ShadowControl: Shadow,
	LinkField: Link,
	MediaSlotField,
	FitField: Fit,
	FocalField: Focal,
	ShapeField,
	RatioField: AspectRatioField,
	WidthField,
	HeightField,
	LimitsGroup,
	ShadowField,
	SurfaceColourField,
	PlaybackField,
	CaptionsField: MediaSlotCaptions,
	SvgPartsField,
	ColourTreatmentField,
	AlignmentField,
	NumberControl: OrderField,
};
