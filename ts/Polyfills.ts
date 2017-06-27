import * as Util from "./Util";

const loaded = new Set<string>();

export async function fetch(): Promise<void> { await genericAsync("fetch", genericLoadScript(!window.fetch, "/node_modules/whatwg-fetch/fetch.js")); }

async function genericAsync(name: string, awaiter: Promise<void>): Promise<void> {
	if (loaded.has(name))
		return;
	await awaiter;
	loaded.add(name);
}

async function genericLoadScript(test: boolean, src: string): Promise<void> {
	if (test)
		await Util.loadScriptPromise({ async: true, src });
}

export async function webcomponents(): Promise<void> {
	await genericAsync("webcomponents", new Promise<void>((resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void): void => {
		if (window.WebComponents && !window.WebComponents.ready)
			window.addEventListener("WebComponentsReady", function onWebComponentsReady(): void {
				resolve(undefined);
				loaded.add("webcomponents");
				window.removeEventListener("WebComponentsReady", onWebComponentsReady);
			});
		else
			resolve(undefined);
	}));
}

export namespace ChildNode {
	export function remove(): void {
		if (loaded.has("ChildNode.remove"))
			return;

		for (const childNodeType of Array.of<typeof CharacterData | typeof DocumentType | typeof Element>(CharacterData, DocumentType, Element))
			if (childNodeType !== undefined && childNodeType.prototype !== undefined && !childNodeType.prototype.hasOwnProperty("remove"))
				Object.defineProperty(childNodeType.prototype, "remove", { configurable: true, enumerable: true, writable: true, value: function remove() { (<CharacterData | DocumentType | Element>this).parentNode!.removeChild((<CharacterData | DocumentType | Element>this)); } });
		loaded.add("ChildNode.remove");
	}
}