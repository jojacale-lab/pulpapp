const { supabaseAdmin } = require('../config/supabase');

const OWNER_EMAILS = [
  process.env.OWNER_EMAIL || 'jojacale@gmail.com',
  'sica2121@gmail.com',
];

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorización requerido' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // Get user profile with role and subscription
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return res.status(401).json({ error: 'Perfil de usuario no encontrado' });
  }

  if (!profile.is_active) {
    return res.status(403).json({ error: 'Cuenta desactivada' });
  }

  // Check subscription (owners always have access)
  const isOwner = OWNER_EMAILS.includes(profile.email);
  const hasActiveSubscription =
    isOwner ||
    profile.subscription_status === 'free' ||
    profile.subscription_status === 'active' ||
    (profile.subscription_status === 'trial' &&
      (!profile.subscription_end_date || new Date(profile.subscription_end_date) > new Date()));

  if (!hasActiveSubscription) {
    return res.status(402).json({
      error: 'Suscripción vencida',
      code: 'SUBSCRIPTION_EXPIRED',
      message: 'Tu período de prueba ha terminado. Contacta a PulpApp para activar tu suscripción.',
      user: { full_name: profile.full_name, email: profile.email }
    });
  }

  req.user = { ...user, ...profile, isOwner };
  req.token = token;
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  if (req.user.isOwner || roles.includes(req.user.role)) return next();
  return res.status(403).json({ error: 'No tienes permisos para esta acción' });
};

module.exports = { authenticate, requireRole };
