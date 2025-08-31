import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Layout, Modal, Spinner, Text } from '@ui-kitten/components';
import { router, Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Case, CPU, InternalHardDrive, Memory, Monitor, Motherboard, PowerSupply, VideoCard } from '../../data/csvData';
import { deleteBuild, getUserBuilds, SavedBuild } from '../../lib/buildService';
import { auth } from '../../lib/firebase';

interface Build {
  id: string;
  userId: string;
  createdAt: number;
  totalPrice: number;
  userProfile?: {
    displayName: string;
    photoURL: string;
    email: string;
  };
  config: {
    cpu?: CPU;
    memory?: Memory;
    motherboard?: Motherboard;
    videoCard?: VideoCard;
    case?: Case;
    powerSupply?: PowerSupply;
    internalHardDrive?: InternalHardDrive;
    monitor?: Monitor;
    };
  };

export default function SavedBuildsScreen() {
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);

  useEffect(() => {
    loadSavedBuilds();
  }, []);
useFocusEffect(
  useCallback(() => {
    loadSavedBuilds();
  }, [])
);
  const loadSavedBuilds = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace('/');
        return;
      }
      const builds = await getUserBuilds(userId);
      setSavedBuilds(builds);
    } catch (error) {
      console.error('Error loading builds:', error);
    } finally {
      setLoading(false);
    }
  };

    const handleEditBuild = async (build: SavedBuild) => {
    try {
      // Keep the original configuration as is
      const initialConfig = {
        cpu: build.config.cpu,
        memory: build.config.memory,
        motherboard: build.config.motherboard,
        videoCard: build.config.videoCard,
        case: build.config.case,
        powerSupply: build.config.powerSupply,
        internalHardDrive: build.config.internalHardDrive,
        monitor: build.config.monitor
      };

      router.push({
        pathname: '/build',
        params: { 
          editBuildId: build.id,
          initialConfig: JSON.stringify(initialConfig),
          showBuildSummary: 'true' // Force show build summary when editing
        }
      });
    } catch (error) {
      console.error('Error preparing build for edit:', error);
    }
  };

  const confirmDelete = (buildId: string) => {
    setSelectedBuildId(buildId);
    setDeleteModalVisible(true);
  };

  const handleDeleteBuild = async () => {
    if (!selectedBuildId) return;

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      await deleteBuild(selectedBuildId, userId);
      setSavedBuilds(builds => builds.filter(b => b.id !== selectedBuildId));
      setDeleteModalVisible(false);
    } catch (error) {
      console.error('Error deleting build:', error);
    }
  };

  if (loading) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size="large" />
        <Text style={styles.loadingText}>Loading builds...</Text>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Saved Builds',
          headerTitleAlign:'left',
        
          headerLeft: () => (
            <Button appearance="ghost" onPress={() => router.back()}>
                     <Text style={{ fontSize: 30,marginRight:4}}>{'<'} Back</Text>
 
            </Button>
          ),
          headerBackTitle: 'Back',
        }}
      />

      
      {savedBuilds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No saved builds yet</Text>
          <Button onPress={() => router.push('/build')}>Create New Build</Button>
        </View>
      ) : (
        <ScrollView style={styles.buildsContainer}>
          {savedBuilds.map((build) => (
            <BuildCard
              key={build.id}
              build={build}
              onEdit={() => handleEditBuild(build)}
              onDelete={() => confirmDelete(build.id)}
            />
          ))}

        </ScrollView>
      )}

      <Modal
        visible={deleteModalVisible}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => setDeleteModalVisible(false)}
      >
        <Card disabled style={styles.modalCard}>
          <Text category="h6" style={styles.modalTitle}>Delete Build</Text>
          <Text style={styles.modalText}>Are you sure you want to delete this build?</Text>
          <View style={styles.modalButtons}>
            <Button
              status="basic"
              onPress={() => setDeleteModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              status="danger"
              onPress={handleDeleteBuild}
              style={styles.modalButton}
            >
              Delete
            </Button>
          </View>
        </Card>
      </Modal>
    </Layout>
  );
}

type BuildCardProps = {
  build: SavedBuild;
  onEdit: () => void;
  onDelete: () => void;
};

function BuildCard({ build, onEdit, onDelete }: BuildCardProps) {
  const [expanded, setExpanded] = useState(true);
  // Build a list of all components with their info and index
  const componentList = [
    build.config.cpu && { label: 'CPU', ...build.config.cpu, image: build.config.cpu.link_image },
    build.config.memory && { label: 'Memory', ...build.config.memory, image: build.config.memory.image_link },
    build.config.motherboard && { label: 'Motherboard', ...build.config.motherboard, image: build.config.motherboard.image_link },
    build.config.videoCard && { label: 'Video Card', ...build.config.videoCard, image: build.config.videoCard.image_link },
    build.config.case && { label: 'Case', ...build.config.case, image: build.config.case.image_link },
    build.config.powerSupply && { label: 'Power Supply', ...build.config.powerSupply, image: build.config.powerSupply.image_link },
    build.config.internalHardDrive && { label: 'Internal Hard Drive', ...build.config.internalHardDrive, image: build.config.internalHardDrive.image_link },
    build.config.monitor && { label: 'Monitor', ...build.config.monitor, image: build.config.monitor.image_link },
  ].filter(Boolean) as Array<{ label: string; name: string; image: string; price: number }>;

  return (
    <Card style={styles.buildCard}>
      <View style={styles.buildHeader}>
        <View style={{ flex: 1 }}>
          <Text category="h6" style={styles.buildTitle}>
            Build {new Date(build.createdAt).toLocaleDateString()}
          </Text>
          <Text category="c1" style={styles.buildIdBelow}>ID: {build.id}</Text>
        </View>
      </View>
      <View style={styles.userInfoContainer}>
        <Image
          source={build.userProfile?.photoURL ? { uri: build.userProfile.photoURL } : require('../../assets/images/default-avatar.png')}
          style={styles.userAvatar}
        />
        <Text category="s1" style={styles.userName}>
          {build.userProfile?.displayName || build.userProfile?.email?.split('@')[0] || 'User'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Text category="s1" style={[styles.priceText, { fontSize: 24, lineHeight: 30 }]}> {/* Force large font */}
          Total Price: <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 24, lineHeight: 30 }}>${build.totalPrice.toFixed(2)}</Text>
        </Text>
        <Button
          size="tiny"
          appearance="filled"
          status={expanded ? 'info' : 'basic'}
          style={{ marginLeft: 14, borderRadius: 20, backgroundColor: expanded ? '#e3eafc' : '#f1f3f6', minWidth: 44, minHeight: 36, paddingHorizontal: 12, paddingVertical: 0, justifyContent: 'center', alignItems: 'center', elevation: expanded ? 2 : 0 }}
          onPress={() => setExpanded((e) => !e)}
        >
          <Text style={{ fontSize: 22, color: '#1976d2', fontWeight: 'bold', textAlign: 'center' }}>
            {expanded ? '▲' : '▼'}
          </Text>
        </Button>
      </View>
      {expanded && (
        <View style={styles.componentsGridBetter}>
          {componentList.map((comp) => (
            <View key={comp.label} style={styles.componentItemBetter}>
              <Text style={styles.componentName}>{comp.label}</Text>
              <Text style={styles.componentText}>{comp.name}</Text>
              <Image
                source={{ uri: comp.image }}
                style={styles.componentImageBetter}
                resizeMode="cover"
              />
              <Text style={styles.componentPrice}>${comp.price}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.actionButtons}>
        <Button
          status="info"
          onPress={onEdit}
          style={styles.actionButton}
        >
          Edit Build
        </Button>
        <Button
          status="danger"
          onPress={onDelete}
          style={styles.actionButton}
        >
          Delete
        </Button>
      </View>
    </Card>
  );
}

// Thêm style mới cho UI đẹp hơn
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 66, // 50 + 16 to account for existing padding
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  buildsContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  buildCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e3e3e3',
  },
  buildHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buildTitle: {
    marginBottom: 2,
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: 18,
  },
  buildIdBelow: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 2,
    fontStyle: 'italic',
  },
  priceText: {
    color: '#2196F3',
    marginBottom: 18,
    fontWeight: 'bold',
    fontSize: 16,
  },
  componentsGridBetter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 18,
  },
  componentItemBetter: {
    width: '98%', // Make each component card almost full width
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  componentImageBetter: {
    width: '100%',
    height: 180, // Make image taller
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: '#f1f3f6',
  },
  componentName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1976d2',
  },
  componentText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
    color: '#333',
  },
  componentPrice: {
    fontSize: 15,
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCard: {
    minWidth: 300,
    borderRadius: 8,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalText: {
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    flex: 1,
  },
});