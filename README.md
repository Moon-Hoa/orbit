# Orbit

React + Vite + TypeScript + Tailwind CSS.

## Development

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run test` — run the Vitest suite
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build locally

## Deployment

Every push to `main` runs the [deploy workflow](.github/workflows/deploy.yml), which builds the app and publishes it to GitHub Pages. Enable Pages once under the repo's **Settings → Pages** by setting the source to **GitHub Actions**.
