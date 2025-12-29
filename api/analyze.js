// Vercel Serverless Function to analyze fridge/pantry images and suggest recipes
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, ingredients, mode } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    let response;

    if (mode === 'photo' && image) {
      // Vision mode - analyze image
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: image,
                },
              },
              {
                type: 'text',
                text: `Analyze this image of a fridge, pantry, or food items.

1. List all the ingredients/food items you can identify
2. Suggest 3 recipes that could be made with these ingredients

Respond in this exact JSON format:
{
  "ingredients": ["ingredient1", "ingredient2", ...],
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Brief description",
      "time": "~30 min",
      "instructions": ["Step 1", "Step 2", "Step 3"],
      "missing": ["optional items that would enhance this recipe"]
    }
  ]
}

Focus on practical, everyday recipes. If you can't identify many ingredients, suggest simple recipes with what you can see.
Only respond with JSON, no other text.`
              },
            ],
          },
        ],
      });
    } else if (mode === 'text' && ingredients) {
      // Text mode - just get recipes from ingredient list
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `I have these ingredients: ${ingredients}

Suggest 3 recipes I could make with these ingredients.

Respond in this exact JSON format:
{
  "ingredients": ["ingredient1", "ingredient2", ...],
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Brief description",
      "time": "~30 min",
      "instructions": ["Step 1", "Step 2", "Step 3"],
      "missing": ["optional items that would enhance this recipe"]
    }
  ]
}

The ingredients array should be a cleaned-up list of what I mentioned.
Focus on practical, everyday recipes that primarily use my ingredients.
Only respond with JSON, no other text.`
          },
        ],
      });
    } else {
      return res.status(400).json({ error: 'Invalid request: provide image or ingredients' });
    }

    // Parse the response
    const analysisText = response.content[0].text;
    let analysis;

    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(500).json({
        error: 'Could not parse AI response',
        raw: analysisText
      });
    }

    return res.status(200).json({
      ...analysis,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze',
      details: error.status || error.code
    });
  }
}
