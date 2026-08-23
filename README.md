# peekmd

A tiny, Markdown previewer. Drop a `.md` file into the window and peekmd typesets it instantly.

The source file is read locally in your browser and is not uploaded by peekmd. Markdown can still reference remote images and links, which your browser may request when rendered.

## Run locally

```sh
npm install
npm run dev
```

Before shipping a change:

```sh
npm run lint
npm run fmt:check
npm run build
```

## Credits

Ideas and help from Sam ([@SamFHarrison](https://github.com/SamFHarrison))
