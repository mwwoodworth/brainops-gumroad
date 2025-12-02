# 🎨 Modern Command Center UI Kit
### Glassmorphic React Components for Next.js

---

## 🚀 Getting Started

### 1. Overview
Stop fighting with CSS. This kit provides the exact "Glassmorphic" dashboard components used in the BrainOps Command Center. It is built with **Tailwind CSS** and designed for **Dark Mode** first.

### 2. Installation

1.  **Prerequisites:** A Next.js project with Tailwind CSS installed.
2.  **Dependencies:**
    ```bash
    npm install lucide-react framer-motion clsx tailwind-merge
    ```

### 3. Using the Components

#### The "Breezy" Card
This is the signature component. It features a subtle gradient border, blurred background, and hover glow.

1.  Copy `components/ui/breezy-card.tsx` to your project.
2.  Import and use:
    ```tsx
    import { BreezyCard, BreezyCardHeader, BreezyCardContent } from '@/components/ui/breezy-card';

    <BreezyCard variant="highlight">
      <BreezyCardHeader>
        <h2>Total Revenue</h2>
      </BreezyCardHeader>
      <BreezyCardContent>
        <p className="text-4xl font-bold">$150,000</p>
      </BreezyCardContent>
    </BreezyCard>
    ```

#### The Dashboard Layout
Copy `dashboard-example.tsx` to see how to compose a full admin panel with:
*   **Metric Tiles:** Auto-responsive grids.
*   **Data Stream:** A scrollable list of real-time events.
*   **Action Chips:** Pill-shaped buttons for quick filtering.

### 4. Customization
Go to `tailwind.config.js` (not included, but in your project) and ensure you have colors defined for `slate-900`, `cyan-500`, `purple-500` to match the neon aesthetic.

---

## 💡 Design Philosophy
*   **Information Density:** We use small fonts (text-xs, text-sm) with high contrast to show more data without clutter.
*   **Visual Hierarchy:** Use `variant="highlight"` on the Card component to draw attention to the most important metric on the screen.

---

## 🆘 Support
Need a specific component? Email **support@brainops.io**.
