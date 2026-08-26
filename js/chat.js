var ChatModule = (function(){
  var client = window._supabaseClient;
  var sessionId = null;
  var channel = null;
  var onNewMessage = null;

  function getSessionId(){
    if(sessionId) return sessionId;
    sessionId = localStorage.getItem('wa_chat_session');
    if(!sessionId){
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
      localStorage.setItem('wa_chat_session', sessionId);
    }
    return sessionId;
  }

  async function sendMessage(content, senderName, senderType){
    if(!content || !content.trim()) return null;
    var sid = getSessionId();
    var { data, error } = await client.from('messages').insert({
      session_id: sid,
      sender_name: senderName || 'Visiteur',
      content: content.trim(),
      sender_type: senderType || 'visitor',
      read: false
    }).select().single();
    if(error){ console.error('Chat error:', error); return null; }
    return data;
  }

  async function getMessages(){
    var sid = getSessionId();
    var { data, error } = await client.from('messages')
      .select('*')
      .eq('session_id', sid)
      .order('created_at', { ascending: true });
    if(error){ console.error('Chat fetch error:', error); return []; }
    return data || [];
  }

  async function getAllSessions(){
    var { data, error } = await client.from('messages')
      .select('session_id, sender_name')
      .eq('sender_type', 'visitor')
      .order('created_at', { ascending: false });
    if(error) return [];
    var seen = {};
    var sessions = [];
    (data||[]).forEach(function(r){
      if(!seen[r.session_id]){
        seen[r.session_id] = true;
        sessions.push({ session_id: r.session_id, sender_name: r.sender_name });
      }
    });
    return sessions;
  }

  async function getSessionMessages(sessionId){
    var { data, error } = await client.from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if(error) return [];
    return data || [];
  }

  async function markRead(sessionId){
    await client.from('messages')
      .update({ read: true })
      .eq('session_id', sessionId)
      .eq('sender_type', 'visitor')
      .eq('read', false);
  }

  async function getUnreadCount(){
    var { count } = await client.from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_type', 'visitor')
      .eq('read', false);
    return count || 0;
  }

  function subscribe(sessionId, callback){
    if(channel) unsubscribe();
    channel = client.channel('chat_' + sessionId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'session_id=eq.' + sessionId
      }, function(payload){
        callback(payload.new);
      })
      .subscribe();
  }

  function subscribeAll(callback){
    if(channel) unsubscribe();
    channel = client.channel('chat_all')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, function(payload){
        callback(payload.new);
      })
      .subscribe();
  }

  function unsubscribe(){
    if(channel){
      client.removeChannel(channel);
      channel = null;
    }
  }

  return {
    getSessionId: getSessionId,
    sendMessage: sendMessage,
    getMessages: getMessages,
    getAllSessions: getAllSessions,
    getSessionMessages: getSessionMessages,
    markRead: markRead,
    getUnreadCount: getUnreadCount,
    subscribe: subscribe,
    subscribeAll: subscribeAll,
    unsubscribe: unsubscribe
  };
})();
