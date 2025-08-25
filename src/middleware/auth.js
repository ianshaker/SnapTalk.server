import { sbAuth } from '../config/env.js';

// ===== Middleware для аутентификации Supabase =====
export const verifySupabaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!sbAuth) {
      return res.status(500).json({ error: 'Supabase auth not configured' });
    }

    // Проверяем токен через Supabase
    const { data: { user }, error } = await sbAuth.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
