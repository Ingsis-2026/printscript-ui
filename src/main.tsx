import React from 'react';
import App from './App.tsx'
import './index.css'
import {createRoot} from "react-dom/client";
import {PaginationProvider} from "./contexts/paginationProvider.tsx";
import {SnackbarProvider} from "./contexts/snackbarProvider.tsx";
import {Auth0Provider} from "@auth0/auth0-react";

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {/* The defaults are the development tenant and its "Snippet Searcher UI" app; none of them is a secret.
            Without the audience, Auth0 returns a token snippet-service cannot validate.
            Los scopes van acá y no en cada getAccessTokenSilently: el SDK los usa en todos los pedidos de token que no
            pasan los suyos, así que cada access token se pide con read:snippets y write:snippets, que exige
            snippet-service. */}
        <Auth0Provider
            domain={import.meta.env.VITE_AUTH0_DOMAIN ?? "dev-2fvmkxju8g70kqvs.us.auth0.com"}
            clientId={import.meta.env.VITE_AUTH0_CLIENT_ID ?? "jAsdmm8OFvuce8C8AFyAWQ8iv648W4gD"}
            authorizationParams={{
                redirect_uri: window.location.origin,
                audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? "https://snippet-searcher/api",
                scope: "openid profile email read:snippets write:snippets",
            }}
        >
            <PaginationProvider>
                <SnackbarProvider>
                    <App/>
                </SnackbarProvider>
            </PaginationProvider>
        </Auth0Provider>
    </React.StrictMode>,
)
