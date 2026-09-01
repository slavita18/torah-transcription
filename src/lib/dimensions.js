// חישובי מימדים משותפים לרכיבי התלת-ממד

export const SCALE = 0.13 // יחידות three לכל ס"מ

/** עובי הספר בס"מ לפי מספר עמודים + סוג כריכה + כוונון ידני */
export function computeThicknessCm(settings) {
  const sheets = Math.max(1, settings.pageCount) / 2
  const paper = sheets * 0.0115 // ~0.115 מ"מ לדף
  const boards = settings.coverType === 'hard' ? 0.6 : 0.12
  return Math.max(0.4, paper * settings.thicknessScale) + boards
}
