import { Buffer } from "buffer";
import { ImageDisplay } from "./ImageDisplay";
import * as Util from "./Util";
import * as WebFontLoader from "webfontloader";

import "./webcomponents-loader";

const DESTINATION_ELEMENT_ID: string = "picture";
const LOADING_TEMPLATE_ID: string = "loadingTemplate";

window.URL = window.URL || window.webkitURL;
// document.body.appendChild(Util.getTemplateContent(Util.getElementByIdOrError<HTMLTemplateElement>(LOADING_TEMPLATE_ID)).cloneNode(true));

// function runUpdatePictureBinary(): void {
// 	if (window.fetch)
// 		updatePictureBinary().catch(console.error);
// 	else
// 		Util.loadScript({ async: true, src: "node_modules/whatwg-fetch/fetch.js" }, (): Promise<void> => updatePictureBinary().catch(console.error));
// }

async function updatePictureBinary(): Promise<void> {
	// const loadingShadow: HTMLDivElement = Util.createElement<HTMLDivElement>("div", { id: "loading-shadow" });
	// loadingShadow.attachShadow({ mode: "closed" }).appendChild(Util.getTemplateContent(Util.getElementByIdOrError<HTMLTemplateElement>(LOADING_TEMPLATE_ID)).cloneNode(true));
	// document.body.appendChild(loadingShadow);
	document.body.appendChild(Util.getTemplateContent(Util.getElementByIdOrError<HTMLTemplateElement>(LOADING_TEMPLATE_ID)).cloneNode(true));

	if (!window.fetch)
		await Util.loadScriptPromise({ async: true, src: "node_modules/whatwg-fetch/fetch.js" });
	const response: Response = await window.fetch("image?binary");

	if (!response.ok)
		throw new Error("Network error while attempting to update image");
	const buffer: ArrayBuffer = await response.arrayBuffer();
	const length: number = (new DataView(buffer)).getUint16(0, false);
	const object: ImageDisplay.Object = JSON.parse(Buffer.from(buffer, 2, length).toString("utf8"));
	// const url: string = window.URL.createObjectURL(new Blob(<any>new Uint8Array(buffer, 2 + length)), <any>{ type: "image/png" });
	const url: string = "data:image/png;base64," + Buffer.from(buffer, 2 + length).toString("base64");
	const imageDisplay: ImageDisplay = ImageDisplay.update(object, url, DESTINATION_ELEMENT_ID);
	console.log("image updated", imageDisplay.object);
}

WebFontLoader.load({
	custom: {
		families: ["FontAwesome"],
		urls: ["/node_modules/font-awesome/css/font-awesome.min.css"]
	},
	google: { families: ["Open Sans:300,600,800", "Press Start 2P"] }
});

// if (window.customElements)
// 	Util.loadScript({ async: true, src: "node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js" });
// else
// 	Util.loadScript({ async: true, src: "node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js" }, (): void => Util.loadScript({ async: true, src: "node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js" }));

if (window.WebComponents && !window.WebComponents.ready)
	window.addEventListener("WebComponentsReady", function onWebComponentsReady(): void {
		updatePictureBinary();
		window.removeEventListener("WebComponentsReady", onWebComponentsReady);
	});
else
	updatePictureBinary();