# bin
This directory contains various tools used by `npm install` to build [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript), [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS), and [JSON-LD](https://json-ld.org/) files.

<dl>
	<dt><code><a href="http://browserify.org/">browserify</a></code></dt>
	<dd>Link to the local install of <code>browserify</code></dd>
	<dt><code>build [css | js | json | server | web | all] [debug]</code></dt>
	<dd>
		Small build script with two parameters.  The first can be:
		<dl>
			<dt><code>css</code></dt>
			<dd>Will build all CSS files into the <code><a href="../css">css</a></code> directory</dd>
			<dt><code>web</code></dt>
			<dd>Will build all client side JS files into the <code><a href="../js">js</a></code> directory and will minify JSON-LD files in the <code><a href="../template">template</a></code> directory</dd>
			<dt><code>server</code></dt>
			<dd>Will build all server side JS files into the <code><a href="../js/server">js/server</a></code> directory</dd>
			<dt><code>js</code></dt>
			<dd>Will build all JS files into the <code>js</code> directory.  Basically equivalent of running <code>web</code> and <code>server</code>, except this command will clear the <code>js</code> directory first and will not minify JSON-LD files</dd>
			<dt><code>json</code></dt>
			<dd>Will minify JSON-LD files in the <code>template</code> directory</dd>
			<dt><code>all</code></dt>
			<dd>Will build all CSS files into the <code>css</code> directory, all JS files into the <code>js</code> directory, and minify JSON-LD files in the <code>template</code> directory.  Basically the equivalent of running <code>web</code> and <code>server</code></dd>
		</dl>
		The second parameter, if given with the value of <code>debug</code>, will skip any minification steps (except currently for the <code><a href="https://github.com/ben-ng/minifyify">minifyify</a></code> step of <code>browserify</code>).  What the build script will do based on these two parameters:
		<dl>
			<dt>If first parameter is <code>js</code>, <code>server</code>, <code>web</code>, or <code>all</code></dt>
			<dd>Updates submodules from <code><a href="https://git-scm.com/">git</a></code></dd>
			<dt>If first parameter is <code>js</code> or <code>all</code></dt>
			<dd>Cleans out <code>js</code> directory</dd>
			<dt>If first parameter is <code>js</code>, <code>web</code>, or <code>all</code></dt>
			<dd>
				<ul>
					<li>Transpiles client side of application</li>
					<li>Combines modules in resultant build of client side of application into a single JavaScript file</li>
					<li>Runs resultant file through <code><a href="https://github.com/mishoo/UglifyJS2">uglifyjs</a></code> if the second parameter is not <code>debug</code>; otherwise, just copies the file from above</li>
					<li>Fixes source maps using <code><a href="https://github.com/Rich-Harris/sorcery">sorcery</a></code></li>
				</ul>
			</dd>
			<dt>If first parameter is <code>json</code>, <code>web</code>, or <code>all</code></dt>
			<dd>Will minify JSON-LD files if the second parameter is not <code>debug</code>; otherwise, just copies the file</dd>
			<dt>If first parameter is <code>css</code> or <code>all</code></dt>
			<dd>
				<ul>
					<li>Cleans out the <code>css</code> directory</li>
					<li>Transpiles CSS</li>
					<li>Runs the resultant file through <code><a href="https://github.com/postcss/postcss">postcss</a></code> using <code><a href="https://github.com/postcss/autoprefixer">autoprefixer</a></code> and <code><a href="https://github.com/ben-eb/cssnano">cssnano</a></code> if the second parameter is not <code>debug</code>; otherwise, just copies the file from above</li>
					<li>Fixes source maps using <code>sorcery</code></li>
				</ul>
			</dd>
			<dt>If first parameter is <code>js</code>, <code>server</code>, or <code>all</code></dt>
			<dd>
				<ul>
					<li>Transpiles the server side of application</li>
					<li>Makes resultant <code>image.js</code> server side entry point executable</li>
				</ul>
			</dd>
		</dl>
	</dd>
	<dt><code><a href="https://github.com/thlorenz/exorcist">exorcist</a></code></dt>
	<dd>Link to the local install of <code>exorcist</code></dd>
	<dt><code>github</code></dt>
	<dd>Small script that updates the local <code>git</code> and the remote repository on <a href="https://github.com/CorpulentBrony/worst.horse">Github</a></dd>
	<dt><code><a href="https://github.com/kangax/html-minifier">html-minifier</a></code></dt>
	<dd>Link to the local install of <code>html-minifier</code></dd>
	<dt><code>postcss</code></dt>
	<dd>Link to the local install of <code><a href="https://github.com/postcss/postcss-cli">postcss-cli</a></code></dd>
	<dt><code>sorcery</code></dt>
	<dd>Link to the local intall of <code>sorcery</code></dd>
	<dt><code><a href="https://www.typescriptlang.org/">tsc</a></code></dt>
	<dd>Link to the local intall of <code>tsc</code></dd>
	<dt><code>uglifyjs</code></dt>
	<dd>Link to the local install of <code>uglify-js</code></dd>
</dl>