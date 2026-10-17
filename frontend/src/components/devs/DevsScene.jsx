import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  MeshDistortMaterial,
  PerformanceMonitor,
  Stars,
} from "@react-three/drei";
import * as THREE from "three";

/* Normalised mouse position (-1..1), shared with the scene */
const mouse = { x: 0, y: 0 };

/* Whole scene leans slightly toward the cursor for a parallax feel */
const Rig = ({ children }) => {
  const group = useRef();

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, mouse.x * 0.25, 3, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -mouse.y * 0.15, 3, delta);
  });

  return <group ref={group}>{children}</group>;
};

/* Distorting plasma orb + wireframe shell */
const Orb = () => {
  const shell = useRef();

  useFrame((_, delta) => {
    if (!shell.current) return;
    shell.current.rotation.y += delta * 0.12;
    shell.current.rotation.x += delta * 0.05;
  });

  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={1.2}>
      <group position={[3.4, 0.4, -2.5]}>
        <mesh>
          <icosahedronGeometry args={[1.5, 24]} />
          <MeshDistortMaterial
            color="#6d28d9"
            emissive="#3b0a8f"
            emissiveIntensity={0.7}
            roughness={0.25}
            metalness={0.85}
            distort={0.42}
            speed={1.5}
          />
        </mesh>
        <mesh ref={shell} scale={1.35}>
          <icosahedronGeometry args={[1.5, 2]} />
          <meshBasicMaterial color="#22f0ff" wireframe transparent opacity={0.35} />
        </mesh>
      </group>
    </Float>
  );
};

/* Two counter-rotating gyroscope rings */
const Rings = () => {
  const a = useRef();
  const b = useRef();

  useFrame((_, delta) => {
    if (a.current) {
      a.current.rotation.x += delta * 0.25;
      a.current.rotation.y += delta * 0.15;
    }
    if (b.current) {
      b.current.rotation.y -= delta * 0.3;
      b.current.rotation.z += delta * 0.2;
    }
  });

  return (
    <Float speed={1.1} floatIntensity={0.8}>
      <group position={[-4.2, -1.6, -4]}>
        <mesh ref={a}>
          <torusGeometry args={[1.6, 0.02, 12, 120]} />
          <meshBasicMaterial color="#22f0ff" transparent opacity={0.7} />
        </mesh>
        <mesh ref={b}>
          <torusGeometry args={[1.2, 0.02, 12, 120]} />
          <meshBasicMaterial color="#ff2bd6" transparent opacity={0.7} />
        </mesh>
      </group>
    </Float>
  );
};

/* Small wireframe torus knot */
const Knot = () => {
  const ref = useRef();

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.2;
    ref.current.rotation.y += delta * 0.28;
  });

  return (
    <Float speed={1.8} floatIntensity={1.5}>
      <mesh ref={ref} position={[-3.2, 2.4, -3]} scale={0.55}>
        <torusKnotGeometry args={[1, 0.28, 140, 14]} />
        <meshBasicMaterial color="#ff2bd6" wireframe transparent opacity={0.45} />
      </mesh>
    </Float>
  );
};

/* Glowing particle field */
const Particles = ({ count = 900 }) => {
  const ref = useRef();

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 16 - 3;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.015;
    ref.current.rotation.x += delta * 0.004;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#7df7ff"
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const DevsScene = ({ paused = false }) => {
  const [dpr, setDpr] = useState(1.5);

  useEffect(() => {
    const onMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, dpr]}
      camera={{ position: [0, 0, 8], fov: 50 }}
      frameloop={paused ? "never" : "always"}
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      {/* Drops resolution automatically if the GPU struggles */}
      <PerformanceMonitor onDecline={() => setDpr(1)} />

      <fog attach="fog" args={["#05060f", 8, 24]} />
      <ambientLight intensity={0.45} />
      <pointLight position={[-5, 3, 3]} intensity={90} color="#22f0ff" />
      <pointLight position={[5, -3, 2]} intensity={90} color="#ff2bd6" />

      <Rig>
        <Orb />
        <Rings />
        <Knot />
        <Particles />
        <Stars radius={60} depth={40} count={1500} factor={3} saturation={0} fade speed={0.6} />
      </Rig>
    </Canvas>
  );
};

export default DevsScene;