import { equalTo, get, orderByChild, push, query, ref, remove, set } from 'firebase/database';
import { BuildConfiguration } from '../app/(tabs)/build';
import { database } from '../lib/firebase';

export interface Post {
  id?: string;
  title: string;
  description: string;
  userId: string;
  partList: BuildConfiguration;
  createdAt: string;
}

export const createPost = async (post: Omit<Post, 'id'>) => {
  const postsRef = ref(database, 'posts');
  const newPostRef = push(postsRef);
  await set(newPostRef, post);
  return { ...post, id: newPostRef.key };
};

export const updatePost = async (postId: string, post: Partial<Post>) => {
  const postRef = ref(database, `posts/${postId}`);
  await set(postRef, post);
  return { ...post, id: postId };
};

export const deletePost = async (postId: string) => {
  const postRef = ref(database, `posts/${postId}`);
  await remove(postRef);
};

export const getPostsByUserId = async (userId: string): Promise<Post[]> => {
  const postsRef = ref(database, 'posts');
  const userPostsQuery = query(postsRef, orderByChild('userId'), equalTo(userId));
  const snapshot = await get(userPostsQuery);
  
  if (!snapshot.exists()) {
    return [];
  }

  const posts: Post[] = [];
  snapshot.forEach((childSnapshot) => {
    posts.push({
      id: childSnapshot.key,
      ...childSnapshot.val()
    });
  });

  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getAllPosts = async (): Promise<Post[]> => {
  const postsRef = ref(database, 'posts');
  const snapshot = await get(postsRef);
  
  if (!snapshot.exists()) {
    return [];
  }

  const posts: Post[] = [];
  snapshot.forEach((childSnapshot) => {
    posts.push({
      id: childSnapshot.key,
      ...childSnapshot.val()
    });
  });

  return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};