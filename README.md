# Printscript UI

This is a React project using Vite and Node.js 20. This README will guide you on how to set up and start the project locally.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have installed Node.js 20 or later
- You have installed npm

## Getting Started

To get a local copy up and running, follow these steps:

### 1. Fork this Repository in your github account

### 2. Clone the Repository

```bash
git clone https://github.com/your-username/printscript-ui.git
```

###  3. Navigate to the Project Directory
```bash
cd printscript-ui
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Start the Development Server

```bash
npm run dev
```

This will start the Vite development server. You can now open your browser and navigate to http://localhost:5173/ to see the application running.

## Snippet Searcher backend

The UI talks to [`snippet-service`](https://github.com/Ingsis-2026/snippet-service) through `SnippetServiceOperations` ([snippetServiceOperations.ts](src/utils/snippetServiceOperations.ts)). Every call goes to `/api`: in dev the Vite server proxies it to snippet-service, and in the Docker image nginx does. Neither keeps the `/api` prefix.

| Variable | Default | |
|---|---|---|
| `SNIPPET_SERVICE_URL` | `http://localhost:8080` in dev, `http://snippet-service:8080` in Docker | Where `/api` goes. Read when the server starts. |
| `VITE_AUTH0_DOMAIN` / `VITE_AUTH0_CLIENT_ID` / `VITE_AUTH0_AUDIENCE` | The development tenant, its "Snippet Searcher UI" app and `https://snippet-searcher/api` | Where users log in, and the API their access token is for. None of them is a secret. Baked into the build. |
| `VITE_PRINTSCRIPT_VERSION` | `1.1` | The version the create form starts with (the user can pick another). Baked into the build. |

Every page asks for an Auth0 login, and every call to snippet-service carries the user's access token in `Authorization`. The share dialog lists the users whose name or email starts with what you type (US7), from snippet-service's `GET /users`.

```bash
docker build -t printscript-ui .
docker run -p 5173:80 -e SNIPPET_SERVICE_URL=http://snippet-service:8080 printscript-ui
```

nginx resolves `SNIPPET_SERVICE_URL` with Docker's DNS, so the container has to run on a Docker network (Compose or Swarm), not the default bridge.

## Build production version

To use this UI in production you should use an optimized and static version, this command will generate this version in `dist` directory:  

```bash
npm run build
```

## Cypress

To start cypress, make sure that the UI is running and enter: 

```bash
npm run cypress
```

## Auth0

Auth0 is enabled with https://www.npmjs.com/package/@auth0/auth0-react: [App.tsx](src/App.tsx) sends anyone not logged in to Auth0's login page, and [queries.tsx](src/utils/queries.tsx) gives `SnippetServiceOperations` the access token. The domain, client ID and audience default to the development tenant (see the table above), so a `.env` is only needed to point at another tenant:
```
VITE_AUTH0_DOMAIN=<domain>
VITE_AUTH0_CLIENT_ID=<client_id>
VITE_AUTH0_AUDIENCE=<API identifier>
```

The UI asks for the scopes `read:snippets` and `write:snippets` (besides `openid profile email`), which snippet-service requires: they are set once in `authorizationParams` ([main.tsx](src/main.tsx)) and every `getAccessTokenSilently` uses them. The API in Auth0 must define both permissions; Auth0 drops requested scopes the API doesn't have. On `localhost` Auth0 always asks for consent, so after the scopes change a silent token request fails with `consent_required` until you log out and log in again.

If you get 401 loop when getting token:
* Change application type in Auth0 to "Regular Web Application"
* In Application Settings > Credentials > "Authentication Method" select "None" 

## New Relic browser monitoring

[newRelic.ts](src/observability/newRelic.ts) starts the New Relic browser agent (`@newrelic/browser-agent`) before React mounts: page loads, JavaScript errors, the calls to `/api` (with distributed tracing, so a snippet-service trace starts in the browser) and route changes. Every event carries an `environment` attribute. Without an application ID and license key it does nothing, not even download the agent, so local development reports nothing.

| Build variable | GitHub variable (repository) | Terraform output (`infra/newrelic`) |
|---|---|---|
| `VITE_NEW_RELIC_ACCOUNT_ID` | `NEW_RELIC_ACCOUNT_ID` | `browser_account_id` |
| `VITE_NEW_RELIC_TRUST_KEY` | `NEW_RELIC_TRUST_KEY` | `browser_trust_key` |
| `VITE_NEW_RELIC_LICENSE_KEY` | `NEW_RELIC_BROWSER_LICENSE_KEY` | `browser_license_key` |
| `VITE_NEW_RELIC_APPLICATION_ID` | `NEW_RELIC_BROWSER_APPLICATION_ID_DEV` / `NEW_RELIC_BROWSER_APPLICATION_ID_PROD` | `browser_application_id` of each workspace |
| `VITE_NEW_RELIC_ENVIRONMENT` | — (the CD passes `dev` or `prod`) | — |

They are baked into the build like the Auth0 ones: the Dockerfile takes them as `ARG` and the CD passes them as build args. They are **variables, not secrets**: the browser license key is public by design, it ships to every browser. They are repository variables (not environment variables) because the image job doesn't use a GitHub environment; dev and prod share the New Relic account, only the application changes. `infra/newrelic` prints them all, with these names, as the `browser_github_variables` output. To try the agent locally, put the `VITE_NEW_RELIC_*` values in a `.env.local`.

## Start working

1. Fork the Project
2. Do your magic

## Contributing

1. Create your Feature Branch in this repo (git checkout -b feature/AmazingFeature)
2. Commit your Changes (git commit -m 'Add some AmazingFeature')
3. Push to the Branch (git push origin feature/AmazingFeature)
4. Open a Pull Request

## Tasks

- [ ] Integrate Auth0 UI and private routes
- [ ] Integrate your endpoints to the UI (Create custom "SnippetOperations")
- [ ] Dockerize
- [ ] CI/CD
- [ ] Sockets*