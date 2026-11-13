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
            Without the audience, Auth0 returns a token snippet-service cannot validate. */}
        <Auth0Provider
            domain={import.meta.env.VITE_AUTH0_DOMAIN ?? "dev-2fvmkxju8g70kqvs.us.auth0.com"}
            clientId={import.meta.env.VITE_AUTH0_CLIENT_ID ?? "jAsdmm8OFvuce8C8AFyAWQ8iv648W4gD"}
            authorizationParams={{
                redirect_uri: window.location.origin,
                audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? "https://snippet-searcher/api",
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
