"use client";

import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Line, Group } from "react-konva";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import ProductImage from "@/components/ProductImage";

// ── Constants ──────────────────────────────────────────────────────────────
const LABEL_PAD = 44;
const ROOM_PAD  = 20;
const GRID_CM   = 50;
const FILL      = "#c4b5a0";
const GRID_CLR  = "#e5e7eb";
const UNIT      = 0.01; // 1 cm → 0.01 Three.js world units

// ── Types ──────────────────────────────────────────────────────────────────
interface Variant {
  name: string;
  modelUrl: string;
  imageUrl: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
  modelUrl: string;
  width: number;
  depth: number;
  variants: string;
}

interface PlacedItem {
  id: string;
  productId: number;
  name: string;
  xCm: number;
  yCm: number;
  widthCm: number;
  depthCm: number;
  rotation: number; // 0 | 90 | 180 | 270
  activeVariant?: Variant;
  variants: string;
  imageUrl: string;
  modelUrl: string;
}

// ── Pure helpers ───────────────────────────────────────────────────────────
function snapCm(v: number) { return Math.round(v / GRID_CM) * GRID_CM; }
function eW(i: PlacedItem) { return (i.rotation === 0 || i.rotation === 180) ? i.widthCm : i.depthCm; }
function eH(i: PlacedItem) { return (i.rotation === 0 || i.rotation === 180) ? i.depthCm : i.widthCm; }

function overlaps(a: PlacedItem, b: PlacedItem) {
  return !(
    a.xCm + eW(a) <= b.xCm || b.xCm + eW(b) <= a.xCm ||
    a.yCm + eH(a) <= b.yCm || b.yCm + eH(b) <= a.yCm
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0a0a0a] focus:border-[#0a0a0a] transition";

// ── 3D: Renderer setup ─────────────────────────────────────────────────────
function RendererSetup() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.5;
  }, [gl]);
  return null;
}

// ── 3D: Background ─────────────────────────────────────────────────────────
function SceneBackground() {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color("#f5f0eb");
    return () => { scene.background = null; };
  }, [scene]);
  return null;
}

// ── 3D: Coordinate conversion ──────────────────────────────────────────────
// Uses actual canvas-pixel coordinates so the room origin offset (LABEL_PAD)
// is explicitly accounted for rather than assumed to be zero.
// Three.js: +X = right, +Z = forward. 2D canvas: +X = right, +Y = down → maps to +Z.
function itemWorldPos(
  item: PlacedItem,
  roomW: number,
  roomD: number,
  roomOffsetX: number, // canvas px: where the room Rect starts (= offX = LABEL_PAD)
  roomOffsetY: number, // canvas px: where the room Rect starts (= offY = LABEL_PAD)
  scale: number,       // px per cm
) {
  const itemW = eW(item); // effective cm width (rotation-aware)
  const itemD = eH(item); // effective cm depth (rotation-aware)

  // Step 1 — item center in canvas pixels
  const centerX = roomOffsetX + item.xCm * scale + (itemW * scale) / 2;
  const centerZ = roomOffsetY + item.yCm * scale + (itemD * scale) / 2;

  // Step 2 — room origin in canvas pixels
  const roomOriginX = roomOffsetX;
  const roomOriginZ = roomOffsetY;

  // Step 3 — room size in canvas pixels
  const roomPixelW = roomW * scale;
  const roomPixelD = roomD * scale;

  // Step 4 — normalize to 0–1 relative to room
  const normalizedX = (centerX - roomOriginX) / roomPixelW;
  const normalizedZ = (centerZ - roomOriginZ) / roomPixelD;

  // Step 5 — convert to world units, room centered at origin
  const worldX = (normalizedX - 0.5) * roomW * UNIT;
  const worldZ = (normalizedZ - 0.5) * roomD * UNIT;

  // Clamp so all 4 edges stay inside the room
  const halfRW = (roomW * UNIT) / 2;
  const halfRD = (roomD * UNIT) / 2;
  const halfIW = (itemW * UNIT) / 2;
  const halfID = (itemD * UNIT) / 2;

  return {
    x: Math.max(-halfRW + halfIW, Math.min(halfRW - halfIW, worldX)),
    z: Math.max(-halfRD + halfID, Math.min(halfRD - halfID, worldZ)),
    _debug: { roomOriginX, roomOriginZ, normalizedX, normalizedZ, worldX, worldZ },
  };
}

// ── 3D: Single furniture piece ─────────────────────────────────────────────
function FurnitureMesh3D({
  item, roomW, roomD, roomOffsetX, roomOffsetY, scale,
}: {
  item: PlacedItem; roomW: number; roomD: number;
  roomOffsetX: number; roomOffsetY: number; scale: number;
}) {
  const [model, setModel] = useState<THREE.Object3D | null>(null);

  // Effective dimensions (rotation-aware)
  const itemW = eW(item);
  const itemD = eH(item);

  // World position (clamped to room)
  const { x, z } = itemWorldPos(item, roomW, roomD, roomOffsetX, roomOffsetY, scale);
  const rotY = (item.rotation * Math.PI) / 180;

  // Fallback box dimensions (rotation-aware)
  const w = itemW * UNIT;
  const d = itemD * UNIT;
  const h = Math.max(0.1, Math.min(0.5, (item.widthCm + item.depthCm) / 2 * UNIT * 0.8));

  // Resolve which URL to load: active variant → product default → box fallback
  const variantUrl = item.activeVariant?.modelUrl || "";
  const defaultUrl = item.modelUrl || "";
  const resolvedUrl = variantUrl || defaultUrl;

  useEffect(() => {
    setModel(null);
    if (!resolvedUrl) return;
    let cancelled = false;

    // Scale model uniformly to fit product dimensions, center it, floor-align it.
    // The group wrapper applies room-space position/rotation separately.
    function processModel(obj: THREE.Object3D) {
      // 1. Measure natural size
      const box1 = new THREE.Box3().setFromObject(obj);
      const naturalX = box1.max.x - box1.min.x;
      const naturalZ = box1.max.z - box1.min.z;

      if (naturalX > 0 && naturalZ > 0) {
        // 2. Target size from product dimensions
        const targetX = item.widthCm * UNIT;
        const targetZ = item.depthCm * UNIT;

        // 3. Uniform scale — fit the larger axis, never stretch independently
        const scaleX = targetX / naturalX;
        const scaleZ = targetZ / naturalZ;
        const uniformScale = Math.min(scaleX, scaleZ);

        // 4. Apply uniform scale to all three axes
        obj.scale.set(uniformScale, uniformScale, uniformScale);
        obj.updateMatrixWorld(true);
      }

      // 5. Recompute bbox after scaling, center X/Z, floor-align Y
      const box2 = new THREE.Box3().setFromObject(obj);
      obj.position.x -= (box2.min.x + box2.max.x) / 2;
      obj.position.z -= (box2.min.z + box2.max.z) / 2;
      obj.position.y  = -box2.min.y;

      // 6. Apply base rotation correction — many GLBs face the wrong direction
      obj.rotation.y = Math.PI;
      return obj;
    }

    import("three/examples/jsm/loaders/GLTFLoader.js")
      .then(({ GLTFLoader }) => {
        const loader = new GLTFLoader();
        loader.load(
          resolvedUrl,
          (gltf) => { if (!cancelled) setModel(processModel(gltf.scene)); },
          undefined,
          () => {
            // Variant URL failed — try product default if it's different
            if (resolvedUrl !== defaultUrl && defaultUrl && !cancelled) {
              loader.load(
                defaultUrl,
                (gltf) => { if (!cancelled) setModel(processModel(gltf.scene)); },
                undefined,
                () => { /* both failed — use box */ }
              );
            }
          }
        );
      })
      .catch(() => {});

    return () => { cancelled = true; };
    // Re-run if URL or product dimensions change (rotation doesn't change base dims)
  }, [resolvedUrl, defaultUrl, item.widthCm, item.depthCm]);

  if (model) {
    // Group handles room-space position + rotation.
    // Primitive keeps its processModel() offsets (scale, centering, floor align).
    return (
      <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
        <primitive object={model.clone()} />
      </group>
    );
  }

  // Fallback box: already floor-aligned (base at y=0 via h/2 offset)
  return (
    <mesh position={[x, h / 2, z]} rotation={[0, rotY, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color="#c4b5a0" />
    </mesh>
  );
}

// ── 3D: Full scene ─────────────────────────────────────────────────────────
function Scene3D({
  placed, roomW, roomD, roomOffsetX, roomOffsetY, scale,
}: {
  placed: PlacedItem[];
  roomW: number;
  roomD: number;
  roomOffsetX: number;
  roomOffsetY: number;
  scale: number;
}) {
  // Room dimensions in world units (1 cm = 0.01 world units)
  const rW = roomW * UNIT;
  const rD = roomD * UNIT;
  const wallH = 0.3;
  const wallT = 0.04;

  // Debug: log first item's converted coordinates so positions can be verified
  useEffect(() => {
    if (placed.length === 0) return;
    const item = placed[0];
    const { x, z, _debug: d } = itemWorldPos(item, roomW, roomD, roomOffsetX, roomOffsetY, scale);
    console.log("2D position:", item.xCm, item.yCm);
    console.log("Room origin:", d.roomOriginX, d.roomOriginZ);
    console.log("Normalized:", d.normalizedX, d.normalizedZ);
    console.log("World position:", x, z);
  }, [placed, roomW, roomD, roomOffsetX, roomOffsetY, scale]);

  return (
    <>
      <RendererSetup />
      <SceneBackground />
      <ambientLight intensity={2.5} color="white" />
      <directionalLight position={[5, 10, 5]} intensity={3} castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={1.5} />
      <hemisphereLight args={["white", "#c4b5a0", 1.5]} />
      <OrbitControls makeDefault enablePan enableZoom enableRotate />

      {/* Floor — PlaneGeometry centered at world origin, rotated flat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[rW, rD]} />
        <meshStandardMaterial color="#c4b5a0" />
      </mesh>

      {/* Walls — positioned at exact edges of floor, centered at origin */}
      {/* North wall (z = -rD/2) */}
      <mesh position={[0, wallH / 2, -rD / 2]}>
        <boxGeometry args={[rW + wallT * 2, wallH, wallT]} />
        <meshStandardMaterial color="#e5e0db" />
      </mesh>
      {/* South wall (z = +rD/2) */}
      <mesh position={[0, wallH / 2, rD / 2]}>
        <boxGeometry args={[rW + wallT * 2, wallH, wallT]} />
        <meshStandardMaterial color="#e5e0db" />
      </mesh>
      {/* West wall (x = -rW/2) */}
      <mesh position={[-rW / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, rD]} />
        <meshStandardMaterial color="#e5e0db" />
      </mesh>
      {/* East wall (x = +rW/2) */}
      <mesh position={[rW / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, rD]} />
        <meshStandardMaterial color="#e5e0db" />
      </mesh>

      {/* Furniture */}
      {placed.map((item) => (
        <FurnitureMesh3D key={`${item.id}-${item.activeVariant?.name ?? ""}`} item={item} roomW={roomW} roomD={roomD} roomOffsetX={roomOffsetX} roomOffsetY={roomOffsetY} scale={scale} />
      ))}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PlannerPage() {
  const [ready, setReady]   = useState(false);
  const [mounted, setMounted] = useState(false);
  const [view, setView]     = useState<"2d" | "3d">("2d");

  const [roomW, setRoomW]   = useState(500);
  const [roomD, setRoomD]   = useState(400);
  const [setupW, setSetupW] = useState("500");
  const [setupD, setSetupD] = useState("400");

  const [cvs, setCvs]       = useState({ w: 800, h: 600 });
  const containerRef        = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [placed, setPlaced]     = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dragProduct = useRef<Product | null>(null);
  const [toast, setToast]   = useState("");

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCvs({ w: Math.max(300, width), h: Math.max(200, height) });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [ready]);

  // ── Derived 2D scale ──────────────────────────────────────────────────────
  const availW  = cvs.w - LABEL_PAD - ROOM_PAD * 2;
  const availH  = cvs.h - LABEL_PAD - ROOM_PAD * 2;
  const scale   = Math.min(availW / roomW, availH / roomD, 5);
  const offX    = LABEL_PAD;
  const offY    = LABEL_PAD;
  const roomPxW = roomW * scale;
  const roomPxH = roomD * scale;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    const w = parseInt(setupW, 10);
    const d = parseInt(setupD, 10);
    if (!w || !d || w < 50 || d < 50) return;
    setRoomW(w); setRoomD(d); setReady(true);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const p = dragProduct.current;
    if (!p || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - offX) / scale;
    const rawY = (e.clientY - rect.top  - offY) / scale;
    // Clamp so all 4 edges stay within the room (rotation=0 on drop)
    const xCm  = Math.max(0, Math.min(snapCm(rawX), roomW - p.width));
    const yCm  = Math.max(0, Math.min(snapCm(rawY), roomD - p.depth));
    setPlaced((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        productId: p.id, name: p.name,
        xCm, yCm,
        widthCm: p.width, depthCm: p.depth,
        rotation: 0,
        variants: p.variants,
        imageUrl: p.imageUrl,
        modelUrl: p.modelUrl ?? "",
      },
    ]);
    dragProduct.current = null;
  }

  function rotateItem(id: string) {
    setPlaced((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const r = ((item.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        const newEW = (r === 0 || r === 180) ? item.widthCm : item.depthCm;
        const newEH = (r === 0 || r === 180) ? item.depthCm : item.widthCm;
        return { ...item, rotation: r,
          xCm: Math.min(item.xCm, roomW - newEW),
          yCm: Math.min(item.yCm, roomD - newEH) };
      })
    );
  }

  function removeItem(id: string) {
    setPlaced((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
  }

  function setVariant(id: string, variant: Variant) {
    setPlaced((prev) => prev.map((i) => (i.id === id ? { ...i, activeVariant: variant } : i)));
  }

  // ── Sidebar grouping ──────────────────────────────────────────────────────
  const grouped: Record<string, Product[]> = {};
  products.forEach((p) => { (grouped[p.category] ??= []).push(p); });

  const selectedItem = placed.find((i) => i.id === selectedId) ?? null;
  const selectedVariants: Variant[] = (() => {
    try { return JSON.parse(selectedItem?.variants ?? "[]"); } catch { return []; }
  })();

  // ── Grid lines (2D) ───────────────────────────────────────────────────────
  const gridLines: React.ReactElement[] = [];
  for (let x = 0; x <= roomW; x += GRID_CM)
    gridLines.push(<Line key={`v${x}`} points={[offX + x * scale, offY, offX + x * scale, offY + roomPxH]} stroke={GRID_CLR} strokeWidth={0.5} listening={false} />);
  for (let y = 0; y <= roomD; y += GRID_CM)
    gridLines.push(<Line key={`h${y}`} points={[offX, offY + y * scale, offX + roomPxW, offY + y * scale]} stroke={GRID_CLR} strokeWidth={0.5} listening={false} />);

  // ── Room setup screen ─────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-[calc(100vh-76px)] flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm border border-gray-200 p-8">
          <h1 className="text-2xl tracking-tight mb-2">Set Up Your Room</h1>
          <p className="text-sm text-[#6b7280] mb-8">Enter your room dimensions to start planning.</p>
          <form onSubmit={handleSetup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#6b7280] uppercase tracking-wider">Room Width (cm)</label>
              <input type="number" min="50" max="2000" value={setupW} onChange={(e) => setSetupW(e.target.value)} className={inputCls} placeholder="500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#6b7280] uppercase tracking-wider">Room Depth (cm)</label>
              <input type="number" min="50" max="2000" value={setupD} onChange={(e) => setSetupD(e.target.value)} className={inputCls} placeholder="400" />
            </div>
            <button type="submit" className="mt-2 px-6 py-3 bg-[#0a0a0a] text-white text-sm hover:bg-[#2a2a2a] transition-colors">
              Start Planning
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Full planner ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white text-[#0a0a0a] overflow-hidden" style={{ height: "calc(100vh - 76px)" }}>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-[#0a0a0a] text-white text-sm">
          {toast}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="shrink-0 flex items-center gap-4 px-5 py-2.5 border-b border-gray-100 text-sm">
        <span className="text-[#6b7280]">{roomW} cm × {roomD} cm</span>
        <div className="flex-1" />

        {/* 2D / 3D toggle */}
        <div className="flex border border-gray-200 overflow-hidden">
          <button
            onClick={() => setView("2d")}
            className={`px-4 py-1.5 transition-colors ${view === "2d" ? "bg-[#0a0a0a] text-white" : "hover:bg-gray-50 text-[#0a0a0a]"}`}
          >
            2D
          </button>
          <button
            onClick={() => setView("3d")}
            className={`px-4 py-1.5 border-l border-gray-200 transition-colors ${view === "3d" ? "bg-[#0a0a0a] text-white" : "hover:bg-gray-50 text-[#0a0a0a]"}`}
          >
            3D
          </button>
        </div>

        <button
          onClick={() => {
            if (!placed.length) return;
            if (confirm("Remove all placed furniture?")) { setPlaced([]); setSelectedId(null); }
          }}
          className="px-4 py-1.5 border border-gray-200 hover:border-gray-400 text-[#6b7280] transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* ── Three panels ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-48 shrink-0 border-r border-gray-100 overflow-y-auto">
          <p className="px-3 pt-4 pb-2 text-xs uppercase tracking-widest text-[#6b7280]">Furniture</p>
          {Object.entries(grouped).map(([cat, prods]) => (
            <div key={cat}>
              <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-[#6b7280] bg-gray-50">{cat}</p>
              {prods.map((product) => (
                <div
                  key={product.id}
                  draggable
                  onDragStart={(e) => {
                    dragProduct.current = product;
                    e.dataTransfer.setData("text/plain", String(product.id));
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="flex flex-col gap-1 p-2 cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors select-none"
                >
                  <ProductImage src={product.imageUrl} alt={product.name} className="w-full aspect-square" />
                  <p className="text-[11px] leading-snug truncate">{product.name}</p>
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* ── Center canvas area ── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          onDrop={view === "2d" ? handleDrop : undefined}
          onDragOver={view === "2d" ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; } : undefined}
        >
          {/* 2D Konva canvas */}
          {mounted && view === "2d" && (
            <Stage width={cvs.w} height={cvs.h} onClick={(e) => { if (e.target === e.target.getStage()) setSelectedId(null); }}>
              <Layer>
                <Rect x={offX} y={offY} width={roomPxW} height={roomPxH} fill="white" stroke="#0a0a0a" strokeWidth={1.5} listening={false} />
                {gridLines}
                <Text x={offX} y={offY - LABEL_PAD + 6} width={roomPxW} text={`${roomW} cm`} fontSize={11} fill="#6b7280" align="center" listening={false} />
                <Text x={offX - LABEL_PAD + 6} y={offY + roomPxH} width={roomPxH} text={`${roomD} cm`} fontSize={11} fill="#6b7280" align="center" rotation={-90} listening={false} />

                {placed.map((item) => {
                  // Bounding-box dimensions (rotation-aware) for layout/drag
                  const itemW = eW(item); // effective width in cm
                  const itemH = eH(item); // effective depth in cm
                  const pw = itemW * scale; // bounding box px
                  const ph = itemH * scale;
                  // Unrotated dimensions for the visual rect inside inner Group
                  const rawW = item.widthCm * scale;
                  const rawH = item.depthCm * scale;
                  const px = offX + item.xCm * scale;
                  const py = offY + item.yCm * scale;
                  const isOverlapping = placed.some((o) => o.id !== item.id && overlaps(item, o));
                  const isSelected    = selectedId === item.id;
                  const stroke        = isOverlapping ? "#ef4444" : isSelected ? "#3b82f6" : "#0a0a0a";
                  const strokeWidth   = isSelected ? 2 : 1;
                  const fontSize      = Math.max(8, Math.min(11, pw / 7));
                  const label         = item.activeVariant
                    ? `${item.name} (${item.activeVariant.name})`
                    : item.name;
                  // Boundary limits in canvas px (all 4 edges stay inside room)
                  const minX = offX;
                  const maxX = offX + roomPxW - pw;
                  const minY = offY;
                  const maxY = offY + roomPxH - ph;
                  return (
                    // Outer Group: top-left of bounding box, handles drag
                    <Group key={item.id} x={px} y={py} draggable
                      dragBoundFunc={(pos) => ({
                        x: Math.max(minX, Math.min(maxX, pos.x)),
                        y: Math.max(minY, Math.min(maxY, pos.y)),
                      })}
                      onDragEnd={(e: any) => {
                        // Snap to grid then re-clamp so right/bottom edges stay inside
                        const snX = Math.max(0, Math.min(snapCm((e.target.x() - offX) / scale), roomW - itemW));
                        const snY = Math.max(0, Math.min(snapCm((e.target.y() - offY) / scale), roomD - itemH));
                        setPlaced((prev) => prev.map((i) => i.id === item.id ? { ...i, xCm: snX, yCm: snY } : i));
                        e.target.x(offX + snX * scale);
                        e.target.y(offY + snY * scale);
                      }}
                      onClick={(e: any) => { e.cancelBubble = true; setSelectedId(item.id); }}
                    >
                      {/* Inner Group: centered in bounding box, applies visual rotation */}
                      <Group x={pw / 2} y={ph / 2} rotation={item.rotation}>
                        <Rect x={-rawW / 2} y={-rawH / 2} width={rawW} height={rawH} fill={FILL} stroke={stroke} strokeWidth={strokeWidth} />
                        <Text x={-rawW / 2} y={-rawH / 2} width={rawW} height={rawH} text={label} fontSize={fontSize} fill="#0a0a0a" align="center" verticalAlign="middle" padding={4} wrap="word" listening={false} />
                      </Group>
                    </Group>
                  );
                })}
              </Layer>
            </Stage>
          )}

          {/* 3D R3F canvas */}
          {mounted && view === "3d" && (
            <>
              <Canvas
                camera={{ position: [0, roomD * UNIT * 0.8, roomD * UNIT * 1.2], fov: 50 }}
                style={{ width: "100%", height: "100%" }}
                shadows
              >
                <Scene3D placed={placed} roomW={roomW} roomD={roomD} roomOffsetX={offX} roomOffsetY={offY} scale={scale} />
              </Canvas>
              {/* Orbit hint overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs text-[#6b7280] bg-white/80 pointer-events-none">
                3D View — drag to orbit · scroll to zoom · right-drag to pan
              </div>
            </>
          )}
        </div>

        {/* ── Properties panel ── */}
        <aside className="w-52 shrink-0 border-l border-gray-100 overflow-y-auto p-4">
          {selectedItem ? (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-1">Selected</p>
                <p className="text-base leading-snug">{selectedItem.name}</p>
                <p className="text-xs text-[#6b7280] mt-1">{eW(selectedItem)} cm × {eH(selectedItem)} cm</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-2">Orientation</p>
                <button onClick={() => rotateItem(selectedItem.id)} className="w-full py-2 border border-gray-200 text-sm hover:border-gray-400 transition-colors">
                  Rotate 90°
                </button>
              </div>
              {selectedVariants.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-2">Variants</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedVariants.map((v) => {
                      const isActive = selectedItem.activeVariant?.name === v.name;
                      return (
                        <button
                          key={v.name}
                          onClick={() => setVariant(selectedItem.id, v)}
                          className={`flex flex-col gap-1 p-1 border transition-colors ${isActive ? "border-[#0a0a0a]" : "border-gray-200 hover:border-gray-400"}`}
                        >
                          <div
                            className="w-full aspect-square"
                            style={
                              v.imageUrl
                                ? { backgroundImage: `url(${v.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                                : { background: "#c4b5a0" }
                            }
                          />
                          <p className="text-[10px] leading-snug text-center truncate w-full px-0.5">{v.name}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <button onClick={() => removeItem(selectedItem.id)} className="w-full py-2 border border-red-200 text-sm text-red-500 hover:border-red-400 transition-colors">
                Remove
              </button>
            </div>
          ) : (
            <p className="text-xs text-[#6b7280] mt-4">Select a piece to edit.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
