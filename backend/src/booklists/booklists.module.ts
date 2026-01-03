import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booklist, BooklistSchema } from './booklist.schema';
import { BooklistItem, BooklistItemSchema } from './booklist-item.schema';
import { BooklistsController } from './booklists.controller';
import { BooklistsService } from './booklists.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booklist.name, schema: BooklistSchema },
      { name: BooklistItem.name, schema: BooklistItemSchema },
    ]),
  ],
  controllers: [BooklistsController],
  providers: [BooklistsService],
})
export class BooklistsModule {}
