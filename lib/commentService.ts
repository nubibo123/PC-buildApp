import { get, push, ref, runTransaction, set } from 'firebase/database';
import { UserProfile } from './buildService';
import { database } from './firebase';

export interface Comment {
  id?: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: number;
  userProfile?: UserProfile;
}

export const createComment = async (postId: string, userId: string, content: string, userProfile: UserProfile) => {
  // Create the comment
  const commentsRef = ref(database, `comments/${postId}`);
  const newCommentRef = push(commentsRef);
  const timestamp = Date.now();

  const comment: Comment = {
    postId,
    userId,
    content,
    createdAt: timestamp,
    userProfile
  };

  // Update comment count in post
  const postRef = ref(database, `posts/${postId}`);
  
  await Promise.all([
    // Save the comment
    set(newCommentRef, comment),
    
    // Update post comment count
    runTransaction(postRef, (post) => {
      if (post === null) return post;
      if (!post.commentCount) {
        post.commentCount = 0;
      }
      post.commentCount++;
      return post;
    })
  ]);

  return newCommentRef.key;
};

export const getComments = async (postId: string): Promise<Comment[]> => {
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

  // Sort comments by creation time
  return comments.sort((a, b) => b.createdAt - a.createdAt);
};
