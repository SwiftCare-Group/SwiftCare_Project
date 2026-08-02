import { Camera } from 'expo-camera';
import { Platform } from 'react-native';

export type VideoPermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
};

export async function requestVideoConsultationPermissions(): Promise<VideoPermissionResult> {
  if (Platform.OS === 'web') {
    return {
      granted: true,
      canAskAgain: true,
    };
  }

  const [camera, microphone] = await Promise.all([
    Camera.requestCameraPermissionsAsync(),
    Camera.requestMicrophonePermissionsAsync(),
  ]);

  return {
    granted: camera.granted && microphone.granted,
    canAskAgain: camera.canAskAgain && microphone.canAskAgain,
  };
}