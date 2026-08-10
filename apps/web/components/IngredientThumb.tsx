"use client";

import { IconPhoto } from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";
import { ingredientImageUrl } from "@/lib/ingredientImage";
import styles from "@/components/IngredientThumb.module.css";

export function IngredientThumb({
  ingredientId,
  small,
}: {
  ingredientId: string;
  /** Miniatura de 24px en vez de 40px — ver ContributionDialog. */
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const size = small ? "small" : undefined;

  if (failed) {
    return (
      <div className={`${styles['ingredient-thumb']} ${styles['ingredient-thumb-placeholder']}`} data-size={size}>
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
      className={styles['ingredient-thumb']}
      data-size={size}
      onError={() => setFailed(true)}
    />
  );
}
