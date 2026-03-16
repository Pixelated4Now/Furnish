"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text, Line, Group } from "react-konva";

// ── Constants ──────────────────────────────────────────────────────────────
const LABEL_PAD = 44;   // px reserved for dimension labels (top + left)
const ROOM_PAD  = 20;   // px padding around the drawn room inside the canvas
const GRID_CM   = 50;   // grid snapping and line interval in cm
const FILL      = "#c4b5a0";
const GRID_CLR  = "#e5e7eb";

// ── Types ──────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
  width: number;   // cm
  depth: number;   // cm
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
  rotation: number; // 0 | 90
  variant?: string;
  variants: string;
  imageUrl: string;
}

// ── Pure helpers ───────────────────────────────────────────────────────────
function snapCm(v: number) { return Math.round(v / GRID_CM) * GRID_CM; }
function eW(i: PlacedItem) { return i.rotation === 0 ? i.widthCm : i.depthCm; }
function eH(i: PlacedItem) { return i.rotation === 0 ? i.depthCm : i.widthCm; }

function overlaps(a: PlacedItem, b: PlacedItem) {
  return !(
    a.xCm + eW(a) <= b.xCm || b.xCm + eW(b) <= a.xCm ||
    a.yCm + eH(a) <= b.yCm || b.yCm + eH(b) <= a.yCm
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0a0a0a] focus:border-[#0a0a0a] transition";

// ── Main component ─────────────────────────────────────────────────────────
export default function PlannerPage() {
  // Phase gate
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Room dimensions
  const [roomW, setRoomW] = useState(500);
  const [roomD, setRoomD] = useState(400);
  const [setupW, setSetupW] = useState("500");
  const [setupD, setSetupD] = useState("400");

  // Canvas size (measured from the container div)
  const [cvs, setCvs] = useState({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [placed, setPlaced] = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Drag
  const dragProduct = useRef<Product | null>(null);

  // Toast
  const [toast, setToast] = useState("");

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
  }, [ready]); // re-observe when layout mounts

  // ── Derived scale ─────────────────────────────────────────────────────────
  const availW = cvs.w - LABEL_PAD - ROOM_PAD * 2;
  const availH = cvs.h - LABEL_PAD - ROOM_PAD * 2;
  const scale  = Math.min(availW / roomW, availH / roomD, 5); // max 5 px/cm
  const offX   = LABEL_PAD;   // room top-left X on stage
  const offY   = LABEL_PAD;   // room top-left Y on stage
  const roomPxW = roomW * scale;
  const roomPxH = roomD * scale;

  // ── Toast helper ─────────────────────────────────────────────────────────
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  // ── Room setup ────────────────────────────────────────────────────────────
  function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    const w = parseInt(setupW, 10);
    const d = parseInt(setupD, 10);
    if (!w || !d || w < 50 || d < 50) return;
    setRoomW(w);
    setRoomD(d);
    setReady(true);
  }

  // ── Drop from sidebar ─────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const p = dragProduct.current;
    if (!p || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - offX) / scale;
    const rawY = (e.clientY - rect.top  - offY) / scale;

    const xCm = Math.max(0, Math.min(snapCm(rawX), roomW - p.width));
    const yCm = Math.max(0, Math.min(snapCm(rawY), roomD - p.depth));

    const item: PlacedItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      productId: p.id,
      name: p.name,
      xCm,
      yCm,
      widthCm: p.width,
      depthCm: p.depth,
      rotation: 0,
      variants: p.variants,
      imageUrl: p.imageUrl,
    };
    setPlaced((prev) => [...prev, item]);
    dragProduct.current = null;
  }

  // ── Item actions ──────────────────────────────────────────────────────────
  function rotateItem(id: string) {
    setPlaced((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newRot = item.rotation === 0 ? 90 : 0;
        const newEW  = newRot === 0 ? item.widthCm : item.depthCm;
        const newEH  = newRot === 0 ? item.depthCm : item.widthCm;
        return {
          ...item,
          rotation: newRot,
          xCm: Math.min(item.xCm, roomW - newEW),
          yCm: Math.min(item.yCm, roomD - newEH),
        };
      })
    );
  }

  function removeItem(id: string) {
    setPlaced((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
  }

  function setVariant(id: string, variant: string) {
    setPlaced((prev) => prev.map((i) => (i.id === id ? { ...i, variant } : i)));
  }

  // ── Sidebar grouping ──────────────────────────────────────────────────────
  const grouped: Record<string, Product[]> = {};
  products.forEach((p) => {
    (grouped[p.category] ??= []).push(p);
  });

  const selectedItem = placed.find((i) => i.id === selectedId) ?? null;
  const selectedVariants: { color: string }[] = (() => {
    try { return JSON.parse(selectedItem?.variants ?? "[]"); }
    catch { return []; }
  })();

  // ── Grid lines ────────────────────────────────────────────────────────────
  const gridLines = [];
  for (let x = 0; x <= roomW; x += GRID_CM) {
    gridLines.push(
      <Line key={`v${x}`}
        points={[offX + x * scale, offY, offX + x * scale, offY + roomPxH]}
        stroke={GRID_CLR} strokeWidth={0.5} listening={false} />
    );
  }
  for (let y = 0; y <= roomD; y += GRID_CM) {
    gridLines.push(
      <Line key={`h${y}`}
        points={[offX, offY + y * scale, offX + roomPxW, offY + y * scale]}
        stroke={GRID_CLR} strokeWidth={0.5} listening={false} />
    );
  }

  // ── Render: Room setup ────────────────────────────────────────────────────
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
              <label className="text-xs text-[#6b7280] uppercase tracking-wider">
                Room Width (cm)
              </label>
              <input
                type="number" min="50" max="2000"
                value={setupW} onChange={(e) => setSetupW(e.target.value)}
                className={inputCls} placeholder="500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#6b7280] uppercase tracking-wider">
                Room Depth (cm)
              </label>
              <input
                type="number" min="50" max="2000"
                value={setupD} onChange={(e) => setSetupD(e.target.value)}
                className={inputCls} placeholder="400"
              />
            </div>
            <button
              type="submit"
              className="mt-2 px-6 py-3 bg-[#0a0a0a] text-white text-sm hover:bg-[#2a2a2a] transition-colors"
            >
              Start Planning
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Render: Full planner ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white text-[#0a0a0a] overflow-hidden"
         style={{ height: "calc(100vh - 76px)" }}>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-[#0a0a0a] text-white text-sm">
          {toast}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="shrink-0 flex items-center gap-6 px-5 py-2.5 border-b border-gray-100 text-sm">
        <span className="text-[#6b7280]">{roomW} cm × {roomD} cm</span>
        <div className="flex-1" />
        <button
          onClick={() => showToast("3D view coming soon.")}
          className="px-4 py-1.5 border border-gray-200 hover:border-gray-400 transition-colors"
        >
          2D / 3D
        </button>
        <button
          onClick={() => {
            if (!placed.length) return;
            if (confirm("Remove all placed furniture?")) {
              setPlaced([]);
              setSelectedId(null);
            }
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
          <p className="px-3 pt-4 pb-2 text-xs uppercase tracking-widest text-[#6b7280]">
            Furniture
          </p>
          {Object.entries(grouped).map(([cat, prods]) => (
            <div key={cat}>
              <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-[#6b7280] bg-gray-50">
                {cat}
              </p>
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
                  <div className="w-full aspect-square" style={{ background: FILL }} />
                  <p className="text-[11px] leading-snug truncate">{product.name}</p>
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* ── Canvas ── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden"
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
        >
          {mounted && (
            <Stage
              width={cvs.w}
              height={cvs.h}
              onClick={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
            >
              <Layer>
                {/* Room fill */}
                <Rect
                  x={offX} y={offY}
                  width={roomPxW} height={roomPxH}
                  fill="white" stroke="#0a0a0a" strokeWidth={1.5}
                  listening={false}
                />

                {/* Grid */}
                {gridLines}

                {/* Dimension labels */}
                <Text
                  x={offX} y={offY - LABEL_PAD + 6}
                  width={roomPxW}
                  text={`${roomW} cm`}
                  fontSize={11} fill="#6b7280" align="center"
                  listening={false}
                />
                <Text
                  x={offX - LABEL_PAD + 6}
                  y={offY + roomPxH}
                  width={roomPxH}
                  text={`${roomD} cm`}
                  fontSize={11} fill="#6b7280" align="center"
                  rotation={-90}
                  listening={false}
                />

                {/* Placed furniture */}
                {placed.map((item) => {
                  const pw = eW(item) * scale;
                  const ph = eH(item) * scale;
                  const px = offX + item.xCm * scale;
                  const py = offY + item.yCm * scale;
                  const isOverlapping = placed.some(
                    (o) => o.id !== item.id && overlaps(item, o)
                  );
                  const isSelected = selectedId === item.id;
                  const stroke = isOverlapping
                    ? "#ef4444"
                    : isSelected
                    ? "#3b82f6"
                    : "#0a0a0a";
                  const strokeWidth = isSelected ? 2 : 1;
                  const fontSize = Math.max(8, Math.min(11, pw / 7));
                  const label = item.variant
                    ? `${item.name}\n${item.variant}`
                    : item.name;

                  return (
                    <Group
                      key={item.id}
                      x={px} y={py}
                      draggable
                      dragBoundFunc={(pos) => ({
                        x: Math.max(offX, Math.min(offX + roomPxW - pw, pos.x)),
                        y: Math.max(offY, Math.min(offY + roomPxH - ph, pos.y)),
                      })}
                      onDragEnd={(e: any) => {
                        const rawX = (e.target.x() - offX) / scale;
                        const rawY = (e.target.y() - offY) / scale;
                        const snX = Math.max(0, Math.min(snapCm(rawX), roomW - eW(item)));
                        const snY = Math.max(0, Math.min(snapCm(rawY), roomD - eH(item)));
                        setPlaced((prev) =>
                          prev.map((i) =>
                            i.id === item.id ? { ...i, xCm: snX, yCm: snY } : i
                          )
                        );
                        // Snap the node visually too
                        e.target.x(offX + snX * scale);
                        e.target.y(offY + snY * scale);
                      }}
                      onClick={(e: any) => {
                        e.cancelBubble = true;
                        setSelectedId(item.id);
                      }}
                    >
                      <Rect
                        width={pw} height={ph}
                        fill={FILL}
                        stroke={stroke} strokeWidth={strokeWidth}
                      />
                      <Text
                        width={pw} height={ph}
                        text={label}
                        fontSize={fontSize}
                        fill="#0a0a0a"
                        align="center"
                        verticalAlign="middle"
                        padding={4}
                        wrap="word"
                        listening={false}
                      />
                    </Group>
                  );
                })}
              </Layer>
            </Stage>
          )}
        </div>

        {/* ── Properties panel ── */}
        <aside className="w-52 shrink-0 border-l border-gray-100 overflow-y-auto p-4">
          {selectedItem ? (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-1">
                  Selected
                </p>
                <p className="text-base leading-snug">{selectedItem.name}</p>
                <p className="text-xs text-[#6b7280] mt-1">
                  {eW(selectedItem)} cm × {eH(selectedItem)} cm
                </p>
              </div>

              {/* Rotate */}
              <div>
                <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-2">
                  Orientation
                </p>
                <button
                  onClick={() => rotateItem(selectedItem.id)}
                  className="w-full py-2 border border-gray-200 text-sm hover:border-gray-400 transition-colors"
                >
                  Rotate 90°
                </button>
              </div>

              {/* Variants */}
              {selectedVariants.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-2">
                    Variant
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVariants.map((v) => (
                      <button
                        key={v.color}
                        onClick={() => setVariant(selectedItem.id, v.color)}
                        className={`px-2.5 py-1 text-xs border transition-colors ${
                          selectedItem.variant === v.color
                            ? "border-[#0a0a0a] text-[#0a0a0a]"
                            : "border-gray-200 text-[#6b7280] hover:border-gray-400"
                        }`}
                      >
                        {v.color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Remove */}
              <button
                onClick={() => removeItem(selectedItem.id)}
                className="w-full py-2 border border-red-200 text-sm text-red-500 hover:border-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <p className="text-xs text-[#6b7280] mt-4">
              Select a piece to edit.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
