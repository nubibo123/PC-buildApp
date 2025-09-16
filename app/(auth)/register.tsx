import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '@/lib/cloudinary';
import { auth, database } from '@/lib/firebase';
import { Avatar, Button, Datepicker, Input, Layout, Text } from '@ui-kitten/components';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../lib/AuthContext';

export default function SignUpScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // Nếu đã đăng nhập, redirect về tabs
  if (user && !isLoading) {
    return <Redirect href="/(tabs)" />;
  }
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState(new Date());
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const uploadImageToCloudinary = async (uri: string) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      console.log('Cloudinary upload response:', data);
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      console.log('Selected image URI:', result.assets[0].uri);
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSignUp = async () => {
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setLoading(true);
      let photoURL = '';
      
      if (avatar) {
        photoURL = await uploadImageToCloudinary(avatar) || '';
        console.log('Uploaded photo URL:', photoURL);
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile
      await updateProfile(user, {
        displayName: name,
        photoURL: photoURL
      });
      console.log('Updated user profile with:', { displayName: name, photoURL });

      // Save user data to Realtime Database
      const userRef = ref(database, 'users/' + user.uid);
      await set(userRef, {
        email: user.email,
        displayName: name,
        photoURL,
        birthday: birthday.toISOString(),
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });

      console.log('✅ Đăng ký thành công:', user.email);
      router.replace('/(tabs)');

    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={styles.container}>
      <Text category="h3" style={styles.title}>Create Account</Text>
      <Text appearance="hint" style={styles.subtitle}>Join us and start your journey!</Text>

      <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
        <Avatar
          size="giant"
          source={avatar ? { uri: avatar } : require('@/assets/images/default-avatar.png')}
          style={styles.avatar}
        />
        <Text style={styles.avatarText}>Tap to choose avatar</Text>
      </TouchableOpacity>

      <Input
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        size="large"
        status="primary"
      />

      <Datepicker
        date={birthday}
        onSelect={setBirthday}
        placeholder="Birthday"
        style={styles.input}
        size="large"
        placement="bottom" // Thêm dòng này để hiển thị Datepicker phía dưới
        min={new Date(1900, 0, 1)} // Có thể thêm nếu muốn giới hạn năm nhỏ nhất
        max={new Date()} // Có thể thêm nếu muốn giới hạn năm lớn nhất là hiện tại
      />
    

      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        size="large"
        status="primary"
        textContentType="emailAddress"
      />

      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        size="large"
        status="primary"
        textContentType="password"
      />

      <Input
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        style={styles.input}
        size="large"
        status="primary"
        textContentType="password"
      />

      {error ? <Text status="danger" style={styles.error}>{error}</Text> : null}

      <Button onPress={handleSignUp} disabled={loading} style={styles.button} size="large" status="primary">
        {loading ? 'Registering ...' : 'Create account'}
      </Button>

      <Button appearance="ghost" onPress={() => router.push('/login')} style={styles.link} status="basic">
        Already have an account? <Text status="primary">Login</Text>
      </Button>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    marginBottom: 8,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#1976d2',
    backgroundColor: '#e3eafc',
  },
  avatarText: {
    color: '#8F9BB3',
    fontSize: 14,
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
