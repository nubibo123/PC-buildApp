import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/AuthContext';
import { createPost } from '../services/postService';
import { BuildConfiguration } from './(tabs)/build';

interface Part {
  name: string;
  price: number;
  [key: string]: any;
}

interface BuildConfig {
  [category: string]: Part | null;
}

export default function CreatePost() {
  const { user } = useAuth();
  
  // Redirect to login if user is not authenticated
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const buildConfig: BuildConfiguration | null = params.buildConfig ? JSON.parse(params.buildConfig as string) : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    if (!buildConfig) {
      Alert.alert('Error', 'Build configuration is required');
      return;
    }

    try {
      await createPost({
        title,
        description,
        userId: user.uid,
        partList: buildConfig,
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Post created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create post');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Create Post' }} />
      
      <ScrollView style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter post title"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter post description"
            multiline
            numberOfLines={8}
          />
        </View>

        {buildConfig && (
          <View style={styles.buildConfigContainer}>
            <Text style={styles.sectionTitle}>Selected Parts</Text>
            {Object.entries(buildConfig).map(([category, part]) => {
              if (!part) return null;
              return (
                <View key={category} style={styles.partItem}>
                  <Text style={styles.partCategory}>{category}</Text>
                  <Text style={styles.partName}>{part.name}</Text>
                  <Text style={styles.partPrice}>${part.price}</Text>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Create Post</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  descriptionInput: {
    height: 150,
    textAlignVertical: 'top',
  },
  buildConfigContainer: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  partItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  partCategory: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  partName: {
    flex: 2,
    fontSize: 14,
    color: '#333',
  },
  partPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196F3',
  },
  submitButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});