import { setIcon } from "obsidian";

export interface button {
  container: HTMLElement;
  button: HTMLElement;
}

// mkButton is a helper to ensure the "copy" button has the appropriate classes and icon
// regardless of where in it is eventually placed
export function mkButton(
  name: string,
  icon: string,
  addTo?: HTMLElement,
): button {
  const container = document.createElement("span");
  const button = document.createElement("span");

  container.addClass("plugin-copy-section-button");
  container.addClass(`plugin-copy-section-button-${name}`);
  setIcon(button, icon);
  container.appendChild(button);
  if (addTo) {
    addTo.appendChild(container);
  }
  return { container, button };
}
