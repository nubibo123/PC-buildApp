import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Input, Layout, Spinner, Text } from '@ui-kitten/components';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { auth, database } from '../../lib/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const renderEyeIcon = (props: any) => (
    <TouchableOpacity onPress={toggleSecureEntry} activeOpacity={0.7} style={{ paddingHorizontal: 8 }}>
      <Ionicons
        name={secureTextEntry ? 'eye' : 'eye-off'}
        size={22}
        color="#8F9BB3"
      />
    </TouchableOpacity>
  );

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update last login timestamp in Realtime Database
      const userRef = ref(database, 'users/' + user.uid);
      await update(userRef, {
        lastLoginAt: new Date().toISOString()
      });

      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Layout style={styles.container}>
        <View style={styles.logoContainer}>
          <Avatar
            source={require('@/assets/images/default-avatar.png')}
            style={styles.logo}
          />
        </View>
        <Text category="h3" style={styles.title}>Welcome Back</Text>
        <Text appearance="hint" style={styles.subtitle}>Sign in to continue</Text>

        <Input
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          size="large"
          status="primary"
          textContentType="emailAddress"
        />
        <Input
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          size="large"
          status="primary"
          textContentType="password"
          accessoryRight={renderEyeIcon}
        />

        {error ? <Text status="danger" style={styles.error}>{error}</Text> : null}

        <Button
          onPress={handleLogin}
          disabled={loading}
          style={styles.button}
          size="large"
          status="primary"
          accessoryLeft={loading ? () => <Spinner size="small" /> : undefined}
        >
          {loading ? 'Logging in ...' : 'Login'}
        </Button>
        <Button
          appearance="ghost"
          onPress={() => router.push('/register')}
          style={styles.link}
          status="basic"
        >
          Don't have an account? <Text status="primary">Register</Text>
        </Button>
      </Layout>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 8,
    borderRadius: 36,
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#8F9BB3',
    fontSize: 16,
  },
  input: {
    marginBottom: 18,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 0,
    elevation: 1,
  },
  button: {
    marginBottom: 18,
    borderRadius: 12,
    shadowColor: '#3366FF',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  link: {
    alignSelf: 'center',
    marginBottom: 8,
    borderRadius: 8,
  },
  error: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#FF3D71',
    fontWeight: '500',
  },
});
