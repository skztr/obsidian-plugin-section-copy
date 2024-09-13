import { App, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import { CopySectionPlugin } from "../../main";

export interface SectionCopySettings {
  excludeSubsections: boolean;
  includeSectionHeading: boolean;
  stripComments: boolean;
  stripModifiedEmpty: boolean;
  stripTagLines: boolean;
}
export const DEFAULT_SETTINGS: Partial<SectionCopySettings> = {
  excludeSubsections: true,
  includeSectionHeading: true,
  stripComments: false,
  stripModifiedEmpty: true,
  stripTagLines: false,
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
      .setName("Include Section Heading")
      .setDesc("Should copied section data include the section heading?")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.includeSectionHeading)
          .onChange(async (value) => {
            this.plugin.settings.includeSectionHeading = value;
            await this.plugin.saveSettings();
          }),
      );
    new Setting(containerEl)
      .setName("Stop at Subsections")
      .setDesc("Should copied section data exclude subsections?")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.excludeSubsections)
          .onChange(async (value) => {
            this.plugin.settings.excludeSubsections = value;
            await this.plugin.saveSettings();
          }),
      );
    new Setting(containerEl)
      .setName("Strip Comments")
      .setDesc("Remove comments when copying section data?")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.stripComments)
          .onChange(async (value) => {
            this.plugin.settings.stripComments = value;
            await this.plugin.saveSettings();
          }),
      );
    new Setting(containerEl)
      .setName("Strip Tag Lines")
      .setDesc(
        "Strip out tags from lines which contain only #tags when copying section data?",
      )
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.stripTagLines)
          .onChange(async (value) => {
            this.plugin.settings.stripTagLines = value;
            await this.plugin.saveSettings();
          }),
      );
    new Setting(containerEl)
      .setName("Remove Modified-to-Empty Lines?")
      .setDesc(
        "If removing comments / tags / etc leaves a line empty, should the whole line be removed?",
      )
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.stripModifiedEmpty)
          .onChange(async (value) => {
            this.plugin.settings.stripModifiedEmpty = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
