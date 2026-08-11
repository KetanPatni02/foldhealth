import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { FormPicker } from '../forms/FormPicker';
import { formShareLink } from '../forms/formLink';
import { ChatHeader } from './ChatHeader';
import { ChatMessagesList } from './ChatMessagesList';
import { ChatInputArea } from './ChatInputArea';
import styles from './MessagesView.module.css';

export function ChatArea({ currentUser, otherUser, onConversationUpdate }) {
  const [messages, setMessages]           = useState([]);
  const [inputValue, setInputValue]       = useState('');
  const [loading, setLoading]             = useState(true);
  const [sending, setSending]             = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [replyTo, setReplyTo]             = useState(null);
  const [dragOver, setDragOver]           = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [formPickerOpen, setFormPickerOpen] = useState(false);

  const messagesRef   = useRef(null);
  const channelRef    = useRef(null);
  const textareaRef   = useRef(null);
  const fileInputRef  = useRef(null);
  const typingTimer   = useRef(null);
  const stopTimer     = useRef(null);
  const onUpdateRef   = useRef(onConversationUpdate);
  useEffect(() => { onUpdateRef.current = onConversationUpdate; });

  const scrollToBottom = useCallback((instant = false) => {
    const el = messagesRef.current;
    if (!el) return;
    if (instant) {
      el.scrollTop = el.scrollHeight;
    } else {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distFromBottom < 260) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }
  }, []);

  const markRead = useCallback(async (msgs) => {
    const ids = [];
    for (const m of msgs) {
      if (m.recipient_id === currentUser.id && !m.read_at && !String(m.id).startsWith('opt-')) {
        ids.push(m.id);
      }
    }
    if (!ids.length) return;
    await supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).in('id', ids);
    onUpdateRef.current?.();
  }, [currentUser.id]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    let msgs = [];
    try {
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUser.id},recipient_id.eq.${otherUser.id}),` +
          `and(sender_id.eq.${otherUser.id},recipient_id.eq.${currentUser.id})`
        )
        .order('created_at', { ascending: true });
      msgs = data || [];
      setMessages(msgs);
    } finally {
      setLoading(false);
    }
    markRead(msgs);
    requestAnimationFrame(() => scrollToBottom(true));
  }, [currentUser.id, otherUser.id, markRead, scrollToBottom]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (isOtherTyping) scrollToBottom(false);
  }, [isOtherTyping, scrollToBottom]);

  useEffect(() => {
    channelRef.current?.unsubscribe();
    const key = `dm-${[currentUser.id, otherUser.id].sort().join('-')}`;
    channelRef.current = supabase
      .channel(key)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const msg = payload.new;
        const relevant =
          (msg.sender_id === currentUser.id && msg.recipient_id === otherUser.id) ||
          (msg.sender_id === otherUser.id   && msg.recipient_id === currentUser.id);
        if (!relevant) return;
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.recipient_id === currentUser.id) {
          supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id)
            .then(() => onUpdateRef.current?.());
        }
        scrollToBottom(false);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' }, (payload) => {
        const msg = payload.new;
        if (msg.sender_id === currentUser.id && msg.read_at) {
          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read_at: msg.read_at } : m));
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== otherUser.id) return;
        setIsOtherTyping(payload.isTyping);
        if (payload.isTyping) {
          clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setIsOtherTyping(false), 3000);
        }
      })
      .subscribe();
    return () => { channelRef.current?.unsubscribe(); clearTimeout(typingTimer.current); };
  }, [currentUser.id, otherUser.id, scrollToBottom]);

  const broadcastTyping = useCallback((isTyping) => {
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping } });
  }, [currentUser.id]);

  const uploadFile = useCallback(async (file) => {
    setUploading(true);
    const ext  = file.name.split('.').pop();
    const path = `${currentUser.id}/${Date.now()}.${ext}`;
    let error;
    try {
      ({ error } = await supabase.storage.from('chat-media').upload(path, file, { upsert: true }));
    } finally {
      setUploading(false);
    }
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
    return { url: publicUrl, type: file.type.startsWith('image/') ? 'image' : 'file', name: file.name };
  }, [currentUser.id]);

  const doSend = useCallback(async (mediaInfo = null) => {
    const content = inputValue.trim();
    if (!content && !mediaInfo) return;
    if (sending) return;
    setSending(true);
    broadcastTyping(false);
    clearTimeout(stopTimer.current);

    const savedReply = replyTo;
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setReplyTo(null);

    const optId = `opt-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: optId, sender_id: currentUser.id, recipient_id: otherUser.id,
      content: content || null, created_at: new Date().toISOString(), read_at: null,
      reply_to_id: savedReply?.id || null,
      media_url: mediaInfo?.url || null, media_type: mediaInfo?.type || null, media_name: mediaInfo?.name || null,
    }]);
    scrollToBottom(false);

    const payload = { sender_id: currentUser.id, recipient_id: otherUser.id, content: content || null };
    if (savedReply?.id)  payload.reply_to_id = savedReply.id;
    if (mediaInfo?.url) { payload.media_url = mediaInfo.url; payload.media_type = mediaInfo.type; payload.media_name = mediaInfo.name; }

    try {
      const { data } = await supabase.from('direct_messages').insert(payload).select().single();
      if (data) {
        setMessages(prev => prev.map(m => m.id === optId ? data : m));
        onUpdateRef.current?.();
      }
    } finally {
      setSending(false);
    }
    textareaRef.current?.focus();
  }, [inputValue, sending, currentUser.id, otherUser.id, replyTo, broadcastTyping, scrollToBottom]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    if (e.key === 'Escape') setReplyTo(null);
  };

  const handleInput = (e) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    broadcastTyping(true);
    clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    const media = await uploadFile(file);
    if (media) doSend(media);
  };

  return (
    <div className={styles.chatPanel}>
      <ChatHeader otherUser={otherUser} isOtherTyping={isOtherTyping} />

      <ChatMessagesList
        messagesRef={messagesRef}
        loading={loading}
        messages={messages}
        currentUser={currentUser}
        otherUser={otherUser}
        isOtherTyping={isOtherTyping}
        onReply={setReplyTo}
      />

      <ChatInputArea
        currentUser={currentUser}
        otherUser={otherUser}
        inputValue={inputValue}
        replyTo={replyTo}
        dragOver={dragOver}
        sending={sending}
        uploading={uploading}
        textareaRef={textareaRef}
        fileInputRef={fileInputRef}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onSend={() => doSend()}
        onClearReply={() => setReplyTo(null)}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
        onAttachClick={() => fileInputRef.current?.click()}
        onImageClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click(); } }}
        onFormPickerOpen={() => setFormPickerOpen(true)}
        onFileSelect={handleFileSelect}
      />

      {formPickerOpen && (
        <FormPicker
          onClose={() => setFormPickerOpen(false)}
          onSelect={(form) => {
            setFormPickerOpen(false);
            doSend({ url: formShareLink(form.id), type: 'form', name: form.name });
          }}
        />
      )}
    </div>
  );
}
