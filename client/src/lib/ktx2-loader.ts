import * as THREE from "three";
import { KTX2Loader } from "three-stdlib";
import type { GLTFLoader } from "three-stdlib";

// KTX2Loader.detectSupport(renderer) only reads renderer.extensions /
// renderer.capabilities once and snapshots the result into workerConfig —
// it doesn't keep a reference to the renderer afterward (verified in
// three's KTX2Loader source), so a disposable, DOM-detached renderer used
// purely for capability detection is safe. This sidesteps the chicken/egg
// problem of useGLTF.preload() running at module import time, before
// R3F's <Canvas> (and its real renderer) has mounted.
let ktx2Loader: KTX2Loader | null = null;

function getKTX2Loader() {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath("/basis/");
    const tempRenderer = new THREE.WebGLRenderer();
    ktx2Loader.detectSupport(tempRenderer as any);
    tempRenderer.dispose();
  }
  return ktx2Loader;
}

// Pass as the 4th (extendLoader) argument to drei's useGLTF/useGLTF.preload
// for any model exported with KTX2/Basis-compressed textures.
export function withKTX2(loader: GLTFLoader) {
  loader.setKTX2Loader(getKTX2Loader());
}
