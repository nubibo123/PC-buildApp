import { equalTo, get, orderByChild, push, query, ref, set, update } from 'firebase/database';
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
    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);
    const userProfile = userSnapshot.val();
    
    // Sanitize the build configuration
    const sanitizedConfig = sanitizeBuildConfig(buildConfig);
    const totalPrice = Object.values(sanitizedConfig)
      .filter(part => part !== null)
      .reduce((sum, part) => sum + (part?.price || 0), 0);

    await push(buildsRef, {
      userId,
      userProfile,
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
      .reduce((sum, part) => sum + (part?.price || 0), 0);
    
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

    const builds: SavedBuild[] = [];
    for (const [key, value] of Object.entries<any>(snapshot.val())) {
      const userProfile = await getUserProfile(value.userId);
      builds.push({
        id: key,
        ...value,
        userProfile,
        comments: value.comments || [],
        userVotes: value.userVotes || {},
        votes: value.votes || 0
      });
    }

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
    // Check if user is authenticated
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }
    
    const buildsRef = ref(database, 'builds');
    const snapshot = await get(buildsRef);

    if (!snapshot.exists()) return [];

    const builds: SavedBuild[] = [];
    for (const [key, value] of Object.entries<any>(snapshot.val())) {
      const userProfile = await getUserProfile(value.userId);
      builds.push({
        id: key,
        ...value,
        userProfile,
        comments: value.comments || [],
        userVotes: value.userVotes || {},
        votes: value.votes || 0
      });
    }

    return builds.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting all builds:', error);
    throw error;
  }
};

