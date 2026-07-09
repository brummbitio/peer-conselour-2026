"use client";

import { useRef } from "react";

/* ── Section data types ── */

interface TeamMember {
  name: string;
  role?: string;
  photo?: string;
}

interface TeamSection {
  id: string;
  title: string;
  subtitle: string;
  members: TeamMember[];
  variant: "medium" | "small" | "names-only";
}

/* ── Placeholder data ── */

const teamSections: TeamSection[] = [
  {
    id: "konsultan",
    title: "Konsultan",
    subtitle: "Hukum, Medis & Perawatan Jiwa",
    variant: "medium",
    members: Array.from({ length: 6 }, (_, i) => ({
      name: `Konsultan ${i + 1}`,
      role: ["Hukum", "Medis", "Perawatan Jiwa"][i % 3],
      photo: `/hero/hero-photo.webp`,
    })),
  },
  {
    id: "konselor",
    title: "Konselor Psikolog",
    subtitle: "Klinis, Pendidikan & Industri Organisasi",
    variant: "medium",
    members: Array.from({ length: 9 }, (_, i) => ({
      name: `Konselor ${i + 1}`,
      role: ["Psikolog Klinis", "Psikolog Pendidikan", "Psikolog I/O"][i % 3],
      photo: `/hero/hero-photo.webp`,
    })),
  },
  {
    id: "koordinator",
    title: "Koordinator Peer Counselor",
    subtitle: "Penggerak layanan sebaya mahasiswa",
    variant: "small",
    members: Array.from({ length: 14 }, (_, i) => ({
      name: `Koordinator ${i + 1}`,
      role: "Koordinator",
      photo: `/hero/hero-photo.webp`,
    })),
  },
  {
    id: "peer-counselor",
    title: "Peer Counselor",
    subtitle: "Konselor sebaya mahasiswa Universitas Brawijaya",
    variant: "names-only",
    members: Array.from({ length: 60 }, (_, i) => ({
      name: `Peer Counselor ${i + 1}`,
    })),
  },
];

/* ── Scroll Buttons ── */

function ScrollArrow({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  return (
    <button
      className={`team-scroll-btn team-scroll-${direction}`}
      onClick={onClick}
      aria-label={direction === "left" ? "Scroll kiri" : "Scroll kanan"}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {direction === "left" ? (
          <polyline points="15 18 9 12 15 6" />
        ) : (
          <polyline points="9 18 15 12 9 6" />
        )}
      </svg>
    </button>
  );
}

/* ── Card Components ── */

function MediumCard({ member }: { member: TeamMember }) {
  return (
    <div className="team-card team-card-md">
      <div className="team-card-photo team-card-photo-md">
        {member.photo ? (
          <img src={member.photo} alt={member.name} />
        ) : (
          <span className="team-card-initial">{member.name[0]}</span>
        )}
      </div>
      <div className="team-card-info">
        <h3>{member.name}</h3>
        {member.role && <p>{member.role}</p>}
      </div>
    </div>
  );
}

function SmallCard({ member }: { member: TeamMember }) {
  return (
    <div className="team-card team-card-sm">
      <div className="team-card-photo team-card-photo-sm">
        {member.photo ? (
          <img src={member.photo} alt={member.name} />
        ) : (
          <span className="team-card-initial">{member.name[0]}</span>
        )}
      </div>
      <h3>{member.name}</h3>
      {member.role && <p>{member.role}</p>}
    </div>
  );
}

function NameTag({ member }: { member: TeamMember }) {
  return (
    <div className="team-name-tag">
      <span className="team-name-dot" />
      <span>{member.name}</span>
    </div>
  );
}

/* ── Section Component ── */

function TeamSectionBlock({ section }: { section: TeamSection }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className={`team-section team-section-${section.variant}`} id={section.id}>
      <div className="team-section-header site-width">
        <div>
          <h2 className="team-section-title">{section.title}</h2>
          <p className="team-section-subtitle">{section.subtitle}</p>
        </div>
        <div className="team-scroll-controls">
          <ScrollArrow direction="left" onClick={() => scroll("left")} />
          <ScrollArrow direction="right" onClick={() => scroll("right")} />
        </div>
      </div>

      <div className="team-scroll-area" ref={scrollRef}>
        {section.variant === "names-only" ? (
          <div className="team-names-grid">
            {section.members.map((member, i) => (
              <NameTag key={i} member={member} />
            ))}
          </div>
        ) : (
          <div className={`team-cards-row team-cards-${section.variant}`}>
            {section.members.map((member, i) => {
              switch (section.variant) {
                case "medium":
                  return <MediumCard key={i} member={member} />;
                case "small":
                  return <SmallCard key={i} member={member} />;
                default:
                  return null;
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Export ── */

export default function TeamGrid() {
  return (
    <div className="team-grid-wrap">
      {teamSections.map((section) => (
        <TeamSectionBlock key={section.id} section={section} />
      ))}
    </div>
  );
}
