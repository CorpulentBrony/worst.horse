/// <reference path="./@types/libxmljs.d.ts" />
/// <reference path="./Promisify.d.ts" />
import { Map } from "./CustomTypes/Map";
import { Set } from "./CustomTypes/Set";
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

function buildSources(image: Derpibooru.Image): Set<string> {
	let representations = new Map<keyof Derpibooru.Representations, Dimensions & { url: string }>();

	for (const [size, dimension] of scaleDefinitions) {
		const scaledDimension: Dimensions | boolean = scaledDimensions({ aspect_ratio: image.aspect_ratio, height: image.height, width: image.width }, dimension);

		if (scaledDimension && typeof scaledDimension !== "boolean")
			representations.set(size, { height: scaledDimension.height, url: image.representations[size], width: scaledDimension.width });
	}
	representations = representations.dedupe((a: Dimensions & { url: string }, b: Dimensions & { url: string }): boolean => a.width === b.width, (a: Dimensions & { url: string }, b: Dimensions & { url: string }): number => a.width - b.width);
	// representations is now sorted and deduped, now to make it into a string.  remember the resultant html needs to include, according to derpibooru: all artists (see Derpibooru.getSubtags()), source_url, and link back to derpibooru page
	return new Set<string>();
}

// for i = 1 to length(A)
//     j ← i
//     while j > 0 and A[j-1] > A[j]
//         swap A[j] and A[j-1]
//         j ← j - 1
//     end while
// end for

function appendSourceTags(image: Derpibooru.Image, picture: Libxmljs.Element): Libxmljs.Document {
	const multiplier: { width: number, height: number } = { width: image.aspect_ratio >= 1 ? 1 : 1 / image.aspect_ratio, height: image.aspect_ratio >= 1 ? 1 / image.aspect_ratio : 1 };
	if (image.width > 50 || image.height > 50)
		picture.node("source").attr({ })
	
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
				const doc = new Libxmljs.Document();
				const picture: Libxmljs.Element = doc.node<Libxmljs.Element>("html").attr({ lang: "en" })
					.node("head")
						.node("link").attr({ href: "https://derpicdn.net", rel: "preconnect" }).parent()
						.node("meta").attr({ charset: "utf8" }).parent()
						.node("title", "Worst Horse Image").parent().parent()
					.node("body")
						.node("template").attr({ id: "image" })
							.node("picture");

				response.write(`<!DOCTYPE html>\n${doc.toString({ type: "html", format: true }).replace("<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\">", "") }`);
				response.end();
				return;
		// <template id="image">
		// 	<picture>
		// 		<source media="(max-width: 50px)" srcset="" type="">
		// 		<source media="(max-width: 150px)" srcset="" type="">
		// 		<source media="(max-width: 250px)" srcset="" type="">
		// 		<source media="(max-height: 240px)" srcset="" type="">
		// 		<source media="(max-height: 600px)" srcset="" type="">
		// 		<source media="(max-height: 1024px)" srcset="" type="">
		// 		<source media="(max-width: 1024px)" srcset="" type="">
		// 		<img class="image" src="/image" alt="Applejack is worst horse">
		// 	</picture>
		// </template>
			}

			const searchResultUrl = new Url.URL("https:" + searchResult.representations.large);
			let imageRequest: Stream.Transform = await Request.stream(searchResultUrl);
			console.log(`getting image: ${searchResultUrl.toString()}`);
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