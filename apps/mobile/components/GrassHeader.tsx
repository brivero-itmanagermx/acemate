import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  height?: number;
  children?: ReactNode;
}

// Court lines rendered as thin Views overlaid on the grass background
function CourtLines() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Baseline */}
      <View style={[styles.line, styles.baseline]} />
      {/* Service line */}
      <View style={[styles.line, styles.serviceLine]} />
      {/* Center service line */}
      <View style={[styles.line, styles.centerLine]} />
    </View>
  );
}

export default function GrassHeader({ height = 180, children }: Props) {
  const insets = useSafeAreaInsets();
  const totalHeight = height + insets.top;

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      {/* Grass base with alternating stripe overlay */}
      <View style={[StyleSheet.absoluteFill, styles.grassBase]} />
      <View style={StyleSheet.absoluteFill}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${i * 12.5}%`,
              width: '6.25%',
              backgroundColor: 'rgba(0,0,0,0.10)',
            }}
          />
        ))}
      </View>

      <CourtLines />

      {/* Bottom fade overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']}
        style={[StyleSheet.absoluteFill, { top: '30%' }]}
        pointerEvents="none"
      />

      {/* Content at bottom */}
      <View style={[styles.content, { paddingBottom: 16, paddingTop: insets.top + 8 }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  grassBase: {
    backgroundColor: '#4a8c3f',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  line: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  baseline: {
    left: 16,
    right: 16,
    height: 1.5,
    bottom: 20,
  },
  serviceLine: {
    left: 16,
    right: 16,
    height: 1,
    bottom: 60,
  },
  centerLine: {
    width: 1,
    top: '40%',
    bottom: 20,
    left: '50%',
  },
});
