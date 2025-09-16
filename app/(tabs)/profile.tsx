import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '@/lib/cloudinary';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar, Button, Card, Divider, Input, Layout, Modal, Text } from '@ui-kitten/components';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../lib/AuthContext';
import { deleteBuild, getUserBuilds, SavedBuild, updateBuild } from '../../lib/buildService';
import { database } from '../../lib/firebase';
import { BuildConfiguration } from './build';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  
  // Redirect to login if user is not authenticated
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }
  
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([]);
  const [loadingBuilds, setLoadingBuilds] = useState(false);
  const [editBuildVisible, setEditBuildVisible] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<SavedBuild | null>(null);
  const [editedBuildConfig, setEditedBuildConfig] = useState<BuildConfiguration | null>(null);

  const loadSavedBuilds = async () => {
    if (!user) return;
    try {
      setLoadingBuilds(true);
      const builds = await getUserBuilds(user.uid);
      setSavedBuilds(builds);
    } catch (error) {
      console.error('Error loading saved builds:', error);
    } finally {
      setLoadingBuilds(false);
    }
  };

  // Load builds when component mount or user changes
  useFocusEffect(
    React.useCallback(() => {
      loadSavedBuilds();
    }, [user])
  );


  // Password change state
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

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
      const cloudinaryUrl = await uploadImageToCloudinary(result.assets[0].uri);
      console.log('Cloudinary URL:', cloudinaryUrl);
      if (cloudinaryUrl) {
        setPhotoURL(cloudinaryUrl);
        console.log('Updated photoURL:', cloudinaryUrl);
      }
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      console.log('Updating profile with:', { displayName, photoURL });
      await updateProfile(user, {
        displayName,
        photoURL
      });

      // Update user data in Realtime Database
      const userRef = ref(database, 'users/' + user.uid);
      await update(userRef, {
        displayName,
        photoURL
      });

      console.log('Profile updated successfully');
      setVisible(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;

    try {
      setPasswordLoading(true);
      setPasswordError('');

      if (newPassword !== confirmNewPassword) {
        setPasswordError('New passwords do not match');
        return;
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setPasswordVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      setPasswordError(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEditBuild = (build: SavedBuild) => {
    router.push({
      pathname: "/build",
      params: {
        editBuildId: build.id,
        initialConfig: JSON.stringify(build.config)
      }
    });
  };

  const handleUpdateBuild = async () => {
    if (!user || !selectedBuild || !editedBuildConfig) return;

    try {
      await updateBuild(selectedBuild.id, user.uid, editedBuildConfig);
      const updatedBuilds = await getUserBuilds(user.uid);
      setSavedBuilds(updatedBuilds);
      setEditBuildVisible(false);
      setSelectedBuild(null);
      setEditedBuildConfig(null);
      Alert.alert('Success', 'Build updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteBuild = async (buildId: string) => {
    if (!user) return;

    Alert.alert(
      'Delete Build',
      'Are you sure you want to delete this build?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBuild(buildId, user.uid);
              const updatedBuilds = await getUserBuilds(user.uid);
              setSavedBuilds(updatedBuilds);
              Alert.alert('Success', 'Build deleted successfully!');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  };

  console.log('Current user photoURL:', user?.photoURL);
  console.log('Current photoURL state:', photoURL);

  return (
    <Layout style={styles.container}>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.avatarContainer}>
        <Avatar
          size="giant"
          source={{
            uri: user?.photoURL || 'https://ui-avatars.com/api/?name=' + (user?.displayName || 'User')
          }}
          style={styles.avatar}
        />
        <Text category="h6" style={styles.name}>{user?.displayName || 'User'}</Text>
        <Text appearance="hint">{user?.email}</Text>
      </TouchableOpacity>

      <Divider style={styles.divider} />

      <Button onPress={() => setPasswordVisible(true)} style={styles.button}>
        Change Password
      </Button>
      <Button 
        onPress={() => router.push('/(tabs)/savedBuilds')} 
        style={styles.viewBuildsButton}
      >
        View My Builds
      </Button>

      <Button 
        onPress={() => router.push('/(tabs)/myPost')} 
        style={styles.viewPostsButton}
      >
        View My Posts
      </Button>

      <Button onPress={handleLogout} status="danger" style={styles.logoutButton}>
        Logout
      </Button>

      {/* Profile Edit Modal */}
      <Modal
        visible={visible}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setVisible(false)}
      >
        <Card disabled style={styles.modal}>
          <Text category="h6" style={styles.modalTitle}>Edit Profile</Text>

          {error ? <Text status="danger" style={styles.error}>{error}</Text> : null}

          <TouchableOpacity onPress={pickImage} style={styles.avatarPickerContainer}>
            <Avatar
              size="giant"
              source={{
                uri: photoURL || 'https://ui-avatars.com/api/?name=' + (displayName || 'User')
              }}
              style={styles.modalAvatar}
            />
            <Text appearance="hint" style={styles.avatarPickerText}>Tap to change photo</Text>
          </TouchableOpacity>

          <Input
            placeholder="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
          />

          <View style={styles.profileModalButtons}>
            <Button
              onPress={() => setVisible(false)}
              appearance="ghost"
              status="basic"
              style={styles.profileModalButton}
            >
              Cancel
            </Button>

            <Button
              onPress={handleUpdateProfile}
              disabled={loading}
              style={styles.profileModalButton}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </View>
        </Card>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={passwordVisible}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setPasswordVisible(false)}
      >
        <Card disabled style={styles.modal}>
          <Text category="h6" style={styles.modalTitle}>Change Password</Text>

          {passwordError ? <Text status="danger" style={styles.error}>{passwordError}</Text> : null}

          <Input
            placeholder="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            style={styles.input}
          />

          <Input
            placeholder="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            style={styles.input}
          />

          <Input
            placeholder="Confirm New Password"
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            secureTextEntry
            style={styles.input}
          />

          <View style={styles.profileModalButtons}>
            <Button
              onPress={() => setPasswordVisible(false)}
              appearance="ghost"
              status="basic"
              style={styles.profileModalButton}
            >
              Cancel
            </Button>

            <Button
              onPress={handleChangePassword}
              disabled={passwordLoading}
              style={styles.profileModalButton}
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </View>
        </Card>
      </Modal>

      {/* Edit Build Modal */}
      <Modal
        visible={editBuildVisible}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setEditBuildVisible(false)}
      >
        <Card disabled style={styles.modal}>
          <Text category="h6" style={styles.modalTitle}>Edit Build</Text>

          {selectedBuild && editedBuildConfig && (
            <ScrollView style={styles.editBuildForm}>
              <Text category="s1" style={styles.editSectionTitle}>CPU</Text>
              <Text style={styles.partInfo}>
                Current: {editedBuildConfig.cpu?.name || 'None'}
              </Text>

              <Text category="s1" style={styles.editSectionTitle}>Memory</Text>
              <Text style={styles.partInfo}>
                Current: {editedBuildConfig.memory?.name || 'None'}
              </Text>

              <Text category="s1" style={styles.editSectionTitle}>Motherboard</Text>
              <Text style={styles.partInfo}>
                Current: {editedBuildConfig.motherboard?.name || 'None'}
              </Text>

              <Text category="s1" style={styles.editSectionTitle}>Video Card</Text>
              <Text style={styles.partInfo}>
                Current: {editedBuildConfig.videoCard?.name || 'None'}
              </Text>

              <Text category="s1" style={[styles.editSectionTitle, styles.totalPrice]}>
                Total Price: ${selectedBuild.totalPrice.toFixed(2)}
              </Text>
            </ScrollView>
          )}

          <View style={styles.modalButtons}>
            <Button
              onPress={() => setEditBuildVisible(false)}
              appearance="ghost"
              status="basic"
              style={styles.modalButton}
            >
              Cancel
            </Button>

            <Button
              onPress={handleUpdateBuild}
              style={styles.modalButton}
            >
              Update Build
            </Button>
          </View>
        </Card>
      </Modal>



    </Layout>
  );
}

const styles = StyleSheet.create({
  // Post section styles
  sectionContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a237e',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
  },
  postsContainer: {
    gap: 12,
  },
  postCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  modalCard: {
    borderRadius: 12,
    padding: 16,
    minWidth: 300,
  },
 
  modalText: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 0,
    paddingTop: 50,
    backgroundColor: '#f4f6fb',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 30,
    backgroundColor: '#fff',
    paddingVertical: 24,
    borderRadius: 18,
    marginHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 110,
    height: 110,
    marginBottom: 16,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#1976d2',
    backgroundColor: '#e3eafc',
  },
  name: {
    marginBottom: 4,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
    letterSpacing: 0.2,
  },
  divider: {
    marginVertical: 18,
    backgroundColor: '#e3e3e3',
    height: 1,
  },
  button: {
    marginBottom: 16,
    marginHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  viewBuildsButton: {
    marginTop: 10,
    marginHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  viewPostsButton: {
    marginTop: 10,
    marginHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  logoutButton: {
    marginTop: 18,
    marginHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    minWidth: 320,
    margin: 2,
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 18,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: 18,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#f1f3f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    paddingHorizontal: 12,
    fontSize: 15,
  },
  profileModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  profileModalButton: {
    marginLeft: 8,
    borderRadius: 10,
  },
  error: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#ff4444',
  },
  avatarPickerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    marginBottom: 8,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#1976d2',
    backgroundColor: '#e3eafc',
  },
  avatarPickerText: {
    fontSize: 12,
    color: '#607d8b',
  },
  contentSectionTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: 16,
  },
  buildId: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  buildHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  buildActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    marginLeft: 8,
  },
  editBuildForm: {
    maxHeight: 300,
    marginBottom: 16,
  },
  editSectionTitle: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  partInfo: {
    color: '#666',
    marginBottom: 8,
  },
  totalPrice: {
    marginTop: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  buildsContainer: {
    maxHeight: 300,
    marginBottom: 15,
  },
  buildCard: {
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  buildTitle: {
    marginBottom: 5,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  buildPrice: {
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buildParts: {
    marginTop: 5,
  },
  partText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 2,
  },
  loadingText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
  },
  noBuildsText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
    fontStyle: 'italic',
  },
});