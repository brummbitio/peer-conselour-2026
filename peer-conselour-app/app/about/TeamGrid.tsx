"use client";

import { useRef } from "react";
import Image from "next/image";

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
    id: "konselor",
    title: "Konselor Psikolog",
    subtitle: "Klinis, Pendidikan & Industri Organisasi",
    variant: "medium",
    members: [
      {
        name: "Ika Fitria",
        role: "S.Psi., M.Psi., Psikolog",
        photo: "/psikolog-konselor/ika-fitria.png",
      },
      {
        name: "Naila Kamaliya",
        role: "S.Psi., M.Psi., Psikolog",
        photo: "/psikolog-konselor/naila-kamaliya.png",
      },
      {
        name: "Dian Sudiono",
        role: "S.Psi., M.Psi., Psikolog",
        photo: "/psikolog-konselor/dian-sudiono.png",
      },
      {
        name: "Fatiya Halum Husna",
        role: "S.Psi., M.Psi., Psikolog",
        photo: "/psikolog-konselor/fatiya-halum-husna.png",
      },
      {
        name: "Elmy Bonafita Zahro",
        role: "S.Psi., M.Psi., Psikolog",
        photo: "/psikolog-konselor/elmy-bonafita-zahro.png",
      },
      {
        name: "Ahmad Syafiin",
        role: "S.Psi., M.Psi., Psikolog",
        photo: "/psikolog-konselor/ahmad-syafiin.png",
      },
      {
        name: "Agustina Susanti",
        role: "S.Psi., Psikolog",
        photo: "/psikolog-konselor/agustina-susanti.png",
      },
      {
        name: "Yunita Kurniawati",
        role: "S.Psi., M.Psi., Psikolog",
        photo: "/psikolog-konselor/yunita-kurniawati.png",
      },
      {
        name: "Ari Pratiwi",
        role: "S.Psi., M.Psi., Ph.D., Psikolog",
        photo: "/psikolog-konselor/ari-pratiwi.png",
      },
      {
        name: "Yuliezar Perwira Dara",
        role: "S.Psi., M.Psi.",
        photo: "/psikolog-konselor/yuliezar-perwira-dara.png",
      },
      {
        name: "Andini Laily Putri",
        role: "S.Psi.",
        photo: "/psikolog-konselor/andini-laily-putri.png",
      },
      {
        name: "Ulifa Rahma",
        role: "S.Psi., M.Psi., Psikolog",
        photo: "/psikolog-konselor/ulifa-rahma.png",
      },
    ],
  },
  {
    id: "koordinator",
    title: "Koordinator Peer Counselor",
    subtitle: "Penggerak layanan sebaya mahasiswa",
    variant: "small",
    members: [
      {
        name: "Vanessa Natalie",
        role: "Internal",
        photo: "/koordinator/vanessa-natalie.png",
      },
      {
        name: "M. Nafis Khilmi Kafa",
        role: "Internal",
        photo: "/koordinator/muhammad-nafis-khilmi-kafa.png",
      },
      {
        name: "Rafi A. Suryatmaja",
        role: "Eksternal",
        photo: "/koordinator/rafi-adli-suryatmaja.png",
      },
      {
        name: "Abbiyu Luthfi Fikri",
        role: "IT",
        photo: "/koordinator/abbiyu-luthfi-fikri.png",
      },
      {
        name: "Fernando P. Islamy",
        role: "IT",
        photo: "/koordinator/fernando-putra-islamy.png",
      },
      {
        name: "Melsy V. Nemasari",
        role: "Admin",
        photo: "/koordinator/melsy-veronicah-nemasari.png",
      },
      {
        name: "Allysa D. Fauzi",
        role: "Admin",
        photo: "/koordinator/allysa-dewantari-fauzi.png",
      },
      {
        name: "Aura Ratu Bilqis",
        role: "Admin",
        photo: "/koordinator/aura-ratu-bilqis.png",
      },
      {
        name: "Nafa Tsaniya A. P.",
        role: "Admin",
        photo: "/koordinator/nafa-tsaniya-azka-putri.png",
      },
      {
        name: "Heidemarie Gunarso",
        role: "Admin",
        photo: "/koordinator/heidemarie-setyane-gunarso.png",
      },
      {
        name: "Almira Jessenia",
        role: "Admin",
        photo: "/koordinator/almira-jessenia.png",
      },
      {
        name: "Tathyana Arti P. R.",
        role: "Sosmed",
        photo: "/koordinator/tathyana-arti-putri-r.png",
      },
      {
        name: "Asra Nur Ramadina",
        role: "Sosmed",
        photo: "/koordinator/asra-nur-ramadina.png",
      },
      {
        name: "Willy Riziq Canaha",
        role: "Sosmed",
        photo: "/koordinator/willy-riziq-canaha.png",
      },
    ],
  },
  {
    id: "peer-counselor",
    title: "Peer Counselor",
    subtitle: "Konselor sebaya mahasiswa Universitas Brawijaya",
    variant: "names-only",
    members: [
      { name: "Aura Prastika Ramadhan" },
      { name: "Halimah" },
      { name: "Dinar Rafika Rahmawati" },
      { name: "Nabila Kharimatul Rohma" },
      { name: "Syafa Navi Danella" },
      { name: "Gery Andriano" },
      { name: "Nichklaus E. Silaban" },
      { name: "Aulia Frida S. Azahra" },
      { name: "M. Naufal Ekaputra" },
      { name: "Rafida Azzahra" },
      { name: "Afrina Maulia" },
      { name: "Bima Fikri Zuhdi" },
      { name: "Izzati Aulia Muthmainah" },
      { name: "Akhtar Fatih Rasyad" },
      { name: "Raisya Nabila" },
      { name: "Nadhiifah Aulia L. Vriyani" },
      { name: "Amiroh ‘Alimah Z. Azka" },
      { name: "Eri Kurniasari" },
      { name: "Jabeer Shedeq Lubis" },
      { name: "Nathania C. Sastaviana" },
      { name: "Sullaik Alghotfani" },
      { name: "Evy Caroline Sitohang" },
      { name: "Farraziffah P. Sanjaya" },
      { name: "Zahrah Najwa Sarahah" },
      { name: "Alya Sova Az Zahra" },
      { name: "Naharina D. S. Suprapto" },
      { name: "Arikha Shofwatut Tazkia" },
      { name: "Wahyu Mangun Kusuma" },
      { name: "Zasxia Arzeta Putri" },
      { name: "Cornelius N. Widodo" },
      { name: "Benevan Gintha I. Ginting" },
      { name: "Rio Saputra Effendi" },
      { name: "Amira Ulifah" },
      { name: "Sofyan Taufiqul Ammar" },
      { name: "Alya Shabrina A. R. Husodo" },
      { name: "Bre Bramantyo El Hakim" },
      { name: "Cahyaningtyas P. Adventina" },
      { name: "Cathalina J. Putri" },
      { name: "Cecylia Putri" },
      { name: "Dewi Kanzu" },
      { name: "Ectada Sabila Al Haque" },
      { name: "Gladis Aura Julihandini" },
      { name: "Krisman J. Sianturi" },
      { name: "Kunti T. Fathul Munib" },
      { name: "Mutia Martalina Sitorus" },
      { name: "Najwa Atma J. Pasmah" },
      { name: "Tesalonika Kusumawardani" },
      { name: "Zhafirah Nur Ramadhani" },
    ],
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
          <Image
            src={member.photo}
            alt={member.name}
            fill
            sizes="(max-width: 479px) 158px, (max-width: 1023px) 176px, 200px"
            loading="lazy"
          />
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
          <Image
            src={member.photo}
            alt={member.name}
            width={100}
            height={100}
            sizes="100px"
            loading="lazy"
          />
        ) : (
          <span className="team-card-initial">{member.name[0]}</span>
        )}
      </div>
      <h3 title={member.name} style={{ whiteSpace: "nowrap" }}>
        {member.name}
      </h3>
      {member.role && <p>{member.role}</p>}
    </div>
  );
}

function NameTag({ member }: { member: TeamMember }) {
  return (
    <div className="team-name-tag" style={{ whiteSpace: "nowrap" }}>
      <span className="team-name-dot" />
      <span style={{ whiteSpace: "nowrap" }}>{member.name}</span>
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
