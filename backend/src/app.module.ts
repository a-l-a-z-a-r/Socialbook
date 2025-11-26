import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, ReviewsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
