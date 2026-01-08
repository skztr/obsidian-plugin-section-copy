import { Plugin, MarkdownView } from "obsidian";
import { StateField } from "@codemirror/state";
import { copySectionEditorView } from "./editor-extension";
import { copySectionReaderView } from "./markdown-post-processor";
import { copySectionRegisterDomExtension } from "./dom-extension";
import {
  copySectionCopyCommand,
  copySectionCopyRawCommand,
  copySectionCopyCurrentCommand,
} from "./commands";
import { SettingTab, SectionCopySettings, DEFAULT_SETTINGS } from "./settings";

export class CopySectionPlugin extends Plugin {
  settings: SectionCopySettings;
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));
    this.addCommand(copySectionCopyCommand(this.app, this));
    this.addCommand(copySectionCopyRawCommand(this.app, this));
    this.addCommand(copySectionCopyCurrentCommand(this.app, this));
    this.registerEditorExtension([
      pluginField.init(() => this),
      copySectionEditorView,
    ]);
    this.registerMarkdownPostProcessor(copySectionReaderView(this.app, this));
    copySectionRegisterDomExtension(this.app, this);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  displayLevels(): (1 | 2 | 3 | 4 | 5 | 6)[] {
    const displayLevels: (1 | 2 | 3 | 4 | 5 | 6)[] = [];
    for (let level of [1, 2, 3, 4, 5, 6] as (1 | 2 | 3 | 4 | 5 | 6)[]) {
      if (this.settings[`displayH${level}`]) {
        displayLevels.push(level);
      }
    }
    return displayLevels;
  }
}
export const pluginField = StateField.define<CopySectionPlugin | null>({
  create() {
    return null;
  },
  update(state) {
    return state;
  },
});
