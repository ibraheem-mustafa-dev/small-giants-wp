/**
 * sgs/message-preview front-end script (viewScriptModule, vanilla ES module; the behaviour is in ./mirror.js).
 *
 * @package
 */
import { initialiseAll } from './mirror';

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', () => initialiseAll() );
} else {
	initialiseAll();
}
