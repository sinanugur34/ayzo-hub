import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "./supabase";

const MOBILE_REDIRECT_URL =
  "io.ayzo.app://auth-callback";

export async function signInWithGoogle() {
  const {
    data,
    error,
  } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: MOBILE_REDIRECT_URL,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error(
      "Google authentication URL was not returned."
    );
  }

  await Browser.open({
    url: data.url,
  });
}

async function handleAuthUrl(
  url: string,
  onAuthenticated: () => void
) {
  if (!url.startsWith(MOBILE_REDIRECT_URL)) {
    return;
  }

  try {
    const parsed =
      new URL(url);

    const hashParams =
      new URLSearchParams(
        parsed.hash.startsWith("#")
          ? parsed.hash.slice(1)
          : parsed.hash
      );

    const code =
      parsed.searchParams.get("code");

    const tokenHash =
      parsed.searchParams.get("token_hash");

    const accessToken =
      parsed.searchParams.get("access_token") ??
      hashParams.get("access_token");

    const refreshToken =
      parsed.searchParams.get("refresh_token") ??
      hashParams.get("refresh_token");

    if (code) {
      const { error } =
        await supabase.auth
          .exchangeCodeForSession(code);

      if (error) {
        throw error;
      }
    } else if (
      accessToken &&
      refreshToken
    ) {
      const { error } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

      if (error) {
        throw error;
      }
    } else if (tokenHash) {
      const { error } =
        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        });

      if (error) {
        throw error;
      }
    } else {
      throw new Error(
        "Authentication callback did not contain a supported credential."
      );
    }

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !userData.user
    ) {
      throw (
        userError ??
        new Error(
          "Authenticated user could not be verified."
        )
      );
    }

    try {
      await Browser.close();
    } catch {
      // Browser may already be closed.
    }

    onAuthenticated();
  } catch (error) {
    console.error(
      "Mobile authentication callback failed.",
      error
    );
  }
}

export async function listenForAuthCallback(
  onAuthenticated: () => void
) {
  const launchUrl =
    await App.getLaunchUrl();

  if (launchUrl?.url) {
    await handleAuthUrl(
      launchUrl.url,
      onAuthenticated
    );
  }

  return App.addListener(
    "appUrlOpen",
    ({ url }) => {
      void handleAuthUrl(
        url,
        onAuthenticated
      );
    }
  );
}

export async function sendEmailOtp(
  email: string,
  isSignup: boolean
) {
  const normalized =
    email.trim().toLowerCase();

  if (!normalized) {
    throw new Error("Email is required.");
  }

  const { error } =
    await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        emailRedirectTo:
          MOBILE_REDIRECT_URL,
        shouldCreateUser:
          isSignup,
      },
    });

  if (error) {
    throw error;
  }
}
