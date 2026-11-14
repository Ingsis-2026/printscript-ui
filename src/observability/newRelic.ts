// Browser monitoring de New Relic: tiempos de carga, errores de JavaScript, pedidos a la API y navegación dentro de la
// SPA, vistos desde el navegador de cada usuario. Los valores salen de la aplicación de browser que crea Terraform en
// infra/newrelic (outputs browser_*) y se hornean en el build, como los de Auth0. La license key de browser es
// pública a propósito: viaja a todos los navegadores.
//
// Sin VITE_NEW_RELIC_APPLICATION_ID o VITE_NEW_RELIC_LICENSE_KEY no se hace nada: ni se descarga el agente. Así el
// desarrollo local no reporta nada.
const applicationID: string | undefined = import.meta.env.VITE_NEW_RELIC_APPLICATION_ID || undefined
const licenseKey: string | undefined = import.meta.env.VITE_NEW_RELIC_LICENSE_KEY || undefined
const accountID: string | undefined = import.meta.env.VITE_NEW_RELIC_ACCOUNT_ID || undefined
const trustKey: string | undefined = import.meta.env.VITE_NEW_RELIC_TRUST_KEY || undefined
// En una aplicación de browser el agentID es el mismo applicationID.
const agentID: string | undefined = import.meta.env.VITE_NEW_RELIC_AGENT_ID || applicationID
const environment: string | undefined = import.meta.env.VITE_NEW_RELIC_ENVIRONMENT || undefined

export const startNewRelic = async (): Promise<void> => {
  if (!applicationID || !licenseKey) return

  try {
    // El import dinámico deja el agente en su propio chunk: solo lo baja quien lo va a usar.
    const [
      {Agent},
      {Ajax},
      {JSErrors},
      {Metrics},
      {PageViewEvent},
      {PageViewTiming},
      {SoftNav},
    ] = await Promise.all([
      import('@newrelic/browser-agent/loaders/agent'),
      import('@newrelic/browser-agent/features/ajax'),
      import('@newrelic/browser-agent/features/jserrors'),
      import('@newrelic/browser-agent/features/metrics'),
      import('@newrelic/browser-agent/features/page_view_event'),
      import('@newrelic/browser-agent/features/page_view_timing'),
      import('@newrelic/browser-agent/features/soft_navigations'),
    ])

    // Solo lo que se mira en el dashboard y las alertas: sin session replay ni session trace, que pesan más y en el
    // plan gratuito se cobran aparte.
    const agent = new Agent({
      info: {applicationID, licenseKey},
      // accountID y trustKey hacen falta para el distributed tracing: con ellos, los pedidos a /api (mismo origen)
      // llevan los headers traceparent y newrelic, y el trace de snippet-service arranca en el navegador.
      loader_config: {accountID, trustKey, agentID, applicationID, licenseKey},
      init: {
        distributed_tracing: {enabled: Boolean(accountID && trustKey)},
      },
      features: [Ajax, JSErrors, Metrics, PageViewEvent, PageViewTiming, SoftNav],
    })

    // dev y prod reportan cada uno a su aplicación, pero así cada PageView, error y pedido también dice de qué
    // entorno viene (sirve para filtrar en NRQL sin depender del nombre de la aplicación).
    if (environment) agent.setCustomAttribute('environment', environment)
  } catch (error) {
    // Que el monitoreo no tire abajo la UI: si el agente no carga, la app sigue igual.
    console.warn('New Relic browser agent did not start', error)
  }
}
