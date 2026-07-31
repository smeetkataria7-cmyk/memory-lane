import { StyleSheet, Text, View } from 'react-native';
import { Orb } from '../../src/components/Orb';
import { Screen } from '../../src/components/Screen';
import { spacing } from '../../src/theme/tokens';
import { useTheme } from '../../src/theme/useTheme';

export default function TodayScreen() {
  const t = useTheme();
  return (
    <Screen title="Today">
      <View style={styles.center}>
        <Orb
          size={220}
          fills={[
            { emotion: 'joy', weight: 55 },
            { emotion: 'sadness', weight: 25 },
            { emotion: 'anxiety', weight: 20 },
          ]}
        />
        <Text style={[styles.hint, { color: t.inkMuted }]}>
          This day's magic is still asleep. Fill your orb to wake it up.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  hint: { fontSize: 15, textAlign: 'center', maxWidth: 260 },
});
