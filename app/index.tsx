import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/AuthContext';

export default function Index() {
  const { user, isLoading } = useAuth();
  
  // Hiển thị loading khi đang kiểm tra auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }
  
  // Nếu đã đăng nhập, redirect đến tabs
  if (user) {
    return <Redirect href="/(tabs)" />;
  }
  
  // Nếu chưa đăng nhập, redirect đến login
  return <Redirect href="/(auth)/login" />;
}
