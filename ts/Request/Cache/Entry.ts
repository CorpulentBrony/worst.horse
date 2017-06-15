import { DIR as CACHE_DIR } from "../Cache";
import * as File from "../../File";
import * as Path from "path";

export class Entry implements Entry.Like {
	private _fileExists: Promise<boolean>;
	private _filePath: string;
	public created: number;
	public etag: string;
	public expires: number;
	public readonly key: string;
	public mimeType: string;
	public size: number;

	public static from(key: string, object: Entry.Object): Entry { return new this(key, object); }

	constructor(key: string, { created, etag, expires, mimeType, size }: Entry.Object) {
		[this.created, this.etag, this.expires, this.key, this.mimeType, this.size] = [created, etag, expires, key, mimeType, size];
	}

	public get fileExists(): Promise<boolean> { return (this._fileExists !== undefined) ? this._fileExists : this._fileExists = File.exists(this.filePath); }
	public get filePath(): string { return (this._filePath !== undefined) ? this._filePath : this._filePath = Path.join(CACHE_DIR, this.key); }
	public get isExpired(): boolean { return this.expires > Date.now(); }

	public toJSON(): Entry.Object { return { created: this.created, etag: this.etag, expires: this.expires, mimeType: this.mimeType, size: this.size }; }
}

export namespace Entry {
	export interface Like extends Object {
		readonly fileExists: Promise<boolean>;
		readonly filePath: string;
		readonly isExpired: boolean;
		readonly key: string;

		toJSON(): Object;
	}

	export interface Object {
		created: number;
		etag: string;
		expires: number;
		mimeType: string;
		size: number;
	}
}