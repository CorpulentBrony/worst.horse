import { Derpibooru } from "./server/Derpibooru";
import * as Polyfills from "./Polyfills";
import * as Util from "./Util";

const ANCHOR_IMAGE_ID: string = "anchorImage";
const ANCHOR_SOURCE_ID: string = "anchorSource";
const CITE_AUTHOR_ID: string = "citeAuthor";
const IF_AUTHOR_CLASS: string = "ifAuthor";
const IF_SOURCE_ID: string = "ifSource";
const LOADING_DIV_ID: string = "loading";
const PICTURE_ELEMENT_ID: string = "pictureElement";
const TEMPLATE_ID: string = "pictureTemplate";

type TemplateDocumentFragment = DocumentFragment & { getElementsByClassName(className: string): NodeListOf<Element>; };

export class ImageDisplay {
	private _anchorImage: HTMLAnchorElement;
	private _anchorSource: HTMLAnchorElement;
	private _citeAuthor: HTMLElement;
	private _element: HTMLElement;
	private _picture: HTMLPictureElement;
	private _preload: HTMLLinkElement | undefined;
	private _template: TemplateDocumentFragment;
	public readonly elementId: string;
	public readonly object: ImageDisplay.Object;
	public readonly placeholder: string;

	public static update(object: ImageDisplay.Object, url: string, elementId: string): ImageDisplay {
		const imageDisplay: ImageDisplay = new this(object, url, elementId);
		return imageDisplay.updatePicture();
	}

	constructor(object: ImageDisplay.Object, url: string, elementId: string) { [this.elementId, this.object, this.placeholder] = [elementId, object, url]; }

	private get anchorImage(): HTMLAnchorElement { return (this._anchorImage) ? this._anchorImage : this._anchorImage = <HTMLAnchorElement>Util.getElementByIdOrError(ANCHOR_IMAGE_ID, this.template); }
	private get anchorSource(): HTMLAnchorElement { return (this._anchorSource) ? this._anchorSource : this._anchorSource = <HTMLAnchorElement>Util.getElementByIdOrError(ANCHOR_SOURCE_ID, this.template); }
	private get citeAuthor(): HTMLElement { return (this._citeAuthor) ? this._citeAuthor : this._citeAuthor = Util.getElementByIdOrError(CITE_AUTHOR_ID, this.template); }

	private get element(): HTMLElement {
		if (this._element)
			return this._element;
		const element: HTMLElement = Util.getElementByIdOrError(this.elementId);

		while (element.firstChild)
			element.removeChild(element.firstChild);
		return this._element = element;
	}

	private get picture(): HTMLPictureElement { return (this._picture) ? this._picture : this._picture = Util.getElementByIdOrError(PICTURE_ELEMENT_ID, this.template); }
	private get preload(): string | undefined { return (this._preload) ? this._preload.href : undefined; }

	private get template(): TemplateDocumentFragment {
		if (this._template)
			return this._template;
		const template = <DocumentFragment & { getElementsByClassName?(className: string): ArrayLike<Element>; }>Util.getTemplateContent(Util.getElementByIdOrError<HTMLTemplateElement>(TEMPLATE_ID)).cloneNode(true);

		if (!template.getElementById)
			template.getElementById = function(elementId: string): HTMLElement | null { return <HTMLElement | null>template.querySelector("#" + elementId); }

		if (!template.getElementsByClassName)
			template.getElementsByClassName = function(className: string): NodeListOf<Element> { return template.querySelectorAll("." + className); }
		return this._template = <TemplateDocumentFragment>template;
	}

	private set preload(href: string | undefined) { if (this.preload === undefined && href !== undefined) this._preload = Util.addResourceHint({ as: "image", href, rel: "preload" }); }

	public updatePicture(): this {
		Util.addResourceHint({ rel: "preconnect", href: "https://worst.horse" });
		Util.doIfElementExistsById<HTMLElement>("header", (header: HTMLElement): void => { header.className = this.object.horse.replace(/ /, "-"); });
		const placeholderSrc: string = this.placeholder;
		const placeholder: HTMLImageElement = Util.createElement<HTMLImageElement>("img", { alt: "Loading worst horse...", class: "image", src: placeholderSrc, type: "image/png" }, this.element);
		const currentWidth: number = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || document.getElementsByTagName<"body">("body")[0].clientWidth;
		let preload: HTMLLinkElement | undefined;
		const horseNameFormatted: string = this.object.horse.replace(/^[a-z]| [a-z]/g, (firstLetter: string): string => firstLetter.toUpperCase());

		for (const source of this.object.sources)
			if (source.isDefault) {
				this.preload = source.src;
				const img: HTMLImageElement = Util.createElement<HTMLImageElement>("img", { alt: horseNameFormatted + " is worst horse", class: "hidden image", src: source.src, type: this.object.mimeType }, this.picture);
				img.addEventListener<"error">("error", function onError(): void {
					console.log("there was an error loading the image, falling back to default image");
					img.src = "/image";
					img.removeEventListener("error", onError);
				});
				img.addEventListener<"load">("load", function onLoad(): void {
					Polyfills.ChildNode.remove();
					placeholder.remove();

					if ("URL" in window && "revokeObjectURL" in window.URL)
						window.URL.revokeObjectURL(placeholderSrc);
					img.classList.remove("hidden");
					Util.doIfElementExistsById<HTMLElement>("footer", (footer: HTMLElement): void => footer.classList.remove("hidden"));
					Util.doIfElementExistsById<HTMLDivElement>(LOADING_DIV_ID, (div: HTMLDivElement): void => div.remove());
					img.removeEventListener("load", onLoad);
				});
			}
			else {
				if (source.width === undefined || currentWidth < source.width)
					this.preload = source.src;
				Util.createElement<HTMLSourceElement>("source", { media: source.media ? source.media : "(min-width: 0px)", srcset: source.src, type: (source.type !== undefined) ? source.type : this.object.mimeType }, this.picture);
			}
		this.anchorImage.href = this.object.pageUrl;

		if (Array.isArray(this.object.artists) && this.object.artists.length > 0)
			this.citeAuthor.innerText = this.object.artists.join((this.object.artists.length === 2) ? " and " : ", ").replace(/, (?=[^,]+$)/, ", and ");
		else
			Array.prototype.forEach.call(this.template.getElementsByClassName(IF_AUTHOR_CLASS), (element: Element): void => element.classList.add("hidden"));

		if (typeof this.object.sourceUrl === "string" && this.object.sourceUrl.length > 0)
			this.anchorSource.href = this.object.sourceUrl;
		else
			Util.getElementByIdOrError(IF_SOURCE_ID, this.template).classList.add("hidden");
		this.element.appendChild(this.template);
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