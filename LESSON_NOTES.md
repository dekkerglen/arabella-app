# Arabella Market: live-coding notes

These notes turn this boilerplate (Express + Vite + React + Tailwind) into **Arabella Market**, a small grocery store. Shoppers browse products, keep a cart in localStorage, check out, and get an order confirmation. Accounts use Passport, and admins get an inventory page.

There are eight steps. The app runs at the end of every step, and each step has a **Checkpoint** for showing the class.

**How to read the snippets**

- 🆕 **New file**: type the whole block.
- ✏️ **Edit**: a diff of the existing file. Type the `+` lines and delete the `-` lines; the other lines are context so you can find the spot. A line starting `@@ …` means "skip down to here".
- Server imports end in `.js` even though the files are `.ts` (`import { connectDB } from "./db.js"`). That's Node's ES module rule; `tsx` and `tsc` map it to the `.ts` file. Forget it and `npm run dev` still works, but `npm run build` fails. Client imports have no extension, because Vite resolves them.
- Run `npm run dev` and open **http://localhost:5000** (the Express server), not :5173 (Vite).

Every snippet here was run, end to end, on MongoDB 9.0, Mongoose 9.11, Express 5.3, Passport 0.7, React 19 and Tailwind 4.

**Where we end up**

```
server/
  app.ts               Express app: middleware, then routes
  render.ts            page shell + Vite assets (from the boilerplate)
  db.ts                MongoDB connection
  passport.ts          login strategy, req.user
  models/              Product.ts  Order.ts  User.ts
  routes/              shop.ts  checkout.ts  auth.ts  admin.ts
  scripts/             seed.ts  make-admin.ts
client/src/
  renderToRoot.tsx     mounts a page inside the Layout
  cart.ts              localStorage cart + useCart()
  api.ts  format.ts  types.ts  index.css
  components/          Layout.tsx  Field.tsx
  pages/               BrowsePage  CartPage  CheckoutPage  OrderPage
                       LoginPage  RegisterPage  AdminPage
```

---

## Step 1: MongoDB and Mongoose

### Install MongoDB locally

Pick one. All three give you a MongoDB server on `127.0.0.1:27017` plus the `mongosh` shell.

#### macOS (Homebrew)

You need Xcode's command-line tools (`xcode-select --install`) and Homebrew (https://brew.sh).

```bash
brew tap mongodb/brew
```

```bash
brew trust mongodb/brew
```

(Homebrew 6+ only runs third-party taps you've trusted. On an older Homebrew, skip that line.)

```bash
brew install mongodb-community@9.0
```

```bash
brew services start mongodb-community@9.0
```

Stop it later with `brew services stop mongodb-community@9.0`.

#### Linux (Ubuntu 24.04 / 22.04)

Add MongoDB's signing key and package repository:

```bash
curl -fsSL https://pgp.mongodb.com/server-9.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-9.gpg --dearmor
```

```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-9.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/9.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-9.0.list
```

(On Ubuntu 22.04, replace `noble` with `jammy`.)

Install it, then start it now and on every boot:

```bash
sudo apt-get update && sudo apt-get install -y mongodb-org
```

```bash
sudo systemctl enable --now mongod
```

Other distros: https://www.mongodb.com/docs/manual/administration/install-on-linux/

#### Any OS: Docker

```bash
docker run -d --name mongo -p 27017:27017 -v mongo-data:/data/db mongo:9
```

Use `docker exec -it mongo mongosh` wherever these notes say `mongosh`.

#### Check it's running

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

You should see `{ ok: 1 }`.

### Add Mongoose

```bash
npm install mongoose
```

🆕 **`server/db.ts`**

```ts
import mongoose from "mongoose";

// 127.0.0.1, not "localhost": Node may resolve localhost to IPv6 (::1),
// and mongod only listens on IPv4 by default.
export const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/arabella";

export async function connectDB() {
  // Fail after 5s instead of the default 30s when mongod isn't running.
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log(`[db]: Connected to ${mongoose.connection.name}`);
}
```

✏️ **`server/app.ts`**: connect before the server starts listening.

```diff
 import express from "express";
+import { connectDB } from "./db.js";
 import { render, serveClient } from "./render.js";
 
 const app = express();
@@ …
   render(res, "HomePage", { message: "Hello from the server" });
 });
 
+await connectDB();
+
 // Express 5 hands listen errors (e.g. port in use) to this callback instead of throwing.
 app.listen(port, (error) => {
   if (error) throw error;
```

💬 **Talking points**

- `127.0.0.1`, not `localhost`: Node can resolve `localhost` to IPv6 (`::1`), and `mongod` only listens on IPv4 by default. That mismatch is the classic `ECONNREFUSED ::1:27017`.
- The database name is the last part of the URI (`/arabella`). MongoDB creates it the first time something is written.
- Top-level `await` works because `package.json` has `"type": "module"`.
- We connect *before* `app.listen`, so the server never takes a request it can't serve.

✅ **Checkpoint**: `npm run dev` prints `[db]: Connected to arabella`. Stop MongoDB and save a file: after 5 seconds the server fails with `ECONNREFUSED`. Start MongoDB again.

---

## Step 2: Layout

Desktop only: a fixed-width centered container, and no responsive (`md:`, `lg:`) classes.

🆕 **`client/src/components/Layout.tsx`**

```tsx
import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-800">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-10 px-8 py-4">
          <a href="/" className="text-2xl font-bold text-green-700">
            🥕 Arabella Market
          </a>
          <nav className="flex gap-6 font-medium">
            <a href="/" className="hover:text-green-700">Browse</a>
          </nav>
          <div className="ml-auto flex items-center gap-6 font-medium">
            <a href="/cart" className="hover:text-green-700">🛒 Cart</a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-10">{children}</main>

      <footer className="border-t border-stone-200 bg-white py-6 text-center text-sm text-stone-500">
        © Arabella Market
      </footer>
    </div>
  );
}
```

✏️ **`client/src/renderToRoot.tsx`**: wrap every page in the Layout.

```diff
 import "@vitejs/plugin-react/preamble";
 import type { FC } from "react";
 import { createRoot, type Root } from "react-dom/client";
+import { Layout } from "./components/Layout";
 import "./index.css";
 
 // Kept across hot reloads: a page module re-runs on every edit, and React
@@ …
  */
 export function renderToRoot<Props extends object>(Page: FC<Props>) {
   const props = (window as unknown as { pageProps: Props }).pageProps;
-  root.render(<Page {...props} />);
+  root.render(
+    <Layout>
+      <Page {...props} />
+    </Layout>,
+  );
   return Page;
 }
```

✏️ **`client/src/pages/HomePage.tsx`**: the Layout now owns `<main>`.

```diff
@@ …
 
 function HomePage({ message }: HomePageProps) {
   return (
-    <main className="p-8">
-      <h1 className="text-3xl font-bold">Arabella</h1>
-      <p className="mt-2 text-gray-600">{message}</p>
-    </main>
+    <section>
+      <h1 className="text-3xl font-bold">Welcome to Arabella Market</h1>
+      <p className="mt-2 text-stone-600">{message}</p>
+    </section>
   );
 }
 
```

💬 **Talking points**

- Every page goes through `renderToRoot`, so wrapping there gives every page the header and footer without repeating them.
- `min-h-screen flex flex-col` plus `flex-1` on `<main>` pins the footer to the bottom on short pages.
- `max-w-6xl mx-auto px-8` is the whole "desktop layout": one centered column.

✅ **Checkpoint**: the header, footer and centered content show. Edit the brand text and save: the page updates without a reload.

---

## Step 3: Product model and inventory script

🆕 **`server/models/Product.ts`**

```ts
import { Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    emoji: { type: String, default: "🛒" },
    unit: { type: String, required: true }, // "each", "per lb", "12 oz"...
    price: { type: Number, required: true, min: 0 }, // in cents: 199 = $1.99
    stock: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

export const Product = model("Product", productSchema);
```

🆕 **`server/scripts/seed.ts`**: generates the store's inventory.

```ts
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import { Product } from "../models/Product.js";

// [name, category, emoji, unit, price in cents]
const catalog: [string, string, string, string, number][] = [
  ["Gala Apples", "Produce", "🍎", "per lb", 199],
  ["Bananas", "Produce", "🍌", "per lb", 69],
  ["Strawberries", "Produce", "🍓", "16 oz", 449],
  ["Avocados", "Produce", "🥑", "each", 129],
  ["Broccoli", "Produce", "🥦", "per lb", 249],
  ["Carrots", "Produce", "🥕", "2 lb bag", 279],
  ["Whole Milk", "Dairy", "🥛", "1 gallon", 429],
  ["Cheddar Cheese", "Dairy", "🧀", "8 oz", 499],
  ["Large Eggs", "Dairy", "🥚", "dozen", 389],
  ["Butter", "Dairy", "🧈", "16 oz", 549],
  ["Sourdough Loaf", "Bakery", "🍞", "each", 599],
  ["Croissants", "Bakery", "🥐", "4 pack", 699],
  ["Bagels", "Bakery", "🥯", "6 pack", 499],
  ["Chicken Breast", "Meat & Seafood", "🍗", "per lb", 549],
  ["Ground Beef", "Meat & Seafood", "🥩", "per lb", 649],
  ["Salmon Fillet", "Meat & Seafood", "🐟", "per lb", 1299],
  ["Shrimp", "Meat & Seafood", "🦐", "per lb", 1099],
  ["Spaghetti", "Pantry", "🍝", "16 oz", 189],
  ["Jasmine Rice", "Pantry", "🍚", "5 lb bag", 899],
  ["Honey", "Pantry", "🍯", "12 oz", 749],
  ["Peanut Butter", "Pantry", "🥜", "16 oz", 399],
  ["Orange Juice", "Beverages", "🧃", "52 oz", 479],
  ["Coffee Beans", "Beverages", "☕", "12 oz", 1199],
  ["Green Tea", "Beverages", "🍵", "20 bags", 449],
];

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

await connectDB();
await Product.deleteMany({});

const products = await Product.insertMany(
  catalog.map(([name, category, emoji, unit, price]) => ({
    name,
    category,
    emoji,
    unit,
    price,
    // Roughly 1 in 7 products starts out of stock, so the UI has something to show.
    stock: Math.random() < 0.15 ? 0 : randomInt(5, 50),
  })),
);

console.log(`[seed]: Created ${products.length} products`);
await mongoose.disconnect();
```

✏️ **`package.json`**: add a script.

```json
"seed": "tsx server/scripts/seed.ts"
```

✏️ **`server/tsconfig.json`**: so `tsc` checks files in subfolders too, like the seed script.

```diff
-  "include": ["*.ts"]
+  "include": ["**/*.ts"]
```

💬 **Talking points**

- **Prices are stored in cents** (`199` means $1.99). Floating-point dollars drift: `0.1 + 0.2 !== 0.3`. Integers don't.
- The schema validates (`required`, `min: 0`) before anything reaches MongoDB. `timestamps: true` adds `createdAt` and `updatedAt`.
- `model("Product", …)` stores documents in the `products` collection (lowercased, plural).
- The script reuses `connectDB` and the model, and `deleteMany` first makes it safe to re-run.

✅ **Checkpoint**

```bash
npm run seed
```

Prints `[seed]: Created 24 products`. Look at the data:

```bash
mongosh arabella --eval "db.products.find({ stock: 0 }, { name: 1, stock: 1 })"
```

---

## Step 4: The home page becomes a browse page

Delete `client/src/pages/HomePage.tsx`. `BrowsePage.tsx` replaces it.

🆕 **`server/routes/shop.ts`**

```ts
import { Router } from "express";
import { Product } from "../models/Product.js";
import { render } from "../render.js";

const router = Router();

router.get("/", async (req, res) => {
  // Only accept a plain string: ?category[$ne]=x must not become a Mongo operator.
  const category = typeof req.query.category === "string" ? req.query.category : null;

  const [products, categories] = await Promise.all([
    Product.find(category ? { category } : {}).sort({ category: 1, name: 1 }).lean(),
    Product.distinct("category"),
  ]);

  render(res, "BrowsePage", { products, categories: categories.sort(), category });
});

export default router;
```

✏️ **`server/app.ts`**: swap the old `/` route for the router.

```diff
 import express from "express";
 import { connectDB } from "./db.js";
-import { render, serveClient } from "./render.js";
+import { serveClient } from "./render.js";
+import shopRoutes from "./routes/shop.js";
 
 const app = express();
 const port = Number(process.env.PORT ?? 5000);
@@ …
   res.send("ok");
 });
 
-app.get("/", (_req, res) => {
-  render(res, "HomePage", { message: "Hello from the server" });
-});
+app.use(shopRoutes);
 
 await connectDB();
 
```

🆕 **`client/src/types.ts`**: what the server sends down.

```ts
// The shapes the server sends down. ObjectIds and Dates arrive as strings.

export interface Product {
  _id: string;
  name: string;
  category: string;
  emoji: string;
  unit: string;
  price: number; // cents
  stock: number;
}
```

🆕 **`client/src/format.ts`**

```ts
/** 199 -> "$1.99" */
export const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
```

🆕 **`client/src/pages/BrowsePage.tsx`**

```tsx
import { formatPrice } from "../format";
import { renderToRoot } from "../renderToRoot";
import type { Product } from "../types";

interface BrowsePageProps {
  products: Product[];
  categories: string[];
  category: string | null;
}

function BrowsePage({ products, categories, category }: BrowsePageProps) {
  return (
    <div className="flex gap-10">
      <aside className="w-48 shrink-0">
        <h2 className="mb-3 text-sm font-semibold text-stone-500 uppercase">Categories</h2>
        <CategoryLink href="/" label="All groceries" active={!category} />
        {categories.map((c) => (
          <CategoryLink key={c} href={`/?category=${encodeURIComponent(c)}`} label={c} active={c === category} />
        ))}
      </aside>

      <section className="flex-1">
        <h1 className="mb-6 text-3xl font-bold">{category ?? "All groceries"}</h1>
        <div className="grid grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CategoryLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`block rounded px-3 py-1.5 ${active ? "bg-green-100 font-semibold text-green-800" : "hover:bg-stone-100"}`}
    >
      {label}
    </a>
  );
}

function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock === 0;
  return (
    <div className="flex flex-col rounded-lg border border-stone-200 bg-white p-4">
      <div className="mb-3 flex h-28 items-center justify-center rounded bg-stone-100 text-6xl">{product.emoji}</div>
      <h3 className="font-semibold">{product.name}</h3>
      <p className="text-sm text-stone-500">{product.unit}</p>
      <p className="mt-2 text-lg font-bold">{formatPrice(product.price)}</p>
      <p className={`text-sm ${soldOut ? "text-red-600" : "text-stone-500"}`}>
        {soldOut ? "Out of stock" : `${product.stock} in stock`}
      </p>
    </div>
  );
}

export default renderToRoot(BrowsePage);
```

💬 **Talking points**

- **Data flow**: the route queries MongoDB, then `render(res, "BrowsePage", props)` writes the props into the page as `window.pageProps`, and `renderToRoot` hands them to the component. There's no fetch on page load.
- `.lean()` returns plain objects instead of full Mongoose documents. That's faster, and they're all we need to send to the browser.
- `Promise.all` runs both queries at the same time.
- Category links are plain `<a href="/?category=Dairy">`, so the server does the filtering. The `typeof … === "string"` check stops someone sending `?category[$ne]=x` to inject a Mongo operator.
- The page is exported (`export default renderToRoot(BrowsePage)`). That's what lets React hot-swap it while you edit.

✅ **Checkpoint**: the home page lists all products, sorted by category. Click a category in the sidebar; out-of-stock items show in red.

---

## Step 5: A localStorage cart

🆕 **`client/src/cart.ts`**

```ts
import { useEffect, useState } from "react";
import type { Product } from "./types";

export interface CartItem {
  productId: string;
  name: string;
  emoji: string;
  price: number; // cents
  quantity: number;
}

const STORAGE_KEY = "cart";
const CHANGE_EVENT = "cart-change";

export function getCart(): CartItem[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // Tell every useCart() on the page to re-read the cart.
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addToCart(product: Product) {
  const items = getCart();
  const existing = items.find((item) => item.productId === product._id);
  if (existing) {
    existing.quantity += 1;
  } else {
    const { _id, name, emoji, price } = product;
    items.push({ productId: _id, name, emoji, price, quantity: 1 });
  }
  saveCart(items);
}

/** Setting the quantity to 0 removes the item. */
export function setQuantity(productId: string, quantity: number) {
  saveCart(
    getCart()
      .map((item) => (item.productId === productId ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0),
  );
}

export function removeFromCart(productId: string) {
  setQuantity(productId, 0);
}

export function clearCart() {
  saveCart([]);
}

export const cartCount = (items: CartItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);
export const cartTotal = (items: CartItem[]) => items.reduce((sum, item) => sum + item.price * item.quantity, 0);

/** The current cart, re-rendering whenever it changes (in this tab or another one). */
export function useCart() {
  const [items, setItems] = useState(getCart);

  useEffect(() => {
    const update = () => setItems(getCart());
    window.addEventListener(CHANGE_EVENT, update);
    window.addEventListener("storage", update); // fired by changes in other tabs
    return () => {
      window.removeEventListener(CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return items;
}
```

✏️ **`client/src/index.css`**: a reusable button class.

```diff
 @import "tailwindcss";
+
+/* A reusable button: className="btn" */
+@utility btn {
+  @apply cursor-pointer rounded bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-stone-300;
+}
```

✏️ **`client/src/pages/BrowsePage.tsx`**: an "Add to cart" button on each card.

```diff
+import { addToCart } from "../cart";
 import { formatPrice } from "../format";
 import { renderToRoot } from "../renderToRoot";
 import type { Product } from "../types";
@@ …
       <p className={`text-sm ${soldOut ? "text-red-600" : "text-stone-500"}`}>
         {soldOut ? "Out of stock" : `${product.stock} in stock`}
       </p>
+      <button className="btn mt-4" disabled={soldOut} onClick={() => addToCart(product)}>
+        Add to cart
+      </button>
     </div>
   );
 }
```

✏️ **`client/src/components/Layout.tsx`**: show the item count in the header.

```diff
 import type { ReactNode } from "react";
+import { cartCount, useCart } from "../cart";
 
 export function Layout({ children }: { children: ReactNode }) {
+  const items = useCart();
+
   return (
     <div className="flex min-h-screen flex-col bg-stone-50 text-stone-800">
       <header className="border-b border-stone-200 bg-white">
@@ …
             <a href="/" className="hover:text-green-700">Browse</a>
           </nav>
           <div className="ml-auto flex items-center gap-6 font-medium">
-            <a href="/cart" className="hover:text-green-700">🛒 Cart</a>
+            <a href="/cart" className="hover:text-green-700">
+              🛒 Cart ({cartCount(items)})
+            </a>
           </div>
         </div>
       </header>
```

💬 **Talking points**

- localStorage only stores strings, so the cart goes through `JSON.stringify` / `JSON.parse`.
- The cart keeps a copy of the name and price so the cart page can draw without asking the server. Step 6 shows why the server still mustn't trust that price.
- **Why the event?** The header and the page each call `useCart()`, so each has its own React state. `saveCart` fires a `cart-change` event and every `useCart` re-reads the cart. The browser's own `storage` event does the same for *other* tabs.
- `@utility btn` defines a Tailwind class we can use like any other: `className="btn mt-4"`.

✅ **Checkpoint**: add a few items and watch the header count. Open DevTools → Application → Local Storage → `cart`. Open a second tab: its count updates too.

---

## Step 6: Cart, checkout and order confirmation

The flow: **cart page** (change quantities, remove, clear) → **checkout page** (a form) → `POST /api/orders` → **confirmation page** at `/orders/:id`.

### Server

🆕 **`server/models/Order.ts`**

```ts
import { Schema, model } from "mongoose";

const orderSchema = new Schema(
  {
    customer: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
    },
    // A copy of each product as it was bought, so later price changes don't rewrite old orders.
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        emoji: String,
        price: { type: Number, required: true }, // cents
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    total: { type: Number, required: true }, // cents
  },
  { timestamps: true },
);

export const Order = model("Order", orderSchema);
```

🆕 **`server/routes/checkout.ts`**

```ts
import { Router } from "express";
import { isValidObjectId } from "mongoose";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { render } from "../render.js";

const router = Router();

// The cart lives in localStorage, so these pages get no data from the server.
router.get("/cart", (_req, res) => render(res, "CartPage"));
router.get("/checkout", (_req, res) => render(res, "CheckoutPage"));

router.post("/api/orders", async (req, res) => {
  const { customer, items } = req.body as {
    customer: { name: string; email: string; address: string };
    items: { productId: string; quantity: number }[];
  };
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Your cart is empty" });
  }

  // Look every price up in the database: never trust prices sent by the browser.
  const lineItems = [];
  for (const { productId, quantity } of items) {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({ error: "Something in your cart is no longer sold" });
    }
    if (product.stock < quantity) {
      return res.status(400).json({ error: `Only ${product.stock} ${product.name} left in stock` });
    }
    lineItems.push({ product: product._id, name: product.name, emoji: product.emoji, price: product.price, quantity });
  }

  const total = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = await Order.create({ customer, items: lineItems, total });

  // Take what was bought out of inventory.
  for (const item of lineItems) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: -item.quantity } });
  }

  res.status(201).json({ orderId: order._id });
});

router.get("/orders/:id", async (req, res) => {
  const order = isValidObjectId(req.params.id) ? await Order.findById(req.params.id).lean() : null;
  if (!order) {
    return res.status(404).send("Order not found");
  }
  render(res, "OrderPage", { order });
});

export default router;
```

✏️ **`server/app.ts`**: mount the routes and add an error handler. The error handler goes **after** every route.

```diff
-import express from "express";
+import express, { type NextFunction, type Request, type Response } from "express";
 import { connectDB } from "./db.js";
 import { serveClient } from "./render.js";
+import checkoutRoutes from "./routes/checkout.js";
 import shopRoutes from "./routes/shop.js";
 
 const app = express();
@@ …
 });
 
 app.use(shopRoutes);
+app.use(checkoutRoutes);
+
+// Express 5 sends errors thrown in async route handlers here.
+app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
+  console.error(err);
+  // Mongoose rejects bad input (missing fields, malformed ids) with these errors.
+  const badInput = err.name === "ValidationError" || err.name === "CastError";
+  res.status(badInput ? 400 : 500).json({ error: badInput ? err.message : "Something went wrong" });
+});
 
 await connectDB();
 
```

### Client

✏️ **`client/src/types.ts`**

```diff
@@ …
   price: number; // cents
   stock: number;
 }
+
+export interface Order {
+  _id: string;
+  customer: { name: string; email: string; address: string };
+  items: { _id: string; name: string; emoji: string; price: number; quantity: number }[];
+  total: number; // cents
+  createdAt: string;
+}
```

🆕 **`client/src/api.ts`**: a small `fetch` wrapper for sending JSON.

```ts
/** Sends JSON to the server and returns its JSON reply. Throws the server's error message on failure. */
export async function sendJSON(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data?.error ?? res.statusText);
  return data;
}
```

🆕 **`client/src/components/Field.tsx`**: a labelled input, reused by every form from here on.

```tsx
import type { InputHTMLAttributes } from "react";

/** A labelled input. Takes any <input> attribute; fields are required unless you pass required={false}. */
export function Field({ label, ...input }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        required
        className="w-full rounded border border-stone-300 bg-white px-3 py-2 focus:border-green-600 focus:outline-none"
        {...input}
      />
    </label>
  );
}
```

🆕 **`client/src/pages/CartPage.tsx`**

```tsx
import { cartTotal, clearCart, removeFromCart, setQuantity, useCart } from "../cart";
import { formatPrice } from "../format";
import { renderToRoot } from "../renderToRoot";

const qtyButton = "size-8 cursor-pointer rounded border border-stone-300 hover:bg-stone-100";

function CartPage() {
  const items = useCart();

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-6xl">🧺</p>
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <a href="/" className="btn mt-6 inline-block">Start shopping</a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Your cart</h1>
      <table className="w-full bg-white">
        <thead className="border-b border-stone-200 text-left text-sm text-stone-500">
          <tr>
            <th className="p-4">Item</th>
            <th className="p-4">Price</th>
            <th className="p-4">Quantity</th>
            <th className="p-4 text-right">Subtotal</th>
            <th className="p-4" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.productId} className="border-b border-stone-100">
              <td className="p-4 font-medium">
                {item.emoji} {item.name}
              </td>
              <td className="p-4">{formatPrice(item.price)}</td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <button className={qtyButton} onClick={() => setQuantity(item.productId, item.quantity - 1)}>
                    −
                  </button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <button className={qtyButton} onClick={() => setQuantity(item.productId, item.quantity + 1)}>
                    +
                  </button>
                </div>
              </td>
              <td className="p-4 text-right font-semibold">{formatPrice(item.price * item.quantity)}</td>
              <td className="p-4 text-right">
                <button className="cursor-pointer text-sm text-red-600 hover:underline" onClick={() => removeFromCart(item.productId)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex items-center justify-between">
        <button className="cursor-pointer text-stone-500 hover:underline" onClick={clearCart}>
          Clear cart
        </button>
        <div className="flex items-center gap-6">
          <span className="text-xl">
            Total: <strong>{formatPrice(cartTotal(items))}</strong>
          </span>
          <a href="/checkout" className="btn">Checkout</a>
        </div>
      </div>
    </div>
  );
}

export default renderToRoot(CartPage);
```

🆕 **`client/src/pages/CheckoutPage.tsx`**

```tsx
import { useState, type FormEvent } from "react";
import { sendJSON } from "../api";
import { cartTotal, clearCart, useCart } from "../cart";
import { Field } from "../components/Field";
import { formatPrice } from "../format";
import { renderToRoot } from "../renderToRoot";

function CheckoutPage() {
  const items = useCart();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { orderId } = await sendJSON("POST", "/api/orders", {
        customer: Object.fromEntries(new FormData(event.currentTarget)),
        // Only ids and quantities: the server looks up the real prices.
        items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      });
      clearCart();
      window.location.href = `/orders/${orderId}`;
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <p>
        Your cart is empty. <a href="/" className="text-green-700 underline">Go shopping</a>
      </p>
    );
  }

  return (
    <div className="flex gap-12">
      <form onSubmit={handleSubmit} className="flex-1 space-y-4">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <Field label="Full name" name="name" />
        <Field label="Email" name="email" type="email" />
        <Field label="Delivery address" name="address" />
        {error && <p className="text-red-600">{error}</p>}
        <button className="btn" disabled={submitting}>
          {submitting ? "Placing order…" : "Place order"}
        </button>
      </form>

      <aside className="w-80 self-start rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Order summary</h2>
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between py-1 text-sm">
            <span>
              {item.emoji} {item.name} × {item.quantity}
            </span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="mt-4 flex justify-between border-t border-stone-200 pt-4 font-bold">
          <span>Total</span>
          <span>{formatPrice(cartTotal(items))}</span>
        </div>
      </aside>
    </div>
  );
}

export default renderToRoot(CheckoutPage);
```

🆕 **`client/src/pages/OrderPage.tsx`**

```tsx
import { formatPrice } from "../format";
import { renderToRoot } from "../renderToRoot";
import type { Order } from "../types";

function OrderPage({ order }: { order: Order }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-stone-200 bg-white p-10 text-center">
      <p className="text-6xl">🎉</p>
      <h1 className="mt-4 text-3xl font-bold">Thanks, {order.customer.name}!</h1>
      <p className="mt-2 text-stone-600">
        Order #{order._id.slice(-6).toUpperCase()} is confirmed and will be delivered to {order.customer.address}.
      </p>

      <div className="my-8 text-left">
        {order.items.map((item) => (
          <div key={item._id} className="flex justify-between border-b border-stone-100 py-2">
            <span>
              {item.emoji} {item.name} × {item.quantity}
            </span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-4 text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      <a href="/" className="btn inline-block">Continue shopping</a>
    </div>
  );
}

export default renderToRoot(OrderPage);
```

💬 **Talking points**

- **Never trust the browser.** Anyone can edit localStorage or send their own request. So checkout sends only product ids and quantities, and the server looks up every price and checks stock itself.
- The order keeps a *copy* of each item (name, price). If the price changes tomorrow, old orders still show what was paid.
- `$inc: { stock: -quantity }` lets MongoDB do the subtraction itself.
- Express 5 catches errors thrown in `async` handlers and passes them to the error handler. (Express 4 needed a wrapper for that.) Mongoose's `ValidationError` and `CastError` mean bad input, so they get a 400.
- The cart and checkout pages get no props: the cart lives in the browser.

✅ **Checkpoint**: add items, change quantities on the cart page, remove one, check out, and land on the confirmation page with an empty cart. Then try to cheat. Copy a product id from `mongosh arabella --eval "db.products.findOne()._id"` and send a fake price:

```bash
curl -X POST localhost:5000/api/orders -H "Content-Type: application/json" -d '{"customer":{"name":"Eve","email":"eve@example.com","address":"1 Main St"},"items":[{"productId":"PASTE_ID_HERE","quantity":1,"price":1}]}'
```

Open `/orders/<the returned orderId>`: the total uses the database price.

---

## Step 7: Users with Passport

```bash
npm install passport passport-local express-session connect-mongo bcryptjs
```

```bash
npm install -D @types/passport @types/passport-local @types/express-session
```

🆕 **`server/models/User.ts`**

```ts
import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false leaves the hash out of every query unless asked for with .select("+passwordHash").
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

export const User = model("User", userSchema);
```

🆕 **`server/passport.ts`**

```ts
import bcrypt from "bcryptjs";
import type { Types } from "mongoose";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { User } from "./models/User.js";

// Tell TypeScript what req.user looks like.
declare global {
  namespace Express {
    interface User {
      _id: Types.ObjectId;
      name: string;
      email: string;
    }
  }
}

// Log in with email + password.
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email }).select("+passwordHash");
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return done(null, false);
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }),
);

// The session cookie only stores the user's id...
passport.serializeUser((user, done) => done(null, user._id.toString()));

// ...and every request looks the user back up from it, as req.user.
passport.deserializeUser(async (id: string, done) => {
  try {
    done(null, await User.findById(id).lean());
  } catch (err) {
    done(err);
  }
});
```

🆕 **`server/routes/auth.ts`**

```ts
import bcrypt from "bcryptjs";
import { Router } from "express";
import passport from "passport";
import { User } from "../models/User.js";
import { render } from "../render.js";

const router = Router();

router.get("/login", (req, res) => {
  render(res, "LoginPage", { failed: "failed" in req.query });
});

router.post(
  "/login",
  passport.authenticate("local", { successRedirect: "/", failureRedirect: "/login?failed" }),
);

router.get("/register", (_req, res) => {
  render(res, "RegisterPage", { error: null });
});

router.post("/register", async (req, res, next) => {
  const { name, email, password } = req.body;
  if (!password || password.length < 8) {
    return render(res, "RegisterPage", { error: "Password must be at least 8 characters" });
  }
  if (await User.exists({ email })) {
    return render(res, "RegisterPage", { error: "An account with that email already exists" });
  }

  // Never store the password itself, only a salted hash of it.
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });

  // Log the new user straight in.
  req.login(user, (err) => (err ? next(err) : res.redirect("/")));
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => (err ? next(err) : res.redirect("/")));
});

export default router;
```

✏️ **`server/app.ts`**: sessions, Passport, and the auth routes. **Order matters**: the session must come before `passport.session()`, and both before the routes.

```diff
+import MongoStore from "connect-mongo";
 import express, { type NextFunction, type Request, type Response } from "express";
-import { connectDB } from "./db.js";
+import session from "express-session";
+import passport from "passport";
+import { connectDB, MONGODB_URI } from "./db.js";
+import "./passport.js"; // registers the login strategy
 import { serveClient } from "./render.js";
+import authRoutes from "./routes/auth.js";
 import checkoutRoutes from "./routes/checkout.js";
 import shopRoutes from "./routes/shop.js";
 
@@ …
 const port = Number(process.env.PORT ?? 5000);
 
 app.use(express.json());
+app.use(express.urlencoded()); // HTML <form> posts
 app.use(serveClient);
 
+app.use(
+  session({
+    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
+    resave: false,
+    saveUninitialized: false,
+    // Keep sessions in MongoDB, so restarting the server doesn't log everyone out.
+    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
+    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // one week
+  }),
+);
+app.use(passport.session());
+
+// Hand the logged-in user to render() on every page.
+app.use((req, res, next) => {
+  res.locals.user = req.user ?? null;
+  next();
+});
+
 app.get("/healthcheck", (_req, res) => {
   res.send("ok");
 });
 
 app.use(shopRoutes);
 app.use(checkoutRoutes);
+app.use(authRoutes);
 
 // Express 5 sends errors thrown in async route handlers here.
 app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
```

✏️ **`server/render.ts`**: send the logged-in user to every page.

```diff
@@ …
 export const render = (res: Response, page: string, props: object = {}, title = "Arabella") => {
   // Escape "<" so a prop value can't close the script tag.
   const pageProps = JSON.stringify(props).replace(/</g, "\\u003c");
+  // Every page also gets the logged-in user, which app.ts puts on res.locals.
+  const rootProps = JSON.stringify({ user: res.locals.user ?? null }).replace(/</g, "\\u003c");
   res.send(`<!doctype html>
 <html lang="en">
   <head>
@@ …
   </head>
   <body>
     <div id="root"></div>
-    <script>window.pageProps = ${pageProps};</script>
+    <script>
+      window.rootProps = ${rootProps};
+      window.pageProps = ${pageProps};
+    </script>
   </body>
 </html>`);
 };
```

✏️ **`client/src/types.ts`**

```diff
@@ …
   total: number; // cents
   createdAt: string;
 }
+
+export interface User {
+  _id: string;
+  name: string;
+  email: string;
+}
```

✏️ **`client/src/renderToRoot.tsx`**: pass the user to the Layout.

```diff
@@ …
 import { createRoot, type Root } from "react-dom/client";
 import { Layout } from "./components/Layout";
 import "./index.css";
+import type { User } from "./types";
 
 // Kept across hot reloads: a page module re-runs on every edit, and React
 // rejects a second createRoot on the same container.
@@ …
 if (import.meta.hot) import.meta.hot.data.root = root;
 
 /**
- * Mounts a page component with the props the server rendered into window.pageProps.
+ * Mounts a page component inside the Layout, with the props the server rendered into window.pageProps.
  * Returns the component so a page can `export default` it: React Refresh only
  * hot-swaps modules that export components, and fully reloads the rest.
  */
 export function renderToRoot<Props extends object>(Page: FC<Props>) {
-  const props = (window as unknown as { pageProps: Props }).pageProps;
+  const { rootProps, pageProps } = window as unknown as { rootProps: { user: User | null }; pageProps: Props };
   root.render(
-    <Layout>
-      <Page {...props} />
+    <Layout user={rootProps.user}>
+      <Page {...pageProps} />
     </Layout>,
   );
   return Page;
```

✏️ **`client/src/components/Layout.tsx`**: log in, sign up, and log out links.

```diff
 import type { ReactNode } from "react";
 import { cartCount, useCart } from "../cart";
+import type { User } from "../types";
 
-export function Layout({ children }: { children: ReactNode }) {
+export function Layout({ user, children }: { user: User | null; children: ReactNode }) {
   const items = useCart();
 
   return (
@@ …
             <a href="/cart" className="hover:text-green-700">
               🛒 Cart ({cartCount(items)})
             </a>
+            {user ? (
+              <>
+                <span className="text-stone-500">Hi, {user.name}</span>
+                <form method="post" action="/logout">
+                  <button className="cursor-pointer hover:text-green-700">Log out</button>
+                </form>
+              </>
+            ) : (
+              <>
+                <a href="/login" className="hover:text-green-700">Log in</a>
+                <a href="/register" className="btn">Sign up</a>
+              </>
+            )}
           </div>
         </div>
       </header>
```

🆕 **`client/src/pages/LoginPage.tsx`**

```tsx
import { Field } from "../components/Field";
import { renderToRoot } from "../renderToRoot";

// A plain HTML form: the browser POSTs it to /login and follows passport's redirect.
function LoginPage({ failed }: { failed: boolean }) {
  return (
    <form method="post" action="/login" className="mx-auto max-w-sm space-y-4 rounded-lg border border-stone-200 bg-white p-8">
      <h1 className="text-2xl font-bold">Log in</h1>
      {failed && <p className="text-red-600">Wrong email or password.</p>}
      <Field label="Email" name="email" type="email" />
      <Field label="Password" name="password" type="password" />
      <button className="btn w-full">Log in</button>
      <p className="text-sm text-stone-500">
        New here? <a href="/register" className="text-green-700 underline">Create an account</a>
      </p>
    </form>
  );
}

export default renderToRoot(LoginPage);
```

🆕 **`client/src/pages/RegisterPage.tsx`**

```tsx
import { Field } from "../components/Field";
import { renderToRoot } from "../renderToRoot";

function RegisterPage({ error }: { error: string | null }) {
  return (
    <form method="post" action="/register" className="mx-auto max-w-sm space-y-4 rounded-lg border border-stone-200 bg-white p-8">
      <h1 className="text-2xl font-bold">Create an account</h1>
      {error && <p className="text-red-600">{error}</p>}
      <Field label="Name" name="name" />
      <Field label="Email" name="email" type="email" />
      <Field label="Password" name="password" type="password" minLength={8} />
      <button className="btn w-full">Sign up</button>
      <p className="text-sm text-stone-500">
        Already have an account? <a href="/login" className="text-green-700 underline">Log in</a>
      </p>
    </form>
  );
}

export default renderToRoot(RegisterPage);
```

💬 **Talking points**

- **Never store passwords.** `bcrypt.hash` stores a salted, slow hash; `bcrypt.compare` checks a login against it.
- `select: false` keeps `passwordHash` out of every query. The login strategy asks for it explicitly with `.select("+passwordHash")`. That's also why `req.user`, which we send to the browser, never contains it.
- **Sessions**: after login, `serializeUser` puts just the user id in the session. On each request `deserializeUser` turns it back into `req.user`. The session itself lives in MongoDB (`connect-mongo`), so restarting the dev server doesn't log you out.
- `res.locals` is Express's per-request scratch space. The middleware puts the user there, and `render()` reads it.
- `lowercase: true` on email applies to queries too, so `Gwen@Example.com` logs in as `gwen@example.com`.
- Login and register are plain HTML `<form method="post">`s: the browser submits them and follows the redirect, with no fetch. That's why `app.ts` now has `express.urlencoded()`.
- Older tutorials also add `app.use(passport.initialize())`. Since Passport 0.6, `passport.session()` is enough.
- In production, set a real `SESSION_SECRET` environment variable.

✅ **Checkpoint**: sign up, and the header says "Hi, …". Log out and log back in. Try a wrong password. Restart the server (save any server file): you're still logged in. Look at what's stored:

```bash
mongosh arabella --eval "db.users.find()"
```

```bash
mongosh arabella --eval "db.sessions.find()"
```

---

## Step 8: Admin role and inventory page

✏️ **`server/models/User.ts`**

```diff
@@ …
     email: { type: String, required: true, unique: true, lowercase: true, trim: true },
     // select: false leaves the hash out of every query unless asked for with .select("+passwordHash").
     passwordHash: { type: String, required: true, select: false },
+    isAdmin: { type: Boolean, default: false },
   },
   { timestamps: true },
 );
```

✏️ **`server/passport.ts`**

```diff
@@ …
       _id: Types.ObjectId;
       name: string;
       email: string;
+      isAdmin: boolean;
     }
   }
 }
```

🆕 **`server/scripts/make-admin.ts`**: there's no UI for making admins, by design.

```ts
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import { User } from "../models/User.js";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run make-admin -- you@example.com");
  process.exit(1);
}

await connectDB();
const { matchedCount } = await User.updateOne({ email }, { isAdmin: true });
console.log(matchedCount ? `[make-admin]: ${email} is now an admin` : `[make-admin]: No user with email ${email}`);
await mongoose.disconnect();
```

✏️ **`package.json`**

```json
"make-admin": "tsx server/scripts/make-admin.ts"
```

🆕 **`server/routes/admin.ts`**

```ts
import { Router } from "express";
import { Product } from "../models/Product.js";
import { render } from "../render.js";

// Mounted at /admin in app.ts, so "/products" here is /admin/products.
const router = Router();

// Runs before every route below: only admins get through.
router.use((req, res, next) => {
  if (!req.user) return res.redirect("/login");
  if (!req.user.isAdmin) return res.status(403).send("Admins only");
  next();
});

router.get("/", async (_req, res) => {
  const products = await Product.find().sort({ category: 1, name: 1 }).lean();
  render(res, "AdminPage", { products });
});

router.post("/products", async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

router.patch("/products/:id", async (req, res) => {
  // runValidators: updates skip schema validation (like min: 0) unless asked.
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { runValidators: true });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.status(204).end();
});

router.delete("/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router;
```

✏️ **`server/app.ts`**: mount the admin router under `/admin`.

```diff
@@ …
 import { connectDB, MONGODB_URI } from "./db.js";
 import "./passport.js"; // registers the login strategy
 import { serveClient } from "./render.js";
+import adminRoutes from "./routes/admin.js";
 import authRoutes from "./routes/auth.js";
 import checkoutRoutes from "./routes/checkout.js";
 import shopRoutes from "./routes/shop.js";
@@ …
 app.use(shopRoutes);
 app.use(checkoutRoutes);
 app.use(authRoutes);
+app.use("/admin", adminRoutes);
 
 // Express 5 sends errors thrown in async route handlers here.
 app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
```

✏️ **`client/src/types.ts`**

```diff
@@ …
   _id: string;
   name: string;
   email: string;
+  isAdmin: boolean;
 }
```

✏️ **`client/src/components/Layout.tsx`**: an Admin link, for admins only.

```diff
@@ …
           </a>
           <nav className="flex gap-6 font-medium">
             <a href="/" className="hover:text-green-700">Browse</a>
+            {user?.isAdmin && (
+              <a href="/admin" className="hover:text-green-700">Admin</a>
+            )}
           </nav>
           <div className="ml-auto flex items-center gap-6 font-medium">
             <a href="/cart" className="hover:text-green-700">
```

🆕 **`client/src/pages/AdminPage.tsx`**

```tsx
import { useState, type FormEvent } from "react";
import { sendJSON } from "../api";
import { Field } from "../components/Field";
import { renderToRoot } from "../renderToRoot";
import type { Product } from "../types";

const toCents = (dollars: FormDataEntryValue | string) => Math.round(Number(dollars) * 100);

function AdminPage({ products }: { products: Product[] }) {
  return (
    <div className="space-y-12">
      <section>
        <h1 className="mb-6 text-3xl font-bold">Inventory</h1>
        <table className="w-full bg-white">
          <thead className="border-b border-stone-200 text-left text-sm text-stone-500">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price ($)</th>
              <th className="p-3">Stock</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <ProductRow key={product._id} product={product} />
            ))}
          </tbody>
        </table>
      </section>

      <AddProductForm />
    </div>
  );
}

function ProductRow({ product }: { product: Product }) {
  const [price, setPrice] = useState((product.price / 100).toFixed(2));
  const [stock, setStock] = useState(String(product.stock));
  const [status, setStatus] = useState("");

  async function save() {
    try {
      await sendJSON("PATCH", `/admin/products/${product._id}`, { price: toCents(price), stock: Number(stock) });
      setStatus("Saved ✓");
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${product.name}?`)) return;
    await sendJSON("DELETE", `/admin/products/${product._id}`);
    window.location.reload();
  }

  const input = "w-24 rounded border border-stone-300 px-2 py-1";
  return (
    <tr className="border-b border-stone-100">
      <td className="p-3 font-medium">
        {product.emoji} {product.name} <span className="text-sm text-stone-400">({product.unit})</span>
      </td>
      <td className="p-3">{product.category}</td>
      <td className="p-3">
        <input className={input} type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
      </td>
      <td className="p-3">
        <input className={input} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
      </td>
      <td className="space-x-3 p-3 text-right">
        <span className="text-sm text-stone-500">{status}</span>
        <button className="btn" onClick={save}>Save</button>
        <button className="cursor-pointer text-sm text-red-600 hover:underline" onClick={remove}>
          Delete
        </button>
      </td>
    </tr>
  );
}

function AddProductForm() {
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await sendJSON("POST", "/admin/products", { ...form, price: toCents(form.price) });
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold">Add a product</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4 rounded-lg border border-stone-200 bg-white p-6">
        <Field label="Name" name="name" />
        <Field label="Category" name="category" />
        <Field label="Emoji" name="emoji" placeholder="🥕" />
        <Field label="Unit" name="unit" placeholder="each, per lb, 12 oz" />
        <Field label="Price ($)" name="price" type="number" step="0.01" min="0" />
        <Field label="Stock" name="stock" type="number" min="0" />
        {error && <p className="col-span-3 text-red-600">{error}</p>}
        <div className="col-span-3">
          <button className="btn">Add product</button>
        </div>
      </form>
    </section>
  );
}

export default renderToRoot(AdminPage);
```

💬 **Talking points**

- `router.use(...)` at the top of `admin.ts` guards **every** route in the file, the page and the API alike. Hiding the Admin link is only cosmetic; the server check is the actual security.
- `app.use("/admin", adminRoutes)` prefixes everything, so `router.patch("/products/:id")` answers at `/admin/products/:id`.
- `findByIdAndUpdate` skips schema validation unless you pass `runValidators: true`. Without it, `stock: -5` would save.
- The admin page edits prices in dollars, and `toCents` converts them back before saving.
- Making yourself an admin takes effect on the next request, without logging in again, because `deserializeUser` re-reads the user from the database every time.

✅ **Checkpoint**

```bash
npm run make-admin -- you@example.com
```

Refresh: an **Admin** link appears. Change a price or a stock level, save, and check the browse page. Add a product, delete it. Then log in as a non-admin and visit `/admin`: you get "Admins only".

---

## Reference: routes

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/` | Browse page, optional `?category=` |
| GET | `/cart` | Cart page (data from localStorage) |
| GET | `/checkout` | Checkout form |
| POST | `/api/orders` | Place an order (JSON) |
| GET | `/orders/:id` | Order confirmation |
| GET/POST | `/login` | Log in form / log in |
| GET/POST | `/register` | Sign up form / create account |
| POST | `/logout` | Log out |
| GET | `/admin` | Inventory page (admins only) |
| POST | `/admin/products` | Add a product |
| PATCH | `/admin/products/:id` | Update a product |
| DELETE | `/admin/products/:id` | Delete a product |

## Troubleshooting

- **`ECONNREFUSED 127.0.0.1:27017`**: MongoDB isn't running. Start it (Step 1).
- **`npm run build` fails with `TS2835: Relative import paths need explicit file extensions`**: a server import is missing its `.js` (`"./db.js"`). Dev mode doesn't catch this; the build does.
- **`Port 5173 is already in use`**: another Vite dev server (another project?) has the port. Stop it, since the page expects Vite on 5173.
- **A blank page, and the browser console shows a 404 for `/src/pages/Something.tsx`**: the name passed to `render(res, "Something")` doesn't match a file in `client/src/pages/`.
- **`req.user` is always undefined**: check the middleware order in `app.ts`. `session(...)` comes before `passport.session()`, and both come before the routes.

## Ideas for after the lesson

- A search box on the browse page (`Product.find({ name: { $regex: q, $options: "i" } })`).
- Prefill checkout with the logged-in user's name and email.
- Save `user: req.user?._id` on orders and add a "My orders" page.
- Make the stock decrement safe when two people buy the last item at once: `updateOne({ _id, stock: { $gte: quantity } }, { $inc: { stock: -quantity } })`, and check `modifiedCount`.
- CSRF protection for the login and logout forms.
