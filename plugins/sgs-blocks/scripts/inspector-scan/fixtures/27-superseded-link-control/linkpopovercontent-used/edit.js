import { useState, useRef } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { LinkPopoverContent } from '../../../../../src/components';

export default function Edit( { attributes, setAttributes } ) {
	const [ isOpen, setIsOpen ] = useState( false );
	const ref = useRef();
	return (
		<>
			<Button ref={ ref } onClick={ () => setIsOpen( true ) }>Link</Button>
			{ isOpen && (
				<LinkPopoverContent
					anchor={ ref.current }
					onClose={ () => setIsOpen( false ) }
					url={ attributes.url }
					onChangeLink={ ( next ) => setAttributes( next ) }
				/>
			) }
		</>
	);
}
