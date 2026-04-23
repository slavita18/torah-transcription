export default function HomePage({ onSelect }) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      {/* Logo / Title */}
      <div className="text-center mb-16">
        <div className="text-7xl mb-6">📜</div>
        <h1 className="font-serif text-5xl sm:text-6xl font-bold text-navy-900 mb-4 leading-tight">
          תמלול שיעורים
        </h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto leading-relaxed">
          תמלול מקצועי ומדויק של שיעורי תורה בעזרת בינה מלאכותית
        </p>
      </div>

      {/* Big Language Buttons */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
        <button
          onClick={() => onSelect('hebrew')}
          className="flex-1 group relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 to-navy-900 text-white p-8 text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 active:scale-98"
        >
          <div className="text-5xl mb-4">🔵</div>
          <h2 className="text-2xl font-bold mb-2">הקלטות בעברית</h2>
          <p className="text-navy-200 text-sm">תמלול, עיבוד וסיכום שיעורים בעברית</p>
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
        </button>

        <button
          onClick={() => onSelect('yiddish')}
          className="flex-1 group relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 to-purple-900 text-white p-8 text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 active:scale-98"
        >
          <div className="text-5xl mb-4">🟣</div>
          <h2 className="text-2xl font-bold mb-2">הקלטות באידיש</h2>
          <p className="text-purple-200 text-sm">תמלול שיעורים באידיש — לאידיש או לעברית</p>
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
        </button>
      </div>

      {/* Features */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
        {[
          { icon: '🤖', title: 'AI מתקדם', desc: 'מבוסס על Claude Sonnet של Anthropic' },
          { icon: '📚', title: 'ספרייה חכמה', desc: 'שמירה, חיפוש וסיווג כל התמלולים' },
          { icon: '📄', title: 'ייצוא מקצועי', desc: 'Word ו-PDF בעיצוב ספרותי אלגנטי' },
        ].map(f => (
          <div key={f.title} className="bg-white rounded-2xl border border-cream-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-navy-900 mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
