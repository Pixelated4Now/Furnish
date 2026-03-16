"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import ProductImage from "@/components/ProductImage";
import { useCartStore } from "@/store/cartStore";

// ── Constants ──────────────────────────────────────────────────────────────
const LABEL_PAD = 44;
const ROOM_PAD  = 20;
const UNIT      = 0.01; // 1 cm → 0.01 Three.js world units

// ── Types ──────────────────────────────────────────────────────────────────
interface Variant { name: string; modelUrl: string; imageUrl: string; }

interface Product {
  id: number; name: string; category: string; price: number;
  imageUrl: string; modelUrl: string;
  width: number; depth: number; variants: string;
}

interface PlacedItem {
  id: string; productId: number; name: string; price: number; category: string;
  xCm: number; yCm: number; widthCm: number; depthCm: number;
  rotation: number; // 0 | 90 | 180 | 270
  activeVariant?: Variant;
  variants: string; imageUrl: string; modelUrl: string;
}

// ── Pure helpers ───────────────────────────────────────────────────────────
function eW(i: PlacedItem) { return (i.rotation === 0 || i.rotation === 180) ? i.widthCm : i.depthCm; }
function eH(i: PlacedItem) { return (i.rotation === 0 || i.rotation === 180) ? i.depthCm : i.widthCm; }

/** Convert Three.js world position back to room-space cm coordinates. */
function worldToItemPos(
  worldX: number, worldZ: number,
  itemW: number, itemD: number,
  roomW: number, roomD: number,
): { xCm: number; yCm: number } {
  const xCm = worldX / UNIT - itemW / 2 + roomW / 2;
  const yCm = worldZ / UNIT - itemD / 2 + roomD / 2;
  return {
    xCm: Math.max(0, Math.min(xCm, roomW - itemW)),
    yCm: Math.max(0, Math.min(yCm, roomD - itemD)),
  };
}

/** AABB overlap check in world space. Pass "__new__" as candidateId when placing a new item. */
function wouldOverlapOthers(
  candidateId: string,
  cx: number, cz: number,   // world-space centre of the candidate
  hw: number, hd: number,   // world-space half-extents of the candidate
  others: PlacedItem[],
  roomW: number, roomD: number,
): boolean {
  for (const o of others) {
    if (o.id === candidateId) continue;
    const oW = eW(o), oD = eH(o);
    const ox = ((o.xCm + oW / 2) / roomW - 0.5) * roomW * UNIT;
    const oz = ((o.yCm + oD / 2) / roomD - 0.5) * roomD * UNIT;
    const ohw = (oW * UNIT) / 2;
    const ohd = (oD * UNIT) / 2;
    if (cx - hw < ox + ohw && cx + hw > ox - ohw &&
        cz - hd < oz + ohd && cz + hd > oz - ohd) return true;
  }
  return false;
}

/** Scan the room on a 50 cm grid to find the first free spot for a new item. */
function findFreePlacement(
  iW: number, iD: number,
  placed: PlacedItem[],
  roomW: number, roomD: number,
): { xCm: number; yCm: number } {
  const hw = (iW * UNIT) / 2;
  const hd = (iD * UNIT) / 2;
  const step = 50;
  for (let xCm = 0; xCm <= roomW - iW; xCm += step) {
    for (let yCm = 0; yCm <= roomD - iD; yCm += step) {
      const cx = ((xCm + iW / 2) / roomW - 0.5) * roomW * UNIT;
      const cz = ((yCm + iD / 2) / roomD - 0.5) * roomD * UNIT;
      if (!wouldOverlapOthers("__new__", cx, cz, hw, hd, placed, roomW, roomD)) {
        return { xCm, yCm };
      }
    }
  }
  return {
    xCm: Math.max(0, Math.round((roomW - iW) / 2)),
    yCm: Math.max(0, Math.round((roomD - iD) / 2)),
  };
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

// ── 3D: Camera controller ──────────────────────────────────────────────────
function CameraController({
  view, roomW, roomD,
}: { view: "2d" | "3d"; roomW: number; roomD: number }) {
  const store = useThree();
  const storeRef = useRef(store);
  useLayoutEffect(() => { storeRef.current = store; });

  const prevView = useRef<"2d" | "3d" | null>(null);
  const anim = useRef({
    active: false, frames: 0,
    from: new THREE.Vector3(), to: new THREE.Vector3(),
  });

  useEffect(() => {
    if (view === prevView.current) return;
    prevView.current = view;

    const { camera, set, size } = storeRef.current;
    const from = camera.position.clone();
    const to = view === "2d"
      ? new THREE.Vector3(0, 15, 0)
      : new THREE.Vector3(0, 8, 10);

    if (view === "2d") {
      const aspect = size.width / size.height;
      const halfH  = Math.max(roomW, roomD) * UNIT * 0.75;
      const halfW  = halfH * aspect;
      const ortho  = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 200);
      ortho.position.copy(from);
      ortho.up.set(0, 0, -1);
      ortho.lookAt(0, 0, 0);
      set({ camera: ortho });
    } else {
      const persp = new THREE.PerspectiveCamera(50, size.width / size.height, 0.1, 200);
      persp.position.copy(from);
      persp.up.set(0, 1, 0);
      persp.lookAt(0, 0, 0);
      set({ camera: persp });
    }

    anim.current = { active: true, frames: 0, from, to };
  }, [view, roomW, roomD]);

  useFrame(({ camera: cam }) => {
    const a = anim.current;
    if (!a.active) return;
    const t = Math.min(a.frames / 30, 1);
    const s = t * t * (3 - 2 * t);
    cam.position.lerpVectors(a.from, a.to, s);
    cam.lookAt(0, 0, 0);
    a.frames++;
    if (a.frames >= 30) { cam.position.copy(a.to); cam.lookAt(0, 0, 0); a.active = false; }
  });

  return null;
}

// ── 3D: Coordinate conversion ──────────────────────────────────────────────
function itemWorldPos(
  item: PlacedItem,
  roomW: number, roomD: number,
  roomOffsetX: number, roomOffsetY: number, scale: number,
): { x: number; z: number } {
  const itemW = eW(item);
  const itemD = eH(item);
  const normalizedX = (item.xCm + itemW / 2) / roomW;
  const normalizedZ = (item.yCm + itemD / 2) / roomD;
  const worldX = (normalizedX - 0.5) * roomW * UNIT;
  const worldZ = (normalizedZ - 0.5) * roomD * UNIT;
  const halfRW = (roomW * UNIT) / 2;
  const halfRD = (roomD * UNIT) / 2;
  const halfIW = (itemW * UNIT) / 2;
  const halfID = (itemD * UNIT) / 2;
  return {
    x: Math.max(-halfRW + halfIW, Math.min(halfRW - halfIW, worldX)),
    z: Math.max(-halfRD + halfID, Math.min(halfRD - halfID, worldZ)),
  };
}

// ── 3D: Single furniture piece ─────────────────────────────────────────────
interface FurnitureMesh3DProps {
  item: PlacedItem;
  roomW: number; roomD: number;
  roomOffsetX: number; roomOffsetY: number; scale: number;
  selected: boolean;
  isDragging: boolean;
  dragPosRef: React.MutableRefObject<THREE.Vector3 | null>;
  onPointerDown: (e: any) => void;
}

function FurnitureMesh3D({
  item, roomW, roomD, roomOffsetX, roomOffsetY, scale,
  selected, isDragging, dragPosRef, onPointerDown,
}: FurnitureMesh3DProps) {
  const [rawModel, setRawModel] = useState<THREE.Object3D | null>(null);
  const [model, setModel]       = useState<THREE.Object3D | null>(null);
  const groupRef                = useRef<THREE.Group>(null);

  const itemW = eW(item);
  const itemD = eH(item);
  const { x, z } = itemWorldPos(item, roomW, roomD, roomOffsetX, roomOffsetY, scale);
  const rotY = (item.rotation * Math.PI) / 180;

  const w = itemW * UNIT;
  const d = itemD * UNIT;
  const h = Math.max(0.1, Math.min(0.5, (item.widthCm + item.depthCm) / 2 * UNIT * 0.8));

  const variantUrl  = item.activeVariant?.modelUrl || "";
  const defaultUrl  = item.modelUrl || "";
  const resolvedUrl = variantUrl || defaultUrl;

  // Load + process GLB
  useEffect(() => {
    setRawModel(null);
    if (!resolvedUrl) return;
    let cancelled = false;

    function processModel(obj: THREE.Object3D) {
      const box1    = new THREE.Box3().setFromObject(obj);
      const naturalX = box1.max.x - box1.min.x;
      const naturalZ = box1.max.z - box1.min.z;
      if (naturalX > 0 && naturalZ > 0) {
        const uniformScale = Math.min((item.widthCm * UNIT) / naturalX, (item.depthCm * UNIT) / naturalZ);
        obj.scale.set(uniformScale, uniformScale, uniformScale);
        obj.updateMatrixWorld(true);
      }
      const box2 = new THREE.Box3().setFromObject(obj);
      obj.position.x -= (box2.min.x + box2.max.x) / 2;
      obj.position.z -= (box2.min.z + box2.max.z) / 2;
      obj.position.y  = -box2.min.y;
      obj.rotation.y  = Math.PI;
      return obj;
    }

    import("three/examples/jsm/loaders/GLTFLoader.js")
      .then(({ GLTFLoader }) => {
        const loader = new GLTFLoader();
        loader.load(resolvedUrl,
          (gltf) => { if (!cancelled) setRawModel(processModel(gltf.scene)); },
          undefined,
          () => {
            if (resolvedUrl !== defaultUrl && defaultUrl && !cancelled) {
              loader.load(defaultUrl,
                (gltf) => { if (!cancelled) setRawModel(processModel(gltf.scene)); },
                undefined, () => {},
              );
            }
          },
        );
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [resolvedUrl, defaultUrl, item.widthCm, item.depthCm]);

  // Clone once per loaded model (avoid cloning on every render)
  useEffect(() => {
    setModel(rawModel ? rawModel.clone() : null);
  }, [rawModel]);

  // Apply/remove emissive highlight on all meshes in the cloned model
  useEffect(() => {
    if (!model) return;
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.emissive.set(selected ? "#ffff00" : "#000000");
          mat.emissiveIntensity = selected ? 0.3 : 0;
          mat.needsUpdate = true;
        }
      });
    });
  }, [model, selected]);

  // Imperatively drive position during drag (no React re-renders per frame)
  useFrame(() => {
    if (!isDragging || !groupRef.current || !dragPosRef.current) return;
    groupRef.current.position.x = dragPosRef.current.x;
    groupRef.current.position.z = dragPosRef.current.z;
  });

  const groupProps = {
    ref: groupRef,
    position: [x, 0, z] as [number, number, number],
    rotation: [0, rotY, 0] as [number, number, number],
    onPointerDown,
    onClick: (e: any) => e.stopPropagation(),
    onPointerEnter: () => { document.body.style.cursor = "grab"; },
    onPointerLeave: () => { if (!dragPosRef.current) document.body.style.cursor = "default"; },
  };

  if (model) {
    return (
      <group {...groupProps}>
        <primitive object={model} />
      </group>
    );
  }

  // Fallback box while model loads (or when no GLB is set)
  return (
    <group {...groupProps}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color="#c4b5a0"
          emissive={selected ? "#ffff00" : "#000000"}
          emissiveIntensity={selected ? 0.3 : 0}
        />
      </mesh>
    </group>
  );
}

// ── 3D: Full scene ─────────────────────────────────────────────────────────
interface Scene3DProps {
  placed: PlacedItem[];
  roomW: number; roomD: number;
  roomOffsetX: number; roomOffsetY: number; scale: number;
  view: "2d" | "3d";
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdatePos: (id: string, xCm: number, yCm: number) => void;
}

function Scene3D({
  placed, roomW, roomD, roomOffsetX, roomOffsetY, scale,
  view, selectedId, onSelect, onUpdatePos,
}: Scene3DProps) {
  const rW = roomW * UNIT;
  const rD = roomD * UNIT;
  const wallH = 0.3;
  const wallT = 0.04;

  // ── Drag state ─────────────────────────────────────────────────────────
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const dragPosRef       = useRef<THREE.Vector3 | null>(null);
  const draggingIdRef    = useRef<string | null>(null); // ref copy for DOM handlers
  const preDragPosRef    = useRef<{ xCm: number; yCm: number } | null>(null);
  const placedRef        = useRef(placed);
  const orbitRef         = useRef<any>(null);
  const raycasterRef     = useRef(new THREE.Raycaster());
  const ndcRef           = useRef(new THREE.Vector2());
  const floorPlane       = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // Keep refs in sync with latest render values
  useLayoutEffect(() => { placedRef.current = placed; });

  // ── Three.js store ref (camera changes when CameraController swaps it) ─
  const store = useThree();
  const storeRef = useRef(store);
  useLayoutEffect(() => { storeRef.current = store; });

  // Stable refs for values used inside the event listener closure
  const roomRef = useRef({ roomW, roomD });
  useLayoutEffect(() => { roomRef.current = { roomW, roomD }; });
  const viewRef = useRef(view);
  useLayoutEffect(() => { viewRef.current = view; });
  const onUpdatePosRef = useRef(onUpdatePos);
  useLayoutEffect(() => { onUpdatePosRef.current = onUpdatePos; });
  const onSelectRef = useRef(onSelect);
  useLayoutEffect(() => { onSelectRef.current = onSelect; });

  // ── DOM-level pointer handlers (capture mouse even outside meshes) ──────
  useEffect(() => {
    const canvas = storeRef.current.gl.domElement;

    function onPointerMove(e: PointerEvent) {
      if (!draggingIdRef.current) return;
      const { camera, gl: glStore } = storeRef.current;
      const rect = glStore.domElement.getBoundingClientRect();
      ndcRef.current.set(
        ((e.clientX - rect.left) / rect.width)  *  2 - 1,
        ((e.clientY - rect.top)  / rect.height) * -2 + 1,
      );
      raycasterRef.current.setFromCamera(ndcRef.current, camera);
      const hit = new THREE.Vector3();
      if (!raycasterRef.current.ray.intersectPlane(floorPlane, hit)) return;

      // Clamp to room bounds
      const id = draggingIdRef.current;
      const item = placedRef.current.find((i) => i.id === id);
      if (!item) return;
      const { roomW: rW, roomD: rD } = roomRef.current;
      const halfRW = (rW * UNIT) / 2;
      const halfRD = (rD * UNIT) / 2;
      const halfIW = (eW(item) * UNIT) / 2;
      const halfID = (eH(item) * UNIT) / 2;
      hit.x = Math.max(-halfRW + halfIW, Math.min(halfRW - halfIW, hit.x));
      hit.z = Math.max(-halfRD + halfID, Math.min(halfRD - halfID, hit.z));
      dragPosRef.current = hit;
    }

    function onPointerUp() {
      const id = draggingIdRef.current;
      if (id && dragPosRef.current) {
        const item = placedRef.current.find((i) => i.id === id);
        if (item) {
          const { roomW: rW, roomD: rD } = roomRef.current;
          const finalX = dragPosRef.current.x;
          const finalZ = dragPosRef.current.z;
          const hw = (eW(item) * UNIT) / 2;
          const hd = (eH(item) * UNIT) / 2;
          const overlaps = wouldOverlapOthers(id, finalX, finalZ, hw, hd, placedRef.current, rW, rD);
          if (!overlaps) {
            const { xCm, yCm } = worldToItemPos(finalX, finalZ, eW(item), eH(item), rW, rD);
            onUpdatePosRef.current(id, xCm, yCm);
          } else if (preDragPosRef.current) {
            // Snap back: commit the pre-drag position so React re-renders to the old spot
            onUpdatePosRef.current(id, preDragPosRef.current.xCm, preDragPosRef.current.yCm);
          }
        }
      }
      draggingIdRef.current = null;
      dragPosRef.current    = null;
      preDragPosRef.current = null;
      setDraggingItemId(null);
      document.body.style.cursor = "default";
      if (orbitRef.current) orbitRef.current.enabled = viewRef.current === "3d";
    }

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup",   onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup",   onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once; all live values accessed via refs

  // ── Start drag (called from R3F pointer events on each furniture piece) ──
  function startDrag(e: any, item: PlacedItem) {
    e.stopPropagation();
    onSelectRef.current(item.id);
    const { x, z } = itemWorldPos(item, roomW, roomD, roomOffsetX, roomOffsetY, scale);
    draggingIdRef.current = item.id;
    dragPosRef.current    = new THREE.Vector3(x, 0, z);
    preDragPosRef.current = { xCm: item.xCm, yCm: item.yCm };
    setDraggingItemId(item.id);
    document.body.style.cursor = "grabbing";
    if (orbitRef.current) orbitRef.current.enabled = false;
  }

  return (
    <>
      <CameraController view={view} roomW={roomW} roomD={roomD} />
      <RendererSetup />
      <SceneBackground />

      <ambientLight intensity={2.5} color="white" />
      <directionalLight position={[5, 10, 5]} intensity={3} castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={1.5} />
      <hemisphereLight args={["white", "#c4b5a0", 1.5]} />

      <OrbitControls
        ref={orbitRef}
        makeDefault
        enablePan
        enableZoom
        enableRotate={view === "3d"}
      />

      {/* Grid — 2D only */}
      {view === "2d" && (
        <gridHelper
          args={[Math.max(rW, rD) * 2, 20, "#d1d5db", "#e5e7eb"]}
          position={[0, 0.002, 0]}
        />
      )}

      {/* Floor — always visible; click deselects */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onClick={() => onSelectRef.current(null)}
      >
        <planeGeometry args={[rW, rD]} />
        <meshStandardMaterial color="#c4b5a0" />
      </mesh>

      {/* Walls — always visible (appear as a thin border in 2D top-down view) */}
      <mesh position={[0, wallH / 2, -rD / 2]}>
        <boxGeometry args={[rW + wallT * 2, wallH, wallT]} />
        <meshStandardMaterial color="#e5e0db" />
      </mesh>
      <mesh position={[0, wallH / 2, rD / 2]}>
        <boxGeometry args={[rW + wallT * 2, wallH, wallT]} />
        <meshStandardMaterial color="#e5e0db" />
      </mesh>
      <mesh position={[-rW / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, rD]} />
        <meshStandardMaterial color="#e5e0db" />
      </mesh>
      <mesh position={[rW / 2, wallH / 2, 0]}>
        <boxGeometry args={[wallT, wallH, rD]} />
        <meshStandardMaterial color="#e5e0db" />
      </mesh>

      {/* Furniture */}
      {placed.map((item) => (
        <FurnitureMesh3D
          key={`${item.id}-${item.activeVariant?.name ?? ""}`}
          item={item}
          roomW={roomW} roomD={roomD}
          roomOffsetX={roomOffsetX} roomOffsetY={roomOffsetY}
          scale={scale}
          selected={item.id === selectedId}
          isDragging={item.id === draggingItemId}
          dragPosRef={dragPosRef}
          onPointerDown={(e) => startDrag(e, item)}
        />
      ))}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PlannerPage() {
  const [ready, setReady]     = useState(false);
  const [mounted, setMounted] = useState(false);
  const [view, setView]       = useState<"2d" | "3d">("3d");

  const [roomW, setRoomW]   = useState(500);
  const [roomD, setRoomD]   = useState(400);
  const [setupW, setSetupW] = useState("500");
  const [setupD, setSetupD] = useState("400");

  const [cvs, setCvs]               = useState({ w: 800, h: 600 });
  const containerRef                = useRef<HTMLDivElement>(null);
  const [products, setProducts]     = useState<Product[]>([]);
  const [placed, setPlaced]         = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragProduct                 = useRef<Product | null>(null);
  const [cartMsg, setCartMsg]       = useState<string | null>(null);
  const cartMsgTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addItem                     = useCartStore((s) => s.addItem);

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

  // ── Derived scale (still used for the camera-setup estimate in itemWorldPos) ──
  const availW = cvs.w - LABEL_PAD - ROOM_PAD * 2;
  const availH = cvs.h - LABEL_PAD - ROOM_PAD * 2;
  const scale  = Math.min(availW / roomW, availH / roomD, 5);
  const offX   = LABEL_PAD;
  const offY   = LABEL_PAD;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    const w = parseInt(setupW, 10);
    const d = parseInt(setupD, 10);
    if (!w || !d || w < 50 || d < 50) return;
    setRoomW(w); setRoomD(d); setReady(true);
  }

  // Drop from sidebar → find a free spot (scan grid) then place
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const p = dragProduct.current;
    if (!p) return;
    setPlaced((prev) => {
      const { xCm, yCm } = findFreePlacement(p.width, p.depth, prev, roomW, roomD);
      return [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          productId: p.id, name: p.name, price: p.price, category: p.category,
          xCm, yCm,
          widthCm: p.width, depthCm: p.depth,
          rotation: 0,
          variants: p.variants,
          imageUrl: p.imageUrl,
          modelUrl: p.modelUrl ?? "",
        },
      ];
    });
    dragProduct.current = null;
  }

  function rotateItem(id: string) {
    setPlaced((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const r = ((item.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        const newEW = (r === 0 || r === 180) ? item.widthCm : item.depthCm;
        const newEH = (r === 0 || r === 180) ? item.depthCm : item.widthCm;
        return {
          ...item, rotation: r,
          xCm: Math.min(item.xCm, roomW - newEW),
          yCm: Math.min(item.yCm, roomD - newEH),
        };
      }),
    );
  }

  function removeItem(id: string) {
    setPlaced((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
  }

  function setVariant(id: string, variant: Variant | null) {
    setPlaced((prev) =>
      prev.map((i) => (i.id === id ? { ...i, activeVariant: variant ?? undefined } : i)),
    );
  }

  function updateItemPos(id: string, xCm: number, yCm: number) {
    setPlaced((prev) =>
      prev.map((item) => (item.id === id ? { ...item, xCm, yCm } : item)),
    );
  }

  function addAllToCart() {
    if (cartMsgTimer.current) clearTimeout(cartMsgTimer.current);
    if (placed.length === 0) {
      setCartMsg("No items to add");
    } else {
      placed.forEach((item) => {
        addItem(
          { productId: item.productId, name: item.name, price: item.price, imageUrl: item.imageUrl, category: item.category },
          item.activeVariant?.name,
        );
      });
      setCartMsg(`Added ${placed.length} item${placed.length !== 1 ? "s" : ""} to cart`);
    }
    cartMsgTimer.current = setTimeout(() => setCartMsg(null), 2000);
  }

  // ── Sidebar grouping ──────────────────────────────────────────────────────
  const grouped: Record<string, Product[]> = {};
  products.forEach((p) => { (grouped[p.category] ??= []).push(p); });

  const selectedItem    = placed.find((i) => i.id === selectedId) ?? null;
  const selectedVariants: Variant[] = (() => {
    try { return JSON.parse(selectedItem?.variants ?? "[]"); } catch { return []; }
  })();

  // ── Room setup screen ─────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-[calc(100vh-76px)] flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm border border-gray-200 p-8">
          <h1 className="text-2xl tracking-tight mb-2">Set Up Your Room</h1>
          <p className="text-sm text-[#6b7280] mb-8">
            Enter your room dimensions to start planning.
          </p>
          <form onSubmit={handleSetup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#6b7280] uppercase tracking-wider">Room Width (cm)</label>
              <input type="number" min="50" max="2000" value={setupW}
                onChange={(e) => setSetupW(e.target.value)} className={inputCls} placeholder="500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#6b7280] uppercase tracking-wider">Room Depth (cm)</label>
              <input type="number" min="50" max="2000" value={setupD}
                onChange={(e) => setSetupD(e.target.value)} className={inputCls} placeholder="400" />
            </div>
            <button type="submit"
              className="mt-2 px-6 py-3 bg-[#0a0a0a] text-white text-sm hover:bg-[#2a2a2a] transition-colors">
              Start Planning
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Full planner ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white text-[#0a0a0a] overflow-hidden"
      style={{ height: "calc(100vh - 76px)" }}>

      {/* ── Toolbar ── */}
      <div className="shrink-0 flex items-center gap-4 px-5 py-2.5 border-b border-gray-100 text-sm">
        <span className="text-[#6b7280]">{roomW} cm × {roomD} cm</span>
        <div className="flex-1" />

        <div className="flex border border-gray-200 overflow-hidden">
          <button onClick={() => setView("2d")}
            className={`px-4 py-1.5 transition-colors ${view === "2d" ? "bg-[#0a0a0a] text-white" : "hover:bg-gray-50 text-[#0a0a0a]"}`}>
            2D
          </button>
          <button onClick={() => setView("3d")}
            className={`px-4 py-1.5 border-l border-gray-200 transition-colors ${view === "3d" ? "bg-[#0a0a0a] text-white" : "hover:bg-gray-50 text-[#0a0a0a]"}`}>
            3D
          </button>
        </div>

        <button
          onClick={addAllToCart}
          className="px-4 py-1.5 border border-gray-200 hover:border-gray-400 text-[#6b7280] transition-colors">
          Add All to Cart
        </button>

        {cartMsg && (
          <span className="text-xs text-[#6b7280]">{cartMsg}</span>
        )}

        <button
          onClick={() => {
            if (!placed.length) return;
            if (confirm("Remove all placed furniture?")) { setPlaced([]); setSelectedId(null); }
          }}
          className="px-4 py-1.5 border border-gray-200 hover:border-gray-400 text-[#6b7280] transition-colors">
          Clear All
        </button>
      </div>

      {/* ── Three panels ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ── */}
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

        {/* ── Canvas area ── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
        >
          {mounted && (
            <>
              <Canvas
                camera={{ position: [0, 8, 10], fov: 50 }}
                style={{ width: "100%", height: "100%" }}
                shadows
              >
                <Scene3D
                  placed={placed}
                  roomW={roomW} roomD={roomD}
                  roomOffsetX={offX} roomOffsetY={offY}
                  scale={scale}
                  view={view}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onUpdatePos={updateItemPos}
                />
              </Canvas>

              {view === "3d" && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs text-[#6b7280] bg-white/80 pointer-events-none">
                  Drag to orbit · scroll to zoom · right-drag to pan
                </div>
              )}
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
                <p className="text-xs text-[#6b7280] mt-1">
                  {eW(selectedItem)} cm × {eH(selectedItem)} cm
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-2">Orientation</p>
                <button
                  onClick={() => rotateItem(selectedItem.id)}
                  className="w-full py-2 border border-gray-200 text-sm hover:border-gray-400 transition-colors"
                >
                  Rotate 90°
                </button>
              </div>
              <div>
                  <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-2">Variants</p>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Default card — always first */}
                    <button
                      onClick={() => setVariant(selectedItem.id, null)}
                      className={`flex flex-col gap-1 p-1 border transition-colors ${
                        !selectedItem.activeVariant ? "border-[#0a0a0a]" : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <div
                        className="w-full aspect-square"
                        style={
                          selectedItem.imageUrl
                            ? { backgroundImage: `url(${selectedItem.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                            : { background: "#c4b5a0" }
                        }
                      />
                      <p className="text-[10px] leading-snug text-center truncate w-full px-0.5">
                        Default
                      </p>
                    </button>

                    {/* Named variant cards */}
                    {selectedVariants.map((v) => {
                      const isActive = selectedItem.activeVariant?.name === v.name;
                      return (
                        <button
                          key={v.name}
                          onClick={() => setVariant(selectedItem.id, v)}
                          className={`flex flex-col gap-1 p-1 border transition-colors ${
                            isActive ? "border-[#0a0a0a]" : "border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          <div
                            className="w-full aspect-square"
                            style={
                              v.imageUrl
                                ? { backgroundImage: `url(${v.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                                : { background: "#c4b5a0" }
                            }
                          />
                          <p className="text-[10px] leading-snug text-center truncate w-full px-0.5">
                            {v.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              <button
                onClick={() => removeItem(selectedItem.id)}
                className="w-full py-2 border border-red-200 text-sm text-red-500 hover:border-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <p className="text-xs text-[#6b7280] mt-4">
              {placed.length === 0
                ? "Drag furniture from the left panel to place it."
                : "Click a piece to select it."}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
