# Career workspace

A free hosted job-search frontend. Private workspace data is imported into this browser's local storage; no personal export or application data ships with this site. Export a backup before clearing browser storage or moving devices.

The deployed bundle contains generic frontend code and a public job-source registry. AI ranking requires the separate local workspace and Ollama/Laya on your computer. GitHub Pages does not run the Python backend or a local language model.

## Publish

Create a public GitHub repository containing only this directory. In Settings > Pages choose GitHub Actions. Push to main to run the included Pages workflow.

## Privacy

Keep LinkedIn exports, profile JSON, contacts, backups, databases, model files and credentials outside this repository. Imported private data stays in the current browser unless you explicitly export it or pair with a local workspace. The hosting provider receives normal website requests. Browser storage is not encrypted and is not a cross-device backup.
