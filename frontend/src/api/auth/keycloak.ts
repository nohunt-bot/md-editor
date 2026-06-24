import type Keycloak from 'keycloak-js'

let keycloakInstance: Keycloak | null = null
let token: string | null = null

export function initKeycloak(keycloak: Keycloak) {
  keycloakInstance = keycloak
}

export function getToken(): string | null {
  if (keycloakInstance) {
    return keycloakInstance.token || null
  }
  return token
}

export async function refreshToken(): Promise<void> {
  if (keycloakInstance) {
    try {
      const refreshed = await keycloakInstance.updateToken(30)
      if (refreshed) {
        token = keycloakInstance.token || null
      }
    } catch (error) {
      console.error('Failed to refresh token:', error)
      throw error
    }
  }
}

export function isAuthenticated(): boolean {
  return keycloakInstance?.authenticated || false
}

export function getUserInfo() {
  if (keycloakInstance?.tokenParsed) {
    return {
      sub: keycloakInstance.tokenParsed.sub,
      email: keycloakInstance.tokenParsed.email,
      name: keycloakInstance.tokenParsed.name,
      preferredUsername: keycloakInstance.tokenParsed.preferred_username,
      roles: keycloakInstance.tokenParsed.realm_access?.roles || []
    }
  }
  return null
}

export function hasRole(role: string): boolean {
  const userInfo = getUserInfo()
  return userInfo?.roles.includes(role) || false
}
