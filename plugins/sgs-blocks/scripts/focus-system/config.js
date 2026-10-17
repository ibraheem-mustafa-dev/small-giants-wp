'use strict';

/**
 * Configuration for check-focus-system.js (Spec 38A, unified focus system plan §3).
 *
 * Everything the detector treats as data lives here: the corpus, the excludes, the retired
 * tokens, the exempt names, the task groups and the reasons the wide enumeration may be wider
 * than the corpus. No other module names a path.
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );

/** Repo root: walk up from this file to the directory holding `.git` (a file in a worktree). */
function findRoot( start ) {
	let dir = start;
	for ( ;; ) {
		if ( fs.existsSync( path.join( dir, '.git' ) ) ) {
			return dir;
		}
		const up = path.dirname( dir );
		if ( up === dir ) {
			throw new Error( 'check-focus-system: no .git found above ' + start );
		}
		dir = up;
	}
}

const ROOT = findRoot( __dirname );

const SCRIPTS_DIR = path.resolve( __dirname, '..' );
const ALLOW_FILE = process.env.FOCUS_SYSTEM_ALLOW_FILE || path.join( SCRIPTS_DIR, 'check-focus-system-allow.json' );
const BASELINE_FILE = path.join( SCRIPTS_DIR, 'check-focus-system-baseline.json' );
const CENSUS_FILE = path.join( ROOT, 'reports', 'migrations', 'focus-system-census.json' );

/** The one system file (Task 4 creates it). Its rules are category `system`. */
const SYSTEM_FILE = 'theme/sgs-theme/assets/css/focus.css';

/**
 * Corpus include rules, applied to `git ls-files` output (so git-ignored files never enter).
 * Each rule: a path regex and the scanner that reads the file.
 */
const INCLUDE = [
	{ re: /^theme\/sgs-theme\/assets\/css\/.+\.s?css$/, kind: 'css' },
	{ re: /^plugins\/[^/]+\/src\/.+\.s?css$/, kind: 'css' },
	{ re: /^plugins\/[^/]+\/assets\/.+\.s?css$/, kind: 'css' },
	{ re: /^plugins\/[^/]+\/includes\/.+\.php$/, kind: 'php' },
	{ re: /^plugins\/[^/]+\/src\/blocks\/.+\.php$/, kind: 'php' },
	{ re: /^plugins\/sgs-blocks\/src\/.+\.(js|jsx|mjs|ts|tsx)$/, kind: 'js' },
	{ re: /^theme\/sgs-theme\/theme\.json$/, kind: 'json' },
	{ re: /^sites\/[^/]+\/theme-snapshot\.json$/, kind: 'json' },
];

/**
 * Excludes. `tracked` excludes must still match at least one tracked file (a stale exclude is
 * indistinguishable from no exclude, migration-method Step 6); `untracked` excludes are never in
 * `git ls-files` today and stay excluded if one ever is committed.
 */
const EXCLUDE = [
	{ re: /(^|\/)tests\//, tracked: true, probe: 'plugins/sgs-blocks/tests/', reason: 'test code and fixtures, not shipped' },
	{ re: /^(plugins\/[^/]+\/)?scripts\//, tracked: true, probe: 'plugins/sgs-blocks/scripts/', reason: 'tooling, including hover-guard/test-fixtures and this detector\'s fixtures' },
	{ re: /^plugins\/[^/]+\/scripts\/hover-guard\/test-fixtures\//, tracked: true, probe: 'plugins/sgs-blocks/scripts/hover-guard/test-fixtures/', reason: 'hover-guard fixture copies of shipped stylesheets' },
	{ re: /(^|\/)vendor\//, tracked: true, probe: 'plugins/sgs-client-notes/assets/vendor/', reason: 'third-party bundles' },
	{ re: /\.min\.(css|js)$/, tracked: true, probe: 'plugins/sgs-client-notes/assets/vendor/html2canvas.min.js', reason: 'minified copies' },
	{ re: /(^|\/)build\//, tracked: false, reason: 'compiled output of the src files already in the corpus' },
	{ re: /(^|\/)node_modules\//, tracked: false, reason: 'dependencies' },
	{ re: /(^|\/)stackable\//, tracked: false, reason: 'git-ignored third-party reference copy' },
];

/**
 * Retired tokens (plan §2.3). Any mention anywhere in the corpus is `legacy-token`.
 * The trailing lookahead stops `--sgs-focus-color` matching a longer, different name.
 */
const RETIRED_TOKEN_RE = /--sgs-focus-(?:color|glow|shadow|underlay-colour|ring-(?:width|colour|opacity|offset))(?![\w-])|--wp--custom--focus-ring--[\w-]+|--sgs-filter-search-focus(?![\w-])|--sgs-ps-focus-ring(?![\w-])/g;

/** JSON key paths that are retired (plan §2.3). */
const RETIRED_JSON_KEYS = [ [ 'settings', 'custom', 'focus-ring' ] ];

/** Names that look like focus tokens but are not keyboard focus, or belong to the new system. */
const EXEMPT_NAMES = {
	'--sgs-focus-s': 'proximity-focus scale of horizontal panels (FR-38A-39), not keyboard focus',
	'--sgs-focus-op': 'proximity-focus opacity of horizontal panels (FR-38A-39), not keyboard focus',
	'--sgs-focus-offset': 'the override contract (§2.4): a block may set its own gap',
	'--sgs-focus-under': 'the override contract (§2.4): a block hands in its own shadow',
	'--sgs-focus-width': 'the system width token read by focus.css',
};

/** Indicator properties: painting these on a focused element draws a bespoke ring. */
const INDICATOR_PROPS = new Set( [ 'outline', 'outline-color', 'outline-width', 'outline-style', 'outline-offset', 'box-shadow', '--sgs-focus-shadow' ] );

/**
 * Task groups (plan §3, "Groups"). Resolved in this order: editor chrome, motion, the
 * focus-ring attribute, explicit prefixes, then the type fallback (php, json, links-other).
 */
const BLOCK_GROUPS = {
	buttons: [ 'button', 'buybox', 'cart', 'choice-flow', 'choice-flow-question', 'choice-flow-result', 'whatsapp-cta', 'product-card', 'wishlist-link', 'wishlist-panel', 'account' ],
	nav: [ 'nav-bar-menu', 'nav-drawer', 'nav-drawer-menu', 'mega-group', 'language-switch', 'breadcrumbs', 'store-selector' ],
	forms: [ 'form', 'form-field-file', 'filter-search', 'product-search', 'option-picker', 'pricing-table', 'before-after' ],
	widgets: [ 'accordion', 'tabs', 'testimonial-slider', 'gallery', 'google-reviews', 'trustpilot-reviews', 'audio', 'media', 'collapsible-text', 'product-faq', 'modal', 'notice-banner', 'card-grid' ],
};

const PATH_GROUPS = [
	[ 'theme-core', [ 'theme/sgs-theme/assets/css/core-blocks-critical.css', 'theme/sgs-theme/assets/css/utilities.css', 'theme/sgs-theme/assets/css/core-blocks.css', SYSTEM_FILE ] ],
	[ 'woocommerce', [ 'theme/sgs-theme/assets/css/woocommerce.css' ] ],
	[ 'nav', [ 'theme/sgs-theme/assets/css/dark-mode.css', 'plugins/sgs-blocks/assets/css/slider-nav.css' ] ],
	[ 'forms', [ 'plugins/sgs-client-notes/assets/css/', 'plugins/sgs-blocks/assets/css/contrast.css' ] ],
	[ 'widgets', [ 'device-toggle', 'motion-pause', 'fx-marquee', 'fx-lottie', 'fx-generative-background', 'fx-wave-gradient' ].map( ( n ) => `plugins/sgs-blocks/assets/css/${ n }.css` ) ],
];

const MOTION_PREFIXES = [
	'plugins/sgs-blocks/assets/css/motion.css',
	'plugins/sgs-blocks/includes/motion/',
	'plugins/sgs-blocks/src/blocks/extensions/motion/',
	'plugins/sgs-blocks/src/components/motion/',
];

const FOCUS_RING_ATTR_PREFIXES = [
	'plugins/sgs-blocks/includes/hover-effects/',
	'plugins/sgs-blocks/src/blocks/extensions/hover-effects/',
];

const EDITOR_PATHS = [
	/(^|\/)editor\.s?css$/,
	/^plugins\/[^/]+\/assets\/admin\//,
	/^plugins\/sgs-blocks\/src\/components\/.+\.s?css$/,
	/^plugins\/sgs-blocks\/assets\/css\/motion-thumbnails\.css$/,
];

function groupOf( rel, selector ) {
	if ( MOTION_PREFIXES.some( ( p ) => rel.startsWith( p ) ) ) {
		return 'motion';
	}
	if ( EDITOR_PATHS.some( ( re ) => re.test( rel ) ) ) {
		return 'editor';
	}
	if ( FOCUS_RING_ATTR_PREFIXES.some( ( p ) => rel.startsWith( p ) ) ) {
		return 'focus-ring-attr';
	}
	if ( 'plugins/sgs-blocks/assets/css/extensions.css' === rel && selector && selector.includes( 'sgs-has-focus-ring' ) ) {
		return 'focus-ring-attr';
	}
	for ( const [ group, prefixes ] of PATH_GROUPS ) {
		if ( prefixes.some( ( p ) => rel.startsWith( p ) ) ) {
			return group;
		}
	}
	const block = /^plugins\/sgs-blocks\/src\/blocks\/([^/]+)\//.exec( rel );
	if ( block ) {
		for ( const [ group, blocks ] of Object.entries( BLOCK_GROUPS ) ) {
			if ( blocks.includes( block[ 1 ] ) ) {
				return group;
			}
		}
	}
	if ( rel.endsWith( '.json' ) ) {
		return 'json';
	}
	if ( rel.endsWith( '.php' ) ) {
		return 'php';
	}
	return 'links-other';
}

const GROUPS = [ 'theme-core', 'buttons', 'woocommerce', 'nav', 'forms', 'widgets', 'links-other', 'focus-ring-attr', 'motion', 'editor', 'json', 'php' ];

/**
 * The wide enumeration (corpus control): every tracked file mentioning `:focus` or a retired
 * token. A file in it but outside the corpus must match one of these, with its reason.
 */
const WIDTH_OK = [
	{ re: /^\.claude\//, reason: 'docs, plans, reports and backups: prose, never shipped CSS' },
	{ re: /^reports\//, reason: 'dated report artefacts (JSON and HTML captures)' },
	{ re: /^plugins\/[^/]+\/reports\//, reason: 'dated report artefacts' },
	{ re: /^(plugins\/[^/]+\/)?scripts\//, reason: 'tooling and its fixtures (excluded by EXCLUDE)' },
	{ re: /^plugins\/[^/]+\/tests\//, reason: 'test code and fixtures (excluded by EXCLUDE)' },
	{ re: /(^|\/)vendor\/|\.min\.(css|js)$/, reason: 'third-party or minified bundles (excluded by EXCLUDE)' },
	{ re: /^sites\/(?!.*\/theme-snapshot\.json$)/, reason: 'client drafts, handoffs and extraction captures: design input, not shipped CSS (only theme-snapshot.json ships)' },
	{ re: /^reference\//, reason: 'reference-site captures' },
	{ re: /^\.firecrawl\//, reason: 'research crawl captures' },
	{ re: /^lighthouse-report/, reason: 'a Lighthouse capture' },
	{ re: /^plugins\/sgs-blocks\/src\/blocks\/[^/]+\/block\.json$/, reason: 'attribute descriptions that name the states in prose; block.json emits no CSS' },
	{ re: /^plugins\/sgs-blocks\/schemas\//, reason: 'the motion schema describes the form Focus state values in prose; the emitter is in the corpus (includes/motion/)' },
	{ re: /\.md$/, reason: 'documentation' },
	{ re: /(^|\/)package(-lock)?\.json$/, reason: 'npm script names such as check:focus-system; no CSS' },
];

/** File extensions the wide enumeration reads (text sources only). */
const WIDE_EXT_RE = /\.(css|scss|php|js|jsx|mjs|cjs|ts|tsx|json|html|htm)$/;

/**
 * Why the dumb `:focus` count is larger than the number of `:focus` substrings in classified
 * selectors. Every occurrence lands in exactly one of these buckets or in a classified item;
 * an occurrence in none of them fails the corpus control.
 */
const GAP_OK = {
	comment: 'a comment that names a focus state in prose',
	'at-rule-param': 'an at-rule prelude such as @supports selector(:focus-visible)',
	'decl-value': 'a declaration value that names a focus state (e.g. a transition note)',
	'structural-selector': 'a rule whose own selector carries :focus but which holds only nested rules; the nested rules are classified with the resolved selector',
	'emitter-selector': 'a PHP or JS selector string handed to a pairing helper or concatenated into a rule; the statement is the classified item, a second mention in the same statement is counted here',
	'not-css': 'a PHP or JS mention that is not CSS (a runtime :focus-visible query), registered with a reason',
	'json-string': 'a JSON string value that names a focus state in prose',
};

module.exports = {
	ROOT,
	ALLOW_FILE,
	BASELINE_FILE,
	CENSUS_FILE,
	SYSTEM_FILE,
	INCLUDE,
	EXCLUDE,
	RETIRED_TOKEN_RE,
	RETIRED_JSON_KEYS,
	EXEMPT_NAMES,
	INDICATOR_PROPS,
	GROUPS,
	groupOf,
	WIDTH_OK,
	WIDE_EXT_RE,
	GAP_OK,
};
