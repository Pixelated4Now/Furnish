import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.resolve(__dirname, "../dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  await prisma.user.upsert({
    where: { email: "admin@furnish.com" },
    update: {},
    create: { name: "Admin", email: "admin@furnish.com", password: adminPassword, role: "admin" },
  });

  await prisma.user.upsert({
    where: { email: "john@furnish.com" },
    update: {},
    create: { name: "John Doe", email: "john@furnish.com", password: userPassword, role: "user" },
  });

  // Products
  const products = [
    {
      name: "Oslo 3-Seat Sofa",
      price: 1299.99,
      category: "Sofa",
      description: "A spacious Scandinavian-style sofa with deep cushions and solid oak legs. Perfect for large living rooms.",
      imageUrl: "/images/product-1.jpg",
      modelUrl: "/models/product-1.glb",
      width: 220,
      depth: 90,
      variants: JSON.stringify([
        { name: "Charcoal Grey", modelUrl: "/models/product-1-charcoal.glb", imageUrl: "/images/product-1-charcoal.jpg" },
        { name: "Cream White",   modelUrl: "/models/product-1-cream.glb",    imageUrl: "/images/product-1-cream.jpg" },
        { name: "Navy Blue",     modelUrl: "/models/product-1-navy.glb",     imageUrl: "/images/product-1-navy.jpg" },
      ]),
    },
    {
      name: "Velvet Chesterfield Sofa",
      price: 1899.99,
      category: "Sofa",
      description: "A classic button-tufted Chesterfield in luxurious velvet. Statement piece for any living space.",
      imageUrl: "/images/product-2.jpg",
      modelUrl: "/models/product-2.glb",
      width: 200,
      depth: 85,
      variants: JSON.stringify([
        { name: "Emerald Green", modelUrl: "/models/product-2-emerald.glb",  imageUrl: "/images/product-2-emerald.jpg" },
        { name: "Midnight Blue", modelUrl: "/models/product-2-midnight.glb", imageUrl: "/images/product-2-midnight.jpg" },
        { name: "Burgundy",      modelUrl: "/models/product-2-burgundy.glb", imageUrl: "/images/product-2-burgundy.jpg" },
      ]),
    },
    {
      name: "Modular Corner Sofa",
      price: 2499.99,
      category: "Sofa",
      description: "Fully modular corner sofa with rearrangeable sections. Ideal for open-plan living.",
      imageUrl: "/images/product-3.jpg",
      modelUrl: "/models/product-3.glb",
      width: 280,
      depth: 160,
      variants: JSON.stringify([
        { name: "Light Grey", modelUrl: "/models/product-3-lightgrey.glb", imageUrl: "/images/product-3-lightgrey.jpg" },
        { name: "Beige",      modelUrl: "/models/product-3-beige.glb",     imageUrl: "/images/product-3-beige.jpg" },
      ]),
    },
    {
      name: "Solid Oak Dining Table",
      price: 849.99,
      category: "Table",
      description: "Hand-finished solid oak dining table with a natural grain finish. Seats 6 comfortably.",
      imageUrl: "/images/product-4.jpg",
      modelUrl: "/models/product-4.glb",
      width: 180,
      depth: 90,
      variants: JSON.stringify([
        { name: "Natural Oak",  modelUrl: "/models/product-4-oak.glb",    imageUrl: "/images/product-4-oak.jpg" },
        { name: "Dark Walnut",  modelUrl: "/models/product-4-walnut.glb", imageUrl: "/images/product-4-walnut.jpg" },
      ]),
    },
    {
      name: "Marble Coffee Table",
      price: 649.99,
      category: "Table",
      description: "Elegant coffee table with a genuine marble top and brushed brass frame.",
      imageUrl: "/images/product-5.jpg",
      modelUrl: "/models/product-5.glb",
      width: 120,
      depth: 60,
      variants: JSON.stringify([
        { name: "White Marble", modelUrl: "/models/product-5-white.glb", imageUrl: "/images/product-5-white.jpg" },
        { name: "Black Marble", modelUrl: "/models/product-5-black.glb", imageUrl: "/images/product-5-black.jpg" },
      ]),
    },
    {
      name: "Industrial Desk",
      price: 449.99,
      category: "Table",
      description: "Minimalist desk with a reclaimed wood top and matte black steel frame. Great for home offices.",
      imageUrl: "/images/product-6.jpg",
      modelUrl: "/models/product-6.glb",
      width: 140,
      depth: 70,
      variants: JSON.stringify([
        { name: "Pine",   modelUrl: "/models/product-6-pine.glb",   imageUrl: "/images/product-6-pine.jpg" },
        { name: "Walnut", modelUrl: "/models/product-6-walnut.glb", imageUrl: "/images/product-6-walnut.jpg" },
      ]),
    },
    {
      name: "Ergonomic Accent Chair",
      price: 549.99,
      category: "Chair",
      description: "Mid-century modern accent chair with solid walnut legs and high-density foam cushioning.",
      imageUrl: "/images/product-7.jpg",
      modelUrl: "/models/product-7.glb",
      width: 75,
      depth: 80,
      variants: JSON.stringify([
        { name: "Mustard Yellow", modelUrl: "/models/product-7-mustard.glb",    imageUrl: "/images/product-7-mustard.jpg" },
        { name: "Terracotta",     modelUrl: "/models/product-7-terracotta.glb", imageUrl: "/images/product-7-terracotta.jpg" },
        { name: "Forest Green",   modelUrl: "/models/product-7-forest.glb",     imageUrl: "/images/product-7-forest.jpg" },
      ]),
    },
    {
      name: "Woven Rattan Lounge Chair",
      price: 399.99,
      category: "Chair",
      description: "Handwoven rattan lounge chair with a powder-coated steel frame. Lightweight and stylish.",
      imageUrl: "/images/product-8.jpg",
      modelUrl: "/models/product-8.glb",
      width: 70,
      depth: 75,
      variants: JSON.stringify([
        { name: "Natural Rattan", modelUrl: "/models/product-8-natural.glb", imageUrl: "/images/product-8-natural.jpg" },
        { name: "White",          modelUrl: "/models/product-8-white.glb",   imageUrl: "/images/product-8-white.jpg" },
      ]),
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: products.indexOf(product) + 1 },
      update: {},
      create: product,
    });
  }

  console.log("Seeded: 2 users, 8 products");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
