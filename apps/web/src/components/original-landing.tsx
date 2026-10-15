import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  UsersRound,
} from "lucide-react";
import { Brand } from "./brand";

export function OriginalLanding() {
  return (
    <main className="original-landing">
      <nav className="original-landing-nav" aria-label="Main navigation">
        <Link href="/" aria-label="Tradoxy home">
          <Brand />
        </Link>
        <div>
          <a href="#workspace">Workspace</a>
          <a href="#how">How it works</a>
          <a href="#faq">FAQ</a>
        </div>
        <span>
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up" className="landing-button">
            Get started <ArrowUpRight size={14} />
          </Link>
        </span>
      </nav>
      <section className="original-landing-hero">
        <p className="landing-eyebrow">
          <i />A trading journal that learns with you
        </p>
        <h1>Tradoxy</h1>
        <h2>
          Trade with a process.
          <br />
          Grow with every trade.
        </h2>
        <p>
          Journal the decision, review the execution, and turn your trading
          history into a repeatable process.
        </p>
        <div>
          <Link href="/sign-up" className="landing-button">
            Start your journal <ArrowRight size={16} />
          </Link>
          <Link
            href="/sign-in"
            className="landing-button landing-button-outline"
          >
            Sign in
          </Link>
        </div>
        <figure id="workspace">
          <Image
            src="/landing/tradoxy-product-laptop.png"
            alt="Tradoxy trading dashboard product preview on a laptop"
            width={1672}
            height={941}
            priority
            sizes="(max-width: 767px) 100vw, 1120px"
          />
          <figcaption>Journal. Review. Improve.</figcaption>
        </figure>
      </section>
      <section id="how" className="original-landing-workflow">
        <div>
          <p>YOUR TRADING WORKSPACE</p>
          <h2>
            From a trade
            <br />
            to a better decision.
          </h2>
        </div>
        <div>
          {[
            {
              icon: BookOpen,
              title: "Journal the decision",
              text: "Keep entries, exits, risk and your reasoning together. Build a record you can return to.",
            },
            {
              icon: ChartNoAxesCombined,
              title: "Review the execution",
              text: "See your account balance, daily results and trading patterns in one workspace.",
            },
            {
              icon: UsersRound,
              title: "Share your progress",
              text: "Post a trade, exchange ideas, and follow the traders you learn from.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <Icon size={21} />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section id="faq" className="original-landing-faq">
        <h2>A few things to know.</h2>
        <details>
          <summary>What can I journal?</summary>
          <p>
            Record an instrument, direction, entry and exit, fees, risk/reward
            and notes. Review the results by account or date.
          </p>
        </details>
        <details>
          <summary>Can I use Tradoxy on my phone?</summary>
          <p>
            Yes. Your journal, calendar, profile and feed are available on
            mobile and desktop.
          </p>
        </details>
        <details>
          <summary>How do I get started?</summary>
          <p>
            Create your profile, add a trading account and record your first
            trade.
          </p>
        </details>
      </section>
      <section className="original-landing-cta">
        <h2>
          Your next trade.
          <br />A clearer perspective.
        </h2>
        <Link href="/sign-up" className="landing-button">
          Start your journal <ArrowRight size={16} />
        </Link>
      </section>
      <footer className="original-landing-footer">
        <Brand />
        <p>Journal the process.</p>
        <Link href="/sign-in">
          Open workspace <ArrowUpRight size={14} />
        </Link>
      </footer>
    </main>
  );
}
