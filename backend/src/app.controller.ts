import { Body, Controller, Get, HttpException, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ReviewPayload } from './reviews/reviews.service';
import { KeycloakAuthGuard } from './auth/keycloak.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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

  @Get('health')
  health() {
    return this.appService.health();
  }
}
