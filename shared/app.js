/* ============================================================
   SkillSwap — Core App Layer
   ------------------------------------------------------------
   PHASE 2 (Client-Server Data Flow): every function below is
   written as an ASYNC function that returns a Promise, exactly
   like a fetch() call would. Internally it currently reads/writes
   localStorage (acting as our "server"), but the calling pages
   never know that — they just `await db.login(...)`.

   >>> SUPABASE SWAP-IN POINT <<<
   To move to Supabase later, you only edit THIS file. Replace the
   body of each function with a supabase-js call
   (e.g. supabase.from('users').select()) and keep the same
   function name + return shape. No page-level code changes needed.
   ============================================================ */

/* ---------------------------------------------------------
   PATH RESOLVER — works for both file:// and http:// serving
   Detects current page depth and builds correct relative paths.
   - Root (index.html)       → depth 0 → prefix = ''
   - Subpage (login/index)   → depth 1 → prefix = '../'
   --------------------------------------------------------- */
const _pathPrefix = (() => {
  const segs = window.location.pathname.replace(/\\/g, '/').split('/');
  // count directory segments below the skillswap root
  // If we are at /skillswap/login/index.html  → segs = ['','skillswap','login','index.html'] → depth 1 above root
  // We need one '../' per directory level below the app root's parent
  // Simple rule: if current page is in a subfolder (not the root index.html), prefix is '../'
  const filename = segs[segs.length - 1] || '';
  const folder   = segs[segs.length - 2] || '';
  // If app root folders are known subpages, use '../', otherwise ''
  const subpages = [
    'login','register','dashboard','profile','settings',
    'my-skills','search-skills','exchange-requests',
    'book-session','rate-session','leaderboard','community-groups','admin'
  ];
  return subpages.includes(folder) ? '../' : '';
})();

function _url(page) { return _pathPrefix + page; }

// ============================================================
// SUPABASE CONFIGURATION
// Paste your project details here!
// ============================================================
const SUPABASE_URL = 'https://aghfyhvmpoknbzeqtyvj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnaGZ5aHZtcG9rbmJ6ZXF0eXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NzYzMTAsImV4cCI6MjEwMzA1MjMxMH0.ZohbyiCGsbRB99eNUpTz1iOBQo79a-XKXZHaOhPwPCk';

// ============================================================
// DYNAMIC SUPABASE LOADER
// ============================================================
let supabaseClient = null;
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

function initSupabase() {
  if (supabaseClient) return Promise.resolve();
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = SUPABASE_CDN;
    script.onload = () => {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      resolve();
    };
    document.head.appendChild(script);
  });
}

// ============================================================
// OBJECT MAPPER UTILITIES
// Maps PostgreSQL snake_case columns to the camelCase variables
// expected by all frontend pages (USN, Year, MentorScore, etc.)
// ============================================================
function mapProfile(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    usn: p.usn,
    year: p.year,
    dept: p.dept,
    mentorScore: parseFloat(p.mentor_score) || 0,
    sessionsCount: parseInt(p.sessions_count) || 0,
    badges: p.badges || []
  };
}

function mapRequest(r, users = []) {
  if (!r) return null;
  const fromUser = users.find(u => u.id === r.from_user_id) || mapProfile(r.from_user);
  const toUser = users.find(u => u.id === r.to_user_id) || mapProfile(r.to_user);
  return {
    id: r.id,
    fromUserId: r.from_user_id,
    toUserId: r.to_user_id,
    skillName: r.skill_name,
    message: r.message,
    status: r.status,
    createdAt: new Date(r.created_at).getTime(),
    fromUser,
    toUser
  };
}

function mapSession(s, users = []) {
  if (!s) return null;
  const fromUser = users.find(u => u.id === s.from_user_id) || mapProfile(s.from_user);
  const toUser = users.find(u => u.id === s.to_user_id) || mapProfile(s.to_user);
  return {
    id: s.id,
    requestId: s.request_id,
    fromUserId: s.from_user_id,
    toUserId: s.to_user_id,
    skillName: s.skill_name,
    datetime: s.datetime,
    platform: s.platform,
    status: s.status,
    rating: s.rating,
    feedback: s.feedback,
    fromUser,
    toUser
  };
}

// Helper to simulate slight loading state or delay if needed
function delay(ms = 100) { return new Promise(res => setTimeout(res, ms)); }

/* ---------------------------------------------------------
   AUTH & CORE DATA LAYER (Supabase implementation)
   --------------------------------------------------------- */
const db = {

  async register({ name, usn, year, dept, email, password }) {
    await initSupabase();
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { name, usn, year, dept }
      }
    });
    if (error) return { ok: false, error: error.message };
    
    // Allow trigger to execute and insert profile record
    await delay(600);
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return { ok: true, user: mapProfile(profile) };
  },

  async login({ email, password }) {
    await initSupabase();
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    // Fetch the linked profile from database
    const { data: profile, error: profileErr } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      return { ok: false, error: 'Could not fetch user profile.' };
    }

    const mappedUser = mapProfile(profile);
    localStorage.setItem('skillswap_current_user', JSON.stringify(mappedUser));
    return { ok: true, user: mappedUser };
  },

  logout() {
    localStorage.removeItem('skillswap_current_user');
    if (supabaseClient) {
      supabaseClient.auth.signOut();
    }
  },

  currentUser() {
    try {
      return JSON.parse(localStorage.getItem('skillswap_current_user')) || null;
    } catch {
      return null;
    }
  },

  requireAuth() {
    const u = this.currentUser();
    if (!u) window.location.href = _url('login/index.html');
    return u;
  },

  /* ---------------------------------------------------------
     USERS
     --------------------------------------------------------- */
  async getUser(id) {
    await initSupabase();
    const { data } = await supabaseClient.from('profiles').select('*').eq('id', id).single();
    return mapProfile(data);
  },

  async updateUser(id, patch) {
    await initSupabase();
    // Convert camelCase patch to snake_case for PostgreSQL updates
    const dbPatch = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.usn !== undefined) dbPatch.usn = patch.usn;
    if (patch.year !== undefined) dbPatch.year = patch.year;
    if (patch.dept !== undefined) dbPatch.dept = patch.dept;
    if (patch.mentorScore !== undefined) dbPatch.mentor_score = patch.mentorScore;
    if (patch.sessionsCount !== undefined) dbPatch.sessions_count = patch.sessionsCount;
    if (patch.badges !== undefined) dbPatch.badges = patch.badges;

    const { data, error } = await supabaseClient
      .from('profiles')
      .update(dbPatch)
      .eq('id', id)
      .select()
      .single();

    if (error) return { ok: false };
    
    const updatedUser = mapProfile(data);
    const curr = this.currentUser();
    if (curr && curr.id === id) {
      localStorage.setItem('skillswap_current_user', JSON.stringify(updatedUser));
    }
    return { ok: true, user: updatedUser };
  },

  /* ---------------------------------------------------------
     SKILLS
     --------------------------------------------------------- */
  async getMySkills(userId) {
    await initSupabase();
    const { data } = await supabaseClient.from('skills').select('*').eq('user_id', userId);
    if (!data) return [];
    return data.map(s => ({
      id: s.id,
      userId: s.user_id,
      name: s.name,
      type: s.type,
      category: s.category
    }));
  },

  async addSkill({ userId, name, type, category }) {
    await initSupabase();
    const { data, error } = await supabaseClient
      .from('skills')
      .insert({ user_id: userId, name, type, category })
      .select()
      .single();

    if (error) return { ok: false };
    return {
      ok: true,
      skill: {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        type: data.type,
        category: data.category
      }
    };
  },

  async deleteSkill(id) {
    await initSupabase();
    await supabaseClient.from('skills').delete().eq('id', id);
    return { ok: true };
  },

  /* ---------------------------------------------------------
     SEARCH
     --------------------------------------------------------- */
  async searchSkills({ query = '', category = 'All', type = 'offer' } = {}) {
    await initSupabase();
    let queryBuilder = supabaseClient
      .from('skills')
      .select('*, user:profiles(*)')
      .eq('type', type);

    if (category !== 'All') {
      queryBuilder = queryBuilder.eq('category', category);
    }
    if (query.trim()) {
      queryBuilder = queryBuilder.ilike('name', `%${query.trim()}%`);
    }

    const { data } = await queryBuilder;
    if (!data) return [];

    return data
      .map(s => ({
        id: s.id,
        userId: s.user_id,
        name: s.name,
        type: s.type,
        category: s.category,
        user: mapProfile(s.user)
      }))
      .filter(s => s.user)
      .sort((a, b) => b.user.mentorScore - a.user.mentorScore);
  },

  /* ---------------------------------------------------------
     EXCHANGE REQUESTS
     --------------------------------------------------------- */
  async sendRequest({ fromUserId, toUserId, skillName, message }) {
    await initSupabase();
    const { data, error } = await supabaseClient
      .from('requests')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        skill_name: skillName,
        message
      })
      .select()
      .single();

    if (error) return { ok: false };
    return { ok: true, request: mapRequest(data) };
  },

  async getRequestsFor(userId) {
    await initSupabase();
    const { data } = await supabaseClient
      .from('requests')
      .select('*, from_user:profiles!from_user_id(*), to_user:profiles!to_user_id(*)')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    if (!data) return { incoming: [], outgoing: [] };
    const mapped = data.map(r => mapRequest(r));

    return {
      incoming: mapped.filter(r => r.toUserId === userId).sort((a, b) => b.createdAt - a.createdAt),
      outgoing: mapped.filter(r => r.fromUserId === userId).sort((a, b) => b.createdAt - a.createdAt)
    };
  },

  async updateRequestStatus(id, status) {
    await initSupabase();
    const { data, error } = await supabaseClient
      .from('requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) return { ok: false };
    return { ok: true, request: mapRequest(data) };
  },

  /* ---------------------------------------------------------
     SESSIONS
     --------------------------------------------------------- */
  async bookSession({ requestId, fromUserId, toUserId, skillName, datetime, platform }) {
    await initSupabase();
    // Ensure from_user_id matches the current authenticated user to comply with Supabase RLS
    let actualFromUserId = fromUserId;
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (authData?.user?.id) actualFromUserId = authData.user.id;
    } catch (e) {}

    // Check if a scheduled session already exists for this request
    const { data: existingSessions } = await supabaseClient
      .from('sessions')
      .select('id, status')
      .eq('request_id', requestId);

    const activeExisting = existingSessions && existingSessions.find(s => s.status === 'scheduled');
    if (activeExisting) {
      const { data, error } = await supabaseClient
        .from('sessions')
        .update({
          datetime,
          platform,
          status: 'scheduled'
        })
        .eq('id', activeExisting.id)
        .select()
        .single();

      if (error) {
        console.error('Update session error:', error);
        return { ok: false, error: error.message };
      }
      return { ok: true, session: mapSession(data), updated: true };
    }

    const { data, error } = await supabaseClient
      .from('sessions')
      .insert({
        request_id: requestId,
        from_user_id: actualFromUserId,
        to_user_id: toUserId,
        skill_name: skillName,
        datetime,
        platform,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) {
      console.error('bookSession error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, session: mapSession(data) };
  },

  async cancelSession(id) {
    await initSupabase();
    const { data, error } = await supabaseClient
      .from('sessions')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('cancelSession error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, session: mapSession(data) };
  },

  async rescheduleSession(id, { datetime, platform }) {
    await initSupabase();
    const { data, error } = await supabaseClient
      .from('sessions')
      .update({ datetime, platform, status: 'scheduled' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('rescheduleSession error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true, session: mapSession(data) };
  },

  async getSessionsFor(userId) {
    await initSupabase();
    const { data } = await supabaseClient
      .from('sessions')
      .select('*, from_user:profiles!from_user_id(*), to_user:profiles!to_user_id(*)')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    if (!data) return [];
    return data.map(s => mapSession(s)).sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
  },

  async rateSession(id, { rating, feedback }) {
    await initSupabase();
    const { data: session, error: sErr } = await supabaseClient
      .from('sessions')
      .update({ rating, feedback, status: 'completed' })
      .eq('id', id)
      .select()
      .single();

    if (sErr || !session) return { ok: false };

    // Recalculate the mentor's aggregate score from all completed rated sessions
    const mentorId = session.to_user_id;
    const { data: mentorSessions } = await supabaseClient
      .from('sessions')
      .select('rating')
      .eq('to_user_id', mentorId)
      .not('rating', 'is', null);

    const totalRatings = mentorSessions.length;
    const avg = totalRatings > 0 
      ? mentorSessions.reduce((sum, s) => sum + s.rating, 0) / totalRatings 
      : 0;

    const roundedAvg = Math.round(avg * 10) / 10;

    await supabaseClient
      .from('profiles')
      .update({
        mentor_score: roundedAvg,
        sessions_count: totalRatings
      })
      .eq('id', mentorId);

    return { ok: true };
  },

  /* ---------------------------------------------------------
     LEADERBOARD
     --------------------------------------------------------- */
  async getLeaderboard() {
    await initSupabase();
    const { data } = await supabaseClient
      .from('profiles')
      .select('*')
      .order('mentor_score', { ascending: false })
      .order('sessions_count', { ascending: false });

    if (!data) return [];
    return data.map(p => mapProfile(p));
  },

  async getStats(userId) {
    await initSupabase();
    const { data: requests } = await supabaseClient
      .from('requests')
      .select('status')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .eq('status', 'pending');

    const { data: upcoming } = await supabaseClient
      .from('sessions')
      .select('status')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .eq('status', 'scheduled');

    const { data: completed } = await supabaseClient
      .from('sessions')
      .select('status')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .eq('status', 'completed');

    return {
      activeRequests: requests ? requests.length : 0,
      upcomingSessions: upcoming ? upcoming.length : 0,
      completedSessions: completed ? completed.length : 0
    };
  }
};

/* ---------------------------------------------------------
   TOAST helper (shared UI feedback, no browser alerts)
   --------------------------------------------------------- */
function toast(message, type = 'default') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = 'toast show' + (type === 'success' ? ' toast-success' : type === 'error' ? ' toast-error' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ---------------------------------------------------------
   NAVBAR — injected on every authenticated page (mobile friendly)
   --------------------------------------------------------- */
function renderNavbar(activePath) {
  // Guard – only render for logged‑in users
  const user = db.currentUser();
  if (!user) return;

  // User initials for the avatar (e.g., "AB")
  const initials = user.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const p = _pathPrefix; // correct relative prefix for this page

  // Define navigation items: [relative href, canonical path for active check, label]
  const links = [
    [p + 'dashboard/index.html',         '/dashboard/index.html',         'Dashboard'],
    [p + 'search-skills/index.html',     '/search-skills/index.html',     'Find Skills'],
    [p + 'my-skills/index.html',         '/my-skills/index.html',         'My Skills'],
    [p + 'exchange-requests/index.html', '/exchange-requests/index.html', 'Requests'],
    [p + 'book-session/index.html',      '/book-session/index.html',      'Book Session'],
    [p + 'rate-session/index.html',      '/rate-session/index.html',      'Rate Session'],
    [p + 'leaderboard/index.html',       '/leaderboard/index.html',       'Leaderboard'],
    [p + 'community-groups/index.html',  '/community-groups/index.html',  'Community']
  ];

  // ----- Build DOM elements ------------------------------------------------
  const nav = document.createElement('nav');
  nav.className = 'navbar';

  // Brand / title
  const brand = document.createElement('div');
  brand.className = 'navbar-brand';
  brand.textContent = 'SkillSwap';
  nav.appendChild(brand);

  // Hamburger button (mobile)
  const toggle = document.createElement('button');
  toggle.className = 'navbar-toggle';
  toggle.setAttribute('aria-label', 'Toggle navigation');
  toggle.innerHTML = '&#9776;'; // ☰
  nav.appendChild(toggle);

  // Links container
  const linkContainer = document.createElement('ul');
  linkContainer.className = 'navbar-links';

  // Populate link items
  links.forEach(([href, canonPath, label]) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    if (activePath === canonPath) a.classList.add('active');
    li.appendChild(a);
    linkContainer.appendChild(li);
  });

  // Logout item (special handling)
  const logoutLi = document.createElement('li');
  const logoutA = document.createElement('a');
  logoutA.href = '#';
  logoutA.textContent = 'Logout';
  logoutA.addEventListener('click', e => {
    e.preventDefault();
    db.logout();
    window.location.href = _url('login/index.html');
  });
  logoutLi.appendChild(logoutA);
  linkContainer.appendChild(logoutLi);
  nav.appendChild(linkContainer);

  // User score & avatar (right‑hand side)
  const userInfo = document.createElement('div');
  userInfo.className = 'navbar-user';
  const score = document.createElement('span');
  score.className = 'navbar-score';
  score.textContent = `★ ${user.mentorScore || '—'}`;
  const avatar = document.createElement('a');
  avatar.href = `${p}profile/index.html`;
  avatar.className = 'navbar-avatar';
  avatar.title = user.name;
  avatar.textContent = initials;
  userInfo.appendChild(score);
  userInfo.appendChild(avatar);
  nav.appendChild(userInfo);

  // Insert the navbar at the top of <body>
  document.body.prepend(nav);

  // ----- Mobile toggle behaviour ------------------------------------------
  toggle.addEventListener('click', () => {
    linkContainer.classList.toggle('open');
  });

  // ----- Inject minimal CSS (if not already present) ----------------------
  if (!document.getElementById('navbar-styles')) {
    const style = document.createElement('style');
    style.id = 'navbar-styles';
    style.textContent = `
    nav.navbar { display:flex; align-items:center; justify-content:space-between; background:var(--violet); color:#fff; padding:.6rem 1rem; font-family:var(--font-body); }
    .navbar-brand { font-weight:600; font-size:1.2rem; }
    .navbar-toggle { display:none; background:transparent; border:none; color:#fff; font-size:1.6rem; cursor:pointer; }
    .navbar-links { list-style:none; display:flex; gap:1rem; margin:0; }
    .navbar-links li a { color:#fff; text-decoration:none; padding:.4rem .2rem; }
    .navbar-links li a.active { border-bottom:2px solid #fff; }
    .navbar-score { margin-right:.8rem; }
    .navbar-avatar { background:#fff; color:#000; border-radius:50%; width:2rem; height:2rem; display:inline-flex; align-items:center; justify-content:center; text-decoration:none; }
    @media (max-width:768px) {
      nav.navbar { position:relative; flex-wrap:wrap; }
      .navbar-toggle { display:block; }
      .navbar-links { flex-direction:column; width:100%; background:rgba(109,40,217,0.97); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); box-shadow:0 8px 24px rgba(0,0,0,0.25); position:absolute; top:100%; left:0; z-index:999; max-height:0; overflow:hidden; transition:max-height .3s ease; padding:0; }
      .navbar-links.open { max-height:500px; padding:.5rem 0; }
      .navbar-links li a { display:block; padding:.7rem 1.2rem; border-bottom:1px solid rgba(255,255,255,0.15); }
      .navbar-links li:last-child a { border-bottom:none; }
    }
    `;
    document.head.appendChild(style);
  }
}


function requireAuthOrRedirect() {
  const user = db.currentUser();
  if (!user) { window.location.href = _url('login/index.html'); return null; }
  return user;
}
