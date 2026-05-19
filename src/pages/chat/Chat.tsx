import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Plus, Users, Radio, User as UserIcon, X, Search, MessageSquare } from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  chatApi,
  type ChatConversation,
  type ChatConversationType,
  type ChatMessage,
  type ChatUser,
} from '../../services/api';

const POLL_MS = 5000;
const ADMIN_ROLES = ['stock_manager', 'account_manager', 'branch_manager'];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function conversationTitle(c: ChatConversation, myId: string): string {
  if (c.type === 'direct') {
    const other = c.participants.find(p => p.userId !== myId);
    return other?.user?.name || 'Direct Chat';
  }
  return c.name || (c.type === 'broadcast' ? 'Broadcast' : 'Group');
}

function conversationSubtitle(c: ChatConversation, myId: string): string {
  if (c.type === 'direct') {
    const other = c.participants.find(p => p.userId !== myId);
    return other?.user?.role ? other.user.role.replace('_', ' ') : '';
  }
  if (c.type === 'broadcast') return 'Broadcast channel';
  return `${c.participants.length} members`;
}

export function Chat() {
  const { currentUser } = useStore();
  const myId = currentUser?.id || '';
  const canBroadcast = !!currentUser?.role && ADMIN_ROLES.includes(currentUser.role);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // New chat modal state
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatType, setNewChatType] = useState<ChatConversationType>('direct');
  const [userList, setUserList] = useState<ChatUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations + poll
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await chatApi.listConversations();
        if (alive) setConversations(data);
      } catch {}
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Load messages when active conversation changes + poll
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    let alive = true;
    const load = async (initial: boolean) => {
      if (initial) setLoadingMessages(true);
      try {
        const data = await chatApi.listMessages(activeId, { limit: 100 });
        if (alive) setMessages(data);
      } catch {}
      if (initial && alive) setLoadingMessages(false);
    };
    load(true);
    // Mark read on open
    chatApi.markRead(activeId).catch(() => {});
    const t = setInterval(() => load(false), POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [activeId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeId]);

  const active = useMemo(
    () => conversations.find(c => c.id === activeId) || null,
    [conversations, activeId],
  );

  const handleSend = async () => {
    if (!activeId || !input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await chatApi.sendMessage(activeId, text);
      setMessages(prev => [...prev, msg]);
      // Refresh conversations so sorting + preview update quickly
      const data = await chatApi.listConversations();
      setConversations(data);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const openNewChat = async () => {
    setShowNewChat(true);
    setNewChatType('direct');
    setSelectedIds([]);
    setGroupName('');
    setUserSearch('');
    try {
      const users = await chatApi.listUsers();
      setUserList(users);
    } catch {}
  };

  const handleCreateConversation = async () => {
    try {
      let body: { type: ChatConversationType; name?: string; participantIds?: string[] };
      if (newChatType === 'direct') {
        if (selectedIds.length !== 1) { alert('Pick exactly one user'); return; }
        body = { type: 'direct', participantIds: selectedIds };
      } else if (newChatType === 'group') {
        if (!groupName.trim()) { alert('Group name is required'); return; }
        if (selectedIds.length < 1) { alert('Add at least one member'); return; }
        body = { type: 'group', name: groupName.trim(), participantIds: selectedIds };
      } else {
        if (!groupName.trim()) { alert('Broadcast channel name is required'); return; }
        body = { type: 'broadcast', name: groupName.trim() };
      }
      const created = await chatApi.createConversation(body);
      const refreshed = await chatApi.listConversations();
      setConversations(refreshed);
      setActiveId(created.id);
      setShowNewChat(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create conversation');
    }
  };

  const toggleUserSelect = (id: string) => {
    setSelectedIds(prev => {
      if (newChatType === 'direct') return [id];
      return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
    });
  };

  const filteredUsers = userList.filter(u =>
    !userSearch.trim() || u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const isBroadcastReadOnlyForMe = active?.type === 'broadcast' && !canBroadcast;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 32px)', background: '#f7f8fa', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      {/* ========= SIDEBAR ========= */}
      <aside style={{ width: 320, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Chats</h2>
          <button className="btn btn-primary btn-sm" onClick={openNewChat} title="New chat"
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={14} /> New
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
              <MessageSquare size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
              <div>No conversations yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Click "New" to start one</div>
            </div>
          ) : (
            conversations.map(c => {
              const last = c.messages && c.messages.length > 0 ? c.messages[0] : null;
              const isActive = c.id === activeId;
              const unread = c.unreadCount || 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none',
                    background: isActive ? '#eef2ff' : 'transparent', cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 10, alignItems: 'center',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: c.type === 'broadcast' ? '#fef3c7' : c.type === 'group' ? '#dbeafe' : '#e0e7ff',
                    color: c.type === 'broadcast' ? '#92400e' : c.type === 'group' ? '#1e40af' : '#4338ca',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                  }}>
                    {c.type === 'broadcast' ? <Radio size={18} /> : c.type === 'group' ? <Users size={18} /> : <UserIcon size={18} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conversationTitle(c, myId)}
                      </span>
                      <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0, marginLeft: 6 }}>
                        {last ? formatTime(last.createdAt) : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {last ? `${last.senderId === myId ? 'You: ' : ''}${last.content}` : conversationSubtitle(c, myId)}
                      </span>
                      {unread > 0 && (
                        <span style={{
                          background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700,
                          borderRadius: 10, padding: '1px 7px', marginLeft: 6, flexShrink: 0,
                        }}>{unread}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ========= MAIN ========= */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f7f8fa' }}>
        {!active ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <div style={{ textAlign: 'center' }}>
              <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 600 }}>Select a conversation</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>or start a new one</div>
            </div>
          </div>
        ) : (
          <>
            <header style={{
              padding: '14px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: active.type === 'broadcast' ? '#fef3c7' : active.type === 'group' ? '#dbeafe' : '#e0e7ff',
                color: active.type === 'broadcast' ? '#92400e' : active.type === 'group' ? '#1e40af' : '#4338ca',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {active.type === 'broadcast' ? <Radio size={18} /> : active.type === 'group' ? <Users size={18} /> : <UserIcon size={18} />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{conversationTitle(active, myId)}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{conversationSubtitle(active, myId)}</div>
              </div>
            </header>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loadingMessages ? (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>No messages yet. Say hi!</div>
              ) : (
                messages.map(m => {
                  const mine = m.senderId === myId;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%',
                        background: mine ? '#4f46e5' : '#fff',
                        color: mine ? '#fff' : '#111',
                        padding: '8px 12px',
                        borderRadius: 12,
                        borderTopRightRadius: mine ? 2 : 12,
                        borderTopLeftRadius: mine ? 12 : 2,
                        boxShadow: mine ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
                        border: mine ? 'none' : '1px solid #e5e7eb',
                      }}>
                        {!mine && active.type !== 'direct' && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#4338ca', marginBottom: 2 }}>
                            {m.sender?.name || 'Unknown'}
                          </div>
                        )}
                        <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3, textAlign: 'right' }}>
                          {formatTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #e5e7eb' }}>
              {isBroadcastReadOnlyForMe ? (
                <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, padding: '8px' }}>
                  Only managers / admins can post to this broadcast channel
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message..."
                    style={{ flex: 1 }}
                    disabled={sending}
                  />
                  <button className="btn btn-primary" onClick={handleSend} disabled={!input.trim() || sending}
                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Send size={16} /> Send
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* ========= NEW CHAT MODAL ========= */}
      {showNewChat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '90%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>New Chat</h3>
              <button onClick={() => setShowNewChat(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
              {/* Type selector */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {([
                  { t: 'direct', label: 'Direct', icon: <UserIcon size={14} /> },
                  { t: 'group', label: 'Group', icon: <Users size={14} /> },
                  ...(canBroadcast ? [{ t: 'broadcast' as ChatConversationType, label: 'Broadcast', icon: <Radio size={14} /> }] : []),
                ] as Array<{ t: ChatConversationType; label: string; icon: JSX.Element }>).map(o => (
                  <button key={o.t}
                    onClick={() => { setNewChatType(o.t); setSelectedIds([]); }}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                      border: newChatType === o.t ? '2px solid #4f46e5' : '1px solid #d1d5db',
                      background: newChatType === o.t ? '#eef2ff' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                    }}>
                    {o.icon} {o.label}
                  </button>
                ))}
              </div>

              {/* Group/broadcast name */}
              {(newChatType === 'group' || newChatType === 'broadcast') && (
                <input
                  type="text"
                  className="form-input"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder={newChatType === 'broadcast' ? 'Broadcast channel name (e.g. Announcements)' : 'Group name'}
                  style={{ width: '100%', marginBottom: 12 }}
                />
              )}

              {/* User picker (not needed for broadcast) */}
              {newChatType !== 'broadcast' && (
                <>
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      className="form-input"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search users..."
                      style={{ width: '100%', paddingLeft: 30 }}
                    />
                  </div>
                  <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    {filteredUsers.length === 0 ? (
                      <div style={{ padding: 16, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>No users found</div>
                    ) : (
                      filteredUsers.map(u => {
                        const selected = selectedIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            onClick={() => toggleUserSelect(u.id)}
                            style={{
                              width: '100%', padding: '10px 12px', border: 'none',
                              borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                              background: selected ? '#eef2ff' : '#fff', textAlign: 'left',
                              display: 'flex', alignItems: 'center', gap: 10,
                            }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%', background: '#e0e7ff',
                              color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13,
                            }}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>{u.role?.replace('_', ' ')} {u.email ? `• ${u.email}` : ''}</div>
                            </div>
                            {selected && <div style={{ color: '#4338ca', fontSize: 18 }}>✓</div>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: 14, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowNewChat(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateConversation}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
