# TrebleAI Developer Guide

Complete guide for developers extending and customizing TrebleAI.

## Project Architecture

### Tech Stack Overview
```
Frontend: Next.js 16 + React 19 + TypeScript
Styling: Tailwind CSS 3.4 + CSS animations
UI Components: shadcn/ui
AI: Vercel AI SDK + OpenAI
Sheet Music: OpenSheetMusicDisplay (OSMD)
Icons: Lucide React
```

### File Organization Pattern

```
app/
├── [feature]/
│   └── page.tsx          # Route component
├── api/
│   └── [endpoint]/
│       └── route.ts      # API handler

components/
├── [component].tsx       # Reusable components
└── ui/                   # shadcn UI components

lib/
├── utils.ts             # Shared utilities
└── constants.ts         # App constants
```

---

## Adding New Pages

### Step 1: Create the Page Directory
```bash
mkdir -p app/your-feature
touch app/your-feature/page.tsx
```

### Step 2: Create the Page Component
```typescript
'use client';

import { useState } from 'react';

export default function YourFeaturePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/30 bg-card/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-foreground">Your Feature</h1>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Your content here */}
      </div>
    </div>
  );
}
```

### Step 3: Add Navigation Link
Update `components/navbar.tsx`:
```typescript
<Link
  href="/your-feature"
  className="px-4 py-2 rounded-lg text-foreground hover:bg-card/60 transition-colors"
>
  Your Feature
</Link>
```

---

## Creating New Components

### Component Template
```typescript
'use client';

import { ReactNode } from 'react';

interface YourComponentProps {
  children?: ReactNode;
  className?: string;
  // Add your props here
}

export default function YourComponent({
  children,
  className = '',
}: YourComponentProps) {
  return (
    <div className={`glass rounded-xl p-6 border border-border/30 ${className}`}>
      {children}
    </div>
  );
}
```

### Component Best Practices
1. **Use 'use client'** for interactive components
2. **Add TypeScript interfaces** for props
3. **Use Tailwind classes** for styling
4. **Implement error handling**
5. **Add loading states**
6. **Support className prop** for flexibility

### Reusable Pattern: Glass Effect
```typescript
// Use the glass class for consistent styling
<div className="glass rounded-xl p-6 border border-border/30">
  Content
</div>
```

---

## Adding New API Endpoints

### Endpoint Template
```typescript
// app/api/your-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { /* your params */ } = await request.json();

    // Validation
    if (!param) {
      return NextResponse.json(
        { error: 'Missing required parameter' },
        { status: 400 }
      );
    }

    // Your logic here
    const result = await processData();

    return NextResponse.json({
      data: result,
      success: true,
    });
  } catch (error) {
    console.error('[v0] Error:', error);
    return NextResponse.json(
      {
        error: 'Operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Add other HTTP methods as needed
export async function GET(request: NextRequest) {
  // ...
}
```

### Error Handling Pattern
```typescript
// Always include detailed error logging
console.error('[v0] [ComponentName]:', error);

// Return user-friendly error messages
return NextResponse.json(
  { error: 'User-friendly message' },
  { status: 500 }
);
```

---

## Styling Guidelines

### Color Tokens
```css
/* Use these CSS variables */
--background: hsl(240 10% 8%);
--foreground: hsl(0 0% 98%);
--primary: hsl(220 90% 56%);
--secondary: hsl(270 80% 60%);
--accent: hsl(270 100% 65%);
--border: hsl(240 10% 25%);
```

### Tailwind Patterns
```typescript
// Spacing
<div className="px-4 py-6">         // Padding
<div className="gap-4">              // Gap in flex/grid
<div className="space-y-4">          // Vertical spacing

// Colors
<div className="bg-background text-foreground">
<div className="bg-card border border-border/30">
<button className="bg-primary text-white">

// Glass Effect
<div className="glass rounded-xl p-6 border border-border/30">

// Hover States
<button className="hover:bg-card/60 transition-colors">
<button className="hover:shadow-glow transition-shadow">

// Animations
<div className="animate-fade-in">
<div className="animate-slide-up">
```

### Responsive Design
```typescript
// Mobile-first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>

<div className="text-base md:text-lg lg:text-xl">
  {/* Different sizes per breakpoint */}
</div>
```

---

## Working with AI Integration

### Current Setup
- Provider: OpenAI GPT-4 Turbo
- SDK: Vercel AI SDK v6
- Location: `/app/api/chat/route.ts`

### Adding a Different AI Provider

#### Using Anthropic Claude
```typescript
import { anthropic } from '@ai-sdk/anthropic';

const { text } = await generateText({
  model: anthropic('claude-3-sonnet-20240229'),
  system: systemPrompt,
  messages,
});
```

#### Using Groq
```typescript
import { groq } from '@ai-sdk/groq';

const { text } = await generateText({
  model: groq('mixtral-8x7b-32768'),
  system: systemPrompt,
  messages,
});
```

### Customizing System Prompts
```typescript
const systemPrompt = `You are an expert in music theory.
Your role is to help musicians understand:
- Scales and harmony
- Chords and progressions
- Music notation and theory

Be thorough, clear, and provide examples.`;
```

---

## Database Integration

### Adding Supabase

1. Install client:
```bash
pnpm add @supabase/supabase-js
```

2. Set environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_KEY=your_key
```

3. Create helper:
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);
```

4. Use in components:
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('users')
  .select('*');
```

### Adding Neon PostgreSQL

1. Install client:
```bash
pnpm add @neondatabase/serverless
```

2. Set environment variables:
```env
DATABASE_URL=your_connection_string
```

3. Create queries with SQL:
```typescript
import { sql } from '@vercel/postgres';

const result = await sql`
  SELECT * FROM users WHERE id = ${id}
`;
```

---

## File Storage

### Using Vercel Blob

1. Enable in Vercel project settings
2. Use in API route:
```typescript
import { put } from '@vercel/blob';

const blob = await put(filename, file, {
  access: 'private',
});

return { url: blob.url };
```

### Using AWS S3

1. Install SDK:
```bash
pnpm add @aws-sdk/client-s3
```

2. Set credentials:
```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
AWS_REGION=us-east-1
```

3. Upload files:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const client = new S3Client({ region: process.env.AWS_REGION });
await client.send(
  new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: filename,
    Body: fileContent,
  })
);
```

---

## Testing

### Component Testing
```typescript
import { render, screen } from '@testing-library/react';
import YourComponent from '@/components/your-component';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### API Testing
```typescript
import { POST } from '@/app/api/your-endpoint/route';

describe('Your Endpoint', () => {
  it('handles POST request', async () => {
    const request = new Request('http://localhost:3000/api/your-endpoint', {
      method: 'POST',
      body: JSON.stringify({ /* test data */ }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

---

## Performance Optimization

### Code Splitting
```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('@/components/heavy-component'),
  { loading: () => <div>Loading...</div> }
);
```

### Image Optimization
```typescript
import Image from 'next/image';

<Image
  src="/image.webp"
  alt="Description"
  width={800}
  height={600}
  priority // For above-fold images
/>
```

### Memoization
```typescript
import { memo } from 'react';

const ExpensiveComponent = memo(({ data }) => {
  return <div>{data}</div>;
});
```

---

## Debugging

### Console Logging Pattern
```typescript
console.log('[v0] [ComponentName]:', message);
console.error('[v0] [ComponentName]:', error);

// Examples:
console.log('[v0] AIChat:', 'Message sent');
console.error('[v0] Upload:', 'File validation failed');
```

### Browser DevTools
1. **Network Tab**: Monitor API calls
2. **Console**: Check for errors
3. **React DevTools**: Inspect component state
4. **Performance Tab**: Identify bottlenecks

### Debug Logging in API
```typescript
console.log('[v0] POST /api/chat:', {
  messageLength: message.length,
  historyCount: history?.length,
  timestamp: new Date().toISOString(),
});
```

---

## Common Tasks

### Add a New Reference Item
Edit `/app/reference-library/page.tsx`:
```typescript
const REFERENCE_DATA = [
  // ... existing items
  {
    title: 'E Major Scale',
    category: 'scales',
    notes: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
    formula: 'W-W-H-W-W-W-H',
    description: 'The E major scale contains four sharps.',
  },
];
```

### Modify Chat System Prompt
Edit `/app/api/chat/route.ts` or pass in request:
```typescript
const fullSystemPrompt = `${systemPrompt}\n\nCurrent Context: ${context}`;
```

### Change Theme Colors
Edit `tailwind.config.ts`:
```typescript
colors: {
  primary: 'hsl(220 90% 56%)',  // Change to your color
  secondary: 'hsl(270 80% 60%)',
  // ... update other colors
}
```

### Add a New Animation
Edit `tailwind.config.ts`:
```typescript
keyframes: {
  fadeIn: { /* ... */ },
  customAnimation: {
    '0%': { /* start state */ },
    '100%': { /* end state */ },
  },
},
animation: {
  'custom': 'customAnimation 0.5s ease-out',
}
```

---

## Environment Variables Reference

### Required
- `OPENAI_API_KEY` - OpenAI API key

### Optional
- `NEXT_PUBLIC_APP_URL` - Application URL
- `ANTHROPIC_API_KEY` - For Anthropic provider
- `GROQ_API_KEY` - For Groq provider
- `DATABASE_URL` - Database connection string
- `AWS_ACCESS_KEY_ID` - AWS S3 access
- `AWS_SECRET_ACCESS_KEY` - AWS S3 secret

---

## Git Workflow

### Branch Naming
```
feature/add-user-accounts
fix/chat-error-handling
docs/api-documentation
refactor/component-structure
```

### Commit Messages
```
feat: Add user authentication with Supabase
fix: Resolve OSMD rendering issues
docs: Update deployment guide
refactor: Extract chat logic into hooks
```

### Before Committing
```bash
pnpm lint
pnpm build
pnpm test
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All dependencies installed
- [ ] No console errors or warnings
- [ ] Environment variables configured
- [ ] API endpoints tested
- [ ] Responsive design verified
- [ ] Performance optimized

### Vercel Deployment
```bash
vercel --prod
```

### Post-Deployment
- [ ] Test all pages and features
- [ ] Verify API endpoints
- [ ] Check error logging
- [ ] Monitor performance metrics
- [ ] Test on mobile devices

---

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [OpenAI API](https://platform.openai.com/docs)

### Libraries
- [shadcn/ui](https://ui.shadcn.com) - Pre-built components
- [Lucide React](https://lucide.dev) - Icons
- [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org) - Sheet music

### Tools
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [Prettier](https://prettier.io) - Code formatter

---

## Support

For questions or issues:
1. Check this guide for solutions
2. Review existing code patterns
3. Check documentation links
4. Open issues on GitHub

---

**Last Updated**: May 2024
**Version**: 1.0.0
