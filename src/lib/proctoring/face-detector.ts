export interface FaceDetector {
  estimateFaces(video: HTMLVideoElement, returnTensors?: boolean): Promise<unknown[]>;
  dispose(): void;
}

/** Bundler-resolved lazy imports: no fake observations when the model fails. */
export async function loadFaceDetector(): Promise<FaceDetector> {
  const [tf, blazeface] = await Promise.all([
    import('@tensorflow/tfjs'), import('@tensorflow-models/blazeface'),
  ]);
  await tf.ready();
  return blazeface.load({ modelUrl: '/models/blazeface/model.json' });
}
