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

Full deployment (backend + frontend) with Render
-----------------------------------------------

This repository includes a `Dockerfile` so you can deploy the full Node.js backend (including dependencies like adb, ffmpeg, scrcpy) on Render or similar services. Note that streaming features depend on network access to devices, and may not work if Render cannot reach the device network.

Render quick deployment steps:
1. Create a new Web Service on Render: https://dashboard.render.com/new/web-service.
2. Connect your GitHub repository and select the `feat/dev-setup-pr` branch.
3. Choose Docker as the Environment (Render will use the included Dockerfile).
4. Add environment variables in the Render dashboard: `STRIPE_SECRET_KEY`, `JWT_SECRET`, `NO_ADB` (set to `1` for Skip ADB or `0` to enable), `STRIPE_DEBUG_PRICES`, `PORT`.
5. Save and deploy. The Deploy logs are available in Render’s dashboard.

Optional: automatic redeploy from GitHub Actions
1. Create and configure a Render Web Service as above.
2. Add `RENDER_API_KEY` (your Render API key) and `RENDER_SERVICE_ID` (the service's id) to the repository secrets in GitHub.
3. The included `.github/workflows/deploy-full-app.yml` will trigger a Render redeploy on pushes to `feat/dev-setup-pr`.

