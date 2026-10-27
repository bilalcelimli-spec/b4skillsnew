import { requireNativeComponent } from 'react-native';

/** Native camera preview (B4CameraPreview on Apple and Android). Registered once for the app. */
export const CameraPreview = requireNativeComponent<{ style: object }>('B4CameraPreview');
