import type { AppProps } from "next/app";
import Head from "next/head";
import { PrivyProvider } from "@privy-io/react-auth";

/**
 * Custom App component.
 *
 * Wraps the application in the `PrivyProvider` so that Privy authentication
 * and embedded wallets are available throughout the component tree.  The
 * `appId` must be provided in an `.env.local` file as `NEXT_PUBLIC_PRIVY_APP_ID`.
 * See the README for instructions on obtaining your Privy App ID.  We also
 * configure Privy to automatically create embedded wallets for any user that
 * signs in via email, phone or OAuth by setting `createOnLogin` to `all-users`.
 */
export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Unlock × Privy Starter</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
        config={{
          embeddedWallets: {
            // Create an embedded wallet for every user upon login.  See the
            // Privy documentation for other supported options (e.g. only-users-without-wallets).
            createOnLogin: "all-users",
          },
        }}
      >
        <Component {...pageProps} />
      </PrivyProvider>
    </>
  );
}