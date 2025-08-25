import { sbAuth } from '../config/env.js';

// ===== Middleware для аутентификации Supabase =====
export const verifySupabaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('🔐 Auth check:', {
      hasHeader: !!authHeader,
      sbAuthConfigured: !!sbAuth,
      origin: req.get('Origin')
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!sbAuth) {
      console.log('❌ Supabase auth not configured');
      return res.status(500).json({ error: 'Supabase auth not configured' });
    }

    // Проверяем токен через Supabase
    const { data: { user }, error } = await sbAuth.auth.getUser(token);
    
    if (error) {
      console.log('❌ Supabase auth error:', error);
      return res.status(401).json({ error: 'Invalid token', details: error.message });
    }
    
    if (!user) {
      console.log('❌ No user found for token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('✅ User authenticated:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('💥 Auth error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
