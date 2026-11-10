<?php
/**
 * Header Behaviours — the always-on `sgs-has-header` body class + asset enqueuer.
 *
 * Sticky / transparent / shrink / hide-on-scroll and `contrastSafe` are
 * per-device {desktop,tablet,mobile} values resolved by
 * `sgs/site-header/render.php`, scoped per instance via `sgs_emit_tier_rules()`
 * / `sgs_emit_tier_rules_map()` (a site-wide body class cannot express "on for
 * desktop, off for mobile"). Contrast advisories are editor notices
 * (`sgs/site-header/edit.js`), never enforcement.
 *
 * This class emits exactly one body class, `sgs-has-header` — the page-level
 * marker that a page carries an SGS header — and enqueues the shared
 * header-behaviour CSS/JS that `view.js` needs for scroll-state classes.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Header_Behaviours
 */
final class Sgs_Header_Behaviours {

	/**
	 * Wire WordPress hooks. Safe to call from sgs-blocks.php bootstrap.
	 */
	public static function register(): void {
		\add_filter( 'body_class', array( __CLASS__, 'add_body_classes' ) );
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
		\add_action( 'wp_head', array( __CLASS__, 'print_scroll_restore_script' ), 1 );
	}

	/**
	 * The pre-paint scroll-restore script, with the project's tier queries filled in.
	 *
	 * On a reload or a back/forward visit with no hash it takes scroll restoration from the browser, pre-shrinks the header
	 * row the saved position would shrink, and scrolls to the saved position once the page has settled, so the content does
	 * not move while the page grows. Every other visit keeps the browser's behaviour.
	 *
	 * @return string The script body, without the script tags.
	 */
	public static function scroll_restore_script(): string {
		return str_replace(
			array( '__SGS_MOBILE_QUERY__', '__SGS_TABLET_QUERY__' ),
			array( \SGS_Breakpoints::query( 'mobile' ), \SGS_Breakpoints::query( 'tablet' ) ),
			<<<'JS'
(function(){
var d=document,h=d.documentElement,store=null;
try{store=window.sessionStorage;}catch(e){}
if(!store){return;}
var st=history.state,id=st&&st.sgsScrollId;
if(!id){
id=Math.random().toString(36).slice(2)+Date.now().toString(36);
try{history.replaceState(Object.assign({},st&&typeof st==='object'?st:{},{sgsScrollId:id}),'');}catch(e){}
}
var KEY='sgs-scroll:'+id;
window.addEventListener('pagehide',function(){
try{
if(d.querySelector('[data-sgs-row-shrink]')){store.setItem(KEY,String(Math.round(window.scrollY)));}else{store.removeItem(KEY);}
}catch(e){}
});
var nav=window.performance&&performance.getEntriesByType?performance.getEntriesByType('navigation')[0]:null;
var type=nav?nav.type:'';
if((type!=='reload'&&type!=='back_forward')||location.hash){return;}
if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){return;}
var saved=parseInt(store.getItem(KEY),10);
if(!(saved>0)){return;}
try{history.scrollRestoration='manual';}catch(e){return;}
var tier='desktop';
if(matchMedia('__SGS_MOBILE_QUERY__').matches){tier='mobile';}else if(matchMedia('__SGS_TABLET_QUERY__').matches){tier='tablet';}
var shrink=saved>50,applied=false,jumped=false;
h.setAttribute('data-sgs-scroll-restore',shrink?'shrunk':'1');
var hold=d.createElement('style');
hold.textContent='html[data-sgs-scroll-restore] .sgs-row-behaviour,html[data-sgs-scroll-restore] .sgs-row-behaviour>.sgs-container__inner{transition:none!important}';
(d.head||h).appendChild(hold);
function apply(){
var rows=d.querySelectorAll('.sgs-site-header-row--middle.sgs-row-behaviour'),n=0;
for(var i=0;i<rows.length;i++){
var tiers=(rows[i].getAttribute('data-sgs-row-shrink')||'').split(' ');
if(tiers.indexOf(tier)!==-1){rows[i].classList.add('is-row-shrink-active','is-row-shrunk');n++;}
}
return n;
}
function jump(){window.scrollTo({top:saved,left:0,behavior:'instant'});}
function early(){
if(shrink&&!applied){applied=apply()>0;}
if(!jumped&&d.body&&d.body.scrollHeight>=saved+window.innerHeight){jumped=true;jump();}
if((!shrink||applied)&&jumped){mo.disconnect();}
}
var mo=new MutationObserver(early);
mo.observe(h,{childList:true,subtree:true});
early();
d.addEventListener('DOMContentLoaded',function(){
if(shrink){apply();}
if(!jumped){jumped=true;jump();}
mo.disconnect();
});
function release(){
requestAnimationFrame(function(){requestAnimationFrame(function(){h.removeAttribute('data-sgs-scroll-restore');if(hold.parentNode){hold.parentNode.removeChild(hold);}});});
}
function settle(){
if(Math.abs(window.scrollY-saved)>1){jump();}
release();
}
function afterLayout(){
requestAnimationFrame(function(){
if(d.fonts&&d.fonts.ready){d.fonts.ready.then(settle,settle);}else{settle();}
});
}
if(d.readyState==='complete'){afterLayout();}else{window.addEventListener('load',afterLayout);}
})();
JS
		);
	}

	/**
	 * Print the scroll-restore script at the very start of the head.
	 */
	public static function print_scroll_restore_script(): void {
		if ( \is_admin() ) {
			return;
		}
		echo '<script id="sgs-scroll-restore">' . self::scroll_restore_script() . "</script>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static script, no user input.
	}

	/**
	 * Append the stable `sgs-has-header` hook class to the <body> element.
	 *
	 * This is the class's ONLY body-class output — every header behaviour is
	 * emitted as per-instance scoped CSS by `sgs/site-header/render.php`. See the
	 * class docblock for why.
	 *
	 * @param string[] $classes Existing body classes from WordPress.
	 * @return string[]
	 */
	public static function add_body_classes( array $classes ): array {
		$classes[] = 'sgs-has-header';

		return $classes;
	}

	/**
	 * Enqueue CSS and JS assets on the frontend only.
	 *
	 * The JS is a plain IIFE so it is enqueued as a standard deferred script,
	 * not a WP module. The build step copies it to build/header-behaviours/view.js;
	 * in development the source file is served directly when the build output
	 * does not yet exist.
	 */
	public static function enqueue_assets(): void {
		if ( \is_admin() ) {
			return;
		}

		$css_path = SGS_BLOCKS_PATH . 'assets/css/header-behaviours.css';
		if ( file_exists( $css_path ) ) {
			\wp_enqueue_style(
				'sgs-header-behaviours',
				SGS_BLOCKS_URL . 'assets/css/header-behaviours.css',
				array(),
				SGS_BLOCKS_VERSION
			);
		}

		$js_build = SGS_BLOCKS_PATH . 'build/header-behaviours/view.js';
		$js_src   = SGS_BLOCKS_PATH . 'src/header-behaviours/view.js';

		if ( file_exists( $js_build ) ) {
			$js_url = SGS_BLOCKS_URL . 'build/header-behaviours/view.js';
		} elseif ( file_exists( $js_src ) ) {
			$js_url = SGS_BLOCKS_URL . 'src/header-behaviours/view.js';
		} else {
			return;
		}

		\wp_enqueue_script(
			'sgs-header-behaviours-view',
			$js_url,
			array(),
			SGS_BLOCKS_VERSION,
			array(
				'strategy'  => 'defer',
				'in_footer' => true,
			)
		);
	}
}
