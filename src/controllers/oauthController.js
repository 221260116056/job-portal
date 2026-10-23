const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User, Company } = require('../models');
const tokenFor = require('../utils/generateToken');
const { CANDIDATE, COMPANY } = require('../utils/generateToken');
const { success } = require('../utils/response');

function getBaseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/+$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
}

async function handleOAuthUser({ provider, providerId, name, email, picture, role = 'candidate' }) {
  const normEmail = (email || '').toLowerCase().trim();
  if (!normEmail) {
    throw new Error('Email was not provided by the identity provider');
  }

  const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
  const targetRole = role === 'company' ? COMPANY : CANDIDATE;

  if (targetRole === CANDIDATE) {
    let user = await User.unscoped().findOne({ where: { email: normEmail } });

    if (user) {
      const updates = {};
      if (provider === 'google' && !user.google_id) updates.google_id = providerId;
      if (provider === 'linkedin' && !user.linkedin_id) updates.linkedin_id = providerId;
      if (!user.avatar_url && picture) updates.avatar_url = picture;
      if (user.is_suspended) updates.is_suspended = false;
      if (!user.auth_provider || user.auth_provider === 'local') updates.auth_provider = provider;
      if (Object.keys(updates).length > 0) {
        await user.update(updates);
      }
    } else {
      user = await User.create({
        name: name || normEmail.split('@')[0],
        email: normEmail,
        password: randomPassword,
        google_id: provider === 'google' ? providerId : null,
        linkedin_id: provider === 'linkedin' ? providerId : null,
        avatar_url: picture || null,
        auth_provider: provider
      });
    }

    const token = tokenFor(user, CANDIDATE);
    return {
      token,
      role: CANDIDATE,
      account: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        auth_provider: user.auth_provider || provider
      }
    };
  } else {
    let company = await Company.unscoped().findOne({ where: { email: normEmail } });

    if (company) {
      const updates = {};
      if (provider === 'google' && !company.google_id) updates.google_id = providerId;
      if (provider === 'linkedin' && !company.linkedin_id) updates.linkedin_id = providerId;
      if (!company.avatar_url && picture) updates.avatar_url = picture;
      if (company.is_suspended) updates.is_suspended = false;
      if (!company.auth_provider || company.auth_provider === 'local') updates.auth_provider = provider;
      if (Object.keys(updates).length > 0) {
        await company.update(updates);
      }
    } else {
      company = await Company.create({
        company_name: name || `${normEmail.split('@')[0]} Team`,
        email: normEmail,
        password: randomPassword,
        location: 'Remote',
        google_id: provider === 'google' ? providerId : null,
        linkedin_id: provider === 'linkedin' ? providerId : null,
        avatar_url: picture || null,
        auth_provider: provider
      });
    }

    const token = tokenFor(company, COMPANY);
    return {
      token,
      role: COMPANY,
      account: {
        id: company.id,
        name: company.company_name,
        email: company.email,
        avatar_url: company.avatar_url,
        auth_provider: company.auth_provider || provider
      }
    };
  }
}

// GET /api/auth/oauth/status
exports.status = (req, res) => {
  return success(res, 'OAuth configuration status', {
    googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    linkedinConfigured: Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    googleClientId: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID : null
  });
};

// GET /api/auth/google
exports.googleRedirect = (req, res) => {
  const role = req.query.role === 'company' ? 'company' : 'candidate';
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // If not configured, route to login with trigger for interactive setup/quick-connect modal
    return res.redirect(`/#/login?oauth_modal=google&role=${role}`);
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const state = JSON.stringify({ role, timestamp: Date.now() });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state: Buffer.from(state).toString('base64'),
    access_type: 'offline',
    prompt: 'select_account'
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

// GET /api/auth/google/callback
exports.googleCallback = async (req, res, next) => {
  try {
    const { code, state, error } = req.query;
    let role = 'candidate';

    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        if (parsed.role === 'company') role = 'company';
      } catch (_) {}
    }

    if (error || !code) {
      const errMsg = error || 'Google sign-in was cancelled';
      return res.redirect(`/#/login?error=${encodeURIComponent(errMsg)}&role=${role}`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Google token exchange error:', tokenData);
      return res.redirect(`/#/login?error=${encodeURIComponent('Failed to exchange Google authorization code')}&role=${role}`);
    }

    // 2. Fetch user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();

    if (!profileRes.ok || !profile.email) {
      return res.redirect(`/#/login?error=${encodeURIComponent('Could not retrieve Google profile email')}&role=${role}`);
    }

    // 3. Link or create user and create JWT
    const authResult = await handleOAuthUser({
      provider: 'google',
      providerId: profile.sub,
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
      role
    });

    const queryParams = new URLSearchParams({
      token: authResult.token,
      role: authResult.role,
      name: authResult.account.name,
      email: authResult.account.email,
      avatar: authResult.account.avatar_url || '',
      provider: 'google'
    });

    return res.redirect(`/#/oauth-callback?${queryParams.toString()}`);
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/linkedin
exports.linkedinRedirect = (req, res) => {
  const role = req.query.role === 'company' ? 'company' : 'candidate';
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect(`/#/login?oauth_modal=linkedin&role=${role}`);
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;
  const state = JSON.stringify({ role, timestamp: Date.now() });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state: Buffer.from(state).toString('base64'),
    scope: 'openid profile email'
  });

  return res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
};

// GET /api/auth/linkedin/callback
exports.linkedinCallback = async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;
    let role = 'candidate';

    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        if (parsed.role === 'company') role = 'company';
      } catch (_) {}
    }

    if (error || !code) {
      const errMsg = error_description || error || 'LinkedIn sign-in was cancelled';
      return res.redirect(`/#/login?error=${encodeURIComponent(errMsg)}&role=${role}`);
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;

    // 1. Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('LinkedIn token exchange error:', tokenData);
      return res.redirect(`/#/login?error=${encodeURIComponent('Failed to exchange LinkedIn authorization code')}&role=${role}`);
    }

    // 2. Fetch user profile from OpenID Connect userinfo endpoint
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();

    if (!profileRes.ok || !profile.email) {
      return res.redirect(`/#/login?error=${encodeURIComponent('Could not retrieve LinkedIn profile email')}&role=${role}`);
    }

    const displayName = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' ');

    // 3. Link or create user and create JWT
    const authResult = await handleOAuthUser({
      provider: 'linkedin',
      providerId: profile.sub,
      name: displayName,
      email: profile.email,
      picture: profile.picture,
      role
    });

    const queryParams = new URLSearchParams({
      token: authResult.token,
      role: authResult.role,
      name: authResult.account.name,
      email: authResult.account.email,
      avatar: authResult.account.avatar_url || '',
      provider: 'linkedin'
    });

    return res.redirect(`/#/oauth-callback?${queryParams.toString()}`);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/oauth/quick-connect
// Provides instantaneous testing/sign-in with Google or LinkedIn identity
exports.quickConnect = async (req, res, next) => {
  try {
    const { provider, email, name, role, avatar_url } = req.body;

    if (!provider || !['google', 'linkedin'].includes(provider.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid provider. Must be google or linkedin' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required' });
    }

    const normProvider = provider.toLowerCase();
    const providerId = `${normProvider}_demo_${Date.now()}`;

    const authResult = await handleOAuthUser({
      provider: normProvider,
      providerId,
      name: name || email.split('@')[0],
      email,
      picture: avatar_url || (normProvider === 'google' ? 'https://lh3.googleusercontent.com/a/default-user' : 'https://static.licdn.com/sc/h/244xhbkr7g40x6bsu4gi6q42a'),
      role: role === 'company' ? 'company' : 'candidate'
    });

    return success(res, `Connected with ${normProvider === 'google' ? 'Google' : 'LinkedIn'} successfully`, {
      token: authResult.token,
      role: authResult.role,
      user: authResult.account
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/oauth/google-token (Verifies Client-side Google Identity Services credential/id_token)
exports.verifyGoogleToken = async (req, res, next) => {
  try {
    const { credential, role } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential (id_token) is required' });
    }

    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const payload = await verifyRes.json();

    if (!verifyRes.ok || !payload.email) {
      return res.status(401).json({ success: false, message: payload.error_description || 'Invalid Google credential token' });
    }

    const authResult = await handleOAuthUser({
      provider: 'google',
      providerId: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      role: role === 'company' ? 'company' : 'candidate'
    });

    return success(res, 'Google authentication successful', {
      token: authResult.token,
      role: authResult.role,
      user: authResult.account
    });
  } catch (error) {
    next(error);
  }
};
