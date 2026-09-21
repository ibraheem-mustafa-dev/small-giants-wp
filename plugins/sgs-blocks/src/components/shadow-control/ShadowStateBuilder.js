/**
 * ONE state's worth of the layered shadow panel (Normal, or Hover) as Simple / Layers / Raw CSS
 * tabs over a live preview. Shape and colour are always written together through `onApply`, so a
 * delete or a reorder never leaves the two lists misaligned and it is one undo step.
 *
 * A replace that would overwrite a hand-edited stack asks first, in a confirm placed beside the
 * control touched, announced, with focus moved to it. Reset clears THIS state only.
 *
 * @package SGS\Blocks
 */
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { speak } from '@wordpress/a11y';
import { Button, TabPanel } from '@wordpress/components';
import { parseStored, parseCss, serialise, generate, recognise, problemOf } from '../../utils/shadow-model';
import { previewCss, presetPreviewCss } from './preview';
import SimpleTab from './SimpleTab';
import LayersTab from './LayersTab';
import RawTab from './RawTab';
import HoverColourOnly from './HoverColourOnly';
import './shadow-control.css';

const DEFAULT_PREFS = { look: 'soft', intensity: 0.5, colour: 'site' };

/**
 * @param {Object}   props
 * @param {string}   props.value          Stored shape text for this state.
 * @param {string}   props.colour         Stored colour text for this state.
 * @param {Function} props.onApply        Receives `( shapeText, colourText )` in one call.
 * @param {Array}    props.presets        Theme presets `[ { slug, name, literal, preview } ]`.
 * @param {Function} props.resolveHex     Colour token resolver for previews.
 * @param {string}   props.siteColor      Resolved site colour, for theme-style previews.
 * @param {boolean}  [props.canEditShape] False on a hover state that can only recolour.
 * @param {boolean}  [props.isHover]      This is the Hover state.
 * @param {string}   [props.baseValue]    Normal shape (hover states).
 * @param {string}   [props.baseColour]   Normal colour (hover states).
 */
export default function ShadowStateBuilder( { value, colour, onApply, presets, resolveHex, siteColor, canEditShape = true, isHover = false, baseValue, baseColour } ) {
	const parsed = useMemo( () => parseStored( value, colour ), [ value, colour ] );
	const rec = useMemo( () => ( 'layers' === parsed.kind ? recognise( parsed.layers ) : null ), [ parsed ] );
	const [ prefs, setPrefs ] = useState( () => ( rec && rec.n > 0 ? { look: rec.look, intensity: rec.intensity, colour: rec.colour } : DEFAULT_PREFS ) );
	const [ pending, setPending ] = useState( null );
	const confirmRef = useRef( null );

	useEffect( () => {
		if ( rec && rec.n > 0 ) {
			setPrefs( { look: rec.look, intensity: rec.intensity, colour: rec.colour } );
		}
	}, [ rec ] );
	useEffect( () => {
		if ( pending ) {
			confirmRef.current?.focus();
		}
	}, [ pending ] );

	const handEdited = 'layers' === parsed.kind && ! rec;
	const write = ( shape, colourText, message ) => {
		setPending( null );
		onApply( shape, colourText );
		speak( message );
	};
	const replace = ( shape, colourText, message ) => {
		if ( handEdited ) {
			setPending( { shape, colourText, message } );
			speak( __( 'This replaces your custom shadow. Choose Replace to continue or Keep mine to cancel.', 'sgs-blocks' ), 'assertive' );
			return;
		}
		write( shape, colourText, message );
	};
	const commitLayers = ( layers ) => {
		const next = layers.length ? serialise( layers ) : { shape: 'none', colour: '' };
		write( next.shape, next.colour, __( 'Shadow updated.', 'sgs-blocks' ) );
	};
	const build = ( n, options ) => {
		const next = serialise( generate( n, options.look, options.intensity, options.colour ) );
		/* translators: %d: elevation number. */
		replace( next.shape, next.colour, sprintf( __( 'Elevation %d applied.', 'sgs-blocks' ), n ) );
	};
	const choosePreset = ( preset ) => {
		/* translators: %s: theme style name. */
		replace( preset.slug, '', sprintf( __( '%s style applied.', 'sgs-blocks' ), preset.name ) );
	};
	const activePreset = 'preset' === parsed.kind ? presets.find( ( p ) => p.slug === parsed.slug ) : null;
	const copyPreset = () => {
		if ( activePreset ) {
			commitLayers( parseCss( activePreset.literal ) );
		}
	};

	if ( ! canEditShape ) {
		return <HoverColourOnly baseValue={ baseValue } baseColour={ baseColour } colour={ colour } onColourChange={ ( text ) => onApply( value, text ) } />;
	}
	if ( isHover && '' === ( value || '' ).trim() ) {
		return (
			<>
				<p className="sgs-shadow-control__note">{ __( 'Same as Normal. The shadow does not change on hover.', 'sgs-blocks' ) }</p>
				<Button variant="secondary" onClick={ () => write( baseValue || '', baseColour || '', __( 'Hover shadow started from Normal.', 'sgs-blocks' ) ) } __next40pxDefaultSize>
					{ __( 'Customise hover', 'sgs-blocks' ) }
				</Button>
			</>
		);
	}

	const drawn = 'layers' === parsed.kind ? previewCss( parsed.layers, resolveHex ) : activePreset ? presetPreviewCss( activePreset.literal, siteColor ) : 'none';
	const problem = problemOf( value );
	const needsOwnCopy = !! activePreset;

	return (
		<>
			<div className="sgs-shadow-control__preview" aria-hidden="true">
				<div className="sgs-shadow-control__preview-box" style={ { boxShadow: drawn } } />
			</div>
			<div className="sgs-shadow-control__header">
				<span className="sgs-shadow-control__note">{ 'default' === parsed.kind ? __( 'Block default', 'sgs-blocks' ) : 'none' === parsed.kind ? __( 'No shadow', 'sgs-blocks' ) : '' }</span>
				<Button
					variant="tertiary"
					size="compact"
					disabled={ 'default' === parsed.kind }
					onClick={ () => write( '', '', isHover ? __( 'Hover shadow reset to match Normal.', 'sgs-blocks' ) : __( 'Shadow reset to the block default.', 'sgs-blocks' ) ) }
				>
					{ __( 'Reset', 'sgs-blocks' ) }
				</Button>
			</div>
			{ pending && (
				<div className="sgs-shadow-control__confirm" role="alertdialog" aria-label={ __( 'Replace custom shadow', 'sgs-blocks' ) }>
					{ __( 'This replaces your custom shadow. You can undo it afterwards.', 'sgs-blocks' ) }
					<div className="sgs-shadow-control__confirm-actions">
						<Button variant="primary" ref={ confirmRef } onClick={ () => write( pending.shape, pending.colourText, pending.message ) }>
							{ __( 'Replace', 'sgs-blocks' ) }
						</Button>
						<Button variant="secondary" onClick={ () => setPending( null ) }>
							{ __( 'Keep mine', 'sgs-blocks' ) }
						</Button>
					</div>
				</div>
			) }
			<TabPanel
				className="sgs-shadow-control__tabs"
				tabs={ [
					{ name: 'simple', title: __( 'Simple', 'sgs-blocks' ) },
					{ name: 'layers', title: __( 'Layers', 'sgs-blocks' ) },
					{ name: 'raw', title: __( 'Raw CSS', 'sgs-blocks' ) },
				] }
			>
				{ ( tab ) => {
					if ( 'simple' === tab.name ) {
						return (
							<SimpleTab
								parsed={ parsed }
								rec={ rec }
								prefs={ prefs }
								presets={ presets }
								onPreset={ choosePreset }
								onNone={ () => replace( 'none', '', __( 'Shadow removed.', 'sgs-blocks' ) ) }
								onBuild={ build }
								setPrefs={ setPrefs }
								resolveHex={ resolveHex }
							/>
						);
					}
					if ( needsOwnCopy ) {
						return (
							<>
								<p className="sgs-shadow-control__note">
									{ sprintf( /* translators: %s: theme style name. */ __( 'This block uses the theme style "%s", which is edited in the theme. To change it for this block only, make your own copy.', 'sgs-blocks' ), activePreset.name ) }
								</p>
								<Button variant="secondary" onClick={ copyPreset } __next40pxDefaultSize>
									{ __( 'Make my own copy', 'sgs-blocks' ) }
								</Button>
							</>
						);
					}
					const layers = 'layers' === parsed.kind ? parsed.layers : [];
					return 'layers' === tab.name ? (
						<LayersTab layers={ layers } commit={ commitLayers } resolveHex={ resolveHex } />
					) : (
						<RawTab layers={ layers } commit={ commitLayers } />
					);
				} }
			</TabPanel>
			{ problem && (
				<p className="sgs-shadow-control__warning" role="status">
					{ problem }
				</p>
			) }
		</>
	);
}
