[WordPress.org](https://wordpress.org/)

- [News](https://wordpress.org/news/)
- [Showcase](https://wordpress.org/showcase/)
- [Hosting](https://wordpress.org/hosting/)
- [Extend](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#)
  - [Themes](https://wordpress.org/themes/)
  - [Plugins](https://wordpress.org/plugins/)
  - [Patterns](https://wordpress.org/patterns/)
  - [Blocks](https://wordpress.org/blocks/)
  - [Openverse ↗︎](https://openverse.org/)
- [Learn](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#)
  - [Learn WordPress](https://learn.wordpress.org/)
  - [Documentation](https://wordpress.org/documentation/)
  - [Forums](https://wordpress.org/support/forums/)
  - [Developers](https://developer.wordpress.org/)
  - [WordPress.tv ↗︎](https://wordpress.tv/)
- [Community](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#)
  - [Make WordPress](https://make.wordpress.org/)
  - [Education](https://wordpress.org/education/)
  - [Photo Directory](https://wordpress.org/photos/)
  - [Five for the Future](https://wordpress.org/five-for-the-future/)
  - [Events](https://events.wordpress.org/)
  - [Job Board ↗︎](https://jobs.wordpress.net/)
- [About](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#)
  - [About WordPress](https://wordpress.org/about/)
  - [Enterprise](https://wordpress.org/enterprise/)
  - [Gutenberg ↗︎](https://wordpress.org/gutenberg/)
  - [Swag Store ↗︎](https://mercantile.wordpress.org/)
- [Get WordPress](https://wordpress.org/download/)

Search in WordPress.org

[Get WordPress](https://wordpress.org/download/)

[WordPress.org](https://wordpress.org/)

[WordPress Developer Blog](https://developer.wordpress.org/news)

An introduction to block-based mega menus

- [Snippets](https://developer.wordpress.org/news/snippets/)
- [Categories](http://categories/)
  - [Blocks](https://developer.wordpress.org/news/category/blocks/)
  - [Concepts](https://developer.wordpress.org/news/category/concepts/)
  - [Common APIs](https://developer.wordpress.org/news/category/common-apis/)
  - [Design](https://developer.wordpress.org/news/category/design/)
  - [Playground](https://developer.wordpress.org/news/category/playground/)
  - [Plugins](https://developer.wordpress.org/news/category/plugins/)
  - [Themes](https://developer.wordpress.org/news/category/themes/)
- [About](https://developer.wordpress.org/news/about/)
  - [About this site](https://developer.wordpress.org/news/about/)
  - [Updates](https://developer.wordpress.org/news/category/updates/)
  - [How to contribute](https://developer.wordpress.org/news/how-to-contribute/)
  - [Tips and guidelines](https://developer.wordpress.org/news/tips-and-guidelines-for-writers/)
- [Subscribe](https://developer.wordpress.org/news/subscribe/)
- [Developer Resources](https://developer.wordpress.org/)

- [Snippets](https://developer.wordpress.org/news/snippets/)
- [Categories](http://categories/)
  - [Blocks](https://developer.wordpress.org/news/category/blocks/)
  - [Concepts](https://developer.wordpress.org/news/category/concepts/)
  - [Common APIs](https://developer.wordpress.org/news/category/common-apis/)
  - [Design](https://developer.wordpress.org/news/category/design/)
  - [Playground](https://developer.wordpress.org/news/category/playground/)
  - [Plugins](https://developer.wordpress.org/news/category/plugins/)
  - [Themes](https://developer.wordpress.org/news/category/themes/)
- [About](https://developer.wordpress.org/news/about/)
  - [About this site](https://developer.wordpress.org/news/about/)
  - [Updates](https://developer.wordpress.org/news/category/updates/)
  - [How to contribute](https://developer.wordpress.org/news/how-to-contribute/)
  - [Tips and guidelines](https://developer.wordpress.org/news/tips-and-guidelines-for-writers/)
- [Subscribe](https://developer.wordpress.org/news/subscribe/)
- [Developer Resources](https://developer.wordpress.org/)

# An introduction to block-based mega menus

By [Nick Diego](https://profiles.wordpress.org/ndiego/)

February 29, 2024

[Advanced](https://developer.wordpress.org/news/category/advanced/), [Blocks](https://developer.wordpress.org/news/category/blocks/)

Mega menus are widely used in web design, and with the advent of block themes, I’ve been looking for a way to incorporate them seamlessly into WordPress’s Navigation block. The upcoming release of WordPress 6.5 at the end of March includes features like the [Interactivity API](https://make.wordpress.org/core/2024/02/19/merge-announcement-interactivity-api/) that will help finally bring block-based mega menus to life. In this article, I’ll walk you through one approach using these new tools.

Now, only some sites need a mega menu. If this tutorial doesn’t seem relevant to your workflow on its surface, I still encourage you to give it a read. The article is more about architecting a block plugin using new functionality in WordPress 6.5. Many concepts we will cover apply well beyond mega menus. Here are a few examples:

- How to create custom template part areas
- How to add custom blocks to the Navigation block
- How to set up a project that uses the Interactivity API
- How to use Core components to streamline block development

Before diving in, here’s a look at the result using the Twenty Twenty-Four theme. We’ll not be building a production-ready block to keep this article from going too long, but it will provide a solid foundation for continued iterations.

Table of Contents

1. [The approach](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#the-approach)
2. [Getting set up](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#getting-set-up)
3. [Adding a custom template part area](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#adding-a-custom-template-part-area)
4. [Adding mega menus to the Navigation block](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#adding-mega-menus-to-the-navigation-block)
5. [Updating block.json, block styles, and adding a custom icon](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#updating-block-json-block-styles-and-adding-a-custom-icon)
6. [Adding the Editor user interface](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#adding-the-editor-user-interface)
1. [Importing components, hooks, and functions](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#importing-components-hooks-and-functions)
2. [Fetching menu template parts](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#fetching-menu-template-parts)
3. [Adding the Settings panel](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#adding-the-settings-panel)
4. [Adding a RichText field in the canvas](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#adding-a-richtext-field-in-the-canvas)
7. [Configuring the front end](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#configuring-the-front-end)
1. [Updating the block markup and base styles](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#updating-the-block-markup-and-base-styles)
2. [Adding the mega menu](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#adding-the-mega-menu)
8. [Adding interactions (Interactivity API)](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#adding-interactions-interactivity-api)
1. [Adding support for the Interactivity API](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#adding-support-for-the-interactivity-api)
2. [Adding directives](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#adding-directives)
3. [Adding the store](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#adding-the-store)
4. [Adding styles](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#adding-styles)
9. [Next steps](https://developer.wordpress.org/news/2024/02/29/an-introduction-to-block-based-mega-menus/#next-steps)

## The approach

There are many approaches you could take when building a Mega Menu block, so before we begin, let’s look at the prerequisites I had when structuring this project.

- The Mega Menu block needs to integrate directly with the Navigation block
- It should be the same experience as adding any other link
- Once a user adds a Mega Menu block to the Navigation block, they then choose from a list of available “menu templates” to display on the front end
- Menus themselves are template parts
- Menu template parts are created and designed in the Site Editor

I took as much inspiration as possible from Core, and the resulting block closely resembles the [Navigation Link](https://github.com/WordPress/gutenberg/tree/trunk/packages/block-library/src/navigation-link) block. The more the block feels like native WordPress, the better.

## Getting set up

The first step is to scaffold a block plugin using the [`@wordpress/create-block`](https://developer.wordpress.org/block-editor/getting-started/devenv/get-started-with-create-block/) package. I’m not going to go into too much detail here, but you can refer to the [Getting Started](https://developer.wordpress.org/block-editor/getting-started/) documentation to learn more about this process.

The following command will create a plugin that supports using [`wp-env`](https://developer.wordpress.org/block-editor/getting-started/devenv/get-started-with-wp-env/) and registers the dynamic block `mega-menu-block`. Feel free to use your preferred plugin slug and local development environment; `wp-env` is not required. You just need to make sure you’re running WordPress 6.5.

```bash
npx @wordpress/create-block@latest mega-menu-block --variant=dynamic --wp-env
cd mega-menu-block
```

Throughout this tutorial, all edits will be made to the files in the plugin’s `/src` folder unless otherwise indicated.

## Adding a custom template part area

Before configuring the block itself, let’s register the template part area that will house each mega menu. You can add custom areas using the [`default_wp_template_part_areas`](https://developer.wordpress.org/reference/hooks/default_wp_template_part_areas/) hook.

```php
mega-menu-block.php
/**
 * Adds a custom template part area for mega menus to the list of template part areas.
 *
 * @param array $areas Existing array of template part areas.
 * @return array Modified array of template part areas including the new "Menu" area.
 */
function outermost_mega_menu_template_part_areas( array $areas ) {
	$areas[] = array(
		'area'        => 'menu',
		'area_tag'    => 'div',
		'description' => __( 'Menu templates are used to create sections of a mega menu.', 'mega-menu-block' ),
		'icon'        => '',
		'label'       => __( 'Menu', 'mega-menu-block' ),
	);

	return $areas;
}
add_filter( 'default_wp_template_part_areas', 'outermost_mega_menu_template_part_areas' );
```

Place this PHP code in the main plugin file in the root `mega-menu-block` folder. It should be `mega-menu-block.php` unless you choose a different block slug. Note that the `area` is set to `menu`. We’ll use this later in the tutorial.

In your local environment, navigate to the Site Editor. You should see that the “Menu” area is now selectable when creating a new template part.

![The “Create template part” modal in the Site Editor featuring the “Menu” template part area.](https://developer.wordpress.org/news/files/2024/02/create-template-part.png)

As of WordPress 6.5, there is no way to assign a custom icon to template part areas. The options are `header`, `footer`, and `sidebar`. Leaving the field blank or specifying any other value will display a default icon, as seen in the image above.

Create a new Menu template part and add some filler content. I chose to insert one of the patterns from the Twenty Twenty-Four theme. Don’t worry too much about what it looks like. We just need a saved template for testing purposes.

![A sample mega menu template featuring a pattern from the Twenty Twenty-Four theme.](https://developer.wordpress.org/news/files/2024/02/example-mega-menu.png)

## Adding mega menus to the Navigation block

It’s now time to start building out the “Mega Menu Block” block, and the first thing to do is ensure users can add it to the Navigation block in WordPress.

Start the build process by running `npm start` in the terminal. Navigate to a new page in your local environment and confirm that the block is available in the Editor. It shouldn’t look like much yet, just the default block that’s scaffolded by the `create-block` package.

![The Mega Menu Block in the Inserter.](https://developer.wordpress.org/news/files/2024/02/insert-default-block.png)

Now add a Navigation block to the page and try adding the Mega Menu Block in the menu. You won’t be able to.

By default, the Navigation block only permits a predefined set of Core blocks, controlled by an array of block names defined in the block’s `allowedBlocks` setting. However, you can now add support for custom blocks using [`blocks.registerBlockType`](https://developer.wordpress.org/block-editor/reference-guides/filters/block-filters/#blocks-registerblocktype) filter in WordPress 6.5.

The filter itself is not new. It loops through each block type and allows you to modify the settings of each, and you may have seen it before in other tutorials here on the Developer Blog. The filter’s callback function accepts two parameters: an object of block settings (`blockSettings`) and the block’s name (`blockName`).

To use the filter, start by importing `addFilter` at the top of the `index.js` file.

```javascript
index.js
import { addFilter } from '@wordpress/hooks';
```

Then, add the following code at the bottom of the file and save. The build process should still be running. If not, run `npm start` in the terminal.

```javascript
index.js
/**
 * Make the Mega Menu Block available to Navigation blocks.
 *
 * @param {Object} blockSettings The original settings of the block.
 * @param {string} blockName     The name of the block being modified.
 * @return {Object} The modified settings for the Navigation block or the original settings for other blocks.
 */
const addToNavigation = ( blockSettings, blockName ) => {
	if ( blockName === 'core/navigation' ) {
		return {
			...blockSettings,
			allowedBlocks: [\
				...( blockSettings.allowedBlocks ?? [] ),\
				'create-block/mega-menu-block',\
			],
		};
	}
	return blockSettings;
};
addFilter(
	'blocks.registerBlockType',
	'add-mega-menu-block-to-navigation',
	addToNavigation
);
```

Before modifying any settings, it’s important to ensure we only target the Navigation block by checking the `blockName`. Then, append `create-block/mega-menu-block` to the `allowedBlocks` setting. This is the `name` of the block as defined in `block.json`.

After saving the file and refreshing the page, you should now be able to add the Mega Menu Block to menus.

![The Mega Menu Block can now be added to the Navigation block.](https://developer.wordpress.org/news/files/2024/02/default-block-in-menu.png)

## Updating block.json, block styles, and adding a custom icon

For the sake of this tutorial, I am going to keep the Editor functionality of the Mega Menu Block to the basics. You can always extend it, and I encourage you to do so.

In the Editor, the block requires two features: a way to set a label for the menu item within the Navigation block and a selection mechanism for choosing a menu template part for the mega menu. The label and selected template part data must be stored as [block attributes](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-attributes/).

We’ll begin by updating the `block.json` file to include these attributes and do some additional cleanup. Here’s the todo list:

- Add an `attributes` property
- Add a `label` attribute with type `string`
- Add a `menuSlug` attribute with type `string`
- Add a `parent` property and set it to `core/navigation` so users cannot insert the block outside of a Navigation block
- Add typography support to match the [other link blocks](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/navigation-link/block.json) available in the Navigation block
- Update the `title` property to “Mega Menu”
- Update the `description` property to “Add a mega menu to your navigation.”
- Update the `category` property to “design”
- Remove the `icon` property (we’ll add a custom icon later)

The updated `block.json` file should look like this.

```json
block.json
{
	"$schema": "https://schemas.wp.org/trunk/block.json",
	"apiVersion": 3,
	"name": "create-block/mega-menu-block",
	"version": "0.1.0",
	"title": "Mega Menu",
	"category": "design",
	"description": "Add a mega menu to your navigation.",
	"parent": [ "core/navigation" ],
	"example": {},
	"attributes": {
		"label": {
			"type": "string"
		},
		"menuSlug": {
			"type": "string"
		}
	},
	"supports": {
		"html": false,
		"typography": {
			"fontSize": true,
			"lineHeight": true,
			"__experimentalFontFamily": true,
			"__experimentalFontWeight": true,
			"__experimentalFontStyle": true,
			"__experimentalTextTransform": true,
			"__experimentalTextDecoration": true,
			"__experimentalLetterSpacing": true,
			"__experimentalDefaultControls": {
				"fontSize": true
			}
		}
	},
	"textdomain": "mega-menu-block",
	"editorScript": "file:./index.js",
	"editorStyle": "file:./index.css",
	"style": "file:./style-index.css",
	"render": "file:./render.php",
	"viewScript": "file:./view.js"
}
```

Next, clear out the default styles from the `create-block` setup by removing all content in the `style.scss` and `edit.scss` files. We’ll introduce custom styling later in this tutorial. Remember to save the changes to both files.

This final clean-up step is unnecessary, but I always like adding a custom block icon. The `icon` property in `block.json` allows you to specify a [Dashicon](https://developer.wordpress.org/resource/dashicons/#welcome-widgets-menus) slug, but you cannot add SVG icons this way. Instead, let’s add the icon directly to the `registerBlockType()` function in the `index.js` file.

```javascript
index.js
const megaMenuIcon = (
	<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg">
		<path d="M20,12 L4,12 L4,13.5 L20,13.5 L20,12 Z M10,6.5 L4,6.5 L4,8 L10,8 L10,6.5 Z M20,17.5 L4,17.5 L4,19 L20,19 L20,17.5 Z M20,5.62462724 L16.000015,9 L12,5.62462724 L12.9791165,4.5 L16.000015,7.04920972 L19.0208935,4.5 L20,5.62462724 Z"></path>
	</svg>
);

registerBlockType( metadata.name, {
	icon: megaMenuIcon,
	edit: Edit,
} );
```

Save the file and refresh the page. The “Mega Menu” block should look like this in the Editor. Notice the Typography panel provided by the [block supports](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-supports/).

![The Mega Menu block in the Editor after the cleanup process.](https://developer.wordpress.org/news/files/2024/02/initial-updates.png)

## Adding the Editor user interface

With the initial setup complete, it is now time to add controls to the block that allow the user to set the `label` and `menuSlug` attributes.

In the `edit.js` file, let’s start by updating the `Edit` component to include the properties `attributes` and `setAttributes`. From `attributes`, extract `label` and `menuSlug`. we’ll use `setAttributes` later to update the values based on user interaction.

Finally, the markup in the Editor defaults to using a `<p>` tag. Update that to a `<div>`. The results should look like this.

```javascript
edit.js
export default function Edit( { attributes, setAttributes } ) {
	const { label, menuSlug } = attributes;

	return (
		<div { ...useBlockProps() }>
			{ __(
				'Mega Menu Block – hello from the editor!',
				'mega-menu-block'
			) }
		</div>
	);
}
```

### Importing components, hooks, and functions

Next, we need to import a few items that will be used to build the block interface. For the sake of brevity, let’s add them all at once. We’ll need:

- [`InspectorControls`](https://developer.wordpress.org/block-editor/getting-started/fundamentals/block-in-the-editor/): A component that renders block-specific settings in the sidebar.
- [`PanelBody`](https://wordpress.github.io/gutenberg/?path=/docs/components-panel--docs): A component used within `InspectorControls` to group related UI controls in a collapsible container for better organization.
- [`TextControl`](https://wordpress.github.io/gutenberg/?path=/docs/components-textcontrol--docs): A form input component that allows users to enter and edit text.
- [`ComboboxControl`](https://wordpress.github.io/gutenberg/?path=/docs/components-comboboxcontrol--docs): A combined input and dropdown menu component that allows users to choose from predefined options.
- [`RichText`](https://developer.wordpress.org/block-editor/reference-guides/richtext/): A component that provides a rich text editing interface.
- [`useEntityRecords`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-core-data/#useentityrecords): A React hook that retrieves a list of entities (e.g., posts, pages, template parts) from the WordPress database based on specified query parameters.

Update the imports at the top of the `edit.js` file to include the following.

```javascript
edit.js
import { __ } from '@wordpress/i18n';
import { InspectorControls, RichText, useBlockProps } from '@wordpress/block-editor';
import { ComboboxControl, PanelBody, TextControl } from '@wordpress/components';
import { useEntityRecords } from '@wordpress/core-data';
```

### Fetching menu template parts

We’ve included essential imports, and the block now has access to the `label` and `menuSlug` attributes. The one missing piece of information is the available “Menu” template parts.

Let’s use the `useEntityRecords` hook to fetch all entities of the type `wp_template_part` and then parse the returned records for all template parts with the area `menu`, as defined earlier in this tutorial. The code should be added before the return statement in the `Edit` component and should look something like this.

```javascript
edit.js
// Fetch all template parts.
const { hasResolved, records } = useEntityRecords(
	'postType',
	'wp_template_part',
	{ per_page: -1 }
);

let menuOptions = [];

// Filter the template parts for those in the 'menu' area.
if ( hasResolved ) {
	menuOptions = records
		.filter( ( item ) => item.area === 'menu' )
		.map( ( item ) => ( {
			label: item.title.rendered, // Title of the template part.
			value: item.slug,           // Template part slug.
		} ) );
}
```

Note that we can retrieve all records by setting `per_page` to `-1`.

The `hasResolved` variable indicates whether the request to fetch the template parts has been completed. Once the fetching process has resolved (`hasResolved` is `true`), the code filters through the `records` (the fetched template parts) to find those that belong to the `menu` area.

For each template part in the `menu` area, the code constructs an object containing the template part’s title and slug. These objects are collected into the `menuOptions` array, which we’ll then use to represent options in a `ComboboxControl` component.

For more information on fetching entity records, check out the article [useEntityRecords: an easier way to fetch WordPress data](https://developer.wordpress.org/news/2023/05/19/useentityrecords-an-easier-way-to-fetch-wordpress-data/).

### Adding the Settings panel

We have all the data needed to build out the settings panel for the block. To do so, let’s start by adding an `InspectorControls` component within the return statement. Then add a `PanelBody` component with the `title` property set to “Settings”. Core blocks generally have setting panels open by default, so set the `initialOpen` property to `true`.

The updated return statement of the `Edit` component should look like this:

```jsx
edit.js

return (
	<>
		<InspectorControls>
			<PanelBody
				title={ __( 'Settings', 'mega-menu-block' ) }
				initialOpen={ true }
			>
				Testing
			</PanelBody>
		</InspectorControls>
		<div { ...useBlockProps() }>
			{ __(
				'Mega Menu Block – hello from the editor!',
				'mega-menu-block'
			) }
		</div>
	</>
);
```

In React, a component can only return a single element, which is why everything is wrapped in a [Fragment](https://react.dev/reference/react/Fragment) (`<>...</>`) in the code above.

Save the `edit.js` file and preview the Mega Menu block in the Editor. You should see a “Settings” panel when the block is selected.

![The initial state of the Settings panel for the block.](https://developer.wordpress.org/news/files/2024/02/sidebar-testing-1024x819.png)

Next, let’s use the `TextControl` component to allow users to modify the `label` attribute and the `ComboboxControl` component to choose a menu template and set the `menuSlug` attribute.

```jsx
edit.js
<PanelBody
	title={ __( 'Settings', 'mega-menu-block' ) }
	initialOpen={ true }
>
	<TextControl
		label={ __( 'Label', 'mega-menu-block' ) }
		type="text"
		value={ label }
		onChange={ ( value ) =>
			setAttributes( { label: value } )
		}
		autoComplete="off"
	/>
	<ComboboxControl
		label={ __( 'Menu Template', 'mega-menu-block' ) }
		value={ menuSlug }
		options={ menuOptions }
		onChange={ ( slugValue ) =>
			setAttributes( { menuSlug: slugValue } )
		}
	/>
</PanelBody>
```

Note that we are using `setAttributes` to update the values of both `label` and `menuSlug` based on user interaction.

After saving the `edit.js` file, the controls will be available in the Settings panel. Try modifying the Label and selecting a Menu Template. Confirm that the values are saved when updating the page.

![](https://developer.wordpress.org/news/files/2024/02/sidebar-controls.png)

While beyond the scope of this tutorial, if you plan to distribute this block to users, you will want to add some sort of notice if no menu template parts exist. Perhaps also provide a link that directs them to the Site Editor to create new templates.

### Adding a RichText field in the canvas

While the `label` attribute is editable in the Settings Sidebar, this is not a great user experience. If you look at the code for the [Navigation Link](https://github.com/WordPress/gutenberg/blob/a70c05bf577a2f2dc64a9b4af6f583f375bb9bb9/packages/block-library/src/navigation-link/edit.js#L491) block in WordPress, you will see that the label is also editable using a `RichText` component in the Editor canvas.

Editing the Mega Menu block should feel as much like native WordPress as possible, and we don’t want to reinvent the wheel. Therefore, copy the same markup structure and CSS classes in the Navigation Link block and implement the `RichText` component. This allows our block to inherit Core styles and provide a consistent user interface.

```jsx
edit.js
<div { ...useBlockProps() }>
	<a className="wp-block-navigation-item__content">
		<RichText
			identifier="label"
			className="wp-block-navigation-item__label"
			value={ label }
			onChange={ ( labelValue ) =>
				setAttributes( {
					label: labelValue,
				} )
			}
			aria-label={ __(
				'Mega menu link text',
				'mega-menu-block'
			) }
			placeholder={ __( 'Add label…', 'mega-menu-block' ) }
			allowedFormats={ [\
				'core/bold',\
				'core/italic',\
				'core/image',\
				'core/strikethrough',\
			] }
		/>
	</a>
</div>
```

Here’s a look at the `RichText` component once the above code is applied.

The Editor component for the Mega Menu block provides the basic functionality we need and is now complete. Let’s shift focus to the front end.

View the complete edit.js file

```jsx
edit.js

/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	RichText,
	useBlockProps,
} from '@wordpress/block-editor';
import { ComboboxControl, PanelBody, TextControl } from '@wordpress/components';
import { useEntityRecords } from '@wordpress/core-data';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @param {Object}   props               Properties passed to the function.
 * @param {Object}   props.attributes    Available block attributes.
 * @param {Function} props.setAttributes Function that updates individual attributes.
 *
 * @return {Element} Element to render.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { label, menuSlug } = attributes;

	// Fetch all template parts.
	const { hasResolved, records } = useEntityRecords(
		'postType',
		'wp_template_part',
		{ per_page: -1 }
	);

	let menuOptions = [];

	// Filter the template parts for those in the 'menu' area.
	if ( hasResolved ) {
		menuOptions = records
			.filter( ( item ) => item.area === 'menu' )
			.map( ( item ) => ( {
				label: item.title.rendered,
				value: item.slug,
			} ) );
	}

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Settings', 'mega-menu-block' ) }
					initialOpen={ true }
				>
					<TextControl
						label={ __( 'Label', 'mega-menu-block' ) }
						type="text"
						value={ label }
						onChange={ ( value ) =>
							setAttributes( { label: value } )
						}
						autoComplete="off"
					/>
					<ComboboxControl
						label={ __( 'Menu Template', 'mega-menu-block' ) }
						value={ menuSlug }
						options={ menuOptions }
						onChange={ ( slugValue ) =>
							setAttributes( { menuSlug: slugValue } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps() }>
				<a className="wp-block-navigation-item__content">
					<RichText
						identifier="label"
						className="wp-block-navigation-item__label"
						value={ label }
						onChange={ ( labelValue ) =>
							setAttributes( { label: labelValue } )
						}
						aria-label={ __(
							'Mega menu link text',
							'mega-menu-block'
						) }
						placeholder={ __( 'Add label…', 'mega-menu-block' ) }
						allowedFormats={ [\
							'core/bold',\
							'core/italic',\
							'core/image',\
							'core/strikethrough',\
						] }
					/>
				</a>
			</div>
		</>
	);
}
```

## Configuring the front end

Following the steps above, the front end of the Mega Menu block should look like this.

![The initial state of the front end with the Menu Menu block displayed in the Navigation block.](https://developer.wordpress.org/news/files/2024/02/fontend-initial-state.png)

The block is correctly displayed as part of the Navigation block, but the default output remains. Let’s fix this.

### Updating the block markup and base styles

Navigate to the `render.php` file and assign the `label` and `menuSlug` attributes to variables. Add a check that returns `null` if neither exists. We don’t want to display a mega menu without a label or a label without a mega menu.

Finally, replace the default message with the menu label.

```php
render.php
<?php
$label     = esc_html( $attributes['label'] ?? '' );
$menu_slug = esc_attr( $attributes['menuSlug'] ?? '');

// Don't display the mega menu link if there is no label or no menu slug.
if ( ! $label || ! $menu_slug ) {
	return null;
}
?>
<p <?php echo get_block_wrapper_attributes(); ?>>
	<?php echo $label; ?>
</p>
```

The Navigation block is an unordered list (`<ul>`), so next, update the markup to ensure the block renders as a list item (`<li>`). The menu label should also be contained in a  `<button>` element that toggles the mega menu when clicked.

```markup
render.php
<li <?php echo get_block_wrapper_attributes(); ?>>
 	<button><?php echo $label; ?></button>
</li>
```

Browsers provide default styles to `<button>` elements, which we don’t want. Let’s add a few reset styles in the `style.scss` file.

```css
style.scss
// Reset button styles.
.wp-block-create-block-mega-menu-block {
	button {
		background-color: initial;
		border: none;
		color: currentColor;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
		font-style: inherit;
		font-weight: inherit;
		line-height: inherit;
		padding: 0;
		text-transform: inherit;
	}
}
```

Note that the main class for the block will be `wp-block-create-block-mega-menu-block`. WordPress generates this automatically using the [`get_block_wrapper_attributes()`](https://developer.wordpress.org/reference/functions/get_block_wrapper_attributes/) function. The block `name` is converted to [kebab case](https://developer.mozilla.org/en-US/docs/Glossary/Kebab_case) and prefixed with `wp-block-`.

Save both the `render.php` and `style.scss` files. When you refresh the page on the front end, it should look something like this.

![At this point, the visual representation of the menu item is complete.](https://developer.wordpress.org/news/files/2024/02/fontend-menu-item-done-state.png)

### Adding the mega menu

It’s time to render the mega menu template part using the [`block_template_part()`](https://developer.wordpress.org/reference/functions/block_template_part/) function, which accepts the `$menu_slug` variable. To make subsequent steps easier, wrap this function in a `<div>` with the `wp-block-create-block-mega-menu-block__menu-container` class.

```php
render.php
<li <?php echo get_block_wrapper_attributes(); ?>>
 	<button><?php echo $label; ?></button>
	<div class="wp-block-create-block-mega-menu-block__menu-container">
		<?php echo block_template_part( $menu_slug ); ?>
	</div>
</li>
```

The last step is adding a `<button>` element inside the menu container. Users will be able to click the button to hide the mega menu. This button could be text or an icon. I decided to use the `close` icon from the WordPress [component library](https://wordpress.github.io/gutenberg/?path=/story/icons-icon--library).

The `render.php` file should now look like this.

```php
render.php
<?php
$label       = esc_html( $attributes['label'] ?? '' );
$menu_slug   = esc_attr( $attributes['menuSlug'] ?? '');
$close_icon  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M13 11.8l6.1-6.3-1-1-6.1 6.2-6.1-6.2-1 1 6.1 6.3-6.5 6.7 1 1 6.5-6.6 6.5 6.6 1-1z"></path></svg>';

// Don't display the mega menu link if there is no label or no menu slug.
if ( ! $label || ! $menu_slug ) {
	return null;
}
?>
<li <?php echo get_block_wrapper_attributes(); ?>>
	<button><?php echo $label; ?></button>
	<div class="wp-block-create-block-mega-menu-block__menu-container">
		<?php echo block_template_part( $menu_slug ); ?>
		<button
			aria-label="<?php echo __( 'Close menu', 'mega-menu' ); ?>"
			class="menu-container__close-button"
			type="button"
		>
			<?php echo $close_icon; ?>
		</button>
	</div>
</li>
```

Refresh the page, and you will see that the template part and the close button render on the front end. It doesn’t look great, but we’ll fix that with the Interactivity API and more styling.

![](https://developer.wordpress.org/news/files/2024/02/fontend-with-mega-menu-no-iapi-1.png)

## Adding interactions (Interactivity API)

To manage the behavior of our mega menu, we’ll leverage the [Interactivity API](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-interactivity/). This section won’t cover every detail of the API, but it should give you a good foundation for how interactive blocks are structured and function.

I drew inspiration from the Navigation block when experimenting with block-based mega menus. The Interactivity API powers many parts of it, and the [source code](https://github.com/WordPress/gutenberg/blob/trunk/packages/block-library/src/navigation/view.js) provides a good template for the level of interaction you would need in a production-ready block.

For this tutorial, we’re just going to cover the basics. When a user clicks on the menu item, it should toggle the mega menu. If we wanted to cover everything needed to build a block that responds to clicks, hovers, and focus states while being fully responsive, we’d need a much longer guide.

There are three things that we need to do:

- Update block and plugin to support the Interactivity API
- Add [directives](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-interactivity/packages-interactivity-api-reference/#what-are-directives) to the markup on the front end to enable specific interactions within the block
- Create a [store](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-interactivity/packages-interactivity-api-reference/#the-store) that contains the logic (state, actions, or callbacks) for the desired interactivity

### Adding support for the Interactivity API

Our build process relies on [`wp-scripts`](https://developer.wordpress.org/block-editor/getting-started/devenv/get-started-with-wp-scripts/), introduced during the `create-block` scaffolding process. We need to adjust a couple of things to accommodate the Interactivity API.

Stop the build process if it’s currently running. Next, open the `package.json` file and add the `--experimental-modules` flag to both the `build` and `start` scripts. The adjustments should look like this.

```bash
package.json
"scripts": {
	"build": "wp-scripts build --webpack-copy-php --experimental-modules",
	"format": "wp-scripts format",
	"lint:css": "wp-scripts lint-style",
	"lint:js": "wp-scripts lint-js",
	"lint:js:src": "wp-scripts lint-js ./src --fix",
	"packages-update": "wp-scripts packages-update",
	"plugin-zip": "wp-scripts plugin-zip",
	"start": "wp-scripts start --webpack-copy-php --experimental-modules",
	"env": "wp-env"
},
```

In the `block.json` file, change the `viewScript` property to [`viewScriptModule`](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script-module) and save.

```bash
	"editorScript": "file:./index.js",
	"editorStyle": "file:./index.css",
	"style": "file:./style-index.css",
	"render": "file:./render.php",
	"viewScriptModule": "file:./view.js"
}
```

Restart the build process by running `npm start` in the terminal and confirm that all changes are applied correctly. On the front end, refresh the page and check your browser’s console. You should see the message:

```bash
Hello World! (from create-block-mega-menu-block block)
```

The Interactivity API script requires new [modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) in WordPress 6.5, so blocks must enqueue any JavaScript that relies on the API by using [`viewScriptModule`](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script-module) instead of `viewScript`. Considering this module requirement, the  `--experimental-modules` flag tells `wp-scripts` how to build `view.js` properly.

While the flag is technically experimental, it only impacts the build process of the block plugin and is safe to use. Once the plugin is built (`npm run build`) and production-ready, it does not rely on this experimental flag in any way.

Finally, to indicate that the block supports the Interactivity API, add `"interactivity": true` to the `supports` section of the block’s `block.json` file.

```json
"supports": {
	"html": false,
	"interactivity": true,
	"typography": {
		...
	}
},
```

Refer to the [Block Editor Handbook](https://developer.wordpress.org/block-editor/reference-guides/block-api/block-supports/#interactivity) for a more detailed description of the \`interactivity\` support property.

### Adding directives

Directives are custom attributes added to the block’s markup that enable “interactions”. Interactivity API directives use the `data-` prefix.

Here is a list of the directives we’ll need for the Mega Menu block. Follow the links for code examples and more information about each:

- [`wp-interactive`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-interactivity/packages-interactivity-api-reference/#wp-interactive): Enables interactivity for the DOM element and its children
- [`wp-context`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-interactivity/packages-interactivity-api-reference/#wp-context): Defines a local state available to the DOM element and its children
- [`wp-bind`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-interactivity/packages-interactivity-api-reference/#wp-bind): Sets HTML attributes on elements based on a boolean or string value
- [`wp-on`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-interactivity/packages-interactivity-api-reference/#wp-on): Runs code on dispatched DOM events (`click`, `focusout`, `keydown`, etc.)

The `wp-interactive` directive is always required and accepts a namespace. Using the block name is good practice unless you require a more advanced implementation. Add this directive to the main HTML element of the block.

```markup
render.php
<li
	<?php echo $wrapper_attributes; ?>
	data-wp-interactive="create-block/mega-menu-block"
>
	...
</li>
```

Next, add the `wp-context` directive to the `<li>` element as well. We’ll use this to track the state of the mega menu. Is it open or closed?

For this state, let’s use a variable called `isMenuOpen` with an initial state set to `false`. The directive accepts stringified JSON as a value, so it should look like this.

```markup
render.php
<li
	<?php echo $wrapper_attributes; ?>
	data-wp-interactive="create-block/mega-menu-block"
	data-wp-context='{ "isMenuOpen": false }'
>
	...
</li>
```

Let’s think about how the mega menu should function.

If a user clicks the menu label `<button>` element for the first time, display the mega menu. This action should set `isMenuOpen` to `true`. If the user clicks the button again, and `isMenuOpen` is `true`, hide the menu and set `isMenuOpen` to `false`.

To handle this interaction, let’s add a `wp-on` directive for a `click` event, which looks like `data-wp-on–click`. The directive accepts a callback that gets executed each time the associated event is triggered. We’ll create this later in this tutorial. For now, set the directive equal to `actions.toggleMenu`.

```markup
render.php
<li
	<?php echo $wrapper_attributes; ?>
	data-wp-interactive="create-block/mega-menu-block"
	data-wp-context='{ "isMenuOpen": false }'
>
	<button
		data-wp-on--click="actions.toggleMenu"
	>
		<?php echo $label; ?>
	</button>
	...
</li>
```

Next, let’s use a `wp-bind` to set the attribute `aria-expanded=true` if `isMenuOpen` is `true`. This will control the visibility of the mega menu in combination with some custom styles, which we’ll add later.

```markup
render.php
<li
	<?php echo $wrapper_attributes; ?>
	data-wp-interactive="create-block/mega-menu-block"
	data-wp-context='{ "isMenuOpen": false }'
>
	<button
		data-wp-on--click="actions.toggleMenu"
		data-wp-bind--aria-expanded="context.isMenuOpen"
	>
		<?php echo $label; ?>
	</button>
	...
</li>
```

You could take other approaches besides using the `aria-expanded` attribute, such as adding a custom class using the [`wp-class`](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-interactivity/packages-interactivity-api-reference/#wp-class) directive.

The last directive to add is for the `<button>` element within the mega menu that, when clicked, will close it. Again, let’s use the `wp-on` directive, but we’ll pass the `action.closeMenu` callback instead of `action.toggleMenu`.

The complete block markup, with directives, should look like this.

```markup
render.php
<li
	<?php echo get_block_wrapper_attributes(); ?>
	data-wp-interactive="create-block/mega-menu-block"
	data-wp-context='{ "isMenuOpen": false }'
>
	<button
		data-wp-on--click="actions.toggleMenu"
		data-wp-bind--aria-expanded="context.isMenuOpen"
	>
		<?php echo $label; ?>
	</button>
	<div class="wp-block-create-block-mega-menu-block__menu-container">
		<?php echo block_template_part( $menu_slug ); ?>
		<button
			aria-label="<?php echo __( 'Close menu', 'mega-menu' ); ?>"
			class="menu-container__close-button"
			type="button"
			data-wp-on--click="actions.closeMenu"
		>
			<?php echo $close_icon; ?>
		</button>
	</div>
</li>
```

### Adding the store

At this point, the directives don’t do anything. Nothing will have changed if you save `render.php` and look at the front end. You must create a [store](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-interactivity/packages-interactivity-api-reference/#the-store) that defines the interactions specified in the directives, specifically `action.toggleMenu` and `action.openMenu`.

Start by opening the `view.js` file and remove the default console statement. Then, import the `store` from the `@wordpress/interactivity` package. Let’s also import `getContext`. This will allow us to get the context of the block and determine the current value of `isMenuOpen`.

```javascript
view.js
import { store, getContext } from '@wordpress/interactivity';
```

The `store()` in this tutorial is quite basic. All we need to do is create the actions that will toggle and close the mega menu, which you can do by setting the value of `isMenuOpen` to `true` or `false`.

The `store()` accepts the namespace defined using the `wp-interactivity` directive and an object containing actions, states, callbacks, and more. This is where we will define `action.toggleMenu` and `action.openMenu`.

The complete `view.js` file should look something like this.

```javascript
view.js
/**
 * WordPress dependencies
 */
import { store, getContext } from '@wordpress/interactivity';

const { actions } = store( 'create-block/mega-menu-block', {
	actions: {
		toggleMenu() {
			const context = getContext();

			if ( context.isMenuOpen ) {
				actions.closeMenu();
			} else {
				context.isMenuOpen = true;
			}
		},
		closeMenu() {
            			const context = getContext();
			context.isMenuOpen = false;
		},
	}
} );
```

You can learn more about structuring a store in the [official documentation](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-interactivity/packages-interactivity-api-reference/#elements-of-the-store).

### Adding styles

The final step is adding custom styles. They must hide the mega menu by default, display it when `aria-expanded=true` on the primary `<button>` element, set the position and width of the menu content, and style the close button.

Open the `style.scss` file and update it to match the following.

```css
style.scss
.wp-block-create-block-mega-menu-block {

	// Reset button styles.
	button {
		background-color: initial;
		border: none;
		color: currentColor;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
		font-style: inherit;
		font-weight: inherit;
		line-height: inherit;
		padding: 0;
		text-transform: inherit;
	}

	.wp-block-create-block-mega-menu-block__menu-container {
		height: auto;
		right: 0;
		opacity: 0;
		overflow: hidden;
		position: absolute;
		top: 40px;
		transition: opacity .1s linear;
		visibility: hidden;
		width: var(--wp--style--global--wide-size);
		z-index: 2;

		.menu-container__close-button {
			align-items: center;
			-webkit-backdrop-filter: blur(16px) saturate(180%);
			backdrop-filter: blur(16px) saturate(180%);
			background-color: #ffffffba;
			border: none;
			border-radius: 999px;
			cursor: pointer;
			display: flex;
			justify-content: center;
			opacity: 0;
			padding: 4px;
			position: absolute;
			right: 12px;
			text-align: center;
			top: 12px;
			transition: opacity .2s ease;
			z-index: 100;

			// Show the close button when focused (for keyboard navigation)
			&:focus {
				opacity: 1;
			}
		}

		// Show the close button when the mega menu is hovered.
		&:hover {
			.menu-container__close-button {
				opacity: 1;
			}
		}
	}

// Show the mega menu when aria-expanded is true.
	button[aria-expanded=true] {
		&~.wp-block-create-block-mega-menu-block__menu-container {
			opacity: 1;
			overflow: visible;
			visibility: visible;
		}
	}
}
```

I am not going to go through all of this code. Styling the mega menu is the most challenging part of building this block.

From the menu’s position and the content’s width to how the menu looks on mobile, there are many factors to account for. Furthermore, every website design is different, and each will have different requirements. I encourage you to experiment and make it your own.

That said, this is what the Mega Menu block looks like in its current state.

## Next steps

Alright, so this is a good point to stop. While the result of this tutorial is far from a production-ready block, it provides a solid framework to iterate on. If you are interested in taking this block further, here are some issues that need to be fixed and enhancements that would improve the block.

- The mega menu position should adapt to the position of the Navigation block and the size of the browser window
- Allow the user to configure the width of each mega menu and its position in relation to the Navigation block
- Add support for focus states, keyboard navigation, and addition accessibility features
- Add support for vertically positioned Navigation blocks
- Add mobile and tablet support
- Add title and description attributes to the menu item for parity with other link blocks
- Add an icon to the menu item to indicate it opens a mega menu, much like links with submenus
- Improve the user experience in the Editor

For a more complete example, you can check out my experimental [Mega Menu block](https://github.com/ndiego/mega-menu-block), which this tutorial is based on. It’s still far from production-ready but tackles many items on the list above.

There are many ways you could build a Mega Menu block. The approach taken in this tutorial tries to integrate with the Navigation block and provide a native WordPress experience as much as possible. Furthermore, the use of template parts decouples the design of mega menus from the Navigation block, which I find works well.

But if you have explored alternative approaches, please share in the comments. Mega menus are one of the most requested features in WordPress, and getting them right is a rewarding challenge.

_Props to [@greenshady](https://profiles.wordpress.org/greenshady/) and [@bjmcsherry](https://profiles.wordpress.org/bjmcsherry/) for providing feedback and reviewing this post._

**Share the post:**

- [Click to share on Mastodon (Opens in new window)Mastodon](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?share=mastodon&nb=1)
- [Click to share on LinkedIn (Opens in new window)LinkedIn](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?share=linkedin&nb=1)
- [Click to share on X (Opens in new window)X](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?share=x&nb=1)
- [Click to share on Bluesky (Opens in new window)Bluesky](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?share=bluesky&nb=1)
- [Click to share on Mail (Opens in new window)Mail](mailto:?subject=%5BShared%20Post%5D%20An%20introduction%20to%20block-based%20mega%20menus&body=https%3A%2F%2Fdeveloper.wordpress.org%2Fnews%2F2024%2F02%2Fan-introduction-to-block-based-mega-menus%2F&share=email)
- [Click to share on Reddit (Opens in new window)Reddit](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?share=reddit&nb=1)
- [Click to share on Pocket (Opens in new window)Pocket](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?share=pocket&nb=1)
- [Click to share on Tumblr (Opens in new window)Tumblr](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?share=tumblr&nb=1)
- [Click to share on Telegram (Opens in new window)Telegram](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?share=telegram&nb=1)
- [Click to share on WhatsApp (Opens in new window)WhatsApp](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?share=whatsapp&nb=1)

**Categories:**[Advanced](https://developer.wordpress.org/news/category/advanced/), [Blocks](https://developer.wordpress.org/news/category/blocks/)

**Tags:**[Block development](https://developer.wordpress.org/news/tag/block-development/), [Interactivity API](https://developer.wordpress.org/news/tag/interactivity-api/)

## 28 responses to “An introduction to block-based mega menus”

01. ![Koji Kuno Avatar](https://secure.gravatar.com/avatar/ff3d598c181d4f383d68b9ef06b4a6e10eec49b4054cadf9c2d4641f54c154c9?s=40&d=identicon&r=g)







    Koji Kuno





    [March 1, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-3415)







    I tried it, but it looks like I need to add a “ closing tag “ at the point where the SVG icon is added.





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=3415#respond)




    1. ![Nick Diego Avatar](https://secure.gravatar.com/avatar/5d499534bfc21eaf9fa55506d50ffa01881d9a6cba58935552d3a8ac45944c29?s=40&d=identicon&r=g)







       [Nick Diego](https://profiles.wordpress.org/ndiego/)





       [March 1, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-3417)







       Thanks for catching that, and I apologize for the confusion! There was a missing `</path>` element. The code example in the article has been updated.





       [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=3417#respond)
02. ![Constantine Vasilyev Avatar](https://secure.gravatar.com/avatar/c398eaf0052bb31e8f76dfb514ee474d27d8b172b746fac80959c7fc7b975f53?s=40&d=identicon&r=g)







    Constantine Vasilyev





    [March 1, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-3419)







    Great example! Thank you.





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=3419#respond)

03. ![Damien Chantelouve Avatar](https://secure.gravatar.com/avatar/a25b9a9d78fe2ea1c833f6b183ac2c6fb8210896a816c2d0d124e87b9884fde9?s=40&d=identicon&r=g)







    [Damien Chantelouve](https://dam.cht.lv/)





    [March 5, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-3452)







    Interesting post!


    Thanks for the mega menu and interactivity api in-depth explanations 🙂





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=3452#respond)

04. ![Phil Avatar](https://secure.gravatar.com/avatar/db050bb8631f7956d3e017b02754ac0a75cfc0eee7b9bf2d11b9924aa0f63d1e?s=40&d=identicon&r=g)







    [Phil](https://philby.ch/)





    [March 7, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-3476)







    Excellent post!


    Working through it, trying to wrap my old head around all this new-fangled JS magic.


    Small typo in the edit.js at around 1/3rd of the post jumps at my static html-hardened eyes:


    return (


    <div { …useBlockProps() }< <– closing bracket



    Thanks, Phil





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=3476#respond)




    1. ![Nick Diego Avatar](https://secure.gravatar.com/avatar/5d499534bfc21eaf9fa55506d50ffa01881d9a6cba58935552d3a8ac45944c29?s=40&d=identicon&r=g)







       [Nick Diego](https://profiles.wordpress.org/ndiego/)





       [March 7, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-3477)







       Thanks Phil, just fixed it!





       [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=3477#respond)
05. ![MD JOYNAL ABEDIN Avatar](https://secure.gravatar.com/avatar/8af61a9102fc8dde87881b7cbb9707071bf5aeefb439d9840d2a628586ae6048?s=40&d=identicon&r=g)







    [MD JOYNAL ABEDIN](http://weelve.com/)





    [March 11, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-3771)







    Thanks for Mega Menus.



    its a great documentation for learning too





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=3771#respond)

06. ![Tamika Steyn Avatar](https://secure.gravatar.com/avatar/c431f4f98f7badfc37b866a37fd6cd86aee55623f0c1ce020bcc436f42fb7a5d?s=40&d=identicon&r=g)







    Tamika Steyn





    [April 1, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-4200)







    Hi Nick !



    Love the concept of this plugin – I am an intermediate web dev at best and brand-newbie wordpress user. And was wondering if you could help answer what I hope to be a quick fix. I’ve got the plugin – set it up – can see it loading in the dom all good. But I cannot figure out why there is an inline styled left property of -800 ( this isn’t being called from the block linked css – it’s not being called from any css and it being displayed inline ) this caused the block to display outside of the viewport and for the life of me, cannot figure out where this left property is being called from. And being such a new feature I can’t find any other info online.


    ANY advice would be so greatly appreciated. Thankyou





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=4200#respond)




    1. ![Nick Diego Avatar](https://secure.gravatar.com/avatar/5d499534bfc21eaf9fa55506d50ffa01881d9a6cba58935552d3a8ac45944c29?s=40&d=identicon&r=g)







       [Nick Diego](https://profiles.wordpress.org/ndiego/)





       [April 1, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-4202)







       Hi Tamika, are you using the code in the tutorial, or experimenting with the [expanded version](https://github.com/ndiego/mega-menu-block) of the plugin on GitHub?





       [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=4202#respond)




       1. ![Tamika Avatar](https://secure.gravatar.com/avatar/c431f4f98f7badfc37b866a37fd6cd86aee55623f0c1ce020bcc436f42fb7a5d?s=40&d=identicon&r=g)







          Tamika





          [April 1, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-4204)







          Hey Nick –



          Thanks for taking the time to reply – have been binge watching your content this week.



          I’m using the github version, installed on a live site





          [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=4204#respond)




          1. ![Nick Diego Avatar](https://secure.gravatar.com/avatar/5d499534bfc21eaf9fa55506d50ffa01881d9a6cba58935552d3a8ac45944c29?s=40&d=identicon&r=g)







             [Nick Diego](https://profiles.wordpress.org/ndiego/)





             [April 1, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-4205)







             Gotcha, so the experimental plugin on GitHub is not designed to work with all themes. You will likely need to fork the plugin and modify it to suit your needs. The CSS is applied dynamically via JavaScript. You can view the source [here](https://github.com/ndiego/mega-menu-block/blob/35cb5893f826b7a1ab685c3998625490e62e77fd/src/view.js#L113).





             [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=4205#respond)




             1. ![Tamika Steyn Avatar](https://secure.gravatar.com/avatar/c431f4f98f7badfc37b866a37fd6cd86aee55623f0c1ce020bcc436f42fb7a5d?s=40&d=identicon&r=g)







                Tamika Steyn





                [April 2, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-4216)







                I feel like this is unlikely as I am building a theme – currently it’s a shell with nothing but some colour styling. But thankyou for providing the js code, will see if I can play with it.



                Thankyou again! 🙂
07. ![Zuhier Avatar](https://secure.gravatar.com/avatar/57f65c800aee1f65a51a21a30679c20fa1b1b0841c64322d3c3f858cea1d22c8?s=40&d=identicon&r=g)







    Zuhier





    [April 3, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-4252)







    Hey Nick. Wonderful Plugin! could I know if this plugin able to do multi level work? let say another dropdown within the mega menu or that part require own creativity to make it work?





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=4252#respond)




    1. ![Nick Diego Avatar](https://secure.gravatar.com/avatar/5d499534bfc21eaf9fa55506d50ffa01881d9a6cba58935552d3a8ac45944c29?s=40&d=identicon&r=g)







       [Nick Diego](https://profiles.wordpress.org/ndiego/)





       [April 3, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-4258)







       Conceptually, this would work. But I almost guarantee that you would need to do some additional custom development on the plugin. It’s a great foundation, but not a complete solution for all use cases.





       [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=4258#respond)
08. ![Dave Avatar](https://secure.gravatar.com/avatar/2156fb643b7d3d0b54439cc3e8e144251f26b971cdf5c4469e5b4030526ebd2e?s=40&d=identicon&r=g)







    Dave





    [April 18, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-5331)







    Up until the section titled, “Adding the Editor user interface,” it was working as described. I am not sure what happened.





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=5331#respond)

09. ![Dave Avatar](https://secure.gravatar.com/avatar/2156fb643b7d3d0b54439cc3e8e144251f26b971cdf5c4469e5b4030526ebd2e?s=40&d=identicon&r=g)







    Dave





    [April 19, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-5343)







    I got it working, thanks. Please let me know if there is a way to remove the “marker” from the mega menu list item (disc) and assign a hover color to the text of it.





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=5343#respond)




    1. ![Nick Diego Avatar](https://secure.gravatar.com/avatar/5d499534bfc21eaf9fa55506d50ffa01881d9a6cba58935552d3a8ac45944c29?s=40&d=identicon&r=g)







       [Nick Diego](https://profiles.wordpress.org/ndiego/)





       [April 22, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-5565)







       Hi Dave, you would need to do this with custom CSS. You can add it to the `style.scss` file.





       [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=5565#respond)




       1. ![Dave Avatar](https://secure.gravatar.com/avatar/2156fb643b7d3d0b54439cc3e8e144251f26b971cdf5c4469e5b4030526ebd2e?s=40&d=identicon&r=g)







          Dave





          [April 22, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-5566)







          Thanks, it actually must have been something cached since it is displaying fine in that way since clearing that all out. I have other questions now, though:



          1\. I tried to implement the new files (from scratch) from GitHub that have additional functionality, like the arrow next to the menu item, but it didn’t show correctly. With my very limited programming abilities, I think it boiled down to a problem with the node modules and not having the correct ones. With the example on this page, we start with this:



          npx @wordpress/create-block@latest mega-menu-block –variant=dynamic –wp-env



          So, what is initial line of code to load the node modules for the version on GitHub? Also, with all the mods the menu version on this page loads (over 200 MB), how do I get rid of unnecessary ones and keep the necessary dependencies?



          2\. I tried to make changes to style.scss (changing the width of the menu container… width: var(–wp–style–global–wide-size); but it did not work. I ended up writing a new rule in my regular CSS file that targeted that in order to change the width.



          3\. Also, is there any mobile support at the moment, or is that still in development? Thanks





          [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=5566#respond)




          1. ![Nick Diego Avatar](https://secure.gravatar.com/avatar/5d499534bfc21eaf9fa55506d50ffa01881d9a6cba58935552d3a8ac45944c29?s=40&d=identicon&r=g)







             [Nick Diego](https://profiles.wordpress.org/ndiego/)





             [April 22, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-5567)







             The code on GitHub is very experimental and is design to be a starting point for additional development. For example, there is no mobile support, but it could be added if you wanted to build it. I strongly recommend that the Mega Menu Block (as it stands on GitHub) **not** be used on production sites unless you have thoroughly modified it to work well within your theme.



             Warnings aside, here’s a helpful doc about ensuring you have the correct [Node.js development environment](https://developer.wordpress.org/block-editor/getting-started/devenv/nodejs-development-environment/). If you follow that, you should have no issues running the commands in this article. This article on the [JavaScript build process](https://developer.wordpress.org/block-editor/getting-started/fundamentals/javascript-in-the-block-editor/) should also be helpful.





             [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=5567#respond)

          2. ![Mr Russell Davies Avatar](https://secure.gravatar.com/avatar/9563ffc9ffdda56ee9f46a86e910a083c48fda542af0f9f8712b7c4ee374f799?s=40&d=identicon&r=g)







             Mr Russell Davies





             [October 13, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-12721)







             Hi, i see you also had an issue changing the width of the menu. Can you show me how you resolved this? I’m also struggling to set the width of the mega menu to full width.





             [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=12721#respond)




             1. ![Dave Avatar](https://secure.gravatar.com/avatar/2156fb643b7d3d0b54439cc3e8e144251f26b971cdf5c4469e5b4030526ebd2e?s=40&d=identicon&r=g)







                Dave





                [October 15, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-12738)







                I never went farther with this since I am not a developer. I also realized that this implementation is highly experimental and not designed for live sites. I kept my simple dropdown on navigation items with submenus.
10. ![Anne-Mieke Bovelett Avatar](https://secure.gravatar.com/avatar/1df57b0cdbd7546df026bf2f6b3afc0de88929180faac23629ca6da253017071?s=40&d=identicon&r=g)







    [Anne-Mieke Bovelett](https://bovelett.eu/)





    [May 14, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-6042)







    Hey Nick,


    This is great! Forgive me if this is a naive question, I’m not a hard core coder. How would you go about adding support for a heading over each menu with an automatic ID, and aria-labelledby?





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=6042#respond)

11. ![Mr Russell Davies Avatar](https://secure.gravatar.com/avatar/9563ffc9ffdda56ee9f46a86e910a083c48fda542af0f9f8712b7c4ee374f799?s=40&d=identicon&r=g)







    [Mr Russell Davies](http://tanzaniaodyssey.com%20-%20in%20dev/)





    [August 3, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-8194)







    Hi, this is a really excellent plugin but the mega menu only displays on click of the main menu item. Is it possible to make it work on hover?





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=8194#respond)




    1. ![Nick Diego Avatar](https://secure.gravatar.com/avatar/5d499534bfc21eaf9fa55506d50ffa01881d9a6cba58935552d3a8ac45944c29?s=40&d=identicon&r=g)







       [Nick Diego](https://profiles.wordpress.org/ndiego/)





       [August 5, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-8337)







       Yup it should be possible, but the [source code](https://github.com/ndiego/mega-menu-block) for this experimental plugin would need to be modified.





       [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=8337#respond)
12. ![Huan Avatar](https://secure.gravatar.com/avatar/1ac80e2d5ca9079d8cf1cc29f968e56e1ac98ed1fdad537139c5267bcbedfab0?s=40&d=identicon&r=g)







    [Huan](https://profiles.wordpress.org/daodaotw/)





    [September 25, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-12278)







    Thank you for this great intro.



    I thought \`allowedFormats\` in \`RichText\` wouldn’t work in dynamic blocks. I tested your playground link from [https://github.com/ndiego/mega-menu-block](https://github.com/ndiego/mega-menu-block)


    and \`RichText\` formatting not only didn’t work, but caused issue. \` **\` and \` _\` appeared in frontend._**



    **_For personal project, replacing \`RichText\` with \`core/paragraph\` inner block may be better? How about using none and relying solely on \`TextControl\`?_**





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=12278#respond)




    1. ![Huan Avatar](https://secure.gravatar.com/avatar/1ac80e2d5ca9079d8cf1cc29f968e56e1ac98ed1fdad537139c5267bcbedfab0?s=40&d=identicon&r=g)







       [Huan](https://profiles.wordpress.org/daodaotw/)





       [September 25, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-12279)







       \`strong\` and \`em\` tags got sanitized in previous comment.





       [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=12279#respond)

    2. ![Nick Diego Avatar](https://secure.gravatar.com/avatar/5d499534bfc21eaf9fa55506d50ffa01881d9a6cba58935552d3a8ac45944c29?s=40&d=identicon&r=g)







       [Nick Diego](https://profiles.wordpress.org/ndiego/)





       [September 25, 2024](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-12284)







       Yeah, I see that now. There should be a way to solve this since the Core Navigation Link block uses the `RichText` component. I try and see if I can find a solution later this week and update the demo plugin.





       [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=12284#respond)
13. ![Alfredo Navas Avatar](https://secure.gravatar.com/avatar/da7d307ebfb0adb021f10ce5f9b2c28bbd2d5322250200864fb7cd25470ab4cd?s=40&d=identicon&r=g)







    [Alfredo Navas](https://elpuas.com/)





    [January 13, 2025](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/#comment-15574)







    Hello NicK! thank you for this, I’ve been experimenting with creating dynamic mega menus using the Mega Menu Block, but I’ve run into an issue. Here’s what I’ve tried:



    I created a block pattern with the following metadata:



    “\`



    “\`


    The associated template part is named some.html, and it’s located in the template-parts directory of my theme. I reference the pattern like this:


    “\`





    The template part is successfully created, but it doesn’t appear in the Menu section or on the Mega Menu Block selector.



    Is it possible to dynamically create mega menus this way?





    [Reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/?replytocom=15574#respond)


### Leave a Reply [Cancel reply](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/\#respond)

Your email address will not be published.Required fields are marked \*

Comment \*

Name \*

Email \*

Website

Save my name, email, and website in this browser for the next time I comment.

Notify me of follow-up comments by email.

Notify me of new posts by email.

Δ

## Have an idea for a new post?

### [Learn how to contribute](https://developer.wordpress.org/news/how-to-contribute/)

Share your knowledge with fellow WordPress developers.

### [Review tips and guidelines](https://developer.wordpress.org/news/tips-and-guidelines-for-writers/)

Everything you need to know about writing for the Blog.

## Subscribe to the Blog

Email Address

Subscribe

Join 1,797 other subscribers

- [About](https://wordpress.org/about/)
- [News](https://wordpress.org/news/)
- [Hosting](https://wordpress.org/hosting/)
- [Privacy](https://wordpress.org/about/privacy/)

- [Showcase](https://wordpress.org/showcase/)
- [Themes](https://wordpress.org/themes/)
- [Plugins](https://wordpress.org/plugins/)
- [Patterns](https://wordpress.org/patterns/)

- [Learn](https://learn.wordpress.org/)
- [Documentation](https://wordpress.org/documentation/)
- [Developers](https://developer.wordpress.org/)
- [WordPress.tv ↗](https://wordpress.tv/)

- [Get Involved](https://make.wordpress.org/)
- [Events](https://events.wordpress.org/)
- [Donate ↗](https://wordpressfoundation.org/donate/)
- [Five for the Future](https://wordpress.org/five-for-the-future/)

- [WordPress.com ↗](https://wordpress.com/?ref=wporg-footer)
- [Matt ↗](https://ma.tt/)
- [bbPress ↗](https://bbpress.org/)
- [BuddyPress ↗](https://buddypress.org/)

[WordPress.org](https://wordpress.org/)[WordPress.org](https://wordpress.org/)

- [Visit our X (formerly Twitter) account](https://www.x.com/WordPress)
- [Visit our Bluesky account](https://bsky.app/profile/wordpress.org)
- [Visit our Mastodon account](https://mastodon.world/@WordPress)
- [Visit our Threads account](https://www.threads.net/@wordpress)
- [Visit our Facebook page](https://www.facebook.com/WordPress/)
- [Visit our Instagram account](https://www.instagram.com/wordpress/)
- [Visit our LinkedIn account](https://www.linkedin.com/company/wordpress)
- [Visit our TikTok account](https://www.tiktok.com/@wordpress)
- [Visit our YouTube channel](https://www.youtube.com/wordpress)
- [Visit our Tumblr account](https://wordpress.tumblr.com/)

![Code is Poetry](https://s.w.org/style/images/code-is-poetry-for-dark-bg.svg)

![](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/)

![](https://developer.wordpress.org/news/2024/02/an-introduction-to-block-based-mega-menus/)