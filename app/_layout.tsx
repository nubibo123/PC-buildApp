import * as eva from "@eva-design/eva";
import { ApplicationProvider } from "@ui-kitten/components";
import { Stack } from "expo-router";
import { AuthProvider } from "../lib/AuthContext";

export default function RootLayout() {
  return (
    <ApplicationProvider {...eva} theme={eva.light}>
      <AuthProvider>
        <Stack screenOptions={{headerShown:false}} />
      </AuthProvider>
    </ApplicationProvider>
  );
}
