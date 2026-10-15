import { Link } from "react-router-dom";
import { AuthenticatedTopbar } from "../../app/AppShell";
import { useAuthStore } from "../auth/authStore";

const contactEmail = "AllAmericanEnergy.office@gmail.com";

const services = [
  {
    title: "Battery Storage Systems",
    description:
      "These cutting-edge solutions ensure you have a consistent power supply, even when the sun isn't shining or the wind isn't blowing."
  },
  {
    title: "Energy Efficiency Consultation",
    description:
      "Our energy efficiency experts will assess your property and recommend tailored solutions to maximize energy savings."
  },
  {
    title: "Wind Energy Solutions",
    description:
      "Embrace the power of the wind with our wind energy solutions. We offer comprehensive wind turbine installation."
  },
  {
    title: "Power Your Entire Home",
    description:
      "Our energy efficiency experts will assess your property and recommend tailored solutions to maximize energy savings."
  },
  {
    title: "Energy Efficiency Audit",
    description:
      "Embrace the power of the wind with our wind energy solutions. We offer comprehensive wind turbine installation."
  }
];

export function LandingPage() {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken));

  return (
    <div className="landing-page">
      {isAuthenticated ? (
        <AuthenticatedTopbar />
      ) : (
        <header className="landing-header">
          <div className="landing-container landing-nav">
            <Link to="/" aria-label="All American Energy home">
              <img className="landing-logo" src="/aae-site-logo.jpg" alt="All American Energy" />
            </Link>
            <Link className="member-login-link" to="/login">
              Member Login
            </Link>
          </div>
        </header>
      )}

      <main>
        <section className="landing-hero">
          <div className="landing-hero-overlay" />
          <div className="landing-container landing-hero-content">
            <h1>The Future of Energy Management</h1>
            <p>Smarter. Cleaner. More Efficient.</p>
            <a className="landing-button landing-button-solid" href={`mailto:${contactEmail}`}>
              Speak With An Energy Consultant
            </a>
          </div>
        </section>

        <section className="landing-section landing-solutions">
          <div className="landing-container solutions-grid">
            <div className="solutions-heading">
              <h2>Our Energy and Waste Solutions</h2>
              <a className="landing-button landing-button-outline" href={`mailto:${contactEmail}`}>
                Chat With An Expert
              </a>
            </div>
            <div className="solutions-copy">
              <h3>Natural Gas Solutions</h3>
              <p>
                All American Energy specializes in deregulated energy consulting, providing unbiased
                guidance for both electricity and natural gas markets. As a comprehensive energy
                procurement firm, we offer a wide range of solutions tailored to help you leverage
                opportunities and maximize your potential in the dynamic energy markets.
              </p>
              <p>
                Our energy efficiency experts will assess your property and recommend tailored solutions
                to maximize energy savings.
              </p>
              <h3>Electricity Solutions</h3>
              <p>
                At All American Energy, we believe in simplifying your energy budget management with a
                plan that guarantees a predictable price. Our Fixed Price product ensures certainty and
                stability, keeping your price unchanged throughout your contract. When prices rise, this
                becomes your ultimate competitive advantage. Choose All American&apos;s Fixed Price for a
                reliable solution.
              </p>
            </div>
            <img
              className="solutions-image"
              src="/energy-solutions.jpg"
              alt="Energy infrastructure at sunset"
            />
          </div>
        </section>

        <section className="landing-section solar-section">
          <div className="landing-container solar-grid">
            <img
              className="solar-image"
              src="/solar-consultation.jpg"
              alt="Solar panels generating clean energy"
            />
            <div className="solar-copy">
              <h2>Get a Free Solar Consultation</h2>
              <p>
                Through net metering, solar system owners can export any excess electricity onto their
                local power grid and receive credit for it.
              </p>
              <p>
                With the utility-interactive solar backup options available, like battery banks,
                achieving a net zero utilization of fossil fuels and minimizing expenditure is possible
                even during the nighttime or on overcast days.
              </p>
              <p>All American Energy, providing sustainable solutions for a greener future.</p>
              <a className="landing-button landing-button-outline" href={`mailto:${contactEmail}`}>
                Contact Us Today
              </a>
            </div>
          </div>
        </section>

        <section className="services-section">
          <div className="landing-container">
            <h2>
              Smart For The Environment.
              <br />
              Smart For Your Wallet
            </h2>
            <div className="services-grid">
              <div className="services-intro">
                <h3>Sustainable Energy Services &amp; Products</h3>
                <a className="landing-button landing-button-dark" href={`mailto:${contactEmail}`}>
                  Chat With An Expert
                </a>
              </div>
              {services.map((service) => (
                <article className="service-card" key={service.title}>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="contact-section">
          <div className="landing-container contact-grid">
            <div className="contact-copy">
              <h2>All American Energy</h2>
              <div className="contact-list">
                <div>
                  <h3>Address</h3>
                  <p>PO BOX 238 Parrish FL, 34219</p>
                </div>
                <div>
                  <h3>Phone</h3>
                  <a href="tel:2039968382">203-996-8382</a>
                </div>
                <div>
                  <h3>Email</h3>
                  <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                </div>
              </div>
            </div>
            <div className="contact-art">
              <img src="/renewable-energy.jpg" alt="Renewable energy landscape" />
              <img src="/energy-illustration.png" alt="" aria-hidden="true" />
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">© All American Energy™ | {new Date().getFullYear()}</div>
      </footer>
    </div>
  );
}
