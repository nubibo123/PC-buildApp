// app/(tabs)/scanPart.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ScanPartScreen() {
  const [image, setImage] = useState<string | null>(null);

  // Request camera permissions
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return false;
    }
    return true;
  };

  // Take photo with camera
  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="scan" size={40} color="#1976d2" />
        <Text style={styles.title}>PC Part Scanner</Text>
        <Text style={styles.subtitle}>Take or upload a photo of your PC component</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={pickImage}>
          <Ionicons name="images" size={24} color="#fff" />
          <Text style={styles.buttonText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>

      {image ? (
        <>
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
          </View>

          {/* Component Information Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="hardware-chip" size={32} color="#1976d2" />
              <View style={styles.infoHeaderText}>
                <Text style={styles.componentName}>NVIDIA GeForce RTX 3060</Text>
                <Text style={styles.componentType}>Graphics Card</Text>
              </View>
            </View>

            <View style={styles.specsList}>
              <View style={styles.specItem}>
                <Ionicons name="speedometer" size={20} color="#666" />
                <View style={styles.specContent}>
                  <Text style={styles.specLabel}>Memory</Text>
                  <Text style={styles.specValue}>8GB GDDR6</Text>
                </View>
              </View>

              <View style={styles.specItem}>
                <Ionicons name="flash" size={20} color="#666" />
                <View style={styles.specContent}>
                  <Text style={styles.specLabel}>Base Clock</Text>
                  <Text style={styles.specValue}>1320 MHz</Text>
                </View>
              </View>

              <View style={styles.specItem}>
                <Ionicons name="flame" size={20} color="#666" />
                <View style={styles.specContent}>
                  <Text style={styles.specLabel}>Boost Clock</Text>
                  <Text style={styles.specValue}>1777 MHz</Text>
                </View>
              </View>

              <View style={styles.specItem}>
                <Ionicons name="layers" size={20} color="#666" />
                <View style={styles.specContent}>
                  <Text style={styles.specLabel}>CUDA Cores</Text>
                  <Text style={styles.specValue}>3584 Cores</Text>
                </View>
              </View>

              <View style={styles.specItem}>
                <Ionicons name="power" size={20} color="#666" />
                <View style={styles.specContent}>
                  <Text style={styles.specLabel}>TDP</Text>
                  <Text style={styles.specValue}>170W</Text>
                </View>
              </View>

              <View style={styles.specItem}>
                <Ionicons name="resize" size={20} color="#666" />
                <View style={styles.specContent}>
                  <Text style={styles.specLabel}>Memory Bus</Text>
                  <Text style={styles.specValue}>128-bit</Text>
                </View>
              </View>
            </View>

            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>Key Features</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
                  <Text style={styles.featureText}>Ray Tracing Support</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
                  <Text style={styles.featureText}>DLSS Technology</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
                  <Text style={styles.featureText}>PCIe 4.0 Support</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
                  <Text style={styles.featureText}>DirectX 12 Ultimate</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={() => setImage(null)}
          >
            <Ionicons name="close-circle" size={24} color="#fff" />
            <Text style={styles.clearButtonText}>Clear Image</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="camera-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No image selected</Text>
          <Text style={styles.emptySubtext}>Take a photo or choose from gallery to get started</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#1976d2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: '#4caf50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    padding: 20,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
  },
  clearButton: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    margin: 20,
    marginTop: 10,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoHeaderText: {
    marginLeft: 15,
    flex: 1,
  },
  componentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  componentType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  specsList: {
    marginBottom: 20,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  specContent: {
    marginLeft: 15,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 15,
    color: '#666',
  },
  specValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  featuresSection: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 20,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
});
