# Local file tools

These bundles are served from this website. The browser does not send files to a third-party conversion service. The optional ONLYOFFICE editor uses the document server configured by the site owner.

| Library | Version | Official source | License notice |
| --- | --- | --- | --- |
| pdf-lib | 1.17.1 | https://github.com/Hopding/pdf-lib / https://registry.npmjs.org/pdf-lib | `pdf-lib.min.js.LICENSE` (MIT) |
| @pdf-lib/fontkit | 1.1.1 | https://github.com/Hopding/fontkit / https://registry.npmjs.org/@pdf-lib/fontkit | `fontkit.LICENSE` (MIT declaration and attribution) |
| JSZip | 3.10.2 | https://github.com/Stuk/jszip / https://registry.npmjs.org/jszip | `jszip.min.js.LICENSE` (MIT or GPL; use under MIT) |
| SheetJS Community Edition | 0.20.3 | https://docs.sheetjs.com/docs/getting-started/installation/standalone/ / https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz | `xlsx.LICENSE` (Apache-2.0) |
| Noto Sans Regular | Static TTF | https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSans | `NotoSans.LICENSE` (SIL Open Font License 1.1) |

`SOURCES.json` records source URLs and the SHA-256 of each distributed bundle/font. The npm archives for pdf-lib, fontkit, and JSZip were checked against the registry's SHA-512 integrity before extracting the bundles. SheetJS is from its authoritative CDN because the public npm package is outdated. The official standalone documentation identifies 0.20.3 as the current release.

The fontkit release declares MIT in its npm manifest and official README but does not distribute a separate license file. `fontkit.LICENSE` retains that declaration, the upstream/fork links, author attribution, and the MIT permission text. No runtime bundles were modified.

`file-editors.js` loads libraries lazily through `C122.FileLibraries.load(name)`. `NotoSans-Regular.ttf` is embedded as a subset for PDF text, including Mongolian Cyrillic.
