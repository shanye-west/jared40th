import { useEffect, useRef, useState } from "react";

type SplashScreenProps = {
  onDone: () => void;
};

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fading, setFading] = useState(false);

  const dismiss = () => {
    setFading(true);
    setTimeout(onDone, 600);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => dismiss();
    video.addEventListener("ended", handleEnded);

    // Fallback: if video fails to play or takes too long, dismiss after 5s
    const fallback = setTimeout(() => dismiss(), 8000);

    video.play().catch(() => {
      // Autoplay blocked — dismiss immediately
      clearTimeout(fallback);
      dismiss();
    });

    return () => {
      video.removeEventListener("ended", handleEnded);
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.6s ease",
        cursor: "pointer",
      }}
      onClick={dismiss}
    >
      <video
        ref={videoRef}
        src="/jaredgif.mov"
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
