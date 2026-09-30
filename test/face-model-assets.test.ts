import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { load } from '@tensorflow-models/blazeface';

it('ships the pinned model and runs real inference without an external model host', async () => {
  const jsonBytes = readFileSync('public/models/blazeface/model.json');
  const weights = readFileSync('public/models/blazeface/group1-shard1of1.bin');
  expect(createHash('sha256').update(jsonBytes).digest('hex')).toBe('7b6bb6f35e5a7899232de51dda8bf514ef9664ca7ec58388c9fecc088c883b58');
  expect(createHash('sha256').update(weights).digest('hex')).toBe('60b481ab6c19352673cdb21e02e639f90883db1393ac52d07c7ea4e1e11cb2cd');
  const json = JSON.parse(jsonBytes.toString());
  expect(json.weightsManifest.flatMap((g: any) => g.paths)).toEqual(['group1-shard1of1.bin']);
  await tf.setBackend('cpu');
  await tf.ready();
  const model = await load({ modelUrl: tf.io.fromMemory({
    modelTopology: json.modelTopology,
    weightSpecs: json.weightsManifest.flatMap((g: any) => g.weights),
    weightData: weights.buffer.slice(weights.byteOffset, weights.byteOffset + weights.byteLength),
  }) });
  const image = tf.zeros([128, 128, 3], 'int32') as tf.Tensor3D;
  try { expect(await model.estimateFaces(image, false)).toEqual([]); }
  finally { image.dispose(); model.dispose(); }
});
