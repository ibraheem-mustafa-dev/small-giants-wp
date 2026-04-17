# Stash Backup — dropped 2026-04-18

12 stashes from mobile-nav / mega-menu / header-footer / indus-foods WIP (21-23 days old).
Dropped after superseded by PR #3 (header-footer-upgrade merged 2026-03-25) + subsequent work.
Raw diffs preserved below for recovery if needed.

---
## stash@{0}
stash@{0}: WIP on feat/mobile-nav-block: 5601540 docs: session 8 handoff — mega menu critique + mobile-nav attr WIP

```diff
diff --git a/plugins/sgs-blocks/includes/lucide-icons.php b/plugins/sgs-blocks/includes/lucide-icons.php
index 6b38703..2161c44 100644
--- a/plugins/sgs-blocks/includes/lucide-icons.php
+++ b/plugins/sgs-blocks/includes/lucide-icons.php
@@ -2,7 +2,7 @@
 /**
  * Auto-generated Lucide icon map — DO NOT EDIT.
  * Generated from lucide-static (1917 icons).
- * Last generated: 2026-03-26T23:22:36.120Z
+ * Last generated: 2026-03-26T23:25:33.238Z
  *
  * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.
  *
diff --git a/plugins/sgs-blocks/src/blocks/mobile-nav/style.css b/plugins/sgs-blocks/src/blocks/mobile-nav/style.css
index 51d6fc4..c90ce2e 100644
--- a/plugins/sgs-blocks/src/blocks/mobile-nav/style.css
+++ b/plugins/sgs-blocks/src/blocks/mobile-nav/style.css
@@ -9,14 +9,68 @@
  * 5. interpolate-size for height:auto accordion
  * 6. prefers-reduced-motion kill switch
  *
+ * CSS custom properties are set as inline styles on .sgs-mobile-nav by
+ * render.php — only when an attribute deviates from the default. The values
+ * declared here are the fallback defaults used when no override is present.
+ *
  * @package SGS\Blocks
  */
 
 /* ─── Custom Properties ─────────────────────────────────────────────────────── */
 .sgs-mobile-nav {
+	/* Accent / divider tokens */
 	--sgs-mn-accent: var(--wp--preset--color--accent, #f87a1f);
-	--sgs-mn-divider: var(--wp--preset--color--accent, #f87a1f);
+	--sgs-mn-divider: var(--wp--preset--color--surface-alt, #f5f7f7);
+
+	/* Animation timing */
 	--sgs-mn-stagger: 25ms;
+	--sgs-mn-duration: 400ms;
+	--sgs-mn-exit-duration: 280ms;
+	--sgs-mn-backdrop-opacity: 0.6;
+
+	/* Layout */
+	--sgs-mn-width: 85%;
+	--sgs-mn-max-width: 400px;
+
+	/* Header */
+	--sgs-mn-logo-width: 120px;
+	--sgs-mn-close-size: 48px;
+	--sgs-mn-close-bg: rgba(255, 255, 255, 0.15);
+	--sgs-mn-close-colour: inherit;
+
+	/* Navigation typography */
+	--sgs-mn-link-size: var(--wp--preset--font-size--medium, 1.125rem);
+	--sgs-mn-link-size-mobile: var(--sgs-mn-link-size);
+	--sgs-mn-link-weight: 600;
+	--sgs-mn-sublink-size: var(--wp--preset--font-size--small, 1rem);
+	--sgs-mn-sublink-size-mobile: var(--sgs-mn-sublink-size);
+	--sgs-mn-indent: 24px;
+
+	/* Link colours */
+	--sgs-mn-link-colour: inherit;
+	--sgs-mn-link-hover: var(--wp--preset--color--accent, #f87a1f);
+	--sgs-mn-link-active: var(--wp--preset--color--accent, #f87a1f);
+	--sgs-mn-sublink-colour: rgba(255, 255, 255, 0.85);
+	--sgs-mn-sublink-hover: var(--wp--preset--color--accent, #f87a1f);
+
+	/* CTA colours */
+	--sgs-mn-cta-bg: var(--wp--preset--color--accent, #f87a1f);
+	--sgs-mn-cta-text-colour: var(--wp--preset--color--text, #1e1e1e);
+	--sgs-mn-cta-border: transparent;
+	--sgs-mn-cta2-bg: transparent;
+	--sgs-mn-cta2-text: var(--wp--preset--color--surface, #fff);
+
+	/* Backdrop + focus */
+	--sgs-mn-backdrop: rgba(0, 0, 0, 0.6);
+	--sgs-mn-focus: var(--wp--preset--color--accent, #f87a1f);
+
+	/* Social */
+	--sgs-mn-social-size: 44px;
+
+	/* Gradient — none by default */
+	--sgs-mn-gradient: none;
+
+	/* Spring easing curve — shared by entry animation and chevron */
 	--sgs-mn-spring: linear(
 		0, 0.009, 0.036 2.1%, 0.142 4.3%, 0.332 7.0%,
 		0.58 10.2%, 0.714 12.2%, 0.827 14.4%, 0.916 16.8%,
@@ -35,21 +89,22 @@
 	overflow-y: auto;
 	-webkit-overflow-scrolling: touch;
 	overscroll-behavior: contain;
-	background-color: var(--wp--preset--color--primary-dark, #075e80);
-	color: var(--wp--preset--color--surface, #fff);
+	background-color: var(--sgs-mn-bg, var(--wp--preset--color--primary-dark, #075e80));
+	background-image: var(--sgs-mn-gradient, none);
+	color: var(--sgs-mn-text, var(--wp--preset--color--surface, #fff));
 	border: none;
 	margin: 0;
 	padding: var(--wp--preset--spacing--40, 1.5rem);
 	transition:
-		transform 400ms var(--sgs-mn-spring),
+		transform var(--sgs-mn-duration) var(--sgs-mn-spring),
 		opacity 300ms ease,
-		overlay 400ms allow-discrete,
-		display 400ms allow-discrete;
+		overlay var(--sgs-mn-duration) allow-discrete,
+		display var(--sgs-mn-duration) allow-discrete;
 }
 
 /* Backdrop via Popover API */
 .sgs-mobile-nav::backdrop {
-	background: rgba(0, 0, 0, 0.6);
+	background: var(--sgs-mn-backdrop);
 	opacity: 0;
 	transition:
 		opacity 300ms ease,
@@ -58,7 +113,7 @@
 }
 
 .sgs-mobile-nav:popover-open::backdrop {
-	opacity: 1;
+	opacity: var(--sgs-mn-backdrop-opacity);
 }
 
 /* Fallback for browsers without Popover API */
@@ -75,7 +130,8 @@
 	position: fixed;
 	inset: 0;
 	z-index: 9999;
-	background: rgba(0, 0, 0, 0.6);
+	background: var(--sgs-mn-backdrop);
+	opacity: var(--sgs-mn-backdrop-opacity);
 }
 
 /* ─── Variant: Overlay (full-screen, slides down) ───────────────────────────── */
@@ -89,13 +145,22 @@
 	transform: translateY(0);
 }
 
+/* ─── Overlay content alignment ─────────────────────────────────────────────── */
+.sgs-mobile-nav--pos-centre {
+	justify-content: center;
+}
+
+.sgs-mobile-nav--pos-space-between {
+	justify-content: space-between;
+}
+
 /* ─── Variant: Slide from Left ──────────────────────────────────────────────── */
 .sgs-mobile-nav--slide-left {
 	top: 0;
 	bottom: 0;
 	left: 0;
 	right: auto;
-	width: min(85vw, 400px);
+	width: min(var(--sgs-mn-width), var(--sgs-mn-max-width));
 	transform: translateX(-100%);
 }
 
@@ -110,7 +175,7 @@
 	bottom: 0;
 	right: 0;
 	left: auto;
-	width: min(85vw, 400px);
+	width: min(var(--sgs-mn-width), var(--sgs-mn-max-width));
 	transform: translateX(100%);
 }
 
@@ -138,10 +203,10 @@
 /* ─── Exit Animation — snappier, no spring bounce on close ──────────────────── */
 .sgs-mobile-nav.is-closing {
 	transition:
-		transform 280ms cubic-bezier(0.4, 0, 1, 1),
+		transform var(--sgs-mn-exit-duration) cubic-bezier(0.4, 0, 1, 1),
 		opacity 200ms ease-in,
-		overlay 280ms allow-discrete,
-		display 280ms allow-discrete;
+		overlay var(--sgs-mn-exit-duration) allow-discrete,
+		display var(--sgs-mn-exit-duration) allow-discrete;
 }
 
 .sgs-mobile-nav.is-closing::backdrop {
@@ -191,29 +256,58 @@
 /* ─── Drawer Header ─────────────────────────────────────────────────────────── */
 .sgs-mobile-nav__header {
 	display: flex;
-	justify-content: flex-end;
+	align-items: center;
+	justify-content: space-between;
 	padding-bottom: var(--wp--preset--spacing--20, 0.5rem);
 	position: relative;
 	padding-top: 20px;
 }
 
+/* ─── Logo ──────────────────────────────────────────────────────────────────── */
+.sgs-mobile-nav__logo {
+	display: flex;
+	align-items: center;
+	max-width: var(--sgs-mn-logo-width);
+	flex-shrink: 0;
+}
+
+.sgs-mobile-nav__logo img {
+	max-width: 100%;
+	height: auto;
+	display: block;
+}
+
+/* Fallback site name text when no logo image is set */
+.sgs-mobile-nav__site-name {
+	font-weight: 700;
+	font-size: 1.125rem;
+	color: inherit;
+	white-space: nowrap;
+	overflow: hidden;
+	text-overflow: ellipsis;
+}
+
+/* ─── Close Button ──────────────────────────────────────────────────────────── */
 .sgs-mobile-nav__close {
 	display: flex;
 	align-items: center;
 	justify-content: center;
-	width: 48px;
-	height: 48px;
+	width: var(--sgs-mn-close-size);
+	height: var(--sgs-mn-close-size);
+	min-width: 44px;
+	min-height: 44px;
 	border-radius: 50%;
 	border: none;
-	background: rgba(255, 255, 255, 0.15) !important; /* !important overrides WP core button reset */
-	color: inherit;
+	background: var(--sgs-mn-close-bg) !important; /* !important overrides WP core button reset */
+	color: var(--sgs-mn-close-colour);
 	cursor: pointer;
+	flex-shrink: 0;
 	transition: background 200ms ease;
 }
 
 .sgs-mobile-nav__close:hover,
 .sgs-mobile-nav__close:focus-visible {
-	background: rgba(255, 255, 255, 0.25);
+	background: rgba(255, 255, 255, 0.25) !important;
 }
 
 .sgs-mobile-nav__close svg {
@@ -221,16 +315,30 @@
 	height: 20px;
 }
 
+/* Square close button variant — 8px radius instead of 50% */
+.sgs-mobile-nav__close--square {
+	border-radius: 8px;
+}
+
+/* Plain close button variant — no background */
+.sgs-mobile-nav__close--plain,
+.sgs-mobile-nav__close--plain:hover,
+.sgs-mobile-nav__close--plain:focus-visible {
+	background: transparent !important;
+}
+
 /* ─── Zone 1: CTA Section ───────────────────────────────────────────────────── */
 .sgs-mobile-nav__cta {
 	display: flex;
 	align-items: center;
+	flex-wrap: wrap;
 	gap: var(--wp--preset--spacing--20, 0.5rem);
 	padding-bottom: var(--wp--preset--spacing--30, 1rem);
 	border-bottom: 1px solid var(--sgs-mn-divider);
 	margin-bottom: var(--wp--preset--spacing--30, 1rem);
 }
 
+/* ─── CTA Button — base ─────────────────────────────────────────────────────── */
 .sgs-mobile-nav__cta-btn {
 	display: inline-flex;
 	align-items: center;
@@ -239,11 +347,12 @@
 	justify-content: center;
 	padding: 14px 24px;
 	border-radius: 50px;
-	background: var(--sgs-mn-accent);
-	color: var(--wp--preset--color--text, #1e1e1e);
+	background: var(--sgs-mn-cta-bg);
+	color: var(--sgs-mn-cta-text-colour);
 	font-weight: 700;
 	font-size: 0.9375rem;
 	text-decoration: none;
+	border: 2px solid transparent;
 	transition: filter 200ms ease, transform 200ms ease;
 	min-height: 48px;
 }
@@ -255,11 +364,43 @@
 }
 
 .sgs-mobile-nav__cta-btn svg {
-	width: 16px;
-	height: 16px;
+	width: 18px;
```

---
## stash@{1}
stash@{1}: WIP on feat/mobile-nav-block: b467fa4 fix(mobile-nav): batch 1 design review — 6 polish fixes

```diff
diff --git a/plugins/sgs-blocks/includes/lucide-icons.php b/plugins/sgs-blocks/includes/lucide-icons.php
index cfb55c4..ef7c3f7 100644
--- a/plugins/sgs-blocks/includes/lucide-icons.php
+++ b/plugins/sgs-blocks/includes/lucide-icons.php
@@ -2,7 +2,7 @@
 /**
  * Auto-generated Lucide icon map — DO NOT EDIT.
  * Generated from lucide-static (1917 icons).
- * Last generated: 2026-03-25T09:06:34.207Z
+ * Last generated: 2026-03-25T10:03:46.671Z
  *
  * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.
  *
diff --git a/plugins/sgs-blocks/src/blocks/mobile-nav/block.json b/plugins/sgs-blocks/src/blocks/mobile-nav/block.json
index 2338e3f..b137b86 100644
--- a/plugins/sgs-blocks/src/blocks/mobile-nav/block.json
+++ b/plugins/sgs-blocks/src/blocks/mobile-nav/block.json
@@ -2,7 +2,7 @@
 	"$schema": "https://schemas.wp.org/trunk/block.json",
 	"apiVersion": 3,
 	"name": "sgs/mobile-nav",
-	"version": "1.0.2",
+	"version": "1.0.3",
 	"title": "Mobile Navigation",
 	"category": "sgs-interactive",
 	"description": "Full-screen mobile navigation drawer with accordion submenus, spring-physics animation, and swipe-to-close. Reads menu items from the header navigation block automatically.",
@@ -78,7 +78,7 @@
 		},
 		"staggerDelay": {
 			"type": "number",
-			"default": 40
+			"default": 25
 		},
 		"breakpoint": {
 			"type": "number",
diff --git a/plugins/sgs-blocks/src/blocks/mobile-nav/style.css b/plugins/sgs-blocks/src/blocks/mobile-nav/style.css
index bae729b..ba3d70d 100644
--- a/plugins/sgs-blocks/src/blocks/mobile-nav/style.css
+++ b/plugins/sgs-blocks/src/blocks/mobile-nav/style.css
@@ -16,7 +16,7 @@
 .sgs-mobile-nav {
 	--sgs-mn-accent: var(--wp--preset--color--accent, #f87a1f);
 	--sgs-mn-divider: var(--wp--preset--color--accent, #f87a1f);
-	--sgs-mn-stagger: 40ms;
+	--sgs-mn-stagger: 25ms;
 	--sgs-mn-spring: linear(
 		0, 0.009, 0.036 2.1%, 0.142 4.3%, 0.332 7.0%,
 		0.58 10.2%, 0.714 12.2%, 0.827 14.4%, 0.916 16.8%,
@@ -135,6 +135,24 @@
 	transform: translateY(0);
 }
 
+/* ─── Exit Animation — snappier, no spring bounce on close ──────────────────── */
+/* Entry uses spring (overshoot feels natural opening), exit uses ease-in
+   (decisive, no bounce-back). JS adds .is-closing via beforetoggle event. */
+.sgs-mobile-nav.is-closing {
+	transition:
+		transform 280ms cubic-bezier(0.4, 0, 1, 1),
+		opacity 200ms ease-in,
+		overlay 280ms allow-discrete,
+		display 280ms allow-discrete;
+}
+
+.sgs-mobile-nav.is-closing::backdrop {
+	transition:
+		opacity 200ms ease-in,
+		overlay 200ms allow-discrete,
+		display 200ms allow-discrete;
+}
+
 /* ─── @starting-style — entry animation from display:none ───────────────────── */
 @starting-style {
 	.sgs-mobile-nav--overlay:popover-open {
@@ -158,11 +176,27 @@
 	}
 }
 
+/* ─── Drag Handle — swipe affordance pill at top of drawer ─────────────────── */
+.sgs-mobile-nav__header::before {
+	content: "";
+	display: block;
+	width: 36px;
+	height: 4px;
+	background: rgba(255, 255, 255, 0.25);
+	border-radius: 2px;
+	position: absolute;
+	top: 10px;
+	left: 50%;
+	transform: translateX(-50%);
+}
+
 /* ─── Drawer Header ─────────────────────────────────────────────────────────── */
 .sgs-mobile-nav__header {
 	display: flex;
 	justify-content: flex-end;
 	padding-bottom: var(--wp--preset--spacing--20, 0.5rem);
+	position: relative;
+	padding-top: 20px;
 }
 
 .sgs-mobile-nav__close {
diff --git a/plugins/sgs-blocks/src/blocks/mobile-nav/view.js b/plugins/sgs-blocks/src/blocks/mobile-nav/view.js
index 07a6349..503ca84 100644
--- a/plugins/sgs-blocks/src/blocks/mobile-nav/view.js
+++ b/plugins/sgs-blocks/src/blocks/mobile-nav/view.js
@@ -30,14 +30,24 @@ function init() {
 	// Set up link-click close.
 	setupLinkClickClose( drawer );
 
-	// Scroll lock on open/close.
+	// Scroll lock + exit animation easing.
 	if ( supportsPopover ) {
+		// beforetoggle fires before state change — set closing easing.
+		drawer.addEventListener( 'beforetoggle', ( e ) => {
+			if ( e.newState === 'closed' ) {
+				drawer.classList.add( 'is-closing' );
+			}
+		} );
+
 		drawer.addEventListener( 'toggle', ( e ) => {
 			if ( e.newState === 'open' ) {
+				drawer.classList.remove( 'is-closing' );
 				lockScroll();
 			} else {
 				unlockScroll();
 				returnFocus( trigger );
+				// Clean up after exit transition completes.
+				drawer.classList.remove( 'is-closing' );
 			}
 		} );
 	}
```

---
## stash@{2}
stash@{2}: On feat/mega-menu-templates: header-fix-wip

```diff
diff --git a/theme/sgs-theme/parts/header.html b/theme/sgs-theme/parts/header.html
index 55cf4c9..461ec9f 100644
--- a/theme/sgs-theme/parts/header.html
+++ b/theme/sgs-theme/parts/header.html
@@ -53,9 +53,9 @@
 		<!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"right"},"metadata":{"name":"Navigation and CTA"}} -->
 		<div class="wp-block-group">
 
-			<!-- Mobile nav toggle button (hamburger) — only visible on mobile/tablet -->
+			<!-- Mobile nav toggle button (hamburger) — triggers Popover API drawer -->
 			<!-- wp:html -->
-			<button class="sgs-mobile-nav-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="sgs-mobile-nav-drawer">
+			<button class="sgs-mobile-nav-toggle" popovertarget="sgs-mobile-nav" aria-label="Open navigation menu">
 				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
 					<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
 				</svg>
@@ -71,70 +71,8 @@
 	</div>
 	<!-- /wp:group -->
 
-	<!-- Mobile navigation drawer — full-screen overlay -->
-	<!-- wp:html -->
-	<div class="sgs-mobile-nav-drawer__backdrop"></div>
-	<nav class="sgs-mobile-nav-drawer" id="sgs-mobile-nav-drawer" aria-label="Mobile navigation" aria-hidden="true">
-
-		<!-- Drawer header: close button -->
-		<div class="sgs-mobile-nav-drawer__header">
-			<button class="sgs-mobile-nav-drawer__close" aria-label="Close navigation menu">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
-				</svg>
-			</button>
-		</div>
-
-		<!-- CTA section: trade account button + email + phone icons -->
-		<div class="sgs-mobile-nav-drawer__cta">
-			<a href="/apply-for-trade-account/" class="sgs-mobile-nav-drawer__cta-btn">
-				Become A Trade Customer
-				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
-				</svg>
-			</a>
-			<a href="mailto:amir@indusfoodsltd.com" class="sgs-mobile-nav-drawer__icon-btn" aria-label="Email us at amir@indusfoodsltd.com">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
-				</svg>
-			</a>
-			<a href="tel:+441217714330" class="sgs-mobile-nav-drawer__icon-btn" aria-label="Call us on 0121 771 4330">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/>
-				</svg>
-			</a>
-		</div>
-
-		<!-- Nav items cloned here by JS -->
-		<div class="sgs-mobile-nav-drawer__content">
-		</div>
-
-		<!-- Social links -->
-		<div class="sgs-mobile-nav-drawer__socials">
-			<a href="https://www.linkedin.com/company/indus-foods-ltd/" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--linkedin" aria-label="Follow us on LinkedIn" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
-				</svg>
-			</a>
-			<a href="https://www.facebook.com/indusfoodsltd/" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--facebook" aria-label="Follow us on Facebook" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
-				</svg>
-			</a>
-			<a href="https://g.page/r/CYLLa_01-rZvEAE/review" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--google" aria-label="Leave us a Google review" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
-				</svg>
-			</a>
-			<a href="https://www.instagram.com/indusfoodsltd/" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--instagram" aria-label="Follow us on Instagram" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
-				</svg>
-			</a>
-		</div>
-
-	</nav>
-	<!-- /wp:html -->
+	<!-- Mobile navigation drawer — SGS block with Popover API, spring animation, stagger cascade -->
+	<!-- wp:sgs/mobile-nav {"variant":"overlay","ctaText":"Apply for Trade","ctaUrl":"/apply-for-trade-account/"} /-->
 
 </div>
 <!-- /wp:group -->
```

---
## stash@{3}
stash@{3}: WIP on feat/mobile-nav-block: 100a801 fix(mega-menu): sync all templates from deployed server state

```diff
diff --git a/plugins/sgs-blocks/includes/lucide-icons.php b/plugins/sgs-blocks/includes/lucide-icons.php
index cfb55c4..6958143 100644
--- a/plugins/sgs-blocks/includes/lucide-icons.php
+++ b/plugins/sgs-blocks/includes/lucide-icons.php
@@ -2,7 +2,7 @@
 /**
  * Auto-generated Lucide icon map — DO NOT EDIT.
  * Generated from lucide-static (1917 icons).
- * Last generated: 2026-03-25T09:06:34.207Z
+ * Last generated: 2026-03-25T09:46:06.625Z
  *
  * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.
  *
diff --git a/plugins/sgs-blocks/src/blocks/mobile-nav/block.json b/plugins/sgs-blocks/src/blocks/mobile-nav/block.json
index 2c5b6d9..2338e3f 100644
--- a/plugins/sgs-blocks/src/blocks/mobile-nav/block.json
+++ b/plugins/sgs-blocks/src/blocks/mobile-nav/block.json
@@ -2,7 +2,7 @@
 	"$schema": "https://schemas.wp.org/trunk/block.json",
 	"apiVersion": 3,
 	"name": "sgs/mobile-nav",
-	"version": "1.0.1",
+	"version": "1.0.2",
 	"title": "Mobile Navigation",
 	"category": "sgs-interactive",
 	"description": "Full-screen mobile navigation drawer with accordion submenus, spring-physics animation, and swipe-to-close. Reads menu items from the header navigation block automatically.",
@@ -29,11 +29,11 @@
 		},
 		"accentColour": {
 			"type": "string",
-			"default": "accent"
+			"default": "primary"
 		},
 		"dividerColour": {
 			"type": "string",
-			"default": "accent"
+			"default": "surface-alt"
 		},
 		"showCta": {
 			"type": "boolean",
diff --git a/plugins/sgs-blocks/src/blocks/mobile-nav/style.css b/plugins/sgs-blocks/src/blocks/mobile-nav/style.css
index 3c5ae0d..bae729b 100644
--- a/plugins/sgs-blocks/src/blocks/mobile-nav/style.css
+++ b/plugins/sgs-blocks/src/blocks/mobile-nav/style.css
@@ -173,7 +173,7 @@
 	height: 48px;
 	border-radius: 50%;
 	border: none;
-	background: rgba(255, 255, 255, 0.15);
+	background: rgba(255, 255, 255, 0.15) !important; /* !important overrides WP core button reset */
 	color: inherit;
 	cursor: pointer;
 	transition: background 200ms ease;
@@ -366,7 +366,7 @@
 .sgs-mobile-nav__submenu {
 	list-style: none;
 	margin: 0;
-	padding: 0 0 0 var(--wp--preset--spacing--30, 1rem);
+	padding: 0 0 0 var(--wp--preset--spacing--40, 1.5rem);
 	overflow: hidden;
 	interpolate-size: allow-keywords;
 	height: 0;
@@ -642,6 +642,36 @@ body:has(.sgs-mobile-nav[data-desktop-burger="true"]) [popovertarget="sgs-mobile
 	}
 }
 
+/* ─── Touch Active States ──────────────────────────────────────────────────── */
+/* Instant feedback on press (0ms in), gentle release (150ms out). */
+.sgs-mobile-nav__link,
+.sgs-mobile-nav__sublink,
+.sgs-mobile-nav__toggle,
+.sgs-mobile-nav__close,
+.sgs-mobile-nav__cta-btn,
+.sgs-mobile-nav__icon-btn,
+.sgs-mobile-nav__social-link {
+	-webkit-tap-highlight-color: transparent;
+}
+
+.sgs-mobile-nav__link:active,
+.sgs-mobile-nav__sublink:active,
+.sgs-mobile-nav__toggle:active {
+	background: rgba(255, 255, 255, 0.08);
+	transition: background 0ms;
+}
+
+/* ─── Touch-Sticky Hover Fix ───────────────────────────────────────────────── */
+/* On touch devices, :hover persists after tap — clear it so the accordion
+   toggle doesn't show a filled background box in the expanded state. */
+@media (hover: none) {
+	.sgs-mobile-nav__toggle:hover,
+	.sgs-mobile-nav__link:hover,
+	.sgs-mobile-nav__sublink:hover {
+		background: none;
+	}
+}
+
 /* ─── Focus Visible ─────────────────────────────────────────────────────────── */
 .sgs-mobile-nav :focus-visible {
 	outline: 2px solid var(--sgs-mn-accent);
diff --git a/theme/sgs-theme/parts/header.html b/theme/sgs-theme/parts/header.html
index 0c112bc..461ec9f 100644
--- a/theme/sgs-theme/parts/header.html
+++ b/theme/sgs-theme/parts/header.html
@@ -72,7 +72,7 @@
 	<!-- /wp:group -->
 
 	<!-- Mobile navigation drawer — SGS block with Popover API, spring animation, stagger cascade -->
-	<!-- wp:sgs/mobile-nav {"variant":"overlay","ctaText":"Become A Trade Customer","ctaUrl":"/apply-for-trade-account/"} /-->
+	<!-- wp:sgs/mobile-nav {"variant":"overlay","ctaText":"Apply for Trade","ctaUrl":"/apply-for-trade-account/"} /-->
 
 </div>
 <!-- /wp:group -->
```

---
## stash@{4}
stash@{4}: On feat/mega-menu-templates: mobile-nav-cleanup

```diff
diff --git a/plugins/sgs-blocks/includes/lucide-icons.php b/plugins/sgs-blocks/includes/lucide-icons.php
index 502d3b9..cfb55c4 100644
--- a/plugins/sgs-blocks/includes/lucide-icons.php
+++ b/plugins/sgs-blocks/includes/lucide-icons.php
@@ -2,7 +2,7 @@
 /**
  * Auto-generated Lucide icon map — DO NOT EDIT.
  * Generated from lucide-static (1917 icons).
- * Last generated: 2026-03-22T19:28:11.031Z
+ * Last generated: 2026-03-25T09:06:34.207Z
  *
  * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.
  *
diff --git a/theme/sgs-theme/assets/css/core-blocks-critical.css b/theme/sgs-theme/assets/css/core-blocks-critical.css
index f47ecc0..e924f9a 100644
--- a/theme/sgs-theme/assets/css/core-blocks-critical.css
+++ b/theme/sgs-theme/assets/css/core-blocks-critical.css
@@ -435,9 +435,8 @@ body.sgs-has-transparent-header .wp-site-blocks > :first-child {
 }
 
 /*
- * Show/hide rules for the WP core nav toggle are in mobile-nav-drawer.css.
- * They were moved there to avoid a LiteSpeed CSS optimiser bug that incorrectly
- * merges adjacent max-width/min-width media blocks and drops the desktop hide rule.
+ * Show/hide rules for the WP core nav toggle now live in the sgs/mobile-nav
+ * block's style.css (style-index.css). The old mobile-nav-drawer.css is deleted.
  */
 
 /* ─── REDUCED MOTION — universal rule + critical overrides ─── */
diff --git a/theme/sgs-theme/assets/css/mobile-nav-drawer.css b/theme/sgs-theme/assets/css/mobile-nav-drawer.css
deleted file mode 100644
index 95eb5a9..0000000
--- a/theme/sgs-theme/assets/css/mobile-nav-drawer.css
+++ /dev/null
@@ -1,635 +0,0 @@
-/**
- * SGS Theme — Mobile Navigation Drawer (Full-Screen Overlay)
- *
- * Full-screen teal overlay that slides down from the top on mobile/tablet.
- * Contains a CTA section, nav items with gold dividers, and social icons.
- * Nav items are cloned from the desktop navigation block via JS.
- *
- * Sections (top to bottom):
- * 1. Drawer container + backdrop
- * 2. Drawer header (close button)
- * 3. CTA section (trade account button + email/phone icons)
- * 4. Nav content (cloned from desktop nav)
- * 5. Social links
- * 6. Hamburger toggle button
- * 7. Hide/show responsive rules
- * 8. Body scroll lock
- * 9. Reduced motion
- *
- * @package SGS\Theme
- */
-
-/* ─── DRAWER CONTAINER ─── */
-
-/**
- * Full-screen overlay — slides down from top on open.
- * Closed state: translateY(-100%) (completely above viewport).
- * Open state: translateY(0).
- */
-.sgs-mobile-nav-drawer {
-	position: fixed;
-	inset: 0;
-	width: 100%;
-	height: 100%;
-	background-color: var(--wp--preset--color--primary, #0a7ea8);
-	color: var(--wp--preset--color--surface, #ffffff);
-	transform: translateY(-100%);
-	transition: transform 350ms cubic-bezier(0.4, 0, 0.2, 1);
-	z-index: 10000;
-	overflow-y: auto;
-	-webkit-overflow-scrolling: touch;
-	/* Hidden from screen readers when closed */
-	visibility: hidden;
-	display: flex;
-	flex-direction: column;
-}
-
-.sgs-mobile-nav-drawer.is-open {
-	transform: translateY(0);
-	visibility: visible;
-}
-
-/* ─── BACKDROP OVERLAY ─── */
-
-/**
- * Full-screen backdrop behind the drawer.
- * For a full-screen drawer this is mostly decorative — provides a
- * click-to-close target and dims any content visible at small zooms.
- */
-.sgs-mobile-nav-drawer__backdrop {
-	position: fixed;
-	inset: 0;
-	background-color: rgba(0, 0, 0, 0.6);
-	opacity: 0;
-	visibility: hidden;
-	transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear 300ms;
-	z-index: 9999;
-}
-
-.sgs-mobile-nav-drawer__backdrop.is-open {
-	opacity: 1;
-	visibility: visible;
-	transition: opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear 0s;
-}
-
-/* ─── DRAWER HEADER ─── */
-
-/**
- * Thin row at the top containing only the close button, aligned right.
- * 44×44px touch target meets WCAG 2.2 AA requirements.
- */
-.sgs-mobile-nav-drawer__header {
-	display: flex;
-	justify-content: flex-end;
-	align-items: center;
-	padding: var(--wp--preset--spacing--20, 0.5rem) var(--wp--preset--spacing--30, 1rem);
-	flex-shrink: 0;
-}
-
-.sgs-mobile-nav-drawer__close {
-	min-width: 44px;
-	min-height: 44px;
-	display: inline-flex;
-	align-items: center;
-	justify-content: center;
-	background: rgba(255, 255, 255, 0.1);
-	border: 1px solid rgba(255, 255, 255, 0.25);
-	color: var(--wp--preset--color--surface, #ffffff);
-	cursor: pointer;
-	border-radius: 50%;
-	transition: background-color 200ms cubic-bezier(0.16, 1, 0.3, 1),
-	            border-color 200ms cubic-bezier(0.16, 1, 0.3, 1);
-}
-
-.sgs-mobile-nav-drawer__close:hover,
-.sgs-mobile-nav-drawer__close:focus {
-	background-color: rgba(255, 255, 255, 0.2);
-	border-color: rgba(255, 255, 255, 0.5);
-}
-
-.sgs-mobile-nav-drawer__close:focus-visible {
-	outline: 3px solid var(--wp--preset--color--surface, #ffffff);
-	outline-offset: 3px;
-}
-
-.sgs-mobile-nav-drawer__close svg {
-	width: 20px;
-	height: 20px;
-	flex-shrink: 0;
-}
-
-/* ─── CTA SECTION ─── */
-
-/**
- * Gold pill button + email/phone icon circles.
- * Matches reference: pill button left, two icon circles right.
- */
-.sgs-mobile-nav-drawer__cta {
-	display: flex;
-	align-items: center;
-	gap: var(--wp--preset--spacing--20, 0.5rem);
-	padding: var(--wp--preset--spacing--30, 1rem) var(--wp--preset--spacing--30, 1rem) var(--wp--preset--spacing--40, 1.5rem);
-	flex-shrink: 0;
-}
-
-/* Gold pill CTA button */
-.sgs-mobile-nav-drawer__cta-btn {
-	display: inline-flex;
-	align-items: center;
-	gap: 8px;
-	background-color: var(--wp--preset--color--accent, #d8ca50);
-	color: var(--wp--preset--color--text, #1e1e1e);
-	text-decoration: none;
-	font-weight: 700;
-	font-size: var(--wp--preset--font-size--small, 0.875rem);
-	line-height: 1.2;
-	padding: 12px 20px;
-	border-radius: 50px;
-	transition: background-color 200ms cubic-bezier(0.16, 1, 0.3, 1),
-	            transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
-	flex-shrink: 1;
-	min-height: 48px;
-}
-
-.sgs-mobile-nav-drawer__cta-btn:hover,
-.sgs-mobile-nav-drawer__cta-btn:focus {
-	background-color: #c9ba40;
-	transform: translateY(-1px);
-}
-
-.sgs-mobile-nav-drawer__cta-btn:focus-visible {
-	outline: 3px solid var(--wp--preset--color--surface, #ffffff);
-	outline-offset: 3px;
-}
-
-.sgs-mobile-nav-drawer__cta-btn svg {
-	width: 16px;
-	height: 16px;
-	flex-shrink: 0;
-}
-
-/* Icon circle buttons (email, phone) */
-.sgs-mobile-nav-drawer__icon-btn {
-	display: inline-flex;
-	align-items: center;
-	justify-content: center;
-	width: 48px;
-	height: 48px;
-	min-width: 48px;
-	background-color: var(--wp--preset--color--accent, #d8ca50);
-	color: var(--wp--preset--color--text, #1e1e1e);
-	border-radius: 50%;
-	text-decoration: none;
-	transition: background-color 200ms cubic-bezier(0.16, 1, 0.3, 1),
-	            transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
-	flex-shrink: 0;
-}
-
-.sgs-mobile-nav-drawer__icon-btn:hover,
-.sgs-mobile-nav-drawer__icon-btn:focus {
-	background-color: #c9ba40;
-	transform: scale(1.05);
-}
-
-.sgs-mobile-nav-drawer__icon-btn:focus-visible {
-	outline: 3px solid var(--wp--preset--color--surface, #ffffff);
-	outline-offset: 3px;
-}
-
-.sgs-mobile-nav-drawer__icon-btn svg {
-	width: 20px;
-	height: 20px;
-	flex-shrink: 0;
-}
-
-/* ─── DRAWER CONTENT (NAV ITEMS) ─── */
-
-/**
- * Container for the cloned desktop nav items.
- * Full-width links with gold bottom borders matching reference.
- */
-.sgs-mobile-nav-drawer__content {
-	flex: 1;
-	overflow-y: auto;
-}
-
-/* Nav container list reset */
-.sgs-mobile-nav-drawer__content .wp-block-navigation__container {
-	display: flex;
-	flex-direction: column;
-	gap: 0;
-	list-style: none;
-	margin: 0;
-	padding: 0;
-}
-
-/* Individual nav items */
-.sgs-mobile-nav-drawer__content .wp-block-navigation-item {
-	width: 100%;
-	margin: 0;
-	border-bottom: 1px solid var(--wp--preset--color--accent, #d8ca50);
-}
-
-/* Nav link base */
-.sgs-mobile-nav-drawer__content .wp-block-navigation-item__content {
-	display: flex;
-	align-items: center;
-	width: 100%;
-	min-height: 56px;
-	padding: 14px var(--wp--preset--spacing--30, 1rem);
-	color: var(--wp--preset--color--surface, #ffffff);
-	text-decoration: none;
-	font-size: 1rem;
-	font-weight: 600;
-	transition: background-color 200ms cubic-bezier(0.16, 1, 0.3, 1),
-	            color 200ms cubic-bezier(0.16, 1, 0.3, 1);
-	background: none;
-	border: none;
-	cursor: pointer;
-	text-align: left;
-	box-sizing: border-box;
-}
-
-.sgs-mobile-nav-drawer__content .wp-block-navigation-item__content:hover,
-.sgs-mobile-nav-drawer__content .wp-block-navigation-item__content:focus {
-	background-color: rgba(255, 255, 255, 0.1);
-	color: var(--wp--preset--color--accent, #d8ca50);
-}
-
-.sgs-mobile-nav-drawer__content .wp-block-navigation-item__content:focus-visible {
-	outline: 3px solid var(--wp--preset--color--surface, #ffffff);
-	outline-offset: -3px;
-}
-
-/* Current page: gold text */
-.sgs-mobile-nav-drawer__content .wp-block-navigation-item__content[aria-current="page"],
```

---
## stash@{5}
stash@{5}: WIP on feat/mobile-nav-block: cdd047b Merge pull request #3 from ibraheem-mustafa-dev/feature/header-footer-upgrade

```diff
diff --git a/plugins/sgs-blocks/includes/lucide-icons.php b/plugins/sgs-blocks/includes/lucide-icons.php
index 502d3b9..542dafc 100644
--- a/plugins/sgs-blocks/includes/lucide-icons.php
+++ b/plugins/sgs-blocks/includes/lucide-icons.php
@@ -2,7 +2,7 @@
 /**
  * Auto-generated Lucide icon map — DO NOT EDIT.
  * Generated from lucide-static (1917 icons).
- * Last generated: 2026-03-22T19:28:11.031Z
+ * Last generated: 2026-03-25T00:17:14.314Z
  *
  * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.
  *
diff --git a/theme/sgs-theme/functions.php b/theme/sgs-theme/functions.php
index f923ac3..a9dc62a 100644
--- a/theme/sgs-theme/functions.php
+++ b/theme/sgs-theme/functions.php
@@ -54,6 +54,7 @@ function setup(): void {
 
 	add_editor_style( 'assets/css/core-blocks-critical.css' );
 	add_editor_style( 'assets/css/core-blocks.css' );
+	add_editor_style( 'assets/css/mega-menu-panels.css' );
 }
 add_action( 'after_setup_theme', __NAMESPACE__ . '\setup' );
 
@@ -231,6 +232,14 @@ function enqueue_styles(): void {
 		$theme_version
 	);
 
+	// Mega menu panel shared styles — layout, cards, icons, CTA, logo tiles.
+	wp_enqueue_style(
+		'sgs-mega-menu-panels',
+		get_theme_file_uri( 'assets/css/mega-menu-panels.css' ),
+		[ 'sgs-core-blocks-critical' ],
+		$theme_version
+	);
+
 	wp_enqueue_script(
 		'sgs-header-behaviour',
 		get_theme_file_uri( 'assets/js/header-behaviour.js' ),
@@ -296,7 +305,7 @@ add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_global_layout_fixes'
  * asynchronously without blocking first paint.
  */
 function defer_non_critical_css( string $tag, string $handle ): string {
-	$deferred = [ 'sgs-core-blocks', 'sgs-dark-mode', 'sgs-mobile-nav-drawer', 'sgs-utilities', 'sgs-extensions' ];
+	$deferred = [ 'sgs-core-blocks', 'sgs-dark-mode', 'sgs-mobile-nav-drawer', 'sgs-utilities', 'sgs-extensions', 'sgs-mega-menu-panels' ];
 
 	if ( in_array( $handle, $deferred, true ) ) {
 		// Replace media="all" with media="print" and add onload swap.
diff --git a/theme/sgs-theme/parts/header.html b/theme/sgs-theme/parts/header.html
index 55cf4c9..0c112bc 100644
--- a/theme/sgs-theme/parts/header.html
+++ b/theme/sgs-theme/parts/header.html
@@ -53,9 +53,9 @@
 		<!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"right"},"metadata":{"name":"Navigation and CTA"}} -->
 		<div class="wp-block-group">
 
-			<!-- Mobile nav toggle button (hamburger) — only visible on mobile/tablet -->
+			<!-- Mobile nav toggle button (hamburger) — triggers Popover API drawer -->
 			<!-- wp:html -->
-			<button class="sgs-mobile-nav-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="sgs-mobile-nav-drawer">
+			<button class="sgs-mobile-nav-toggle" popovertarget="sgs-mobile-nav" aria-label="Open navigation menu">
 				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
 					<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
 				</svg>
@@ -71,70 +71,8 @@
 	</div>
 	<!-- /wp:group -->
 
-	<!-- Mobile navigation drawer — full-screen overlay -->
-	<!-- wp:html -->
-	<div class="sgs-mobile-nav-drawer__backdrop"></div>
-	<nav class="sgs-mobile-nav-drawer" id="sgs-mobile-nav-drawer" aria-label="Mobile navigation" aria-hidden="true">
-
-		<!-- Drawer header: close button -->
-		<div class="sgs-mobile-nav-drawer__header">
-			<button class="sgs-mobile-nav-drawer__close" aria-label="Close navigation menu">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
-				</svg>
-			</button>
-		</div>
-
-		<!-- CTA section: trade account button + email + phone icons -->
-		<div class="sgs-mobile-nav-drawer__cta">
-			<a href="/apply-for-trade-account/" class="sgs-mobile-nav-drawer__cta-btn">
-				Become A Trade Customer
-				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
-				</svg>
-			</a>
-			<a href="mailto:amir@indusfoodsltd.com" class="sgs-mobile-nav-drawer__icon-btn" aria-label="Email us at amir@indusfoodsltd.com">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
-				</svg>
-			</a>
-			<a href="tel:+441217714330" class="sgs-mobile-nav-drawer__icon-btn" aria-label="Call us on 0121 771 4330">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/>
-				</svg>
-			</a>
-		</div>
-
-		<!-- Nav items cloned here by JS -->
-		<div class="sgs-mobile-nav-drawer__content">
-		</div>
-
-		<!-- Social links -->
-		<div class="sgs-mobile-nav-drawer__socials">
-			<a href="https://www.linkedin.com/company/indus-foods-ltd/" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--linkedin" aria-label="Follow us on LinkedIn" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
-				</svg>
-			</a>
-			<a href="https://www.facebook.com/indusfoodsltd/" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--facebook" aria-label="Follow us on Facebook" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
-				</svg>
-			</a>
-			<a href="https://g.page/r/CYLLa_01-rZvEAE/review" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--google" aria-label="Leave us a Google review" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
-				</svg>
-			</a>
-			<a href="https://www.instagram.com/indusfoodsltd/" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--instagram" aria-label="Follow us on Instagram" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
-				</svg>
-			</a>
-		</div>
-
-	</nav>
-	<!-- /wp:html -->
+	<!-- Mobile navigation drawer — SGS block with Popover API, spring animation, stagger cascade -->
+	<!-- wp:sgs/mobile-nav {"variant":"overlay","ctaText":"Become A Trade Customer","ctaUrl":"/apply-for-trade-account/"} /-->
 
 </div>
 <!-- /wp:group -->
diff --git a/theme/sgs-theme/parts/mega-menu-brands.html b/theme/sgs-theme/parts/mega-menu-brands.html
index c475c1f..16df793 100644
--- a/theme/sgs-theme/parts/mega-menu-brands.html
+++ b/theme/sgs-theme/parts/mega-menu-brands.html
@@ -7,8 +7,8 @@
 		<!-- wp:column {"width":"66%"} -->
 		<div class="wp-block-column" style="flex-basis:66%">
 
-			<!-- wp:heading {"level":4,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}},"textColor":"text-muted","fontSize":"small"} -->
-			<h4 class="wp-block-heading has-text-muted-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--40);text-transform:uppercase;letter-spacing:0.08em">Our Brands</h4>
+			<!-- wp:heading {"level":4,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}},"typography":{"fontSize":"1rem","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase"}},"textColor":"text-muted"} -->
+			<h4 class="wp-block-heading has-text-muted-color has-text-color" style="margin-bottom:var(--wp--preset--spacing--40);font-size:1rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Our Brands</h4>
 			<!-- /wp:heading -->
 
 			<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|30"}},"layout":{"type":"flex","flexWrap":"wrap","verticalAlignment":"center"}} -->
@@ -71,8 +71,8 @@
 		<!-- wp:column {"width":"34%","style":{"border":{"left":{"color":"var:preset|color|border","width":"1px"},"radius":"0"},"spacing":{"padding":{"left":"var:preset|spacing|50"}}}} -->
 		<div class="wp-block-column" style="flex-basis:34%;border-left-color:var(--wp--preset--color--border);border-left-width:1px;padding-left:var(--wp--preset--spacing--50)">
 
-			<!-- wp:heading {"level":4,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"textColor":"text-muted","fontSize":"small"} -->
-			<h4 class="wp-block-heading has-text-muted-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--30);text-transform:uppercase;letter-spacing:0.08em">Own Brands</h4>
+			<!-- wp:heading {"level":4,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}},"typography":{"fontSize":"1rem","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase"}},"textColor":"text-muted"} -->
+			<h4 class="wp-block-heading has-text-muted-color has-text-color" style="margin-bottom:var(--wp--preset--spacing--30);font-size:1rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Own Brands</h4>
 			<!-- /wp:heading -->
 
 			<!-- wp:paragraph {"textColor":"text-muted","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}},"typography":{"fontSize":"0.875rem"}}} -->
diff --git a/theme/sgs-theme/parts/mega-menu-sectors.html b/theme/sgs-theme/parts/mega-menu-sectors.html
index c241496..f171fac 100644
--- a/theme/sgs-theme/parts/mega-menu-sectors.html
+++ b/theme/sgs-theme/parts/mega-menu-sectors.html
@@ -1,8 +1,8 @@
 <!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"layout":{"type":"constrained","contentSize":"1200px"}} -->
 <div class="wp-block-group" style="padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">
 
-	<!-- wp:heading {"level":4,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}},"textColor":"text-muted","fontSize":"small"} -->
-	<h4 class="wp-block-heading has-text-muted-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--40);text-transform:uppercase;letter-spacing:0.08em">We Serve</h4>
+	<!-- wp:heading {"level":4,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}},"typography":{"fontSize":"1rem","fontWeight":"700","letterSpacing":"0.08em","textTransform":"uppercase"}},"textColor":"text-muted"} -->
+	<h4 class="wp-block-heading has-text-muted-color has-text-color" style="margin-bottom:var(--wp--preset--spacing--40);font-size:1rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">We Serve</h4>
 	<!-- /wp:heading -->
 
 	<!-- wp:columns {"style":{"spacing":{"blockGap":{"top":"0","left":"var:preset|spacing|40"}}}} -->
@@ -10,8 +10,8 @@
 
 		<!-- wp:column -->
 		<div class="wp-block-column">
-			<!-- wp:group {"style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"color":{"gradient":"linear-gradient(160deg, rgb(212,184,74) 0%, rgb(178,148,42) 100%)"}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
-			<div class="wp-block-group has-background" style="border-radius:12px;background:linear-gradient(160deg, rgb(212,184,74) 0%, rgb(178,148,42) 100%);padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
+			<!-- wp:group {"style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"color":{"gradient":"linear-gradient(160deg, rgb(10,126,168) 0%, rgb(7,106,142) 100%)"}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
+			<div class="wp-block-group has-background" style="border-radius:12px;background:linear-gradient(160deg, rgb(10,126,168) 0%, rgb(7,106,142) 100%);padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
 				<!-- wp:image {"sizeSlug":"medium","linkDestination":"none","style":{"border":{"radius":"8px"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"className":"sector-menu-image"} -->
 				<figure class="wp-block-image size-medium sector-menu-image" style="border-radius:8px;margin-bottom:var(--wp--preset--spacing--30)"><img src="/wp-content/uploads/indus-foods/2025/11/Seekh-Kebab-1-1024x640.png" alt="Food Service" style="max-height:120px;width:100%;object-fit:cover;border-radius:8px"/></figure>
 				<!-- /wp:image -->
@@ -31,8 +31,8 @@
 
 		<!-- wp:column -->
 		<div class="wp-block-column">
-			<!-- wp:group {"style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"color":{"gradient":"linear-gradient(160deg, rgb(42,122,122) 0%, rgb(22,88,88) 100%)"}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
-			<div class="wp-block-group has-background" style="border-radius:12px;background:linear-gradient(160deg, rgb(42,122,122) 0%, rgb(22,88,88) 100%);padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
+			<!-- wp:group {"style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"color":{"gradient":"linear-gradient(160deg, rgb(10,126,168) 0%, rgb(7,106,142) 100%)"}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
+			<div class="wp-block-group has-background" style="border-radius:12px;background:linear-gradient(160deg, rgb(10,126,168) 0%, rgb(7,106,142) 100%);padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
 				<!-- wp:image {"sizeSlug":"medium","linkDestination":"none","style":{"border":{"radius":"8px"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"className":"sector-menu-image"} -->
 				<figure class="wp-block-image size-medium sector-menu-image" style="border-radius:8px;margin-bottom:var(--wp--preset--spacing--30)"><img src="/wp-content/uploads/indus-foods/2025/11/cake_rusks_transparent-1.png" alt="Manufacturing" style="max-height:120px;width:100%;object-fit:cover;border-radius:8px"/></figure>
 				<!-- /wp:image -->
@@ -52,8 +52,8 @@
 
 		<!-- wp:column -->
 		<div class="wp-block-column">
-			<!-- wp:group {"style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"color":{"gradient":"linear-gradient(160deg, rgb(43,138,138) 0%, rgb(26,106,106) 100%)"}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
-			<div class="wp-block-group has-background" style="border-radius:12px;background:linear-gradient(160deg, rgb(43,138,138) 0%, rgb(26,106,106) 100%);padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
+			<!-- wp:group {"style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"color":{"gradient":"linear-gradient(160deg, rgb(10,126,168) 0%, rgb(7,106,142) 100%)"}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
+			<div class="wp-block-group has-background" style="border-radius:12px;background:linear-gradient(160deg, rgb(10,126,168) 0%, rgb(7,106,142) 100%);padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
 				<!-- wp:image {"sizeSlug":"medium","linkDestination":"none","style":{"border":{"radius":"8px"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"className":"sector-menu-image"} -->
 				<figure class="wp-block-image size-medium sector-menu-image" style="border-radius:8px;margin-bottom:var(--wp--preset--spacing--30)"><img src="/wp-content/uploads/indus-foods/2025/11/Samosas-With-Mint-Chutney-Chilli-1-e1766188272127.png" alt="Retail" style="max-height:120px;width:100%;object-fit:cover;border-radius:8px"/></figure>
 				<!-- /wp:image -->
@@ -73,10 +73,10 @@
 
 		<!-- wp:column -->
 		<div class="wp-block-column">
-			<!-- wp:group {"style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"color":{"gradient":"linear-gradient(160deg, rgb(122,140,58) 0%, rgb(88,104,34) 100%)"}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
-			<div class="wp-block-group has-background" style="border-radius:12px;background:linear-gradient(160deg, rgb(122,140,58) 0%, rgb(88,104,34) 100%);padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
+			<!-- wp:group {"style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40","right":"var:preset|spacing|40"}},"color":{"gradient":"linear-gradient(160deg, rgb(10,126,168) 0%, rgb(7,106,142) 100%)"}},"layout":{"type":"flex","orientation":"vertical","justifyContent":"space-between"}} -->
+			<div class="wp-block-group has-background" style="border-radius:12px;background:linear-gradient(160deg, rgb(10,126,168) 0%, rgb(7,106,142) 100%);padding-top:var(--wp--preset--spacing--40);padding-right:var(--wp--preset--spacing--40);padding-bottom:var(--wp--preset--spacing--40);padding-left:var(--wp--preset--spacing--40)">
 				<!-- wp:image {"sizeSlug":"medium","linkDestination":"none","style":{"border":{"radius":"8px"},"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"className":"sector-menu-image"} -->
-				<figure class="wp-block-image size-medium sector-menu-image" style="border-radius:8px;margin-bottom:var(--wp--preset--spacing--30)"><img src="/wp-content/uploads/indus-foods/2025/11/Seekh-Kebab-1-1024x640.png" alt="Wholesale" style="max-height:120px;width:100%;object-fit:cover;border-radius:8px"/></figure>
+				<figure class="wp-block-image size-medium sector-menu-image" style="border-radius:8px;margin-bottom:var(--wp--preset--spacing--30)"><img src="/wp-content/uploads/indus-foods/2025/11/Seekh-Kebab-1-1024x640.png" alt="Wholesale distribution" style="max-height:120px;width:100%;object-fit:cover;border-radius:8px"/></figure>
 				<!-- /wp:image -->
 				<!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"1.1rem","fontWeight":"700"}},"textColor":"surface"} -->
 				<h3 class="wp-block-heading has-surface-color has-text-color" style="font-size:1.1rem;font-weight:700">Wholesale</h3>
diff --git a/theme/sgs-theme/parts/mega-menu-services.html b/theme/sgs-theme/parts/mega-menu-services.html
index 24d37cd..1ef5430 100644
--- a/theme/sgs-theme/parts/mega-menu-services.html
+++ b/theme/sgs-theme/parts/mega-menu-services.html
@@ -32,8 +32,8 @@
 
 	<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
 	<div class="wp-block-buttons">
-		<!-- wp:button {"backgroundColor":"accent","textColor":"surface","style":{"border":{"radius":"8px"}}} -->
-		<div class="wp-block-button"><a class="wp-block-button__link has-surface-color has-accent-background-color has-text-color has-background wp-element-button" style="border-radius:8px">Get a Quote →</a></div>
+		<!-- wp:button {"backgroundColor":"accent","textColor":"text","style":{"border":{"radius":"8px"}}} -->
+		<div class="wp-block-button"><a class="wp-block-button__link has-text-color has-accent-background-color has-text-color has-background wp-element-button" style="border-radius:8px;color:var(--wp--preset--color--text)">Get a Quote →</a></div>
 		<!-- /wp:button -->
 	</div>
 	<!-- /wp:buttons -->
```

---
## stash@{6}
stash@{6}: On feat/mega-menu-templates: mobile-nav-block-wip

```diff
diff --git a/plugins/sgs-blocks/includes/lucide-icons.php b/plugins/sgs-blocks/includes/lucide-icons.php
index 502d3b9..7ed3baf 100644
--- a/plugins/sgs-blocks/includes/lucide-icons.php
+++ b/plugins/sgs-blocks/includes/lucide-icons.php
@@ -2,7 +2,7 @@
 /**
  * Auto-generated Lucide icon map — DO NOT EDIT.
  * Generated from lucide-static (1917 icons).
- * Last generated: 2026-03-22T19:28:11.031Z
+ * Last generated: 2026-03-25T00:04:27.463Z
  *
  * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.
  *
diff --git a/theme/sgs-theme/parts/header.html b/theme/sgs-theme/parts/header.html
index 55cf4c9..0c112bc 100644
--- a/theme/sgs-theme/parts/header.html
+++ b/theme/sgs-theme/parts/header.html
@@ -53,9 +53,9 @@
 		<!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"right"},"metadata":{"name":"Navigation and CTA"}} -->
 		<div class="wp-block-group">
 
-			<!-- Mobile nav toggle button (hamburger) — only visible on mobile/tablet -->
+			<!-- Mobile nav toggle button (hamburger) — triggers Popover API drawer -->
 			<!-- wp:html -->
-			<button class="sgs-mobile-nav-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="sgs-mobile-nav-drawer">
+			<button class="sgs-mobile-nav-toggle" popovertarget="sgs-mobile-nav" aria-label="Open navigation menu">
 				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
 					<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
 				</svg>
@@ -71,70 +71,8 @@
 	</div>
 	<!-- /wp:group -->
 
-	<!-- Mobile navigation drawer — full-screen overlay -->
-	<!-- wp:html -->
-	<div class="sgs-mobile-nav-drawer__backdrop"></div>
-	<nav class="sgs-mobile-nav-drawer" id="sgs-mobile-nav-drawer" aria-label="Mobile navigation" aria-hidden="true">
-
-		<!-- Drawer header: close button -->
-		<div class="sgs-mobile-nav-drawer__header">
-			<button class="sgs-mobile-nav-drawer__close" aria-label="Close navigation menu">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
-				</svg>
-			</button>
-		</div>
-
-		<!-- CTA section: trade account button + email + phone icons -->
-		<div class="sgs-mobile-nav-drawer__cta">
-			<a href="/apply-for-trade-account/" class="sgs-mobile-nav-drawer__cta-btn">
-				Become A Trade Customer
-				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
-				</svg>
-			</a>
-			<a href="mailto:amir@indusfoodsltd.com" class="sgs-mobile-nav-drawer__icon-btn" aria-label="Email us at amir@indusfoodsltd.com">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor"/>
-				</svg>
-			</a>
-			<a href="tel:+441217714330" class="sgs-mobile-nav-drawer__icon-btn" aria-label="Call us on 0121 771 4330">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor"/>
-				</svg>
-			</a>
-		</div>
-
-		<!-- Nav items cloned here by JS -->
-		<div class="sgs-mobile-nav-drawer__content">
-		</div>
-
-		<!-- Social links -->
-		<div class="sgs-mobile-nav-drawer__socials">
-			<a href="https://www.linkedin.com/company/indus-foods-ltd/" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--linkedin" aria-label="Follow us on LinkedIn" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
-				</svg>
-			</a>
-			<a href="https://www.facebook.com/indusfoodsltd/" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--facebook" aria-label="Follow us on Facebook" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
-				</svg>
-			</a>
-			<a href="https://g.page/r/CYLLa_01-rZvEAE/review" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--google" aria-label="Leave us a Google review" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
-				</svg>
-			</a>
-			<a href="https://www.instagram.com/indusfoodsltd/" class="sgs-mobile-nav-drawer__social-link sgs-mobile-nav-drawer__social-link--instagram" aria-label="Follow us on Instagram" target="_blank" rel="noopener noreferrer">
-				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
-					<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
-				</svg>
-			</a>
-		</div>
-
-	</nav>
-	<!-- /wp:html -->
+	<!-- Mobile navigation drawer — SGS block with Popover API, spring animation, stagger cascade -->
+	<!-- wp:sgs/mobile-nav {"variant":"overlay","ctaText":"Become A Trade Customer","ctaUrl":"/apply-for-trade-account/"} /-->
 
 </div>
 <!-- /wp:group -->
```

---
## stash@{7}
stash@{7}: WIP on feat/mobile-nav-block: cdd047b Merge pull request #3 from ibraheem-mustafa-dev/feature/header-footer-upgrade

```diff
diff --git a/plugins/sgs-blocks/includes/lucide-icons.php b/plugins/sgs-blocks/includes/lucide-icons.php
index 502d3b9..a712f24 100644
--- a/plugins/sgs-blocks/includes/lucide-icons.php
+++ b/plugins/sgs-blocks/includes/lucide-icons.php
@@ -2,7 +2,7 @@
 /**
  * Auto-generated Lucide icon map — DO NOT EDIT.
  * Generated from lucide-static (1917 icons).
- * Last generated: 2026-03-22T19:28:11.031Z
+ * Last generated: 2026-03-24T23:54:24.098Z
  *
  * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.
  *
diff --git a/theme/sgs-theme/assets/css/core-blocks.css b/theme/sgs-theme/assets/css/core-blocks.css
index e5a1232..11a1170 100644
--- a/theme/sgs-theme/assets/css/core-blocks.css
+++ b/theme/sgs-theme/assets/css/core-blocks.css
@@ -520,14 +520,14 @@ footer .wp-block-paragraph a:hover,
  * the scale so it doesn't spill outside the figure container.
  * Exemptions: brand strip logos (have their own greyscale/colour effect),
  * social icons, and avatars. */
-.wp-block-image:not(.brand-logo-tile) {
+.wp-block-image:not(.sgs-mega-logo-tile) {
 	overflow: hidden;
 }
 
-.wp-block-image:not(.brand-logo-tile) img {
+.wp-block-image:not(.sgs-mega-logo-tile) img {
 	transition: transform 0.35s ease;
 }
 
-.wp-block-image:not(.brand-logo-tile):hover img {
+.wp-block-image:not(.sgs-mega-logo-tile):hover img {
 	transform: scale(1.05);
 }
diff --git a/theme/sgs-theme/functions.php b/theme/sgs-theme/functions.php
index f923ac3..96777a9 100644
--- a/theme/sgs-theme/functions.php
+++ b/theme/sgs-theme/functions.php
@@ -54,6 +54,7 @@ function setup(): void {
 
 	add_editor_style( 'assets/css/core-blocks-critical.css' );
 	add_editor_style( 'assets/css/core-blocks.css' );
+	add_editor_style( 'assets/css/mega-menu-panels.css' );
 }
 add_action( 'after_setup_theme', __NAMESPACE__ . '\setup' );
 
@@ -223,6 +224,14 @@ function enqueue_styles(): void {
 		true // Load in footer — runs after DOM is available.
 	);
 
+	// Mega menu panel content styles — shared class system for all 7 template parts.
+	wp_enqueue_style(
+		'sgs-mega-menu-panels',
+		get_theme_file_uri( 'assets/css/mega-menu-panels.css' ),
+		[ 'sgs-core-blocks-critical' ],
+		$theme_version
+	);
+
 	// Header behaviour system — sticky, transparent, smart-reveal, shrink.
 	wp_enqueue_style(
 		'sgs-header-modes',
@@ -296,7 +305,7 @@ add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_global_layout_fixes'
  * asynchronously without blocking first paint.
  */
 function defer_non_critical_css( string $tag, string $handle ): string {
-	$deferred = [ 'sgs-core-blocks', 'sgs-dark-mode', 'sgs-mobile-nav-drawer', 'sgs-utilities', 'sgs-extensions' ];
+	$deferred = [ 'sgs-core-blocks', 'sgs-dark-mode', 'sgs-mobile-nav-drawer', 'sgs-utilities', 'sgs-extensions', 'sgs-mega-menu-panels' ];
 
 	if ( in_array( $handle, $deferred, true ) ) {
 		// Replace media="all" with media="print" and add onload swap.
@@ -593,46 +602,8 @@ function enqueue_style_variation_extras(): void {
 }
 ";
 
-		/*
-		 * Indus Foods — Brand logo tiles in the mega menu Brands panel.
-		 * Adds consistent tile sizing, white card backgrounds, and hover lift effect.
-		 * Scoped here because brand-logo-tile is used only in mega-menu-brands.html,
-		 * which is an Indus Foods-only template part.
-		 */
-		$css .= "
-/* ── Brand logo tiles (mega menu Brands panel) ──────────────────────────────
- * Each brand logo sits inside a white card tile with a border.
- * On hover the tile lifts slightly and the border highlights with primary teal.
- * display:flex !important overrides the core image block's inline-block default. */
-.brand-logo-tile{
-	display:flex!important;
-	align-items:center;
-	justify-content:center;
-	width:100px;
-	height:60px;
-	padding:8px 12px;
-	background:var(--wp--preset--color--surface,#fff);
-	border:1px solid rgba(0,0,0,.08);
-	border-radius:6px;
-	overflow:hidden;
-	transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease;
-}
-.brand-logo-tile:hover{
-	border-color:var(--wp--preset--color--primary,#0f7e80);
-	box-shadow:0 2px 8px rgba(0,0,0,.1);
-	transform:translateY(-2px);
-}
-.brand-logo-tile img,
-.brand-logo-tile .wp-block-image,
-.brand-logo-tile figure{
-	max-width:100%;
-	max-height:100%;
-	width:auto;
-	height:auto;
-	object-fit:contain;
-	margin:0!important;
-}
-";
+		/* Brand logo tile CSS migrated to mega-menu-panels.css as .sgs-mega-logo-tile
+		 * — now framework-level, not Indus-gated. */
 
 		/*
 		 * Indus Foods — Desktop navigation link styles.
diff --git a/theme/sgs-theme/style.css b/theme/sgs-theme/style.css
index 8ea1656..385232e 100644
--- a/theme/sgs-theme/style.css
+++ b/theme/sgs-theme/style.css
@@ -4,7 +4,7 @@ Theme URI: https://smallgiantsstudio.com
 Author: Small Giants Studio
 Author URI: https://smallgiantsstudio.com
 Description: A lightweight, performance-first WordPress block theme by Small Giants Studio. Provides design tokens via theme.json, custom templates, responsive typography, and self-hosted fonts.
-Version: 1.3.4
+Version: 1.4.0
 Requires at least: 6.7
 Tested up to: 6.9
 Requires PHP: 8.0
```

---
## stash@{8}
stash@{8}: WIP on feat/mega-menu-templates: cdd047b Merge pull request #3 from ibraheem-mustafa-dev/feature/header-footer-upgrade

```diff
diff --git a/theme/sgs-theme/assets/css/core-blocks.css b/theme/sgs-theme/assets/css/core-blocks.css
index e5a1232..11a1170 100644
--- a/theme/sgs-theme/assets/css/core-blocks.css
+++ b/theme/sgs-theme/assets/css/core-blocks.css
@@ -520,14 +520,14 @@ footer .wp-block-paragraph a:hover,
  * the scale so it doesn't spill outside the figure container.
  * Exemptions: brand strip logos (have their own greyscale/colour effect),
  * social icons, and avatars. */
-.wp-block-image:not(.brand-logo-tile) {
+.wp-block-image:not(.sgs-mega-logo-tile) {
 	overflow: hidden;
 }
 
-.wp-block-image:not(.brand-logo-tile) img {
+.wp-block-image:not(.sgs-mega-logo-tile) img {
 	transition: transform 0.35s ease;
 }
 
-.wp-block-image:not(.brand-logo-tile):hover img {
+.wp-block-image:not(.sgs-mega-logo-tile):hover img {
 	transform: scale(1.05);
 }
diff --git a/theme/sgs-theme/functions.php b/theme/sgs-theme/functions.php
index f923ac3..96777a9 100644
--- a/theme/sgs-theme/functions.php
+++ b/theme/sgs-theme/functions.php
@@ -54,6 +54,7 @@ function setup(): void {
 
 	add_editor_style( 'assets/css/core-blocks-critical.css' );
 	add_editor_style( 'assets/css/core-blocks.css' );
+	add_editor_style( 'assets/css/mega-menu-panels.css' );
 }
 add_action( 'after_setup_theme', __NAMESPACE__ . '\setup' );
 
@@ -223,6 +224,14 @@ function enqueue_styles(): void {
 		true // Load in footer — runs after DOM is available.
 	);
 
+	// Mega menu panel content styles — shared class system for all 7 template parts.
+	wp_enqueue_style(
+		'sgs-mega-menu-panels',
+		get_theme_file_uri( 'assets/css/mega-menu-panels.css' ),
+		[ 'sgs-core-blocks-critical' ],
+		$theme_version
+	);
+
 	// Header behaviour system — sticky, transparent, smart-reveal, shrink.
 	wp_enqueue_style(
 		'sgs-header-modes',
@@ -296,7 +305,7 @@ add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_global_layout_fixes'
  * asynchronously without blocking first paint.
  */
 function defer_non_critical_css( string $tag, string $handle ): string {
-	$deferred = [ 'sgs-core-blocks', 'sgs-dark-mode', 'sgs-mobile-nav-drawer', 'sgs-utilities', 'sgs-extensions' ];
+	$deferred = [ 'sgs-core-blocks', 'sgs-dark-mode', 'sgs-mobile-nav-drawer', 'sgs-utilities', 'sgs-extensions', 'sgs-mega-menu-panels' ];
 
 	if ( in_array( $handle, $deferred, true ) ) {
 		// Replace media="all" with media="print" and add onload swap.
@@ -593,46 +602,8 @@ function enqueue_style_variation_extras(): void {
 }
 ";
 
-		/*
-		 * Indus Foods — Brand logo tiles in the mega menu Brands panel.
-		 * Adds consistent tile sizing, white card backgrounds, and hover lift effect.
-		 * Scoped here because brand-logo-tile is used only in mega-menu-brands.html,
-		 * which is an Indus Foods-only template part.
-		 */
-		$css .= "
-/* ── Brand logo tiles (mega menu Brands panel) ──────────────────────────────
- * Each brand logo sits inside a white card tile with a border.
- * On hover the tile lifts slightly and the border highlights with primary teal.
- * display:flex !important overrides the core image block's inline-block default. */
-.brand-logo-tile{
-	display:flex!important;
-	align-items:center;
-	justify-content:center;
-	width:100px;
-	height:60px;
-	padding:8px 12px;
-	background:var(--wp--preset--color--surface,#fff);
-	border:1px solid rgba(0,0,0,.08);
-	border-radius:6px;
-	overflow:hidden;
-	transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease;
-}
-.brand-logo-tile:hover{
-	border-color:var(--wp--preset--color--primary,#0f7e80);
-	box-shadow:0 2px 8px rgba(0,0,0,.1);
-	transform:translateY(-2px);
-}
-.brand-logo-tile img,
-.brand-logo-tile .wp-block-image,
-.brand-logo-tile figure{
-	max-width:100%;
-	max-height:100%;
-	width:auto;
-	height:auto;
-	object-fit:contain;
-	margin:0!important;
-}
-";
+		/* Brand logo tile CSS migrated to mega-menu-panels.css as .sgs-mega-logo-tile
+		 * — now framework-level, not Indus-gated. */
 
 		/*
 		 * Indus Foods — Desktop navigation link styles.
diff --git a/theme/sgs-theme/parts/mega-menu-about.html b/theme/sgs-theme/parts/mega-menu-about.html
index c087f18..cf4ad14 100644
--- a/theme/sgs-theme/parts/mega-menu-about.html
+++ b/theme/sgs-theme/parts/mega-menu-about.html
@@ -1,61 +1,55 @@
-<!-- wp:group {"layout":{"type":"constrained","contentSize":"1200px"}} -->
-<div class="wp-block-group">
-	<!-- wp:columns {"style":{"spacing":{"blockGap":{"top":"var:preset|spacing|60","left":"var:preset|spacing|60"}}}} -->
-	<div class="wp-block-columns">
-		<!-- wp:column {"width":"60%"} -->
-		<div class="wp-block-column" style="flex-basis:60%">
-			<!-- wp:heading {"level":3,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}}} -->
-			<h3 class="wp-block-heading" style="margin-bottom:var(--wp--preset--spacing--40)">About Small Giants</h3>
-			<!-- /wp:heading -->
-
-			<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}}} -->
-			<p style="margin-bottom:var(--wp--preset--spacing--40)">We're a family-owned food distribution company dedicated to bringing authentic flavours from around the world to UK kitchens.</p>
-			<!-- /wp:paragraph -->
-
-			<!-- wp:sgs/icon-list {"items":[{"text":"30+ years of industry experience","icon":"check"},{"text":"Certified organic \u0026 halal products","icon":"check"},{"text":"Direct partnerships with farmers","icon":"check"}]} /-->
-
-			<!-- wp:buttons {"style":{"spacing":{"margin":{"top":"var:preset|spacing|50"}}}} -->
-			<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--50)">
-				<!-- wp:button {"backgroundColor":"primary","textColor":"surface","style":{"border":{"radius":"8px"}}} -->
-				<div class="wp-block-button"><a class="wp-block-button__link has-surface-color has-primary-background-color has-text-color has-background wp-element-button" style="border-radius:8px">Our Story →</a></div>
-				<!-- /wp:button -->
-			</div>
-			<!-- /wp:buttons -->
-		</div>
-		<!-- /wp:column -->
-
-		<!-- wp:column {"width":"40%"} -->
-		<div class="wp-block-column" style="flex-basis:40%">
-			<!-- wp:heading {"level":4,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}}} -->
-			<h4 class="wp-block-heading" style="margin-bottom:var(--wp--preset--spacing--30)">Quick Links</h4>
-			<!-- /wp:heading -->
-
-			<!-- wp:list {"style":{"spacing":{"padding":{"left":"var:preset|spacing|30"}}}} -->
-			<ul style="padding-left:var(--wp--preset--spacing--30)">
-				<!-- wp:list-item -->
-				<li><a href="#">Meet the Team</a></li>
-				<!-- /wp:list-item -->
-
-				<!-- wp:list-item -->
-				<li><a href="#">Sustainability Commitment</a></li>
-				<!-- /wp:list-item -->
-
-				<!-- wp:list-item -->
-				<li><a href="#">Awards &amp; Certifications</a></li>
-				<!-- /wp:list-item -->
-
-				<!-- wp:list-item -->
-				<li><a href="#">Careers</a></li>
-				<!-- /wp:list-item -->
-
-				<!-- wp:list-item -->
-				<li><a href="#">Press Kit</a></li>
-				<!-- /wp:list-item -->
-			</ul>
-			<!-- /wp:list -->
-		</div>
-		<!-- /wp:column -->
+<!-- wp:group {"backgroundColor":"surface-alt","className":"sgs-mega-panel sgs-mega-panel--split","style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"}}},"layout":{"type":"constrained","contentSize":"1200px"}} -->
+<div class="wp-block-group has-surface-alt-background-color has-background sgs-mega-panel sgs-mega-panel--split">
+
+	<!-- wp:group {"layout":{"type":"constrained"}} -->
+	<div class="wp-block-group">
+
+		<!-- wp:heading {"level":4,"className":"sgs-mega-title","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}},"textColor":"text-muted","fontSize":"small"} -->
+		<h4 class="wp-block-heading has-text-muted-color has-text-color has-small-font-size sgs-mega-title" style="margin-bottom:var(--wp--preset--spacing--40)">About Us</h4>
+		<!-- /wp:heading -->
+
+		<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}}} -->
+		<p style="margin-bottom:var(--wp--preset--spacing--40)">We're a family-owned food distribution company dedicated to bringing authentic flavours from around the world to UK kitchens.</p>
+		<!-- /wp:paragraph -->
+
+		<!-- wp:sgs/icon-list {"items":[{"text":"30+ years of industry experience","icon":"check"},{"text":"Certified organic \u0026 halal products","icon":"check"},{"text":"Direct partnerships with farmers","icon":"check"}]} /-->
+
+		<!-- wp:paragraph {"style":{"spacing":{"margin":{"top":"var:preset|spacing|50","bottom":"0"}}}} -->
+		<p style="margin-top:var(--wp--preset--spacing--50);margin-bottom:0"><a class="sgs-mega-cta" href="/about/">Our Story →</a></p>
+		<!-- /wp:paragraph -->
+
+	</div>
+	<!-- /wp:group -->
+
+	<!-- wp:group {"style":{"border":{"left":{"color":"var:preset|color|text-muted","width":"1px"},"radius":"0"},"spacing":{"padding":{"left":"var:preset|spacing|50"}}},"layout":{"type":"constrained"}} -->
+	<div class="wp-block-group" style="border-left-color:var(--wp--preset--color--text-muted);border-left-width:1px;padding-left:var(--wp--preset--spacing--50)">
+
+		<!-- wp:heading {"level":4,"className":"sgs-mega-title","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|30"}}},"textColor":"text-muted","fontSize":"small"} -->
+		<h4 class="wp-block-heading has-text-muted-color has-text-color has-small-font-size sgs-mega-title" style="margin-bottom:var(--wp--preset--spacing--30)">Quick Links</h4>
+		<!-- /wp:heading -->
+
+		<!-- wp:list {"className":"sgs-mega-link-list","style":{"spacing":{"padding":{"left":"0"}}}} -->
+		<ul class="sgs-mega-link-list" style="padding-left:0">
+			<!-- wp:list-item -->
+			<li><a href="#">Meet the Team</a></li>
+			<!-- /wp:list-item -->
+			<!-- wp:list-item -->
+			<li><a href="#">Sustainability Commitment</a></li>
+			<!-- /wp:list-item -->
+			<!-- wp:list-item -->
+			<li><a href="#">Awards &amp; Certifications</a></li>
+			<!-- /wp:list-item -->
+			<!-- wp:list-item -->
+			<li><a href="#">Careers</a></li>
+			<!-- /wp:list-item -->
+			<!-- wp:list-item -->
+			<li><a href="#">Press Kit</a></li>
+			<!-- /wp:list-item -->
+		</ul>
+		<!-- /wp:list -->
+
 	</div>
-	<!-- /wp:columns -->
+	<!-- /wp:group -->
+
 </div>
 <!-- /wp:group -->
diff --git a/theme/sgs-theme/parts/mega-menu-brands.html b/theme/sgs-theme/parts/mega-menu-brands.html
index c475c1f..73ca481 100644
--- a/theme/sgs-theme/parts/mega-menu-brands.html
+++ b/theme/sgs-theme/parts/mega-menu-brands.html
@@ -1,97 +1,87 @@
-<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|50","bottom":"var:preset|spacing|50","left":"var:preset|spacing|50","right":"var:preset|spacing|50"}}},"layout":{"type":"constrained","contentSize":"1200px"}} -->
-<div class="wp-block-group" style="padding-top:var(--wp--preset--spacing--50);padding-right:var(--wp--preset--spacing--50);padding-bottom:var(--wp--preset--spacing--50);padding-left:var(--wp--preset--spacing--50)">
+<!-- wp:group {"backgroundColor":"surface-alt","className":"sgs-mega-panel sgs-mega-panel--split","style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"}}},"layout":{"type":"constrained","contentSize":"1200px"}} -->
+<div class="wp-block-group has-surface-alt-background-color has-background sgs-mega-panel sgs-mega-panel--split">
 
-	<!-- wp:columns {"style":{"spacing":{"blockGap":{"top":"0","left":"var:preset|spacing|60"}}}} -->
-	<div class="wp-block-columns">
+	<!-- wp:group {"layout":{"type":"constrained"}} -->
+	<div class="wp-block-group">
 
-		<!-- wp:column {"width":"66%"} -->
-		<div class="wp-block-column" style="flex-basis:66%">
+		<!-- wp:heading {"level":4,"className":"sgs-mega-title","style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}},"textColor":"text-muted","fontSize":"small"} -->
+		<h4 class="wp-block-heading has-text-muted-color has-text-color has-small-font-size sgs-mega-title" style="margin-bottom:var(--wp--preset--spacing--40)">Our Brands</h4>
+		<!-- /wp:heading -->
 
-			<!-- wp:heading {"level":4,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}}},"textColor":"text-muted","fontSize":"small"} -->
-			<h4 class="wp-block-heading has-text-muted-color has-text-color has-small-font-size" style="margin-bottom:var(--wp--preset--spacing--40);text-transform:uppercase;letter-spacing:0.08em">Our Brands</h4>
-			<!-- /wp:heading -->
+		<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|30"}},"layout":{"type":"flex","flexWrap":"wrap","verticalAlignment":"center"}} -->
+		<div class="wp-block-group" style="display:flex;flex-wrap:wrap;gap:var(--wp--preset--spacing--30);align-items:center">
 
-			<!-- wp:group {"style":{"spacing":{"blockGap":"var:preset|spacing|30"}},"layout":{"type":"flex","flexWrap":"wrap","verticalAlignment":"center"}} -->
-			<div class="wp-block-group" style="display:flex;flex-wrap:wrap;gap:var(--wp--preset--spacing--30);align-items:center">
+			<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"sgs-mega-logo-tile"} -->
+			<figure class="wp-block-image sgs-mega-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/sanam/"><img src="/wp-content/uploads/indus-foods/2025/11/Sanam-Logo.jpg" alt="Sanam" style="max-height:54px;width:auto"/></a></figure>
+			<!-- /wp:image -->
 
-				<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"brand-logo-tile"} -->
-				<figure class="wp-block-image brand-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/sanam/"><img src="/wp-content/uploads/indus-foods/2025/11/Sanam-Logo.jpg" alt="Sanam" style="max-height:54px;width:auto"/></a></figure>
-				<!-- /wp:image -->
+			<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"sgs-mega-logo-tile"} -->
+			<figure class="wp-block-image sgs-mega-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/lemon-tree/"><img src="/wp-content/uploads/indus-foods/2025/11/Lemontree-Logo.jpg" alt="Lemon Tree" style="max-height:54px;width:auto"/></a></figure>
+			<!-- /wp:image -->
 
-				<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"brand-logo-tile"} -->
-				<figure class="wp-block-image brand-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/lemon-tree/"><img src="/wp-content/uploads/indus-foods/2025/11/Lemontree-Logo.jpg" alt="Lemon Tree" style="max-height:54px;width:auto"/></a></figure>
-				<!-- /wp:image -->
+			<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"sgs-mega-logo-tile"} -->
+			<figure class="wp-block-image sgs-mega-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/green-leaf/"><img src="/wp-content/uploads/indus-foods/2025/11/Green-Leaf-Logo.jpg" alt="Green Leaf" style="max-height:54px;width:auto"/></a></figure>
+			<!-- /wp:image -->
 
-				<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"brand-logo-tile"} -->
-				<figure class="wp-block-image brand-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/green-leaf/"><img src="/wp-content/uploads/indus-foods/2025/11/Green-Leaf-Logo.jpg" alt="Green Leaf" style="max-height:54px;width:auto"/></a></figure>
-				<!-- /wp:image -->
+			<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"sgs-mega-logo-tile"} -->
+			<figure class="wp-block-image sgs-mega-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/shan/"><img src="/wp-content/uploads/indus-foods/2025/11/Shan-Foods.jpg" alt="Shan Foods" style="max-height:54px;width:auto"/></a></figure>
+			<!-- /wp:image -->
 
-				<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"brand-logo-tile"} -->
-				<figure class="wp-block-image brand-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/shan/"><img src="/wp-content/uploads/indus-foods/2025/11/Shan-Foods.jpg" alt="Shan Foods" style="max-height:54px;width:auto"/></a></figure>
-				<!-- /wp:image -->
+			<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"sgs-mega-logo-tile"} -->
+			<figure class="wp-block-image sgs-mega-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/indus-foods/"><img src="/wp-content/uploads/indus-foods/2025/12/Indus-Foods-Ltd-Square-Logo.webp" alt="Indus Foods" style="max-height:54px;width:auto"/></a></figure>
+			<!-- /wp:image -->
 
-				<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"brand-logo-tile"} -->
-				<figure class="wp-block-image brand-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/indus-foods/"><img src="/wp-content/uploads/indus-foods/2025/12/Indus-Foods-Ltd-Square-Logo.webp" alt="Indus Foods" style="max-height:54px;width:auto"/></a></figure>
-				<!-- /wp:image -->
+			<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"sgs-mega-logo-tile"} -->
+			<figure class="wp-block-image sgs-mega-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/" aria-label="View all brands"><img src="/wp-content/uploads/indus-foods/2025/12/logo-01-150x136-1.webp" alt="Brand partner" style="max-height:54px;width:auto"/></a></figure>
+			<!-- /wp:image -->
 
-				<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"brand-logo-tile"} -->
-				<figure class="wp-block-image brand-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/"><img src="/wp-content/uploads/indus-foods/2025/12/logo-01-150x136-1.webp" alt="" style="max-height:54px;width:auto"/></a></figure>
-				<!-- /wp:image -->
+			<!-- wp:image {"linkDestination":"custom","style":{"border":{"radius":"8px"},"spacing":{"margin":{"top":"0","bottom":"0"}}},"className":"sgs-mega-logo-tile"} -->
+			<figure class="wp-block-image sgs-mega-logo-tile" style="border-radius:8px;margin-top:0;margin-bottom:0"><a href="/brands/" aria-label="View all brands"><img src="/wp-content/uploads/indus-foods/2025/12/logo-02-150x136-1.webp" alt="Brand partner" style="max-height:54px;width:auto"/></a></figure>
+			<!-- /wp:image -->
 
```

---
## stash@{9}
stash@{9}: WIP on fix/header-footer-polish: c3dbef1 docs: replace Firecrawl with research skills/agents in handoff prompts

```diff
diff --git a/plugins/sgs-blocks/includes/lucide-icons.php b/plugins/sgs-blocks/includes/lucide-icons.php
index 502d3b9..dee969f 100644
--- a/plugins/sgs-blocks/includes/lucide-icons.php
+++ b/plugins/sgs-blocks/includes/lucide-icons.php
@@ -2,7 +2,7 @@
 /**
  * Auto-generated Lucide icon map — DO NOT EDIT.
  * Generated from lucide-static (1917 icons).
- * Last generated: 2026-03-22T19:28:11.031Z
+ * Last generated: 2026-03-24T19:41:21.675Z
  *
  * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.
  *
```

---
## stash@{10}
stash@{10}: WIP on feature/header-footer-upgrade: feaf86a fix(header-footer): resolve 5 known issues from session 3

```diff
diff --git a/CONVERSATION-HANDOFF.md b/CONVERSATION-HANDOFF.md
index 5d38ea2..0a5de70 100644
--- a/CONVERSATION-HANDOFF.md
+++ b/CONVERSATION-HANDOFF.md
@@ -95,6 +95,10 @@ Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through t
 |------|-------------------|
 | Playwright MCP | Screenshot verification at 375px, 768px, 1440px after each fix |
 | Firecrawl | Look up Google Maps GBP embed URL format |
+| Context7 | Get current docs for Next.js 15, Laravel 11, shadcn/ui, PowerSync |
+| Memory MCP | Update OpenClaw entities after plan rewrite |
+| GitHub MCP | Search for competitor examples or solutions |
+
 
 ## Agents to Delegate To
 
diff --git a/plugins/sgs-blocks/includes/lucide-icons.php b/plugins/sgs-blocks/includes/lucide-icons.php
index 502d3b9..db556ce 100644
--- a/plugins/sgs-blocks/includes/lucide-icons.php
+++ b/plugins/sgs-blocks/includes/lucide-icons.php
@@ -2,7 +2,7 @@
 /**
  * Auto-generated Lucide icon map — DO NOT EDIT.
  * Generated from lucide-static (1917 icons).
- * Last generated: 2026-03-22T19:28:11.031Z
+ * Last generated: 2026-03-22T23:27:46.236Z
  *
  * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.
  *
```

---
## stash@{11}
stash@{11}: WIP on feature/indus-foods-homepage: 3b181bf Fix 7 block bugs: aria-labels, schema, store state, Lucide icons, aria-live, eager loading

```diff
diff --git a/plugins/sgs-blocks/includes/lucide-icons.php b/plugins/sgs-blocks/includes/lucide-icons.php
index d7842ac..ca7e199 100644
--- a/plugins/sgs-blocks/includes/lucide-icons.php
+++ b/plugins/sgs-blocks/includes/lucide-icons.php
@@ -2,7 +2,7 @@
 /**
  * Auto-generated Lucide icon map — DO NOT EDIT.
  * Generated from lucide-static (1917 icons).
- * Last generated: 2026-03-02T08:45:36.616Z
+ * Last generated: 2026-03-03T22:06:19.635Z
  *
  * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.
  *
diff --git a/plugins/sgs-blocks/src/blocks/announcement-bar/view.js b/plugins/sgs-blocks/src/blocks/announcement-bar/view.js
index a94a808..7e6114e 100644
--- a/plugins/sgs-blocks/src/blocks/announcement-bar/view.js
+++ b/plugins/sgs-blocks/src/blocks/announcement-bar/view.js
@@ -10,15 +10,10 @@ import { store, getContext, getElement } from '@wordpress/interactivity';
 
 const STORAGE_KEY_PREFIX = 'sgs_announcement_dismissed_';
 
+// Get the store reference for state access.
+const announcementStore = store( 'sgs/announcement-bar' );
+
 store( 'sgs/announcement-bar', {
-	state: {
-		countdown: {
-			days: 0,
-			hours: 0,
-			minutes: 0,
-			seconds: 0,
-		},
-	},
 	actions: {
 		/**
 		 * Dismiss the announcement bar.
@@ -79,6 +74,8 @@ store( 'sgs/announcement-bar', {
 
 			// Start rotation if variant is rotating.
 			if ( 'rotating' === ctx.variant ) {
+				// Initialize currentMessageIndex in context for persistence.
+				ctx.currentMessageIndex = 0;
 				this.startRotation();
 			}
 		},
@@ -96,7 +93,7 @@ store( 'sgs/announcement-bar', {
 
 				if ( remaining <= 0 ) {
 					// Countdown ended.
-					store.state.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
+					announcementStore.state.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
 
 					if ( 'hide' === ctx.countdownEndAction ) {
 						ctx.isDismissed = true;
@@ -115,7 +112,7 @@ store( 'sgs/announcement-bar', {
 				const minutes = Math.floor( ( remaining % ( 1000 * 60 * 60 ) ) / ( 1000 * 60 ) );
 				const seconds = Math.floor( ( remaining % ( 1000 * 60 ) ) / 1000 );
 
-				store.state.countdown = {
+				announcementStore.state.countdown = {
 					days: days.toString().padStart( 2, '0' ),
 					hours: hours.toString().padStart( 2, '0' ),
 					minutes: minutes.toString().padStart( 2, '0' ),
@@ -140,19 +137,19 @@ store( 'sgs/announcement-bar', {
 				return; // Nothing to rotate.
 			}
 
-			let currentIndex = 0;
-
+			// Use the context state that was initialized in init().
 			const rotateMessages = () => {
 				// Hide all messages.
 				messages.forEach( ( msg, index ) => {
-					if ( index === currentIndex ) {
+					if ( index === ctx.currentMessageIndex ) {
 						msg.setAttribute( 'data-current', 'true' );
 					} else {
 						msg.removeAttribute( 'data-current' );
 					}
 				} );
 
-				currentIndex = ( currentIndex + 1 ) % messages.length;
+				// Update context state for isMessageHidden() callback.
+				ctx.currentMessageIndex = ( ctx.currentMessageIndex + 1 ) % messages.length;
 			};
 
 			// Initial display.
diff --git a/plugins/sgs-blocks/src/blocks/brand-strip/render.php b/plugins/sgs-blocks/src/blocks/brand-strip/render.php
index c6108d2..a14c5df 100644
--- a/plugins/sgs-blocks/src/blocks/brand-strip/render.php
+++ b/plugins/sgs-blocks/src/blocks/brand-strip/render.php
@@ -55,6 +55,7 @@ $track_style_attr = ' style="' . implode( ';', $track_styles ) . '"';
 
 // Build logo items HTML.
 $logos_html = '';
+$is_first_logo = true;
 if ( ! empty( $logos ) ) {
 	foreach ( $logos as $logo ) {
 		// Handle both shapes: {id, url, alt} (homepage content) and {image: {url}, alt} (save.js).
@@ -72,12 +73,17 @@ if ( ! empty( $logos ) ) {
 		}
 
 		// H13/H14: use responsive image helper for srcset + explicit dimensions.
+		// First logo gets loading="eager" for LCP optimization, rest are lazy.
 		$logo_id = isset( $logo['id'] ) ? absint( $logo['id'] ) : ( isset( $logo['image']['id'] ) ? absint( $logo['image']['id'] ) : 0 );
 		$logo_attrs = [
 			'class'   => 'sgs-brand-strip__logo',
-			'loading' => 'lazy',
+			'loading' => $is_first_logo ? 'eager' : 'lazy',
 			'style'   => 'max-height:' . absint( $max_height ) . 'px',
 		];
+		if ( $is_first_logo ) {
+			$logo_attrs['fetchpriority'] = 'high';
+			$is_first_logo = false;
+		}
 		$logo_w = isset( $logo['image']['width'] ) ? absint( $logo['image']['width'] ) : 0;
 		$logo_h = isset( $logo['image']['height'] ) ? absint( $logo['image']['height'] ) : 0;
 		if ( $logo_w ) {
diff --git a/plugins/sgs-blocks/src/blocks/breadcrumbs/render.php b/plugins/sgs-blocks/src/blocks/breadcrumbs/render.php
index 476b67c..491d305 100644
--- a/plugins/sgs-blocks/src/blocks/breadcrumbs/render.php
+++ b/plugins/sgs-blocks/src/blocks/breadcrumbs/render.php
@@ -125,13 +125,19 @@ foreach ( $crumbs as $i => $crumb ) {
 
 // Schema.org BreadcrumbList.
 $schema_items = array();
+$last_index = count( $crumbs ) - 1;
+
 foreach ( $crumbs as $i => $crumb ) {
-	$schema_items[] = array(
+	$schema_item = array(
 		'@type'    => 'ListItem',
 		'position' => $i + 1,
 		'name'     => wp_strip_all_tags( $crumb['label'] ),
-		'item'     => $crumb['url'] ?: null,
 	);
+	// Only add 'item' if URL exists (omit for current page).
+	if ( $crumb['url'] ) {
+		$schema_item['item'] = $crumb['url'];
+	}
+	$schema_items[] = $schema_item;
 }
 
 $schema = array(
diff --git a/plugins/sgs-blocks/src/blocks/counter/render.php b/plugins/sgs-blocks/src/blocks/counter/render.php
index 71113b3..46604d2 100644
--- a/plugins/sgs-blocks/src/blocks/counter/render.php
+++ b/plugins/sgs-blocks/src/blocks/counter/render.php
@@ -63,8 +63,9 @@ if ( $suffix ) {
 }
 
 // Build the number span with prefix/suffix display and animation data attributes.
+// Add aria-live="polite" so screen readers announce the animated number correctly.
 $number_html = sprintf(
-	'<span class="sgs-counter__number"%s%s>%s%s%s</span>',
+	'<span class="sgs-counter__number"%s%s aria-live="polite">%s%s%s</span>',
 	$num_style_attr,
 	$data_attrs,
 	esc_html( $prefix ),
diff --git a/plugins/sgs-blocks/src/blocks/cta-section/render.php b/plugins/sgs-blocks/src/blocks/cta-section/render.php
index f3ca90f..df6c7b8 100644
--- a/plugins/sgs-blocks/src/blocks/cta-section/render.php
+++ b/plugins/sgs-blocks/src/blocks/cta-section/render.php
@@ -56,8 +56,10 @@ $classes = array(
 	'sgs-cta-section--' . esc_attr( $layout ),
 );
 
+// Build wrapper attributes with aria-label for accessibility.
 $wrapper_attr_args = array(
-	'class' => implode( ' ', $classes ),
+	'class'      => implode( ' ', $classes ),
+	'aria-label' => $headline ? wp_strip_all_tags( $headline ) : __( 'Call to action', 'sgs-blocks' ),
 );
 if ( $wrapper_styles ) {
 	$wrapper_attr_args['style'] = implode( ';', $wrapper_styles );
@@ -134,7 +136,7 @@ if ( ! empty( $buttons ) ) {
 		if ( $btn_icon ) {
 			$icon_html = sprintf(
 				'<span class="sgs-cta-section__btn-icon" aria-hidden="true">%s</span>',
-				esc_html( $btn_icon )
+				sgs_get_lucide_icon( $btn_icon )
 			);
 		}
 
diff --git a/plugins/sgs-blocks/src/blocks/hero/render.php b/plugins/sgs-blocks/src/blocks/hero/render.php
index 50b4815..34e276f 100644
--- a/plugins/sgs-blocks/src/blocks/hero/render.php
+++ b/plugins/sgs-blocks/src/blocks/hero/render.php
@@ -80,8 +80,9 @@ $classes = array(
 
 $wrapper_attributes = get_block_wrapper_attributes(
 	array(
-		'class' => implode( ' ', $classes ),
-		'style' => implode( ';', $styles ),
+		'class'     => implode( ' ', $classes ),
+		'style'     => implode( ';', $styles ),
+		'aria-label' => $headline ? wp_strip_all_tags( $headline ) : __( 'Hero section', 'sgs-blocks' ),
 	)
 );
 
diff --git a/plugins/sgs-blocks/src/blocks/trust-bar/render.php b/plugins/sgs-blocks/src/blocks/trust-bar/render.php
index a74ba17..1ad4eb9 100644
--- a/plugins/sgs-blocks/src/blocks/trust-bar/render.php
+++ b/plugins/sgs-blocks/src/blocks/trust-bar/render.php
@@ -72,7 +72,9 @@ foreach ( $items as $item ) {
 	$item_animated = $animated && ( $item['animated'] ?? true ) && sgs_trust_bar_is_numeric( $value );
 
 	// Build data attributes for the counter animation hook (view.js).
+	// Add aria-live="polite" for animated items so screen readers announce correctly.
 	$data_attrs = '';
+	$aria_live  = '';
 	if ( $item_animated ) {
 		$numeric_value = (int) preg_replace( '/[,\s]/', '', $value );
 		$data_attrs   .= ' data-target="' . esc_attr( (string) $numeric_value ) . '"';
@@ -80,15 +82,17 @@ foreach ( $items as $item ) {
 		if ( $suffix ) {
 			$data_attrs .= ' data-suffix="' . esc_attr( $suffix ) . '"';
 		}
+		$aria_live = ' aria-live="polite"';
 	}
 
 	$items_html .= sprintf(
 		'<div class="sgs-trust-bar__item">' .
-		'<span class="sgs-trust-bar__value"%s%s>%s%s</span>' .
+		'<span class="sgs-trust-bar__value"%s%s%s>%s%s</span>' .
 		'<span class="sgs-trust-bar__label"%s>%s</span>' .
 		'</div>',
 		$value_style_attr,
 		$data_attrs,
+		$aria_live,
 		esc_html( $value ),
 		esc_html( $suffix ),
 		$label_style_attr,
```


---
## stash@{0} (thirteenth, appended later)
stash@{0}: WIP on feature/indus-foods-homepage: e40c4d0 refactor(indus-foods): mega menus — food photography cards (Products), clean text layout (Sectors), no icons

Note: superseded — helpingdoctors.json renamed to helping-doctors.json and committed in f18889a. lucide-icons.php timestamp tick already committed in PR #6.

```diff
diff --git a/plugins/sgs-blocks/includes/lucide-icons.php b/plugins/sgs-blocks/includes/lucide-icons.php
index d7842ac..0d14c27 100644
--- a/plugins/sgs-blocks/includes/lucide-icons.php
+++ b/plugins/sgs-blocks/includes/lucide-icons.php
@@ -2,7 +2,7 @@
 /**
  * Auto-generated Lucide icon map — DO NOT EDIT.
  * Generated from lucide-static (1917 icons).
- * Last generated: 2026-03-02T08:45:36.616Z
+ * Last generated: 2026-03-03T02:53:07.332Z
  *
  * Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.
  *
diff --git a/theme/sgs-theme/styles/helpingdoctors.json b/theme/sgs-theme/styles/helpingdoctors.json
new file mode 100644
index 0000000..cc6041c
--- /dev/null
+++ b/theme/sgs-theme/styles/helpingdoctors.json
@@ -0,0 +1,155 @@
+{
+	"$schema": "https://schemas.wp.org/trunk/theme.json",
+	"version": 3,
+	"title": "HelpingDoctors EHR",
+	"settings": {
+		"color": {
+			"palette": [
+				{ "slug": "primary",        "color": "#2d6e5e", "name": "Medical Green" },
+				{ "slug": "primary-dark",   "color": "#1a4139", "name": "Medical Green Dark" },
+				{ "slug": "secondary",      "color": "#3a8c73", "name": "Secondary Green" },
+				{ "slug": "secondary-dark", "color": "#256050", "name": "Secondary Green Dark" },
+				{ "slug": "accent",         "color": "#e8a020", "name": "Amber Alert" },
+				{ "slug": "accent-light",   "color": "#fef3dc", "name": "Amber Light" },
+				{ "slug": "success",        "color": "#2e7d4f", "name": "Success" },
+				{ "slug": "whatsapp",       "color": "#25D366", "name": "WhatsApp" },
+				{ "slug": "surface",        "color": "#ffffff", "name": "Surface" },
+				{ "slug": "surface-alt",    "color": "#e8f5f2", "name": "Surface Alt" },
+				{ "slug": "text",           "color": "#1a1a1a", "name": "Text" },
+				{ "slug": "text-muted",     "color": "#555555", "name": "Text Muted" },
+				{ "slug": "text-inverse",   "color": "#ffffff", "name": "Text Inverse" },
+				{ "slug": "border-subtle",  "color": "#d4e8e4", "name": "Border Subtle" },
+				{ "slug": "footer-bg",      "color": "#1a4139", "name": "Footer Background" }
+			]
+		},
+		"typography": {
+			"fontFamilies": [
+				{
+					"fontFamily": "Inter, system-ui, -apple-system, sans-serif",
+					"slug": "heading",
+					"name": "Heading",
+					"fontFace": [
+						{
+							"fontFamily": "Inter",
+							"fontWeight": "100 900",
+							"fontStyle": "normal",
+							"fontDisplay": "swap",
+							"src": [ "file:./assets/fonts/inter-variable-latin.woff2" ]
+						}
+					]
+				},
+				{
+					"fontFamily": "Inter, system-ui, -apple-system, sans-serif",
+					"slug": "body",
+					"name": "Body",
+					"fontFace": [
+						{
+							"fontFamily": "Inter",
+							"fontWeight": "100 900",
+							"fontStyle": "normal",
+							"fontDisplay": "swap",
+							"src": [ "file:./assets/fonts/inter-variable-latin.woff2" ]
+						}
+					]
+				}
+			]
+		}
+	},
+	"styles": {
+		"color": {
+			"background": "var:preset|color|surface",
+			"text": "var:preset|color|text"
+		},
+		"typography": {
+			"fontFamily": "var:preset|font-family|body",
+			"lineHeight": "1.65"
+		},
+		"elements": {
+			"heading": {
+				"typography": {
+					"fontFamily": "var:preset|font-family|heading",
+					"fontWeight": "600",
+					"lineHeight": "1.25"
+				},
+				"color": {
+					"text": "var:preset|color|primary-dark"
+				}
+			},
+			"h1": { "typography": { "fontSize": "var:preset|font-size|hero" } },
+			"h2": { "typography": { "fontSize": "var:preset|font-size|xx-large" } },
+			"h3": { "typography": { "fontSize": "var:preset|font-size|x-large" } },
+			"h4": { "typography": { "fontSize": "var:preset|font-size|large" } },
+			"h5": { "typography": { "fontSize": "var:preset|font-size|medium", "fontWeight": "600" } },
+			"h6": {
+				"typography": {
+					"fontSize": "var:preset|font-size|small",
+					"fontWeight": "600",
+					"textTransform": "uppercase",
+					"letterSpacing": "0.06em"
+				}
+			},
+			"link": {
+				"color": { "text": "var:preset|color|primary" },
+				":hover": { "color": { "text": "var:preset|color|primary-dark" } },
+				":focus": {
+					"color": { "text": "var:preset|color|primary-dark" },
+					"typography": { "textDecoration": "underline" }
+				}
+			},
+			"button": {
+				"color": {
+					"background": "var:preset|color|primary",
+					"text": "var:preset|color|surface"
+				},
+				"typography": {
+					"fontWeight": "600",
+					"fontSize": "var:preset|font-size|small",
+					"textDecoration": "none"
+				},
+				"border": { "radius": "8px" },
+				"spacing": {
+					"padding": {
+						"top": "12px",
+						"bottom": "12px",
+						"left": "24px",
+						"right": "24px"
+					}
+				},
+				":hover": {
+					"color": {
+						"background": "var:preset|color|primary-dark",
+						"text": "var:preset|color|surface"
+					}
+				},
+				":focus": {
+					"outline": {
+						"color": "var:preset|color|primary",
+						"width": "2px",
+						"offset": "3px",
+						"style": "solid"
+					}
+				}
+			}
+		},
+		"blocks": {
+			"core/site-title": {
+				"typography": {
+					"fontFamily": "var:preset|font-family|heading",
+					"fontSize": "var:preset|font-size|large"
+				}
+			},
+			"core/navigation": {
+				"typography": {
+					"fontSize": "var:preset|font-size|small",
+					"fontWeight": "500"
+				}
+			},
+			"core/quote": {
+				"border": {
+					"color": "var:preset|color|primary",
+					"width": "3px"
+				}
+			}
+		}
+	}
+}
```
