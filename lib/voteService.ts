import { get, ref, runTransaction } from 'firebase/database';
import { database } from './firebase';

export const votePost = async (postId: string, userId: string, value: 1 | -1) => {
  const postRef = ref(database, `posts/${postId}`);
  
  await runTransaction(postRef, (post) => {
    if (post === null) return post;

    if (!post.votes) {
      post.votes = {};
    }
    
    if (!post.voteCount) {
      post.voteCount = 0;
    }

    // Remove previous vote if it exists
    if (post.votes[userId]) {
      post.voteCount -= post.votes[userId];
    }

    // Add new vote
    post.votes[userId] = value;
    post.voteCount += value;

    return post;
  });
};

export const getUserVote = async (postId: string, userId: string): Promise<number> => {
  const voteRef = ref(database, `posts/${postId}/votes/${userId}`);
  const snapshot = await get(voteRef);
  return snapshot.val() || 0;
};
