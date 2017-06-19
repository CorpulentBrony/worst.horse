import { Derpibooru } from "./server/Derpibooru";

export class ImageDisplay {
	private _figure: HTMLElement;
	private _picture: HTMLPictureElement;
	public readonly object: ImageDisplay.Object;

	constructor(object: ImageDisplay.Object) { this.object = object; }

	private get figure(): HTMLElement { return (this._figure) ? this._figure : this._figure = document.createElement("figure"); }
	private get picture(): HTMLPictureElement { return (this._picture) ? this._picture : this._picture = document.createElement<"picture">("picture"); }

	public get html(): string {
		for (const source of this.object.sources) {
			return "hello";
		}
	}
}

export namespace ImageDisplay {
	export interface Like {
		readonly html: string;
		readonly source: Derpibooru.Image.Display.Source;
	}

	export interface Object extends Derpibooru.Image.Display.AggregatesArray, Derpibooru.Image.Display.ObjectNonAggregate {}
}