import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { chatWithGemini } from '../../lib/geminiApi';

interface AIChatBoxProps {
  visible: boolean;
  onClose: () => void;
  initialQuestion?: string | null;
  buildConfig?: any;
}

export default function AIChatBox({ visible, onClose, initialQuestion, buildConfig }: AIChatBoxProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Send sample question when chat opens
  useEffect(() => {
    if (visible && initialQuestion) {
      handleSendInitialQuestion(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialQuestion]);

  const handleSendInitialQuestion = async (question: string) => {
    setMessages([{ role: 'user', text: question }]);
    setLoading(true);
    setError('');
    try {
      let content = question;
      if (buildConfig) {
  content += '\n\nPC Build Configuration:\n' + JSON.stringify(buildConfig, null, 2);
      }
      const reply = await chatWithGemini([
        { role: 'user', parts: [content] }
      ]);
      setMessages(msgs => [
        { role: 'user', text: question },
        { role: 'model', text: reply }
      ]);
      setInput('');
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', text: input }]);
    setLoading(true);
    setError('');
    try {
      let content = input;
      if (buildConfig) {
  content += '\n\nPC Build Configuration:\n' + JSON.stringify(buildConfig, null, 2);
      }
      const reply = await chatWithGemini([
        ...messages.map(m => ({ role: m.role, parts: [m.text] })),
        { role: 'user', parts: [content] }
      ]);
      setMessages(msgs => [...msgs, { role: 'model', text: reply }]);
      setInput('');
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Strip simple HTML tags
  function stripHtmlTags(str: string): string {
    if (!str) return '';
    return str.replace(/<[^>]+>/g, '');
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Gemini AI Chat</Text>
        <ScrollView style={styles.chatArea} contentContainerStyle={{ paddingBottom: 20 }}>
          {messages.map((msg, idx) => (
            <View key={idx} style={[styles.msgBubble, msg.role === 'user' ? styles.userBubble : styles.modelBubble]}>
              {msg.role === 'model' ? (
                <Markdown
                  style={{
                    body: { color: '#333', fontSize: 15 },
                    strong: { fontWeight: 'bold' },
                    em: { fontStyle: 'italic' },
                    bullet_list: { marginLeft: 16 },
                    list_item: { flexDirection: 'row', alignItems: 'flex-start' },
                    paragraph: { marginBottom: 8 },
                  }}
                >
                  {stripHtmlTags(msg.text)}
                </Markdown>
              ) : (
                <TextInput
                  style={[styles.msgText, { color: '#1976d2', fontWeight: 'bold', backgroundColor: 'transparent' }]}
                  value={msg.text}
                  editable={false}
                  multiline
                />
              )}
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
            autoCapitalize="sentences"
            autoCorrect={true}
            keyboardType="default"
            // Ensure Unicode support
            inputMode="text"
            // If you want to force Unicode, you can add maxLength or selectionColor, but React Native TextInput supports Unicode by default
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
