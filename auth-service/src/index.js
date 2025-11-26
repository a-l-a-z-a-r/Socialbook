import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/socialbook';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const corsOptions = {
  origin: '*',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

mongoose
  .connect(MONGODB_URI, { dbName: process.env.MONGODB_DB || 'socialbook' })
  .then(() => console.log('Auth service connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

const User = mongoose.model('User', userSchema);

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth', time: new Date().toISOString() });
});

const MIN_PASSWORD = 6;

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, name });

    const token = signToken(user.id, user.email);
    return res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id, user.email);
    return res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
});

function signToken(id, email) {
  return jwt.sign({ sub: id, email }, JWT_SECRET, { expiresIn: '7d' });
}

function sanitize(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    created_at: user.created_at,
  };
}

app.listen(PORT, () => {
  console.log(`Auth service listening on port ${PORT}`);
});
