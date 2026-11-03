# Add to Home

Obsidian plugin: adds **Add to Home** to the file context menu. It appends `- [[link]]: Title` (title from md/html/svg, if any) to the
homepage note configured in the Homepage plugin (falls back to `Home.md`). Skips duplicates.

Install via BRAT: *Add Beta plugin* → `<user>/obsidian-add-to-home`.

New version: bump `version` in `manifest.json` (+ `versions.json`), commit, `git tag X.Y.Z && git push --tags` —
the workflow publishes the release.
