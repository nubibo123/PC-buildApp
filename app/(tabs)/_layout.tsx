// app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          height: 60
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pcparts"
        options={{
          title: 'PC Parts',
          tabBarIcon: ({ color, size }) => <Ionicons name="hardware-chip" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="build"
        options={{
          title: 'Build',
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="savedBuilds"
        options={{
          title: 'Saved Builds',
          tabBarIcon: ({ color, size }) => <Ionicons name="save" size={size} color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="myPost"
        options={{
          title: 'My Post',
          tabBarIcon: ({ color, size }) => <Ionicons name="save" size={size} color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
