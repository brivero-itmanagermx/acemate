import { Image, Text, View } from 'react-native';
import { colors } from '@/theme';

interface Props {
  name?: string | null;
  avatarUrl?: string | null;
  isWinner?: boolean;
  size?: number;
}

function initials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function Avatar({ name, avatarUrl, isWinner = false, size = 40 }: Props) {
  const bg = isWinner ? colors.aceGreen : '#2e2e2e';
  const textColor = isWinner ? '#1a1a1a' : 'rgba(255,255,255,0.45)';
  const fontSize = Math.round(size * 0.35);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color: textColor, fontSize, fontWeight: '700' }}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
