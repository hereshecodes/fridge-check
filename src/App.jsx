import { useState, useRef } from 'react'
import { Analytics } from '@vercel/analytics/react'

const calculateImpact = (inputTokens, outputTokens) => {
  const totalTokens = inputTokens + outputTokens;
  const waterMl = (totalTokens / 1000) * 0.5;
  const energyKwh = (totalTokens / 1000) * 0.0003;
  const co2Grams = (totalTokens / 1000) * 0.2;

  return {
    tokens: { input: inputTokens, output: outputTokens, total: totalTokens },
    water: waterMl,
    energy: energyKwh,
    co2: co2Grams,
    phoneCharges: energyKwh / 0.01,
    drinkingGlasses: waterMl / 250,
  };
};

function App() {
  const [mode, setMode] = useState('choice');
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
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
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
          body: JSON.stringify({ image: base64, mode: 'photo' }),
        });

        const data = await response.json();
        if (data.error) {
          setError(data.error);
        } else {
          setIngredients(data.ingredients || []);
          setRecipes(data.recipes || []);
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
        body: JSON.stringify({ ingredients: textInput, mode: 'text' }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setIngredients(data.ingredients || []);
        setRecipes(data.recipes || []);
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
    setExpandedRecipe(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-teal-950/20 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-zinc-800/50 backdrop-blur-xl bg-zinc-950/80 sticky top-0 z-20">
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={reset} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
                🥬
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-100">Fridge Check</h1>
                <p className="text-xs text-zinc-500">AI recipes, planet-conscious</p>
              </div>
            </button>

            {totalImpact.scans > 0 && (
              <div className="text-right">
                <div className="text-xs text-zinc-500">Session</div>
                <div className="text-sm font-medium text-emerald-400">{totalImpact.water.toFixed(1)}ml H₂O</div>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-12">
          {/* Mode Selection */}
          {mode === 'choice' && (
            <div className="space-y-10">
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  What's in your fridge?
                </h2>
                <p className="text-zinc-400">Get AI-powered recipe ideas from your ingredients</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Photo Mode */}
                <button
                  onClick={() => setMode('photo')}
                  className="group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 text-left hover:border-emerald-500/50 hover:bg-zinc-900/80 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl mb-4 group-hover:bg-emerald-500/20 transition-colors">
                      📸
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-100 mb-1">Scan Photo</h3>
                    <p className="text-sm text-zinc-500 mb-4">
                      Upload a fridge or pantry photo. Vision AI identifies ingredients.
                    </p>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">~2ml water</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">Vision AI</span>
                    </div>
                  </div>
                </button>

                {/* Text Mode */}
                <button
                  onClick={() => setMode('text')}
                  className="group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 text-left hover:border-teal-500/50 hover:bg-zinc-900/80 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl mb-4 group-hover:bg-teal-500/20 transition-colors">
                      ⌨️
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-100 mb-1">Quick List</h3>
                    <p className="text-sm text-zinc-500 mb-4">
                      Type your ingredients. 90% more resource efficient.
                    </p>
                    <div className="flex gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">~0.2ml water</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Eco mode</span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Info */}
              <div className="rounded-xl bg-zinc-900/30 border border-zinc-800/50 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                    🌍
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-300 mb-1">Why we show environmental impact</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      AI uses significant resources. By showing water and energy usage, we help you make informed choices. Quick List mode is ~90% more efficient than image analysis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Photo Mode */}
          {mode === 'photo' && !recipes.length && (
            <div className="space-y-6">
              <button onClick={reset} className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-1 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-zinc-100">Scan Your Fridge</h2>
                <p className="text-zinc-500">Upload a photo to identify ingredients</p>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300
                  ${imagePreview
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900/50'
                  }
                `}
              >
                {imagePreview ? (
                  <div className="space-y-4">
                    <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-xl" />
                    <p className="text-sm text-zinc-500">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-4 py-8">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl mx-auto">
                      📷
                    </div>
                    <div>
                      <p className="text-zinc-300 font-medium">Drop your photo here</p>
                      <p className="text-zinc-600 text-sm mt-1">or click to browse</p>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </div>

              {imagePreview && (
                <button
                  onClick={analyzeImage}
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing...
                    </span>
                  ) : 'Find Recipes'}
                </button>
              )}

              <p className="text-center text-xs text-zinc-600">Uses ~2ml water for AI processing</p>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Text Mode */}
          {mode === 'text' && !recipes.length && (
            <div className="space-y-6">
              <button onClick={reset} className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-1 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Eco Mode
                </div>
                <h2 className="text-2xl font-bold text-zinc-100">Quick List</h2>
                <p className="text-zinc-500">Type your ingredients - 90% less resources</p>
              </div>

              <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6">
                <label className="block text-sm font-medium text-zinc-400 mb-3">
                  What do you have?
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="chicken, broccoli, garlic, soy sauce, rice..."
                  className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-all"
                />
              </div>

              <button
                onClick={analyzeText}
                disabled={loading || !textInput.trim()}
                className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-teal-500 to-emerald-500 text-zinc-950 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Finding recipes...
                  </span>
                ) : 'Get Recipe Ideas'}
              </button>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {recipes.length > 0 && (
            <div className="space-y-6">
              <button onClick={reset} className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-1 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Start over
              </button>

              {/* Impact */}
              {impact && (
                <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-zinc-400">Environmental Impact</h3>
                    <button
                      onClick={() => setShowDevStats(!showDevStats)}
                      className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      {showDevStats ? 'Hide' : 'Dev stats'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                      <div className="text-xl font-bold text-blue-400">{impact.water.toFixed(1)}</div>
                      <div className="text-xs text-zinc-500">ml water</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <div className="text-xl font-bold text-amber-400">{(impact.energy * 1000).toFixed(1)}</div>
                      <div className="text-xs text-zinc-500">Wh energy</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <div className="text-xl font-bold text-emerald-400">{impact.co2.toFixed(2)}</div>
                      <div className="text-xs text-zinc-500">g CO₂</div>
                    </div>
                  </div>
                  {showDevStats && (
                    <div className="mt-4 p-3 rounded-lg bg-zinc-950 text-xs font-mono text-zinc-600">
                      <div>Input: {impact.tokens.input} tokens</div>
                      <div>Output: {impact.tokens.output} tokens</div>
                      <div>Total: {impact.tokens.total} tokens</div>
                    </div>
                  )}
                </div>
              )}

              {/* Ingredients */}
              {ingredients.length > 0 && (
                <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Ingredients Found</h3>
                  <div className="flex flex-wrap gap-2">
                    {ingredients.map((ing, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 text-sm">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recipes */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-400">Recipe Ideas</h3>
                {recipes.map((recipe, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors"
                  >
                    <button
                      onClick={() => setExpandedRecipe(expandedRecipe === i ? null : i)}
                      className="w-full p-5 text-left flex items-start justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-semibold text-zinc-100 mb-1">{recipe.name}</h4>
                        <p className="text-sm text-zinc-500">{recipe.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {recipe.time && (
                          <span className="text-xs text-zinc-500">{recipe.time}</span>
                        )}
                        <svg
                          className={`w-5 h-5 text-zinc-600 transition-transform ${expandedRecipe === i ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {expandedRecipe === i && (
                      <div className="px-5 pb-5 pt-0 border-t border-zinc-800/50">
                        {recipe.instructions && (
                          <div className="pt-4">
                            <h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Instructions</h5>
                            <ol className="space-y-2">
                              {recipe.instructions.map((step, j) => (
                                <li key={j} className="flex gap-3 text-sm">
                                  <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    {j + 1}
                                  </span>
                                  <span className="text-zinc-400">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {recipe.missing && recipe.missing.length > 0 && (
                          <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <span className="text-xs text-amber-400">
                              You might need: {recipe.missing.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800/50 py-8 mt-16">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-sm text-zinc-600">
              Built by <a href="https://hereshecodes.com" className="text-zinc-500 hover:text-zinc-300 transition-colors">hereshecodes</a>
            </p>
          </div>
        </footer>

        <Analytics />
      </div>
    </div>
  )
}

export default App
