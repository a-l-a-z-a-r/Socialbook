import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('feed')
  getFeed() {
    return this.appService.getFeed();
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
  getReviews() {
    return this.appService.getReviews();
  }

  @Post('reviews')
  createReview(@Body() body: any) {
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
