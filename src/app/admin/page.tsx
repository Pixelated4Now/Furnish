"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  price: number;
  description: string;
  imageUrl: string;
  modelUrl: string;
  width: number;
  depth: number;
  variants: string;
}

interface Category {
  id: number;
  name: string;
  imageUrl: string;
  slug: string;
}

interface Stats {
  totalProducts: number;
  totalCategories: number;
  totalUsers: number;
}

type FormMode = "add" | "edit";

const EMPTY_FORM = {
  name: "",
  category: "Sofa",
  price: "",
  description: "",
  imageUrl: "",
  modelUrl: "",
  width: "",
  depth: "",
};

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();

  // Auth
  const [authChecked, setAuthChecked] = useState(false);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Product form state
  const [formMode, setFormMode] = useState<FormMode>("add");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSaving, setFormSaving] = useState(false);

  // Variant builder state
  const [variants, setVariants] = useState<Variant[]>([]);

  // Category form state
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [catFormMode, setCatFormMode] = useState<"add" | "edit">("add");
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ name: "", slug: "", imageUrl: "" });
  const [catFormErrors, setCatFormErrors] = useState<Record<string, string>>({});
  const [catFormSaving, setCatFormSaving] = useState(false);

  // Feedback
  const [successMsg, setSuccessMsg] = useState("");

  const formRef = useRef<HTMLDivElement>(null);
  const catFormRef = useRef<HTMLDivElement>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) { router.replace("/auth/login"); return; }
        if (data.user.role !== "admin") { router.replace("/shop"); return; }
        setAuthChecked(true);
      })
      .catch(() => router.replace("/auth/login"));
  }, [router]);

  // ── Data fetching ───────────────────────────────────────────────────────

  function loadProducts() {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []));
  }

  function loadStats() {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setStats(d));
  }

  function loadCategories() {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    if (!authChecked) return;
    loadProducts();
    loadStats();
    loadCategories();
  }, [authChecked]);

  // ── Feedback ────────────────────────────────────────────────────────────

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  // ── Product form helpers ─────────────────────────────────────────────────

  function openAdd() {
    setForm(EMPTY_FORM);
    setVariants([]);
    setFormErrors({});
    setFormMode("add");
    setEditingId(null);
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      category: p.category,
      price: String(p.price),
      description: p.description,
      imageUrl: p.imageUrl,
      modelUrl: p.modelUrl,
      width: String(p.width),
      depth: String(p.depth),
    });
    try {
      const parsed: Variant[] = JSON.parse(p.variants);
      setVariants(Array.isArray(parsed) ? parsed.map((v) => ({
        name: v.name ?? "",
        modelUrl: v.modelUrl ?? "",
        imageUrl: v.imageUrl ?? "",
      })) : []);
    } catch {
      setVariants([]);
    }
    setFormErrors({});
    setFormMode("edit");
    setEditingId(p.id);
    setFormOpen(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setVariants([]);
    setFormErrors({});
  }

  function updateVariant(idx: number, key: keyof Variant, value: string) {
    setVariants((prev) => prev.map((v, i) => i === idx ? { ...v, [key]: value } : v));
  }

  function removeVariant(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  function addVariant() {
    setVariants((prev) => [...prev, { name: "", modelUrl: "", imageUrl: "" }]);
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.price || isNaN(Number(form.price))) errs.price = "Valid price required";
    if (!form.description.trim()) errs.description = "Description is required";
    if (!form.imageUrl.trim()) errs.imageUrl = "Image URL is required";
    if (!form.modelUrl.trim()) errs.modelUrl = "Model URL is required";
    if (!form.width || isNaN(Number(form.width))) errs.width = "Valid width required";
    if (!form.depth || isNaN(Number(form.depth))) errs.depth = "Valid depth required";
    const names = variants.map((v) => v.name.trim()).filter(Boolean);
    if (new Set(names).size !== names.length) errs.variants = "Duplicate variant names are not allowed";
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    setFormSaving(true);
    const body = {
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      modelUrl: form.modelUrl.trim(),
      width: Number(form.width),
      depth: Number(form.depth),
      variants: JSON.stringify(variants.map((v) => ({
        name: v.name.trim(),
        modelUrl: v.modelUrl.trim(),
        imageUrl: v.imageUrl.trim(),
      }))),
    };

    const url = formMode === "edit" ? `/api/admin/products/${editingId}` : "/api/admin/products";
    const method = formMode === "edit" ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Request failed");
      closeForm();
      loadProducts();
      loadStats();
      flash(formMode === "edit" ? "Product updated." : "Product added.");
    } catch {
      setFormErrors({ _: "Something went wrong. Please try again." });
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    loadProducts();
    loadStats();
    flash("Product deleted.");
  }

  function field(key: keyof typeof EMPTY_FORM, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    if (formErrors[key]) setFormErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  // ── Category form helpers ────────────────────────────────────────────────

  function openAddCat() {
    setCatForm({ name: "", slug: "", imageUrl: "" });
    setCatFormErrors({});
    setCatFormMode("add");
    setEditingCatId(null);
    setCatFormOpen(true);
    setTimeout(() => catFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function openEditCat(c: Category) {
    setCatForm({ name: c.name, slug: c.slug, imageUrl: c.imageUrl });
    setCatFormErrors({});
    setCatFormMode("edit");
    setEditingCatId(c.id);
    setCatFormOpen(true);
    setTimeout(() => catFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function closeCatForm() {
    setCatFormOpen(false);
    setEditingCatId(null);
    setCatFormErrors({});
  }

  function catField(key: "name" | "slug" | "imageUrl", val: string) {
    setCatForm((f) => {
      const next = { ...f, [key]: val };
      if (key === "name") {
        next.slug = val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      }
      return next;
    });
    if (catFormErrors[key]) setCatFormErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  async function handleSaveCat() {
    const errs: Record<string, string> = {};
    if (!catForm.name.trim()) errs.name = "Name is required";
    if (!catForm.slug.trim()) errs.slug = "Slug is required";
    if (Object.keys(errs).length) { setCatFormErrors(errs); return; }
    setCatFormSaving(true);
    const url = catFormMode === "edit" ? `/api/admin/categories/${editingCatId}` : "/api/admin/categories";
    const method = catFormMode === "edit" ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catForm.name.trim(), slug: catForm.slug.trim(), imageUrl: catForm.imageUrl.trim() }),
      });
      if (!res.ok) throw new Error();
      closeCatForm();
      loadCategories();
      flash(catFormMode === "edit" ? "Category updated." : "Category added.");
    } catch {
      setCatFormErrors({ _: "Something went wrong. Please try again." });
    } finally {
      setCatFormSaving(false);
    }
  }

  async function handleDeleteCat(id: number, name: string) {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    loadCategories();
    flash("Category deleted.");
  }

  // ── Loading / auth ──────────────────────────────────────────────────────

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-white min-h-screen text-[#0a0a0a]">

      {/* ── Header ── */}
      <section className="px-8 pt-10 pb-12">
        <h1 className="text-5xl sm:text-6xl leading-tight tracking-tight">
          Admin Dashboard
        </h1>
        {successMsg && (
          <p className="mt-4 text-sm text-[#6b7280]">{successMsg}</p>
        )}
      </section>

      {/* ── Stats ── */}
      <section className="px-8 pb-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Products",   value: stats?.totalProducts },
            { label: "Total Categories", value: stats?.totalCategories },
            { label: "Total Users",      value: stats?.totalUsers },
          ].map(({ label, value }) => (
            <div key={label} className="border border-gray-200 px-6 py-8">
              <p className="text-4xl sm:text-5xl tracking-tight tabular-nums">
                {value ?? <span className="inline-block h-10 w-16 bg-gray-100 rounded animate-pulse" />}
              </p>
              <p className="mt-2 text-xs text-[#6b7280] uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Product Form ── */}
      {formOpen && (
        <section ref={formRef} className="px-8 pb-14">
          <div className="border border-gray-200 p-8">
            <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-8">
              {formMode === "add" ? "Add Product" : "Edit Product"}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Name */}
              <FormField label="Name" error={formErrors.name}>
                <input
                  type="text" value={form.name}
                  onChange={(e) => field("name", e.target.value)}
                  className={inputCls(!!formErrors.name)}
                  placeholder="Oslo 3-Seat Sofa"
                />
              </FormField>

              {/* Category */}
              <FormField label="Category" error={formErrors.category}>
                <select
                  value={form.category}
                  onChange={(e) => field("category", e.target.value)}
                  className={inputCls(false)}
                >
                  {categories.length === 0 ? (
                    <option value="">Loading categories…</option>
                  ) : (
                    categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)
                  )}
                </select>
              </FormField>

              {/* Price */}
              <FormField label="Price (USD)" error={formErrors.price}>
                <input
                  type="number" min="0" step="0.01" value={form.price}
                  onChange={(e) => field("price", e.target.value)}
                  className={inputCls(!!formErrors.price)}
                  placeholder="0.00"
                />
              </FormField>

              {/* Width */}
              <FormField label="Width (cm)" error={formErrors.width}>
                <input
                  type="number" min="0" value={form.width}
                  onChange={(e) => field("width", e.target.value)}
                  className={inputCls(!!formErrors.width)}
                  placeholder="220"
                />
              </FormField>

              {/* Depth */}
              <FormField label="Depth (cm)" error={formErrors.depth}>
                <input
                  type="number" min="0" value={form.depth}
                  onChange={(e) => field("depth", e.target.value)}
                  className={inputCls(!!formErrors.depth)}
                  placeholder="90"
                />
              </FormField>

              {/* Image URL */}
              <FormField label="Image URL" error={formErrors.imageUrl}>
                <input
                  type="text" value={form.imageUrl}
                  onChange={(e) => field("imageUrl", e.target.value)}
                  className={inputCls(!!formErrors.imageUrl)}
                  placeholder="/images/product-1.jpg"
                />
              </FormField>

              {/* Model URL */}
              <FormField label="Model URL" error={formErrors.modelUrl}>
                <input
                  type="text" value={form.modelUrl}
                  onChange={(e) => field("modelUrl", e.target.value)}
                  className={inputCls(!!formErrors.modelUrl)}
                  placeholder="/models/product-1.glb"
                />
              </FormField>

              {/* Description — full width */}
              <FormField label="Description" error={formErrors.description} wide>
                <textarea
                  rows={3} value={form.description}
                  onChange={(e) => field("description", e.target.value)}
                  className={inputCls(!!formErrors.description) + " resize-none"}
                  placeholder="Describe the product…"
                />
              </FormField>

              {/* Variants — full width builder */}
              <div className="sm:col-span-2 flex flex-col gap-3">
                <label className="text-xs text-[#6b7280] uppercase tracking-wider">
                  Variants
                </label>

                {/* Compute which rows have duplicate names (real-time, no save needed) */}
                {(() => {
                  const nameCounts: Record<string, number[]> = {};
                  variants.forEach((v, i) => {
                    const n = v.name.trim();
                    if (n) (nameCounts[n] ??= []).push(i);
                  });
                  const dupIdx = new Set<number>();
                  Object.values(nameCounts).forEach((idxs) => {
                    if (idxs.length > 1) idxs.forEach((i) => dupIdx.add(i));
                  });

                  return variants.map((v, idx) => {
                    const isDup = dupIdx.has(idx);
                    return (
                      <div key={idx} className="flex gap-2 items-start border border-gray-100 p-3">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">Name</span>
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) => updateVariant(idx, "name", e.target.value)}
                              className={inputCls(isDup)}
                              placeholder="Oak"
                            />
                            {isDup && (
                              <p className="text-[10px] text-red-500">Duplicate name</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">Model URL</span>
                            <input
                              type="text"
                              value={v.modelUrl}
                              onChange={(e) => updateVariant(idx, "modelUrl", e.target.value)}
                              className={inputCls(false)}
                              placeholder="/models/chair-oak.glb"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">Image URL</span>
                            <input
                              type="text"
                              value={v.imageUrl}
                              onChange={(e) => updateVariant(idx, "imageUrl", e.target.value)}
                              className={inputCls(false)}
                              placeholder="/images/chair-oak.jpg"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariant(idx)}
                          className="mt-5 px-2 py-0.5 text-sm text-[#6b7280] border border-gray-200 hover:border-gray-400 hover:text-[#0a0a0a] transition-colors"
                          aria-label="Remove variant"
                        >
                          ×
                        </button>
                      </div>
                    );
                  });
                })()}

                {formErrors.variants && (
                  <p className="text-xs text-red-500">{formErrors.variants}</p>
                )}

                <button
                  type="button"
                  onClick={addVariant}
                  className="self-start px-4 py-2 border border-gray-200 text-sm hover:border-gray-400 transition-colors"
                >
                  + Add Variant
                </button>
              </div>
            </div>

            {formErrors._ && (
              <p className="mt-4 text-sm text-red-600">{formErrors._}</p>
            )}

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleSave}
                disabled={formSaving}
                className="px-6 py-3 bg-[#0a0a0a] text-white text-sm hover:bg-[#2a2a2a] disabled:opacity-50 transition-colors"
              >
                {formSaving ? "Saving…" : "Save Product"}
              </button>
              <button
                onClick={closeForm}
                className="px-6 py-3 border border-gray-200 text-sm hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Product Table ── */}
      <section className="px-8 pb-24">
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs uppercase tracking-widest text-[#6b7280]">Products</p>
          <button
            onClick={openAdd}
            className="px-5 py-2.5 border border-[#0a0a0a] text-sm hover:bg-gray-50 transition-colors"
          >
            Add Product
          </button>
        </div>

        {/* Responsive table wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {["Name", "Category", "Price", "Width", "Depth", "Actions"].map((h) => (
                  <th key={h} className="pb-3 pr-8 text-xs text-[#6b7280] uppercase tracking-widest last:pr-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6b7280] text-xs">
                    No products yet. Add your first product.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 pr-8">{p.name}</td>
                    <td className="py-4 pr-8 text-[#6b7280]">{p.category}</td>
                    <td className="py-4 pr-8 tabular-nums">
                      ${p.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 pr-8 tabular-nums text-[#6b7280]">{p.width} cm</td>
                    <td className="py-4 pr-8 tabular-nums text-[#6b7280]">{p.depth} cm</td>
                    <td className="py-4">
                      <div className="flex gap-5">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-[#0a0a0a] underline underline-offset-2 hover:opacity-60 transition-opacity"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          className="text-red-500 underline underline-offset-2 hover:opacity-60 transition-opacity"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Category Form ── */}
      {catFormOpen && (
        <section ref={catFormRef} className="px-8 pb-14">
          <div className="border border-gray-200 p-8">
            <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-8">
              {catFormMode === "add" ? "Add Category" : "Edit Category"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField label="Name" error={catFormErrors.name}>
                <input type="text" value={catForm.name} onChange={(e) => catField("name", e.target.value)}
                  className={inputCls(!!catFormErrors.name)} placeholder="Living Room" />
              </FormField>
              <FormField label="Slug" error={catFormErrors.slug}>
                <input type="text" value={catForm.slug} onChange={(e) => catField("slug", e.target.value)}
                  className={inputCls(!!catFormErrors.slug)} placeholder="living-room" />
              </FormField>
              <FormField label="Image URL" error={catFormErrors.imageUrl} wide>
                <input type="text" value={catForm.imageUrl} onChange={(e) => catField("imageUrl", e.target.value)}
                  className={inputCls(!!catFormErrors.imageUrl)} placeholder="/images/cat-living-room.jpg" />
              </FormField>
            </div>
            {catFormErrors._ && <p className="mt-4 text-sm text-red-600">{catFormErrors._}</p>}
            <div className="mt-8 flex gap-4">
              <button onClick={handleSaveCat} disabled={catFormSaving}
                className="px-6 py-3 bg-[#0a0a0a] text-white text-sm hover:bg-[#2a2a2a] disabled:opacity-50 transition-colors">
                {catFormSaving ? "Saving…" : "Save Category"}
              </button>
              <button onClick={closeCatForm}
                className="px-6 py-3 border border-gray-200 text-sm hover:border-gray-400 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Category Table ── */}
      <section className="px-8 pb-24">
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs uppercase tracking-widest text-[#6b7280]">Categories</p>
          <button onClick={openAddCat}
            className="px-5 py-2.5 border border-[#0a0a0a] text-sm hover:bg-gray-50 transition-colors">
            Add Category
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {["Name", "Slug", "Image URL", "Actions"].map((h) => (
                  <th key={h} className="pb-3 pr-8 text-xs text-[#6b7280] uppercase tracking-widest last:pr-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-[#6b7280] text-xs">No categories yet. Add your first category.</td></tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 pr-8">{c.name}</td>
                    <td className="py-4 pr-8 text-[#6b7280]">{c.slug}</td>
                    <td className="py-4 pr-8 text-[#6b7280] truncate max-w-xs">{c.imageUrl || "—"}</td>
                    <td className="py-4">
                      <div className="flex gap-5">
                        <button onClick={() => openEditCat(c)}
                          className="text-[#0a0a0a] underline underline-offset-2 hover:opacity-60 transition-opacity">Edit</button>
                        <button onClick={() => handleDeleteCat(c.id, c.name)}
                          className="text-red-500 underline underline-offset-2 hover:opacity-60 transition-opacity">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-8 pt-20 pb-10 border-t border-gray-100">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <p className="text-7xl sm:text-8xl lg:text-9xl leading-none tracking-tight select-none">
            Furnish.
          </p>
          <nav className="flex flex-col gap-3 text-sm text-[#0a0a0a] md:text-right">
            <Link href="/" className="hover:opacity-60 transition-opacity">Home</Link>
            <Link href="/shop" className="hover:opacity-60 transition-opacity">Shop</Link>
            <Link href="/planner" className="hover:opacity-60 transition-opacity">3D Preview</Link>
          </nav>
        </div>
        <p className="mt-16 text-xs text-[#6b7280]">© 2026 Furnish. All rights reserved.</p>
      </footer>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function inputCls(hasError: boolean) {
  return [
    "w-full px-3 py-2 text-sm border focus:outline-none focus:ring-1 focus:ring-[#0a0a0a] transition",
    hasError ? "border-red-400" : "border-gray-200 focus:border-[#0a0a0a]",
  ].join(" ");
}

function FormField({
  label, error, wide = false, children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <label className="text-xs text-[#6b7280] uppercase tracking-wider">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
