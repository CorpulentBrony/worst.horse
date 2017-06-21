# bin
This directory contains various tools used by `npm install` to build JavaScript and CSS files.

<dl>
	<dt><code>browserify</code></dt>
	<dd>Link to the local install of <code>browserify</code></dd>
	<dt><code>build</code></dt>
	<dd>
		Small build script that performs the following actions in order:
		<ul>
			<li>Updates submodules from <code>git</code></li>
			<li>Cleans out <code>js</code> directory</li>
			<li>Transpiles client side of application</li>
			<li>Combines modules in resultant build of client side of application into a single JavaScript file</li>
			<li>Cleans out <code>css</code> directory</li>
			<li>Transpiles CSS</li>
			<li>Transpiles server side of application</li>
			<li>Makes resultant <code>image.js</code> server side entry point executable</li>
		</ul>
	</dd>
	<dt><code>exorcist</code></dt>
	<dd>Link to the local install of <code>exorcist</code></dd>
	<dt><code>github</code></dt>
	<dd>Small script that updates the local <code>git</code> and the remote repository on <a href="https://github.com/CorpulentBrony/worst.horse">Github</a></dd>
	<dt><code>tsc</code></dt>
	<dd>Link to the local intall of <code>tsc</code></dd>
	<dt><code>uglifyjs</code></dt>
	<dd>Link to the local install of <code>uglify-es</code></dd>
</dl>