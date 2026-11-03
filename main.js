const { Plugin, Notice, TFile, TFolder, normalizePath } = require('obsidian');

const FALLBACK = 'Home.md';
const URI_ACTION = 'add-to-home';

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
      if (!(file instanceof TFile || (file instanceof TFolder && !file.isRoot()))) return;
      menu.addItem(i => i.setTitle('Add to Home').setIcon('home').onClick(() => this.add(file)));
    }));
    // obsidian://add-to-home?folder=<path> — показати теку у файловому провіднику
    this.registerObsidianProtocolHandler(URI_ACTION, p => this.reveal(p.folder));
  }

  async add(file) {
    const path = this.homePath();
    let home = this.app.vault.getAbstractFileByPath(path);
    if (!(home instanceof TFile)) home = await this.app.vault.create(path, '');
    if (home.path === file.path) return new Notice('Це і є Home');

    let link, title = '', name;
    if (file instanceof TFolder) {
      name = file.name;
      const note = this.folderNote(file);
      if (note) {
        link = this.app.fileManager.generateMarkdownLink(note, home.path, undefined,
          note.basename === name ? undefined : name);
        title = await this.title(note).catch(() => '');
      } else {
        const uri = 'obsidian://' + URI_ACTION + '?vault=' + encodeURIComponent(this.app.vault.getName()) +
          '&folder=' + encodeURIComponent(file.path);
        link = '[📁 ' + name.replace(/[[\]]/g, '\\$&') + '](' + uri + ')';
      }
    } else {
      name = file.basename;
      link = this.app.fileManager.generateMarkdownLink(file, home.path);
      title = await this.title(file).catch(() => '');
    }

    if ((await this.app.vault.read(home)).includes(link)) return new Notice('Вже є в ' + home.basename);
    const line = '- ' + link + (title && title !== name ? ': ' + title : '') + '\n';
    await this.app.vault.process(home, t => t + (t && !t.endsWith('\n') ? '\n' : '') + line);
    new Notice('Додано в ' + home.basename);
  }

  // нотатка теки: Тека/Тека.md, Тека/index.md або Тека.md поруч із текою
  folderNote(folder) {
    const parent = folder.parent && !folder.parent.isRoot() ? folder.parent.path + '/' : '';
    for (const p of [`${folder.path}/${folder.name}.md`, `${folder.path}/index.md`, `${parent}${folder.name}.md`]) {
      const f = this.app.vault.getAbstractFileByPath(normalizePath(p));
      if (f instanceof TFile) return f;
    }
    return null;
  }

  reveal(path) {
    const folder = path && this.app.vault.getAbstractFileByPath(normalizePath(path));
    if (!(folder instanceof TFolder)) return new Notice('Теки нема: ' + path);
    const explorer = this.app.internalPlugins?.getEnabledPluginById?.('file-explorer');
    if (!explorer?.revealInFolder) return new Notice('Файловий провідник вимкнено');
    explorer.revealInFolder(folder);
  }

  // заголовок документа для відомих типів; '' якщо невідомий тип або заголовка нема
  async title(file) {
    const ext = file.extension.toLowerCase();
    let t = '';
    if (ext === 'md') {
      const c = this.app.metadataCache.getFileCache(file);
      t = c?.frontmatter?.title || c?.headings?.find(h => h.level === 1)?.heading || '';
    } else if (['html', 'htm', 'xhtml'].includes(ext)) {
      const doc = new DOMParser().parseFromString(await this.app.vault.cachedRead(file), 'text/html');
      t = doc.title || doc.querySelector('h1')?.textContent || '';
    } else if (ext === 'svg') {
      const doc = new DOMParser().parseFromString(await this.app.vault.cachedRead(file), 'image/svg+xml');
      t = doc.querySelector('title')?.textContent || '';
    }
    return String(t).replace(/\s+/g, ' ').trim();
  }
};
