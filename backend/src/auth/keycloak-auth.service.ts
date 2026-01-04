import { Injectable } from '@nestjs/common';

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  token_type?: string;
  scope?: string;
};

@Injectable()
export class KeycloakAuthService {
  private tokenUrl?: URL;
  private clientId?: string;

  private loadConfig() {
    if (this.tokenUrl && this.clientId) {
      return;
    }

    const url = process.env.KEYCLOAK_URL;
    const realm = process.env.KEYCLOAK_REALM || 'myapp';
    const clientId = process.env.KEYCLOAK_PUBLIC_CLIENT_ID;

    if (!url || !clientId) {
      throw new Error('Keycloak public client is not configured');
    }

    this.clientId = clientId;
    this.tokenUrl = new URL(`${url}/realms/${realm}/protocol/openid-connect/token`);
  }

  async loginWithPassword(username: string, password: string): Promise<TokenResponse> {
    this.loadConfig();

    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId!,
      username,
      password,
    });

    const result = await this.request(
      'POST',
      this.tokenUrl!,
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      params.toString(),
    );

    if (result.status < 200 || result.status >= 300) {
      const detail = result.body || 'Keycloak login failed';
      const error = new Error(detail);
      (error as any).status = result.status;
      throw error;
    }

    return JSON.parse(result.body || '{}') as TokenResponse;
  }

  private request(
    method: string,
    url: URL,
    headers: Record<string, string>,
    body?: string,
  ) {
    return this.requestWithFetch(method, url, headers, body);
  }

  private async requestWithFetch(
    method: string,
    url: URL,
    headers: Record<string, string>,
    body?: string,
  ) {
    const response = await fetch(url, { method, headers, body });
    const text = await response.text();
    return {
      status: response.status,
      body: text,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }
}
