# 🧪 Theme System Testing Guide

## Quick Test Instructions

### 1. Start the Development Server

```bash
cd /workspace/frontend
npm run dev
```

### 2. Open Browser Console

Navigate to your application and open Developer Tools (F12).

### 3. Toggle Dark Mode

Run this command in the console:

```javascript
// Toggle dark mode
document.documentElement.classList.toggle('dark');

// Or manually add/remove
document.documentElement.classList.add('dark');    // Enable dark mode
document.documentElement.classList.remove('dark'); // Disable dark mode
```

## Visual Verification Checklist

### ✅ Layout Components

- [ ] **Sidebar**
  - Background color changes
  - Border color adapts
  - Link hover states work
  - Text remains readable

- [ ] **Topbar**
  - Background transitions smoothly
  - Border separates from content
  - Icons are visible

- [ ] **Main Content Area**
  - Background color appropriate
  - Text color has good contrast

### ✅ Cards & Panels

- [ ] **Stat Cards**
  - Background color changes
  - Text is readable
  - Hover effect visible
  - Borders are present

- [ ] **Summary Cards**
  - Background appropriate
  - All text legible
  - Icons visible

- [ ] **Quick Cards**
  - Hover state works
  - Shadow visible in both modes

### ✅ Tables

- [ ] **Table Headers**
  - Text color muted appropriately
  - Background differentiates from rows

- [ ] **Table Rows**
  - Background color consistent
  - Hover state visible
  - Alternating rows (if applicable)
  - Border separation clear

- [ ] **Table Actions**
  - Buttons visible
  - Dropdown menus readable
  - Icons clear

### ✅ Forms & Inputs

- [ ] **Text Inputs**
  - Background color distinct
  - Border visible
  - Focus state clear (blue ring)
  - Placeholder text readable
  - Input text has good contrast

- [ ] **Textareas**
  - Same as text inputs
  - Resize handle visible

- [ ] **Select Dropdowns**
  - Background appropriate
  - Options readable
  - Selected state clear

- [ ] **Buttons**
  - **Primary**: Blue background, white text
  - **Secondary**: Appropriate background, text visible
  - **Accent/Reserve**: Orange background, white text
  - **Destructive**: Red background, white text
  - **Ghost**: Transparent, hover background visible
  - **Outline**: Border visible, background on hover

### ✅ Status Badges & Tags

- [ ] **Success Tags** (Green)
  - Background color appropriate
  - Text readable
  - Dark mode: lighter background, bright text

- [ ] **Warning Tags** (Yellow/Orange)
  - Background color appropriate
  - Text readable
  - Dark mode: darker background, light text

- [ ] **Error Tags** (Red)
  - Background color appropriate
  - Text readable
  - Dark mode: darker background, light text

- [ ] **Info Tags** (Blue)
  - Background color appropriate
  - Text readable
  - Dark mode: darker background, light text

### ✅ Modals & Dialogs

- [ ] **Modal Overlay**
  - Darkens background
  - Blur effect visible

- [ ] **Modal Content**
  - Background color appropriate
  - Text readable
  - Close button visible
  - Form elements inside modal work

### ✅ Dropdowns & Menus

- [ ] **Dropdown Menu Items**
  - Background color appropriate
  - Text readable
  - Hover state visible
  - Icons visible
  - Delete items show red color

### ✅ Special Components

- [ ] **Brand Logo**
  - Light mode: Soft gradient
  - Dark mode: Metallic sheen animation
  - Animation smooth

- [ ] **Auth Pages** (Login/Register)
  - Glass effect visible
  - Form inputs readable
  - Background gradient appropriate
  - Brand logo SVG visible with animation

## Accessibility Testing

### Contrast Ratio Verification

1. **Use Browser DevTools**
   - Right-click any text element
   - Select "Inspect"
   - Look for "Accessibility" tab
   - Check contrast ratio

2. **Minimum Requirements**
   - Normal text: **4.5:1** minimum
   - Large text (18pt+): **3:1** minimum
   - UI components: **3:1** minimum

3. **Problem Areas to Check**
   - [ ] Muted text on backgrounds
   - [ ] Placeholders in inputs
   - [ ] Disabled button text
   - [ ] Secondary navigation items
   - [ ] Table header text

### Screen Reader Testing

```bash
# macOS
VoiceOver: Cmd + F5

# Windows
NVDA: Download from nvaccess.org

# Linux
Orca: Built-in to GNOME
```

Navigate through the application and verify:
- [ ] All interactive elements are announced
- [ ] Form labels are read correctly
- [ ] Button purposes are clear
- [ ] Status changes are announced

## Common Issues & Solutions

### Issue: Text is too light in dark mode

**Solution**: Check if the element is using the correct token:
```css
/* ❌ Wrong */
color: var(--color-text-muted); /* Too light on dark backgrounds */

/* ✅ Correct */
color: var(--color-text); /* High contrast in all modes */
```

### Issue: Buttons are invisible

**Solution**: Ensure button uses semantic tokens:
```tsx
// ✅ Correct
<button className="bg-primary text-button-text hover:bg-primary-hover">
  Click me
</button>
```

### Issue: Hover states don't work

**Solution**: Check that hover state uses token:
```css
/* ✅ Correct */
.card:hover {
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}
```

### Issue: Modal background not dark enough

**Solution**: Verify overlay uses correct token:
```css
.drawer-overlay {
  background: var(--color-overlay); /* Automatically adjusts for dark mode */
}
```

## Performance Testing

### Check Transition Smoothness

```javascript
// In browser console, rapidly toggle dark mode
setInterval(() => {
  document.documentElement.classList.toggle('dark');
}, 1000);
```

Verify:
- [ ] No flash of unstyled content
- [ ] Smooth color transitions
- [ ] No layout shift
- [ ] Animations don't stutter

### Check Initial Load

```javascript
// In browser console
performance.getEntriesByType('paint').forEach(entry => {
  console.log(`${entry.name}: ${entry.startTime}ms`);
});
```

Target:
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s

## Browser Testing

Test in multiple browsers:

- [ ] **Chrome/Edge** (Chromium)
- [ ] **Firefox**
- [ ] **Safari** (if on macOS)
- [ ] **Mobile Safari** (iOS)
- [ ] **Mobile Chrome** (Android)

## Responsive Testing

Test at different breakpoints:

- [ ] **Mobile** (< 640px)
  - Cards stack properly
  - Buttons are touchable (min 44px)
  - Text is readable
  - Tables convert to cards

- [ ] **Tablet** (640px - 1024px)
  - Sidebar may collapse
  - Tables show/hide columns appropriately
  - Touch targets adequate

- [ ] **Desktop** (> 1024px)
  - Full layout displayed
  - Hover states work
  - Multi-column layouts function

## Automated Testing (Optional)

### Install Accessibility Testing Tool

```bash
npm install --save-dev @axe-core/playwright
```

### Example Test

```typescript
// tests/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Sign-off Checklist

Before considering the theme system complete:

- [ ] All visual tests pass
- [ ] No contrast ratio violations
- [ ] Smooth dark mode toggle
- [ ] No console errors
- [ ] Tested in 3+ browsers
- [ ] Tested on mobile device
- [ ] Screen reader navigation works
- [ ] Documentation updated
- [ ] Team trained on token usage

---

## 🎉 Success Criteria

The theme system refactor is complete when:

✅ **Functionality**: Dark mode toggle works throughout app  
✅ **Accessibility**: All WCAG AA standards met  
✅ **Consistency**: Visual coherence across all pages  
✅ **Performance**: No noticeable lag when switching  
✅ **Maintainability**: Tokens used consistently  

---

**Need Help?** Refer to `THEME_SYSTEM_REFACTOR.md` for architecture details.
