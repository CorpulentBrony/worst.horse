/// <reference path="./@types/libxmljs.d.ts" />
/// <reference path="./Promisify.d.ts" />
import { Map } from "./CustomTypes/Map";
import { Derpibooru } from "./Derpibooru";
import { ElapsedTime } from "./ElapsedTime";
import * as File from "./File";
import * as Gm from "gm";
import * as Http from "http";
import * as Libxmljs from "libxmljs";
import * as Net from "net";
import * as Process from "process";
import * as Request from "./Request";
import * as Stream from "stream";
import * as Url from "url";
import * as Util from "util";

const BUFFER_SECONDS: number = 30;
const SEARCH_FILTER: string = "41048";
const SEARCH_TERMS: string = "applejack,solo,sad,-twilight sparkle,-fluttershy,-pinkie pie,-rainbow dash,-rarity";
const SOCKET_FILE: string = "/var/www/html/worst.horse/image";

type ListeningListenerFunction = (err?: Error, success?: void) => void;
type ListenFunction = (path: string, listeningListener?: ListeningListenerFunction) => Net.Server;

interface Dimensions {
	height: number;
	width: number;
}

type DimensionImage = Dimensions & { aspect_ratio: number };
type ScaleDefinition = Partial<Dimensions> & ({ height: number, scale: "height" } | { height: number, scale: "longest", width: number } | { scale: "width", width: number });

const scaleDefinitions = new Map<keyof Derpibooru.Representations, ScaleDefinition>();
scaleDefinitions.set("thumb_tiny", { height: 50, scale: "longest", width: 50 })
	.set("thumb_small", { height: 150, scale: "longest", width: 150 })
	.set("thumb", { height: 250, scale: "longest", width: 250 })
	.set("small", { height: 240, scale: "height" })
	.set("medium", { height: 600, scale: "height" })
	.set("large", { height: 1024, scale: "height" })
	.set("tall", { scale: "width", width: 1024 });

function round(x: number): number { return x + 0.5 << 1 >> 1; }

function scaledDimensions(image: Dimensions & { aspect_ratio: number }, scaleDefinition: ScaleDefinition): Dimensions | boolean {
	let multiplier: number;

	if ((scaleDefinition.scale === "height" && image.height > scaleDefinition.height && image.aspect_ratio < 1) || (scaleDefinition.scale === "width" && image.width > scaleDefinition.width && image.aspect_ratio > 1))
		multiplier = 1 / image.aspect_ratio;
	else
		multiplier = image.aspect_ratio;

	switch (scaleDefinition.scale) {
		case "height":
			return (image.height > scaleDefinition.height) ? { height: scaleDefinition.height, width: round(scaleDefinition.height * multiplier) } : false;
		case "width":
			return (image.width > scaleDefinition.width) ? { height: round(scaleDefinition.width * multiplier), width: scaleDefinition.width } : false;
		case "longest":
			if (image.height <= scaleDefinition.height && image.width <= scaleDefinition.width)
				return false;
			else if (image.aspect_ratio >= 1) 
				return scaledDimensions(image, { scale: "width", width: scaleDefinition.width });
			else
				return scaledDimensions(image, { scale: "height", height: scaleDefinition.height });
	}
}

function appendSourceTags(image: Derpibooru.Image, picture: Libxmljs.Element): Libxmljs.Document {
	let representations = new Map<keyof Derpibooru.Representations, Dimensions & { url: string }>();

	for (const [size, dimension] of scaleDefinitions) {
		const scaledDimension: Dimensions | boolean = scaledDimensions({ aspect_ratio: image.aspect_ratio, height: image.height, width: image.width }, dimension);

		if (scaledDimension && typeof scaledDimension !== "boolean")
			representations.set(size, { height: scaledDimension.height, url: image.representations[size], width: scaledDimension.width });
	}
	let i: number = 1;
	representations.dedupe((a: Dimensions & { url: string }, b: Dimensions & { url: string }): boolean => a.width === b.width, (a: Dimensions & { url: string }, b: Dimensions & { url: string }): number => a.width - b.width).forEach(
		(representation: Dimensions & { url: string }, size: keyof Derpibooru.Representations, representations: Map<keyof Derpibooru.Representations, Dimensions & { url: string }>): void => {
			if (i++ < representations.size)
				picture.node("source").attr({ media: "(max-width: " + representation.width.toString() + "px)", srcset: "https:" + representation.url, type: image.mime_type });
			else
				picture.node("img").attr({ alt: "Applejack is worst horse", class: "image", src: "https:" + representation.url, type: image.mime_type });
		}
	);
	return picture.doc();
}

export class Server {
	private elapsedTime: ElapsedTime;
	private server: Http.Server;

	public static async start(): Promise<Server> {
		Process.stdout.write("Starting worst.horse image server ... ");
		let server: Server;

		try {
			server = new Server();
			await server.startServer();
			Process.stdout.write("[OK]\n");
			return server;
		} catch (err) {
			Process.stdout.write("[ERROR]\n");
			throw err;
		}
	}

	constructor() {
		[this.elapsedTime, this.server] = [new ElapsedTime(), Http.createServer(this.requestHandler)];
	}

	private listenAsync: ListenFunction = <any>Util.promisify((path: string, listeningListener?: ListeningListenerFunction): Net.Server => this.server.listen(path, listeningListener));

	private requestHandler = async function requestHandler(request: Http.IncomingMessage, response: Http.ServerResponse): Promise<void> {
		try {
			let requestUrl: Url.URL;

			if (request.url === undefined || (requestUrl = new Url.URL(request.url, "https://image")).pathname !== "/") {
				response.setHeader("Content-Type", "text/html; charset=utf-8");
				response.writeHead(404, "Not Found");
				response.write("404 Not Found");
				response.end();
				return;
			}
			const derpibooru = new Derpibooru({ filter_id: SEARCH_FILTER, q: SEARCH_TERMS });
			const searchResult: Derpibooru.Image = await derpibooru.random();
			if (requestUrl.searchParams.has("html")) {
				response.setHeader("Content-Type", "text/html; charset=utf-8");
				let doc = new Libxmljs.Document();
				const template: Libxmljs.Element = doc.node<Libxmljs.Element>("html").attr({ lang: "en" })
					.node("head")
						.node("link").attr({ href: "https://derpicdn.net", rel: "preconnect" }).parent()
						.node("meta").attr({ charset: "utf8" }).parent()
						.node("title", "Worst Horse Image").parent().parent()
					.node("body")
						;//.node("template").attr({ id: "image" });
				const picture: Libxmljs.Element = template.node("picture");
				doc = appendSourceTags(searchResult, picture);
				template.node("dl")
					.node("dt", "Artist(s)").parent()
					.node("dd", Derpibooru.getSubtags(searchResult, "artist").join(", ")).parent()
					.node("dt", "Source").parent()
					.node("dd", searchResult.source_url).parent().parent()
				.node("div", "https://www.derpibooru.org/" + searchResult.id);
				response.write(`<!DOCTYPE html>\n${doc.toString({ type: "html", format: true }).replace("<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\">", "").replace(/<\/source>/g, "") }`);
				response.end();
				return;
			}

			const searchResultUrl = new Url.URL("https:" + searchResult.representations.large);
			let imageRequest: Stream.Transform = await Request.stream(searchResultUrl);
			response.setHeader("Cache-Control", "max-age=0, no-cache");

			if (requestUrl.searchParams.has("webp")) {
				response.setHeader("Content-Type", "image/webp");
				imageRequest = Gm(imageRequest).setFormat("webp").stream();
			} else if (requestUrl.searchParams.has("placeholder")) {
				response.setHeader("Content-Type", "image/gif");
				imageRequest = Gm(imageRequest).filter("Gaussian").resize(3, 3).setFormat("gif").stream();
			} else
				response.setHeader("Content-Type", searchResult.mime_type);
			imageRequest.pipe(response);
			// Gm(imageRequest).filter("Gaussian").resize(250, 250).colorspace("YUV").colors(1).toBuffer("RGB", (err: Error, buffer: Buffer): void => {
			// 	console.log(buffer.slice(0, 3)); // three bytes corresponding to R G B
			// });
		} catch (err) { console.error(err); }
	}

	public async startServer(): Promise<this> {
		if (await File.exists(SOCKET_FILE)) {
			await File.unlink(SOCKET_FILE);
		}
		await this.listenAsync(SOCKET_FILE);
		return this;
	}
}