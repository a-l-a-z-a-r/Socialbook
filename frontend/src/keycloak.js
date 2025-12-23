import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://keycloak.ltu-m7011e-japan.se',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'socialbook',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'socialbook-frontend',
});

export default keycloak;
