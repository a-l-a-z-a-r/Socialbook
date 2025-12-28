const mongoose = require('mongoose');

const DEFAULT_MIN_BYTES = 2048;
const DEFAULT_MIN_DIMENSION = 2;
const DEFAULT_PROBE_BYTES = 16384;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_CONCURRENCY = 5;

const minBytes = Number(process.env.COVER_MIN_BYTES || DEFAULT_MIN_BYTES);
const minDimension = Number(process.env.COVER_MIN_DIMENSION || DEFAULT_MIN_DIMENSION);
const probeBytes = Number(process.env.COVER_PROBE_BYTES || DEFAULT_PROBE_BYTES);
const timeoutMs = Number(process.env.COVER_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
const concurrency = Number(process.env.COVER_AUDIT_CONCURRENCY || DEFAULT_CONCURRENCY);

const reviewSchema = new mongoose.Schema(
  {
    user: String,
    action: String,
    book: String,
    rating: Number,
    review: String,
    status: String,
    genre: String,
    created_at: Date,
    coverUrl: String,
  },
  { collection: 'reviews' },
);

const Review = mongoose.model('Review', reviewSchema);

const isImageContentType = (value) => {
  const normalized = value.toLowerCase();
  if (!normalized.startsWith('image/')) return false;
  if (normalized.includes('image/gif')) return false;
  return true;
};

const readUint16BE = (data, offset) => {
  if (offset + 1 >= data.length) return 0;
  return (data[offset] << 8) | data[offset + 1];
};

const readUint32BE = (data, offset) => {
  if (offset + 3 >= data.length) return 0;
  return (
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3]
  ) >>> 0;
};

const getImageDimensions = (buffer) => {
  const data = new Uint8Array(buffer);
  if (data.length < 10) return null;

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
    const width = readUint32BE(data, 16);
    const height = readUint32BE(data, 20);
    if (width && height) return { width, height };
    return null;
  }

  if (data.length >= 10 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    const width = data[6] | (data[7] << 8);
    const height = data[8] | (data[9] << 8);
    if (width && height) return { width, height };
    return null;
  }

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
      const length = readUint16BE(data, offset + 2);
      if (!length || offset + 2 + length > data.length) break;
      if (isSof) {
        const height = readUint16BE(data, offset + 5);
        const width = readUint16BE(data, offset + 7);
        if (width && height) return { width, height };
        return null;
      }
      offset += 2 + length;
    }
  }

  return null;
};

const isMinBytes = (buffer, lengthHeader) => {
  if (lengthHeader) {
    const length = Number(lengthHeader);
    if (Number.isFinite(length)) {
      return length >= minBytes;
    }
  }
  return buffer.byteLength >= minBytes;
};

const checkCover = async (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'invalid-protocol' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: `bytes=0-${Math.max(minBytes, probeBytes) - 1}` },
      signal: controller.signal,
    });
    const contentType = res.headers.get('content-type');
    if (contentType && !isImageContentType(contentType)) {
      return { ok: false, reason: `content-type:${contentType}` };
    }
    const buffer = await res.arrayBuffer();
    if (!isMinBytes(buffer, res.headers.get('content-length'))) {
      return { ok: false, reason: `size<${minBytes}` };
    }
    const dimensions = getImageDimensions(buffer);
    if (!dimensions) return { ok: false, reason: 'no-dimensions' };
    if (dimensions.width < minDimension || dimensions.height < minDimension) {
      return { ok: false, reason: `dimensions:${dimensions.width}x${dimensions.height}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err?.name || 'fetch-error' };
  } finally {
    clearTimeout(timeout);
  }
};

const withLimit = async (items, limit, handler) => {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await handler(current));
    }
  });
  await Promise.all(workers);
  return results;
};

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const reviews = await Review.find({ coverUrl: { $exists: true, $ne: '' } })
    .select({ _id: 1, coverUrl: 1, book: 1 })
    .lean()
    .exec();

  console.log(`Checking ${reviews.length} covers...`);
  const results = await withLimit(reviews, Math.max(1, concurrency), async (review) => {
    const check = await checkCover(review.coverUrl);
    return { review, check };
  });

  const invalid = results.filter((item) => !item.check.ok);
  if (invalid.length === 0) {
    console.log('No invalid covers found.');
    await mongoose.disconnect();
    return;
  }

  const ids = invalid.map((item) => item.review._id);
  await Review.deleteMany({ _id: { $in: ids } }).exec();
  console.log(`Deleted ${ids.length} reviews with invalid covers.`);

  invalid.slice(0, 10).forEach((item) => {
    console.log(`- ${item.review.book || 'Untitled'} | ${item.review.coverUrl} | ${item.check.reason}`);
  });

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
