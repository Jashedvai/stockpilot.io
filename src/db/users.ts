import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, fullName?: string) {
  try {
    const resolvedEmail = email.trim().toLowerCase() || `${uid}@stockpilot.local`;
    const fallbackName = resolvedEmail.split('@')[0] || 'Jashed';
    const resolvedName = (fullName || '').trim() || fallbackName;

    const result = await db
      .insert(users)
      .values({
        uid,
        email: resolvedEmail,
        fullName: resolvedName,
        role: 'admin',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: resolvedEmail,
          fullName: resolvedName,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
