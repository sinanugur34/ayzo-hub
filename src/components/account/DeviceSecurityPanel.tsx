"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type DeviceRow = {
  id:
    string;

  device_label:
    string;

  created_at:
    string;

  last_login_at:
    string;

  last_seen_at:
    string;
};

type SecurityNotification = {
  id:
    string;

  event_type:
    "new_device_login";

  actor_device_label:
    string;

  created_at:
    string;
};

type DeviceSecurityResponse = {
  currentSessionId:
    string;

  maxActiveDevices:
    number;

  devices:
    DeviceRow[];

  notifications:
    SecurityNotification[];
};

function formatTime(
  value: string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString();
}

export default function DeviceSecurityPanel() {
  const router =
    useRouter();

  const [
    data,
    setData,
  ] =
    useState<
      DeviceSecurityResponse |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    revokingId,
    setRevokingId,
  ] =
    useState<
      string |
      null
    >(null);

  const load =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/account/device-security",
              {
                cache:
                  "no-store",
              }
            );

          if (!response.ok) {
            if (
              response.status ===
                401
            ) {
              router.replace(
                "/login?error=device_replaced"
              );

              return;
            }

            throw new Error(
              "DEVICE_SECURITY_LOAD_FAILED"
            );
          }

          const body =
            await response
              .json() as
              DeviceSecurityResponse;

          setData(
            body
          );

          setError("");

          if (
            body
              .notifications
              .length >
            0
          ) {
            void fetch(
              "/api/account/device-security",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    action:
                      "ack_notifications",

                    notificationIds:
                      body
                        .notifications
                        .map(
                          notice =>
                            notice.id
                        ),
                  }),
              }
            );
          }
        } catch {
          setError(
            "Device security is temporarily unavailable."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        router,
      ]
    );

  useEffect(
    () => {
      const initialLoad =
        window.setTimeout(
          () => {
            void load();
          },
          0
        );

      const interval =
        window.setInterval(
          () => {
            void load();
          },
          15000
        );

      return () => {
        window.clearTimeout(
          initialLoad
        );

        window.clearInterval(
          interval
        );
      };
    },
    [
      load,
    ]
  );

  async function revokeDevice(
    sessionId:
      string
  ) {
    setRevokingId(
      sessionId
    );

    try {
      const response =
        await fetch(
          "/api/account/device-security",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "revoke_device",

                sessionId,
              }),
          }
        );

      if (!response.ok) {
        throw new Error(
          "DEVICE_REVOKE_FAILED"
        );
      }

      await load();
    } catch {
      setError(
        "Unable to sign out that device."
      );
    } finally {
      setRevokingId(
        null
      );
    }
  }

  const notices =
    data
      ?.notifications ??
    [];

  return (
    <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium tracking-[0.16em] text-violet-300">
            SECURITY
          </div>

          <h2 className="mt-2 text-xl font-semibold">
            Active devices
          </h2>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
            Your individual AYZO account can be active on up to two devices at the same time. Signing in on a third device automatically signs out the oldest active device.
          </p>
        </div>

        <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1 text-xs text-zinc-500">
          {data
            ? `${data.devices.length}/${data.maxActiveDevices}`
            : "—/2"}
        </div>
      </div>

      {notices.length >
        0 && (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
        >
          <div className="text-sm font-medium text-amber-200">
            New device sign-in
          </div>

          <p className="mt-2 text-xs leading-5 text-amber-100/70">
            Your AYZO account was opened on{" "}
            {
              notices[0]
                ?.actor_device_label
            }
            .
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-5 text-xs text-rose-300"
        >
          {error}
        </p>
      )}

      {loading &&
      !data ? (
        <div className="mt-5 text-xs text-zinc-600">
          Loading active devices...
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {data?.devices.map(
            device => {
              const isCurrent =
                device.id ===
                data.currentSessionId;

              return (
                <div
                  key={
                    device.id
                  }
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-900 bg-black/30 p-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium text-zinc-200">
                        {
                          device
                            .device_label
                        }
                      </div>

                      {isCurrent && (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-emerald-300">
                          This device
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-[10px] leading-5 text-zinc-600">
                      Last active:{" "}
                      {
                        formatTime(
                          device
                            .last_seen_at
                        )
                      }
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      disabled={
                        revokingId ===
                        device.id
                      }
                      onClick={
                        () =>
                          void revokeDevice(
                            device.id
                          )
                      }
                      className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {revokingId ===
                      device.id
                        ? "Signing out..."
                        : "Sign out device"}
                    </button>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}

      <p className="mt-4 text-[10px] leading-5 text-zinc-600">
        IP addresses are used only as hashed security signals and are not used as device identities.
      </p>
    </section>
  );
}
