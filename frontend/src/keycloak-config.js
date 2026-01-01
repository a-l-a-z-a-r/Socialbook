export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || '',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'myapp',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'my-frontend-app',
};

export const hasKeycloakConfig = () =>
  Boolean(keycloakConfig.url && keycloakConfig.realm && keycloakConfig.clientId);
