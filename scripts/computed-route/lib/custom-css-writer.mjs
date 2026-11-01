// The one writer of a block instance's Custom CSS box (`sgsCustomCss`, Spec 32 FR-32-13 and FR-32-20) for every Fill pass
// that writes it: the width gate and width ladder (lib/fill-width-gate.mjs::scopedCssPuts), the step ladder
// (lib/fill-step-rungs.mjs), the endless loops (lib/fill-motion.mjs) and the declarations no setting holds
// (lib/fill-custom-css.mjs). A rule is appended to what the box holds, with the box's scope key (`sgsCustomCssId`) and a
// label in `sgsCustomCssNote` that says the cloning route wrote it (FR-32-20 item 5). Every rule is first run through the
// plugin's own scoper (plugins/sgs-blocks/src/utils/custom-css-scope.js, the JS twin of
// includes/class-custom-css-scoper.php that the editor canvas uses), so a rule the page would refuse is never written.
import fs from 'node:fs';
import crypto from 'node:crypto';

const SCOPER = new URL( '../../../plugins/sgs-blocks/src/utils/custom-css-scope.js', import.meta.url );
// The scoper file imports nothing; it is loaded from its text because the plugin's package.json names no module type,
// so a file import prints a module-type warning on every run.
const { scopeCustomCss } = await import( `data:text/javascript;base64,${ fs.readFileSync( SCOPER ).toString( 'base64' ) }` );

// The words every route-written label starts with.
export const ROUTE_LABEL = 'Written by the cloning route';

// A slot selector the route may put after `&`: classes, ids, tags, attributes, combinators and pseudo selectors only.
export const SAFE_SLOT = /^[\w\s.#>:()+~[\]="'*-]*$/;

// The scoper's reasons for refusing a rule (Spec 32 FR-32-20: an unscoped rule, an at-rule other than @media, @supports,
// @container, @layer or @keyframes, a nested rule, a script-capable value, `<`, malformed input); empty when it scopes.
export const scoperRefusals = ( css ) => scopeCustomCss( css, '.sgs-c-route' ).refused;

// The scope key shape includes/custom-css.php::sgs_custom_css_uid accepts: 4 to 16 lowercase letters and digits.
export const SCOPE_KEY = /^[a-z0-9]{4,16}$/;

// The counter keys earlier runs wrote (`css<index>`, `wgate<index>`, `loop<record id>`, padded to 4 characters). Every
// surface numbered them from 1, so two posts on one page shared them; a node holding one is re-keyed. An editor key (8
// hex characters) and a route key (`r` and 11 hex characters) never start with these words.
export const COUNTER_KEY = /^(css|wgate|loop)[a-z0-9]*$/;

// The scope key a route write gives an instance: `r` and the first 11 hex characters of sha1( `${ scope }|${ key }` ), 12
// characters. scope names the surface (client and surface); key is the caller's counter. The page class `sgs-c-<key>` is
// unique across every post of the page because the surfaces' scopes differ, and a re-run of one surface gives the same key.
export function scopeKey( scope, key ) {
	return `r${ crypto.createHash( 'sha1' ).update( `${ scope }|${ key }` ).digest( 'hex' ).slice( 0, 11 ) }`;
}

const labelled = ( label ) => ( String( label ).startsWith( ROUTE_LABEL ) ? label : `${ ROUTE_LABEL }: ${ label }` );

// The three settings that hold a rule on a node (Custom CSS, its scope key and its label): [ { attr, value, prop } ]
// to write, appending to what the node holds; empty when the node already holds the rule text. A rule the scoper refuses
// gives an empty list carrying `refused` (the scoper's reasons) and writes nothing. scope: the surface's identity
// (`<client>|<surface>`, required) and key: the caller's counter, which together give the key a node with none takes
// (scopeKey); a node's own non-route key is kept, an old counter key (COUNTER_KEY) is replaced; why: the pass, named in
// each put's `prop`.
export function customCssPuts( node, { css, label, key, scope, why } ) {
	if ( ! scope || ! String( scope ).trim() ) {
		throw new Error( `customCssPuts (${ why }): a scope naming the surface is required, so the scope key is unique across the page's posts` );
	}
	const had = ( a ) => node.attributes?.[ a ] || '';
	const held = had( 'sgsCustomCssId' );
	const stale = COUNTER_KEY.test( held );
	const keyPut = { attr: 'sgsCustomCssId', value: held && ! stale ? held : scopeKey( scope, key ), prop: `${ why }: scope key` };
	if ( had( 'sgsCustomCss' ).includes( css ) ) {
		return stale ? [ keyPut ] : [];
	}
	const refused = scoperRefusals( css );
	if ( refused.length ) {
		return Object.assign( [], { refused } );
	}
	return [
		{ attr: 'sgsCustomCss', value: [ had( 'sgsCustomCss' ), css ].filter( Boolean ).join( ' ' ), prop: `${ why }: scoped rule` },
		keyPut,
		{ attr: 'sgsCustomCssNote', value: [ had( 'sgsCustomCssNote' ), labelled( label ) ].filter( Boolean ).join( '; ' ), prop: `${ why }: label` },
	];
}

const added = ( before, after ) => ( String( before || '' ) && String( after ).startsWith( String( before ) ) ? String( after ).slice( String( before ).length ) : String( after ?? '' ) ).replace( /^;?\s*/, '' );

// Every rule a run wrote into a Custom CSS box, from its writes (fill-report.json `writes`): [ { node, block, how, css,
// label } ], one per write of `sgsCustomCss`, its label the text the same pass added to `sgsCustomCssNote` on that node.
export function routeWrittenRules( writes ) {
	return writes.filter( ( w ) => 'sgsCustomCss' === w.attr ).map( ( w ) => {
		const note = writes.find( ( x ) => x.node === w.node && 'sgsCustomCssNote' === x.attr && x.how === w.how && writes.indexOf( x ) > writes.indexOf( w ) );
		return { node: w.node, block: w.block, how: w.how, css: added( w.before, w.after ), label: note ? added( note.before, note.after ) : '' };
	} );
}
