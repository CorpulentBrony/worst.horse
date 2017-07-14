# css
This directory will include CSS and map files generated from [SASS](http://sass-lang.com/) source.  These can be built by running `npm install` from the top directory of this project.

* Files ending in `.css` represent output from SASS transpiling
* Files ending in `.css.map` represent mapping files from CSS to SCSS
* Files ending in `.min.css` represent files that were processed by [postcss](https://github.com/postcss/postcss)
* Files ending in `.min.css.map` represent mapping files from the `.css` files to the `.min.css` files

The actual sources for these files is in the [`scss`](../scss) directory.