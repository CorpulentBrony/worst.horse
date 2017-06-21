export type AddEventListenerOptions = { capture: boolean, once: boolean, passive: boolean };
export type ElementAttributes = { [property: string]: string };
export type ResourceHintAttributes = ElementAttributes & { as?: "document" | "embed" | "font" | "image" | "media" | "object" | "script" | "style" | "worker", href: string, rel: "dns-prefetch" | "preconnect" | "prefetch" | "preload" | "prerender" };

export function addResourceHint(resourceHintAttributes: ResourceHintAttributes): HTMLLinkElement { return createElement<HTMLLinkElement>("link", resourceHintAttributes, document.head); }

export function doAddEventListenerOptionsSupport(): AddEventListenerOptions {
	const result: AddEventListenerOptions = { capture: false, once: false, passive: false };
	try {
		window.addEventListener("test", (): true => true, Object.defineProperties({}, {
			capture: { get: (): true => result.capture = true },
			once: { get: (): true => result.once = true },
			passive: { get: (): true => result.once = true }
		}));
	} catch (err) {}
	return result;
}

export function createElement<T extends HTMLElement = HTMLElement>(name: string, attributes: { [property: string]: string } = {}, parent?: Node, text?: string): T {
	const result: T = <T>document.createElement(name);

	for (const property in attributes)
		result.setAttribute(property, attributes[property]);

	if (text && text.length > 0)
		result.appendChild(document.createTextNode(text));

	if (parent)
		parent.appendChild(result);
	return result;
}