import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { useTheme } from '../../src/theme/useTheme';

export default function BoardScreen() {
  const t = useTheme();
  return (
    <Screen title="Board">
      <View style={styles.center}>
        <Text style={{ color: t.inkMuted }}>Your friends' colors will appear here.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
