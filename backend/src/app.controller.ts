import { Body, Controller, Get, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ReviewPayload } from './reviews/reviews.service';
import { KeycloakAuthGuard } from './auth/keycloak.guard';
import { KeycloakAdminService } from './auth/keycloak-admin.service';

type SignupPayload = {
  username: string;
  password: string;
};

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly keycloakAdminService: KeycloakAdminService,
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
    const { username, password } = body || {};
    if (!username || !password) {
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

  @Get('health')
  health() {
    return this.appService.health();
  }
}
