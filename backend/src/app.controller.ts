import { Body, Controller, Get, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { ReviewPayload } from './reviews/reviews.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('feed')
  async getFeed(@Query('offset') offset?: string, @Query('limit') limit?: string) {
    return this.appService.getFeed(
      offset !== undefined ? Number(offset) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Get('shelf')
  getShelf() {
    return this.appService.getShelf();
  }

  @Get('recommendations')
  getRecommendations() {
    return this.appService.getRecommendations();
  }

  @Get('reviews')
  async getReviews() {
    return this.appService.getReviews();
  }

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
