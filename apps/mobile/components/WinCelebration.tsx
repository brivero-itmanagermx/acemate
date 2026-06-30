import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 20;

const EMOJIS = ['🎾', '🏆', '✨', '⭐', '🎉'];
const COLORS = ['#C5F135', '#FF7F2D', '#FFFFFF', '#EEFF88', '#FFB380'];

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
  emoji: string;
  color: string;
  initialX: number;
}

interface Props {
  visible: boolean;
  onDone?: () => void;
}

export default function WinCelebration({ visible, onDone }: Props) {
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
      emoji: EMOJIS[i % EMOJIS.length],
      color: COLORS[i % COLORS.length],
      initialX: (i / PARTICLE_COUNT) * width,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    const animations = particles.map(p => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(1);
      p.rotate.setValue(0);

      const dx = (Math.random() - 0.5) * 200;
      const dy = -(100 + Math.random() * 300);

      return Animated.parallel([
        Animated.timing(p.x, { toValue: dx, duration: 1200, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(p.y, { toValue: dy, duration: 800, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: dy + 200, duration: 400, useNativeDriver: true }),
        ]),
        Animated.timing(p.opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        Animated.timing(p.rotate, { toValue: 360 * 2, duration: 1200, useNativeDriver: true }),
      ]);
    });

    Animated.stagger(40, animations).start(() => onDone?.());
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => {
        const rotate = p.rotate.interpolate({
          inputRange: [0, 720],
          outputRange: ['0deg', '720deg'],
        });
        return (
          <Animated.Text
            key={i}
            style={[
              styles.particle,
              {
                left: p.initialX,
                top: height * 0.5,
                opacity: p.opacity,
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { rotate },
                ],
              },
            ]}
          >
            {p.emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    fontSize: 24,
  },
});
