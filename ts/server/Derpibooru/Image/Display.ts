import { Buffer } from "buffer";
import { Derpibooru } from "../../Derpibooru";
import * as Gm from "gm";
import { Image } from "../Image";
import { Map } from "../../../CustomTypes/Map";
import * as Path from "path";
import * as Process from "process";
import * as Request from "../../Request";
import { Set } from "../../../CustomTypes/Set";
import * as Url from "url";

// type PlaceholderFormats<T> = {
// 	readonly all: T;
// 	PNG?: T;
// 	WEBP?: T;
// }

declare global {
	interface ObjectConstructor {
		keys<T>(obj: object): Array<keyof T>;
	}
}

interface ValidPlaceholderFormats<T> {
	PNG: T;
	WEBP: T;
}

class PlaceholderFormats<T> implements Partial<ValidPlaceholderFormats<T>> {
	public static readonly numFormats: number = 2;
	public static readonly formats: ValidPlaceholderFormats<true> = { PNG: true, WEBP: true };
	public static readonly formatKeys: Array<keyof ValidPlaceholderFormats<true>> = Object.keys<ValidPlaceholderFormats<true>>(PlaceholderFormats.formats);
	public all: ArrayLike<T> | boolean | undefined;
	public PNG?: T;
	public WEBP?: T;

	constructor(formats?: Partial<ValidPlaceholderFormats<T>>) {
		Object.assign(this, formats);
		Object.defineProperty(this, "all", {
			enumerable: false,
			get: (): ArrayLike<T> | boolean | undefined => {
				const keys: Array<keyof Partial<ValidPlaceholderFormats<T>>> = Object.keys<Partial<ValidPlaceholderFormats<T>>>(this);

				if (keys.length === 0)
					return undefined;
				else if (keys.some((property: keyof Partial<ValidPlaceholderFormats<T>>): boolean => typeof this[property] === "boolean"))
					return PlaceholderFormats.formatKeys.every((property: keyof ValidPlaceholderFormats<true>): boolean => Boolean(this[property]));
				else
					return keys.map<T>((property: keyof ValidPlaceholderFormats<T>): T => <T>this[property]);
			},
			set: (value: T) => {
				PlaceholderFormats.formatKeys.forEach((property: keyof ValidPlaceholderFormats<true>): void => { this[property] = value; })
			}
		});
	}
}

export class Display implements Display.Like {
	private static cache = new Map<string, Display>();
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
	private _dimensions: Image.Dimensions;
	private _horse: Derpibooru.Horse;
	private _mimeType: string;
	private _pageUrl: Url.URL;
	private _placeholder: Promise<PlaceholderFormats<Promise<Buffer | undefined>>>;
	private _sources: Set<Display.Source>;
	private _sourceUrl: Url.URL | undefined;
	public readonly object: Image;
	public isPlaceholderSet: PlaceholderFormats<boolean>;
	private isSourceUrlSet: boolean;
	private subtags: Map<string, Set<string>>;

	public static async bufferFromImage(object: Image, headers?: { [header: string]: string; }): Promise<Buffer> {
		const display = new this(object);
		const headersDefined: boolean = headers !== undefined;
		const acceptsWebp: boolean = headersDefined && headers!.accept !== undefined && /webp/i.test(headers!.accept);
		const userAgentAcceptsWebp: boolean = headersDefined && headers!["user-agent"] !== undefined && /OPR\/(1[1-9]|[2-9][0-9])|Chrome\/(3[2-9]|[4-9][0-9])/i.test(headers!["user-agent"]);
		const format: keyof ValidPlaceholderFormats<never> = (acceptsWebp || userAgentAcceptsWebp) ? "WEBP" : "PNG";
		return display.toBuffer(format);
	}

	// public static async fromImage(object: Image): Promise<string> {
	// 	const display = new this(object);
	// 	return display.toString();
	// }

	private static round(x: number): number { return x + 0.5 << 1 >> 1; }

	constructor(object: Image) {
		this.object = object;

		if (Display.cache.has(object.id)) {
			const cached: Display = Display.cache.get(object.id)!;
			[this._artists, this._dimensions, this._horse, this._mimeType, this._pageUrl, this._placeholder, this._sources, this._sourceUrl, this.isPlaceholderSet, this.isSourceUrlSet]
			 = [cached.artists, cached.dimensions, cached.horse, cached.mimeType, cached.pageUrl, cached.getPlaceholder(), cached.sources, cached.sourceUrl, cached.isPlaceholderSet, true];
		} else {
			[this._placeholder, this.isPlaceholderSet, this.isSourceUrlSet, this.subtags] = [Promise.resolve(new PlaceholderFormats<Promise<Buffer>>()), new PlaceholderFormats<boolean>(), false, new Map<string, Set<string>>()];
			Display.cache.set(object.id, this);
		}
	}

	public get artists(): Set<string> { return (this._artists) ? this._artists : this._artists = this.getSubtags("artist"); }
	private get aspectRatio(): number { return (this._aspectRatio !== undefined) ? this._aspectRatio : this._aspectRatio = this.object.width / this.object.height; }
	public get dimensions(): Image.Dimensions { return (this._dimensions) ? this._dimensions : this._dimensions = { height: this.object.height, width: this.object.width }; }
	public get horse(): Derpibooru.Horse { return (this._horse) ? this._horse : this._horse = this.object.horse; }
	public get mimeType(): string { return (this._mimeType !== undefined) ? this._mimeType : this._mimeType = this.object.mime_type; }
	public get pageUrl(): Url.URL { return (this._pageUrl) ? this._pageUrl : this._pageUrl = new Url.URL(this.object.id, Process.env.npm_package_config_derpibooruCanonical); }

	public get sources(): Set<Display.Source> {
		if (this._sources)
			return this._sources;
		const representations = new Map<keyof Image.Representations, Image.Dimensions & { url: string }>();

		for (const [size, dimension] of (<any>Display.scaleDefinitions)) {
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

	private async getAllPlaceholders(): Promise<PlaceholderFormats<Promise<Buffer | undefined>>> {
		if (this.isPlaceholderSet.all)
			return this._placeholder;
		this.isPlaceholderSet.all = true;
		const result = new PlaceholderFormats<Promise<Buffer | undefined>>();
		PlaceholderFormats.formatKeys.forEach((format: keyof ValidPlaceholderFormats<true>): void => { result[format] = this.getParticularPlaceholder(format); });
		return result;
	}

	private async getParticularPlaceholder(format: keyof ValidPlaceholderFormats<Promise<Buffer>>): Promise<Buffer | undefined> {
		const placeholder: PlaceholderFormats<Promise<Buffer | undefined>> = await this._placeholder;

		if (this.isPlaceholderSet[format])
			return placeholder[format];
		this.isPlaceholderSet[format] = true;
		const thumbnail: string = this.object.representations["thumb_tiny"];

		if (!thumbnail || thumbnail.length === 0)
			return undefined;
		const gm: Gm.State = Gm(await Request.stream(new Url.URL(Path.resolve(thumbnail), "https://worst.horse"))).filter("Gaussian").resize(3, 3);
		return placeholder[format] = new Promise<Buffer>((resolve: (value: Buffer | PromiseLike<Buffer>) => void, reject: (reason?: any) => void): void => {
			gm.toBuffer(format, (err: Error, buffer: Buffer): void => {
				if (err)
					reject(err);
				else
					resolve(buffer);
			});
		});
	}

	public async getPlaceholder(format: keyof ValidPlaceholderFormats<Promise<Buffer>>): Promise<Buffer | undefined>;
	public async getPlaceholder(): Promise<PlaceholderFormats<Promise<Buffer | undefined>>>;
	public async getPlaceholder(format?: keyof ValidPlaceholderFormats<Promise<Buffer>>): Promise<Buffer | undefined | PlaceholderFormats<Promise<Buffer | undefined>>> {
		if (format !== undefined)
			return this.getParticularPlaceholder(format);
		else
			return this.getAllPlaceholders();
	}

	private getSubtags(targetTag: string): Set<string> {
		if (!targetTag.endsWith(":"))
			targetTag += ":";

		if (this.subtags.has(targetTag))
			return this.subtags.get(targetTag)!;
		const targetTags: Array<string> | null = this.object.tags.match(new RegExp(targetTag + "[^,]+", "ig"));

		if (targetTags === null)
			return this.subtags.set(targetTag, new Set<string>()).get(targetTag)!;
		return this.subtags.set(targetTag, Set.from<string>(targetTags.map<string>((tag: string): string => tag.replace(targetTag, "")))).get(targetTag)!;
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

	public async toBuffer(placeholderFormat: keyof ValidPlaceholderFormats<never>): Promise<Buffer> {
		const json: Buffer = Buffer.from(await this.toString(placeholderFormat));
		let length: number = json.length;
		const header: Buffer = Buffer.from([length >>> 8, length & 0xff]);
		length += header.length;
		const placeholder: Buffer | undefined = await this.getPlaceholder(placeholderFormat);

		if (placeholder === undefined)
			return Buffer.concat([header, json], length);
		return Buffer.concat([header, json, placeholder], length + placeholder.length);
	}

	public async toJSON(placeholderFormat?: keyof ValidPlaceholderFormats<never>): Promise<Display.Object> {
		return {
			artists: this.artists,
			dimensions: this.dimensions,
			horse: this.horse,
			mimeType: (this.mimeType === "image/svg+xml") ? "image/png" : this.mimeType,
			pageUrl: this.pageUrl,
			placeholderFormat,
			sources: this.sources,
			sourceUrl: this.sourceUrl
		};
	}

	public async toString(placeholderFormat?: keyof ValidPlaceholderFormats<never>): Promise<string> { return JSON.stringify(await this.toJSON(placeholderFormat)); }
}

export namespace Display {
	export type ObjectAggregateArray<T extends Src> = { [P in keyof ObjectAggregates<T>]: Array<ObjectAggregates<T>[P]> };
	type ObjectAggregateSet<T extends Src> = { [P in keyof ObjectAggregates<T>]: Set<ObjectAggregates<T>[P]> };
	export type ScaleDefinition = Partial<Image.Dimensions> & ({ height: number, scale: "height" } | { height: number, scale: "longest", width: number } | { scale: "width", width: number });
	export type Source<T extends Src = string> = SourceGeneric<T> & ({ isDefault: true } | { isDefault: false, media: string, width: number } | { isDefault: false, type: "image/svg+xml" });
	type Src = string | Url.URL;

	export interface Like extends Readonly<Object> {
		readonly object: Image;

		getPlaceholder(format: keyof PlaceholderFormats<Promise<Buffer>>): Promise<Buffer | undefined>;
		getPlaceholder(): Promise<PlaceholderFormats<Promise<Buffer | undefined>>>;
		toBuffer(placeholderFormat: keyof ValidPlaceholderFormats<never>): Promise<Buffer>;
		toJSON(placeholderFormat?: keyof ValidPlaceholderFormats<never>): Promise<Object>;
		toString(placeholderFormat?: keyof ValidPlaceholderFormats<never>): Promise<string>;
	}

	export interface Object extends ObjectAggregateSet<string>, ObjectParticulars<Url.URL> {}

	interface ObjectAggregates<T extends Src> {
		artists: string;
		sources: SourceGeneric<T>;
	}

	export interface ObjectParticulars<T extends Src> {
		dimensions: Image.Dimensions;
		horse: Derpibooru.Horse;
		mimeType: string;
		pageUrl: T;
		placeholder?: string;
		placeholderFormat?: keyof ValidPlaceholderFormats<never>;
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