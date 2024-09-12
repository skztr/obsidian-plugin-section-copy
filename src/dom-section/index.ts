// This was an experiment in iterating over DOM elements
// it was abandoned because DOM elements will only exist for text that is visible in the viewport
export class DOMSection {
  constructor(protected _startElement: Element) {}
  public static divUp(start: Element): Element | undefined {
    const h = DOMSection.hUp(start);
    if (h?.parentElement?.tagName === "DIV") {
      return h.parentElement;
    }
    return undefined;
  }
  public static hUp(start: Element): Element | undefined {
    let element: Element | undefined | null = start;
    while (
      element &&
      !["H1", "H2", "H3", "H4", "H5", "H6"].contains(element.tagName)
    ) {
      element = element.parentElement;
    }
    return element || undefined;
  }
  public static isSection(element: Element): boolean {
    return !!DOMSection.divUp(element);
  }

  public get level(): number {
    const h = DOMSection.hUp(this._startElement);
    if (!h) {
      return 0;
    }
    return parseInt(h.tagName.slice(1));
  }

  public get elements(): Iterable<Element> {
    return new DOMSectionElementIterator(this._startElement);
  }

  public get startElement(): Element {
    return DOMSection.divUp(this._startElement) as Element;
  }
  public get endElement(): Element {
    let element: Element | undefined;
    for (element of this.elements) {
    }
    return element || (DOMSection.divUp(this._startElement) as Element);
  }
}

export class DOMSectionElementIterator
  extends DOMSection
  implements Iterable<Element>
{
  public [Symbol.iterator](): Iterator<Element> {
    let element: Element | undefined | null = DOMSection.divUp(
      this._startElement,
    );
    const sectionLevel = this.level;
    let first: boolean = true;
    if (!element) {
      return [].values();
    }

    return {
      next(): IteratorResult<Element> {
        if (
          !element ||
          (element?.tagName === "DIV" && element.hasClass("mod-footer"))
        ) {
          return { done: true, value: null };
        }
        if (
          !first &&
          element?.firstElementChild &&
          DOMSection.isSection(element.firstElementChild)
        ) {
          const subsection = new DOMSection(element.firstElementChild);
          if (subsection.level <= sectionLevel) {
            return { done: true, value: null };
          }
        }
        first = false;

        const prev = element as Element;
        element = element.nextElementSibling;
        return { done: false, value: prev };
      },
    };
  }
}
