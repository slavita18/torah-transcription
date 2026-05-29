# WhatsApp "שמילי" → Google Chat DM (n8n)

אוטומציה: כשמתקבלת הודעה בקבוצת **WhatsApp** בשם **"שמילי"**, תוכן ההודעה נשלח
כ‑**הודעת Google Chat (DM) ממני** אל **billing@slavitapublishing.com**.

קובץ ה‑workflow: [`whatsapp-shmili-to-google-chat.json`](./whatsapp-shmili-to-google-chat.json)
— מייבאים אותו ב‑n8n דרך **⋯ → Import from File**.

---

## למה Evolution API ולא WhatsApp הרשמי?

ה‑WhatsApp Cloud API הרשמי של Meta **לא מאפשר לקרוא הודעות מקבוצות**.
כדי לתפוס הודעות בקבוצה צריך ספק כמו **Evolution API** (קוד פתוח, נפוץ עם n8n)
או WAHA. ה‑workflow בנוי סביב Evolution API, ששולח כל הודעה נכנסת ל‑Webhook של n8n.

---

## מבנה ה‑Workflow

```
Evolution Webhook (הודעה נכנסת)
   → Parse WhatsApp Message   (חילוץ טקסט / שולח / JID)
   → Is incoming group message?   (קבוצה? לא נשלח על ידי? יש טקסט?)
   → Get Group Info (Evolution)   (מביא את שם הקבוצה לפי ה‑JID)
   → Group name is 'שמילי'?   (סינון לפי שם הקבוצה)
   → Build Chat Text   (בונה את גוף ההודעה)
   → Find/Create DM Space (Google Chat)   (מאתר/יוצר את שיחת ה‑DM עם billing@)
   → Send Google Chat DM   (שולח את ההודעה)
```

---

## הגדרה — שלב אחר שלב

### 1. Evolution API → Webhook
1. ב‑n8n פתחו את ה‑workflow והעתיקו את כתובת ה‑**Production URL** של נוד
   `Evolution Webhook` (למשל `https://<n8n>/webhook/whatsapp-shmili`).
2. ב‑Evolution API הגדירו Webhook עבור ה‑instance שלכם והפעילו את האירוע
   **`messages.upsert`** (אפשר דרך ה‑API: `POST /webhook/set/{instance}`).
3. ודאו שה‑instance מחובר למספר ה‑WhatsApp שנמצא בקבוצת "שמילי".

### 2. משתני סביבה של n8n (עבור Evolution)
הוסיפו ל‑n8n את משתני הסביבה הבאים (ב‑`.env` או בהגדרות ה‑deployment):

```
EVOLUTION_API_URL=https://your-evolution-host
EVOLUTION_API_KEY=your-evolution-api-key
```

> אם אתם מעדיפים, אפשר להחליף את הביטויים `{{ $env.EVOLUTION_API_URL }}` /
> `{{ $env.EVOLUTION_API_KEY }}` בנוד `Get Group Info` ב‑credential רגיל מסוג
> *Header Auth* (`apikey`).

### 3. Google Chat — credential מסוג OAuth2 ("ממני")
כדי שההודעה תופיע **ממך** (ולא מבוט):
1. ב‑Google Cloud Console צרו פרויקט, הפעילו **Google Chat API**, והגדירו
   **OAuth consent screen** (Internal עבור Workspace שלכם).
2. צרו **OAuth Client ID** מסוג *Web application* והוסיפו ל‑Authorized redirect
   URI את כתובת ה‑callback של n8n
   (`https://<n8n>/rest/oauth2-credential/callback`).
3. ב‑n8n צרו credential מסוג **Google OAuth2 API** עם ה‑Client ID/Secret,
   והגדירו את ה‑**Scopes**:
   ```
   https://www.googleapis.com/auth/chat.spaces.create
   https://www.googleapis.com/auth/chat.messages.create
   ```
4. לחצו **Connect / Sign in with Google** והתחברו עם **חשבון השולח** (אתם).
5. בשני הנודים של Google Chat (`Find/Create DM Space`, `Send Google Chat DM`)
   בחרו את ה‑credential שיצרתם (כרגע מסומן `REPLACE_WITH_GOOGLE_OAUTH_CREDENTIAL_ID`).

> billing@slavitapublishing.com ואתם באותו Google Workspace (אותו דומיין),
> ולכן הכתובת משמשת כ‑alias תקין: `users/billing@slavitapublishing.com`.

### 4. הפעלה ובדיקה
1. שמרו והפעילו (**Active**) את ה‑workflow.
2. שלחו הודעת בדיקה בקבוצת "שמילי".
3. ההודעה אמורה להגיע כ‑DM ב‑Google Chat אל billing@ עם הפורמט:
   ```
   📩 הודעה חדשה מקבוצת "שמילי"
   מאת: <שם השולח>
   זמן: 29/05/2026 14:05

   <תוכן ההודעה>
   ```

---

## טיפים / בעיות נפוצות
- **כפילות לפי שם:** אם יש כמה קבוצות בשם זהה, עדיף לסנן לפי ה‑**JID** הקבוע
  במקום לפי השם. קחו את ה‑`remoteJid` מתוך הרצה ראשונה והחליפו את נוד
  `Group name is 'שמילי'?` בבדיקה `={{ $json.remoteJid }}` שווה ל‑JID שלכם
  (חוסך גם את הקריאה ל‑`Get Group Info`).
- **הודעות לא טקסטואליות:** תמונות/וידאו מועברות לפי ה‑caption בלבד; אפשר
  להרחיב את נוד `Parse WhatsApp Message` לפי הצורך.
- **404 ב‑Find/Create DM Space:** ודאו שה‑Scopes כוללים `chat.spaces.create`
  ושנכנסתם עם החשבון הנכון.
