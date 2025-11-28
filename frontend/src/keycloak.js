import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://keycloak.46-62-130-16.nip.io',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'socialbook',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'socialbook-frontend',
});

export default keycloak;
