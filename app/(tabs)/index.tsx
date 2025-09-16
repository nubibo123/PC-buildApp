import { useAuth } from "@/lib/AuthContext";
import { addComment as addBuildComment, getAllBuilds, SavedBuild, toggleVote as toggleBuildVote } from '@/lib/buildService';
import { addComment as addPostComment, getAllPosts, getPostComments, Post, toggleVote as togglePostVote } from '@/lib/postService';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, Layout, Modal, Text } from '@ui-kitten/components';
import { Redirect } from "expo-router";
import { useEffect, useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
export default function HomeScreen() {
  const { user, isLoading } = useAuth();
  
  // Redirect to login if user is not authenticated
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }
  
  // Show loading if auth is still loading
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }
  
  const [builds, setBuilds] = useState<SavedBuild[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedBuild, setSelectedBuild] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const [postComponents, setPostComponents] = useState<{ [postId: string]: any[] }>({});
  const [loadingComponents, setLoadingComponents] = useState<{ [postId: string]: boolean }>({});
  const [expandedComponentsPost, setExpandedComponentsPost] = useState<string | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [detailComponents, setDetailComponents] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchBuilds = async () => {
    // Chỉ fetch khi user đã authenticated và có uid
    if (!user || !user.uid) {
      console.log('User not authenticated, skipping fetchBuilds');
      return;
    }
    
    try {
      const allBuilds = await getAllBuilds();
      setBuilds(allBuilds);
    } catch (error) {
      console.error('Error fetching all builds:', error);
    }
  };

  const fetchPosts = async () => {
    // Chỉ fetch khi user đã authenticated và có uid
    if (!user || !user.uid) {
      console.log('User not authenticated, skipping fetchPosts');
      return;
    }
    
    try {
      const allPosts = await getAllPosts();
      // Load comments for each post
      const postsWithComments = await Promise.all(allPosts.map(async (post) => {
        if (!post.id) return post;
        const comments = await getPostComments(post.id);
        return { ...post, comments };
      }));
      setPosts(postsWithComments);
    } catch (error) {
      console.error('Error fetching all posts:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        if (user && user.uid && !isLoading) {
          // Small delay to ensure Firebase auth is fully initialized
          await new Promise(resolve => setTimeout(resolve, 100));
          fetchBuilds();
          fetchPosts();
        }
      };
      
      loadData();
    }, [user, user?.uid, isLoading])
  );

  useEffect(() => {
    const initializeData = async () => {
      if (user && user.uid && !isLoading) {
        // Small delay to ensure Firebase auth is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        fetchBuilds();
        fetchPosts();
      }
    };
    
    initializeData();
  }, [user, user?.uid, isLoading]);

  const handleRefresh = async () => {
    if (!user || !user.uid) {
      console.log('User not authenticated, skipping refresh');
      return;
    }
    
    setRefreshing(true);
    await fetchBuilds();
    setRefreshing(false);
  };

  const handleAddComment = async (buildId: string) => {
    if (!comment.trim() || !user) return;
    try {
      await addBuildComment(buildId, user.uid, user.email || '', comment.trim());
      setComment('');
      await fetchBuilds();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleVote = async (buildId: string) => {
    if (!user) return;
    try {
      await toggleBuildVote(buildId, user.uid);
      await fetchBuilds();
    } catch (error) {
      console.error('Error toggling vote:', error);
    }
  };

  const handlePostVote = async (postId: string) => {
    if (!user) return;
    try {
      await togglePostVote(postId, user.uid);
      await fetchPosts();
    } catch (error) {
      console.error('Error toggling post vote:', error);
    }
  };

  const handleAddPostComment = async (postId: string) => {
    if (!comment.trim() || !user) return;
    try {
      const newComment = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.uid,
        userEmail: user.email || '',
        content: comment.trim(),
        createdAt: Date.now(),
      };
      await addPostComment(postId, user.uid, user.email || '', comment.trim());
      setComment('');
      // Update detailPost UI immediately
      setDetailPost(prev => prev && prev.id === postId ? {
        ...prev,
        comments: prev.comments ? [newComment, ...prev.comments] : [newComment],
        commentCount: (prev.commentCount || 0) + 1,
      } : prev);
      // Optionally update posts list as well
      setPosts(prevPosts => prevPosts.map(p => p.id === postId ? {
        ...p,
        comments: p.comments ? [newComment, ...p.comments] : [newComment],
        commentCount: (p.commentCount || 0) + 1,
      } : p));
    } catch (error) {
      console.error('Error adding post comment:', error);
    }
  };

  const fetchPostComponents = async (postId: string, config?: any) => {
    if (loadingComponents[postId] || postComponents[postId]) return;
    setLoadingComponents(prev => ({ ...prev, [postId]: true }));
    try {
      let components: any[] = [];
      // Remove typeof getPostComponents === 'function' check and fallback to config
      if (config) {
        components = Object.entries(config)
          .filter(
            ([, value]) =>
              value &&
              typeof value === 'object' &&
              'name' in value &&
              (value as { name?: string }).name
          )
          .map(([key, value]) => ({
            ...(typeof value === 'object' ? value : {}),
            type: key,
          }));
      }
      setPostComponents(prev => ({ ...prev, [postId]: components }));
    } catch (e) {
      setPostComponents(prev => ({ ...prev, [postId]: [] }));
    } finally {
      setLoadingComponents(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Hàm lấy components cho post chi tiết
  const fetchDetailComponents = async (post: Post) => {
    setDetailLoading(true);
    let components: any[] = [];
    const config = post.partList;
    if (config) {
      components = Object.entries(config)
        .filter(
          ([, value]) =>
            value &&
            typeof value === 'object' &&
            'name' in value &&
            (value as { name?: string }).name
        )
        .map(([key, value]) => ({
          ...(typeof value === 'object' ? value : {}),
          type: key,
        }));
    }
    setDetailComponents(components);
    setDetailLoading(false);
  };

  if (!user) {
    return <Redirect href="/login" />;
  }

  const renderComponentImage = (imageUrl: string) => (
    <Image
      source={{ uri: imageUrl }}
      style={styles.componentImage}
      resizeMode="contain"
    />
  );

  const renderPostItem = ({ item }: { item: Post }) => {
    const isExpanded = selectedPost === item.id;
    const hasVoted = item.votes?.[user?.uid || ''] || false;
    const defaultAvatar = require('../../assets/images/default-avatar.png');

    return (
      <Card style={styles.postCard}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={async () => {
            setDetailPost(item);
            setDetailComponents([]);
            await fetchDetailComponents(item);
          }}
        >
          <View>
            <View style={styles.buildHeader}>
              <View style={styles.userInfo}>
                <Image
                  source={item.userProfile?.photoURL ? { uri: item.userProfile.photoURL } : defaultAvatar}
                  style={styles.avatar}
                />
                <View style={styles.buildInfo}>
                  <Text category="h6">{item.userProfile?.displayName || item.userProfile?.email || 'Anonymous User'}</Text>
                  <Text category="s2">{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.voteButton, hasVoted && styles.votedButton]}
                onPress={() => handlePostVote(item.id!)}
              >
                <Ionicons name="arrow-up" size={24} color={hasVoted ? 'white' : 'black'} />
                <Text style={hasVoted ? styles.votedText : undefined}>{item.voteCount || 0}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.postContent}>
              <Text category="h6" style={styles.postTitle}>{item.title}</Text>
              <Text>{item.description}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.interactionButtons}>
          <TouchableOpacity
            style={styles.commentButton}
            disabled
          >
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.statsText}>{item.commentCount || 0} Comments</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderBuildItem = ({ item }: { item: SavedBuild }) => {
    const isExpanded = selectedBuild === item.id;
    const hasVoted = item.userVotes?.[user.uid] || false;
    const defaultAvatar = require('../../assets/images/default-avatar.png');

    return (
      <Card style={styles.buildCard}>
        <View style={styles.buildHeader}>
          <View style={styles.userInfo}>
            <Image
              source={item.userProfile?.photoURL ? { uri: item.userProfile.photoURL } : defaultAvatar}
              style={styles.avatar}
            />
            <View style={styles.buildInfo}>
              <Text category="h6">{item.userProfile?.displayName || item.userProfile?.email || 'Anonymous User'}</Text>
              <Text category="s1">Total: ${item.totalPrice.toFixed(2)}</Text>
              <Text category="s2">{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.voteButton, hasVoted && styles.votedButton]}
            onPress={() => handleVote(item.id)}
          >
            <Ionicons name="arrow-up" size={24} color={hasVoted ? 'white' : 'black'} />
            <Text style={hasVoted ? styles.votedText : undefined}>{item.votes || 0}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setSelectedBuild(isExpanded ? null : item.id)}
        >
          <Text category="s1">
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="black"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text category="h6" style={styles.sectionTitle}>Components:</Text>
            {item.config.cpu && (
              <View style={styles.componentItem}>
                <Text category="s1">CPU: {item.config.cpu.name}</Text>
                {renderComponentImage(item.config.cpu.link_image)}
                <Text>Price: ${item.config.cpu.price}</Text>
              </View>
            )}
            {item.config.motherboard && (
              <View style={styles.componentItem}>
                <Text category="s1">Motherboard: {item.config.motherboard.name}</Text>
                {renderComponentImage(item.config.motherboard.image_link)}
                <Text>Price: ${item.config.motherboard.price}</Text>
              </View>
            )}
            {item.config.memory && (
              <View style={styles.componentItem}>
                <Text category="s1">Memory: {item.config.memory.name}</Text>
                {renderComponentImage(item.config.memory.image_link)}
                <Text>Price: ${item.config.memory.price}</Text>
              </View>
            )}
            {item.config.videoCard && (
              <View style={styles.componentItem}>
                <Text category="s1">Video Card: {item.config.videoCard.name}</Text>
                {renderComponentImage(item.config.videoCard.image_link)}
                <Text>Price: ${item.config.videoCard.price}</Text>
              </View>
            )}

            {item.config.case && (
              <View style={styles.componentItem}>
                <Text category="s1">Case: {item.config.case.name}</Text>
                {renderComponentImage(item.config.case.image_link)}
                <Text>Price: ${item.config.case.price}</Text>
              </View>
            )}

            {item.config.powerSupply && (
              <View style={styles.componentItem}>
                <Text category="s1">Power Supply: {item.config.powerSupply.name}</Text>
                {renderComponentImage(item.config.powerSupply.image_link)}
                <Text>Price: ${item.config.powerSupply.price}</Text>
              </View>
            )}

            {item.config.internalHardDrive && (
              <View style={styles.componentItem}>
                <Text category="s1">Internal Hard Drive: {item.config.internalHardDrive.name}</Text>
                {renderComponentImage(item.config.internalHardDrive.image_link)}
                <Text>Price: ${item.config.internalHardDrive.price}</Text>
              </View>
            )}

            {item.config.monitor && (
              <View style={styles.componentItem}>
                <Text category="s1">Monitor: {item.config.monitor.name}</Text>
                {renderComponentImage(item.config.monitor.image_link)}
                <Text>Price: ${item.config.monitor.price}</Text>
              </View>
            )}

            <Text category="h6" style={styles.sectionTitle}>Comments:</Text>
            {item.comments && item.comments.length > 0 ? (
              item.comments.map((comment) => (
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
                onPress={() => handleAddComment(item.id)}
                disabled={!comment.trim()}
              >
                Post
              </Button>
            </View>
          </View>
        )}
      </Card>
    );
  };



  return (
    <Layout style={styles.container}>
      <Text category="h4" style={styles.title}>🏠 Home</Text>
      <Text style={styles.welcome}>Welcome {user.email}</Text>
      
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, !showPosts && styles.toggleButtonActive]}
          onPress={() => setShowPosts(false)}
        >
          <Text style={[styles.toggleButtonText, !showPosts && styles.toggleButtonTextActive]}>Builds</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, showPosts && styles.toggleButtonActive]}
          onPress={() => setShowPosts(true)}
        >
          <Text style={[styles.toggleButtonText, showPosts && styles.toggleButtonTextActive]}>Posts</Text>
        </TouchableOpacity>
      </View>

      {showPosts ? (
        <FlatList
          data={posts}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderPostItem}
          style={styles.buildList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      ) : (
        <FlatList
          data={builds}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderBuildItem}
          style={styles.buildList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Modal chi tiết bài đăng */}
      <Modal
        visible={!!detailPost}
        backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onBackdropPress={() => setDetailPost(null)}
      >
        <Card disabled style={{ minWidth: 340, borderRadius: 14, padding: 18 }}>
          {detailPost && (
            <ScrollView style={{ maxHeight: 500 }}>
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <Image
                  source={detailPost.userProfile?.photoURL ? { uri: detailPost.userProfile.photoURL } : require('../../assets/images/default-avatar.png')}
                  style={{ width: 60, height: 60, borderRadius: 30, marginBottom: 8 }}
                />
                <Text category="h6">{detailPost.userProfile?.displayName || detailPost.userProfile?.email || 'Anonymous User'}</Text>
                <Text appearance="hint">{new Date(detailPost.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text category="h5" style={{ textAlign: 'center', color: '#1976d2', marginBottom: 8 }}>{detailPost.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.voteButton, detailPost.votes?.[user?.uid || ''] && styles.votedButton, { marginRight: 8 }]}
                  onPress={async () => {
                    if (!user) return;
                    await handlePostVote(detailPost.id!);
                    // Update UI immediately
                    setDetailPost(prev => prev ? {
                      ...prev,
                      votes: {
                        ...prev.votes,
                        [user.uid]: !prev.votes?.[user.uid]
                      },
                      voteCount: prev.voteCount ? (prev.votes?.[user.uid] ? prev.voteCount - 1 : prev.voteCount + 1) : 1
                    } : prev);
                  }}
                >
                  <Ionicons name="arrow-up" size={24} color={detailPost.votes?.[user?.uid || ''] ? 'white' : 'black'} />
                  <Text style={detailPost.votes?.[user?.uid || ''] ? styles.votedText : undefined}>{detailPost.voteCount || 0}</Text>
                </TouchableOpacity>
                <Text style={{ color: '#666' }}>Vote up</Text>
              </View>
              <Text style={{ marginBottom: 16 }}>{detailPost.description}</Text>
              <Text style={{ fontWeight: 'bold', color: '#1976d2', marginBottom: 8 }}>Components</Text>
              {detailLoading ? (
                <Text>Loading components...</Text>
              ) : detailComponents.length === 0 ? (
                <Text style={{ color: '#888', fontStyle: 'italic' }}>No components found.</Text>
              ) : (
                <View style={{ backgroundColor: '#f8f9fa', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  {detailComponents.map((comp, idx) => (
                    <View key={comp.id || idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, minHeight: 48 }}>
                      <Image
                        source={comp.image_link || comp.link_image ? { uri: comp.image_link || comp.link_image } : require('../../assets/images/default-avatar.png')}
                        style={{ width: 48, height: 48, borderRadius: 8, marginRight: 10, backgroundColor: '#eee' }}
                        resizeMode="contain"
                      />
                      <View style={{ flex: 1, minWidth: 0, maxWidth: '60%' }}>
                        <Text
                          style={{ fontWeight: 'bold', color: '#1976d2', maxWidth: '100%', minWidth: 0, flexShrink: 1 }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {comp.type?.toUpperCase() || ''}
                        </Text>
                        <Text
                          numberOfLines={2}
                          ellipsizeMode="tail"
                          style={{ fontSize: 15, maxWidth: '100%', minWidth: 0, flexShrink: 1 }}
                        >
                          {comp.name}
                        </Text>
                      </View>
                      <Text style={{ color: '#4CAF50', fontWeight: 'bold', marginLeft: 8 }} numberOfLines={1} ellipsizeMode="tail">${comp.price}</Text>
                    </View>
                  ))}
                  <View style={{ borderTopWidth: 1, borderTopColor: '#eee', marginTop: 8, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: 'bold' }}>Total:</Text>
                    <Text style={{ fontWeight: 'bold', color: '#1976d2' }}>
                      ${detailComponents.reduce((sum, c) => sum + (c.price || 0), 0)}
                    </Text>
                  </View>
                </View>
              )}
              {/* Comments section for post detail */}
              <Text category="h6" style={{ marginTop: 16, marginBottom: 8, fontWeight: 'bold' }}>Comments:</Text>
              {detailPost.comments && detailPost.comments.length > 0 ? (
                detailPost.comments.map((comment) => (
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
                  onPress={() => handleAddPostComment(detailPost.id!)}
                  disabled={!comment.trim()}
                >
                  Post
                </Button>
              </View>
              <Text style={{ color: '#666', marginTop: 8 }}>
                👍 {detailPost.voteCount || 0} votes | 💬 {detailPost.commentCount || 0} comments
              </Text>
              <TouchableOpacity
                style={{ marginTop: 18, alignSelf: 'center', backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 }}
                onPress={() => setDetailPost(null)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Card>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    paddingTop: 50,
    backgroundColor: '#f4f6fb',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1976d2',
    letterSpacing: 0.2,
    marginTop: 12,
  },
  welcome: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#607d8b',
    fontSize: 15,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e3eafc',
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: '#1976d2',
  },
  toggleButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 15,
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  buildList: {
    flex: 1,
    paddingHorizontal: 8,
  },
  buildCard: {
    marginBottom: 18,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e3e3e3',
  },
  postCard: {
    marginBottom: 18,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  buildHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buildInfo: {
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  postContent: {
    marginVertical: 12,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  interactionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 20,
    marginRight: 12,
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
    padding: 8,
  },
  statsText: {
    marginLeft: 4,
    color: '#666',
  },
  commentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentsTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: 'bold',
  },
  commentItem: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    marginVertical: 4,
    borderRadius: 8,
  },
  commentInput: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
  sectionTitle: {
    marginVertical: 8,
    fontWeight: 'bold',
    color: '#1976d2',
    fontSize: 16,
  },
  componentItem: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  componentImage: {
    width: '100%',
    height: 200,
    marginVertical: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 8,
  },
  expandedContent: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
});

