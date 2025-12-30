import { endAt, equalTo, get, limitToLast, orderByChild, orderByKey, push, query, ref, set, update } from 'firebase/database';
import { BuildConfiguration } from '../app/(tabs)/build';
import { auth, database } from './firebase';

export interface UserProfile {
  displayName: string;
  photoURL: string;
  email: string;
}

export interface SavedBuild {
  id: string;
  userId: string;
  userProfile?: UserProfile;
  config: BuildConfiguration;
  totalPrice: number;
  createdAt: number;
  votes: number;
  userVotes: { [key: string]: boolean };
  comments: Comment[];
}

export interface Comment {
  id: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: number;
}

const sanitizeBuildConfig = (buildConfig: BuildConfiguration): BuildConfiguration => {
  return {
    cpu: buildConfig.cpu || null,
    memory: buildConfig.memory || null,
    motherboard: buildConfig.motherboard || null,
    videoCard: buildConfig.videoCard || null,
    case: buildConfig.case || null,
    powerSupply: buildConfig.powerSupply || null,
    internalHardDrive: buildConfig.internalHardDrive || null,
    monitor: buildConfig.monitor || null
  };
};

import { checkSocketCompatibility } from './socketUtils';

export const saveBuild = async (userId: string, buildConfig: BuildConfiguration, userProfile: UserProfile): Promise<void> => {
  try {
    // Check socket compatibility before saving
    if (!checkSocketCompatibility(buildConfig.cpu, buildConfig.motherboard)) {
      throw new Error('CPU and motherboard sockets are not compatible');
    }

    const buildsRef = ref(database, 'builds');
    // Prefer the provided userProfile to avoid an extra round-trip; fall back to DB if missing
    let effectiveUserProfile: UserProfile | null = userProfile || null;
    if (!effectiveUserProfile) {
      const userRef = ref(database, `users/${userId}`);
      const userSnapshot = await get(userRef);
      effectiveUserProfile = (userSnapshot.val() as UserProfile) || null;
    }
    
    // Sanitize the build configuration
    const sanitizedConfig = sanitizeBuildConfig(buildConfig);
    const totalPrice = Object.values(sanitizedConfig)
      .filter(part => part !== null)
      .reduce((sum, part) => {
        const n = typeof (part as any)?.price === 'number' ? (part as any).price : Number((part as any)?.price) || 0;
        return sum + n;
      }, 0);

    await push(buildsRef, {
      userId,
      userProfile: effectiveUserProfile,
      config: sanitizedConfig,
      totalPrice,
      createdAt: Date.now(),
      votes: 0,
      userVotes: {},
      comments: []
    });
  } catch (error) {
    console.error('Error saving build:', error);
    throw error;
  }
};

export const updateBuild = async (buildId: string, userId: string, buildConfig: BuildConfiguration): Promise<void> => {
  try {
    // Check socket compatibility before updating
    if (!checkSocketCompatibility(buildConfig.cpu, buildConfig.motherboard)) {
      throw new Error('CPU and motherboard sockets are not compatible');
    }

    const buildRef = ref(database, `builds/${buildId}`);
    const snapshot = await get(buildRef);
    const build = snapshot.val();

    if (!build) throw new Error('Build not found');
    if (build.userId !== userId) throw new Error('Unauthorized to update this build');

    // Sanitize the build configuration
    const sanitizedConfig = sanitizeBuildConfig(buildConfig);
    const totalPrice = Object.values(sanitizedConfig)
      .filter(part => part !== null)
      .reduce((sum, part) => {
        const n = typeof (part as any)?.price === 'number' ? (part as any).price : Number((part as any)?.price) || 0;
        return sum + n;
      }, 0);
    
    await update(buildRef, {
      config: sanitizedConfig,
      totalPrice,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error updating build:', error);
    throw error;
  }
};

export const addComment = async (buildId: string, userId: string, userEmail: string, content: string): Promise<void> => {
  try {
    const buildRef = ref(database, `builds/${buildId}`);
    const snapshot = await get(buildRef);
    const build = snapshot.val();
    
    if (!build) throw new Error('Build not found');
    
    const comments = build.comments || [];
    comments.push({
      id: Date.now().toString(),
      userId,
      userEmail,
      content,
      createdAt: Date.now()
    });
    
    await update(buildRef, { comments });
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const toggleVote = async (buildId: string, userId: string): Promise<void> => {
  try {
    const buildRef = ref(database, `builds/${buildId}`);
    const snapshot = await get(buildRef);
    const build = snapshot.val();
    
    if (!build) throw new Error('Build not found');
    
    const userVotes = build.userVotes || {};
    const currentVote = userVotes[userId];
    
    const updates: any = {};
    updates[`userVotes/${userId}`] = !currentVote;
    updates.votes = (build.votes || 0) + (currentVote ? -1 : 1);
    
    await update(ref(database, `builds/${buildId}`), updates);
  } catch (error) {
    console.error('Error toggling vote:', error);
    throw error;
  }
};

const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    return snapshot.val();
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const getUserBuilds = async (userId: string): Promise<SavedBuild[]> => {
  try {
    const buildsRef = ref(database, 'builds');
    const userBuildsQuery = query(buildsRef, orderByChild('userId'), equalTo(userId));
    const snapshot = await get(userBuildsQuery);

    if (!snapshot.exists()) return [];

    const entries = Object.entries<any>(snapshot.val());
    const builds = await Promise.all(entries.map(async ([key, value]) => {
      const profile: UserProfile | null = value.userProfile || (await getUserProfile(value.userId));
      const mapped: SavedBuild = {
        id: key,
        ...value,
        userProfile: profile || undefined,
        comments: value.comments || [],
        userVotes: value.userVotes || {},
        votes: value.votes || 0
      };
      return mapped;
    }));

    return builds.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting user builds:', error);
    throw error;
  }
};

export const deleteBuild = async (buildId: string, userId: string): Promise<void> => {
  try {
    const buildRef = ref(database, `builds/${buildId}`);
    const snapshot = await get(buildRef);
    const build = snapshot.val();

    if (!build) throw new Error('Build not found');
    if (build.userId !== userId) throw new Error('Unauthorized to delete this build');

    await set(buildRef, null);
  } catch (error) {
    console.error('Error deleting build:', error);
    throw error;
  }
};

export const getAllBuilds = async (): Promise<SavedBuild[]> => {
  try {
    // If not authenticated, return empty list to avoid noisy errors during auth init
    if (!auth.currentUser) {
      return [];
    }
    
  const buildsRef = ref(database, 'builds');
  const snapshot = await get(buildsRef);

    if (!snapshot.exists()) return [];

    const entries = Object.entries<any>(snapshot.val());
    const builds = await Promise.all(entries.map(async ([key, value]) => {
      const profile: UserProfile | null = value.userProfile || (await getUserProfile(value.userId));
      const mapped: SavedBuild = {
        id: key,
        ...value,
        userProfile: profile || undefined,
        comments: value.comments || [],
        userVotes: value.userVotes || {},
        votes: value.votes || 0
      };
      return mapped;
    }));

    return builds.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting all builds:', error);
    throw error;
  }
};

// Efficient, paginated fetch of builds ordered by createdAt descending.
export const getBuildsPage = async (
  limitCount: number,
  cursorKey?: string
): Promise<{ builds: SavedBuild[]; nextCursor?: string; hasMore: boolean }> => {
  try {
    if (!auth.currentUser) {
      return { builds: [], hasMore: false };
    }

    // Use orderByKey to avoid requiring an index in RTDB rules. Firebase push keys are time-ordered.
    let q = query(ref(database, 'builds'), orderByKey(), limitToLast(limitCount));
    if (cursorKey) {
      // Fetch older items lexicographically (chronologically) before the cursor key
      q = query(ref(database, 'builds'), orderByKey(), endAt(cursorKey), limitToLast(limitCount));
    }

    const snapshot = await get(q);
    if (!snapshot.exists()) return { builds: [], hasMore: false };

    const entries = Object.entries<any>(snapshot.val());
    // Resolve user profiles in parallel, prefer embedded profile
    const mapped = await Promise.all(entries.map(async ([key, value]) => {
      const profile: UserProfile | null = value.userProfile || (await getUserProfile(value.userId));
      const build: SavedBuild = {
        id: key,
        ...value,
        userProfile: profile || undefined,
        comments: value.comments || [],
        userVotes: value.userVotes || {},
        votes: value.votes || 0,
      };
      return build;
    }));

    // Snapshot with orderByKey + limitToLast returns ascending by key; reverse for newest first
    const sorted = mapped.sort((a, b) => b.createdAt - a.createdAt);
    // Determine the oldest key in this page for the next cursor
    const keysAsc = Object.keys(snapshot.val()).sort();
    const nextCursor = keysAsc.length ? keysAsc[0] : undefined;
    const hasMore = sorted.length === limitCount && typeof nextCursor === 'string' && nextCursor.length > 0;
    return { builds: sorted, nextCursor, hasMore };
  } catch (error) {
    console.error('Error getting builds page:', error);
    throw error;
  }
};

