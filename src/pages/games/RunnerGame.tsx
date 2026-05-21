import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Sky, Cloud } from "@react-three/drei";
import * as THREE from "three";
import { PageHeader } from "@/components/PageHeader";
import { playSpeech, playFeedback } from "@/lib/audio";
import { cn } from "@/lib/utils";

// =============================================================
// Subway-Surf-tarzı 3B koşu oyunu — sayı toplama
// 3 şerit • zıplama • engeller (kütük) • toplanan sayılarla skor
// =============================================================

const LANES = [-1.6, 0, 1.6] as const;
type Lane = 0 | 1 | 2;

const START_SPEED = 6; // birim/sn
const MAX_SPEED = 14;
const SPAWN_Z = -45;
const DESPAWN_Z = 6;
const PLAYER_Z = 0;
const HIT_Z = 1.4;

interface Coin { id: number; lane: Lane; z: number; value: number; collected: boolean; y: number; }
interface Log  { id: number; lane: Lane; z: number; passed: boolean; }

let _id = 0;
const nid = () => ++_id;

function Player({ lane, jumping }: { lane: Lane; jumping: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const targetX = LANES[lane];
  const yRef = useRef(0);
  const tRef = useRef(0);

  useFrame((_, dt) => {
    if (!ref.current) return;
    // Smooth lane transition
    const cur = ref.current.position.x;
    ref.current.position.x = cur + (targetX - cur) * Math.min(1, dt * 12);
    // Jump arc
    if (jumping) {
      tRef.current += dt;
      const T = 0.7;
      const p = Math.min(1, tRef.current / T);
      yRef.current = Math.sin(p * Math.PI) * 1.6;
    } else {
      tRef.current = 0;
      yRef.current += (0 - yRef.current) * Math.min(1, dt * 14);
    }
    ref.current.position.y = yRef.current;
    // little run bobbing
    ref.current.rotation.z = Math.sin(performance.now() * 0.012) * 0.05;
  });

  return (
    <group ref={ref} position={[targetX, 0, PLAYER_Z]}>
      {/* shadow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={jumping ? 0.18 : 0.35} />
      </mesh>
      {/* body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.55, 6, 12]} />
        <meshStandardMaterial color="#ff7043" />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshStandardMaterial color="#ffd7a8" />
      </mesh>
      {/* hat */}
      <mesh position={[0, 1.78, 0]}>
        <coneGeometry args={[0.28, 0.25, 12]} />
        <meshStandardMaterial color="#42a5f5" />
      </mesh>
      {/* arms (running animation via group rotation) */}
      <mesh position={[-0.38, 0.85, 0]} rotation={[Math.sin(performance.now() * 0.012) * 0.7, 0, 0.3]}>
        <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
        <meshStandardMaterial color="#ff7043" />
      </mesh>
      <mesh position={[0.38, 0.85, 0]} rotation={[-Math.sin(performance.now() * 0.012) * 0.7, 0, -0.3]}>
        <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
        <meshStandardMaterial color="#ff7043" />
      </mesh>
    </group>
  );
}

function CoinMesh({ value, lane, z, y }: { value: number; lane: Lane; z: number; y: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 3; });
  return (
    <group ref={ref} position={[LANES[lane], 1.0 + y, z]}>
      <mesh>
        <cylinderGeometry args={[0.45, 0.45, 0.08, 24]} />
        <meshStandardMaterial color="#ffd54f" metalness={0.6} roughness={0.25} />
      </mesh>
      <Text position={[0, 0, 0.06]} fontSize={0.5} color="#7a4a00" anchorX="center" anchorY="middle">
        {String(value)}
      </Text>
      <Text position={[0, 0, -0.06]} rotation={[0, Math.PI, 0]} fontSize={0.5} color="#7a4a00" anchorX="center" anchorY="middle">
        {String(value)}
      </Text>
    </group>
  );
}

function LogMesh({ lane, z }: { lane: Lane; z: number }) {
  return (
    <group position={[LANES[lane], 0.35, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 1.4, 16]} />
        <meshStandardMaterial color="#6d4c2a" />
      </mesh>
      {/* end caps */}
      <mesh position={[-0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.36, 0.36, 0.05, 16]} />
        <meshStandardMaterial color="#3e2812" />
      </mesh>
      <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.36, 0.36, 0.05, 16]} />
        <meshStandardMaterial color="#3e2812" />
      </mesh>
    </group>
  );
}

function Ground({ speedRef }: { speedRef: React.MutableRefObject<number> }) {
  const offsetRef = useRef(0);
  const stripesRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    offsetRef.current = (offsetRef.current + speedRef.current * dt) % 4;
    if (stripesRef.current) stripesRef.current.position.z = offsetRef.current;
  });
  return (
    <>
      {/* main road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]} receiveShadow>
        <planeGeometry args={[6, 100]} />
        <meshStandardMaterial color="#5a5a66" />
      </mesh>
      {/* lane lines (scrolling stripes) */}
      <group ref={stripesRef}>
        {Array.from({ length: 30 }).map((_, i) => (
          <group key={i} position={[0, 0.02, -i * 4]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-LANES[1] / 2 - 0.4, 0, 0]}>
              <planeGeometry args={[0.08, 1.5]} />
              <meshBasicMaterial color="#fff8" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LANES[1] / 2 + 0.4, 0, 0]}>
              <planeGeometry args={[0.08, 1.5]} />
              <meshBasicMaterial color="#fff8" />
            </mesh>
          </group>
        ))}
      </group>
      {/* grass sides */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7, -0.01, -20]}>
        <planeGeometry args={[8, 100]} />
        <meshStandardMaterial color="#5cb85c" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[7, -0.01, -20]}>
        <planeGeometry args={[8, 100]} />
        <meshStandardMaterial color="#5cb85c" />
      </mesh>
    </>
  );
}

function Trees({ speedRef }: { speedRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const trees = useMemo(() => {
    const arr: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 20; i++) {
      arr.push({ x: -5 - Math.random() * 4, z: -i * 5 - Math.random() * 3, s: 0.7 + Math.random() * 0.7 });
      arr.push({ x: 5 + Math.random() * 4, z: -i * 5 - Math.random() * 3, s: 0.7 + Math.random() * 0.7 });
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((c) => {
      c.position.z += speedRef.current * dt;
      if (c.position.z > DESPAWN_Z) c.position.z -= 100;
    });
  });
  return (
    <group ref={groupRef}>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 1.2, 8]} />
            <meshStandardMaterial color="#6d4c2a" />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <coneGeometry args={[0.9, 1.8, 10]} />
            <meshStandardMaterial color="#2e7d32" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

interface SceneProps {
  lane: Lane;
  jumping: boolean;
  speedRef: React.MutableRefObject<number>;
  coins: Coin[];
  logs: Log[];
  onTick: (dt: number) => void;
}

function Scene({ lane, jumping, speedRef, coins, logs, onTick }: SceneProps) {
  useFrame((_, dt) => onTick(Math.min(0.05, dt)));
  return (
    <>
      <Sky sunPosition={[10, 6, -10]} turbidity={6} rayleigh={1} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 2]} intensity={1.1} castShadow />
      <Suspense fallback={null}>
        <Cloud position={[-6, 8, -25]} speed={0.2} opacity={0.6} />
        <Cloud position={[6, 9, -35]} speed={0.2} opacity={0.5} />
      </Suspense>
      <Ground speedRef={speedRef} />
      <Trees speedRef={speedRef} />
      <Player lane={lane} jumping={jumping} />
      {coins.map((c) => !c.collected && <CoinMesh key={c.id} value={c.value} lane={c.lane} z={c.z} y={c.y} />)}
      {logs.map((l) => <LogMesh key={l.id} lane={l.lane} z={l.z} />)}
    </>
  );
}

const RunnerGame = () => {
  const [lane, setLane] = useState<Lane>(1);
  const laneRef = useRef<Lane>(1);
  useEffect(() => { laneRef.current = lane; }, [lane]);

  const [jumping, setJumping] = useState(false);
  const jumpEndRef = useRef(0);

  const [score, setScore] = useState(0);
  const [collected, setCollected] = useState(0);
  const [lives, setLives] = useState(3);
  const livesRef = useRef(3);
  useEffect(() => { livesRef.current = lives; }, [lives]);

  const [coins, setCoins] = useState<Coin[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const speedRef = useRef(START_SPEED);
  const spawnCoinRef = useRef(0);
  const spawnLogRef = useRef(2);
  const hitCooldownRef = useRef(0);

  const ended = lives <= 0;

  const jump = useCallback(() => {
    if (jumpEndRef.current > performance.now()) return;
    jumpEndRef.current = performance.now() + 700;
    setJumping(true);
    setTimeout(() => setJumping(false), 700);
  }, []);

  const goLane = useCallback((t: Lane) => setLane(t), []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ended) return;
      if (e.key === "ArrowLeft") setLane((l) => (Math.max(0, l - 1) as Lane));
      else if (e.key === "ArrowRight") setLane((l) => (Math.min(2, l + 1) as Lane));
      else if (e.key === "ArrowUp" || e.key === " ") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump, ended]);

  // Touch swipe
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < -30) setLane((l) => (Math.max(0, l - 1) as Lane));
      else if (dx > 30) setLane((l) => (Math.min(2, l + 1) as Lane));
    } else if (dy < -30) jump();
    touchStart.current = null;
  };

  const tick = useCallback((dt: number) => {
    if (ended) return;
    const sp = speedRef.current;
    const isJumping = jumpEndRef.current > performance.now();
    hitCooldownRef.current = Math.max(0, hitCooldownRef.current - dt);

    // speed up gently
    speedRef.current = Math.min(MAX_SPEED, sp + dt * 0.15);

    setCoins((cs) => {
      const next: Coin[] = [];
      for (const c of cs) {
        if (c.collected) continue;
        const nz = c.z + sp * dt;
        if (nz > DESPAWN_Z) continue;
        // collision
        if (!isJumping && c.lane === laneRef.current && Math.abs(nz - PLAYER_Z) < HIT_Z * 0.6) {
          setScore((s) => s + c.value);
          setCollected((n) => n + 1);
          playFeedback(true);
          continue;
        }
        next.push({ ...c, z: nz });
      }
      return next;
    });

    setLogs((ls) => {
      const next: Log[] = [];
      for (const l of ls) {
        const nz = l.z + sp * dt;
        if (nz > DESPAWN_Z) continue;
        let passed = l.passed;
        if (!passed && l.lane === laneRef.current && Math.abs(nz - PLAYER_Z) < HIT_Z * 0.55) {
          passed = true;
          if (!isJumping && hitCooldownRef.current === 0) {
            hitCooldownRef.current = 1.0;
            setLives((v) => Math.max(0, v - 1));
            playFeedback(false);
          } else if (isJumping) {
            setScore((s) => s + 5);
          }
        }
        next.push({ ...l, z: nz, passed });
      }
      return next;
    });

    spawnCoinRef.current -= dt;
    if (spawnCoinRef.current <= 0) {
      spawnCoinRef.current = 0.55 + Math.random() * 0.4;
      // spawn a small row of coins (1-3) in a single lane (arc pattern)
      const ln = Math.floor(Math.random() * 3) as Lane;
      const count = 1 + Math.floor(Math.random() * 3);
      const value = 1 + Math.floor(Math.random() * 9);
      const newOnes: Coin[] = [];
      for (let i = 0; i < count; i++) {
        newOnes.push({ id: nid(), lane: ln, z: SPAWN_Z - i * 1.3, value, collected: false, y: 0 });
      }
      setCoins((cs) => [...cs, ...newOnes]);
    }

    spawnLogRef.current -= dt;
    if (spawnLogRef.current <= 0) {
      spawnLogRef.current = 1.6 + Math.random() * 1.6;
      // avoid blocking all 3 lanes — just one
      const ln = Math.floor(Math.random() * 3) as Lane;
      setLogs((ls) => [...ls, { id: nid(), lane: ln, z: SPAWN_Z, passed: false }]);
    }
  }, [ended]);

  const reset = () => {
    setLane(1); setScore(0); setCollected(0); setLives(3);
    setCoins([]); setLogs([]); speedRef.current = START_SPEED;
    spawnCoinRef.current = 0; spawnLogRef.current = 2;
  };

  useEffect(() => { playSpeech("Sayıları topla, kütüklerden zıpla!", "tr"); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-info/20 to-background">
      <main className="container mx-auto max-w-xl px-4 pb-16">
        <PageHeader title="🏃 3B Koşu" backTo="/oyunlar" centered onReset={reset} />

        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-warning/40">
            <div className="text-[10px] font-bold text-muted-foreground">Skor</div>
            <div className="text-xl font-extrabold text-warning">{score}</div>
          </div>
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-success/40">
            <div className="text-[10px] font-bold text-muted-foreground">Sayı</div>
            <div className="text-xl font-extrabold text-success">🪙 {collected}</div>
          </div>
          <div className="rounded-xl bg-card p-2 shadow-soft border-2 border-destructive/40">
            <div className="text-[10px] font-bold text-muted-foreground">Can</div>
            <div className="text-xl font-extrabold text-destructive">{"❤️".repeat(lives) || "💀"}</div>
          </div>
        </div>

        <div
          className="relative rounded-3xl shadow-card border-4 border-warning/30 overflow-hidden touch-none select-none"
          style={{ height: "62vh", background: "linear-gradient(to bottom, #87ceeb, #b8e6c0)" }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <Canvas
            shadows
            camera={{ position: [0, 7, 4.5], fov: 55, near: 0.1, far: 100 }}
            dpr={[1, 1.5]}
            onCreated={({ camera }) => { camera.lookAt(0, 0.6, -6); }}
          >
            <Scene
              lane={lane}
              jumping={jumping}
              speedRef={speedRef}
              coins={coins}
              logs={logs}
              onTick={tick}
            />
          </Canvas>

          {ended && (
            <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
              <div className="text-6xl">🏁</div>
              <p className="text-2xl font-extrabold">Oyun Bitti!</p>
              <p className="text-lg">Skor: <span className="font-extrabold text-warning">{score}</span></p>
              <p className="text-sm">Topladığın sayı: <span className="font-extrabold text-success">{collected}</span></p>
              <button onClick={reset} className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-card">
                Tekrar Oyna
              </button>
            </div>
          )}
        </div>

        {/* Mobile controls — sadece sol/sağ + zıpla */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            onPointerDown={(e) => { e.preventDefault(); goLane(0); }}
            className={cn("rounded-2xl border-4 p-4 text-2xl font-extrabold shadow-soft active:scale-95",
              lane === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-primary/30")}
          >⬅️</button>
          <button
            onPointerDown={(e) => { e.preventDefault(); jump(); }}
            className="rounded-2xl bg-success text-white border-4 border-success p-4 text-2xl font-extrabold shadow-soft active:scale-95"
          >🦘 Zıpla</button>
          <button
            onPointerDown={(e) => { e.preventDefault(); goLane(2); }}
            className={cn("rounded-2xl border-4 p-4 text-2xl font-extrabold shadow-soft active:scale-95",
              lane === 2 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-primary/30")}
          >➡️</button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          Sayıları topla • Kütüklerden zıpla • Şeritleri değiştir
        </p>
      </main>
    </div>
  );
};

export default RunnerGame;
