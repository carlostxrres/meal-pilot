import { Fragment, type ReactNode } from "react";

/*
Sección con encabezado (icono + título + contador), estado vacío y listado,
compartida por Platos, Inventario e Ingredientes. Inventario la usa dos
veces (En stock/Agotado); el resto, una sola.
*/
export function CatalogSection<T>({
  icon,
  title,
  items,
  emptyMessage,
  getKey,
  renderItem,
}: {
  icon: ReactNode;
  title: string;
  items: T[];
  emptyMessage: string;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <>
      <h2 className="section-title">
        {icon} {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="inventory-empty">{emptyMessage}</p>
      ) : (
        items.map((item) => <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>)
      )}
    </>
  );
}
