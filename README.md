# Fridge Check

AI-powered recipe suggestions from your fridge contents with transparent environmental impact tracking.

## Features

- **Photo Scan** - Upload a photo of your fridge or pantry. Claude Vision AI identifies ingredients and suggests recipes.
- **Quick List** - Type your ingredients for 90% more resource-efficient recipe suggestions.
- **Environmental Impact** - See the water, energy, and CO₂ used for each AI request.
- **Developer Stats** - Toggle to view token usage details.

## Tech Stack

- React + Vite
- Tailwind CSS
- Claude AI (Anthropic API)
- Vercel Serverless Functions

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Environment Variables

Create a `.env` file or add to Vercel:

```
ANTHROPIC_API_KEY=your_api_key_here
```

## Deployment

Deploy to Vercel and add your `ANTHROPIC_API_KEY` as an environment variable.

## Why Environmental Impact?

AI requires significant computing resources. By showing the water, energy, and CO₂ impact of each request, we help users make informed choices. The Quick List mode uses text-only AI which is ~90% more efficient than image analysis.

---

Built by [hereshecodes](https://hereshecodes.com)
