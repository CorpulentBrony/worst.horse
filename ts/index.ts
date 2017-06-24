import { Buffer } from "buffer";
import { ImageDisplay } from "./ImageDisplay";
import * as Util from "./Util";
import * as WebFontLoader from "webfontloader";

const DESTINATION_ELEMENT_ID: string = "picture";
window.URL = window.URL || (<any>window).webkitURL;

declare global {
	interface HTMLScriptElement {
		addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture: boolean): void;
		addEventListener(type: string, listener: EventListenerOrEventListenerObject, options: Partial<Util.AddEventListenerOptions>): void;
		addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
	}
}

// async function updatePicture(): Promise<void> {
// 	const response: Response = await window.fetch("image?json");

// 	if (!response.ok)
// 		throw new Error("Network error while attempting to update image");
// 	const imageDisplay: ImageDisplay = ImageDisplay.update(await response.json(), DESTINATION_ELEMENT_ID);
// 	console.log("image updated", imageDisplay.object);
// }

async function updatePictureBinary(): Promise<void> {
	const response: Response = await window.fetch("image?binary");

	if (!response.ok)
		throw new Error("Network error while attempting to update image");
	const buffer: ArrayBuffer = await response.arrayBuffer();
	const length: number = (new DataView(buffer)).getUint16(0, false);
	console.log("length is", length);
	const object: ImageDisplay.Object = JSON.parse(Buffer.from(buffer, 2, length).toString("utf8"));
	// const url: string = window.URL.createObjectURL(new Blob(<any>new Uint8Array(buffer, 2 + length)), <any>{ type: "image/png" });
	const url: string = "data:image/png;base64," + Buffer.from(buffer, 2 + length).toString("base64");
	console.log("url is ", url);
	const imageDisplay: ImageDisplay = ImageDisplay.update(object, url, DESTINATION_ELEMENT_ID);
	console.log("image updated", imageDisplay.object);
}

WebFontLoader.load({
	custom: {
		families: ["FontAwesome"],
		urls: ["/node_modules/font-awesome/css/font-awesome.min.css"]
	},
	google: { families: ["Open Sans:300,600,800"] }
});

if (window.fetch)
	updatePictureBinary().catch(console.error);
else {
	const fragment: DocumentFragment = document.createDocumentFragment();
	const script: HTMLScriptElement = Util.createElement<HTMLScriptElement>("script", { async: "", src: "node_modules/whatwg-fetch/fetch.js", type: "application/javascript" }, fragment);
	script.addEventListener("load", (): Promise<void> => updatePictureBinary().catch(console.error), Util.doAddEventListenerOptionsSupport().once ? { once: true } : false);
	document.body.appendChild(fragment);
}