# Veiled Web App

Landing page and marketing site for Veiled.

## Overview

This is the public-facing website for Veiled, providing information about the project, documentation, and links to the demo application.

## Development

### Setup

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

The site will be available at `http://localhost:5173`

### Building

```bash
# Production build
bun run build

# Preview production build
bun run preview
```

## Deployment

The web app is configured to deploy to Vercel:

```bash
# Deploy to Vercel
vercel deploy
```

## Project Structure

```
apps/web/
├── src/
│   ├── routes/          # SvelteKit routes
│   ├── lib/             # Shared components and utilities
│   └── ...
└── ...
```

## Features

- Landing page with project overview
- Documentation sections
- Links to demo and GitHub
- Responsive design

## Learn More

- [Main README](../../README.md)
- [About Veiled](../../ABOUT.md)
