// A `fetch` stand-in that runs the fixtures' REST requests inside a site through wp-cli, for a local mirror: the mirrors keep
// no application password (their secrets file holds only the login), and WordPress dispatches the request in-process
// (`rest_do_request`) as the wp-cli user. A request body is JSON; a binary upload (an image) is refused, so the mirror must
// already hold the fixture image.
import { evalScript } from './calibration-refs.mjs';

const MARK = 'SGSREST:';

const phpFor = ( request ) => `
$req = json_decode( base64_decode( '${ Buffer.from( JSON.stringify( request ) ).toString( 'base64' ) }' ), true );
$r = new WP_REST_Request( $req['method'], $req['route'] );
$r->set_query_params( $req['query'] );
if ( null !== $req['body'] ) { $r->set_header( 'content-type', 'application/json' ); $r->set_body( wp_json_encode( $req['body'] ) ); $r->set_body_params( $req['body'] ); }
$res = rest_do_request( $r );
echo '${ MARK }' . wp_json_encode( array( 'status' => $res->get_status(), 'data' => rest_get_server()->response_to_data( $res, false ) ) ) . "\\n";
`;

// `wp` is a wp-cli runner `(args, stdin) => stdout` (calibration-refs.mjs::wpCommand).
export function wpFetch( wp ) {
	return async ( url, init = {} ) => {
		const u = new URL( url );
		if ( init.body && 'string' !== typeof init.body ) {
			throw new Error( 'a binary upload cannot go through wp-cli: add the fixture image to the mirror first' );
		}
		const route = decodeURIComponent( u.pathname.replace( /^\/wp-json/, '' ) ) || '/';
		const out = String( wp( [ 'eval-file', '-' ], evalScript( phpFor( { method: init.method || 'GET', route, query: Object.fromEntries( u.searchParams ), body: init.body ? JSON.parse( init.body ) : null } ) ) ) );
		const line = out.split( /\r?\n/ ).find( ( l ) => l.startsWith( MARK ) );
		if ( ! line ) {
			throw new Error( `wp eval-file answered no REST result: ${ out.slice( 0, 300 ) }` );
		}
		const { status, data } = JSON.parse( line.slice( MARK.length ) );
		return { status, ok: status >= 200 && status < 300, json: async () => data, text: async () => JSON.stringify( data ) };
	};
}
