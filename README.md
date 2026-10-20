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
| `VITE_USER_ID` | `dev-user` | Who the UI acts as until Auth0 is enabled, sent as `X-User-Id`. Baked into the build. |
| `VITE_PRINTSCRIPT_VERSION` | `1.1` | The version new snippets are created with. Baked into the build. |

Until Auth0, sharing takes whatever you type in the share dialog as the user id. snippet-service does not support formatting unsaved code, deleting snippets, or editing and removing tests yet: those buttons fail with an error in the console.

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

## Enable Auth0

This application uses https://www.npmjs.com/package/@auth0/auth0-react library for Auth0 integration, to enable it you need to change:
* Uncomment autologin in [App.tsx](src/App.tsx)
* Uncomment token retrieval for operations [queries.tsx](src/utils/queries.tsx) 
* Create a `.env` file with the required env vars:
```
VITE_AUTH0_DOMAIN=<domain>
VITE_AUTH0_CLIENT_ID=<client_id>
```

If you get 401 loop when getting token:
* Change application type in Auth0 to "Regular Web Application"
* In Application Settings > Credentials > "Authentication Method" select "None" 

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