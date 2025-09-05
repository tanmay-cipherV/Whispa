// src/screens/ChatScreen.js
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Bubble, GiftedChat, InputToolbar, Send } from 'react-native-gifted-chat';
import api from '../api';
import { getMe } from '../authStore';
import { getSocket } from '../socket';

export default function ChatScreen({ route }) {
  const { userId: otherId } = route.params; // The person we are chatting with
  const [me, setMe] = useState(null);       // Current logged in user
  const [messages, setMessages] = useState([]); // Chat messages
  const [conversationId, setConversationId] = useState(null);
  const [isTyping, setIsTyping] = useState(false); // Typing indicator

  // Load chat history when screen opens
  useEffect(() => {
    (async () => {
      const m = await getMe();
      setMe(m);

      // Fetch old messages with this user
      const { data } = await api.get(`/conversations/${otherId}/messages`);
      setConversationId(data.conversationId);

      // Convert messages to GiftedChat format
      const mapped = data.messages.map(mapToGifted(m._id));
      setMessages(mapped.reverse());

      // Immediately mark messages as read
      getSocket().emit('message:read', { conversationId: data.conversationId });
    })();
  }, [otherId]);

  // Socket event listeners (new message, typing, read receipts)
  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    const onNew = (msg) => {
      // Only handle messages for this chat
      if (!conversationId || String(msg.conversation) !== String(conversationId)) return;
      setMessages(prev => GiftedChat.append(prev, [toGifted(msg, me._id)]));
    };

    const onTypingStart = ({ from }) => { if (from === otherId) setIsTyping(true); };
    const onTypingStop = ({ from }) => { if (from === otherId) setIsTyping(false); };

    const onRead = ({ conversationId: cid }) => {
      if (String(cid) !== String(conversationId)) return;
      // Mark all my messages as read
      setMessages(prev => prev.map(m => 
        m.user._id === me._id ? ({ ...m, received: true }) : m
      ));
    };

    // Register handlers
    s.on('message:new', onNew);
    s.on('typing:start', onTypingStart);
    s.on('typing:stop', onTypingStop);
    s.on('message:read', onRead);

    // Cleanup on unmount
    return () => {
      s.off('message:new', onNew);
      s.off('typing:start', onTypingStart);
      s.off('typing:stop', onTypingStop);
      s.off('message:read', onRead);
    };
  }, [conversationId, otherId, me]);

  // Send a new message
  const onSend = useCallback((newMsgs = []) => {
    // Optimistic update: add message locally
    setMessages(prev => GiftedChat.append(prev, newMsgs.map(m => ({ ...m, sent: true }))));

    const s = getSocket();
    newMsgs.forEach(m => {
      s.emit('message:send', { to: otherId, body: m.text, tempId: m._id });
    });
  }, [otherId]);

  // Typing indicator
  const onInputTextChanged = (text) => {
    const s = getSocket();
    if (!s) return;
    if (text) s.emit('typing:start', { to: otherId });
    else s.emit('typing:stop', { to: otherId });
  };

  // Custom bubble styling
  const renderBubble = (props) => {
    const { currentMessage } = props;
    let tick = '';
    if (currentMessage.user._id === me?._id) {
      if (currentMessage.received) tick = ' ✓✓'; // read
      else if (currentMessage.sent) tick = ' ✓✓'; // delivered
      else tick = ' ✓'; // just sent locally
    }
    return (
      <Bubble
        {...props}
        renderTicks={() => <View style={styles.tickContainer}><text style={styles.tick}>{tick}</text></View>}
        wrapperStyle={{
          right: {
            backgroundColor: '#007AFF',
            marginRight: 8,
          },
          left: {
            backgroundColor: '#f0f0f0',
            marginLeft: 8,
          }
        }}
        textStyle={{
          right: {
            color: '#fff',
            fontSize: 16,
          },
          left: {
            color: '#333',
            fontSize: 16,
          }
        }}
      />
    );
  };

  // Custom input toolbar
  const renderInputToolbar = (props) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
      />
    );
  };

  // Custom send button
  const renderSend = (props) => {
    return (
      <Send
        {...props}
        containerStyle={styles.sendContainer}
        textStyle={styles.sendText}
      />
    );
  };

  return (
    <View style={styles.container}>
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={{ _id: me?._id, name: me?.username }}
        isTyping={isTyping}
        onInputTextChanged={onInputTextChanged}
        renderBubble={renderBubble}
        renderInputToolbar={renderInputToolbar}
        renderSend={renderSend}
        placeholder="Type a message..."
        showUserAvatar={false}
        showAvatarForEveryMessage={false}
        alwaysShowSend={true}
        scrollToBottom={true}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inputToolbar: {
    backgroundColor: '#f8f9fa',
    borderTopColor: '#e1e5e9',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inputPrimary: {
    alignItems: 'center',
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  sendText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
  },
  tickContainer: {
    marginTop: 2,
  },
  tick: {
    fontSize: 12,
    color: '#999',
  },
});

// Helper: map DB message → GiftedChat message format
const mapToGifted = (myId) => (m) => toGifted(m, myId);
function toGifted(m, myId) {
  return {
    _id: m._id || m.tempId,
    text: m.body,
    createdAt: new Date(m.createdAt),
    user: { _id: m.sender === myId ? myId : m.sender },
    sent: !!m.deliveredAt,
    received: !!m.readAt
  };
}