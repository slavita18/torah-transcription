import Uploader from './Uploader'
import {
  SIZE_PRESETS,
  BACKGROUND_PRESETS,
  CAMERA_PRESETS,
  FINISHES,
  COVER_COLORS,
} from '../lib/presets'

/* ---------- אבני בניין קטנות לממשק ---------- */

function Section({ title, icon, children }) {
  return (
    <div className="border-b border-cream-200 px-5 py-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900">
        {icon && <span className="text-navy-500">{icon}</span>}
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-navy-700">{label}</span>
      {children}
    </label>
  )
}

function Pills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
            value === o.id
              ? 'bg-navy-800 text-white shadow'
              : 'bg-cream-100 text-navy-700 hover:bg-cream-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Slider({ value, min, max, step = 1, onChange, suffix }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-cream-200 accent-navy-700"
      />
      <span className="w-16 text-left text-xs font-semibold tabular-nums text-navy-700">
        {value}
        {suffix}
      </span>
    </div>
  )
}

function Colors({ value, onChange, palette = COVER_COLORS }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {palette.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{ background: c }}
          className={`h-7 w-7 rounded-full ring-2 ring-offset-2 transition ${
            value === c ? 'ring-navy-700' : 'ring-transparent hover:ring-cream-300'
          }`}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
      />
    </div>
  )
}

/* ---------- הלוח הראשי ---------- */

export default function ControlPanel({ settings, update, assets, onUploadCover, onUploadBack, onUploadInterior, busy }) {
  const isClosed = settings.mode === 'closed'

  const setSize = (id) => {
    const p = SIZE_PRESETS.find((s) => s.id === id)
    update({ sizeId: id, width: p.width, height: p.height })
  }

  const setBackground = (id) => {
    const p = BACKGROUND_PRESETS.find((b) => b.id === id)
    if (p.type === 'gradient') update({ backgroundId: id, bgType: 'gradient', bgTop: p.top, bgBottom: p.bottom })
    else if (p.type === 'solid') update({ backgroundId: id, bgType: 'solid', bgColor: p.color })
    else update({ backgroundId: id, bgType: 'transparent' })
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* בורר מצב */}
      <div className="sticky top-0 z-10 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-cream-100 p-1">
          {[
            { id: 'closed', label: '📕 ספר סגור' },
            { id: 'open', label: '📖 ספר פתוח' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => update({ mode: m.id })}
              className={`rounded-xl py-2 text-sm font-bold transition-all ${
                settings.mode === m.id ? 'bg-white text-navy-900 shadow' : 'text-navy-500'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* העלאות */}
      {isClosed ? (
        <Section title="קבצי הכריכה" icon="🖼️">
          <Uploader
            label="כריכה קדמית"
            hint="גרור או לחץ · תמונה (JPG/PNG) או PDF"
            onFile={onUploadCover}
            busy={busy}
            thumb={assets.front}
          />
          <Uploader
            label="כריכה אחורית (אופציונלי)"
            hint="להדמיית הצד האחורי"
            onFile={onUploadBack}
            busy={busy}
            thumb={assets.back}
          />
        </Section>
      ) : (
        <Section title="קובץ פנים הספר" icon="📄">
          <Uploader
            label="העלה PDF של תוכן הספר"
            hint="העמודים יורנדרו לדפדוף ולהדמיה"
            accept="application/pdf"
            onFile={onUploadInterior}
            busy={busy}
            thumb={assets.pages[0]}
          />
          {assets.pages.length > 0 && (
            <div className="text-center text-xs text-navy-500">
              נטענו {assets.pages.length} עמודים
            </div>
          )}
        </Section>
      )}

      {/* כריכה */}
      <Section title="סוג הכריכה" icon="📐">
        <Pills
          options={[
            { id: 'hard', label: 'כריכה קשה' },
            { id: 'soft', label: 'כריכה רכה' },
          ]}
          value={settings.coverType}
          onChange={(v) => update({ coverType: v })}
        />
        <Field label="גימור">
          <Pills options={FINISHES} value={settings.finish} onChange={(v) => update({ finish: v })} />
        </Field>
      </Section>

      {/* מימדים ועובי */}
      <Section title="גודל ועובי" icon="📏">
        <Field label="גודל הספר">
          <Pills options={SIZE_PRESETS} value={settings.sizeId} onChange={setSize} />
        </Field>
        {settings.sizeId === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="רוחב (ס״מ)">
              <Slider value={settings.width} min={8} max={35} step={0.5} suffix=' ס"מ' onChange={(v) => update({ width: v })} />
            </Field>
            <Field label="גובה (ס״מ)">
              <Slider value={settings.height} min={10} max={45} step={0.5} suffix=' ס"מ' onChange={(v) => update({ height: v })} />
            </Field>
          </div>
        )}
        <Field label="מספר עמודים (קובע עובי)">
          <Slider value={settings.pageCount} min={20} max={1200} step={10} onChange={(v) => update({ pageCount: v })} />
        </Field>
        <Field label="כוונון עובי עדין">
          <Slider value={settings.thicknessScale} min={0.5} max={2} step={0.05} suffix="x" onChange={(v) => update({ thicknessScale: v })} />
        </Field>
      </Section>

      {/* צבעים */}
      <Section title="צבעים" icon="🎨">
        <Field label={isClosed ? 'צבע כריכה (כשאין תמונה)' : 'צבע כריכה'}>
          <Colors value={settings.coverColor} onChange={(v) => update({ coverColor: v })} />
        </Field>
        {isClosed && (
          <>
            <label className="flex items-center gap-2 text-xs font-medium text-navy-700">
              <input
                type="checkbox"
                checked={settings.spineUseCover}
                onChange={(e) => update({ spineUseCover: e.target.checked })}
                className="h-4 w-4 accent-navy-700"
              />
              השדרה בצבע הכריכה
            </label>
            {!settings.spineUseCover && (
              <Field label="צבע השדרה">
                <Colors value={settings.spineColor} onChange={(v) => update({ spineColor: v })} />
              </Field>
            )}
          </>
        )}
        <Field label="צבע הדפים">
          <Colors value={settings.pageColor} onChange={(v) => update({ pageColor: v })} palette={['#f4ecd8', '#ffffff', '#f7f1e3', '#efe6cf', '#fbf7ee']} />
        </Field>
      </Section>

      {/* ספר פתוח */}
      {!isClosed && (
        <Section title="פתיחה ודפדוף" icon="📖">
          <Field label="זווית פתיחה">
            <Slider value={settings.openAngle} min={20} max={175} step={1} suffix="°" onChange={(v) => update({ openAngle: v })} />
          </Field>
        </Section>
      )}

      {/* רקע וסגנון */}
      <Section title="רקע וסגנון" icon="🌅">
        <Pills options={BACKGROUND_PRESETS} value={settings.backgroundId} onChange={setBackground} />
        {settings.bgType === 'gradient' && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Field label="עליון">
              <Colors value={settings.bgTop} onChange={(v) => update({ bgTop: v })} palette={[]} />
            </Field>
            <Field label="תחתון">
              <Colors value={settings.bgBottom} onChange={(v) => update({ bgBottom: v })} palette={[]} />
            </Field>
          </div>
        )}
        {settings.bgType === 'solid' && (
          <Field label="צבע רקע">
            <Colors value={settings.bgColor} onChange={(v) => update({ bgColor: v })} palette={[]} />
          </Field>
        )}
      </Section>

      {/* מצלמה ותצוגה */}
      <Section title="זווית צילום ותצוגה" icon="📷">
        <Field label="זווית מצלמה">
          <Pills options={CAMERA_PRESETS} value={settings.cameraId} onChange={(v) => update({ cameraId: v })} />
        </Field>
        <div className="flex flex-wrap gap-4 pt-1">
          <label className="flex items-center gap-2 text-xs font-medium text-navy-700">
            <input type="checkbox" checked={settings.autoRotate} onChange={(e) => update({ autoRotate: e.target.checked })} className="h-4 w-4 accent-navy-700" />
            סיבוב אוטומטי
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-navy-700">
            <input type="checkbox" checked={settings.shadow} onChange={(e) => update({ shadow: e.target.checked })} className="h-4 w-4 accent-navy-700" />
            צל
          </label>
        </div>
        <div className="pt-1 text-[11px] text-navy-400">
          טיפ: ניתן לגרור בעכבר כדי לסובב את הספר בכל זווית.
        </div>
      </Section>
    </div>
  )
}
