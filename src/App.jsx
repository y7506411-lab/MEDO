import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  Heart,
  ImagePlus,
  LockKeyhole,
  LogOut,
  MapPin,
  Music2,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ASSET_BUCKET, supabase } from "./supabase";

const EMPTY_WEDDING = {
  id: 1,
  groom_name: "",
  bride_name: "",
  wedding_date: "",
  wedding_time: "",
  venue_name: "",
  venue_address: "",
  maps_link: "",
  site_background_image_url: "",
  hero_image_url: "",
  gallery_items: [],
  gallery_urls: [],
  music_url: "",
};

const GALLERY_PARTITIONS = [
  { id: "engagement", label: "الخطوبة" },
  { id: "photoshoot", label: "جلسة التصوير" },
  { id: "celebration", label: "الحفل" },
];

function normalizeGalleryItems(data) {
  if (Array.isArray(data.gallery_items) && data.gallery_items.length) {
    const validItems = data.gallery_items.filter(
      (item) =>
        item &&
        typeof item.url === "string" &&
        GALLERY_PARTITIONS.some((partition) => partition.id === item.category),
    );
    if (validItems.length) return validItems;
  }
  return (Array.isArray(data.gallery_urls) ? data.gallery_urls : [])
    .filter((url) => typeof url === "string")
    .map((url) => ({ url, category: "photoshoot" }));
}

const toPublicUrl = (path) =>
  supabase.storage.from(ASSET_BUCKET).getPublicUrl(path).data.publicUrl;

function formatDate(date) {
  if (!date) return "";
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("ar", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function formatWeddingTime(time) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time || "");
  if (!match) return time || "";
  const hour = Number(match[1]);
  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? "مساءً" : "صباحاً";
  return `${displayHour}:${match[2]} ${period}`;
}

function getRemainingTime(date) {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`).getTime();
  if (!Number.isFinite(target)) return null;
  const remaining = Math.max(0, target - Date.now());
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1_000),
  };
}

function Ornament({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 120 28"
      fill="none"
    >
      <path d="M1 14h42m34 0h42" stroke="currentColor" strokeWidth=".8" />
      <path
        d="M60 2c4.6 5.2 7.4 9.2 7.4 12S64.6 20.8 60 26c-4.6-5.2-7.4-9.2-7.4-12S55.4 7.2 60 2Z"
        stroke="currentColor"
        strokeWidth=".9"
      />
      <circle cx="60" cy="14" r="2.4" fill="currentColor" />
      <circle cx="47" cy="14" r="1.2" fill="currentColor" />
      <circle cx="73" cy="14" r="1.2" fill="currentColor" />
    </svg>
  );
}

function Countdown({ date }) {
  const [remaining, setRemaining] = useState(() => getRemainingTime(date));

  useEffect(() => {
    setRemaining(getRemainingTime(date));
    const timer = window.setInterval(
      () => setRemaining(getRemainingTime(date)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [date]);

  if (!remaining) return null;
  const units = [
    ["يوم", remaining.days],
    ["ساعة", remaining.hours],
    ["دقيقة", remaining.minutes],
    ["ثانية", remaining.seconds],
  ];

  return (
    <div className="countdown" aria-label="الوقت المتبقي على موعد الزفاف">
      {units.map(([label, value]) => (
        <div className="countdown-unit" key={label}>
          <span className="countdown-value">
            {String(value).padStart(2, "0")}
          </span>
          <span className="countdown-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

function MusicPlayer({ url }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!url || !audio) return undefined;
    audio.src = url;
    audio.loop = true;
    audio.volume = 0.35;
    audio.muted = muted;
    audio.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
    return () => {
      audio.pause();
      audio.removeAttribute("src");
    };
  }, [url]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (!url) return undefined;
    const startAudio = () => {
      const audio = audioRef.current;
      if (!audio || !audio.paused) return;
      audio.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    };
    window.addEventListener("pointerdown", startAudio, { once: true });
    window.addEventListener("keydown", startAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", startAudio);
      window.removeEventListener("keydown", startAudio);
    };
  }, [url]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  if (!url) return null;
  return (
    <div className="music-player" dir="rtl">
      <audio
        ref={audioRef}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <button
        className="music-play"
        onClick={togglePlayback}
        aria-label={playing ? "إيقاف الموسيقى" : "تشغيل الموسيقى"}
      >
        {playing ? <Pause size={15} /> : <Play size={15} />}
      </button>
      <span className="music-note">
        <Music2 size={14} />
        موسيقى الليلة
      </span>
      <span className={`sound-wave ${playing ? "is-playing" : ""}`}>
        {[1, 2, 3, 4, 5].map((bar) => (
          <i key={bar} />
        ))}
      </span>
      <button
        className="music-mute"
        onClick={() => setMuted((current) => !current)}
        aria-label={muted ? "إلغاء كتم الموسيقى" : "كتم الموسيقى"}
      >
        {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
    </div>
  );
}

function LandingPage() {
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [liveError, setLiveError] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [activeGalleryCategory, setActiveGalleryCategory] = useState("all");
  const weddingData = wedding || EMPTY_WEDDING;
  const groomName = weddingData.groom_name?.trim() || "";
  const brideName = weddingData.bride_name?.trim() || "";
  const galleryItems = normalizeGalleryItems(weddingData);
  const visibleGalleryItems =
    activeGalleryCategory === "all"
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeGalleryCategory);
  const coupleNames = useMemo(
    () => [groomName, brideName].filter(Boolean).join(" & "),
    [groomName, brideName],
  );

  useEffect(() => {
    let active = true;
    const receivedLiveUpdate = { current: false };
    const fetchWedding = async () => {
      const { data, error } = await supabase
        .from("wedding_details")
        .select("*")
        .eq("id", 1)
        .setHeader("Cache-Control", "no-cache, no-store, max-age=0")
        .maybeSingle();
      if (!active) return;
      if (error) {
        setLoadError(`تعذّر تحميل تفاصيل الدعوة: ${error.message}`);
        if (!receivedLiveUpdate.current) setWedding(EMPTY_WEDDING);
      } else if (!receivedLiveUpdate.current) {
        setWedding({
          ...EMPTY_WEDDING,
          ...(data || {}),
          gallery_items: normalizeGalleryItems(data || EMPTY_WEDDING),
        });
      }
      setLoading(false);
    };

    const channel = supabase
      .channel("public-wedding-details")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wedding_details",
          filter: "id=eq.1",
        },
        (payload) => {
          if (!active) return;
          receivedLiveUpdate.current = true;
          setLoadError("");
          if (payload.eventType === "DELETE") {
            setWedding(EMPTY_WEDDING);
          } else if (payload.new) {
            setWedding({
              ...EMPTY_WEDDING,
              ...payload.new,
              gallery_items: normalizeGalleryItems(payload.new),
            });
          }
        },
      )
      .subscribe((status, error) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          setLiveError("");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setLiveError(error?.message || "تعذّر الاتصال بالتحديثات المباشرة.");
        }
      });

    fetchWedding();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!lightbox) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [lightbox]);

  return (
    <main className="invitation-page">
      {weddingData.site_background_image_url && (
        <div
          className="site-background-image"
          style={{
            backgroundImage: `url("${weddingData.site_background_image_url}")`,
          }}
          aria-hidden="true"
        />
      )}
      <div className="site-background-overlay" aria-hidden="true" />
      <header className="site-header">
        <a className="brand-mark" href="#home" aria-label="إلى بداية الصفحة">
          <span className="brand-glyph">ن</span>
          <span>ليلة من نور</span>
        </a>
        <nav aria-label="التنقل الرئيسي">
          <a href="#story">الحكاية</a>
          <a href="#celebration">التفاصيل</a>
          {galleryItems.length > 0 && <a href="#gallery">الصور</a>}
        </nav>
        <a className="header-date" href="#celebration">
          <CalendarDays size={14} />
          {loading ? (
            <span className="skeleton header-date-skeleton" />
          ) : (
            <span>{weddingData.wedding_date ? formatDate(weddingData.wedding_date) : "تفاصيل الموعد قريباً"}</span>
          )}
        </a>
      </header>

      {(loadError || liveError) && (
        <div className="load-error">{loadError || `التحديثات المباشرة غير متاحة: ${liveError}`}</div>
      )}
      <section
        className={`hero ${weddingData.hero_image_url ? "has-hero-image" : ""}`}
        id="home"
        style={
          weddingData.hero_image_url
            ? { "--hero-image": `url("${weddingData.hero_image_url}")` }
            : undefined
        }
      >
        <div className="hero-grain" />
        <div className="hero-frame">
          <div className="hero-topline">
            <span>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
          </div>
          <div className="hero-content" id="story">
            <div className="eyebrow">
              <span />
              بكل الحب، ندعوكم لمشاركتنا
              <span />
            </div>
            <div className="names-lockup">
              {loading ? (
                <div className="names-skeleton" aria-label="جارٍ تحميل الأسماء">
                  <span className="skeleton name-skeleton" />
                  <span className="names-ampersand">&</span>
                  <span className="skeleton name-skeleton" />
                </div>
              ) : coupleNames ? (
                <>
                  {groomName && <h1>{groomName}</h1>}
                  {groomName && brideName && <span className="names-ampersand">&</span>}
                  {brideName && <h1>{brideName}</h1>}
                </>
              ) : (
                <p className="empty-couple-state">تُضاف الأسماء عند إعداد تفاصيل الدعوة</p>
              )}
            </div>
            <Ornament className="ornament hero-ornament" />
            <p className="hero-caption">ليلة يزهر فيها العمر حُبّاً</p>
            {loading ? (
              <div className="skeleton hero-date-skeleton" />
            ) : weddingData.wedding_date ? (
              <div className="hero-date">
                <CalendarDays size={15} />
                {formatDate(weddingData.wedding_date)}
                {weddingData.wedding_time && (
                  <>
                    <span className="date-separator">·</span>
                    <Clock3 size={15} />
                    {formatWeddingTime(weddingData.wedding_time)}
                  </>
                )}
              </div>
            ) : null}
            <Countdown date={weddingData.wedding_date} />
            <a className="discover-link" href="#celebration">
              اكتشفوا تفاصيل أمسيتنا
              <ArrowDown size={15} />
            </a>
          </div>
          <div className="hero-bottomline">
            <span>دعوة بمحبة</span>
            <span>٠١ — للأبد</span>
            <span>ذكرى تُروى دائماً</span>
          </div>
        </div>
        <div className="hero-side-note">A NIGHT TO REMEMBER</div>
      </section>

      <section className="invitation-intro section-pad">
        <div className="intro-monogram">ن</div>
        <p className="section-kicker">حضوركم فرحتنا</p>
        <h2>
          حين يلتقي قلبان،
          <br />
          <span>تبدأ أجمل الحكايات.</span>
        </h2>
        <Ornament className="ornament" />
        <p className="intro-copy">
          يسعدنا أن تكونوا شهوداً على بداية فصلنا الجديد، وأن تشاركونا فرحة
          يومٍ ننتظره بكل الشوق.
        </p>
        <div className="intro-signature">
          بكل الحب <Heart size={14} fill="currentColor" />
        </div>
      </section>

      <section className="celebration-section section-pad" id="celebration">
        <div className="section-heading">
          <p className="section-kicker">ليلتنا المنتظرة</p>
          <h2>تفاصيل الأمسية</h2>
          <Ornament className="ornament" />
        </div>
        <div className="event-card">
          <div className="event-date-block">
            <span className="event-date-label">التاريخ</span>
            {loading ? (
              <>
                <span className="skeleton event-day-skeleton" />
                <span className="skeleton event-month-skeleton" />
              </>
            ) : weddingData.wedding_date ? (
              <>
                <span className="event-date-day">
                  {new Intl.DateTimeFormat("ar", { day: "2-digit" }).format(
                    new Date(`${weddingData.wedding_date}T12:00:00`),
                  )}
                </span>
                <span className="event-date-month">
                  {new Intl.DateTimeFormat("ar", {
                    month: "long",
                    year: "numeric",
                  }).format(new Date(`${weddingData.wedding_date}T12:00:00`))}
                </span>
                <span className="event-weekday">
                  {new Intl.DateTimeFormat("ar", { weekday: "long" }).format(
                    new Date(`${weddingData.wedding_date}T12:00:00`),
                  )}
                </span>
              </>
            ) : (
              <span className="event-empty-state">بانتظار تحديد الموعد</span>
            )}
          </div>
          <div className="event-divider" />
          <div className="event-info">
            <div className="event-info-item">
              <span className="event-icon"><Clock3 size={17} /></span>
              <div>
                <span className="event-info-label">الوقت</span>
                {loading ? (
                  <span className="skeleton event-value-skeleton" />
                ) : (
                  <p>{weddingData.wedding_time ? formatWeddingTime(weddingData.wedding_time) : "لم يُحدّد بعد"}</p>
                )}
              </div>
            </div>
            <div className="event-info-item">
              <span className="event-icon"><MapPin size={17} /></span>
              <div>
                <span className="event-info-label">المكان</span>
                {loading ? (
                  <span className="skeleton event-value-skeleton" />
                ) : (
                  <>
                    <p>{weddingData.venue_name || "لم يُحدّد بعد"}</p>
                    {weddingData.venue_address && (
                      <span className="event-address">{weddingData.venue_address}</span>
                    )}
                  </>
                )}
              </div>
            </div>
            {weddingData.maps_link && (
              <a
                className="maps-button"
                href={weddingData.maps_link}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={15} />
                افتح الموقع على الخريطة
                <ChevronLeft size={15} />
              </a>
            )}
          </div>
        </div>
        <p className="event-note">
          <Sparkles size={14} />
          ننتظركم لنصنع معاً ذكرى لا تُنسى
        </p>
      </section>

      {galleryItems.length > 0 && (
        <section className="gallery-section section-pad" id="gallery">
          <div className="section-heading">
            <p className="section-kicker">لحظات من حكايتنا</p>
            <h2>ألبوم حكايتنا</h2>
            <Ornament className="ornament" />
          </div>
          <div className="gallery-tabs" role="tablist" aria-label="تصنيفات الصور">
            <button
              type="button"
              className={activeGalleryCategory === "all" ? "active" : ""}
              role="tab"
              aria-selected={activeGalleryCategory === "all"}
              onClick={() => setActiveGalleryCategory("all")}
            >
              كل اللحظات
              <span>{galleryItems.length}</span>
            </button>
            {GALLERY_PARTITIONS.map((partition) => {
              const count = galleryItems.filter(
                (item) => item.category === partition.id,
              ).length;
              if (!count) return null;
              return (
                <button
                  type="button"
                  className={
                    activeGalleryCategory === partition.id ? "active" : ""
                  }
                  key={partition.id}
                  role="tab"
                  aria-selected={activeGalleryCategory === partition.id}
                  onClick={() => setActiveGalleryCategory(partition.id)}
                >
                  {partition.label}
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="gallery-grid">
            {visibleGalleryItems.map((item, index) => (
              <button
                className={`gallery-image gallery-image-${index % 4}`}
                key={`${item.url}-${index}`}
                onClick={() => setLightbox(item.url)}
                aria-label={`عرض الصورة ${index + 1}`}
              >
                <img src={item.url} alt={coupleNames ? `من حكاية ${coupleNames}` : "من ألبوم حكاية العروسين"} loading="lazy" />
                <span className="gallery-hover"><Plus size={22} /></span>
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="site-footer">
        <div className="footer-dedication" dir="rtl">
          <Ornament className="ornament" />
          <p>ليلة من نور، وعمرٌ من محبة</p>
          {coupleNames && <span>{coupleNames}</span>}
          <Heart size={13} fill="currentColor" />
        </div>
        <a
          className="developer-watermark"
          href="https://y0ussef-hany.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          dir="ltr"
        >
          Youssef Hany — Full Stack Developer
        </a>
      </footer>

      <MusicPlayer url={weddingData.music_url} />
      {lightbox && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="عرض الصورة"
          onClick={() => setLightbox(null)}
        >
          <button className="lightbox-close" aria-label="إغلاق" onClick={() => setLightbox(null)}>
            <X size={22} />
          </button>
          <img
            src={lightbox}
            alt={coupleNames ? `من حكاية ${coupleNames}` : "من ألبوم حكاية العروسين"}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}

function AdminLogin({ onAuthenticated, hasAdmin, setHasAdmin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isSignUp, setIsSignUp] = useState(!hasAdmin);

  useEffect(() => {
    setIsSignUp(!hasAdmin);
  }, [hasAdmin]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      let authData;
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        authData = data;
        if (!data.session) {
          setMessage(
            "تم إنشاء الحساب. افتح رابط التحقق المرسل إلى بريدك الإلكتروني، ثم سجّل الدخول لإكمال إعداد المدير.",
          );
          setHasAdmin(false);
          return;
        }
        const { error: setupError } = await supabase.rpc("claim_first_admin");
        if (setupError) {
          await supabase.auth.signOut();
          throw setupError;
        }
        setHasAdmin(true);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        authData = data;
        const { data: isAdmin, error: verifyError } = await supabase.rpc(
          "is_current_user_admin",
        );
        if (verifyError) throw verifyError;
        if (!isAdmin) {
          if (hasAdmin) {
            await supabase.auth.signOut();
            throw new Error("هذا الحساب غير مخوّل للوصول إلى لوحة الإدارة.");
          }
          const { error: setupError } = await supabase.rpc("claim_first_admin");
          if (setupError) {
            await supabase.auth.signOut();
            throw setupError;
          }
          setHasAdmin(true);
        }
      }
      onAuthenticated(authData.user);
    } catch (error) {
      setMessage(error.message || "تعذّر إتمام العملية. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };

  const changeMode = () => {
    setMessage("");
    setIsSignUp((current) => !current);
  };

  return (
    <div className="admin-gate">
      <div className="admin-gate-card">
        <Link className="admin-brand" to="/">
          <span className="brand-glyph">ن</span>
          <span>ليلة من نور</span>
        </Link>
        <div className="admin-gate-icon"><LockKeyhole size={21} /></div>
        <p className="admin-kicker">مساحة خاصة</p>
        <h1>{isSignUp ? "إنشاء حساب المدير" : "مرحباً بعودتك"}</h1>
        <p className="admin-subtitle">
          {isSignUp
            ? "أنشئ حساب المدير الأول للبدء بإعداد دعوتكم."
            : "سجّل الدخول لإدارة تفاصيل أمسيتكم."}
        </p>
        <form className="admin-auth-form" onSubmit={submit}>
          <label>
            البريد الإلكتروني
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              dir="ltr"
            />
          </label>
          <label>
            كلمة المرور
            <input
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="٦ أحرف على الأقل"
            />
          </label>
          {message && (
            <div className={`form-message ${message.includes("تم إنشاء") ? "success" : ""}`}>
              {message}
            </div>
          )}
          <button className="admin-submit" type="submit" disabled={busy}>
            {busy ? "جارٍ التحقق..." : isSignUp ? "إنشاء حساب المدير" : "تسجيل الدخول"}
            {!busy && <ArrowLeft size={16} />}
          </button>
        </form>
        {!hasAdmin && (
          <button className="auth-mode-link" type="button" onClick={changeMode}>
            {isSignUp
              ? "لديك حساب بالفعل؟ تسجيل الدخول"
              : "إنشاء حساب المدير الأول"}
          </button>
        )}
        <Link className="back-home-link" to="/">العودة إلى الدعوة</Link>
      </div>
    </div>
  );
}

function ImageUploadField({
  step,
  title,
  description,
  value,
  busy,
  onUpload,
  onRemove,
  emptyLabel,
}) {
  return (
    <section className="dashboard-card">
      <div className="card-heading">
        <span className="card-step">{step}</span>
        <div><h2>{title}</h2><p>{description}</p></div>
      </div>
      <label className="upload-dropzone hero-dropzone">
        {value ? (
          <>
            <img src={value} alt={`معاينة ${title}`} />
            <span className="upload-overlay">
              <ImagePlus size={18} />
              {busy ? "جاري الرفع..." : "استبدال الصورة"}
            </span>
          </>
        ) : (
          <span className="upload-placeholder">
            <span className="upload-icon"><Upload size={19} /></span>
            <strong>{busy ? "جاري الرفع..." : emptyLabel}</strong>
            <span>JPG، PNG، أو WEBP</span>
          </span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={busy}
          onChange={(event) => {
            onUpload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      {value && (
        <button className="asset-remove" type="button" onClick={onRemove}>
          <Trash2 size={14} /> حذف الصورة
        </button>
      )}
    </section>
  );
}

function AdminDashboard({ user, onSignOut }) {
  const [form, setForm] = useState(EMPTY_WEDDING);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState({});
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingDeletes, setPendingDeletes] = useState([]);
  const [galleryCategory, setGalleryCategory] = useState("engagement");

  useEffect(() => {
    let active = true;
    const fetchWedding = async () => {
      const { data, error } = await supabase
        .from("wedding_details")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setNotice({ type: "error", text: `تعذّر تحميل البيانات: ${error.message}` });
      } else if (data) {
        setForm({
          ...EMPTY_WEDDING,
          ...data,
          gallery_items: normalizeGalleryItems(data),
        });
      }
      setLoading(false);
    };
    fetchWedding();
    return () => {
      active = false;
    };
  }, []);

  const setField = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));

  const uploadFile = useCallback(async (file, category) => {
    if (!file) return null;
    const safeName = file.name
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();
    const path = `${category}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from(ASSET_BUCKET)
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    if (error) throw error;
    return { path, url: toPublicUrl(path) };
  }, []);

  const deleteAsset = async (url) => {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${ASSET_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) throw new Error("تعذّر تحديد ملف التخزين لحذفه.");
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    const { error } = await supabase.storage.from(ASSET_BUCKET).remove([path]);
    if (error) throw error;
  };

  const queueDelete = (url) => {
    if (url) setPendingDeletes((current) => [...new Set([...current, url])]);
  };

  const uploadImage = async (file, field) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setNotice({ type: "error", text: "يرجى اختيار ملف صورة صالح." });
      return;
    }
    setUploading((current) => ({ ...current, [field]: true }));
    setNotice(null);
    try {
      const asset = await uploadFile(
        file,
        field === "hero_image_url" ? "hero" : "background",
      );
      const oldUrl = form[field];
      setField(field, asset.url);
      queueDelete(oldUrl);
      setNotice({
        type: "success",
        text:
          field === "hero_image_url"
            ? "تم رفع الصورة الرئيسية بنجاح."
            : "تم رفع خلفية الموقع بنجاح.",
      });
    } catch (error) {
      setNotice({ type: "error", text: `تعذّر رفع الصورة: ${error.message}` });
    } finally {
      setUploading((current) => ({ ...current, [field]: false }));
    }
  };

  const uploadGallery = async (files, category) => {
    if (!files.length) return;
    const invalid = files.find(
      (file) => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type),
    );
    if (invalid) {
      setNotice({ type: "error", text: "يمكن إضافة ملفات الصور فقط إلى المعرض." });
      return;
    }
    setUploading((current) => ({ ...current, gallery: true }));
    setNotice(null);
    try {
      const results = await Promise.allSettled(
        files.map((file) => uploadFile(file, `gallery/${category}`)),
      );
      const assets = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
      if (assets.length) {
        setForm((current) => ({
          ...current,
          gallery_items: [
            ...(current.gallery_items || []),
            ...assets.map((asset) => ({ url: asset.url, category })),
          ],
        }));
      }
      const failedCount = results.length - assets.length;
      setNotice(
        failedCount
          ? {
              type: "error",
              text: assets.length
                ? `تم رفع ${assets.length} صور وتعذّر رفع ${failedCount}. يمكنك حفظ الصور الناجحة.`
                : `تعذّر رفع الصور: ${results.find((result) => result.status === "rejected").reason.message}`,
            }
          : { type: "success", text: `تم رفع ${assets.length} صورة بنجاح.` },
      );
    } catch (error) {
      setNotice({ type: "error", text: `تعذّر رفع الصور: ${error.message}` });
    } finally {
      setUploading((current) => ({ ...current, gallery: false }));
    }
  };

  const uploadMusic = async (file) => {
    if (!file) return;
    if (!["audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave"].includes(file.type)) {
      setNotice({ type: "error", text: "يرجى اختيار ملف MP3 أو WAV." });
      return;
    }
    setUploading((current) => ({ ...current, music: true }));
    setNotice(null);
    try {
      const asset = await uploadFile(file, "music");
      const oldUrl = form.music_url;
      setField("music_url", asset.url);
      queueDelete(oldUrl);
      setNotice({ type: "success", text: "تم رفع الموسيقى بنجاح." });
    } catch (error) {
      setNotice({ type: "error", text: `تعذّر رفع الموسيقى: ${error.message}` });
    } finally {
      setUploading((current) => ({ ...current, music: false }));
    }
  };

  const removeImage = (field) => {
    const url = form[field];
    setField(field, "");
    queueDelete(url);
  };

  const removeGalleryImage = (index) => {
    const item = form.gallery_items[index];
    setField(
      "gallery_items",
      form.gallery_items.filter((_, itemIndex) => itemIndex !== index),
    );
    queueDelete(item?.url);
  };

  const removeMusic = () => {
    const url = form.music_url;
    setField("music_url", "");
    queueDelete(url);
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase.from("wedding_details").upsert({
        id: 1,
        groom_name: form.groom_name,
        bride_name: form.bride_name,
        wedding_date: form.wedding_date || null,
        wedding_time: form.wedding_time,
        venue_name: form.venue_name,
        venue_address: form.venue_address,
        maps_link: form.maps_link,
        site_background_image_url: form.site_background_image_url,
        hero_image_url: form.hero_image_url,
        gallery_items: form.gallery_items || [],
        gallery_urls: (form.gallery_items || []).map((item) => item.url),
        music_url: form.music_url,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      const cleanupResults = await Promise.allSettled(
        pendingDeletes.map((url) => deleteAsset(url)),
      );
      const failedUrls = pendingDeletes.filter(
        (_, index) => cleanupResults[index].status === "rejected",
      );
      setPendingDeletes(failedUrls);
      setNotice({
        type: failedUrls.length ? "error" : "success",
        text: failedUrls.length
          ? `حُفظت التفاصيل، لكن تعذّر حذف ${failedUrls.length} ملف من التخزين. ستتم إعادة المحاولة عند الحفظ التالي.`
          : "تم حفظ تفاصيل الدعوة بنجاح.",
      });
    } catch (error) {
      setNotice({ type: "error", text: `تعذّر حفظ البيانات: ${error.message}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <Link className="admin-brand" to="/">
          <span className="brand-glyph">ن</span>
          <span>ليلة من نور</span>
        </Link>
        <div className="admin-user">
          <span>{user.email}</span>
          <button onClick={onSignOut} aria-label="تسجيل الخروج">
            <LogOut size={16} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </header>
      <div className="admin-main">
        <div className="dashboard-heading">
          <div>
            <p className="admin-kicker">لوحة التحكم</p>
            <h1>لوحة تحكم الدعوة</h1>
            <p>أضيفوا لمساتكم لتظهر الدعوة كما تحلمون بها.</p>
          </div>
          <Link className="preview-link" to="/">
            معاينة الدعوة <ArrowLeft size={15} />
          </Link>
        </div>

        {notice && (
          <div className={`dashboard-notice ${notice.type}`} role="status">
            {notice.type === "success" ? <Check size={17} /> : <X size={17} />}
            {notice.text}
            <button onClick={() => setNotice(null)} aria-label="إغلاق التنبيه">
              <X size={15} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="dashboard-loading"><span className="loading-ring" /> جارٍ تحميل بيانات الدعوة...</div>
        ) : (
          <form className="dashboard-form" onSubmit={save}>
            <section className="dashboard-card">
              <div className="card-heading">
                <span className="card-step">01</span>
                <div><h2>أصحاب الدعوة</h2><p>الأسماء التي ستضيء ليلتكم</p></div>
              </div>
              <div className="form-grid">
                <label className="dashboard-field">
                  اسم العريس
                  <input required value={form.groom_name} onChange={(event) => setField("groom_name", event.target.value)} placeholder="الاسم الكريم" />
                </label>
                <label className="dashboard-field">
                  اسم العروس
                  <input required value={form.bride_name} onChange={(event) => setField("bride_name", event.target.value)} placeholder="الاسم الكريم" />
                </label>
              </div>
            </section>

            <section className="dashboard-card">
              <div className="card-heading">
                <span className="card-step">02</span>
                <div><h2>موعد ومكان اللقاء</h2><p>كل التفاصيل التي يحتاجها ضيوفكم</p></div>
              </div>
              <div className="form-grid">
                <label className="dashboard-field">
                  تاريخ الزفاف
                  <input type="date" required value={form.wedding_date || ""} onChange={(event) => setField("wedding_date", event.target.value)} />
                </label>
                <label className="dashboard-field">
                  وقت الزفاف
                  <input type="time" value={form.wedding_time || ""} onChange={(event) => setField("wedding_time", event.target.value)} />
                </label>
                <label className="dashboard-field">
                  اسم القاعة / المكان
                  <input value={form.venue_name || ""} onChange={(event) => setField("venue_name", event.target.value)} placeholder="مثال: قصر ليالي" />
                </label>
                <label className="dashboard-field">
                  عنوان المكان
                  <input value={form.venue_address || ""} onChange={(event) => setField("venue_address", event.target.value)} placeholder="المدينة، الحي، الشارع" />
                </label>
                <label className="dashboard-field field-full">
                  رابط خرائط Google
                  <input type="url" dir="ltr" value={form.maps_link || ""} onChange={(event) => setField("maps_link", event.target.value)} placeholder="https://maps.google.com/..." />
                </label>
              </div>
            </section>

            <ImageUploadField
                step="03"
                title="خلفية الموقع"
                description="صورة تظهر بخفة خلف أقسام الدعوة"
                value={form.site_background_image_url}
                busy={uploading.site_background_image_url}
                onUpload={(file) => uploadImage(file, "site_background_image_url")}
                onRemove={() => removeImage("site_background_image_url")}
                emptyLabel="أضيفوا خلفية الموقع"
            />

            <ImageUploadField
                step="04"
                title="الصورة الرئيسية"
                description="الصورة التي تستقبل ضيوفكم أولاً"
                value={form.hero_image_url}
                busy={uploading.hero_image_url}
                onUpload={(file) => uploadImage(file, "hero_image_url")}
                onRemove={() => removeImage("hero_image_url")}
                emptyLabel="أضيفوا صورة غلاف"
            />

            <section className="dashboard-card">
                <div className="card-heading">
                  <span className="card-step">05</span>
                  <div><h2>معرض الصور المقسّم</h2><p>أضيفوا صوركم إلى القسم المناسب</p></div>
                </div>
                <div className="admin-gallery-tabs" role="tablist" aria-label="أقسام المعرض">
                  {GALLERY_PARTITIONS.map((partition) => (
                    <button
                      className={galleryCategory === partition.id ? "active" : ""}
                      key={partition.id}
                      type="button"
                      role="tab"
                      aria-selected={galleryCategory === partition.id}
                      onClick={() => setGalleryCategory(partition.id)}
                    >
                      {partition.label}
                      <span>
                        {form.gallery_items.filter(
                          (item) => item.category === partition.id,
                        ).length}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="gallery-upload-grid">
                  {form.gallery_items.map((item, index) => ({ item, index }))
                    .filter(({ item }) => item.category === galleryCategory)
                    .map(({ item, index }) => (
                    <div className="admin-gallery-item" key={`${item.url}-${index}`}>
                      <img src={item.url} alt={`صورة ${GALLERY_PARTITIONS.find((partition) => partition.id === item.category)?.label || "المعرض"} ${index + 1}`} />
                      <button type="button" onClick={() => removeGalleryImage(index)} aria-label={`حذف الصورة ${index + 1}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                ))}
                <label className="gallery-add-tile">
                  <span className="upload-icon"><ImagePlus size={18} /></span>
                  <strong>{uploading.gallery ? "جاري الرفع..." : "إضافة صور"}</strong>
                  <span>إلى قسم {GALLERY_PARTITIONS.find((partition) => partition.id === galleryCategory)?.label}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={uploading.gallery} onChange={(event) => { uploadGallery(Array.from(event.target.files || []), galleryCategory); event.target.value = ""; }} />
                </label>
              </div>
            </section>

            <section className="dashboard-card">
              <div className="card-heading">
                <span className="card-step">06</span>
                <div><h2>موسيقى الأمسية</h2><p>نغمة ترافق ضيوفكم أثناء تصفح الدعوة</p></div>
              </div>
              <div className="music-upload-row">
                <label className="music-upload-tile">
                  <span className="upload-icon"><Music2 size={18} /></span>
                  <span>
                    <strong>{uploading.music ? "جاري الرفع..." : form.music_url ? "استبدال الملف الصوتي" : "رفع ملف موسيقي"}</strong>
                    <small>MP3 أو WAV</small>
                  </span>
                  <input type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" disabled={uploading.music} onChange={(event) => { uploadMusic(event.target.files?.[0]); event.target.value = ""; }} />
                </label>
                {form.music_url && (
                  <div className="music-file-status">
                    <span className="music-file-icon"><Music2 size={17} /></span>
                    <span><strong>الموسيقى جاهزة</strong><small>تعمل عند أول تفاعل من الزائر</small></span>
                    <button type="button" onClick={removeMusic} aria-label="حذف الموسيقى"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
            </section>

            <div className="dashboard-actions">
              <span><Check size={14} /> تُرفع الملفات مباشرةً إلى تخزين Supabase الآمن</span>
              <button className="save-button" type="submit" disabled={busy || Object.values(uploading).some(Boolean)}>
                {busy ? "جارٍ حفظ التغييرات..." : "حفظ التغييرات"}
                {!busy && <ArrowLeft size={16} />}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function AdminPage() {
  const [user, setUser] = useState(null);
  const [hasAdmin, setHasAdmin] = useState(null);
  const [setupError, setSetupError] = useState("");
  const [checking, setChecking] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const [adminResult, authResult] = await Promise.all([
        supabase.rpc("admin_exists"),
        supabase.auth.getUser(),
      ]);
      if (!active) return;
      if (adminResult.error) {
        setHasAdmin(null);
        setSetupError(adminResult.error.message);
      } else {
        setHasAdmin(adminResult.data === true);
      }
      if (!authResult.error && authResult.data.user) {
        const { data: allowed, error } = await supabase.rpc("is_current_user_admin");
        if (!error && allowed) setUser(authResult.data.user);
        else await supabase.auth.signOut();
      }
      setChecking(false);
      setAuthChecking(false);
    };
    initialize();
    return () => {
      active = false;
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return;
    setUser(null);
  };

  if (checking || authChecking) {
    return <div className="admin-boot"><span className="loading-ring" /> جارٍ تجهيز مساحة الإدارة...</div>;
  }
  if (hasAdmin === null && !user) {
    return (
      <div className="admin-boot admin-boot-error">
        <LockKeyhole size={20} />
        <p>تعذّر التحقق من حالة المدير: {setupError}. تأكد من تطبيق إعدادات supabase/schema.sql.</p>
        <Link to="/">العودة إلى الدعوة</Link>
      </div>
    );
  }
  if (user) return <AdminDashboard user={user} onSignOut={signOut} />;
  return (
    <AdminLogin
      hasAdmin={hasAdmin}
      setHasAdmin={setHasAdmin}
      onAuthenticated={setUser}
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/dashboard" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
