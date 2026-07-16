<?php
/**
 * Title: Label + Heading + Subheading cluster
 * Slug: sgs/label-heading-subheading-cluster
 * Categories: sgs
 * Description: Eyebrow label, primary h2 heading, and subheading paragraph stacked centrally. Replaces the old composite sgs/heading three-element cluster.
 *
 * @package SGS\Theme
 */

?>

<!-- wp:group {"layout":{"type":"flex","flexWrap":"nowrap","orientation":"vertical","justifyContent":"center"}} -->
<div class="wp-block-group">

	<!-- wp:sgs/label {"text":"Our speciality","textColour":"primary"} /-->

	<!-- wp:sgs/heading {"headingRole":"heading","content":"A section heading that converts","level":"h2","fontSize":36} /-->

	<!-- wp:sgs/heading {"headingRole":"subheading","content":"Optional supporting copy that gives context to the section above.","subTag":"p","fontSize":16} /-->

</div>
<!-- /wp:group -->
