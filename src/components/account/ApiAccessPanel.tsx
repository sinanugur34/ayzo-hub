"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export default function ApiAccessPanel() {
  const [
    keys,
    setKeys,
  ] =
    useState<ApiKeyRow[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    lockedOut,
    setLockedOut,
  ] =
    useState(false);

  const [
    name,
    setName,
  ] =
    useState(
      "Production"
    );

  const [
    secret,
    setSecret,
  ] =
    useState("");

  const [
    copied,
    setCopied,
  ] =
    useState(false);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  async function loadKeys() {
    const response =
      await fetch(
        "/api/account/api-keys",
        {
          credentials:
            "same-origin",

          cache:
            "no-store",
        }
      );

    const body =
      await response
        .json()
        .catch(
          () => null
        );

    if (
      response.status ===
        403
    ) {
      setLockedOut(
        true
      );

      return;
    }

    if (!response.ok) {
      throw new Error(
        typeof body?.error ===
          "string"
          ? body.error
          : "Unable to load API keys."
      );
    }

    setKeys(
      Array.isArray(
        body?.keys
      )
        ? body.keys
        : []
    );
  }

  useEffect(
    () => {
      let active =
        true;

      async function load() {
        try {
          await loadKeys();
        } catch (
          caught
        ) {
          if (active) {
            setError(
              caught instanceof
                Error
                ? caught.message
                : "Unable to load API Access."
            );
          }
        } finally {
          if (active) {
            setLoading(
              false
            );
          }
        }
      }

      void load();

      return () => {
        active =
          false;
      };
    },
    []
  );

  const activeKey =
    useMemo(
      () =>
        keys.find(
          key =>
            !key.revoked_at
        ) ??
        null,
      [
        keys,
      ]
    );

  async function createKey() {
    if (
      busy ||
      activeKey
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSecret("");
    setCopied(false);

    try {
      const response =
        await fetch(
          "/api/account/api-keys",
          {
            method:
              "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name,
              }),
          }
        );

      const body =
        await response
          .json()
          .catch(
            () => null
          );

      if (!response.ok) {
        throw new Error(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to create API key."
        );
      }

      if (
        typeof body?.secret !==
          "string" ||
        !body.secret
      ) {
        throw new Error(
          "AYZO created the key but did not return a usable secret."
        );
      }

      setSecret(
        body.secret
      );

      if (
        body?.key &&
        typeof body.key ===
          "object"
      ) {
        setKeys(
          current => [
            body.key,
            ...current,
          ]
        );
      } else {
        await loadKeys();
      }
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to create API key."
      );
    } finally {
      setBusy(
        false
      );
    }
  }

  async function revokeKey(
    id: string
  ) {
    if (
      busy ||
      !window.confirm(
        "Revoke this API key? Requests using it will stop immediately."
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSecret("");
    setCopied(false);

    try {
      const response =
        await fetch(
          `/api/account/api-keys?id=${encodeURIComponent(id)}`,
          {
            method:
              "DELETE",

            credentials:
              "same-origin",
          }
        );

      const body =
        await response
          .json()
          .catch(
            () => null
          );

      if (!response.ok) {
        throw new Error(
          typeof body?.error ===
            "string"
            ? body.error
            : "Unable to revoke API key."
        );
      }

      await loadKeys();
    } catch (
      caught
    ) {
      setError(
        caught instanceof
          Error
          ? caught.message
          : "Unable to revoke API key."
      );
    } finally {
      setBusy(
        false
      );
    }
  }

  async function copySecret() {
    if (!secret) {
      return;
    }

    try {
      await navigator
        .clipboard
        .writeText(
          secret
        );

      setCopied(
        true
      );
    } catch {
      setCopied(
        false
      );
    }
  }

  if (
    loading ||
    lockedOut
  ) {
    return null;
  }

  return (
    <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
      <div className="text-xs font-medium tracking-[0.16em] text-violet-300">
        ADVANCED · API ACCESS
      </div>

      <h2 className="mt-2 text-xl font-semibold">
        API Access
      </h2>

      <p className="mt-2 max-w-3xl text-xs leading-5 text-zinc-500">
        Create one private API key for server-to-server AYZO Intelligence requests.
        API analyses share your normal Advanced daily analysis quota.
      </p>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {secret && (
        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="text-xs font-semibold text-amber-200">
            Save this key now
          </div>

          <p className="mt-2 text-xs leading-5 text-amber-100/70">
            AYZO will not show this secret again. Store it in a secure password
            manager or server secret store. Do not put it in source code.
          </p>

          <div className="mt-4 break-all rounded-xl border border-zinc-800 bg-black/60 p-4 font-mono text-xs text-zinc-200">
            {secret}
          </div>

          <button
            type="button"
            onClick={
              copySecret
            }
            className="mt-3 rounded-xl border border-zinc-700 px-4 py-2 text-xs text-zinc-200 transition hover:border-zinc-500"
          >
            {copied
              ? "Copied"
              : "Copy key"}
          </button>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/30 p-5">
        <div className="text-xs font-medium text-zinc-300">
          API key
        </div>

        {activeKey ? (
          <div className="mt-4">
            <div className="text-sm text-zinc-200">
              {activeKey.name}
            </div>

            <div className="mt-2 font-mono text-xs text-zinc-500">
              {activeKey.key_prefix}…
            </div>

            <div className="mt-2 text-[11px] text-zinc-600">
              Created{" "}
              {new Date(
                activeKey.created_at
              ).toLocaleString()}
              {activeKey.last_used_at
                ? ` · Last used ${new Date(
                    activeKey.last_used_at
                  ).toLocaleString()}`
                : " · Never used"}
            </div>

            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                () =>
                  revokeKey(
                    activeKey.id
                  )
              }
              className="mt-4 rounded-xl border border-rose-500/20 px-4 py-2 text-xs text-rose-300 transition hover:border-rose-500/40 disabled:opacity-50"
            >
              Revoke key
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={
                name
              }
              maxLength={
                80
              }
              onChange={
                event =>
                  setName(
                    event.target.value
                  )
              }
              placeholder="Production"
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-black px-4 py-2 text-sm text-zinc-200 outline-none transition focus:border-violet-500/50"
            />

            <button
              type="button"
              disabled={
                busy ||
                !name.trim()
              }
              onClick={
                createKey
              }
              className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-200 transition hover:bg-violet-500/15 disabled:opacity-50"
            >
              {busy
                ? "Creating…"
                : "Create API key"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/30 p-5">
        <div className="text-xs font-medium text-zinc-300">
          Endpoint
        </div>

        <div className="mt-3 break-all font-mono text-xs text-zinc-500">
          POST https://app.ayzo.io/api/v1/intelligence
        </div>

        <pre className="mt-4 overflow-x-auto rounded-xl border border-zinc-900 bg-black p-4 text-[11px] leading-5 text-zinc-500">
{`Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json

{
  "network": "bitcoin",
  "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
}`}
        </pre>

        <p className="mt-3 text-[11px] leading-5 text-zinc-600">
          Rate limit: 10 requests per minute per API key. API calls also use
          AYZO&apos;s normal analysis load protection and Advanced daily quota.
        </p>
      </div>
    </section>
  );
}
