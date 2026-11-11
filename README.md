# peekmd

A small Markdown previewer that runs in your browser. Drop a `.md` or `.markdown` file into the window, or choose **Open File**, to preview it.

peekmd reads the file locally in your browser and keeps its contents on your device. Your browser may still request remote images and links referenced in the Markdown.

## Demo

[Watch the demo](docs/demo.mp4) (14 seconds).

## Run locally

Install Node.js and npm, then run these commands from the repository directory:

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal.

## Verify changes

Run these checks before shipping a change:

```sh
npm run test
npm run lint
npm run fmt:check
npm run build
```

## Credits

Ideas and help from Sam ([@SamFHarrison](https://github.com/SamFHarrison)).
