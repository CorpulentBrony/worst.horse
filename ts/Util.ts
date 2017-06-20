export type AddEventListenerOptions = { capture: boolean, once: boolean, passive: boolean };

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