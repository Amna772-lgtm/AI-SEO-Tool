"use client";

export default function LockedFeature({
  title,
  plan = "Pro",
}: {
  title: string;
  plan?: "Pro" | "Agency";
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-lg border p-10 w-full max-w-lg mx-auto"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Lock icon */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="3"
          y="11"
          width="18"
          height="11"
          rx="2"
          stroke="var(--warning)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M7 11V7a5 5 0 0 1 10 0v4"
          stroke="var(--warning)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="12" cy="16" r="1.5" fill="var(--warning)" />
      </svg>

      <p
        className="text-sm font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        {title}
      </p>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        Available on {plan} plan
      </p>
      <button
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("quota:exceeded", {
              detail: { plan: plan === "Agency" ? "pro" : "free", limit: 1 },
            })
          )
        }
        className="rounded px-4 py-1.5 text-xs font-semibold text-white"
        style={{ background: "var(--accent)" }}
      >
        Upgrade to {plan}
      </button>
    </div>
  );
}
