# Hospital Management System - UI Documentation

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Library](#component-library)
6. [Shadows & Effects](#shadows--effects)
7. [Animation & Transitions](#animation--transitions)
8. [Responsive Design](#responsive-design)
9. [Usage Guidelines](#usage-guidelines)

---

## Design Philosophy

The Hospital Management System follows a **modern, clean, and professional** design approach with emphasis on:
- **Accessibility**: High contrast ratios and clear visual hierarchy
- **Usability**: Intuitive navigation and consistent interactions
- **Medical Context**: Professional appearance suitable for healthcare environments
- **Modern Aesthetics**: Contemporary design with subtle gradients and smooth transitions

---

## Color Palette

### Primary Colors
```css
/* Primary Blue - Main brand color */
primary-50: #eff6ff
primary-100: #dbeafe
primary-200: #bfdbfe
primary-300: #93c5fd
primary-400: #60a5fa
primary-500: #3b82f6  /* Base primary */
primary-600: #2563eb
primary-700: #1d4ed8
primary-800: #1e40af
primary-900: #1e3a8a
primary-950: #172554
```

### Medical Theme Colors
```css
/* Medical Green - Health & wellness */
medical-50: #f0fdf4
medical-100: #dcfce7
medical-200: #bbf7d0
medical-300: #86efac
medical-400: #4ade80
medical-500: #22c55e  /* Base medical */
medical-600: #16a34a
medical-700: #15803d
medical-800: #166534
medical-900: #14532d
medical-950: #052e16
```

### Hospital Theme Colors
```css
/* Hospital Blue - Professional medical */
hospital-50: #f8fafc
hospital-100: #f1f5f9
hospital-200: #e2e8f0
hospital-300: #cbd5e1
hospital-400: #94a3b8
hospital-500: #64748b  /* Base hospital */
hospital-600: #475569
hospital-700: #334155
hospital-800: #1e293b
hospital-900: #0f172a
hospital-950: #020617
```

### Semantic Colors
```css
/* Success */
success: #22c55e (green-500)
success-light: #dcfce7 (green-100)
success-dark: #15803d (green-700)

/* Warning */
warning: #f59e0b (amber-500)
warning-light: #fef3c7 (amber-100)
warning-dark: #d97706 (amber-600)

/* Error */
error: #ef4444 (red-500)
error-light: #fee2e2 (red-100)
error-dark: #dc2626 (red-600)

/* Info */
info: #3b82f6 (blue-500)
info-light: #dbeafe (blue-100)
info-dark: #2563eb (blue-600)
```

### Neutral Colors
```css
/* Gray Scale */
gray-50: #f9fafb
gray-100: #f3f4f6
gray-200: #e5e7eb
gray-300: #d1d5db
gray-400: #9ca3af
gray-500: #6b7280
gray-600: #4b5563
gray-700: #374151
gray-800: #1f2937
gray-900: #111827
gray-950: #030712
```

---

## Typography

### Font Family
```css
/* Primary Font */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace (for codes, IDs) */
font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
```

### Font Sizes
```css
/* Text Sizes */
text-xs: 0.75rem (12px)     /* Small labels, captions */
text-sm: 0.875rem (14px)    /* Secondary text, descriptions */
text-base: 1rem (16px)      /* Body text, default */
text-lg: 1.125rem (18px)    /* Emphasized text */
text-xl: 1.25rem (20px)     /* Small headings */
text-2xl: 1.5rem (24px)     /* Medium headings */
text-3xl: 1.875rem (30px)   /* Large headings */
text-4xl: 2.25rem (36px)    /* Extra large headings */
```

### Font Weights
```css
font-light: 300      /* Light text */
font-normal: 400     /* Regular text */
font-medium: 500     /* Medium emphasis */
font-semibold: 600   /* Strong emphasis */
font-bold: 700       /* Bold headings */
font-extrabold: 800  /* Extra bold */
```

### Typography Usage
```css
/* Page Titles */
.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}

/* Section Headings */
.section-heading {
  font-size: 1.5rem;
  font-weight: 600;
  color: #374151;
  line-height: 1.3;
}

/* Card Titles */
.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
}

/* Body Text */
.body-text {
  font-size: 1rem;
  font-weight: 400;
  color: #4b5563;
  line-height: 1.6;
}

/* Small Text */
.small-text {
  font-size: 0.875rem;
  font-weight: 400;
  color: #6b7280;
  line-height: 1.5;
}
```

---

## Spacing & Layout

### Spacing Scale
```css
/* Tailwind Spacing Scale */
0: 0px
1: 0.25rem (4px)
2: 0.5rem (8px)
3: 0.75rem (12px)
4: 1rem (16px)
5: 1.25rem (20px)
6: 1.5rem (24px)
8: 2rem (32px)
10: 2.5rem (40px)
12: 3rem (48px)
16: 4rem (64px)
20: 5rem (80px)
24: 6rem (96px)
```

### Layout Patterns
```css
/* Container Widths */
max-w-7xl: 80rem (1280px)    /* Main content container */
max-w-6xl: 72rem (1152px)    /* Large content areas */
max-w-4xl: 56rem (896px)     /* Medium content areas */
max-w-2xl: 42rem (672px)     /* Small content areas */

/* Common Padding */
px-6: 1.5rem (24px)          /* Horizontal padding */
py-6: 1.5rem (24px)          /* Vertical padding */
p-6: 1.5rem (24px)           /* All sides padding */

/* Common Margins */
mb-6: 1.5rem (24px)          /* Bottom margin */
mt-6: 1.5rem (24px)          /* Top margin */
```

---

## Component Library

### Cards
```css
/* Base Card */
.card {
  background: white;
  border-radius: 1rem (16px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #f3f4f6;
  padding: 1.5rem (24px);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

/* Large Card */
.card-large {
  border-radius: 1.5rem (24px);
  padding: 2rem (32px);
}

/* Compact Card */
.card-compact {
  border-radius: 0.75rem (12px);
  padding: 1rem (16px);
}
```

### Buttons
```css
/* Primary Button */
.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem (12px);
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Secondary Button */
.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border-radius: 0.75rem (12px);
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #e5e7eb;
  color: #111827;
}

/* Icon Button */
.btn-icon {
  padding: 0.5rem;
  border-radius: 0.5rem (8px);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  background: #f3f4f6;
}
```

### Form Elements
```css
/* Input Fields */
.input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem (8px);
  font-size: 0.875rem;
  transition: all 0.2s ease;
  background: white;
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Select Dropdown */
.select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem (8px);
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

/* Label */
.label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}
```

### Status Badges
```css
/* Success Badge */
.badge-success {
  background: #dcfce7;
  color: #166534;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Warning Badge */
.badge-warning {
  background: #fef3c7;
  color: #92400e;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Error Badge */
.badge-error {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Info Badge */
.badge-info {
  background: #dbeafe;
  color: #1e40af;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}
```

### Avatar/Profile Images
```css
/* Avatar Circle */
.avatar {
  width: 3rem (48px);
  height: 3rem (48px);
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 1rem;
}

/* Large Avatar */
.avatar-lg {
  width: 4rem (64px);
  height: 4rem (64px);
  font-size: 1.25rem;
}

/* Small Avatar */
.avatar-sm {
  width: 2rem (32px);
  height: 2rem (32px);
  font-size: 0.75rem;
}
```

### Navigation
```css
/* Navigation Link */
.nav-link {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: #6b7280;
  text-decoration: none;
  border-radius: 0.5rem (8px);
  transition: all 0.2s ease;
  font-weight: 500;
}

.nav-link:hover {
  background: #f3f4f6;
  color: #374151;
}

.nav-link.active {
  background: #dbeafe;
  color: #2563eb;
}

/* Sidebar Item */
.sidebar-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  margin-bottom: 0.25rem;
  border-radius: 0.75rem (12px);
  transition: all 0.2s ease;
  cursor: pointer;
}

.sidebar-item:hover {
  background: rgba(59, 130, 246, 0.1);
}

.sidebar-item.active {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}
```

---

## Shadows & Effects

### Box Shadows
```css
/* Shadow Scale */
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)
shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)
shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)
shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)
shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)

/* Custom Shadows */
shadow-primary: 0 4px 12px rgba(59, 130, 246, 0.15)
shadow-success: 0 4px 12px rgba(34, 197, 94, 0.15)
shadow-warning: 0 4px 12px rgba(245, 158, 11, 0.15)
shadow-error: 0 4px 12px rgba(239, 68, 68, 0.15)
```

### Border Radius
```css
/* Radius Scale */
rounded-sm: 0.125rem (2px)
rounded: 0.25rem (4px)
rounded-md: 0.375rem (6px)
rounded-lg: 0.5rem (8px)
rounded-xl: 0.75rem (12px)
rounded-2xl: 1rem (16px)
rounded-3xl: 1.5rem (24px)
rounded-full: 9999px
```

### Gradients
```css
/* Primary Gradients */
.gradient-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}

.gradient-medical {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.gradient-hospital {
  background: linear-gradient(135deg, #64748b, #475569);
}

/* Background Gradients */
.bg-gradient-light {
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
}

.bg-gradient-primary {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
}

.bg-gradient-medical {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
}
```

---

## Animation & Transitions

### Transition Durations
```css
/* Duration Scale */
duration-75: 75ms
duration-100: 100ms
duration-150: 150ms
duration-200: 200ms    /* Default for most interactions */
duration-300: 300ms
duration-500: 500ms
duration-700: 700ms
duration-1000: 1000ms
```

### Common Transitions
```css
/* Smooth Transitions */
.transition-smooth {
  transition: all 0.2s ease;
}

.transition-colors {
  transition: color 0.2s ease, background-color 0.2s ease;
}

.transition-shadow {
  transition: box-shadow 0.2s ease;
}

.transition-transform {
  transition: transform 0.2s ease;
}
```

### Hover Effects
```css
/* Card Hover */
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

/* Button Hover */
.btn-hover:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Icon Hover */
.icon-hover:hover {
  transform: scale(1.1);
}
```

---

## Responsive Design

### Breakpoints
```css
/* Tailwind Breakpoints */
sm: 640px    /* Small devices */
md: 768px    /* Medium devices */
lg: 1024px   /* Large devices */
xl: 1280px   /* Extra large devices */
2xl: 1536px  /* 2X large devices */
```

### Grid Layouts
```css
/* Responsive Grid */
.grid-responsive {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .grid-responsive {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid-responsive {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .grid-responsive {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Mobile-First Approach
```css
/* Mobile First Examples */
.responsive-padding {
  padding: 1rem;
}

@media (min-width: 768px) {
  .responsive-padding {
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .responsive-padding {
    padding: 2rem;
  }
}
```

---

## Usage Guidelines

### Do's ✅
- Use consistent spacing from the defined scale
- Apply hover effects to interactive elements
- Maintain proper contrast ratios for accessibility
- Use semantic colors for status indicators
- Keep card designs consistent across the application
- Use the defined typography hierarchy
- Apply smooth transitions to enhance user experience

### Don'ts ❌
- Don't use arbitrary spacing values outside the scale
- Don't mix different border radius values in the same component
- Don't use colors outside the defined palette
- Don't create overly complex animations
- Don't ignore responsive design principles
- Don't use low contrast color combinations

### Accessibility Guidelines
- Maintain minimum contrast ratio of 4.5:1 for normal text
- Maintain minimum contrast ratio of 3:1 for large text
- Ensure interactive elements have focus states
- Use semantic HTML elements
- Provide alternative text for images
- Ensure keyboard navigation works properly

### Performance Considerations
- Use CSS transforms for animations instead of changing layout properties
- Minimize the use of box-shadows on many elements
- Optimize images and use appropriate formats
- Use CSS custom properties for theme consistency
- Minimize the number of different font weights loaded

---

## Implementation Notes

This design system is implemented using:
- **Tailwind CSS** for utility-first styling
- **CSS Custom Properties** for theme variables
- **Inter Font** for typography
- **Lucide React** for consistent iconography
- **Framer Motion** for advanced animations (where needed)

All components should follow these guidelines to maintain visual consistency and provide an excellent user experience across the Hospital Management System.