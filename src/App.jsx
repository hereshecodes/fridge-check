import { useState, useRef } from 'react'

// Environmental impact calculations (estimates based on AI industry research)
// Sources: https://arxiv.org/abs/2104.10350, Anthropic usage estimates
const calculateImpact = (inputTokens, outputTokens) => {
  const totalTokens = inputTokens + outputTokens;

  // Estimates per 1000 tokens (conservative)
  // Water: ~0.5ml per 1000 tokens (data center cooling)
  // Energy: ~0.0003 kWh per 1000 tokens
  // CO2: ~0.2g per 1000 tokens

  const waterMl = (totalTokens / 1000) * 0.5;
  const energyKwh = (totalTokens / 1000) * 0.0003;
  const co2Grams = (totalTokens / 1000) * 0.2;

  return {
    tokens: { input: inputTokens, output: outputTokens, total: totalTokens },
    water: waterMl,
    energy: energyKwh,
    co2: co2Grams,
    // Fun comparisons
    phoneCharges: energyKwh / 0.01, // ~0.01 kWh per phone charge
    drinkingGlasses: waterMl / 250, // 250ml per glass
  };
};

function App() {
  const [mode, setMode] = useState('choice'); // choice, photo, text
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [impact, setImpact] = useState(null);
  const [totalImpact, setTotalImpact] = useState({ water: 0, energy: 0, co2: 0, scans: 0 });
  const [showDevStats, setShowDevStats] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const analyzeImage = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            mode: 'photo'
          }),
        });

        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setIngredients(data.ingredients || []);
          setRecipes(data.recipes || []);

          // Calculate and store impact
          if (data.usage) {
            const newImpact = calculateImpact(data.usage.input_tokens, data.usage.output_tokens);
            setImpact(newImpact);
            setTotalImpact(prev => ({
              water: prev.water + newImpact.water,
              energy: prev.energy + newImpact.energy,
              co2: prev.co2 + newImpact.co2,
              scans: prev.scans + 1
            }));
          }
        }

        setLoading(false);
      };
      reader.readAsDataURL(image);
    } catch (err) {
      setError('Failed to analyze image. Please try again.');
      setLoading(false);
    }
  };

  const analyzeText = async () => {
    if (!textInput.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: textInput,
          mode: 'text'
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setIngredients(data.ingredients || []);
        setRecipes(data.recipes || []);

        // Calculate and store impact
        if (data.usage) {
          const newImpact = calculateImpact(data.usage.input_tokens, data.usage.output_tokens);
          setImpact(newImpact);
          setTotalImpact(prev => ({
            water: prev.water + newImpact.water,
            energy: prev.energy + newImpact.energy,
            co2: prev.co2 + newImpact.co2,
            scans: prev.scans + 1
          }));
        }
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to get recipes. Please try again.');
      setLoading(false);
    }
  };

  const reset = () => {
    setMode('choice');
    setImage(null);
    setImagePreview(null);
    setIngredients([]);
    setTextInput('');
    setRecipes([]);
    setError(null);
    setImpact(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🥗</span>
            <div>
              <h1 className="text-xl font-bold text-amber-900">Fridge Check</h1>
              <p className="text-xs text-amber-600">Planet-conscious AI recipes</p>
            </div>
          </div>

          {totalImpact.scans > 0 && (
            <div className="text-right text-xs text-amber-700">
              <div className="font-medium">Session Impact</div>
              <div>💧 {totalImpact.water.toFixed(1)}ml water</div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Mode Selection */}
        {mode === 'choice' && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-amber-900 mb-2">What's in your fridge?</h2>
              <p className="text-amber-700">Get recipe ideas from your ingredients</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Photo Mode */}
              <button
                onClick={() => setMode('photo')}
                className="bg-white rounded-2xl p-8 border-2 border-amber-200 hover:border-amber-400 hover:shadow-lg transition-all text-left group"
              >
                <div className="text-5xl mb-4">📸</div>
                <h3 className="text-lg font-bold text-amber-900 mb-2">Scan Photo</h3>
                <p className="text-amber-600 text-sm mb-4">
                  Upload a photo of your fridge or pantry. AI will identify ingredients.
                </p>
                <div className="flex items-center gap-2 text-xs text-amber-500">
                  <span className="bg-amber-100 px-2 py-1 rounded">💧 ~2ml water</span>
                  <span className="bg-amber-100 px-2 py-1 rounded">Vision AI</span>
                </div>
              </button>

              {/* Text Mode */}
              <button
                onClick={() => setMode('text')}
                className="bg-white rounded-2xl p-8 border-2 border-green-200 hover:border-green-400 hover:shadow-lg transition-all text-left group"
              >
                <div className="text-5xl mb-4">✏️</div>
                <h3 className="text-lg font-bold text-green-800 mb-2">Quick List</h3>
                <p className="text-green-600 text-sm mb-4">
                  Type your ingredients. Faster and uses 90% less resources!
                </p>
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <span className="bg-green-100 px-2 py-1 rounded">💧 ~0.2ml water</span>
                  <span className="bg-green-100 px-2 py-1 rounded">🌱 Eco-friendly</span>
                </div>
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-white/60 rounded-xl p-6 border border-amber-200">
              <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <span>🌍</span> Why we show environmental impact
              </h4>
              <p className="text-amber-700 text-sm">
                AI requires significant computing power, which uses water for cooling and electricity.
                By showing the impact of each request, we help you make informed choices.
                The "Quick List" mode uses text-only AI which is ~90% more efficient than image analysis.
              </p>
            </div>
          </div>
        )}

        {/* Photo Mode */}
        {mode === 'photo' && !recipes.length && (
          <div className="space-y-6">
            <button
              onClick={reset}
              className="text-amber-600 hover:text-amber-800 flex items-center gap-1 text-sm"
            >
              ← Back to options
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-amber-900 mb-2">📸 Scan Your Fridge</h2>
              <p className="text-amber-600">Upload a photo and AI will identify your ingredients</p>
            </div>

            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                ${imagePreview
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-amber-300 hover:border-amber-400 hover:bg-amber-50'
                }
              `}
            >
              {imagePreview ? (
                <div className="space-y-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg shadow-md"
                  />
                  <p className="text-amber-600 text-sm">Click to change photo</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-6xl">📷</div>
                  <div>
                    <p className="text-amber-900 font-medium">Drop your photo here</p>
                    <p className="text-amber-600 text-sm">or click to browse</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Analyze Button */}
            {imagePreview && (
              <button
                onClick={analyzeImage}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing with AI...
                  </span>
                ) : (
                  '🔍 Find Recipes'
                )}
              </button>
            )}

            {/* Impact Notice */}
            <div className="bg-amber-100/50 rounded-lg p-4 text-center text-sm text-amber-700">
              💧 This scan will use approximately 2ml of water for AI processing
            </div>

            {error && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Text Mode */}
        {mode === 'text' && !recipes.length && (
          <div className="space-y-6">
            <button
              onClick={reset}
              className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm"
            >
              ← Back to options
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-green-800 mb-2">✏️ Quick List</h2>
              <p className="text-green-600">Type your ingredients - uses 90% less resources!</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-green-200">
              <label className="block text-green-800 font-medium mb-2">
                What ingredients do you have?
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="e.g., chicken breast, broccoli, garlic, soy sauce, rice..."
                className="w-full h-32 p-4 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none"
              />
              <p className="text-green-600 text-xs mt-2">
                Tip: List as many ingredients as you can for better recipe matches
              </p>
            </div>

            <button
              onClick={analyzeText}
              disabled={loading || !textInput.trim()}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Finding recipes...
                </span>
              ) : (
                '🍳 Get Recipe Ideas'
              )}
            </button>

            {/* Eco Badge */}
            <div className="bg-green-100/50 rounded-lg p-4 text-center text-sm text-green-700 flex items-center justify-center gap-2">
              <span className="text-lg">🌱</span>
              <span>Eco mode: ~0.2ml water usage (90% savings vs photo scan)</span>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {recipes.length > 0 && (
          <div className="space-y-6">
            <button
              onClick={reset}
              className="text-amber-600 hover:text-amber-800 flex items-center gap-1 text-sm"
            >
              ← Start over
            </button>

            {/* Impact Card */}
            {impact && (
              <div className="bg-white rounded-2xl p-6 border border-green-200">
                <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                  <span>🌱</span> Environmental Impact of This Request
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="text-2xl mb-1">💧</div>
                    <div className="text-xl font-bold text-blue-700">{impact.water.toFixed(1)}ml</div>
                    <div className="text-xs text-blue-600">water used</div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <div className="text-2xl mb-1">⚡</div>
                    <div className="text-xl font-bold text-yellow-700">{(impact.energy * 1000).toFixed(1)}Wh</div>
                    <div className="text-xs text-yellow-600">energy used</div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="text-2xl mb-1">🌍</div>
                    <div className="text-xl font-bold text-green-700">{impact.co2.toFixed(2)}g</div>
                    <div className="text-xs text-green-600">CO₂ equivalent</div>
                  </div>
                </div>

                {/* Fun comparison */}
                <div className="mt-4 text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  💡 That's about {(impact.drinkingGlasses * 100).toFixed(1)}% of a glass of water,
                  or enough energy to charge your phone {impact.phoneCharges.toFixed(1)}% of the way
                </div>

                {/* Developer stats toggle */}
                <button
                  onClick={() => setShowDevStats(!showDevStats)}
                  className="mt-4 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto"
                >
                  {showDevStats ? '▼' : '▶'} Developer stats
                </button>

                {showDevStats && (
                  <div className="mt-2 bg-gray-100 rounded-lg p-3 text-xs font-mono text-gray-600">
                    <div>Input tokens: {impact.tokens.input}</div>
                    <div>Output tokens: {impact.tokens.output}</div>
                    <div>Total tokens: {impact.tokens.total}</div>
                  </div>
                )}
              </div>
            )}

            {/* Ingredients Found */}
            {ingredients.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-amber-200">
                <h3 className="font-bold text-amber-900 mb-3">🥬 Ingredients Found</h3>
                <div className="flex flex-wrap gap-2">
                  {ingredients.map((ing, i) => (
                    <span key={i} className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recipes */}
            <div className="space-y-4">
              <h3 className="font-bold text-amber-900 text-xl">🍳 Recipe Ideas</h3>
              {recipes.map((recipe, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-amber-200">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-amber-900 text-lg">{recipe.name}</h4>
                    {recipe.time && (
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs">
                        ⏱️ {recipe.time}
                      </span>
                    )}
                  </div>
                  <p className="text-amber-700 mb-4">{recipe.description}</p>

                  {recipe.instructions && (
                    <div className="border-t border-amber-100 pt-4">
                      <h5 className="font-medium text-amber-800 mb-2">Instructions:</h5>
                      <ol className="list-decimal list-inside space-y-1 text-amber-700 text-sm">
                        {recipe.instructions.map((step, j) => (
                          <li key={j}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {recipe.missing && recipe.missing.length > 0 && (
                    <div className="mt-4 bg-amber-50 rounded-lg p-3">
                      <span className="text-amber-700 text-sm">
                        🛒 You might need: {recipe.missing.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/60 border-t border-amber-200 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-amber-600">
          <p>Built with 💚 for the planet by <a href="https://hereshecodes.com" className="underline hover:text-amber-800">hereshecodes</a></p>
          <p className="mt-1 text-xs">AI-powered recipe suggestions with transparent environmental impact</p>
        </div>
      </footer>
    </div>
  )
}

export default App
