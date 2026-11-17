import { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';
import { ensureSeeded } from '../db/seed.ts';

export interface AppAuthUser {
  id: number;
  uid: string;
  full_name: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AppAuthUser;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const dbUser = await getOrCreateUser(decodedToken.uid, decodedToken.email || '', decodedToken.name);
    await ensureSeeded(dbUser.id);

    req.user = {
      id: dbUser.id,
      uid: dbUser.uid,
      full_name: dbUser.fullName,
      email: dbUser.email,
      role: dbUser.role,
    };
    next();
  } catch (error) {
    const isDbError =
      error instanceof Error &&
      (error.message.includes('Database') || error.message.includes('workspace dataset'));
    if (isDbError) {
      console.error('Database error during authentication sync:', error);
      res.status(500).json({ error: 'Database connection error. Please try again shortly.' });
      return;
    }
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
