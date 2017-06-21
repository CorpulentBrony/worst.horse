import { Derpibooru } from "../Derpibooru";

export interface Image extends Image.Dimensions {
	aspect_ratio: number;
	downvotes: number;
	faves: number;
	file_name: string;
	horse: Derpibooru.Horse;
	id: string;
	image: string;
	mime_type: string;
	representations: Image.Representations;
	score: number;
	source_url: string;
	tags: string;
	uploader: string;
	upvotes: number;
}

export namespace Image {
	export interface Dimensions {
		height: number;
		width: number;
	}

	export interface Representations {
		[size: string]: string;
		thumb_tiny: string; // longest side will be 50
		thumb_small: string; // longest side will be 150
		thumb: string; // longest side will be 250
		small: string; // height will be 240
		medium: string; // height will be 600
		large: string; // height will be 1024
		tall: string; // width will be 1024
		full: string;
	}
}

import * as DerpibooruImageDisplay from "./Image/Display";

export namespace Image {
	export import Display = DerpibooruImageDisplay.Display;
}