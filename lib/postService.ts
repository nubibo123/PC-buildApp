import { get, push, ref, remove, set, update } from 'firebase/database';
import { BuildConfiguration } from '../app/(tabs)/build';
import { database } from './firebase';

import { UserProfile } from './buildService';

interface Comment {
  id: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: number;
}

export interface Post {
  id?: string;
  title: string;
  description: string;
  partList: BuildConfiguration;
  userId: string;
  createdAt: number;
  updatedAt: number;
  user?: {
    photoURL?: string;
    displayName?: string;
  };
  userProfile?: UserProfile;
  votes?: { [userId: string]: boolean };
  voteCount?: number;
  commentCount?: number;
  comments?: Comment[];
}

export const createPost = async (userId: string, buildConfig: BuildConfiguration, title: string, description: string, userProfile: UserProfile) => {
  const post: Omit<Post, 'id' | 'createdAt' | 'updatedAt'> = {
    title,
    description,
    partList: buildConfig,
    userId,
    userProfile,
    votes: {},
    voteCount: 0,
    commentCount: 0
  };
  const postsRef = ref(database, 'posts');
  const newPostRef = push(postsRef);
  const timestamp = Date.now();

  await set(newPostRef, {
    ...post,
    userId,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return newPostRef.key;
};

export const getUserPosts = async (userId: string): Promise<Post[]> => {
  const postsRef = ref(database, 'posts');
  const snapshot = await get(postsRef);
  const posts: Post[] = [];

  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const post = child.val();
      if (post.userId === userId) {
        posts.push({
          id: child.key,
          ...post
        });
      }
    });
  }

  // Sort by most recent first
  return posts.sort((a, b) => b.createdAt - a.createdAt);
};

export const deletePost = async (postId: string) => {
  const postRef = ref(database, `posts/${postId}`);
  await remove(postRef);

  // Also delete all comments for this post
  const commentsRef = ref(database, `comments/${postId}`);
  await remove(commentsRef);
};

export const updatePost = async (postId: string, updates: Partial<Post>) => {
  const postRef = ref(database, `posts/${postId}`);
  await update(postRef, {
    ...updates,
    updatedAt: Date.now()
  });
};

export const getPostsByUserId = async (userId: string): Promise<Post[]> => {
  const postsRef = ref(database, 'posts');
  const snapshot = await get(postsRef);
  const posts: Post[] = [];

  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      const post = childSnapshot.val();
      if (post.userId === userId) {
        posts.push({
          id: childSnapshot.key,
          ...post
        });
      }
    });
  }

  return posts.sort((a, b) => b.createdAt - a.createdAt);
};

export const getAllPosts = async (): Promise<Post[]> => {
  const postsRef = ref(database, 'posts');
  const snapshot = await get(postsRef);
  const posts: Post[] = [];

  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      posts.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
  }

  return posts.sort((a, b) => b.createdAt - a.createdAt);
};

export const toggleVote = async (postId: string, userId: string) => {
  const postRef = ref(database, `posts/${postId}`);
  const snapshot = await get(postRef);
  if (!snapshot.exists()) return;

  const post = snapshot.val();
  const votes = post.votes || {};
  const hasVoted = votes[userId];

  if (hasVoted) {
    delete votes[userId];
  } else {
    votes[userId] = true;
  }

  const voteCount = Object.keys(votes).length;

  await update(postRef, {
    votes,
    voteCount,
    updatedAt: Date.now()
  });
};

export const addComment = async (postId: string, userId: string, userEmail: string, content: string) => {
  const commentsRef = ref(database, `comments/${postId}`);
  const postRef = ref(database, `posts/${postId}`);
  
  // Add comment
  const newCommentRef = push(commentsRef);
  const timestamp = Date.now();
  
  const comment: Comment = {
    id: newCommentRef.key!,
    userId,
    userEmail,
    content,
    createdAt: timestamp
  };
  
  await set(newCommentRef, comment);
  
  // Update post's comment count
  const postSnapshot = await get(postRef);
  if (postSnapshot.exists()) {
    const post = postSnapshot.val();
    await update(postRef, {
      commentCount: (post.commentCount || 0) + 1,
      updatedAt: timestamp
    });
  }
  
  return comment;
};

export const getPostComments = async (postId: string): Promise<Comment[]> => {
  const commentsRef = ref(database, `comments/${postId}`);
  const snapshot = await get(commentsRef);
  const comments: Comment[] = [];

  if (snapshot.exists()) {
    snapshot.forEach((childSnapshot) => {
      comments.push({
        id: childSnapshot.key!,
        ...childSnapshot.val()
      });
    });
  }

  return comments.sort((a, b) => b.createdAt - a.createdAt);
};