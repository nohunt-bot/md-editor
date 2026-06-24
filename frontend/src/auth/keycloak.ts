import Keycloak from 'keycloak-js'

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8081',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'skill-md',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'skill-md'
})

export async function initKeycloak(): Promise<boolean> {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html'
    })
    return authenticated
  } catch (error) {
    console.error('Keycloak init failed:', error)
    return false
  }
}

export function getToken(): string | undefined {
  return keycloak.token
}

export function refreshToken(): Promise<void> {
  return keycloak.updateToken(60)
    .then(() => console.log('Token refreshed'))
    .catch(() => keycloak.login())
}

export function getUserInfo() {
  return {
    id: keycloak.subject,
    email: keycloak.idTokenParsed?.email,
    name: keycloak.idTokenParsed?.name || keycloak.idTokenParsed?.preferred_username,
    roles: keycloak.resourceAccess?.['skill-md']?.roles || []
  }
}

export function hasRole(role: string): boolean {
  const roles = getUserInfo().roles
  return roles.includes(role) || roles.includes('skill-admin')
}
