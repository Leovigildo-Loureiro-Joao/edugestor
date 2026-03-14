import React from 'react';

function getInitials(input?: string | null): string {
  const value = (input || '').trim();
  if (!value) return 'U';

  const parts = value.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]) || '';
  const initials = (first + last).toUpperCase();
  return initials || 'U';
}

type AvatarProps = {
  name?: string | null;
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
};

export default function Avatar({
  name,
  src,
  alt,
  size = 64,
  className = '',
  imgClassName = '',
  fallbackClassName = '',
}: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const safeSrc = (src || '').trim() || null;
  const initials = getInitials(name);

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label={alt || name || 'Avatar'}
    >
      {safeSrc && !failed ? (
        <img
          src={safeSrc}
          alt={alt || name || 'Avatar'}
          className={`w-full h-full object-cover ${imgClassName}`}
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className={`w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ${fallbackClassName}`}
          style={{ fontSize: Math.max(12, Math.round(size * 0.38)) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

