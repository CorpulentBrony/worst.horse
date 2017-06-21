import { Derpibooru } from "../../Derpibooru";
import { Image } from "../Image";
import { Map } from "../../../CustomTypes/Map";
import * as Path from "path";
import * as Process from "process";
import { Set } from "../../../CustomTypes/Set";
import * as Url from "url";

export class Display implements Display.Like {
	private static scaleDefinitions = new Map<keyof Image.Representations, Display.ScaleDefinition>([
		["thumb_tiny", { height: 50, scale: "longest", width: 50 }],
		["thumb_small", { height: 150, scale: "longest", width: 150 }],
		["thumb", { height: 250, scale: "longest", width: 250 }],
		["small", { height: 240, scale: "height" }],
		["medium", { height: 600, scale: "height" }],
		["large", { height: 1024, scale: "height" }],
		["tall", { scale: "width", width: 1024 }]
	]);

	private _artists: Set<string>;
	private _aspectRatio: number;
	private _horse: Derpibooru.Horse;
	private _mimeType: string;
	private _pageUrl: Url.URL;
	private _sources: Set<Display.Source>;
	private _sourceUrl: Url.URL | undefined;
	private _subtags: Map<string, Set<string>>;
	public readonly object: Image;
	private isSourceUrlSet: boolean;

	public static fromImage(object: Image): string {
		const display = new this(object);
		return display.toString();
	}

	private static round(x: number): number { return x + 0.5 << 1 >> 1; }

	constructor(object: Image) { [this._subtags, this.isSourceUrlSet, this.object] = [new Map<string, Set<string>>(), false, object]; }

	public get artists(): Set<string> { return (this._artists) ? this._artists : this._artists = this.getSubtags("artist"); }
	private get aspectRatio(): number { return (this._aspectRatio !== undefined) ? this._aspectRatio : this._aspectRatio = this.object.width / this.object.height; }
	public get horse(): Derpibooru.Horse { return (this._horse) ? this._horse : this._horse = this.object.horse; }
	public get mimeType(): string { return (this._mimeType !== undefined) ? this._mimeType : this._mimeType = this.object.mime_type; }
	public get pageUrl(): Url.URL { return (this._pageUrl) ? this._pageUrl : this._pageUrl = new Url.URL(this.object.id, Process.env.npm_package_config_derpibooruCanonical); }

	public get sources(): Set<Display.Source> {
		if (this._sources)
			return this._sources;
		const representations = new Map<keyof Image.Representations, Image.Dimensions & { url: string }>();

		for (const [size, dimension] of Display.scaleDefinitions) {
			const scaledDimension: Image.Dimensions = this.scaleDimensions(dimension);
			representations.set(size, { height: scaledDimension.height, url: Path.resolve(this.object.representations[size]), width: scaledDimension.width });
		}
		const sources = new Set<Display.Source>();
		let i: number = 1;

		// for SVG images, derpibooru will serve image/png; this hack provides an image/svg+xml source for the browser in addition to the image/png
		if (this.object.mime_type === "image/svg+xml")
			sources.add({ isDefault: false, src: Path.resolve(this.object.image, "..", this.object.id + ".svg"), type: "image/svg+xml" });
		return this._sources = representations
			.filter((source: Image.Dimensions & { url: string }): boolean => this.object.width >= source.width)
			.dedupe((a: Image.Dimensions & { url: string }, b: Image.Dimensions & { url: string }): boolean => a.width === b.width, (a: Image.Dimensions & { url: string }, b: Image.Dimensions & { url: string }): number => a.width - b.width)
			.reduce<Set<Display.Source>>((sources: Set<Display.Source>, source: Image.Dimensions & { url: string }, size: keyof Image.Representations, representations: Map<keyof Image.Representations, Image.Dimensions & { url: string }>): Set<Display.Source> => {
				if (i++ < representations.size)
					sources.add({ isDefault: false, media: "(max-width: " + source.width.toString() + "px)", src: source.url, width: source.width });
				else
					sources.add({ isDefault: true, src: source.url });
				return sources;
			}, sources);
	}

	public get sourceUrl(): Url.URL | undefined {
		if (this.isSourceUrlSet)
			return this._sourceUrl;
		this.isSourceUrlSet = true;

		if (typeof this.object.source_url === "string" && this.object.source_url.length >= 10)
			try { this._sourceUrl = new Url.URL(this.object.source_url); }
			catch (err) {}
		return this._sourceUrl;
	}

	private getSubtags(targetTag: string): Set<string> {
		if (!targetTag.endsWith(":"))
			targetTag += ":";

		if (this._subtags.has(targetTag))
			return this._subtags.get(targetTag)!;
		const targetTags: Array<string> | null = this.object.tags.match(new RegExp(targetTag + "[^,]+", "ig"));

		if (targetTags === null)
			return this._subtags.set(targetTag, new Set<string>()).get(targetTag)!;
		return this._subtags.set(targetTag, Set.from<string>(targetTags.map<string>((tag: string): string => tag.replace(targetTag, "")))).get(targetTag)!;
	}

	private scaleDimensions(scaleDefinition: Display.ScaleDefinition): Image.Dimensions {
		let multiplier: number;

		if (scaleDefinition.scale === "width")
			multiplier = 1 / this.aspectRatio;
		else
			multiplier = this.aspectRatio;

		switch (scaleDefinition.scale) {
			case "height":
				const width: number = Display.round(scaleDefinition.height * multiplier);
				return (width > this.object.width) ? { height: this.object.height, width: this.object.width } : { height: scaleDefinition.height, width };
			case "width":
				return (scaleDefinition.width > this.object.width) ? { height: this.object.height, width: this.object.width } : { height: Display.round(scaleDefinition.width * multiplier), width: scaleDefinition.width };
			case "longest":
				return this.scaleDimensions((this.aspectRatio >= 1) ? { scale: "width", width: scaleDefinition.width } : { scale: "height", height: scaleDefinition.height });
		}
	}

	public toJSON(): Display.Object { return { artists: this.artists, horse: this.horse, mimeType: (this.mimeType === "image/svg+xml") ? "image/png" : this.mimeType, pageUrl: this.pageUrl, sources: this.sources, sourceUrl: this.sourceUrl }; }
	public toString(): string { return JSON.stringify(this); }
}

export namespace Display {
	export type ObjectAggregateArray<T extends Src> = { [P in keyof ObjectAggregates<T>]: Array<ObjectAggregates<T>[P]> };
	type ObjectAggregateSet<T extends Src> = { [P in keyof ObjectAggregates<T>]: Set<ObjectAggregates<T>[P]> };
	export type ScaleDefinition = Partial<Image.Dimensions> & ({ height: number, scale: "height" } | { height: number, scale: "longest", width: number } | { scale: "width", width: number });
	export type Source<T extends Src = string> = SourceGeneric<T> & ({ isDefault: true } | { isDefault: false, media: string, width: number } | { isDefault: false, type: "image/svg+xml" });
	type Src = string | Url.URL;

	export interface Like extends Readonly<Object> {
		readonly object: Image;

		toJSON(): Object;
		toString(): string;
	}

	export interface Object extends ObjectAggregateSet<string>, ObjectParticulars<Url.URL> {}

	interface ObjectAggregates<T extends Src> {
		artists: string;
		sources: SourceGeneric<T>;
	}

	export interface ObjectParticulars<T extends Src> {
		horse: Derpibooru.Horse;
		mimeType: string;
		pageUrl: T;
		sourceUrl?: T;
	}

	interface SourceGeneric<T extends Src> {
		isDefault: boolean;
		media?: string;
		src: T;
		type?: "image/svg+xml";
		width?: number;
	}
}