import { ImageDisplay } from "./ImageDisplay";
import * as Polyfills from "./Polyfills";
import * as Util from "./Util";
import * as WebFontLoader from "webfontloader";

import "./webcomponents-loader";

const DESTINATION_ELEMENT_ID: string = "picture";
const LOADING_TEMPLATE_ID: string = "loadingTemplate";
window.URL = window.URL || window.webkitURL;

async function updatePictureBinary(): Promise<void> {
	await Polyfills.webcomponents();
	document.body.appendChild(Util.getTemplateContent(Util.getElementByIdOrError<HTMLTemplateElement>(LOADING_TEMPLATE_ID)).cloneNode(true));
	await Polyfills.fetch();
	const response: Response = await window.fetch("image?binary");

	if (!response.ok)
		throw new Error("Network error while attempting to update image");
	const buffer: ArrayBuffer = await response.arrayBuffer();
	const length: number = (new DataView(buffer)).getUint16(0, false);
	const object: ImageDisplay.Object = JSON.parse(await Util.arrayBufferToString(buffer.slice(2, length + 2), "application/json"));
	const url: string = await Util.arrayBufferToURL(buffer.slice(2 + length), "image/png");
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

updatePictureBinary();