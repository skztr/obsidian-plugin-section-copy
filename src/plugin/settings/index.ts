import { App, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import { CopySectionPlugin } from "..";

export interface SectionCopyDisplaySettings {
  displayAlways: boolean;
  displayTitle: boolean;
  displayH1: boolean;
  displayH2: boolean;
  displayH3: boolean;
  displayH4: boolean;
  displayH5: boolean;
  displayH6: boolean;
}

export interface SectionCopyCaptureSettings {
  excludeSubsections: boolean;
  includeSectionHeading: boolean;
}

export interface SectionCopyTweakSettings {
  stripComments: boolean;
  stripMetadata: boolean;
  stripModifiedEmpty: boolean;
  stripTagLines: boolean;
}

export type SectionCopySettings = SectionCopyCaptureSettings &
  SectionCopyDisplaySettings &
  SectionCopyTweakSettings;

export const DEFAULT_SETTINGS: Partial<SectionCopySettings> = {
  displayAlways: false,
  displayTitle: true,
  displayH1: true,
  displayH2: true,
  displayH3: true,
  displayH4: true,
  displayH5: true,
  displayH6: true,
  excludeSubsections: false,
  includeSectionHeading: true,
  stripComments: false,
  stripMetadata: true,
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
      .setName("Include section heading")
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
      .setName("Stop at subsections")
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
      .setName("Strip comments")
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
      .setName("Strip metadata")
      .setDesc("Remove metadata when copying whole files?")
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.stripMetadata)
          .onChange(async (value) => {
            this.plugin.settings.stripMetadata = value;
            await this.plugin.saveSettings();
          }),
      );
    new Setting(containerEl)
      .setName("Strip tag lines")
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
      .setName("Remove modified-to-empty lines?")
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

    new Setting(containerEl)
      .setName("Where to display the copy button")
      .setDesc("Note: a reload is required for these to take effect.")
      .setHeading();

    new Setting(containerEl)
      .setName(`Always show`)
      .setDesc(`Always display the copy button, not just on hover`)
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.displayAlways)
          .onChange(async (value) => {
            this.plugin.settings.displayAlways = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(`Display on title`)
      .setDesc(`Add a copy button to the title`)
      .addToggle((toggle: ToggleComponent) =>
        toggle
          .setValue(this.plugin.settings.displayTitle)
          .onChange(async (value) => {
            this.plugin.settings.displayTitle = value;
            await this.plugin.saveSettings();
          }),
      );

    for (let level of [1, 2, 3, 4, 5, 6] as (1 | 2 | 3 | 4 | 5 | 6)[]) {
      new Setting(containerEl)
        .setName(`Display on section level ${level}`)
        .setDesc(`Add a copy button to level ${level} section headers`)
        .addToggle((toggle: ToggleComponent) =>
          toggle
            .setValue(this.plugin.settings[`displayH${level}`])
            .onChange(async (value) => {
              this.plugin.settings[`displayH${level}`] = value;
              await this.plugin.saveSettings();
            }),
        );
    }
  }
}
