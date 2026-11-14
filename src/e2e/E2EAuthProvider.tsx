import {ReactNode, useState} from "react";
import {Auth0Context, Auth0ContextInterface, initialContext, User} from "@auth0/auth0-react";

/**
 * Los tests e2e (cypress/) corren sin Auth0: con el dev server en modo e2e (`npm run dev:e2e`) la app
 * se monta con este usuario ya logueado y un token de mentira. snippet-service tampoco existe ahí: los
 * tests stubbean `/api/**`, así que el token nunca se valida.
 *
 * Solo se monta cuando `isE2EAuth()` da true, y eso nunca pasa en un `vite build` (ver abajo). El
 * módulo no hace nada al importarlo, para que el build lo pueda descartar entero.
 */

// El sub es el ownerId de los snippets propios en cypress/fixtures: así la UI muestra los botones del owner.
export const E2E_USER: User = {
    sub: 'auth0|e2e-user',
    name: 'E2E User',
    email: 'e2e@snippet-searcher.test',
}

export const E2E_TOKEN = 'e2e-dummy-token'

/**
 * `import.meta.env.DEV` es false en cualquier `vite build`, sea cual sea el modo, y Vite lo reemplaza
 * por la constante: en main.tsx la rama queda muerta, el bundle no incluye este módulo y una imagen de
 * producción no puede saltearse el login aunque alguien buildee con `--mode e2e`. El CI lo verifica
 * buscando E2E_TOKEN en dist/.
 */
export const isE2EAuth = (): boolean => import.meta.env.DEV && import.meta.env.MODE === 'e2e'

const e2eContext = (): Auth0ContextInterface => ({
    ...initialContext,
    isAuthenticated: true,
    isLoading: false,
    user: E2E_USER,
    getAccessTokenSilently: (() => Promise.resolve(E2E_TOKEN)) as Auth0ContextInterface['getAccessTokenSilently'],
    getIdTokenClaims: () => Promise.resolve(undefined),
    loginWithRedirect: () => Promise.resolve(),
    logout: () => Promise.resolve(),
})

// Hace de Auth0Provider: useAuth0 y withAuthenticationRequired leen Auth0Context y lo encuentran logueado.
export const E2EAuthProvider = ({children}: { children: ReactNode }) => {
    const [value] = useState(e2eContext)
    // Por las dudas: si algún día terminara en un build, que falle en vez de dejar entrar a cualquiera.
    if (!isE2EAuth()) throw new Error('E2EAuthProvider solo existe en el dev server en modo e2e')
    return <Auth0Context.Provider value={value}>{children}</Auth0Context.Provider>
}
