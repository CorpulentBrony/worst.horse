/// <reference path="../../@types/redis.d.ts" />
import { Buffer } from "buffer";
import { promisify, promisifyAsync } from "../../Promisify";
import * as NodeRedis from "redis";
import * as Zlib from "zlib";

const BUFFER_NULL_GZIP: Buffer = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xcb, 0x2b, 0xcd, 0xc9, 0x01, 0x00, 0x4f, 0xfc, 0xcb, 0x25, 0x04, 0x00, 0x00, 0x00]);
const BUFFER_OK: Buffer = Buffer.from([0x4f, 0x4b]);

// the node-redis package is kinda shit and doesn't match my style, so I'm going to wrap it to make what i want to use async
export class Redis {
	private static readonly clients = new Map<string, NodeRedis.RedisClient>();
	public readonly client: NodeRedis.RedisClient;

	constructor(socket: string) {
		if (!Redis.clients.has(socket))
			Redis.clients.set(socket, NodeRedis.createClient({ detect_buffers: true, path: socket }));
		this.client = Redis.clients.get(socket)!;
	}

	public async getBuffer(key: string): Promise<Buffer> { return promisifyAsync<Buffer>(Zlib.gunzip)(this.getCompressedBuffer(key)); }

	public async getCompressedBuffer(key: string): Promise<Buffer> { //return Buffer.from(await this.getCompressedBinary(key), "binary"); 
		return new Promise<Buffer>((resolve: (value: Buffer | PromiseLike<Buffer>) => void, reject: (reason?: any) => void): void => {
			this.client.get<Buffer>(Buffer.from(key, "utf8"), (err: Error | null, reply: Buffer): void => {
				if (err)
					reject(err);
				else
					resolve((reply === null) ? BUFFER_NULL_GZIP : reply);
			});
		});
	}
	public async getObject<T>(key: string): Promise<T> { return JSON.parse(await this.getString(key)); }

	public async getString(key: string): Promise<string> {
		const buffer: Buffer = await this.getBuffer(key);
		return buffer.toString("utf8");
	}

	public async hgetall<T = { [key: string]: string }>(key: string): Promise<T> { return promisify<T>(this.client.hgetall)(key); 
		// return new Promise<T>((resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void): void => {
		// 	this.client.hgetall(key, (err: Error | null, reply: T): void => {
		// 		if (err)
		// 			reject(err);
		// 		else
		// 			resolve(reply);
		// 	});
		// });
	}

	public async setBuffer(key: string, value: Buffer, ttlMs?: number): Promise<boolean> {
		value = await promisify<Buffer, Error>(Zlib.gzip)(value, { level: 5 });
		return this.setCompressedBuffer(key, value, ttlMs);
	}

	public async setCompressedBuffer(key: string, value: Buffer, ttlMs?: number): Promise<boolean> { //return this.setCompressedBinary(key, value.toString("binary"), ttlMs); 
		const response: Buffer | undefined = await new Promise<Buffer>((resolve: (value: Buffer | PromiseLike<Buffer>) => void, reject: (reason?: any) => void): void => {
			const callback = (err: Error | null, reply: Buffer): void => {
				if (err)
					reject(err);
				else
					resolve(reply);
			};

			if (ttlMs === undefined)
				this.client.set<Buffer>(Buffer.from(key, "utf8"), value, callback);
			else
				this.client.set<Buffer>(Buffer.from(key, "utf8"), value, "EX", ttlMs, callback);
		});
		return response instanceof Buffer && Buffer.compare(response, BUFFER_OK) === 0;
	}
	public async setObject<T = any>(key: string, value: T, ttlMs?: number): Promise<boolean> { return this.setString(key, JSON.stringify(value), ttlMs); }
	public async setString(key: string, value: string, ttlMs?: number): Promise<boolean> { return this.setBuffer(key, Buffer.from(value, "utf8"), ttlMs); }
}