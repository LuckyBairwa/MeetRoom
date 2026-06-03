import React from 'react';

import { TouchableOpacity, Text, StyleSheet } from 'react-native';

import LinearGradient from 'react-native-linear-gradient';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ArrowRight } from 'lucide-react-native';

import { COLORS } from '../theme/colors';

interface NeonButtonProps {
  title: string;
  onPress?: () => void | Promise<void>;
  iconType?: 'arrow' | 'logout';
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const NeonButton = ({
  title,
  onPress,
  iconType = 'arrow',
}: NeonButtonProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: scale.value,
      },
    ],
  }));

  return (
    <AnimatedTouchable
      activeOpacity={1}
      style={animatedStyle}
      onPressIn={() => {
        scale.value = withSpring(0.96);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      onPress={onPress}
    >
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        <Text style={styles.text}>{title}</Text>

        <ArrowRight color={COLORS.text} size={20} />
      </LinearGradient>
    </AnimatedTouchable>
  );
};

export default NeonButton;

const styles = StyleSheet.create({
  button: {
    height: 58,

    borderRadius: 18,

    justifyContent: 'center',

    alignItems: 'center',

    flexDirection: 'row',

    gap: 10,

    shadowColor: COLORS.primary,

    shadowOpacity: 0.8,

    shadowRadius: 18,

    elevation: 14,
  },

  text: {
    color: COLORS.text,

    fontSize: 16,

    fontWeight: '700',
  },
});
