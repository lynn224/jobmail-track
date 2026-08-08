import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useData } from "@/src/context/DataContext";
import { colors } from "@/src/theme";

// Gate screen: waits for storage check, then routes to Setup or the app.
export default function Index() {
  const { ready, connected } = useData();

  useEffect(() => {
    if (!ready) return;
    if (connected) router.replace("/(tabs)");
    else router.replace("/setup");
  }, [ready, connected]);

  return (
    <View style={styles.container} testID="splash-gate">
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
});
