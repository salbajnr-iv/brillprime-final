
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

const googleClient = new OAuth2Client(
  process.env.VITE_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === 'production' 
    ? 'https://your-repl-name.replit.app/auth/google/callback'
    : 'http://localhost:5000/auth/google/callback'
);

// Google OAuth callback
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.redirect('/signin?error=no_code');
    }

    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code as string);
    googleClient.setCredentials(tokens);

    // Get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.VITE_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.redirect('/signin?error=invalid_token');
    }

    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email!))
      .limit(1);

    if (!user) {
      // Create new user
      [user] = await db
        .insert(users)
        .values({
          email: email!,
          fullName: name || '',
          passwordHash: '', // No password for social users
          role: 'CONSUMER',
          isVerified: true,
          socialProvider: 'google',
          socialId: googleId,
          avatar: picture,
          createdAt: new Date()
        })
        .returning();
    } else if (!user.socialProvider) {
      // Link Google account to existing user
      await db
        .update(users)
        .set({
          socialProvider: 'google',
          socialId: googleId,
          avatar: picture || user.avatar
        })
        .where(eq(users.id, user.id));
    }

    // Create session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };

    // Redirect to dashboard
    res.redirect('/dashboard');

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect('/signin?error=auth_failed');
  }
});

// Initiate Google OAuth
router.get('/auth/google', (req, res) => {
  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    include_granted_scopes: true,
  });
  
  res.redirect(authUrl);
});

export default router;
