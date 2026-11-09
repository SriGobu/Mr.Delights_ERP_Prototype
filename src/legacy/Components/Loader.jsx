/**
 * Branded animated loader used across the app.
 */
function Loader({ label = "Loading…", className = "", size = 40 }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="relative" style={{ width: size, height: size }} aria-hidden="true">
        {/* outer track */}
        <div className="absolute inset-0 rounded-full" style={{ border: "3px solid #ece6da" }} />
        {/* spinning gold arc */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: "3px solid transparent",
            borderTopColor: "#d4af37",
            borderRightColor: "#3d7a4f",
            animationDuration: "0.85s",
          }}
        />
        {/* inner pulsing dot */}
        <div
          className="absolute rounded-full animate-ping"
          style={{
            inset: size * 0.32,
            background: "#3d7a4f",
            opacity: 0.5,
            animationDuration: "1.4s",
          }}
        />
      </div>

      {label && (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium tracking-wide" style={{ color: "#7a7060" }}>
            {label}
          </span>
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-1 w-1 rounded-full animate-bounce"
                style={{
                  background: "#d4af37",
                  animationDelay: `${i * 140}ms`,
                  animationDuration: "0.9s",
                }}
              />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

export default Loader;
