import * as Random from "./Random";
import * as Request from "./Request";
import * as Url from "url";

const SEARCH_URL: string = "https://derpibooru.org/search.json";

type Query = Url.URLSearchParams | string | { [key: string]: string | Array<string> } | Iterable<[string, string]>;

export class Derpibooru {
	public query: Url.URLSearchParams;
	public results: Derpibooru.SearchResults;

	constructor(query: Query) {
		this.query = new Url.URLSearchParams(query);
	}

	public async random(query: Query = this.query): Promise<Derpibooru.Image> {
		let array: Array<Derpibooru.Image> = await this.search(query);
		const imageNumber: number = await Random.integer(array.length);
		array = await Random.shuffle<Derpibooru.Image>(array);
		return array[imageNumber];
	}

	public async search(query: Query = this.query): Promise<Array<Derpibooru.Image>> {
		let searchParams: Url.URLSearchParams;
		let url: Url.URL = new Url.URL(SEARCH_URL);

		if (query instanceof Url.URLSearchParams)
			searchParams = query;
		else
			searchParams = new Url.URLSearchParams(query);
		url.search = searchParams.toString();
		let result: Derpibooru.SearchResults = await Request.json<Derpibooru.SearchResults>(url);
		const pageNumber: number = (result.total > result.search.length) ? (await Random.integer(Math.ceil(result.total / result.search.length)) + 1) : 1;

		if (pageNumber > 1) {
			url.searchParams.set("page", pageNumber.toString());
			result = await Request.json<Derpibooru.SearchResults>(url);
		}
		return result.search;
	}
}

export namespace Derpibooru {
	export interface Image {
		downvotes: number;
		faves: number;
		file_name: string;
		height: number;
		id: string;
		image: string;
		mime_type: string;
		representations: Representations;
		score: number;
		tags: string;
		uploader: string;
		upvotes: number;
		width: number;
	}

	export interface Representations {
		thumb_tiny: string;
		thumb_small: string;
		thumb: string;
		small: string;
		medium: string;
		large: string;
		tall: string;
		full: string;
	}

	export interface SearchResults {
		search: Array<Image>;
		total: number;
	}
}