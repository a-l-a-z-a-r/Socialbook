import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ReviewPayload } from './reviews/reviews.service';
import { KeycloakAuthGuard } from './auth/keycloak.guard';
import { KeycloakAdminService } from './auth/keycloak-admin.service';
import { KeycloakAuthService } from './auth/keycloak-auth.service';

type SignupPayload = {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  age?: number | string;
};

type LoginPayload = {
  username: string;
  password: string;
};

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly keycloakAuthService: KeycloakAuthService,
  ) {}

  @UseGuards(KeycloakAuthGuard)
  @Get('feed')
  async getFeed() {
    return this.appService.getFeed();
  }

  @UseGuards(KeycloakAuthGuard)
  @Get('shelf')
  getShelf() {
    return this.appService.getShelf();
  }

  @UseGuards(KeycloakAuthGuard)
  @Get('recommendations')
  getRecommendations() {
    return this.appService.getRecommendations();
  }

  @UseGuards(KeycloakAuthGuard)
  @Get('reviews')
  async getReviews() {
    return this.appService.getReviews();
  }

  @UseGuards(KeycloakAuthGuard)
  @Post('reviews')
  async createReview(@Body() body: ReviewPayload) {
    if (!this.appService.hasRequiredReviewFields(body)) {
      throw new HttpException({ error: 'Missing required fields' }, HttpStatus.BAD_REQUEST);
    }

    return this.appService.addReview(body);
  }

  @Post('signup')
  async signup(@Body() body: SignupPayload) {
    const { username, password, firstName, lastName, age } = body || {};
    if (!username || !password || !firstName || !lastName || !age) {
      throw new HttpException({ error: 'Missing required fields' }, HttpStatus.BAD_REQUEST);
    }

    try {
      await this.keycloakAdminService.createUser(body);
      return { ok: true };
    } catch (err) {
      const status = (err as any)?.status || HttpStatus.BAD_GATEWAY;
      const message = (err as Error)?.message || 'Failed to create user';
      throw new HttpException({ error: message }, status);
    }
  }

  @Get('profile/:username')
  async profile(@Param('username') username: string) {
    if (!username) {
      throw new HttpException({ error: 'Missing username' }, HttpStatus.BAD_REQUEST);
    }

    try {
      const user = await this.keycloakAdminService.findUserByUsername(username);
      if (!user) {
        throw new HttpException({ error: 'User not found' }, HttpStatus.NOT_FOUND);
      }

      return {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        attributes: user.attributes || {},
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const status = (err as any)?.status || HttpStatus.BAD_GATEWAY;
      const message = (err as Error)?.message || 'Failed to load profile';
      throw new HttpException({ error: message }, status);
    }
  }

  @Post('login')
  async login(@Body() body: LoginPayload) {
    const { username, password } = body || {};
    if (!username || !password) {
      throw new HttpException({ error: 'Missing required fields' }, HttpStatus.BAD_REQUEST);
    }

    try {
      const token = await this.keycloakAuthService.loginWithPassword(username, password);
      return token;
    } catch (err) {
      const status = (err as any)?.status || HttpStatus.BAD_GATEWAY;
      const message = (err as Error)?.message || 'Login failed';
      throw new HttpException({ error: message }, status);
    }
  }

  @Get('health')
  health() {
    return this.appService.health();
  }
}
