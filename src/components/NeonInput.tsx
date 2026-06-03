import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { COLORS } from '../theme/colors';

interface NeonInputProps extends TextInputProps {
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
  secureTextEntry?: boolean;
  icon: React.ComponentType<any>;
}

const NeonInput = ({ icon: Icon, ...props }: NeonInputProps) => {
  const [focused, setFocused] = useState(false);

  const glow = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: glow.value > 0 ? COLORS.primary : COLORS.border,
  }));

  const handleFocus = () => {
    setFocused(true);

    glow.value = withTiming(1, {
      duration: 250,
    });
  };

  const handleBlur = () => {
    setFocused(false);

    glow.value = withTiming(0, {
      duration: 250,
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        focused && styles.focusedContainer,
      ]}
    >
      <Icon size={20} color={focused ? COLORS.primary : COLORS.placeholder} />

      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor={COLORS.placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </Animated.View>
  );
};

export default NeonInput;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: COLORS.inputBg,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 18,

    paddingHorizontal: 16,

    marginBottom: 16,
  },

  focusedContainer: {
    shadowColor: COLORS.primary,

    shadowOpacity: 0.8,

    shadowRadius: 15,

    elevation: 12,
  },

  input: {
    flex: 1,

    color: COLORS.text,

    marginLeft: 12,

    paddingVertical: 16,

    fontSize: 15,
  },
});
