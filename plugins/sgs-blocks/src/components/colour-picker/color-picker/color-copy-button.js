/**
 * Forked from WordPress core (`@wordpress/components` `color-picker/color-copy-button.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * WordPress dependencies
 */
import { useCopyToClipboard } from '@wordpress/compose';
import { useState, useEffect, useRef } from '@wordpress/element';
import { copy, check } from '@wordpress/icons';
import { __ } from '@wordpress/i18n';
import { Button, Tooltip } from '@wordpress/components';

export const ColorCopyButton = ( props ) => {
	const { color, colorType } = props;
	const [ copiedColor, setCopiedColor ] = useState( null );
	const copyTimerRef = useRef( undefined );
	const copyRef = useCopyToClipboard(
		() => {
			switch ( colorType ) {
				case 'hsl': {
					return color.toHslString();
				}
				case 'rgb': {
					return color.toRgbString();
				}
				default:
				case 'hex': {
					return color.toHex();
				}
			}
		},
		() => {
			if ( copyTimerRef.current ) {
				clearTimeout( copyTimerRef.current );
			}
			setCopiedColor( color.toHex() );
			copyTimerRef.current = setTimeout( () => {
				setCopiedColor( null );
				copyTimerRef.current = undefined;
			}, 3000 );
		}
	);
	useEffect( () => {
		// Clear copyTimerRef on component unmount.
		return () => {
			if ( copyTimerRef.current ) {
				clearTimeout( copyTimerRef.current );
			}
		};
	}, [] );

	const isCopied = copiedColor === color.toHex();
	const label = isCopied ? __( 'Copied!' ) : __( 'Copy' );

	return (
		<Tooltip delay={ 0 } hideOnClick={ false } text={ label }>
			<Button
				size="compact"
				aria-label={ label }
				ref={ copyRef }
				icon={ isCopied ? check : copy }
				showTooltip={ false }
			/>
		</Tooltip>
	);
};
