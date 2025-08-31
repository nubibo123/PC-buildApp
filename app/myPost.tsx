import { Button, Card, Modal, Text } from '@ui-kitten/components';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../lib/AuthContext';
import { deletePost, getUserPosts, Post } from '../lib/postService';

// Add interface for components
interface Component {
  id: string;
  name: string;
  type: string;
  price: number;
  specs?: any;
}

export default function MyPostsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  // Add component-related state
  const [postComponents, setPostComponents] = useState<{[postId: string]: Component[]}>({});
  const [loadingComponents, setLoadingComponents] = useState<{[postId: string]: boolean}>({});

  const loadPosts = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const userPosts = await getUserPosts(user.uid);
      setPosts(userPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }, [user]);

  const handleDeletePost = async () => {
    if (!selectedPostId) return;

    try {
      await deletePost(selectedPostId);
      setPosts(currentPosts => currentPosts.filter(post => post.id !== selectedPostId));
      setDeleteModalVisible(false);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const confirmDelete = (postId: string) => {
    setSelectedPostId(postId);
    setDeleteModalVisible(true);
  };

  // Add function to fetch components for a post
  const fetchPostComponents = async (postId: string) => {
    if (loadingComponents[postId] || postComponents[postId]) return;
    
    try {
      setLoadingComponents(prev => ({...prev, [postId]: true}));
      // Replace with your actual component fetching service
      // const components = await getPostComponents(postId);
      
      // Mock data for demonstration
      const mockComponents: Component[] = [
        { id: '1', name: 'NVIDIA RTX 4070', type: 'GPU', price: 599 },
        { id: '2', name: 'Intel i7-13700K', type: 'CPU', price: 409 },
        { id: '3', name: 'DDR5 32GB', type: 'RAM', price: 199 }
      ];
      
      setPostComponents(prev => ({...prev, [postId]: mockComponents}));
    } catch (error) {
      console.error('Error fetching components:', error);
    } finally {
      setLoadingComponents(prev => ({...prev, [postId]: false}));
    }
  };

  // Add function to calculate total build cost
  const calculateBuildTotal = (components: Component[]) => {
    return components.reduce((total, component) => total + component.price, 0);
  };

  // Add function to generate build summary
  const generateBuildSummary = (components: Component[]) => {
    const total = calculateBuildTotal(components);
    const componentsByType = components.reduce((acc, comp) => {
      acc[comp.type] = comp;
      return acc;
    }, {} as {[type: string]: Component});

    return {
      total,
      componentsByType,
      componentCount: components.length
    };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading posts...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text category="h5" style={styles.title}>My Posts</Text>
      
      {posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text>No posts yet</Text>
          <Button 
            style={styles.createButton}
            onPress={() => router.push('/createPost')}
          >
            Create a Post
          </Button>
        </View>
      ) : (
        <View style={styles.postsContainer}>
          {posts.map((post) => (
            <Card key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <Text category="h6" style={styles.postTitle}>{post.title}</Text>
                <View style={styles.postHeaderRight}>
                  <Text style={styles.postDate}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </Text>
                  <Button
                    size="small"
                    status="danger"
                    appearance="ghost"
                    onPress={() => confirmDelete(post.id!)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </Button>
                </View>
              </View>
              <Text style={styles.postContent}>{post.description}</Text>
              
              {/* Add components section */}
              <View style={styles.componentsSection}>
                <View style={styles.componentHeader}>
                  <Text style={styles.componentTitle}>Components</Text>
                  {!postComponents[post.id!] && (
                    <TouchableOpacity onPress={() => fetchPostComponents(post.id!)}>
                      <Text style={styles.loadComponentsButton}>
                        {loadingComponents[post.id!] ? 'Loading...' : 'Load Components'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {postComponents[post.id!] && (
                  <View style={styles.componentsList}>
                    {postComponents[post.id!].map((component) => (
                      <View key={component.id} style={styles.componentItem}>
                        <View style={styles.componentInfo}>
                          <Text style={styles.componentName}>{component.name}</Text>
                          <Text style={styles.componentType}>{component.type}</Text>
                        </View>
                        <Text style={styles.componentPrice}>${component.price}</Text>
                      </View>
                    ))}
                    
                    {/* Build Summary */}
                    <View style={styles.buildSummary}>
                      <Text style={styles.summaryTitle}>Build Summary</Text>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total Components:</Text>
                        <Text style={styles.summaryValue}>{postComponents[post.id!].length}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Total Cost:</Text>
                        <Text style={styles.summaryValue}>
                          ${calculateBuildTotal(postComponents[post.id!])}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.postStats}>
                <Text style={styles.statsText}>
                  👍 {post.voteCount || 0} votes
                </Text>
                <Text style={styles.statsText}>
                  💬 {post.commentCount || 0} comments
                </Text>
              </View>
            </Card>
          ))}
        </View>
      )}

      <Modal
        visible={deleteModalVisible}
        onBackdropPress={() => setDeleteModalVisible(false)}
        backdropStyle={styles.backdrop}
      >
        <Card disabled style={styles.modalCard}>
          <Text category="h6" style={styles.modalTitle}>Delete Post</Text>
          <Text style={styles.modalText}>Are you sure you want to delete this post?</Text>
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
              onPress={handleDeletePost}
              style={styles.modalButton}
            >
              Delete
            </Button>
          </View>
        </Card>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#1a237e',
  },
  createButton: {
    marginTop: 20,
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
    borderRadius: 12,
  },
  postsContainer: {
    padding: 16,
    gap: 16,
  },
  postCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  postHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginRight: 8,
  },
  postDate: {
    fontSize: 12,
    color: '#666',
  },
  postContent: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  deleteButton: {
    minWidth: 32,
    minHeight: 32,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCard: {
    borderRadius: 12,
    padding: 16,
    minWidth: 300,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
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
  componentsSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  componentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  componentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  loadComponentsButton: {
    fontSize: 14,
    color: '#1976d2',
    textDecorationLine: 'underline',
  },
  componentsList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  componentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  componentInfo: {
    flex: 1,
  },
  componentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  componentType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  componentPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  buildSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#1976d2',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
});
