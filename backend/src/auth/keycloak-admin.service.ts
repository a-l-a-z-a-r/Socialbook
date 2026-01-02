import { Injectable } from '@nestjs/common';
import https from 'https';
import type { IncomingHttpHeaders } from 'http';

type SignupPayload = {
  username: string;
  password: string;
};

type KeycloakConfig = {
  url: string;
  realm: string;
  clientId: string;
  clientSecret: string;
};

@Injectable()
export class KeycloakAdminService {
  private config?: KeycloakConfig;
  private tokenUrl?: URL;

  private loadConfig() {
    if (this.config && this.tokenUrl) {
      return;
    }

    const url = process.env.KEYCLOAK_URL;
    const realm = process.env.KEYCLOAK_REALM || 'myapp';
    const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;

    if (!url || !clientId || !clientSecret) {
      throw new Error('Keycloak admin client is not configured');
    }

    this.config = { url, realm, clientId, clientSecret };
    this.tokenUrl = new URL(`${url}/realms/${realm}/protocol/openid-connect/token`);
  }

  async createUser(payload: SignupPayload) {
    this.loadConfig();
    const token = await this.fetchAdminToken();
    const { url, realm } = this.config!;
    const endpoint = new URL(`${url}/admin/realms/${realm}/users`);

    const body = JSON.stringify({
      username: payload.username,
      enabled: true,
      emailVerified: false,
      credentials: [
        {
          type: 'password',
          value: payload.password,
          temporary: false,
        },
      ],
    });

    const result = await this.request('POST', endpoint, {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }, body);

    if (result.status < 200 || result.status >= 300) {
      const detail = result.body || 'Failed to create user';
      const error = new Error(detail);
      (error as any).status = result.status;
      throw error;
    }
  }

  private async fetchAdminToken() {
    const { clientId, clientSecret } = this.config!;
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const result = await this.request(
      'POST',
      this.tokenUrl!,
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      params.toString(),
    );

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Keycloak token request failed (${result.status})`);
    }

    const data = JSON.parse(result.body || '{}');
    if (!data.access_token) {
      throw new Error('Keycloak token response missing access_token');
    }

    return data.access_token as string;
  }

  private request(
    method: string,
    url: URL,
    headers: Record<string, string>,
    body?: string,
  ) {
    return new Promise<{ status: number; body: string; headers: IncomingHttpHeaders }>(
      (resolve, reject) => {
        const req = https.request(
          url,
          { method, headers },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            res.on('end', () => {
              resolve({
                status: res.statusCode || 0,
                body: Buffer.concat(chunks).toString('utf8'),
                headers: res.headers,
              });
            });
          },
        );

        req.on('error', reject);
        if (body) {
          req.write(body);
        }
        req.end();
      },
    );
  }
}
