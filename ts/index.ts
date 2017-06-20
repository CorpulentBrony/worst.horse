import { Derpibooru } from "./server/Derpibooru";
import { ImageDisplay } from "./ImageDisplay";
import * as WebFontLoader from "webfontloader";
// import "whatwg-fetch";

async function updatePicture(): Promise<void> {
	const response: Response = await window.fetch("image?json");

	if (!response.ok)
		throw new Error("Network error while attempting to update image");
	const imageDisplay: ImageDisplay = ImageDisplay.update(await response.json(), "picture");
	console.log("image updated");
}

WebFontLoader.load({ google: { families: ["Open Sans"] } });
updatePicture().catch(console.error);