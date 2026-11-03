const { Plugin, Notice, TFile, normalizePath } = require('obsidian');

const FALLBACK = 'Home.md';

module.exports = class AddToHome extends Plugin {
  homePath() {
    // беремо файл із налаштувань плагіна Homepage, якщо там тип "File"
    const hp = this.app.plugins.plugins['homepage']?.settings?.homepages;
    const cfg = hp && Object.values(hp)[0];
    let p = (cfg && cfg.kind === 'File' && cfg.value) || FALLBACK;
    if (!/\.\w+$/.test(p)) p += '.md';
    return normalizePath(p);
  }

  onload() {
    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (!(file instanceof TFile)) return;
      menu.addItem(i => i.setTitle('Add to Home').setIcon('home').onClick(() => this.add(file)));
    }));
  }

  async add(file) {
    const path = this.homePath();
    let home = this.app.vault.getAbstractFileByPath(path);
    if (!(home instanceof TFile)) home = await this.app.vault.create(path, '');
    if (home.path === file.path) return new Notice('Це і є Home');
    const link = this.app.fileManager.generateMarkdownLink(file, home.path);
    if ((await this.app.vault.read(home)).includes(link)) return new Notice('Вже є в ' + home.basename);
    await this.app.vault.process(home, t => t + (t && !t.endsWith('\n') ? '\n' : '') + '- ' + link + '\n');
    new Notice('Додано в ' + home.basename);
  }
};
