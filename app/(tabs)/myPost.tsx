import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, Modal, Text } from '@ui-kitten/components';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../lib/AuthContext';
import { addComment, deletePost, getUserPosts, Post, toggleVote } from '../../lib/postService';

export default function MyPostsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [selectedPost, setSelectedPost] = useState<string | null>(null);

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

  const handleVote = async (postId: string) => {
    if (!user) return;
    try {
      await toggleVote(postId, user.uid);
      await loadPosts(); // Reload posts to get updated vote count
    } catch (error) {
      console.error('Error toggling vote:', error);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!comment.trim() || !user) return;
    try {
      await addComment(postId, user.uid, user.email || '', comment.trim());
      setComment('');
      await loadPosts(); // Reload posts to get updated comments
    } catch (error) {
      console.error('Error adding comment:', error);
    }
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
              <View style={styles.postStats}>
                <TouchableOpacity
                  style={[styles.voteButton, post.votes?.[user?.uid || ''] && styles.votedButton]}
                  onPress={() => handleVote(post.id!)}
                >
                  <Ionicons name="arrow-up" size={24} color={post.votes?.[user?.uid || ''] ? 'white' : 'black'} />
                  <Text style={post.votes?.[user?.uid || ''] ? styles.votedText : undefined}>{post.voteCount || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.commentButton}
                  onPress={() => setSelectedPost(selectedPost === post.id ? null : post.id || null)}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#666" />
                  <Text style={styles.statsText}>{post.commentCount || 0}</Text>
                </TouchableOpacity>
              </View>

              {selectedPost === post.id && (
                <View style={styles.commentsSection}>
                  <Text category="h6" style={styles.commentsTitle}>Comments:</Text>
                  {post.comments && post.comments.length > 0 ? (
                    post.comments.map((comment) => (
                      <View key={comment.id} style={styles.commentItem}>
                        <Text category="s2">{comment.userEmail}</Text>
                        <Text>{comment.content}</Text>
                        <Text category="c1">
                          {new Date(comment.createdAt).toLocaleString()}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text>No comments yet</Text>
                  )}

                  <View style={styles.commentInput}>
                    <Input
                      placeholder="Add a comment..."
                      value={comment}
                      onChangeText={setComment}
                      style={styles.input}
                    />
                    <Button
                      size="small"
                      onPress={() => handleAddComment(post.id!)}
                      disabled={!comment.trim()}
                    >
                      Post
                    </Button>
                  </View>
                </View>
              )}
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
    paddingTop: 50,
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
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 20,
    marginRight: 12,
    gap: 4,
  },
  votedButton: {
    backgroundColor: '#1976d2',
  },
  votedText: {
    color: 'white',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentsTitle: {
    marginBottom: 12,
  },
  commentItem: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    marginVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  commentInput: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
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
});
