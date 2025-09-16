import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import React, { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { auth } from "./firebase";

const USER_STORAGE_KEY = '@user_auth_state';

const AuthContext = createContext<{ 
  user: User | null; 
  logout: () => Promise<void>;
  isLoading: boolean;
}>({ 
  user: null,
  logout: async () => {},
  isLoading: true
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadStoredUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (storedUser && isMounted) {
          // Chỉ set từ AsyncStorage để hiển thị tạm, Firebase sẽ override sau
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading stored user:', error);
      }
    };

    // Load stored user first for better UX
    loadStoredUser();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!isMounted) return;
      
      // Firebase auth state is source of truth
      setUser(u);
      setIsLoading(false);
      
      try {
        if (u) {
          // Lưu thông tin user vào AsyncStorage
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u));
        } else {
          // Xóa thông tin user khỏi AsyncStorage khi đăng xuất
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Error saving user state:', error);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  }
});
