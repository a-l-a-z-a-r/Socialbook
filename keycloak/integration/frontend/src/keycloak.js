import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'https://keycloak.ltu-m7011e-11.se',  // Change to your Keycloak URL
  realm: 'Userenter',
  clientId: 'socialbook'
});

export default keycloak;
