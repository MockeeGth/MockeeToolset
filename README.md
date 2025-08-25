# Mockee Mockup Toolset

A web application for mockup generation workflow tools.

## Features

- Clean, modern interface with the Mockee logo
- Responsive design that works on all devices
- React Router setup for future tool pages
- Ready for deployment to Netlify

## Development

To run the development server:

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173/`

## Build

To build for production:

```bash
npm run build
```

The build output will be in the `dist/` folder.

## Deployment

This project is configured for easy deployment to Netlify:

1. Connect your repository to Netlify
2. The build settings are automatically configured via `netlify.toml`
3. Deploy!

## Adding New Tools

Tools can be added by:

1. Creating new components in the `src/components/` directory
2. Adding routes in `src/App.jsx`
3. Creating corresponding pages in `src/pages/`
