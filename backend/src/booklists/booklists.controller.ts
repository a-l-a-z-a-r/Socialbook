import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { KeycloakAuthGuard } from '../auth/keycloak.guard';
import { BooklistsService } from './booklists.service';

type CreateBooklistPayload = {
  name: string;
  description?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  coverUrl?: string;
};

type AddBooklistItemPayload = {
  bookId: string;
  notes?: string;
  position?: number;
};

type AuthRequest = {
  user?: Record<string, unknown>;
};

@Controller()
export class BooklistsController {
  constructor(private readonly booklistsService: BooklistsService) {}

  @Get('booklists/:ownerId')
  async listBooklists(@Param('ownerId') ownerId: string) {
    if (!ownerId) {
      throw new HttpException({ error: 'Missing owner' }, HttpStatus.BAD_REQUEST);
    }
    const lists = await this.booklistsService.findByOwner(ownerId);
    return { booklists: lists };
  }

  @UseGuards(KeycloakAuthGuard)
  @Post('booklists')
  async createBooklist(@Body() body: CreateBooklistPayload, @Req() req: AuthRequest) {
    const ownerId = (req.user?.preferred_username as string) || (req.user?.username as string);
    if (!ownerId) {
      throw new HttpException({ error: 'Missing owner' }, HttpStatus.FORBIDDEN);
    }
    if (!body?.name) {
      throw new HttpException({ error: 'Missing name' }, HttpStatus.BAD_REQUEST);
    }
    const created = await this.booklistsService.create(ownerId, body);
    return created;
  }

  @Get('booklists/:booklistId/items')
  async listBooklistItems(@Param('booklistId') booklistId: string) {
    if (!booklistId) {
      throw new HttpException({ error: 'Missing booklist' }, HttpStatus.BAD_REQUEST);
    }
    const items = await this.booklistsService.listItems(booklistId);
    return { items };
  }

  @UseGuards(KeycloakAuthGuard)
  @Post('booklists/:booklistId/items')
  async addBooklistItem(
    @Param('booklistId') booklistId: string,
    @Body() body: AddBooklistItemPayload,
    @Req() req: AuthRequest,
  ) {
    const ownerId = (req.user?.preferred_username as string) || (req.user?.username as string);
    if (!ownerId) {
      throw new HttpException({ error: 'Missing owner' }, HttpStatus.FORBIDDEN);
    }
    if (!booklistId || !body?.bookId) {
      throw new HttpException({ error: 'Missing required fields' }, HttpStatus.BAD_REQUEST);
    }
    const item = await this.booklistsService.addItem(booklistId, ownerId, body);
    return item;
  }
}
