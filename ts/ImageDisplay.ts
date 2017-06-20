import { Derpibooru } from "./server/Derpibooru";

export class ImageDisplay {
	public readonly object: ImageDisplay.Object;

	private static createElement<T extends HTMLElement = HTMLElement>(name: string, attributes: { [property: string]: string } = {}, parent?: Node, text?: string): T {
		const result: T = <T>document.createElement(name);

		for (const property in attributes)
			result.setAttribute(property, attributes[property]);

		if (text && text.length > 0)
			result.appendChild(document.createTextNode(text));

		if (parent)
			parent.appendChild(result);
		return result;
	}

	public static update(object: ImageDisplay.Object, elementId: string): ImageDisplay {
		const imageDisplay: ImageDisplay = new this(object);
		return imageDisplay.updatePicture(elementId);
	}

	constructor(object: ImageDisplay.Object) { this.object = object; }

	public updatePicture(elementId: string): this {
		const element: Element | null = document.getElementById(elementId);

		if (element === null)
			throw new TypeError("Supplied element ID does not exist in the DOM.");
		const fragment: DocumentFragment = document.createDocumentFragment();
		const figure: HTMLElement = ImageDisplay.createElement("figure", {}, fragment);
		const picture: HTMLPictureElement = ImageDisplay.createElement<HTMLPictureElement>("picture", {}, figure);

		// const figure: HTMLElement = document.createElement("figure");
		// const picture: HTMLPictureElement = document.createElement<"picture">("picture");

		for (const source of this.object.sources) {
			// let element: HTMLImageElement | HTMLSourceElement;

			if (source.isDefault) {
				ImageDisplay.createElement<HTMLImageElement>("img", { alt: "Applejack is worst horse", class: "image", src: source.src, type: this.object.mimeType }, picture);
				// element = document.createElement<"img">("img");
				// element.setAttribute("alt", "Applejack is worst horse");
				// element.setAttribute("class", "image");
				// element.setAttribute("src", source.src);
				// element.setAttribute("type", this.object.mimeType);
			} else {
				ImageDisplay.createElement<HTMLSourceElement>("source", { media: source.media ? source.media : "(all)", srcset: source.src, type: (source.type !== undefined) ? source.type : this.object.mimeType }, picture);
				// element = document.createElement<"source">("source");
				// element.setAttribute("media", source.media ? source.media : "(all)");
				// element.setAttribute("srcset", source.src);
				// element.setAttribute("type", (source.type !== undefined) ? source.type : this.object.mimeType);
			}
			// picture.appendChild(element);
		}
		// figure.appendChild(picture);
		const figcaption: HTMLElement = ImageDisplay.createElement("figcaption", {}, figure);
		// const figcaption: HTMLElement = document.createElement("figcaption");
		ImageDisplay.createElement<HTMLAnchorElement>("a", { href: this.object.pageUrl }, figcaption, "Image");
		// const imageAnchor: HTMLAnchorElement = document.createElement<"a">("a");
		// imageAnchor.setAttribute("href", this.object.pageUrl);
		// imageAnchor.appendChild(document.createTextNode("Image"));
		// figcaption.appendChild(imageAnchor);
		let conjunction: Text = document.createTextNode("");

		if (Array.isArray(this.object.artists) && this.object.artists.length > 0) {
			figcaption.appendChild(document.createTextNode(" by "));
			ImageDisplay.createElement("cite", {}, figcaption, this.object.artists.join((this.object.artists.length === 2) ? " and " : ", ").replace(/, (?=[^,]+$)/, ", and "));
			// const cite: HTMLElement = document.createElement("cite");
			// cite.appendChild(document.createTextNode(this.object.artists.join((this.object.artists.length === 2) ? " and " : ", ").replace(/, (?=[^,]+$)/, ", and ")));
			// figcaption.appendChild(cite);
			conjunction = document.createTextNode(" and");
		}

		if (typeof this.object.sourceUrl === "string" && this.object.sourceUrl.length > 0) {
			figcaption.appendChild(document.createTextNode(" ("));
			ImageDisplay.createElement<HTMLAnchorElement>("a", { href: this.object.sourceUrl }, figcaption, "source");
			// const sourceAnchor: HTMLAnchorElement = document.createElement<"a">("a");
			// sourceAnchor.setAttribute("href", this.object.sourceUrl);
			// sourceAnchor.appendChild(document.createTextNode("source"));
			// figcaption.appendChild(sourceAnchor);
			figcaption.appendChild(document.createTextNode(")"));
		}
		figcaption.appendChild(conjunction);
		figcaption.appendChild(document.createTextNode(" hosted on "));
		ImageDisplay.createElement<HTMLAnchorElement>("a", { href: "https://derpibooru.org" }, figcaption, "Derpibooru");
		// const derpibooruAnchor: HTMLAnchorElement = document.createElement<"a">("a");
		// derpibooruAnchor.setAttribute("href", "https://derpibooru.org");
		// figcaption.appendChild(derpibooruAnchor);
		figcaption.appendChild(document.createTextNode("."));
		// figure.appendChild(figcaption);
		// fragment.appendChild(figure);
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