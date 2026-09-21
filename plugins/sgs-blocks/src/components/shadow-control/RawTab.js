/**
 * The Raw CSS tab: paste any `box-shadow` (a design tool's output, a reference site's value).
 * The text is checked with `CSS.supports` before it is applied, so a typo is announced and the
 * saved shadow is not touched. A layer the fields cannot show stays as written, never reset.
 *
 * @package SGS\Blocks
 */
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { speak } from '@wordpress/a11y';
import { Button, TextareaControl } from '@wordpress/components';
import { parseCss, toCss, RAW_CAP } from '../../utils/shadow-model';

const clean = ( text ) => text.replace( /^\s*box-shadow\s*:\s*/i, '' ).replace( /;\s*$/, '' ).trim();

/**
 * @param {Object}   props
 * @param {Object[]} props.layers Model layers.
 * @param {Function} props.commit Receives the next layers array (one write).
 */
export default function RawTab( { layers, commit } ) {
	const current = toCss( layers );
	const [ text, setText ] = useState( current );
	const [ error, setError ] = useState( '' );
	useEffect( () => {
		setText( current );
		setError( '' );
	}, [ current ] );

	const apply = () => {
		const cleaned = clean( text );
		const empty = '' === cleaned || 'none' === cleaned.toLowerCase();
		const supported = empty || typeof CSS === 'undefined' || ! CSS.supports || CSS.supports( 'box-shadow', cleaned );
		const parsed = supported && ! empty ? parseCss( cleaned ) : [];
		let message = '';
		if ( ! supported ) {
			message = __( 'That is not a valid box-shadow. Nothing was changed.', 'sgs-blocks' );
		} else if ( parsed.length > RAW_CAP ) {
			/* translators: %d: layer limit. */
			message = sprintf( __( 'A shadow can have at most %d layers. Nothing was changed.', 'sgs-blocks' ), RAW_CAP );
		}
		setError( message );
		if ( message ) {
			speak( message, 'assertive' );
			return;
		}
		commit( parsed );
		speak( __( 'Shadow applied.', 'sgs-blocks' ) );
	};

	return (
		<>
			<TextareaControl
				label={ __( 'Box-shadow CSS', 'sgs-blocks' ) }
				help={ __( 'Paste any box-shadow value, for example from a reference site. Layers, colours and opacity are read into the other tabs where they can be.', 'sgs-blocks' ) }
				value={ text }
				onChange={ setText }
				className="sgs-shadow-control__raw"
				aria-invalid={ '' !== error }
				rows={ 5 }
				__nextHasNoMarginBottom
			/>
			{ error && (
				<p className="sgs-shadow-control__warning" role="alert">
					{ error }
				</p>
			) }
			<Button variant="primary" onClick={ apply } disabled={ text === current } __next40pxDefaultSize>
				{ __( 'Apply', 'sgs-blocks' ) }
			</Button>
		</>
	);
}
