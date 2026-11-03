import { Link } from 'react-router-dom';
import './AboutPage.css';

const currentYear = new Date().getFullYear();

const offerings = [
  {
    number: '01',
    title: 'Educational Document Library',
    description: 'Explore past examination papers, assignments, quizzes, syllabuses, and other learning materials in one central library.',
  },
  {
    number: '02',
    title: 'Search and Filter',
    description: 'Find relevant materials by course, academic year, semester, and document type.',
  },
  {
    number: '03',
    title: 'Student Contributions',
    description: 'Contribute useful academic materials. Submissions are reviewed before they become publicly available.',
  },
  {
    number: '04',
    title: 'Online Quizzes',
    description: 'Practice your knowledge, submit your answers, and review results to better understand your progress.',
  },
  {
    number: '05',
    title: 'Document Verification',
    description: 'Check the authenticity and verification status of documents shared through the platform.',
  },
  {
    number: '06',
    title: 'Learning Community',
    description: 'Connect students, lecturers, and the wider academic community through sharing useful educational resources.',
  },
];

const values = [
  ['Accessibility', 'Learning resources should be easier for everyone to access.'],
  ['Collaboration', 'We believe students achieve more when they learn together.'],
  ['Integrity', 'Educational materials should be reviewed and responsibly shared.'],
  ['Innovation', 'We use technology to address real educational challenges.'],
  ['Growth', 'We encourage continuous learning, improvement, and academic development.'],
];

const audiences = [
  ['Students', 'Find study materials, practice quizzes, and prepare for examinations.'],
  ['Lecturers', 'Contribute educational materials and support student learning.'],
  ['Moderators', 'Review submitted documents and help maintain content quality.'],
  ['Administrators', 'Manage the platform and support its operations.'],
];

function AboutPage({ portal = false }) {
  const Page = portal ? 'div' : 'main';

  return (
    <>
      <Page className="about-page">
        <header className="about-hero">
          <div className="about-hero-copy">
            <p className="about-eyebrow">ABOUT LETLEARNTOGETHER</p>
            <h1>Learn. Share. Grow.</h1>
            <p className="about-hero-description">
              Learning is better together. We make academic resources more accessible
              to students and educators across Liberia.
            </p>
            <div className="about-hero-actions">
              <Link className="about-primary-link" to="/library">Explore the library</Link>
              <Link className="about-secondary-link" to="/register">Join the community</Link>
            </div>
          </div>
          <div className="about-hero-mark" aria-hidden="true">
            <img src="/letlearn-together-mark.png" alt="" />
            <span>LEARN TOGETHER</span>
          </div>
        </header>

        <section className="about-section-block" aria-labelledby="about-who-title">
          <div className="about-section-heading">
            <p className="about-eyebrow">WHO WE ARE</p>
            <h2 id="about-who-title">A shared place to learn and grow</h2>
          </div>
          <p className="about-body-copy">
            <strong>LetLearnTogether</strong> is an educational learning platform designed
            to make academic resources more accessible to students and educators in Liberia.
            We believe that every student deserves access to quality learning materials,
            regardless of their location or financial situation. Our platform provides a
            central place where students can discover academic documents, access past
            examination papers, practice with quizzes, and improve their understanding of
            different subjects. Our goal is to use technology to make learning easier, more
            accessible, and more collaborative.
          </p>
        </section>

        <section className="about-purpose-grid" aria-label="Our mission and vision">
          <article className="about-purpose-card">
            <p className="about-eyebrow">OUR MISSION</p>
            <h2>Empower every learner</h2>
            <p>
              Our mission is to empower students and educators with an accessible digital
              platform for sharing educational resources, practicing academic skills, and
              supporting better learning outcomes. We want to reduce the difficulty students
              face when searching for relevant study materials and create more opportunities
              for students to learn together.
            </p>
          </article>
          <article className="about-purpose-card about-purpose-card-highlight">
            <p className="about-eyebrow">OUR VISION</p>
            <h2>A connected learning community</h2>
            <p>
              We envision a future where every student in Liberia can easily access the
              educational resources they need to succeed. We aim to build a connected
              learning community where students, lecturers, and educational institutions
              share knowledge, support one another, and contribute to a stronger education
              system.
            </p>
          </article>
        </section>

        <section className="about-section-block" aria-labelledby="about-offers-title">
          <div className="about-section-heading">
            <p className="about-eyebrow">WHAT WE OFFER</p>
            <h2 id="about-offers-title">Tools that support learning</h2>
          </div>
          <div className="about-offerings-grid">
            {offerings.map((offering) => (
              <article className="about-offering-card" key={offering.number}>
                <span className="about-card-number">{offering.number}</span>
                <h3>{offering.title}</h3>
                <p>{offering.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-community-grid" aria-label="Our values and community">
          <div className="about-community-panel">
            <p className="about-eyebrow">OUR CORE VALUES</p>
            <h2>What guides us</h2>
            <ul className="about-value-list">
              {values.map(([name, description]) => (
                <li key={name}>
                  <span className="about-value-mark" aria-hidden="true">✓</span>
                  <p><strong>{name}:</strong> {description}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="about-community-panel about-audience-panel">
            <p className="about-eyebrow">WHO WE SERVE</p>
            <h2>For the whole learning community</h2>
            <ul className="about-audience-list">
              {audiences.map(([name, description]) => (
                <li key={name}>
                  <h3>{name}</h3>
                  <p>{description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="about-why-section">
          <p className="about-eyebrow">WHY LETLEARNTOGETHER?</p>
          <h2>Better resources. Better preparation.</h2>
          <p>
            Finding the right academic materials can be challenging. Students often depend
            on scattered documents, shared files, and different sources to prepare for
            examinations. LetLearnTogether brings these resources into one organized digital
            learning environment. We believe that knowledge becomes more powerful when it is
            shared.
          </p>
          <blockquote>
            <span>Learn • Share • Grow</span>
            <cite>LetLearnTogether — Learning is better together.</cite>
          </blockquote>
        </section>
      </Page>
      {!portal && (
        <footer className="site-footer">
          <Link className="footer-brand" to="/">
            <img className="brand-mark" src="/letlearn-together-mark.png" alt="" />
            LetLearnTogether
          </Link>
          <p>© {currentYear} LetLearnTogether. Learn together, grow together.</p>
        </footer>
      )}
    </>
  );
}

export default AboutPage;
