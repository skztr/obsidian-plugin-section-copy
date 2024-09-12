import { App, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import { CopySectionPlugin } from "../../main";

export interface SectionCopySettings {
  stripComments: boolean;
  stripTags: boolean;
}
export const DEFAULT_SETTINGS: Partial<SectionCopySettings> = {
  stripComments: false,
  stripTags: false,
};

export class SettingTab extends PluginSettingTab {
  plugin: CopySectionPlugin;

  constructor(app: App, plugin: CopySectionPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Strip Comments")
      .setDesc("Remove comments from copied section data?")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.stripComments)
          .onChange(async (value) => {
            this.plugin.settings.stripComments = value;
            await this.plugin.saveSettings();
          }),
      );
    new Setting(containerEl)
      .setName("Strip Tags")
      .setDesc("Remove #tags from copied section data?")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.stripTags)
          .onChange(async (value) => {
            this.plugin.settings.stripTags = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
