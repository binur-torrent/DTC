"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useCognitiveStore } from "@/lib/cognitiveStore";

const PARTICLE_COUNT = 8000;

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uFocus;
  uniform float uStress;
  uniform float uCalm;
  uniform float uLoad;

  varying float vNoise;
  varying float vRadial;

  float hash(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.zxy, p.yxz + 19.27);
    return fract(p.x * p.y * p.z);
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
    return n;
  }

  void main() {
    vec3 p = position;
    vec3 dir = normalize(p);

    float speed = 0.18 + uStress * 0.55 + uLoad * 0.18;
    float scale = 1.4 + uLoad * 0.9;
    float n = noise(p * scale + vec3(uTime * speed));
    float n2 = noise(p * (scale * 2.1) + vec3(uTime * speed * 1.7));
    vNoise = n;

    // turbulence amplitude grows with stress, focus pulls particles back to the shell
    float turbulence = (n - 0.5) * (0.18 + uStress * 0.65);
    float coherence = -uFocus * 0.10;
    float breathe = sin(uTime * 0.55) * 0.025 * (0.4 + uCalm);
    float disp = turbulence + coherence + breathe;

    // calm flattens drift; stress pushes particles outward radially
    vec3 lateral = vec3(n2 - 0.5, n - 0.5, (n + n2) * 0.5 - 0.5) * (0.08 * uStress);

    vec3 displaced = p + dir * disp + lateral;
    vRadial = length(displaced);

    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mv;

    float base = 1.6 + uLoad * 3.4 + uFocus * 1.2;
    gl_PointSize = base * (340.0 / max(0.0001, -mv.z));
  }
`;

const FRAG = /* glsl */ `
  uniform float uFocus;
  uniform float uStress;
  uniform float uCalm;
  uniform float uLoad;

  varying float vNoise;
  varying float vRadial;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv);
    if (r > 0.5) discard;
    // soft circular falloff
    float alpha = smoothstep(0.5, 0.0, r);
    alpha = pow(alpha, 1.5);

    // palette:
    //   calm     -> indigo
    //   focused  -> cyan
    //   stressed -> rose
    //   high load layers magenta on top
    vec3 indigo  = vec3(0.39, 0.40, 0.95);
    vec3 cyan    = vec3(0.13, 0.83, 0.93);
    vec3 rose    = vec3(0.98, 0.44, 0.52);
    vec3 magenta = vec3(0.91, 0.47, 0.98);

    vec3 col = mix(indigo, cyan, clamp(uFocus, 0.0, 1.0));
    col = mix(col, rose, clamp(uStress * 0.85, 0.0, 1.0));
    col = mix(col, magenta, clamp(uLoad * 0.35, 0.0, 1.0));

    float energy = 0.55 + vNoise * 0.55 + uLoad * 0.35 + uFocus * 0.15;
    col *= energy;

    gl_FragColor = vec4(col, alpha * (0.55 + uLoad * 0.45));
  }
`;

function ParticleField() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const ptsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const radius = 1.35;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      arr[i * 3] = Math.cos(theta) * r * radius;
      arr[i * 3 + 1] = y * radius;
      arr[i * 3 + 2] = Math.sin(theta) * r * radius;
    }
    return arr;
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime:   { value: 0 },
      uFocus:  { value: 0.5 },
      uStress: { value: 0.3 },
      uCalm:   { value: 0.5 },
      uLoad:   { value: 0.4 },
    }),
    [],
  );

  useFrame((_, dt) => {
    if (!matRef.current || !ptsRef.current) return;
    const u = matRef.current.uniforms;
    u.uTime.value += dt;

    const f = useCognitiveStore.getState().frame;
    if (f) {
      const k = 0.06;
      u.uFocus.value  += (f.focus - u.uFocus.value) * k;
      u.uStress.value += (f.stress - u.uStress.value) * k;
      u.uCalm.value   += (f.calmness - u.uCalm.value) * k;
      u.uLoad.value   += (f.cognitiveLoad - u.uLoad.value) * k;
    }

    // calmer rotation at high calm, faster at high stress
    const stressAdj = (u.uStress.value - 0.4) * 0.4;
    ptsRef.current.rotation.y += dt * (0.05 + stressAdj * 0.6);
    ptsRef.current.rotation.x += dt * 0.018;
  });

  return (
    <points ref={ptsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={PARTICLE_COUNT}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function NeuralField() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 55 }}
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#05060a"]} />
      <ParticleField />
      <EffectComposer>
        <Bloom
          intensity={1.1}
          luminanceThreshold={0.12}
          luminanceSmoothing={0.85}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
