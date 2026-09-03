import { useState } from 'react';
import { Star } from 'lucide-react';

/**
 * Interactive when onChange is provided; otherwise renders read-only.
 */
export default function StarRating({ value = 0, onChange, size = 20 }) {
  const [hovered, setHovered] = useState(0);
  const isInteractive = !!onChange;
  const displayValue = hovered || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!isInteractive}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => isInteractive && setHovered(star)}
          onMouseLeave={() => isInteractive && setHovered(0)}
          className={isInteractive ? 'cursor-pointer' : 'cursor-default'}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
        >
          <Star
            size={size}
            className={star <= displayValue ? 'fill-amber-alert-500 text-amber-alert-500' : 'text-mist-300'}
          />
        </button>
      ))}
    </div>
  );
}
