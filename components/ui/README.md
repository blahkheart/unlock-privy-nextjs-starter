# UI Components

This directory contains reusable UI components for the application.

## PrivyConnectButton

A full-featured wallet connect button with balance display, wallet management, and account linking features.

### Features

- 🔐 Wallet connection status display
- 💰 Live ETH and USDC balance tracking
- 📋 Copy wallet address
- 🔄 Refresh connection
- 🔗 Link/unlink wallets
- 📧 Link email and Farcaster
- 📊 Detailed wallet modal with QR code support
- ⚡ Auto-refresh balances every 30 seconds

### Usage

```tsx
import { PrivyConnectButton } from "@/components/ui/PrivyConnectButton";

function MyApp() {
  return (
    <div>
      <header>
        <PrivyConnectButton />
      </header>
      {/* Your app content */}
    </div>
  );
}
```

### Example Integration in Next.js App

```tsx
// pages/_app.tsx
import { PrivyProvider } from "@privy-io/react-auth";
import { PrivyConnectButton } from "@/components/ui/PrivyConnectButton";

export default function MyApp({ Component, pageProps }) {
  return (
    <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}>
      <div className="min-h-screen bg-gray-950 text-white">
        <nav className="flex justify-between items-center p-4">
          <h1>My App</h1>
          <PrivyConnectButton />
        </nav>
        <Component {...pageProps} />
      </div>
    </PrivyProvider>
  );
}
```

## Other UI Components

### Dialog

Modal dialog component for displaying content in an overlay.

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>My Dialog</DialogTitle>
    </DialogHeader>
    <p>Dialog content goes here</p>
  </DialogContent>
</Dialog>
```

### Button

Reusable button component with variants.

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default">Click me</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

### Card

Card layout component for grouping content.

```tsx
import { Card } from "@/components/ui/card";

<Card className="p-4">
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>
```

### CustomDropdown

Dropdown menu component with portal rendering and viewport-aware positioning.

```tsx
import {
  CustomDropdown,
  CustomDropdownItem,
  CustomDropdownLabel,
  CustomDropdownSeparator,
} from "@/components/ui/CustomDropdown";

<CustomDropdown
  trigger={<button>Open Menu</button>}
  align="end"
>
  <CustomDropdownLabel>Menu Title</CustomDropdownLabel>
  <CustomDropdownItem onClick={() => console.log("clicked")}>
    Item 1
  </CustomDropdownItem>
  <CustomDropdownSeparator />
  <CustomDropdownItem>Item 2</CustomDropdownItem>
</CustomDropdown>
```

## Styling

All components use Tailwind CSS classes and are designed to work with a dark theme by default. You can customize the styling by:

1. Modifying the component classes directly
2. Using the `className` prop to add additional styles
3. Updating your Tailwind config for global theme changes
