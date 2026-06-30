import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

interface Props {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export function Skeleton({ width = '100%', height = 16, style, borderRadius = 6 }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: '#333', opacity },
        style,
      ]}
    />
  );
}

export function MatchCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Skeleton width={60} height={12} />
        <Skeleton width={80} height={12} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={120} height={14} style={{ marginLeft: 10 }} />
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={100} height={14} style={{ marginLeft: 10 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#222',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#333',
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardBody: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
