import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from './review.schema';

export type ReviewPayload = {
  user?: string;
  book?: string;
  rating?: number | string;
  review?: string;
  genre?: string;
  status?: string;
  coverUrl?: string;
};

@Injectable()
export class ReviewsService {
  constructor(@InjectModel(Review.name) private reviewModel: Model<ReviewDocument>) {}

  async findAll(): Promise<Review[]> {
    return this.reviewModel.find().sort({ created_at: -1 }).lean().exec();
  }

  async deleteByCoverUrl(coverUrl: string) {
    if (!coverUrl) return;
    await this.reviewModel.deleteMany({ coverUrl }).exec();
  }

  async isCoverValid(coverUrl: string, minBytes: number, minDimension: number) {
    let parsed: URL;
    try {
      parsed = new URL(coverUrl);
    } catch {
      return false;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    if (typeof fetch !== 'function') {
      return true;
    }

    const headOk = await this.checkCoverHead(coverUrl, minBytes, minDimension);
    if (headOk !== null) return headOk;
    return this.checkCoverGet(coverUrl, minBytes, minDimension);
  }

  async create(payload: ReviewPayload): Promise<Review> {
    const rating = Number(payload.rating);

    const created = await this.reviewModel.create({
      user: payload.user,
      book: payload.book,
      rating,
      review: payload.review,
      genre: payload.genre,
      status: payload.status ?? 'review',
      coverUrl: payload.coverUrl,
    });

    return created.toObject();
  }

  private async checkCoverHead(url: string, minBytes: number, minDimension: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
      if (res.status === 405 || res.status === 501) return null;
      const contentType = res.headers.get('content-type');
      if (contentType && !this.isImageContentType(contentType)) return false;
      const lengthHeader = res.headers.get('content-length');
      if (!lengthHeader) return null;
      const length = Number(lengthHeader);
      if (!Number.isFinite(length)) return null;
      return length < minBytes ? false : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async checkCoverGet(url: string, minBytes: number, minDimension: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Range: `bytes=0-${Math.max(minBytes, 16384) - 1}` },
        signal: controller.signal,
      });
      const contentType = res.headers.get('content-type');
      if (contentType && !this.isImageContentType(contentType)) return false;
      const buffer = await res.arrayBuffer();
      const sizeOk = this.isMinBytes(buffer, res.headers.get('content-length'), minBytes);
      if (!sizeOk) return false;
      const dimensions = this.getImageDimensions(buffer);
      if (!dimensions) return false;
      return dimensions.width >= minDimension && dimensions.height >= minDimension;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private isImageContentType(value: string) {
    const normalized = value.toLowerCase();
    if (!normalized.startsWith('image/')) return false;
    if (normalized.includes('image/gif')) return false;
    return true;
  }

  private isMinBytes(buffer: ArrayBuffer, lengthHeader: string | null, minBytes: number) {
    if (lengthHeader) {
      const length = Number(lengthHeader);
      if (Number.isFinite(length)) {
        return length >= minBytes;
      }
    }
    return buffer.byteLength >= minBytes;
  }

  private getImageDimensions(buffer: ArrayBuffer) {
    const data = new Uint8Array(buffer);
    if (data.length < 10) return null;

    // PNG
    if (
      data.length >= 24 &&
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47 &&
      data[4] === 0x0d &&
      data[5] === 0x0a &&
      data[6] === 0x1a &&
      data[7] === 0x0a
    ) {
      const width = this.readUint32BE(data, 16);
      const height = this.readUint32BE(data, 20);
      if (width && height) return { width, height };
      return null;
    }

    // GIF
    if (
      data.length >= 10 &&
      data[0] === 0x47 &&
      data[1] === 0x49 &&
      data[2] === 0x46
    ) {
      const width = data[6] | (data[7] << 8);
      const height = data[8] | (data[9] << 8);
      if (width && height) return { width, height };
      return null;
    }

    // JPEG
    if (data[0] === 0xff && data[1] === 0xd8) {
      let offset = 2;
      while (offset + 3 < data.length) {
        if (data[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = data[offset + 1];
        const isSof =
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf);
        const length = this.readUint16BE(data, offset + 2);
        if (!length || offset + 2 + length > data.length) break;
        if (isSof) {
          const height = this.readUint16BE(data, offset + 5);
          const width = this.readUint16BE(data, offset + 7);
          if (width && height) return { width, height };
          return null;
        }
        offset += 2 + length;
      }
    }

    return null;
  }

  private readUint16BE(data: Uint8Array, offset: number) {
    if (offset + 1 >= data.length) return 0;
    return (data[offset] << 8) | data[offset + 1];
  }

  private readUint32BE(data: Uint8Array, offset: number) {
    if (offset + 3 >= data.length) return 0;
    return (
      (data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]
    ) >>> 0;
  }
}
