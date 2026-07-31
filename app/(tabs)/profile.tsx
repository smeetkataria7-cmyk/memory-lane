import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { useTheme } from '../../src/theme/useTheme';

export default function ProfileScreen() {
  const t = useTheme();
  return (
    <Screen title="Profile">
      <View style={styles.center}>
        <Text style={{ color: t.inkMuted }}>Streak, plant, and settings will live here.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
