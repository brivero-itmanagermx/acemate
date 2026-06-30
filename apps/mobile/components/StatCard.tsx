import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

interface Props {
  value: string | number;
  label: string;
  accent?: boolean;
}

export default function StatCard({ value, label, accent = true }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: accent ? colors.aceGreen : colors.textPrimary }]}>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 88,
    flex: 1,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
