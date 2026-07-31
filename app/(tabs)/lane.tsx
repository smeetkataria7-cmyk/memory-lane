import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { useTheme } from '../../src/theme/useTheme';

export default function LaneScreen() {
  const t = useTheme();
  return (
    <Screen title="Lane">
      <View style={styles.center}>
        <Text style={{ color: t.inkMuted }}>Your days will line up here.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
