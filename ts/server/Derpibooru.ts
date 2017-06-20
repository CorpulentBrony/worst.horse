import { Image } from "./Derpibooru/Image";
import { Map } from "../CustomTypes/Map";
import * as Process from "process";
import * as Random from "./Random";
import * as Request from "./Request";
import { Set } from "../CustomTypes/Set";
import * as Url from "url";

const SEARCH_TERM_CONSTANTS = new Set<string>(JSON.parse(Process.env.npm_package_config_derpibooruSearchTermConstants));
const SEARCH_TERMS: string = "applejack," + SEARCH_TERM_CONSTANTS.join(",");
const SEARCH_URL = new Url.URL(Process.env.npm_package_config_derpibooruSearchUrl, Process.env.npm_package_config_derpibooruCanonical);
const WORST_HORSE_WEIGHTS = new Map<string, number>(JSON.parse(Process.env.npm_package_config_worstHorseWeights));

type Query = Url.URLSearchParams | string | { [key: string]: string | Array<string> } | Iterable<[string, string]>;

export class Derpibooru {
	public query: Url.URLSearchParams;
	public results: Derpibooru.SearchResults;

	public static async newRandom(query?: Query): Promise<Image> {
		const derpibooru: Derpibooru = new this(query);
		return derpibooru.random();
	}

	constructor(query: Query = { filter_id: Process.env.npm_package_config_derpibooruSearchFilter, q: SEARCH_TERMS }) {
		this.query = new Url.URLSearchParams(query);
	}

	public async random(query: Query = this.query): Promise<Image> {
		let array: Array<Image> = await this.search(query);
		const imageNumber: number = await Random.integer(array.length);
		array = await Random.shuffle<Image>(array);
		return array[imageNumber];
	}

	public async search(query: Query = this.query): Promise<Array<Image>> {
		let searchParams: Url.URLSearchParams;
		let url: Url.URL = new Url.URL(<any>SEARCH_URL);

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
	export interface SearchResults {
		search: Array<Image>;
		total: number;
	}
}

import * as DerpibooruImage from "./Derpibooru/Image";

export namespace Derpibooru {
	export import Image = DerpibooruImage.Image;
}