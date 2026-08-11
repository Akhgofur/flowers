# Nafis Flowers Functional Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build a responsive, fully interactive flower-shop catalog front-end where every visible control produces an observable, testable result.

**Architecture:** Build a Vite React TypeScript single-page app. Typed local catalog data feeds pure filter utilities and an immutable cart reducer. App composition owns UI state while a small adapter safely persists only favorites and cart lines to localStorage.

**Tech Stack:** React 18, TypeScript strict mode, Vite, Vitest, Testing Library, CSS custom properties.

## Global Constraints

- Preserve the approved Nafis style: warm white, soft pink cards, #D04E6A accent, Playfair Display plus DM Sans.
- Use original Nafis branding, Uzbek copy, product data, and image selection. Do not reproduce the reference brand or content.
- Every visible button/link needs a real behavior. Do not retain empty anchors or no-op buttons.
- Use frontend-only local data. Payment, authentication, inventory, delivery dispatch, and administration are explicitly excluded.
- Persist only cart and favorite state under nafis.cart.v1 and nafis.favorites.v1.
- Ignore malformed browser storage safely; retain only known product IDs and integer quantities from 1 through 99.
- Support 375px, 768px, and 1440px without horizontal page scrolling.
- Use accessible names for icon controls, visible focus styles, and Escape to close dialogs/drawers.
- The workspace has no Git repository. Do not run git init, commit, or push without explicit user instruction.

---

## File Structure

    package.json                         # scripts and dependencies
    vite.config.ts                       # Vite and Vitest configuration
    tsconfig.json                        # strict compiler options
    index.html                           # mount point and hosted fonts
    src/
      main.tsx                           # React root
      app/
        App.tsx                          # state composition and sections
        App.test.tsx                     # integration tests
        styles.css                       # tokens, layout, breakpoints
      data/
        catalog.ts                       # typed products, categories, slides
        catalog.test.ts                  # data and formatting tests
      shared/
        types.ts                         # domain types
        format.ts                        # money helper
      features/
        catalog/
          catalog-utils.ts
          catalog-utils.test.ts
          CatalogFilters.tsx
          CatalogGrid.tsx
        cart/
          cart-reducer.ts
          cart-reducer.test.ts
          cart-storage.ts
          CartDrawer.tsx
        product/
          FavoriteButton.tsx
          ProductQuickView.tsx
        layout/
          Header.tsx
          HeroCarousel.tsx
          CategoryStrip.tsx
          PromoBanner.tsx
          Footer.tsx
      test/
        setup.ts                         # jest-dom setup
    README.md                            # run commands and demo limits

## Task 1: Bootstrap strict React application and test harness

**Files:**
- Create: package.json
- Create: vite.config.ts
- Create: tsconfig.json
- Create: index.html
- Create: src/main.tsx
- Create: src/app/App.tsx
- Create: src/app/App.test.tsx
- Create: src/test/setup.ts

**Interfaces:**
- Produces App with no required props.
- Produces npm scripts: dev, build, typecheck, test, and test:run.

- [ ] **Step 1: Create package and Vite configuration**

Install React 18, React DOM 18, Vite, TypeScript, Vitest, jsdom, Testing Library React, user-event, and jest-dom. Configure Vite test environment as jsdom and set src/test/setup.ts as setup file.

~~~json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
~~~

- [ ] **Step 2: Write the failing application shell test**

~~~tsx
import { render, screen } from "@testing-library/react";
import App from "./App";

it("renders the Nafis catalog shell", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /baxtni gullar bilan yuboring/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /savatni ochish/i })).toHaveTextContent("0");
});
~~~

- [ ] **Step 3: Run the test to verify it fails**

Run: npm run test:run -- src/app/App.test.tsx  
Expected: FAIL because App does not yet render the heading or cart trigger.

- [ ] **Step 4: Implement minimal App and entry point**

~~~tsx
export default function App() {
  return (
    <main>
      <h1>Baxtni gullar bilan yuboring.</h1>
      <button type="button" aria-label="Savatni ochish">0</button>
    </main>
  );
}
~~~

- [ ] **Step 5: Run tests, type-check, and build**

Run: npm run test:run -- src/app/App.test.tsx  
Expected: PASS.

Run: npm run typecheck  
Expected: exit code 0.

Run: npm run build  
Expected: production bundle completes successfully.

## Task 2: Define catalog types, sample data, and Uzbek money formatting

**Files:**
- Create: src/shared/types.ts
- Create: src/shared/format.ts
- Create: src/data/catalog.ts
- Create: src/data/catalog.test.ts

**Interfaces:**
- Produces Product, CategoryId, FlowerType, ProductColor, CartLine, CatalogFilters, and HeroSlide.
- Produces PRODUCTS, CATEGORIES, HERO_SLIDES, and formatSum(value).

- [ ] **Step 1: Write failing catalog tests**

~~~ts
import { PRODUCTS, CATEGORIES, HERO_SLIDES } from "./catalog";
import { formatSum } from "../shared/format";

it("provides unique products for every visible category", () => {
  expect(new Set(PRODUCTS.map((product) => product.id)).size).toBe(PRODUCTS.length);
  for (const category of CATEGORIES) {
    expect(PRODUCTS.some((product) => product.category === category.id)).toBe(true);
  }
});

it("formats Uzbek so'm values", () => {
  expect(formatSum(535000)).toContain("535");
  expect(formatSum(535000)).toContain("so'm");
});

it("provides three usable hero slides", () => {
  expect(HERO_SLIDES).toHaveLength(3);
  expect(HERO_SLIDES.every((slide) => slide.ctaTarget.startsWith("#"))).toBe(true);
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: npm run test:run -- src/data/catalog.test.ts  
Expected: FAIL because catalog data and formatter do not exist.

- [ ] **Step 3: Implement typed source data**

Create at least twelve original products over six categories. Each product must define id, name, price, image, category, flowerTypes, colors, isNew, isOnSale, shortDescription, composition, deliveryEstimate, and size.

~~~ts
export function formatSum(value: number): string {
  return new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(value) + " so'm";
}
~~~

- [ ] **Step 4: Run tests and type-check**

Run: npm run test:run -- src/data/catalog.test.ts  
Expected: PASS.

Run: npm run typecheck  
Expected: exit code 0.

## Task 3: Implement pure catalog filters

**Files:**
- Create: src/features/catalog/catalog-utils.ts
- Create: src/features/catalog/catalog-utils.test.ts

**Interfaces:**
- Consumes Product and CatalogFilters.
- Produces DEFAULT_FILTERS and applyCatalogFilters(products, filters).

- [ ] **Step 1: Write failing filter tests**

~~~ts
import { PRODUCTS } from "../../data/catalog";
import { DEFAULT_FILTERS, applyCatalogFilters } from "./catalog-utils";

it("combines query, flower type, color, and price constraints", () => {
  const result = applyCatalogFilters(PRODUCTS, {
    ...DEFAULT_FILTERS,
    query: "pion",
    flowerTypes: ["pion"],
    colors: ["pink"],
    minPrice: 400000,
    maxPrice: 600000
  });
  expect(result.map((product) => product.id)).toEqual(["pink-peony"]);
});

it("returns no products for an unknown query", () => {
  expect(applyCatalogFilters(PRODUCTS, { ...DEFAULT_FILTERS, query: "mavjud emas" })).toEqual([]);
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: npm run test:run -- src/features/catalog/catalog-utils.test.ts  
Expected: FAIL because filtering has not been implemented.

- [ ] **Step 3: Implement deterministic filtering**

Normalize the Uzbek search query, then apply category, active tab, selected flower types, selected colors, and inclusive price limits. Products must match one selected type and one selected color when either selection is non-empty.

~~~ts
export function applyCatalogFilters(products: Product[], filters: CatalogFilters): Product[] {
  const query = filters.query.trim().toLocaleLowerCase("uz-UZ");
  return products.filter((product) => {
    const queryMatches = query === "" || product.name.toLocaleLowerCase("uz-UZ").includes(query);
    const typeMatches = filters.flowerTypes.length === 0 || product.flowerTypes.some((type) => filters.flowerTypes.includes(type));
    return queryMatches && typeMatches;
  });
}
~~~

- [ ] **Step 4: Run tests and type-check**

Run: npm run test:run -- src/features/catalog/catalog-utils.test.ts  
Expected: PASS.

Run: npm run typecheck  
Expected: exit code 0.

## Task 4: Implement immutable cart state and safe local persistence

**Files:**
- Create: src/features/cart/cart-reducer.ts
- Create: src/features/cart/cart-reducer.test.ts
- Create: src/features/cart/cart-storage.ts

**Interfaces:**
- Produces addToCart, setCartQuantity, removeFromCart, readCart, writeCart, readFavorites, and writeFavorites.

- [ ] **Step 1: Write failing cart tests**

~~~ts
it("merges repeated adds and removes a line at quantity zero", () => {
  expect(addToCart([{ productId: "pink-peony", quantity: 1 }], "pink-peony", 2))
    .toEqual([{ productId: "pink-peony", quantity: 3 }]);
  expect(setCartQuantity([{ productId: "pink-peony", quantity: 1 }], "pink-peony", 0)).toEqual([]);
});

it("ignores malformed browser storage", () => {
  localStorage.setItem("nafis.cart.v1", "{not-json");
  expect(readCart(new Set(["pink-peony"]))).toEqual([]);
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: npm run test:run -- src/features/cart/cart-reducer.test.ts  
Expected: FAIL because reducer and storage helpers do not exist.

- [ ] **Step 3: Implement reducer and storage guard**

Accept only valid product IDs and quantities 1 through 99. Collapse duplicate stored IDs, cap totals at 99, and catch unavailable localStorage.

~~~ts
export function setCartQuantity(lines: CartLine[], productId: string, quantity: number): CartLine[] {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return lines.filter((line) => line.productId !== productId);
  }
  return lines.map((line) => line.productId === productId ? { ...line, quantity: Math.min(quantity, 99) } : line);
}
~~~

- [ ] **Step 4: Run cart tests, type-check, and build**

Run: npm run test:run -- src/features/cart/cart-reducer.test.ts  
Expected: PASS.

Run: npm run typecheck  
Expected: exit code 0.

Run: npm run build  
Expected: Vite build succeeds.

## Task 5: Build the approved layout, navigation, and hero carousel

**Files:**
- Create: src/features/layout/Header.tsx
- Create: src/features/layout/HeroCarousel.tsx
- Create: src/features/layout/CategoryStrip.tsx
- Create: src/features/layout/PromoBanner.tsx
- Create: src/features/layout/Footer.tsx
- Create: src/app/styles.css
- Modify: src/app/App.tsx
- Modify: src/app/App.test.tsx

**Interfaces:**
- Header receives cartItemCount and onOpenCart.
- HeroCarousel receives HeroSlide[] and onNavigate(targetId).
- CategoryStrip receives selectedCategory and onSelectCategory(categoryId).
- PromoBanner receives onSelectGiftCategory.

- [ ] **Step 1: Extend the failing integration test**

~~~tsx
const user = userEvent.setup();
render(<App />);
await user.click(screen.getByRole("button", { name: /keyingi slayd/i }));
expect(screen.getByRole("heading", { name: /bahor/i })).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: /mobil menyuni ochish/i }));
expect(screen.getByRole("navigation", { name: /mobil navigatsiya/i })).toBeVisible();
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: npm run test:run -- src/app/App.test.tsx  
Expected: FAIL because carousel and mobile navigation are absent.

- [ ] **Step 3: Implement visual shell and interactive navigation**

Implement utility bar, header, accessible mobile menu, cart count, three hero slides, category cards, gift CTA, footer section anchors, and reduced-motion-safe carousel timer. Manual controls must wrap around and mobile navigation closes on link selection or Escape.

~~~tsx
function HeroCarousel({ slides, onNavigate }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = slides[activeIndex];
  return <section aria-label="Mavsumiy kolleksiyalar">{activeSlide.title}</section>;
}
~~~

- [ ] **Step 4: Run the test, type-check, and build**

Run: npm run test:run -- src/app/App.test.tsx  
Expected: PASS for carousel and mobile navigation.

Run: npm run typecheck  
Expected: exit code 0.

Run: npm run build  
Expected: Vite build succeeds.

## Task 6: Wire filters, tabs, category shortcuts, and empty state to catalog UI

**Files:**
- Create: src/features/catalog/CatalogFilters.tsx
- Create: src/features/catalog/CatalogGrid.tsx
- Modify: src/app/App.tsx
- Modify: src/app/App.test.tsx
- Modify: src/app/styles.css

**Interfaces:**
- CatalogFilters receives draftFilters, onDraftChange, onApply, and onReset.
- CatalogGrid receives products, activeTab, onTabChange, onOpenProduct, and onAddToCart.
- App owns draft and applied filter state, then calls applyCatalogFilters(PRODUCTS, appliedFilters).

- [ ] **Step 1: Write failing catalog interaction tests**

~~~tsx
const user = userEvent.setup();
render(<App />);
await user.type(screen.getByRole("searchbox", { name: /mahsulot qidirish/i }), "pion");
await user.click(screen.getByRole("button", { name: /filtrni qo.llash/i }));
expect(screen.getByText(/pushti pion buketi/i)).toBeVisible();
expect(screen.queryByText(/qirmizi atirgul buketi/i)).not.toBeInTheDocument();
await user.click(screen.getByRole("button", { name: /tozalash/i }));
expect(screen.getByText(/qirmizi atirgul buketi/i)).toBeVisible();
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: npm run test:run -- src/app/App.test.tsx  
Expected: FAIL because filters and product grid are not wired.

- [ ] **Step 3: Implement controlled catalog behavior**

Use a named search input, two labelled range inputs, checkboxes for flower types/colors, Barchasi/Yangi/Aksiya tabs, product cards, add button, named detail button, and a clear empty result CTA. Apply copies draft filters to applied filters; reset restores defaults to both.

~~~tsx
const visibleProducts = useMemo(
  () => applyCatalogFilters(PRODUCTS, appliedFilters),
  [appliedFilters]
);
~~~

- [ ] **Step 4: Run integration and utility tests**

Run: npm run test:run -- src/app/App.test.tsx src/features/catalog/catalog-utils.test.ts  
Expected: PASS.

Run: npm run typecheck  
Expected: exit code 0.

## Task 7: Add product quick-view, favorites, cart drawer, and toast feedback

**Files:**
- Create: src/features/product/ProductQuickView.tsx
- Create: src/features/product/FavoriteButton.tsx
- Create: src/features/cart/CartDrawer.tsx
- Modify: src/app/App.tsx
- Modify: src/app/App.test.tsx
- Modify: src/app/styles.css

**Interfaces:**
- ProductQuickView receives product, open, onClose, onAdd(productId, quantity), and isFavorite.
- CartDrawer receives open, lines, products, onClose, onSetQuantity, onRemove, and total.

- [ ] **Step 1: Write failing product and cart flow tests**

~~~tsx
const user = userEvent.setup();
render(<App />);
await user.click(screen.getByRole("button", { name: /pushti pion buketini ko.rish/i }));
expect(screen.getByRole("dialog", { name: /pushti pion buketi/i })).toBeVisible();
await user.click(screen.getByRole("button", { name: /savatga qo.shish/i }));
expect(screen.getByRole("button", { name: /savatni ochish/i })).toHaveTextContent("1");
await user.click(screen.getByRole("button", { name: /savatni ochish/i }));
expect(screen.getByRole("complementary", { name: /savat/i })).toBeVisible();
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: npm run test:run -- src/app/App.test.tsx  
Expected: FAIL because modal, favorite, and cart drawer do not exist.

- [ ] **Step 3: Implement accessible product and cart interactions**

Product cards use real named view buttons. Dialog and drawer focus their close control after opening, close on Escape, and restore focus to the original trigger. Add operations call addToCart, show an aria-live success toast, and persist after hydration. Favorite buttons use aria-pressed. Cart quantities remain from 1 through 99; quantity zero removes an item.

~~~tsx
function handleAddToCart(productId: string, quantity = 1) {
  setCartLines((lines) => addToCart(lines, productId, quantity));
  setToast("Mahsulot savatga qo‘shildi");
}
~~~

- [ ] **Step 4: Implement demo checkout feedback**

Cart drawer checkout must show a visible message: Bu demo versiya. Online to‘lov hali ulanmagan. This prevents a visible but non-functional checkout action.

- [ ] **Step 5: Run interactions, type-check, and build**

Run: npm run test:run -- src/app/App.test.tsx src/features/cart/cart-reducer.test.ts  
Expected: PASS.

Run: npm run typecheck  
Expected: exit code 0.

Run: npm run build  
Expected: Vite build succeeds.

## Task 8: Finish responsive behavior, accessibility regression coverage, and documentation

**Files:**
- Modify: src/app/styles.css
- Modify: src/app/App.test.tsx
- Create: README.md

**Interfaces:**
- Does not change public component behavior; completes visual and verification requirements.

- [ ] **Step 1: Write failing Escape regression tests**

~~~tsx
const user = userEvent.setup();
render(<App />);
await user.click(screen.getByRole("button", { name: /pushti pion buketini ko.rish/i }));
await user.keyboard("{Escape}");
expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
await user.click(screen.getByRole("button", { name: /savatni ochish/i }));
await user.keyboard("{Escape}");
expect(screen.queryByRole("complementary", { name: /savat/i })).not.toBeInTheDocument();
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: npm run test:run -- src/app/App.test.tsx  
Expected: FAIL if overlay Escape handling is missing.

- [ ] **Step 3: Complete responsive and motion-safe CSS**

At desktop render header/nav, 4 product columns plus filter panel, and quick-view modal. At tablet reduce catalog to 3 or 2 columns. At mobile collapse navigation, use 2 product columns, turn filters into a visible panel or drawer, and keep all overlays inside viewport. Add focus rings and reduced-motion rule.

~~~css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto;
    transition-duration: 0.01ms;
    animation-duration: 0.01ms;
  }
}
~~~

- [ ] **Step 4: Write README**

Document the exact commands below and the frontend-only checkout boundary.

~~~text
npm install
npm run dev
npm run test:run
npm run typecheck
npm run build
~~~

- [ ] **Step 5: Run full verification**

Run: npm run test:run  
Expected: all unit and integration tests pass.

Run: npm run typecheck  
Expected: exit code 0.

Run: npm run build  
Expected: production bundle succeeds.

Run: npm run dev -- --host 127.0.0.1  
Expected: header navigation, carousel, categories, filter, tabs, quick-view, favorite, cart, and demo checkout all work at 375px, 768px, and 1440px.

## Plan Self-Review

### Spec coverage

Tasks 2 through 8 cover hero slider, header navigation, categories, filters, tabs, quick-view, favorites, cart, promo CTA, local persistence, responsive states, empty states, keyboard close behavior, and Uzbek currency display. Backend features intentionally remain outside this front-end-only plan.

### Placeholder scan

No TBD, TODO, undefined interface, future placeholder, or unspecified error handling remains. Each named helper is introduced before a task consumes it.

### Type consistency

Product, CartLine, CatalogFilters, applyCatalogFilters, addToCart, setCartQuantity, and formatSum retain the same names and roles in all tasks.
