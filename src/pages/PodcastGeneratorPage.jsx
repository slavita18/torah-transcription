import { useState, useRef, useEffect, useCallback } from 'react';

const W = 1280;
const H = 720;

// ─── canvas helpers ───────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPortrait(ctx, img, cx, cy, r, accent) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    const s = Math.max((r * 2) / img.naturalWidth, (r * 2) / img.naturalHeight);
    const sw = img.naturalWidth * s, sh = img.naturalHeight * s;
    ctx.drawImage(img, cx - sw / 2, cy - sh / 2, sw, sh);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = `${r}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👤', cx, cy);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

function drawWaveform(ctx, data, accent) {
  const bars = 60, bw = 5, gap = 4;
  const tw = bars * (bw + gap);
  const sx = (W - tw) / 2;
  const maxH = 65, baseY = H - 52;
  ctx.save();
  for (let i = 0; i < bars; i++) {
    const v = (data[Math.floor(i * data.length / bars)] || 0) / 255;
    const bh = Math.max(3, v * maxH);
    const x = sx + i * (bw + gap);
    const grad = ctx.createLinearGradient(x, baseY - bh, x, baseY);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, 'rgba(255,255,255,0.15)');
    ctx.fillStyle = grad;
    roundRect(ctx, x, baseY - bh, bw, bh, 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderFrame(ctx, cfg) {
  const {
    bgImg, ivImg, ieImg, logoImg, designEls = [],
    ivName, ivRole, ieName, ieRole,
    podcastTitle, episodeTitle, accent, waveData, elapsed,
  } = cfg;

  ctx.clearRect(0, 0, W, H);

  // background
  if (bgImg) {
    const s = Math.max(W / bgImg.naturalWidth, H / bgImg.naturalHeight);
    const sw = bgImg.naturalWidth * s, sh = bgImg.naturalHeight * s;
    ctx.drawImage(bgImg, (W - sw) / 2, (H - sh) / 2, sw, sh);
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#08081a');
    g.addColorStop(0.5, '#14103a');
    g.addColorStop(1, '#081420');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // design overlay elements
  for (const el of designEls) {
    if (el) { ctx.globalAlpha = 0.55; ctx.drawImage(el, 0, 0, W, H); ctx.globalAlpha = 1; }
  }

  // accent lines top / bottom
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, 'transparent');
  lg.addColorStop(0.2, accent);
  lg.addColorStop(0.8, accent);
  lg.addColorStop(1, 'transparent');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, 4);
  ctx.fillRect(0, H - 4, W, 4);

  // podcast title
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(W * 0.031)}px Arial, "Helvetica Neue", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 10;
  ctx.fillText(podcastTitle || 'פודקאסט', W / 2, 62);
  ctx.shadowBlur = 0;

  if (episodeTitle) {
    ctx.font = `${Math.round(W * 0.018)}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(episodeTitle, W / 2, 90);
  }

  // logo
  if (logoImg) {
    const lh = 55;
    const lw = Math.min((logoImg.naturalWidth / logoImg.naturalHeight) * lh, 140);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(logoImg, 25, 15, lw, lh);
    ctx.globalAlpha = 1;
  }

  // portraits
  const r = Math.round(W * 0.088);
  const cy = Math.round(H * 0.46);
  const lx = Math.round(W * 0.27);
  const rx = Math.round(W * 0.73);

  drawPortrait(ctx, ieImg, lx, cy, r, accent);
  drawPortrait(ctx, ivImg, rx, cy, r, accent);

  // vertical divider
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2, cy - r - 40);
  ctx.lineTo(W / 2, cy + r + 80);
  ctx.stroke();

  // role badges
  const badge = (label, x) => {
    ctx.save();
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.direction = 'rtl';
    const tw2 = ctx.measureText(label).width + 24;
    const bh = 26;
    roundRect(ctx, x - tw2 / 2, cy - r - 40, tw2, bh, 13);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, cy - r - 40 + 18);
    ctx.restore();
  };
  badge('מרואיין', lx);
  badge('מראיין', rx);

  // names & roles
  const nameY = cy + r + 38;
  const roleY = cy + r + 64;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 5;

  ctx.font = `bold ${Math.round(W * 0.020)}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText(ieName || 'שם המרואיין', lx, nameY);
  ctx.fillText(ivName || 'שם המראיין', rx, nameY);

  ctx.font = `${Math.round(W * 0.015)}px Arial, sans-serif`;
  ctx.fillStyle = accent;
  if (ieRole) ctx.fillText(ieRole, lx, roleY);
  if (ivRole) ctx.fillText(ivRole, rx, roleY);
  ctx.shadowBlur = 0;

  // waveform
  const idle = new Uint8Array(64).fill(12);
  drawWaveform(ctx, waveData || idle, accent);

  // time counter
  if (elapsed >= 0) {
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(Math.floor(elapsed % 60)).padStart(2, '0');
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '17px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${m}:${s}`, W / 2, H - 14);
  }
}

// ─── image loader helper ─────────────────────────────────────────────────────

function loadImg(file) {
  if (!file) return Promise.resolve(null);
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

// ─── FileDropZone ────────────────────────────────────────────────────────────

function FileDropZone({ label, icon, accept, file, onFile, multi = false }) {
  const inputRef = useRef();
  const [drag, setDrag] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDrag(false);
    const picked = e.dataTransfer.files[0];
    if (picked) onFile(multi ? Array.from(e.dataTransfer.files) : picked);
  }

  const name = multi
    ? file?.length ? `${file.length} קבצים` : null
    : file?.name;

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
        drag ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
      }`}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multi}
        className="hidden"
        onChange={e => onFile(multi ? Array.from(e.target.files) : e.target.files[0])}
      />
      {name ? (
        <div className="flex items-center justify-center gap-2 text-sm text-indigo-700 font-medium">
          <span className="text-lg">{icon}</span>
          <span className="truncate max-w-[180px]">{name}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">{icon}</span>
          <span className="text-xs text-gray-400">{label}</span>
        </div>
      )}
    </div>
  );
}

// ─── PersonCard ───────────────────────────────────────────────────────────────

function PersonCard({ title, badge, nameVal, onName, roleVal, onRole, imgFile, onImg, preview }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5">{badge}</span>
      </div>

      <div className="flex gap-3 items-start">
        {/* portrait preview */}
        <div
          className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-200 flex-shrink-0 overflow-hidden cursor-pointer"
          onClick={() => document.getElementById(`img-${badge}`).click()}
        >
          {preview
            ? <img src={preview} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">👤</div>
          }
          <input id={`img-${badge}`} type="file" accept="image/*" className="hidden"
            onChange={e => onImg(e.target.files[0])} />
        </div>

        <div className="flex-1 flex flex-col gap-2">
          <input
            type="text"
            placeholder="שם מלא"
            value={nameVal}
            onChange={e => onName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            dir="rtl"
          />
          <input
            type="text"
            placeholder="תפקיד / תואר"
            value={roleVal}
            onChange={e => onRole(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            dir="rtl"
          />
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function PodcastGeneratorPage() {
  // config
  const [podcastTitle, setPodcastTitle] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [accent, setAccent] = useState('#6366f1');

  // people
  const [ivName, setIvName] = useState('');
  const [ivRole, setIvRole] = useState('');
  const [ivFile, setIvFile] = useState(null);
  const [ivPreview, setIvPreview] = useState(null);

  const [ieName, setIeName] = useState('');
  const [ieRole, setIeRole] = useState('');
  const [ieFile, setIeFile] = useState(null);
  const [iePreview, setIePreview] = useState(null);

  // assets
  const [bgFile, setBgFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [designFiles, setDesignFiles] = useState([]);
  const [audioFile, setAudioFile] = useState(null);

  // loaded images (for canvas)
  const [imgs, setImgs] = useState({ iv: null, ie: null, bg: null, logo: null, design: [] });

  // generation state
  const [status, setStatus] = useState('idle'); // idle | generating | done | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [mutePreview, setMutePreview] = useState(false);

  const canvasRef = useRef(null);
  const stopRef = useRef(null);

  // preview URLs for person portraits
  useEffect(() => {
    if (!ivFile) { setIvPreview(null); return; }
    const url = URL.createObjectURL(ivFile);
    setIvPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [ivFile]);

  useEffect(() => {
    if (!ieFile) { setIePreview(null); return; }
    const url = URL.createObjectURL(ieFile);
    setIePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [ieFile]);

  // load all images when files change
  useEffect(() => {
    let alive = true;
    async function go() {
      const [iv, ie, bg, logo, ...design] = await Promise.all([
        loadImg(ivFile), loadImg(ieFile), loadImg(bgFile), loadImg(logoFile),
        ...designFiles.map(loadImg),
      ]);
      if (alive) setImgs({ iv, ie, bg, logo, design });
    }
    go();
    return () => { alive = false; };
  }, [ivFile, ieFile, bgFile, logoFile, designFiles]);

  // redraw preview whenever anything changes
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderFrame(canvas.getContext('2d'), {
      bgImg: imgs.bg, ivImg: imgs.iv, ieImg: imgs.ie, logoImg: imgs.logo,
      designEls: imgs.design,
      ivName, ivRole, ieName, ieRole,
      podcastTitle, episodeTitle, accent,
      waveData: null, elapsed: -1,
    });
  }, [imgs, ivName, ivRole, ieName, ieRole, podcastTitle, episodeTitle, accent]);

  useEffect(() => { drawPreview(); }, [drawPreview]);

  // ── video generation ────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!audioFile) { setErrorMsg('יש לבחור קובץ שמע'); return; }

    if (!window.MediaRecorder) {
      setErrorMsg('הדפדפן שלך אינו תומך ב-MediaRecorder');
      return;
    }

    setStatus('generating');
    setProgress(0);
    setDownloadUrl(null);
    setErrorMsg('');

    try {
      const arrayBuf = await audioFile.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const waveArr = new Uint8Array(analyser.frequencyBinCount);

      const dest = audioCtx.createMediaStreamDestination();
      const src = audioCtx.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(analyser);
      src.connect(dest);
      if (!mutePreview) src.connect(audioCtx.destination);

      const duration = audioBuffer.duration;
      const t0 = audioCtx.currentTime;

      const canvas = canvasRef.current;
      const canvasStream = canvas.captureStream(30);

      const combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

      const recorder = new MediaRecorder(combined, { mimeType: mime });
      const chunks = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        setDownloadUrl(URL.createObjectURL(blob));
        setStatus('done');
        setProgress(100);
      };

      let rafId;
      let stopped = false;

      const cfg = {
        bgImg: imgs.bg, ivImg: imgs.iv, ieImg: imgs.ie, logoImg: imgs.logo,
        designEls: imgs.design,
        ivName, ivRole, ieName, ieRole,
        podcastTitle, episodeTitle, accent,
      };

      function stop() {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(rafId);
        recorder.stop();
        audioCtx.close();
      }

      stopRef.current = stop;

      function tick() {
        const elapsed = audioCtx.currentTime - t0;
        analyser.getByteFrequencyData(waveArr);
        renderFrame(canvas.getContext('2d'), { ...cfg, waveData: waveArr, elapsed });
        setProgress(Math.min((elapsed / duration) * 100, 99));
        if (elapsed < duration && !stopped) {
          rafId = requestAnimationFrame(tick);
        } else {
          stop();
        }
      }

      recorder.start(200);
      src.start();
      src.onended = stop;
      tick();
    } catch (err) {
      setStatus('error');
      setErrorMsg(`שגיאה: ${err.message}`);
    }
  }

  function handleCancel() {
    if (stopRef.current) stopRef.current();
    setStatus('idle');
    setProgress(0);
    drawPreview();
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 px-4 py-8 max-w-7xl mx-auto w-full" dir="rtl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">יצירת פודקאסט מוסרט</h1>
        <p className="text-gray-500">העלה תמונות, שמע ואלמנטים עיצוביים — קבל וידאו מקצועי</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── left: config panel ── */}
        <div className="flex flex-col gap-4 lg:w-96 flex-shrink-0">

          {/* people */}
          <PersonCard
            title="מראיין" badge="מראיין"
            nameVal={ivName} onName={setIvName}
            roleVal={ivRole} onRole={setIvRole}
            imgFile={ivFile} onImg={setIvFile}
            preview={ivPreview}
          />
          <PersonCard
            title="מרואיין" badge="מרואיין"
            nameVal={ieName} onName={setIeName}
            roleVal={ieRole} onRole={setIeRole}
            imgFile={ieFile} onImg={setIeFile}
            preview={iePreview}
          />

          {/* general info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <h3 className="font-semibold text-gray-800">פרטי הפודקאסט</h3>
            <input
              type="text" placeholder="שם הפודקאסט" value={podcastTitle}
              onChange={e => setPodcastTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              dir="rtl"
            />
            <input
              type="text" placeholder="כותרת הפרק (אופציונלי)" value={episodeTitle}
              onChange={e => setEpisodeTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              dir="rtl"
            />
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">צבע מוטיב</label>
              <input
                type="color" value={accent}
                onChange={e => setAccent(e.target.value)}
                className="w-10 h-8 rounded cursor-pointer border border-gray-200"
              />
              <div className="flex gap-1 mr-auto">
                {['#6366f1', '#e11d48', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'].map(c => (
                  <button key={c} title={c}
                    onClick={() => setAccent(c)}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ background: c, borderColor: accent === c ? '#1e293b' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* assets */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <h3 className="font-semibold text-gray-800">נכסי עיצוב</h3>
            <div className="grid grid-cols-2 gap-2">
              <FileDropZone label="תמונת רקע" icon="🖼️" accept="image/*" file={bgFile} onFile={setBgFile} />
              <FileDropZone label="לוגו" icon="🏷️" accept="image/*" file={logoFile} onFile={setLogoFile} />
            </div>
            <FileDropZone label="אלמנטים עיצוביים (ניתן לבחור כמה)" icon="✨" accept="image/*" file={designFiles} onFile={setDesignFiles} multi />
          </div>

          {/* audio */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
            <h3 className="font-semibold text-gray-800">קובץ שמע</h3>
            <FileDropZone label="MP3 / WAV / M4A / OGG" icon="🎙️" accept="audio/*" file={audioFile} onFile={setAudioFile} />
            {audioFile && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <input type="checkbox" id="mute" checked={mutePreview} onChange={e => setMutePreview(e.target.checked)} />
                <label htmlFor="mute">השתק בזמן יצירה</label>
              </div>
            )}
          </div>
        </div>

        {/* ── right: preview + generate ── */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">תצוגה מקדימה</h3>
              <span className="text-xs text-gray-400">1280 × 720 • 16:9</span>
            </div>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="w-full h-auto rounded-xl border border-gray-100"
            />
          </div>

          {/* generate controls */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
            {status === 'idle' || status === 'error' ? (
              <>
                <button
                  onClick={handleGenerate}
                  disabled={!audioFile}
                  className="w-full py-3 rounded-xl font-bold text-white transition-all
                    bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500
                    disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  🎬 צור וידאו
                </button>
                {!audioFile && (
                  <p className="text-center text-sm text-gray-400">יש להעלות קובץ שמע כדי להמשיך</p>
                )}
                {status === 'error' && errorMsg && (
                  <p className="text-center text-sm text-red-500">{errorMsg}</p>
                )}
              </>
            ) : status === 'generating' ? (
              <>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>מייצר וידאו...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${accent}, #818cf8)`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  הוידאו נוצר בזמן אמת. הזמן הנדרש שווה לאורך השמע.
                </p>
                <button
                  onClick={handleCancel}
                  className="w-full py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm transition-colors"
                >
                  ביטול
                </button>
              </>
            ) : status === 'done' ? (
              <>
                <div className="flex items-center gap-2 text-green-600 font-semibold justify-center text-lg">
                  <span>✅</span> הוידאו מוכן!
                </div>
                <a
                  href={downloadUrl}
                  download={`${podcastTitle || 'podcast'}.webm`}
                  className="w-full py-3 rounded-xl font-bold text-white text-center transition-all
                    bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500
                    shadow-lg hover:shadow-xl hover:-translate-y-0.5 block"
                >
                  ⬇️ הורד וידאו (WebM)
                </a>
                <button
                  onClick={() => { setStatus('idle'); setProgress(0); drawPreview(); }}
                  className="w-full py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm transition-colors"
                >
                  יצירה מחדש
                </button>
              </>
            ) : null}
          </div>

          {/* info card */}
          <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4 text-sm text-indigo-800 leading-relaxed" dir="rtl">
            <strong>איך זה עובד?</strong>
            <ul className="mt-2 list-disc list-inside space-y-1 text-indigo-700">
              <li>הוידאו נוצר ישירות בדפדפן — לא נשלח שום מידע לשרת</li>
              <li>הפלט הוא קובץ WebM עם שמע+וידאו באיכות HD</li>
              <li>ניתן להמיר ל-MP4 לאחר מכן בכלי כגון HandBrake</li>
              <li>הוויזואליזציה מגיבה לאודיו בזמן אמת</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
