import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchDishAuthoringContext, fetchDishCatalog, RequestCache } from "@meal-pilot/core";
import { createClient } from "@/lib/supabase/server";
import { DishCatalogCard } from "@/components/DishCatalogCard";

/** Vista de un único plato — solo para poder enlazarlo vía URL, ver /dishes para el catálogo completo. */
export default async function DishPage({ params }: { params: Promise<{ dishId: string }> }) {
  const { dishId } = await params;
  const supabase = await createClient();
  const cache = new RequestCache();
  const [dishes, authoring] = await Promise.all([
    fetchDishCatalog(supabase, cache),
    fetchDishAuthoringContext(supabase, cache),
  ]);

  const entry = dishes.find((d) => d.dish.id === dishId);
  if (!entry) notFound();

  return (
    <div>
      <Link href="/dishes" className="back-link">
        <IconArrowLeft size={16} stroke={1.75} /> Volver
      </Link>
      <DishCatalogCard
        entry={entry}
        dishes={dishes}
        ingredients={authoring.ingredients}
        meals={authoring.meals}
        mealRequirements={authoring.mealRequirements}
      />
    </div>
  );
}
