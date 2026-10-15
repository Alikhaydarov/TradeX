export function WelcomeHeading({
  eyebrow,
  name,
  detail,
}: {
  eyebrow: string;
  name: string;
  detail: string;
}) {
  return (
    <div className="welcome-heading">
      <span className="welcome-heading-eyebrow">{eyebrow}</span>
      <h1>
        <span className="welcome-heading-intro">Welcome back,</span>
        <span className="welcome-heading-name">{name}</span>
      </h1>
      <p>{detail}</p>
    </div>
  );
}
