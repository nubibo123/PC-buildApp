import React, { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { chatWithGemini } from '../../lib/geminiApi';

interface AIChatBoxProps {
  visible: boolean;
  onClose: () => void;
}

export default function AIChatBox({ visible, onClose }: AIChatBoxProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', text: input }]);
    setLoading(true);
    setError('');
    try {
      const reply = await chatWithGemini([
        ...messages.map(m => ({ role: m.role, parts: [m.text] })),
        { role: 'user', parts: [input] }
      ]);
      setMessages(msgs => [...msgs, { role: 'model', text: reply }]);
      setInput('');
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Gemini AI Chat</Text>
        <ScrollView style={styles.chatArea} contentContainerStyle={{ paddingBottom: 20 }}>
          {messages.map((msg, idx) => (
            <View key={idx} style={[styles.msgBubble, msg.role === 'user' ? styles.userBubble : styles.modelBubble]}>
              <Text style={styles.msgText}>{msg.text}</Text>
            </View>
          ))}
          {loading && <ActivityIndicator size="small" color="#1976d2" style={{ marginTop: 10 }} />}
        </ScrollView>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your question..."
            editable={!loading}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={loading}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#1976d2' },
  chatArea: { flex: 1, marginBottom: 10 },
  msgBubble: { marginVertical: 4, padding: 10, borderRadius: 12, maxWidth: '80%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#e3f2fd' },
  modelBubble: { alignSelf: 'flex-start', backgroundColor: '#f1f8e9' },
  msgText: { fontSize: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 15, marginRight: 8 },
  sendBtn: { backgroundColor: '#1976d2', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  sendBtnText: { color: '#fff', fontWeight: 'bold' },
  closeBtn: { alignSelf: 'center', marginTop: 10, backgroundColor: '#eee', borderRadius: 8, padding: 10 },
  closeBtnText: { color: '#1976d2', fontWeight: 'bold' },
  error: { color: 'red', textAlign: 'center', marginBottom: 8 },
});
