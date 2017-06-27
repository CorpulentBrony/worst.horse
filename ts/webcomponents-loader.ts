// adapted from original webcomponents-loader.js script, with modifications to ensure it works with pagespeed.
// I am only loading polyfills as needed and then reverting to original script to ensure WebComponentsReady event fires properly.
// disabling ShadowDOM and CustomElements because I am not currently using them
import * as Util from "./Util";

const WEBCOMPONENTS_PATH: string = "node_modules/@webcomponents/webcomponentsjs/webcomponents-";

declare global {
	export interface CustomElementRegistry {
		forcePolyfill?: any;
	}

	export interface Window {
		Promise: PromiseConstructorLike;
		ShadyDOM: { force?: any; };
		WebComponents: { ready?: boolean; };
		webkitURL: typeof URL;
	}
}

(function(): void {
	window.WebComponents = window.WebComponents || {};
	let polyfills = new Array<"ce" | "hi" | "lite" | "sd">();

	if (!("import" in document.createElement<"link">("link")))
		polyfills.push("hi");

	// if (!("attachShadow" in Element.prototype && "getRootNode" in Element.prototype) || (window.ShadyDOM && window.ShadyDOM.force))
	// 	polyfills.push("sd");

	// if (!window.customElements || window.customElements.forcePolyfill)
	// 	polyfills.push("ce");

	if (!("content" in document.createElement<"template">("template")) || !window.Promise || !Array.from || !(document.createDocumentFragment().cloneNode() instanceof DocumentFragment))
		polyfills = ["lite"];

	if (polyfills.length)
		Util.loadScript({ async: true, src: WEBCOMPONENTS_PATH + polyfills.join("-") + ".js" });
	else {
		const fire = (): void => {
			requestAnimationFrame((): void => {
				window.WebComponents.ready = true;
				document.dispatchEvent(new CustomEvent("WebComponentsReady", { bubbles: true }));
			});
		};

		if (document.readyState !== "loading")
			fire();
		else
			document.addEventListener<"readystatechange">("readystatechange", function wait() {
				fire();
				document.removeEventListener("readystatechange", wait);
			});
	}
})();