import Head from "next/head";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import CandleLoader from "./CandleLoader";

export default function Layout({ title = "SYNOX", children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <CandleLoader label="Preparing your workspace..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>{title} - SYNOX</title>
      </Head>
      <div className="flex min-h-screen bg-dark-950">
        <Sidebar />
        <main className="flex-1 lg:ml-56 transition-all duration-300 min-h-screen overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </>
  );
}
