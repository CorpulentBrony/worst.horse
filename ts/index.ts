import { Derpibooru } from "./server/Derpibooru";
import * as WebFontLoader from "webfontloader";
// import "whatwg-fetch";

async function updatePicture(): Promise<void> {
	const response: Response = await window.fetch("image?json");

	if (!response.ok)
		throw new Error("Network error while attempting to update image");
	const object: Derpibooru.Image.Display.Source = await response.json();
	console.log(object);
}

WebFontLoader.load({ google: { families: ["Open Sans"] } });
updatePicture().catch(console.error);