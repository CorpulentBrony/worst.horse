import * as Process from "process";
import * as Server from "./Server";

async function start(): Promise<void> {
	// await Server.Converter.start(Process.env.npm_package_config_converterServerSocketFile).catch(console.error);
	await Server.Image.start(Process.env.npm_package_config_imageServerSocketFile).catch(console.error);
}

start().catch(console.error);