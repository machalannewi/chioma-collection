import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="case case-missing">
      <p className="label">( Not found )</p>
      <h1 className="case-title">This piece isn’t here.</h1>
      <Link className="case-back" href="/work/">← Back to the work</Link>
    </main>
  );
}
