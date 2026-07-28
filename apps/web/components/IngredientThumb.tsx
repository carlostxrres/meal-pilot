"use client";

import { IconPhoto } from "@tabler/icons-react";
import Image from "next/image";
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
    <Image
      src={ingredientImageUrl(ingredientId)}
      alt=""
      width={40}
      height={40}
      className="ingredient-thumb"
      onError={() => setFailed(true)}
    />
  );
}
