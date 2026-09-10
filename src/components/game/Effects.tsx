import { EffectComposer, Bloom, Vignette, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/** Neon glow + soft vignette. */
export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom luminanceThreshold={0.75} luminanceSmoothing={0.2} mipmapBlur intensity={0.9} radius={0.7} />
      <Vignette eskil={false} offset={0.25} darkness={0.75} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
