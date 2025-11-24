# VHR Dashboard (VR Manager)

This repository contains the VHR Dashboard project: a Node.js app for managing and streaming VR headsets and a static `site-vitrine` folder for the marketing website.

Preview (GitHub Pages)
----------------------

The repository includes a GitHub Actions workflow to publish the `site-vitrine/` folder to the `gh-pages` branch on pushes to the `feat/dev-setup-pr` branch.

How to use:
- Push to `feat/dev-setup-pr` branch.
- In GitHub, open the `Actions` tab to see the workflow run.
- Once the workflow completes, enable GitHub Pages on branch `gh-pages` (Settings -> Pages) if not already enabled.
- Your preview is then available at: https://regatpeter-source.github.io/vhr-dashboard-site/

Notes:
- This workflow publishes only the static site in `site-vitrine`; the backend (Express server) is not deployed in this preview.
- For dynamic preview (backend), consider using platforms such as Heroku, Render, or Vercel and set up environment variables accordingly.
