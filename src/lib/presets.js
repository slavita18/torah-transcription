// פריסטים ומאגרי בחירה לכל ההגדרות של ההדמיה

// גדלי ספרים נפוצים (ס"מ) — width × height
export const SIZE_PRESETS = [
  { id: 'a5', label: 'A5 (14.8×21)', width: 14.8, height: 21 },
  { id: 'a4', label: 'A4 (21×29.7)', width: 21, height: 29.7 },
  { id: 'gemara', label: 'גמרא (ש"ס) (~24×34)', width: 24, height: 34 },
  { id: 'chumash', label: 'חומש (17×24)', width: 17, height: 24 },
  { id: '6x9', label: '6×9 אינץ׳ (15.2×22.9)', width: 15.24, height: 22.86 },
  { id: 'siddur', label: 'סידור (12×17)', width: 12, height: 17 },
  { id: 'pocket', label: 'כיס (10.5×14.8)', width: 10.5, height: 14.8 },
  { id: 'square', label: 'מרובע (21×21)', width: 21, height: 21 },
  { id: 'custom', label: 'מותאם אישית', width: 16, height: 23 },
]

// רקעים מוכנים
export const BACKGROUND_PRESETS = [
  { id: 'studio-light', label: 'סטודיו בהיר', type: 'gradient', top: '#f5f7fb', bottom: '#cdd6e4' },
  { id: 'studio-dark', label: 'סטודיו כהה', type: 'gradient', top: '#3a4252', bottom: '#10131a' },
  { id: 'warm', label: 'חמים', type: 'gradient', top: '#fbf3e4', bottom: '#e4cba6' },
  { id: 'royal', label: 'כחול מלכותי', type: 'gradient', top: '#2b3d63', bottom: '#0e1830' },
  { id: 'emerald', label: 'ירוק אזמרגד', type: 'gradient', top: '#1f4d40', bottom: '#0a2019' },
  { id: 'wine', label: 'יין', type: 'gradient', top: '#5a2230', bottom: '#260d12' },
  { id: 'white', label: 'לבן נקי', type: 'solid', color: '#ffffff' },
  { id: 'gray', label: 'אפור ניטרלי', type: 'solid', color: '#d9dde3' },
  { id: 'black', label: 'שחור', type: 'solid', color: '#0c0d10' },
  { id: 'transparent', label: 'שקוף (PNG)', type: 'transparent' },
]

// זוויות מצלמה מוכנות — [x, y, z] של המצלמה (RTL: שדרה מימין)
export const CAMERA_PRESETS = [
  { id: 'front', label: 'חזית', pos: [0, 0, 6] },
  { id: 'hero', label: 'שלושת רבעי', pos: [4.2, 1.6, 5.2] },
  { id: 'hero-left', label: 'שלושת רבעי הפוך', pos: [-4.2, 1.6, 5.2] },
  { id: 'spine', label: 'שדרה', pos: [6, 0.6, 2.2] },
  { id: 'top', label: 'מלמעלה', pos: [1.2, 6, 3.2] },
  { id: 'low', label: 'זווית נמוכה', pos: [3.2, -1.8, 5.4] },
  { id: 'flat', label: 'שכוב', pos: [0.4, 6.2, 0.6] },
]

// סוגי גימור חומר
export const FINISHES = [
  { id: 'matte', label: 'מט', roughness: 0.85, metalness: 0.02, clearcoat: 0 },
  { id: 'satin', label: 'סאטן', roughness: 0.5, metalness: 0.05, clearcoat: 0.3 },
  { id: 'glossy', label: 'מבריק / למינציה', roughness: 0.18, metalness: 0.08, clearcoat: 0.9 },
  { id: 'leather', label: 'עור', roughness: 0.7, metalness: 0.1, clearcoat: 0.15 },
]

// צבעי כריכה/שדרה ברירת מחדל (כשאין תמונה)
export const COVER_COLORS = [
  '#7b1e2b', '#1e3a5f', '#1f4d40', '#3a2b1e', '#2b2b2e',
  '#8a6d3b', '#0e1830', '#5a2230', '#26415e', '#f1ece1',
]

export const DEFAULT_SETTINGS = {
  mode: 'closed', // closed | open
  // כריכה
  coverType: 'hard', // hard | soft
  finish: 'satin',
  coverColor: '#1e3a5f',
  spineColor: '#16294a',
  spineUseCover: true, // האם השדרה היא המשך הכריכה (כריכה רכה עוטפת)
  pageColor: '#f4ecd8',
  // מימדים
  sizeId: 'gemara',
  width: 24,
  height: 34,
  pageCount: 320, // קובע עובי
  thicknessScale: 1, // כוונון עובי ידני
  // תצוגה
  backgroundId: 'studio-light',
  bgType: 'gradient',
  bgColor: '#ffffff',
  bgTop: '#f5f7fb',
  bgBottom: '#cdd6e4',
  cameraId: 'hero',
  autoRotate: false,
  shadow: true,
  floatY: 0,
  // ספר פתוח
  openAngle: 92, // מעלות פתיחה
  openPose: 'curved', // flat | curved | standing | turning
  turnAngle: 55, // זווית הרמת הדף במצב turning (מעלות)
  startLeft: false, // הזזת כל הרצף עמוד אחד (להתחיל בעמוד שמאלי)
  spreadIndex: 0,
  // עיבוד קבצים
  autoCrop: true, // זיהוי וחיתוך אוטומטי של סימני חיתוך ושוליים
  // קלט כריכה
  coverInput: 'separate', // separate = קבצים נפרדים | spread = פריסה אחת
  spreadParts: 3, // 2 = קדמי+אחורי | 3 = קדמי+שדרה+אחורי
  spreadCutA: 0.33, // חיתוך ראשון (יחס)
  spreadCutB: 0.66, // חיתוך שני (יחס)
  spreadSwap: false, // החלפת קדמי/אחורי
  // רקע מותאם (תמונה)
  bgImage: null,
}
