async function signUp(email, password, fullName) {
  const { data, error } = await window._supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await window._supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await window._supabaseClient.auth.signOut();
  if (error) throw error;
}

async function getSession() {
  const { data: { session } } = await window._supabaseClient.auth.getSession();
  return session;
}

async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

function requireAuth() {
  return getSession().then(session => {
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session.user;
  });
}
