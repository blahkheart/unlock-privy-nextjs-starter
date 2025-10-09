import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/router";
import Head from "next/head";
import { getClientConfig } from "@/lib/blockchain/config";

/**
 * Landing page with authentication
 * Displays a connect button and redirects authenticated users to the examples page
 */
export default function Home() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const chainConfig = getClientConfig();

  // Redirect authenticated users to examples page
  useEffect(() => {
    if (ready && authenticated) {
      router.push("/examples");
    }
  }, [ready, authenticated, router]);

  // Show loading state while checking authentication
  if (!ready) {
    return (
      <>
        <Head>
          <title>Unlock × Privy Starter</title>
        </Head>
        <main className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </main>
      </>
    );
  }

  // Don't show login page if already authenticated (will redirect)
  if (authenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Unlock × Privy Starter</title>
        <meta name="description" content="Next.js starter with Unlock Protocol and Privy authentication" />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  Unlock Protocol × Privy
                </h1>
                <span className="px-4 py-1.5 bg-blue-500/10 text-blue-300 rounded-full text-sm font-semibold border border-blue-500/20">
                  {chainConfig.name} (Chain {chainConfig.chainId})
                </span>
              </div>
              <p className="text-xl text-gray-400">
                Next.js Starter Template
              </p>
            </div>

            <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
              A production-ready starter template combining Unlock Protocol's membership NFTs
              with Privy's seamless wallet authentication. Build token-gated applications with ease.
            </p>

            {/* Connect Button */}
            <div className="pt-8">
              <button
                onClick={login}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 transform"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Connect Wallet
                </span>
              </button>
              <p className="mt-4 text-sm text-gray-500">
                Connect with wallet, email, phone, or social login
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6 pt-16">
              <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                <div className="w-12 h-12 mx-auto mb-4 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Unlock Protocol</h3>
                <p className="text-sm text-gray-400">
                  Deploy locks, purchase keys, and manage memberships on-chain
                </p>
              </div>

              <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                <div className="w-12 h-12 mx-auto mb-4 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Privy Auth</h3>
                <p className="text-sm text-gray-400">
                  Seamless wallet connection with embedded wallets for all users
                </p>
              </div>

              <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                <div className="w-12 h-12 mx-auto mb-4 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Production Ready</h3>
                <p className="text-sm text-gray-400">
                  TypeScript, logging, error handling, and battle-tested patterns
                </p>
              </div>
            </div>

            {/* Footer Links */}
            <div className="pt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <a href="https://docs.unlock-protocol.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">
                Unlock Docs →
              </a>
              <a href="https://docs.privy.io" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">
                Privy Docs →
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">
                GitHub →
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
