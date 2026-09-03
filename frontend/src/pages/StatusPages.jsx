import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <SimpleMessage emoji="🐄" title="Page not found" text="This page doesn't exist." />;
}

export function UnauthorizedPage() {
  return (
    <SimpleMessage emoji="🚫" title="Access denied" text="You don't have permission to view this page." />
  );
}

function SimpleMessage({ emoji, title, text }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-mist-50 px-4 text-center">
      <span className="text-5xl">{emoji}</span>
      <h1 className="font-display text-xl font-medium text-ink-900">{title}</h1>
      <p className="text-sm text-ink-500">{text}</p>
      <Link to="/" className="mt-2 text-sm font-medium text-pasture-700 hover:underline">
        Go home
      </Link>
    </div>
  );
}
