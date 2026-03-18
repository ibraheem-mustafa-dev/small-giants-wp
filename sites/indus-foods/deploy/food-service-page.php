<?php
/**
 * Food Service page content — Indus Foods
 * Deploys to palestine-lives.org page ID 65
 * Run via: wp eval-file ~/food-service-page.php
 */

$page_id = 65;

$content = <<<'BLOCKS'
<!-- wp:sgs/hero {"variant":"split","headline":"Your kitchen's secret to authentic flavour, delivered on time, every time.","subHeadline":"From Balti Triangle restaurants to hotel kitchens across the UK — 5,000+ food businesses trust Indus Foods for recipe-ready ingredients in catering sizes, with next-day delivery and a dedicated account manager who actually picks up the phone.","alignment":"left","splitImage":{"id":0,"url":"/wp-content/uploads/indus-foods/2025/11/Seekh-Kebab-1-1024x640.png","alt":"Chef-quality Seekh Kebabs — Indus Foods catering supply"},"headlineColour":"#FFFFFF","subHeadlineColour":"rgba(255,255,255,0.85)","ctaPrimaryText":"Apply For A Trade Account","ctaPrimaryUrl":"/apply-for-trade-account/","ctaSecondaryText":"Download Full Catalogue","ctaSecondaryUrl":"/catalogue/","transitionDuration":"300","transitionEasing":"ease-in-out","style":{"color":{"gradient":"linear-gradient(135deg, #075E80 0%, #0A7EA8 60%, #1590B8 100%)"}}} /-->

<!-- wp:sgs/trust-bar {"align":"full","items":[{"value":"5,000","suffix":"+","label":"Businesses Served","animated":true},{"value":"3,000","suffix":"+","label":"Products Available","animated":true},{"value":"60","suffix":"+","label":"Years in Business","animated":true},{"value":"Next-Day","suffix":"","label":"Midlands Delivery","animated":false}],"animated":true,"valueColour":"#0A7EA8","labelColour":"#5A6070","transitionDuration":"300","transitionEasing":"ease-in-out","style":{"color":{"background":"#F8F7F4"},"spacing":{"padding":{"top":"var:preset|spacing|40","bottom":"var:preset|spacing|40"}}}} /-->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}}},"backgroundColor":"surface","layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)">

<!-- wp:paragraph {"style":{"typography":{"fontWeight":"700","letterSpacing":"0.1em","textTransform":"uppercase","fontSize":"0.8rem"},"color":{"text":"#D8CA50"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
<p class="has-text-color" style="color:#D8CA50;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-size:0.8rem;margin-bottom:var(--wp--preset--spacing--20)">Why Indus Foods</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}},"textColor":"text","fontSize":"x-large"} -->
<h2 class="wp-block-heading has-text-color has-x-large-font-size" style="margin-bottom:var(--wp--preset--spacing--20)">Built around what your kitchen actually needs.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|50"}}},"textColor":"text-muted"} -->
<p class="has-text-color has-text-muted-color" style="margin-bottom:var(--wp--preset--spacing--50)">We don't just deliver ingredients — we help food businesses run smoothly with consistent quality, competitive pricing, and a team that picks up the phone.</p>
<!-- /wp:paragraph -->

<!-- wp:columns {"isStackedOnMobile":true,"style":{"spacing":{"blockGap":{"top":"var:preset|spacing|40","left":"var:preset|spacing|40"}}}} -->
<div class="wp-block-columns" style="gap:var(--wp--preset--spacing--40)">

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/info-box {"icon":"check-circle","heading":"Consistent Quality for Menu Reliability","description":"Your customers expect the same taste every visit. Our sourcing and quality controls ensure your key ingredients arrive at the same standard, batch after batch — so your signature dishes stay signature.","cardStyle":"elevated","iconColour":"primary","iconBackgroundColour":"accent-light","hoverEffect":"lift","transitionDuration":"300","transitionEasing":"ease-in-out"} /-->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/info-box {"icon":"package","heading":"Catering-Size Packaging","description":"Spices in 5kg and 10kg bags. Rice in 20kg sacks. Oils in 20-litre drums. Every format designed for commercial kitchen use — no more decanting from retail packs or running out mid-service.","cardStyle":"elevated","iconColour":"primary","iconBackgroundColour":"accent-light","hoverEffect":"lift","transitionDuration":"300","transitionEasing":"ease-in-out"} /-->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/info-box {"icon":"user-check","heading":"Dedicated Account Manager","description":"A named person who knows your business, your regular order, and your delivery preferences. Not a call centre. Not a different person each time. Someone who understands your operation.","cardStyle":"elevated","iconColour":"primary","iconBackgroundColour":"accent-light","hoverEffect":"lift","transitionDuration":"300","transitionEasing":"ease-in-out"} /-->
</div>
<!-- /wp:column -->

</div>
<!-- /wp:columns -->

<!-- wp:columns {"isStackedOnMobile":true,"style":{"spacing":{"blockGap":{"top":"var:preset|spacing|40","left":"var:preset|spacing|40"},"margin":{"top":"var:preset|spacing|40"}}}} -->
<div class="wp-block-columns" style="gap:var(--wp--preset--spacing--40);margin-top:var(--wp--preset--spacing--40)">

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/info-box {"icon":"truck","heading":"Flexible Delivery Schedules","description":"Choose the delivery days that fit your prep cycle. Next-day delivery across the Midlands (order by 2pm), nationwide within 48 hours. We work around your kitchen, not the other way around.","cardStyle":"elevated","iconColour":"primary","iconBackgroundColour":"accent-light","hoverEffect":"lift","transitionDuration":"300","transitionEasing":"ease-in-out"} /-->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/info-box {"icon":"pound-sterling","heading":"Trade Pricing & Credit Facilities","description":"Competitive wholesale rates from day one — typically 15–30% below retail. For established customers, credit terms of up to 30 days give you cashflow flexibility without squeezing your margins.","cardStyle":"elevated","iconColour":"primary","iconBackgroundColour":"accent-light","hoverEffect":"lift","transitionDuration":"300","transitionEasing":"ease-in-out"} /-->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:sgs/info-box {"icon":"clipboard-list","heading":"Allergen & Nutritional Data","description":"Full allergen information and nutritional data for every product — helping you meet Natasha's Law requirements and serve your customers with confidence. Erudus integration coming soon.","cardStyle":"elevated","iconColour":"primary","iconBackgroundColour":"accent-light","hoverEffect":"lift","transitionDuration":"300","transitionEasing":"ease-in-out"} /-->
</div>
<!-- /wp:column -->

</div>
<!-- /wp:columns -->

</div>
<!-- /wp:group -->

<!-- wp:sgs/heritage-strip {"align":"full","layout":"image-text-image","headline":"Three generations. One family. Since 1962.","body":"When Amir Chaudhary's grandparents opened one of the UK's first halal butchers on Ladypool Road in Birmingham's Balti Triangle, they couldn't have known it would become a £15M wholesale operation serving 5,000 customers across the UK, Ireland, and Europe. But the values haven't changed: know your customer, never compromise on quality, and always deliver on your word.","headlineColour":"#FFFFFF","bodyColour":"rgba(255,255,255,0.75)","backgroundColour":"#075E80","imageLeft":{"url":"/wp-content/uploads/indus-foods/2025/11/Indus-Foods-Banner-1024x683.jpg","alt":"Indus Foods warehouse — Sparkbrook, Birmingham"},"imageRight":{"url":"/wp-content/uploads/indus-foods/2025/11/Indus-AI-Placeholder-1024x510.webp","alt":"Amir Chaudhary, Director — Indus Foods"}} /-->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}},"color":{"background":"#F8F7F4"}},"layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group alignfull has-background" style="background-color:#F8F7F4;padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)">

<!-- wp:group {"layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between","verticalAlignment":"flex-end"},"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|50"}}}} -->
<div class="wp-block-group" style="margin-bottom:var(--wp--preset--spacing--50)">

<!-- wp:group {"layout":{"type":"flow"}} -->
<div class="wp-block-group">
<!-- wp:paragraph {"style":{"typography":{"fontWeight":"700","letterSpacing":"0.1em","textTransform":"uppercase","fontSize":"0.8rem"},"color":{"text":"#D8CA50"},"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} -->
<p class="has-text-color" style="color:#D8CA50;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-size:0.8rem;margin-bottom:var(--wp--preset--spacing--10)">Product Range</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}},"textColor":"text","fontSize":"x-large"} -->
<h2 class="wp-block-heading has-text-color has-x-large-font-size" style="margin-bottom:var(--wp--preset--spacing--20)">Everything your kitchen needs, under one account.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"0"}}},"textColor":"text-muted"} -->
<p class="has-text-color has-text-muted-color" style="margin-bottom:0">From whole spices to frozen proteins, cleaning supplies to takeaway packaging — order everything from one supplier instead of juggling five.</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

<!-- wp:buttons {"style":{"spacing":{"margin":{"top":"var:preset|spacing|30"}}}} -->
<div class="wp-block-buttons" style="margin-top:var(--wp--preset--spacing--30)">
<!-- wp:button {"url":"/catalogue/","style":{"color":{"background":"#0A7EA8","text":"#FFFFFF"},"border":{"radius":"10px"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-text-color has-background" href="/catalogue/" style="background-color:#0A7EA8;color:#FFFFFF;border-radius:10px">Download Full Catalogue</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->

</div>
<!-- /wp:group -->

<!-- wp:columns {"isStackedOnMobile":true,"style":{"spacing":{"blockGap":{"top":"var:preset|spacing|30","left":"var:preset|spacing|30"}}}} -->
<div class="wp-block-columns" style="gap:var(--wp--preset--spacing--30)">

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"border":{"radius":"14px"},"spacing":{"padding":{"top":"0","right":"0","bottom":"0","left":"0"}}},"backgroundColor":"surface","layout":{"type":"flow"}} -->
<div class="wp-block-group has-surface-background-color has-background" style="border-radius:14px;overflow:hidden">
<!-- wp:image {"url":"/wp-content/uploads/indus-foods/decorative-foods/turmeric-pile.webp","alt":"Turmeric and spices — Indus Foods wholesale spices","style":{"border":{"radius":"14px 14px 0 0"}},"aspectRatio":"16/10","scale":"cover"} -->
<figure class="wp-block-image" style="border-radius:14px 14px 0 0;aspect-ratio:16/10;object-fit:cover"><img src="/wp-content/uploads/indus-foods/decorative-foods/turmeric-pile.webp" alt="Turmeric and spices — Indus Foods wholesale spices" style="border-radius:14px 14px 0 0"/></figure>
<!-- /wp:image -->
<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","right":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|30"}}},"layout":{"type":"flow"}} -->
<div class="wp-block-group" style="padding:var(--wp--preset--spacing--30)">
<!-- wp:heading {"level":3,"textColor":"text","fontSize":"medium"} -->
<h3 class="wp-block-heading has-text-color has-medium-font-size">Spices &amp; Seasonings</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"text-muted","style":{"typography":{"fontSize":"0.85rem"}}} -->
<p class="has-text-color has-text-muted-color" style="font-size:0.85rem">200+ lines · Whole &amp; ground · 500g to 10kg</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"border":{"radius":"14px"},"spacing":{"padding":{"top":"0","right":"0","bottom":"0","left":"0"}}},"backgroundColor":"surface","layout":{"type":"flow"}} -->
<div class="wp-block-group has-surface-background-color has-background" style="border-radius:14px;overflow:hidden">
<!-- wp:image {"url":"/wp-content/uploads/indus-foods/decorative-foods/basmati-rice.webp","alt":"Basmati rice — Falak Rice exclusive distributor","style":{"border":{"radius":"14px 14px 0 0"}},"aspectRatio":"16/10","scale":"cover"} -->
<figure class="wp-block-image" style="border-radius:14px 14px 0 0;aspect-ratio:16/10;object-fit:cover"><img src="/wp-content/uploads/indus-foods/decorative-foods/basmati-rice.webp" alt="Basmati rice — Falak Rice exclusive distributor" style="border-radius:14px 14px 0 0"/></figure>
<!-- /wp:image -->
<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","right":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|30"}}},"layout":{"type":"flow"}} -->
<div class="wp-block-group" style="padding:var(--wp--preset--spacing--30)">
<!-- wp:heading {"level":3,"textColor":"text","fontSize":"medium"} -->
<h3 class="wp-block-heading has-text-color has-medium-font-size">Rice &amp; Grains</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"text-muted","style":{"typography":{"fontSize":"0.85rem"}}} -->
<p class="has-text-color has-text-muted-color" style="font-size:0.85rem">Inc. exclusive Falak Rice · 5kg to 25kg sacks</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"border":{"radius":"14px"},"spacing":{"padding":{"top":"0","right":"0","bottom":"0","left":"0"}}},"backgroundColor":"surface","layout":{"type":"flow"}} -->
<div class="wp-block-group has-surface-background-color has-background" style="border-radius:14px;overflow:hidden">
<!-- wp:image {"url":"/wp-content/uploads/indus-foods/decorative-foods/lentils-pile.webp","alt":"Lentils and pulses — wholesale Indus Foods","style":{"border":{"radius":"14px 14px 0 0"}},"aspectRatio":"16/10","scale":"cover"} -->
<figure class="wp-block-image" style="border-radius:14px 14px 0 0;aspect-ratio:16/10;object-fit:cover"><img src="/wp-content/uploads/indus-foods/decorative-foods/lentils-pile.webp" alt="Lentils and pulses — wholesale Indus Foods" style="border-radius:14px 14px 0 0"/></figure>
<!-- /wp:image -->
<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","right":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|30"}}},"layout":{"type":"flow"}} -->
<div class="wp-block-group" style="padding:var(--wp--preset--spacing--30)">
<!-- wp:heading {"level":3,"textColor":"text","fontSize":"medium"} -->
<h3 class="wp-block-heading has-text-color has-medium-font-size">Pulses &amp; Lentils</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"text-muted","style":{"typography":{"fontSize":"0.85rem"}}} -->
<p class="has-text-color has-text-muted-color" style="font-size:0.85rem">Chana, masoor, urad &amp; more · 2kg to 20kg</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"border":{"radius":"14px"},"spacing":{"padding":{"top":"0","right":"0","bottom":"0","left":"0"}}},"backgroundColor":"surface","layout":{"type":"flow"}} -->
<div class="wp-block-group has-surface-background-color has-background" style="border-radius:14px;overflow:hidden">
<!-- wp:image {"url":"/wp-content/uploads/indus-foods/2025/11/Seekh-Kebab-1-1024x640.png","alt":"Frozen foods — Seekh Kebabs and Shaan range","style":{"border":{"radius":"14px 14px 0 0"}},"aspectRatio":"16/10","scale":"cover"} -->
<figure class="wp-block-image" style="border-radius:14px 14px 0 0;aspect-ratio:16/10;object-fit:cover"><img src="/wp-content/uploads/indus-foods/2025/11/Seekh-Kebab-1-1024x640.png" alt="Frozen foods — Seekh Kebabs and Shaan range" style="border-radius:14px 14px 0 0"/></figure>
<!-- /wp:image -->
<!-- wp:group {"style":{"spacing":{"padding":{"top":"var:preset|spacing|30","right":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|30"}}},"layout":{"type":"flow"}} -->
<div class="wp-block-group" style="padding:var(--wp--preset--spacing--30)">
<!-- wp:heading {"level":3,"textColor":"text","fontSize":"medium"} -->
<h3 class="wp-block-heading has-text-color has-medium-font-size">Frozen Foods</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"textColor":"text-muted","style":{"typography":{"fontSize":"0.85rem"}}} -->
<p class="has-text-color has-text-muted-color" style="font-size:0.85rem">Shaan range · Temperature-controlled delivery</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->

</div>
<!-- /wp:columns -->

<!-- wp:group {"style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|40","right":"var:preset|spacing|40","bottom":"var:preset|spacing|40","left":"var:preset|spacing|40"},"margin":{"top":"var:preset|spacing|40"}},"color":{"background":"#E8F5EE"}},"layout":{"type":"flex","flexWrap":"nowrap","justifyContent":"center","verticalAlignment":"center"}} -->
<div class="wp-block-group has-background" style="background-color:#E8F5EE;border-radius:12px;padding:var(--wp--preset--spacing--40);margin-top:var(--wp--preset--spacing--40)">
<!-- wp:paragraph {"style":{"typography":{"fontSize":"1.5rem"},"spacing":{"margin":{"right":"var:preset|spacing|30","bottom":"0"}}}} -->
<p style="font-size:1.5rem;margin-right:var(--wp--preset--spacing--30);margin-bottom:0">&#128666;</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"style":{"typography":{"fontSize":"0.9rem"},"spacing":{"margin":{"bottom":"0"}}},"textColor":"text"} -->
<p class="has-text-color" style="font-size:0.9rem;margin-bottom:0">Minimum order just <strong>&#163;75</strong> — lower than most wholesalers. Mix and match across any categories. Free delivery on orders over <strong>&#163;250</strong>.</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}}},"backgroundColor":"surface","layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)">

<!-- wp:paragraph {"style":{"typography":{"fontWeight":"700","letterSpacing":"0.1em","textTransform":"uppercase","fontSize":"0.8rem"},"color":{"text":"#D8CA50"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
<p class="has-text-color" style="color:#D8CA50;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-size:0.8rem;margin-bottom:var(--wp--preset--spacing--20)">How It Works</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}},"textColor":"text","fontSize":"x-large"} -->
<h2 class="wp-block-heading has-text-color has-x-large-font-size" style="margin-bottom:var(--wp--preset--spacing--20)">Open your trade account in four simple steps.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|50"}}},"textColor":"text-muted"} -->
<p class="has-text-color has-text-muted-color" style="margin-bottom:var(--wp--preset--spacing--50)">No membership fees. No complicated paperwork. Just a quick application and you're ordering within days.</p>
<!-- /wp:paragraph -->

<!-- wp:sgs/process-steps {"align":"wide","numberStyle":"circle","numberBackground":"#D8CA50","numberColour":"#1E1E1E","titleColour":"#1E1E1E","descriptionColour":"#5A6070","steps":[{"number":"1","title":"Apply Online","description":"Fill in our simple trade application — takes about 3 minutes. Or message us on WhatsApp and we'll do it together."},{"number":"2","title":"Get Approved","description":"Our team reviews your application within 1–2 business days. No credit checks for proforma accounts."},{"number":"3","title":"Browse \u0026 Order","description":"Access our full catalogue with trade pricing and place your first order online, by phone, or via WhatsApp."},{"number":"4","title":"We Deliver","description":"Reliable delivery to your door on the schedule that suits your prep cycle. Temperature-controlled where needed."}]} /-->

</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}},"color":{"background":"#075E80"}},"layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group alignfull has-background" style="background-color:#075E80;padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)">

<!-- wp:columns {"isStackedOnMobile":true,"style":{"spacing":{"blockGap":{"top":"var:preset|spacing|60","left":"var:preset|spacing|60"}}}} -->
<div class="wp-block-columns" style="gap:var(--wp--preset--spacing--60)">

<!-- wp:column {"width":"55%"} -->
<div class="wp-block-column" style="flex-basis:55%">

<!-- wp:paragraph {"style":{"typography":{"fontWeight":"700","letterSpacing":"0.1em","textTransform":"uppercase","fontSize":"0.8rem"},"color":{"text":"#D8CA50"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
<p class="has-text-color" style="color:#D8CA50;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-size:0.8rem;margin-bottom:var(--wp--preset--spacing--20)">Delivery &amp; Coverage</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}},"textColor":"text-inverse","fontSize":"x-large"} -->
<h2 class="wp-block-heading has-text-color has-text-inverse-color has-x-large-font-size" style="margin-bottom:var(--wp--preset--spacing--20)">From our warehouse to your kitchen — fast.</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|40"}},"color":{"text":"rgba(255,255,255,0.75)"}}} -->
<p class="has-text-color" style="color:rgba(255,255,255,0.75);margin-bottom:var(--wp--preset--spacing--40)">Based in Birmingham's Sparkbrook, we deliver across the UK, Ireland, and Europe. Our fleet has been on the road since 1972.</p>
<!-- /wp:paragraph -->

<!-- wp:columns {"isStackedOnMobile":true,"style":{"spacing":{"blockGap":{"top":"var:preset|spacing|30","left":"var:preset|spacing|30"}}}} -->
<div class="wp-block-columns" style="gap:var(--wp--preset--spacing--30)">

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"border":{"radius":"12px","color":"rgba(255,255,255,0.12)","width":"1px","style":"solid"},"spacing":{"padding":{"top":"var:preset|spacing|30","right":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|30"}},"color":{"background":"rgba(255,255,255,0.06)"}},"layout":{"type":"flow"}} -->
<div class="wp-block-group has-background" style="background-color:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:var(--wp--preset--spacing--30)">
<!-- wp:heading {"level":3,"style":{"color":{"text":"#D8CA50"},"typography":{"fontSize":"0.9rem","fontWeight":"600"},"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} -->
<h3 class="wp-block-heading has-text-color" style="color:#D8CA50;font-size:0.9rem;font-weight:600;margin-bottom:var(--wp--preset--spacing--10)">Next-Day Midlands</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"style":{"color":{"text":"rgba(255,255,255,0.65)"},"typography":{"fontSize":"0.82rem"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
<p class="has-text-color" style="color:rgba(255,255,255,0.65);font-size:0.82rem;margin-bottom:var(--wp--preset--spacing--20)">Same-region delivery across the West Midlands and surrounding areas.</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"style":{"color":{"background":"rgba(216,202,80,0.15)","text":"#D8CA50"},"typography":{"fontSize":"0.72rem","fontWeight":"700"},"spacing":{"padding":{"top":"4px","bottom":"4px","left":"10px","right":"10px"},"margin":{"bottom":"0"}},"border":{"radius":"6px"}}} -->
<p class="has-text-color has-background" style="background-color:rgba(216,202,80,0.15);color:#D8CA50;font-size:0.72rem;font-weight:700;padding:4px 10px;margin-bottom:0;border-radius:6px;display:inline-block">Order by 2:00pm</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"border":{"radius":"12px","color":"rgba(255,255,255,0.12)","width":"1px","style":"solid"},"spacing":{"padding":{"top":"var:preset|spacing|30","right":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|30"}},"color":{"background":"rgba(255,255,255,0.06)"}},"layout":{"type":"flow"}} -->
<div class="wp-block-group has-background" style="background-color:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:var(--wp--preset--spacing--30)">
<!-- wp:heading {"level":3,"style":{"color":{"text":"#D8CA50"},"typography":{"fontSize":"0.9rem","fontWeight":"600"},"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} -->
<h3 class="wp-block-heading has-text-color" style="color:#D8CA50;font-size:0.9rem;font-weight:600;margin-bottom:var(--wp--preset--spacing--10)">48hr Nationwide</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"style":{"color":{"text":"rgba(255,255,255,0.65)"},"typography":{"fontSize":"0.82rem"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
<p class="has-text-color" style="color:rgba(255,255,255,0.65);font-size:0.82rem;margin-bottom:var(--wp--preset--spacing--20)">Full UK coverage within 48 hours via our fleet and trusted logistics partners.</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"style":{"color":{"background":"rgba(216,202,80,0.15)","text":"#D8CA50"},"typography":{"fontSize":"0.72rem","fontWeight":"700"},"spacing":{"padding":{"top":"4px","bottom":"4px","left":"10px","right":"10px"},"margin":{"bottom":"0"}},"border":{"radius":"6px"}}} -->
<p class="has-text-color has-background" style="background-color:rgba(216,202,80,0.15);color:#D8CA50;font-size:0.72rem;font-weight:700;padding:4px 10px;margin-bottom:0;border-radius:6px;display:inline-block">Order by 12:00pm</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"border":{"radius":"12px","color":"rgba(255,255,255,0.12)","width":"1px","style":"solid"},"spacing":{"padding":{"top":"var:preset|spacing|30","right":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|30"}},"color":{"background":"rgba(255,255,255,0.06)"}},"layout":{"type":"flow"}} -->
<div class="wp-block-group has-background" style="background-color:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:var(--wp--preset--spacing--30)">
<!-- wp:heading {"level":3,"style":{"color":{"text":"#D8CA50"},"typography":{"fontSize":"0.9rem","fontWeight":"600"},"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} -->
<h3 class="wp-block-heading has-text-color" style="color:#D8CA50;font-size:0.9rem;font-weight:600;margin-bottom:var(--wp--preset--spacing--10)">Temperature Controlled</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"style":{"color":{"text":"rgba(255,255,255,0.65)"},"typography":{"fontSize":"0.82rem"},"spacing":{"margin":{"bottom":"0"}}}} -->
<p class="has-text-color" style="color:rgba(255,255,255,0.65);font-size:0.82rem;margin-bottom:0">Chilled and frozen lines delivered with full cold-chain integrity from warehouse to kitchen.</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"border":{"radius":"12px","color":"rgba(255,255,255,0.12)","width":"1px","style":"solid"},"spacing":{"padding":{"top":"var:preset|spacing|30","right":"var:preset|spacing|30","bottom":"var:preset|spacing|30","left":"var:preset|spacing|30"}},"color":{"background":"rgba(255,255,255,0.06)"}},"layout":{"type":"flow"}} -->
<div class="wp-block-group has-background" style="background-color:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:var(--wp--preset--spacing--30)">
<!-- wp:heading {"level":3,"style":{"color":{"text":"#D8CA50"},"typography":{"fontSize":"0.9rem","fontWeight":"600"},"spacing":{"margin":{"bottom":"var:preset|spacing|10"}}}} -->
<h3 class="wp-block-heading has-text-color" style="color:#D8CA50;font-size:0.9rem;font-weight:600;margin-bottom:var(--wp--preset--spacing--10)">European Export</h3>
<!-- /wp:heading -->
<!-- wp:paragraph {"style":{"color":{"text":"rgba(255,255,255,0.65)"},"typography":{"fontSize":"0.82rem"},"spacing":{"margin":{"bottom":"0"}}}} -->
<p class="has-text-color" style="color:rgba(255,255,255,0.65);font-size:0.82rem;margin-bottom:0">Active export to Ireland, Norway, Greece, Italy, and growing. Established since the 1970s.</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->

</div>
<!-- /wp:columns -->

<!-- wp:group {"style":{"border":{"radius":"12px"},"spacing":{"padding":{"top":"var:preset|spacing|30","right":"var:preset|spacing|40","bottom":"var:preset|spacing|30","left":"var:preset|spacing|40"},"margin":{"top":"var:preset|spacing|30"}},"color":{"background":"rgba(46,125,79,0.15)"}},"layout":{"type":"flex","flexWrap":"nowrap","verticalAlignment":"center"}} -->
<div class="wp-block-group has-background" style="background-color:rgba(46,125,79,0.15);border:1px solid rgba(46,125,79,0.25);border-radius:12px;padding:var(--wp--preset--spacing--30) var(--wp--preset--spacing--40);margin-top:var(--wp--preset--spacing--30)">
<!-- wp:paragraph {"style":{"typography":{"fontSize":"1.3rem"},"spacing":{"margin":{"right":"var:preset|spacing|30","bottom":"0"}}}} -->
<p style="font-size:1.3rem;margin-right:var(--wp--preset--spacing--30);margin-bottom:0">&#163;</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph {"style":{"color":{"text":"rgba(255,255,255,0.85)"},"typography":{"fontSize":"0.85rem"},"spacing":{"margin":{"bottom":"0"}}}} -->
<p class="has-text-color" style="color:rgba(255,255,255,0.85);font-size:0.85rem;margin-bottom:0">Minimum order <strong>&#163;75</strong> &middot; Free delivery on orders over <strong>&#163;250</strong> &middot; Choose your preferred delivery days at sign-up</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

</div>
<!-- /wp:column -->

<!-- wp:column {"width":"45%"} -->
<div class="wp-block-column" style="flex-basis:45%">
<!-- wp:image {"url":"/wp-content/uploads/indus-foods/2025/11/Indus-Foods-Banner-1024x683.jpg","alt":"Indus Foods warehouse and delivery operations — Birmingham","style":{"border":{"radius":"20px"}},"aspectRatio":"4/3","scale":"cover"} -->
<figure class="wp-block-image" style="border-radius:20px;aspect-ratio:4/3;object-fit:cover"><img src="/wp-content/uploads/indus-foods/2025/11/Indus-Foods-Banner-1024x683.jpg" alt="Indus Foods warehouse and delivery operations — Birmingham" style="border-radius:20px"/></figure>
<!-- /wp:image -->
</div>
<!-- /wp:column -->

</div>
<!-- /wp:columns -->

</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|60","bottom":"var:preset|spacing|60"}}},"backgroundColor":"surface","layout":{"type":"constrained","contentSize":"1200px"}} -->
<div class="wp-block-group alignfull has-surface-background-color has-background" style="padding-top:var(--wp--preset--spacing--60);padding-bottom:var(--wp--preset--spacing--60)">

<!-- wp:paragraph {"align":"center","style":{"typography":{"fontWeight":"700","letterSpacing":"0.1em","textTransform":"uppercase","fontSize":"0.8rem"},"color":{"text":"#D8CA50"},"spacing":{"margin":{"bottom":"var:preset|spacing|20"}}}} -->
<p class="has-text-align-center has-text-color" style="color:#D8CA50;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-size:0.8rem;margin-bottom:var(--wp--preset--spacing--20)">What Our Customers Say</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"textAlign":"center","level":2,"style":{"spacing":{"margin":{"bottom":"var:preset|spacing|50"}}},"textColor":"text","fontSize":"x-large"} -->
<h2 class="wp-block-heading has-text-align-center has-text-color has-x-large-font-size" style="margin-bottom:var(--wp--preset--spacing--50)">Trusted by restaurants, caterers, and hotels across the UK.</h2>
<!-- /wp:heading -->

<!-- wp:sgs/testimonial-slider {"align":"wide","cardStyle":"card","slidesVisible":3,"showArrows":true,"showDots":true,"autoplay":false,"quoteColour":"#1E1E1E","nameColour":"#0A7EA8","roleColour":"#5A6070","ratingColour":"accent","transitionDuration":"300","transitionEasing":"ease-in-out","testimonials":[{"quote":"We've been ordering from Indus Foods for over eight years. The quality is always spot-on, our account manager knows exactly what we need before we ask, and the delivery has never let us down during a busy Friday service.","name":"Priya Sharma","role":"Owner — Bombay Kitchen, Leicester","rating":5},{"quote":"When we're catering for 500 guests, I can't afford a supplier who's inconsistent. Indus Foods' traceability documentation and allergen data make compliance straightforward, and their bulk pricing keeps our margins healthy.","name":"Fatima Khan","role":"Operations Director — Zara's Kitchen Catering, Birmingham","rating":5},{"quote":"I recommended Indus Foods to our procurement team and the onboarding was seamless. Their range covers everything we need for our South Asian menu, and the flexible delivery days fit perfectly around our prep schedule.","name":"Danny Chen","role":"Head Chef — The Grand Hotel, Solihull","rating":5}]} /-->

</div>
<!-- /wp:group -->

<!-- wp:sgs/cta-section {"align":"full","layout":"centred","headline":"Ready to partner with a wholesaler that treats you like family?","body":"Join 5,000+ food businesses across the UK who trust Indus Foods for authentic ingredients, competitive pricing, and a team that genuinely cares. Minimum order just £75. No membership fees.","headlineColour":"#FFFFFF","bodyColour":"rgba(255,255,255,0.75)","buttons":[{"text":"Apply For A Trade Account","url":"/apply-for-trade-account/","style":"primary"},{"text":"Request Our Catalogue","url":"/catalogue/","style":"secondary"}],"transitionDuration":"300","transitionEasing":"ease-in-out","style":{"color":{"gradient":"linear-gradient(135deg, #075E80 0%, #0A7EA8 100%)"}}} /-->
BLOCKS;

$result = wp_update_post( array(
    'ID'           => $page_id,
    'post_content' => $content,
    'post_status'  => 'publish',
) );

if ( is_wp_error( $result ) ) {
    echo "ERROR: " . $result->get_error_message() . "\n";
} else {
    echo "Food Service page updated. ID: {$result}\n";
}
