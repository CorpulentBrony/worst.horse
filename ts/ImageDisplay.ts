import { Derpibooru } from "./server/Derpibooru";
import * as Util from "./Util";

export class ImageDisplay {
	public readonly object: ImageDisplay.Object;

	public static update(object: ImageDisplay.Object, elementId: string): ImageDisplay {
		const imageDisplay: ImageDisplay = new this(object);
		return imageDisplay.updatePicture(elementId);
	}

	constructor(object: ImageDisplay.Object) { this.object = object; }

	public updatePicture(elementId: string): this {
		Util.addResourceHint({ rel: "preconnect", href: "https://worst.horse" });
		const header: HTMLElement | null = document.getElementById("header");

		if (header !== null)
			header.className = this.object.horse.replace(/ /, "-");
		const element: Element | null = document.getElementById(elementId);
		const currentWidth: number = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || document.getElementsByTagName<"body">("body")[0].clientWidth;
		let preload: HTMLLinkElement | undefined;

		if (element === null)
			throw new TypeError("Supplied element ID does not exist in the DOM.");
		const fragment: DocumentFragment = document.createDocumentFragment();
		const figure: HTMLElement = Util.createElement("figure", {}, fragment);
		const picture: HTMLPictureElement = Util.createElement<HTMLPictureElement>("picture", {}, figure);
		const horseNameFormatted: string = this.object.horse.replace(/^[a-z]| [a-z]/g, (firstLetter: string): string => firstLetter.toUpperCase());

		for (const source of this.object.sources)
			if (source.isDefault) {
				if (preload === undefined)
					preload = Util.addResourceHint({ as: "image", href: source.src, rel: "preload" });
				Util.createElement<HTMLImageElement>("img", { alt: horseNameFormatted + " is worst horse", class: "image", src: source.src, type: this.object.mimeType }, picture);
			}
			else {
				if (preload === undefined && (source.width === undefined || currentWidth < source.width))
					preload = Util.addResourceHint({ as: "image", href: source.src, rel: "preload" });
				Util.createElement<HTMLSourceElement>("source", { media: source.media ? source.media : "(min-width: 0px)", srcset: source.src, type: (source.type !== undefined) ? source.type : this.object.mimeType }, picture);
			}
		const figcaption: HTMLElement = Util.createElement("figcaption", {}, figure);
		Util.createElement<HTMLAnchorElement>("a", { href: this.object.pageUrl }, figcaption, "Image");
		let conjunction: Text = document.createTextNode("");

		if (Array.isArray(this.object.artists) && this.object.artists.length > 0) {
			figcaption.appendChild(document.createTextNode(" by "));
			Util.createElement("cite", {}, figcaption, this.object.artists.join((this.object.artists.length === 2) ? " and " : ", ").replace(/, (?=[^,]+$)/, ", and "));
			conjunction = document.createTextNode(" and");
		}

		if (typeof this.object.sourceUrl === "string" && this.object.sourceUrl.length > 0) {
			figcaption.appendChild(document.createTextNode(" ("));
			Util.createElement<HTMLAnchorElement>("a", { href: this.object.sourceUrl }, figcaption, "source");
			figcaption.appendChild(document.createTextNode(")"));
		}
		figcaption.appendChild(conjunction);
		figcaption.appendChild(document.createTextNode(" hosted on "));
		Util.createElement<HTMLAnchorElement>("a", { href: "https://derpibooru.org" }, figcaption, "Derpibooru");
		figcaption.appendChild(document.createTextNode("."));
		element.appendChild(fragment);
		return this;
	}
}

export namespace ImageDisplay {
	export interface Like {
		readonly html: string;
		readonly source: Derpibooru.Image.Display.Source;
	}

	export interface Object extends Derpibooru.Image.Display.ObjectAggregateArray<string>, Derpibooru.Image.Display.ObjectParticulars<string> {}
}