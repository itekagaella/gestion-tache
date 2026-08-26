-- myTask - Supabase Setup
-- Executez ce script dans l'editeur SQL de votre dashboard Supabase

-- 1. Creer la table des taches
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  tag TEXT DEFAULT 'personal',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Activer Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 3. Politique : chaque utilisateur ne voit que ses propres taches
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Index pour les performances
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- ===== TABLE MESSAGES (Chat WhatsApp-like) =====

-- 5. Creer la table des messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  sender_name TEXT DEFAULT 'Visiteur',
  content TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'owner')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Activer RLS sur messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 7. Politiques : tout le monde peut lire et ecrire (chat public)
CREATE POLICY "Anyone can read messages"
  ON messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert messages"
  ON messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update read status"
  ON messages FOR UPDATE
  USING (true);

-- 8. Index pour les performances
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_unread ON messages(read) WHERE read = false;

-- 9. Activer Realtime sur la table messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
