import Head from "next/head";
import Link from "next/link";

export default function Custom404() {
  return (
    <>
      <Head><title>404 — ATIS</title></Head>
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="font-display font-extrabold text-8xl text-brand-200 opacity-20 mb-4">404</div>
          <h1 className="font-display font-bold text-2xl text-white mb-2">Page Not Found</h1>
          <p className="text-dark-400 mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/" className="btn-primary inline-flex">← Back to Dashboard</Link>
        </div>
      </div>
    </>
  );
}
