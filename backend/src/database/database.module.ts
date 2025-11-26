import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI') ?? 'mongodb://mongo:27017/socialbook',
        dbName: config.get<string>('MONGODB_DB') ?? 'socialbook',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
