import * as File from "./File";
import * as Process from "process";

interface ConfigFileOptions {
	bufferNullGzipped: Array<number>;
	bufferOk: Array<number>;
	cacheDirectory: string;
	defaultMimeType: string;
	defaultTextEncoding: string;
	derpibooruSearchFilter: string;
	derpibooruSearchTerms: string;
	derpibooruSearchUrl: string;
	keyBaseDigits: string;
	keyHashSalt: Array<number>;
	redisSocketPath: string;
	requestAcceptEncoding: string;
	serverSocketFile: string;
}

const CONFIG_FILE: string = Process.env.npm_package_config_file;
console.log(Process.cwd(), CONFIG_FILE);
export const Config: Promise<ConfigFileOptions> = File.Read.json<ConfigFileOptions>(CONFIG_FILE);