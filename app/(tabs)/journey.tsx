import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { useTheme } from '../../src/theme/useTheme';

export default function JourneyScreen() {
  const t = useTheme();
  return (
    <Screen title="Journey">
      <View style={styles.center}>
        <Text style={{ color: t.inkMuted }}>The big days will live here.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
