import { equalTo, get, orderByChild, query, ref } from 'firebase/database';
import { BuildConfiguration } from '../app/(tabs)/build';
import { database } from './firebase';

export interface SavedBuild {
  id: string;
  title: string;
  description: string;
  buildConfig: BuildConfiguration;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export const fetchUserBuilds = async (userId: string): Promise<SavedBuild[]> => {
  const buildsRef = ref(database, 'builds');
  const userBuildsQuery = query(buildsRef, orderByChild('userId'), equalTo(userId));
  const snapshot = await get(userBuildsQuery);

  const builds: SavedBuild[] = [];
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      builds.push({
        id: child.key!,
        ...child.val()
      });
    });
  }

  // Sort by most recent first
  return builds.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const fetchBuildById = async (buildId: string): Promise<SavedBuild | null> => {
  const buildRef = ref(database, `builds/${buildId}`);
  const snapshot = await get(buildRef);

  if (snapshot.exists()) {
    return {
      id: snapshot.key!,
      ...snapshot.val()
    };
  }

  return null;
};

export const fetchBuildsByIds = async (buildIds: string[]): Promise<SavedBuild[]> => {
  const builds = await Promise.all(
    buildIds.map(id => fetchBuildById(id))
  );

  // Filter out any null values and sort by most recent
  return builds
    .filter((build): build is SavedBuild => build !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
};
