# TrebleAI Setup Guide

This guide will help you get TrebleAI up and running on your local machine or deploy it to production.

## Prerequisites

- Node.js 18+ or Bun/Pnpm
- npm, pnpm, or yarn package manager
- OpenAI API key (for AI chat functionality)

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd trebleai
```

### 2. Install Dependencies
```bash
pnpm install
# or
npm install
# or
yarn install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your API keys:

```env
OPENAI_API_KEY=sk-your-actual-key-here
```

**Getting an OpenAI API Key:**
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in to your account
3. Navigate to API keys section
4. Create a new API key
5. Copy and paste it into `.env.local`

### 4. Run the Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

### 5. Start Using TrebleAI

- **Practical Practice**: Upload sheet music and practice with AI guidance
- **Theory Assistant**: Ask questions about music theory
- **Reference Library**: Browse scales, chords, and notes

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4 Turbo |
| `NEXT_PUBLIC_APP_URL` | No | Application URL (defaults to localhost:3000) |

### Optional AI Providers

You can also use other AI providers with the Vercel AI SDK:

```env
# For Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_key

# For Groq
GROQ_API_KEY=your_groq_key

# For Cohere
COHERE_API_KEY=your_cohere_key
```

To use a different provider, modify the `/app/api/chat/route.ts` file to import the desired provider.

## Building for Production

### 1. Build the Application
```bash
pnpm build
```

### 2. Start Production Server
```bash
pnpm start
```

### 3. Verify Build
The build should complete without errors. Check the output for any warnings.

## Deployment to Vercel

The easiest way to deploy TrebleAI is to Vercel:

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel
```bash
vercel
```

Or connect your GitHub repository to Vercel dashboard:
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your repository
4. Add environment variables (OPENAI_API_KEY)
5. Deploy

### 3. Configure Custom Domain (Optional)
In Vercel dashboard, go to Project Settings > Domains and add your custom domain.

## Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

Build and run:
```bash
docker build -t trebleai .
docker run -p 3000:3000 -e OPENAI_API_KEY=your_key trebleai
```

## Troubleshooting

### "OPENAI_API_KEY is not set" Error
- Make sure you've created `.env.local`
- Verify you've added the correct API key
- Restart the dev server after adding the key

### Sheet Music Upload Not Working
- Ensure the file is in MusicXML (.musicxml) or PDF (.pdf) format
- Check file size is under 10MB
- Verify browser console for specific error messages

### Chat Not Responding
- Check your OpenAI API key has available credits
- Verify network connection
- Check browser console for error details
- Review `/app/api/chat/route.ts` for configuration

### Styling Issues (Dark Theme Not Applied)
- Clear browser cache and restart
- Check that `dark` class is on `<html>` element in `layout.tsx`
- Verify Tailwind CSS is properly configured in `tailwind.config.ts`

## Development Tools

### Code Quality
```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check
```

### Testing
The project uses Jest and React Testing Library:

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

## Performance Optimization

### Image Optimization
- Replace placeholder images with real images
- Use Next.js `Image` component for optimization
- Consider WebP format for better compression

### Code Splitting
- Large components are automatically code-split by Next.js
- Use dynamic imports for heavy libraries

### Database Caching
When adding a database:
- Implement caching with Redis/Upstash
- Use ISR (Incremental Static Regeneration) for reference data

## Security Checklist

Before deploying to production:

- [ ] API keys are in `.env.local` (not committed to git)
- [ ] `.env.local` is in `.gitignore`
- [ ] CORS is properly configured for API endpoints
- [ ] Input validation is implemented
- [ ] Rate limiting is configured (optional)
- [ ] HTTPS is enabled
- [ ] Security headers are set (Content-Security-Policy, etc.)

## Database Integration (Optional)

To add persistent data storage, integrate with Supabase or another database:

### Supabase Setup
1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your connection string
4. Install `@supabase/supabase-js`
5. Add to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_KEY=your_key
```

See `/components` for example database integration patterns.

## File Storage (Optional)

For uploading and storing files, integrate with Vercel Blob:

### Vercel Blob Setup
1. Enable Blob in Vercel project settings
2. Files will automatically be stored in Blob storage
3. Use `put()` method in API routes

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org)

## Support

For issues or questions:
1. Check the [README.md](./README.md)
2. Review the error message in browser console
3. Check the application logs
4. Open an issue on GitHub

## License

MIT License - See LICENSE file for details

---

Happy learning with TrebleAI!
