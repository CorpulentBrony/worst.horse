declare global {
	interface HTMLScriptElement {
		addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture: boolean): void;
		addEventListener(type: string, listener: EventListenerOrEventListenerObject, options: Partial<AddEventListenerOptions>): void;
		addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
	}
}

export type AddEventListenerOptions = { capture: boolean, once: boolean, passive: boolean };
export type ElementAttributes = { [property: string]: string };
export type ResourceHintAttributes = ElementAttributes & { as?: "document" | "embed" | "font" | "image" | "media" | "object" | "script" | "style" | "worker", href: string, rel: "dns-prefetch" | "preconnect" | "prefetch" | "preload" | "prerender" };

export function addResourceHint(resourceHintAttributes: ResourceHintAttributes): HTMLLinkElement { return createElement<HTMLLinkElement>("link", resourceHintAttributes, document.head); }

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

export function doAddEventListenerOptionsSupport(): AddEventListenerOptions {
	if (addEventListenerOptionsSupport !== undefined)
		return addEventListenerOptionsSupport;
	const result: AddEventListenerOptions = { capture: false, once: false, passive: false };
	const onTest: EventListenerOrEventListenerObject = (): true => true;
	
	try {
		window.addEventListener("doAddEventListenerOptionsSupport", onTest, Object.defineProperties({}, {
			capture: { get: (): true => result.capture = true },
			once: { get: (): true => result.once = true },
			passive: { get: (): true => result.once = true }
		}));
	} catch (err) {}
	window.removeEventListener("doAddEventListenerOptionsSupport", onTest);
	return addEventListenerOptionsSupport = result;
}

export function doIfElementExistsById<T extends HTMLElement>(elementId: string, doWhat: (element: T) => void, parent: { getElementById(elementId: string): HTMLElement | null } = document): HTMLElement | null {
	const element: HTMLElement | null = parent.getElementById(elementId);

	if (element !== null)
		doWhat(<T>element);
	return element;
}

export function getElementByIdOrError(elementId: string, parent: { getElementById(elementId: string): HTMLElement | null } = document): HTMLElement {
	const element: HTMLElement | null = parent.getElementById(elementId);

	if (element === null)
		throw new TypeError(`Not able to find element ID ${elementId} in the DOM.`);
	return element;
}

export function loadScript(properties: Partial<HTMLScriptElement> & { src: string; }, onLoad?: (script: HTMLScriptElement) => void, options?: boolean | Partial<AddEventListenerOptions>, parent: HTMLElement = document.head): void {
	if (properties.type === undefined)
		properties.type = "application/javascript";
	const fragment: DocumentFragment = document.createDocumentFragment();
	const script: HTMLScriptElement = createElement<HTMLScriptElement>("script", properties, fragment);

	if (onLoad !== undefined) {
		if (options !== undefined && typeof options !== "boolean") {
			let i: number = 0;

			for (const name in options)
				if (!doAddEventListenerOptionsSupport()[<keyof AddEventListenerOptions>name])
					delete options[<keyof AddEventListenerOptions>name];
				else
					i++;

			if (i === 0)
				options = undefined;
		}

		if (options === undefined)
			script.addEventListener("load", function onLoadListener(): void {
				onLoad(script);
				script.removeEventListener("load", onLoadListener);
			});
		else
			script.addEventListener("load", function onLoadListener(): void {
				onLoad(script);
				script.removeEventListener("load", onLoadListener);
			}, options);
	}

	if (document.readyState === "loading" && ("import" in document.createElement<"link">("link")))
		document.write(script.outerHTML);
	else
		parent.appendChild(fragment);
}

export function loadScriptPromise(properties: Partial<HTMLScriptElement> & { src: string; }, options?: boolean | Partial<AddEventListenerOptions>, parent?: HTMLElement): Promise<HTMLScriptElement> {
	return new Promise<HTMLScriptElement>((resolve: (value: HTMLScriptElement | PromiseLike<HTMLScriptElement>) => void, reject: (reason?: any) => void): void => {
		loadScript(properties, (script: HTMLScriptElement): void => {
			resolve(script);
		}, options, parent);
	});
}

let addEventListenerOptionsSupport: AddEventListenerOptions | undefined;