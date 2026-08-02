import * as Haptics from 'expo-haptics';

export const useHaptics = () => {
  const lightTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const mediumTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const heavyTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const successNotification = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const errorNotification = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const warningNotification = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  return {
    lightTap,
    mediumTap,
    heavyTap,
    successNotification,
    errorNotification,
    warningNotification,
  };
};