import { SiteChrome, LandingCTASection } from "../components";
import AboutHero from "./AboutHero";
import TeamGrid from "./TeamGrid";
import "../styles/content-pages.css";

const FAQ_ITEMS = [
  {
    question: "Siapa saja yang dapat menggunakan layanan ini?",
    answer:
      "Layanan ini dapat diakses oleh seluruh mahasiswa UB, baik jenjang S1, S2, maupun S3.",
  },
  {
    question: "Apakah layanan ini berbayar?",
    answer: "Layanan ini bersifat gratis.",
  },
  {
    question: "Berapa kali saya dapat menggunakan layanan ini?",
    answer:
      "Pada umumnya tidak ada batasan dalam mengakses layanan ini. Pertemuan biasanya akan dilaksanakan satu minggu sekali dan pada beberapa kasus tertentu konselor akan merekomendasikan beberapa pertemuan untuk satu kasus. Untuk kasus yang membutuhkan lebih dari satu pertemuan, konselor dan mahasiswa akan menyepakati jadwal untuk pertemuan berikutnya. Jika pertemuan telah selesai, namun Anda merasa masih membutuhkan konseling, baik untuk kasus yang sama atau kasus yang berbeda, maka Anda dipersilakan untuk memesan jadwal konseling kembali.",
  },
  {
    question: "Apakah saya perlu mendapatkan pengantar dari dosen penasihat akademik?",
    answer:
      "Dosen penasihat akademik bisa merekomendasikan mahasiswanya untuk mendapatkan layanan ini, akan tetapi Anda tidak memerlukan surat pengantar dari dosen atau program studi untuk mengakses layanan ini.",
  },
  {
    question: "Apa saja kasus yang dapat ditangani?",
    answer:
      "Kasus yang dapat ditangani adalah masalah pribadi sehari-hari, misalnya hubungan interpersonal dengan orang tua, teman, dosen, atau pasangan, masalah akademis, dan lainnya. Jika Anda terindikasi mengalami masalah klinis yang lebih berat, maka konselor dapat memberikan rujukan ke pihak yang dibutuhkan (misalnya rumah sakit, klinik, dsb.).",
  },
  {
    question: "Siapa saja yang bisa mengakses data saya?",
    answer:
      "Seluruh data Anda bersifat rahasia dan hanya dapat diakses oleh konselor yang menangani Anda. Pada kasus tertentu (misalnya melibatkan bahaya pada diri sendiri dan orang lain secara fisik atau melanggar ketentuan hukum di Indonesia) maka konselor berhak untuk mengambil tindakan yang dirasa perlu. Apabila Anda dirujuk oleh pihak tertentu (misalnya dosen penasihat akademik), maka pihak tersebut memiliki hak untuk mengakses data Anda dalam batasan tertentu.",
  },
  {
    question: "Apakah ada kemungkinan orang tua atau pihak lain yang berkaitan dengan saya dipanggil?",
    answer: "Sesuai kebutuhan dan kesepakatan antara Anda dan konselor.",
  },
  {
    question: "Apakah saya boleh mengganti konselor jika saya merasa tidak nyaman?",
    answer: "Anda memiliki hak untuk mengganti konselor.",
  },
  {
    question: "Apakah saya boleh berhenti melakukan konseling?",
    answer:
      "Konseling bersifat sukarela. Anda dipersilakan untuk berhenti atau menyudahi sesi konseling tanpa perlu memberikan alasan.",
  },
  {
    question: "Apakah saya bisa membatalkan pertemuan konseling yang telah dijadwalkan?",
    answer:
      "Anda dipersilakan untuk membatalkan pertemuan yang telah dijadwalkan dengan memberitahukan maksimal 1 hari sebelumnya melalui e-mail. Jika Anda membatalkan tanpa pemberitahuan maka Anda tidak berhak mengakses layanan selama 1 (satu) bulan.",
  },
];

export default function AboutPage() {
  return (
    <SiteChrome cleanBackground={true}>
      <AboutHero />

      <section className="section about-team-section">
        <TeamGrid />
      </section>

      <section className="section site-width about-faq-section">
        <div className="psiko-faq-heading">
          <h2>FAQ</h2>
        </div>

        <div className="psiko-faq-list">
          {FAQ_ITEMS.map((item) => (
            <details className="psiko-faq-item" key={item.question}>
              <summary>
                <span>{item.question}</span>
                <span className="psiko-faq-icon" aria-hidden="true">
                  +
                </span>
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <LandingCTASection />
    </SiteChrome>
  );
}
