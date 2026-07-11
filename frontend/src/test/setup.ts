import "@testing-library/jest-dom";

// cmdk scrolls the selected item into view; jsdom has no scrollIntoView.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// cmdk measures its list height via ResizeObserver; jsdom has no ResizeObserver.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
