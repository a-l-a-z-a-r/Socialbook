import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

type AuthRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: unknown;
};

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
  private issuer?: string;
  private audience?: string;

  private ensureConfig() {
    if (this.jwks && this.issuer) {
      return;
    }

    const keycloakUrl = process.env.KEYCLOAK_URL;
    if (!keycloakUrl) {
      throw new UnauthorizedException('KEYCLOAK_URL is not configured');
    }

    const realm = process.env.KEYCLOAK_REALM || 'myapp';
    this.issuer = `${keycloakUrl}/realms/${realm}`;
    this.audience = process.env.KEYCLOAK_AUDIENCE || undefined;
    this.jwks = createRemoteJWKSet(
      new URL(`${this.issuer}/protocol/openid-connect/certs`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.ensureConfig();

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const rawHeader = request.headers.authorization || request.headers.Authorization;
    const authHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const verifyOptions = this.audience
        ? { issuer: this.issuer, audience: this.audience }
        : { issuer: this.issuer };

      const { payload } = await jwtVerify(token, this.jwks!, verifyOptions);

      request.user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
