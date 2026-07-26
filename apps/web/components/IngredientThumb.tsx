"use client";

import { IconPhoto } from "@tabler/icons-react";
import { useState } from "react";
import { ingredientImageUrl } from "@/lib/ingredientImage";

export function IngredientThumb({ ingredientId }: { ingredientId: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="ingredient-thumb ingredient-thumb-placeholder">
        <IconPhoto size={18} stroke={1.5} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ingredientImageUrl(ingredientId)}
      alt=""
      className="ingredient-thumb"
      onError={() => setFailed(true)}
    />
  );
}
