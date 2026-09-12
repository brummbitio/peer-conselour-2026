import Link from "next/link";
import { SiteChrome } from "./components";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <SiteChrome>
      <section 
        style={{ 
          flex: "1 0 auto",
          display: "flex", 
          flexDirection: "column",
          alignItems: "center", 
          justifyContent: "center", 
          padding: "80px 24px 40px", 
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          width: "100%",
          maxWidth: "100%"
        }}
      >
        {/* Ambient glow background */}
        <div 
          className="ambient ambient-red" 
          style={{ 
            top: "20%", 
            left: "50%", 
            transform: "translateX(-50%)", 
            opacity: 0.12,
            width: "min(500px, 90vw)",
            height: "min(500px, 90vw)",
            filter: "blur(100px)",
            pointerEvents: "none",
            position: "absolute",
            zIndex: 0
          }} 
        />

        {/* Container diubah menjadi Flexbox Kolom */}
        <div style={{ maxWidth: "440px", zIndex: 1, position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h1 
            style={{ 
              fontSize: "min(120px, 22vw)", 
              fontWeight: 900, 
              margin: 0, 
              lineHeight: 0.85,
              letterSpacing: "-0.05em",
              background: "linear-gradient(135deg, var(--text-primary) 30%, #54abc7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            404
          </h1>
          
          <h2 
            style={{ 
              fontSize: "22px", 
              fontWeight: 700, 
              marginTop: "20px", 
              marginBottom: "8px", 
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
              textAlign: "center",
              maxWidth: "none" /* Menimpa 14ch dari globals.css */
            }}
          >
            Halaman Tidak Ditemukan
          </h2>
          
          <p 
            style={{ 
              fontSize: "13.5px", 
              color: "var(--text-secondary)", 
              marginBottom: "32px", 
              lineHeight: "1.6",
              maxWidth: "340px",
              marginLeft: "auto",
              marginRight: "auto",
              textAlign: "center"
            }}
          >
            Mungkin tautan yang kamu ikuti salah atau halaman telah dipindahkan.
          </p>
          
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Link 
              href="/" 
              className="button button-primary" 
              style={{ 
                display: "inline-flex", 
                justifyContent: "center", 
                alignItems: "center", 
                gap: "8px", 
                padding: "12px 28px",
                textDecoration: "none",
                fontSize: "13.5px",
                fontWeight: 600,
                borderRadius: "999px",
                boxShadow: "0 10px 25px rgba(84, 171, 199, 0.25)"
              }}
            >
              <Home size={15} />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
