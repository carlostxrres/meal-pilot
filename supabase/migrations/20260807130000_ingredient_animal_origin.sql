-- Nueva propiedad de ingredient: si es producto animal, derivado de animal
-- (huevo, lácteos, miel — vienen de un animal vivo), o vegetal. Sirve de
-- base para computar si un plato es vegano/vegetariano/no (ver
-- packages/core/src/engine/dietType.ts).
create type animal_origin as enum ('animal', 'animal_derived', 'plant');

alter table ingredient add column animal_origin animal_origin not null default 'plant';

-- Poblar las filas existentes (criterio manual, mismo patrón que
-- price_eur_per_100/max_quantity_per_dish): productos de origen animal
-- directo (carne, pescado, marisco).
update ingredient set animal_origin = 'animal' where id in (
  'e0000000-0000-0000-0000-000000000081', -- Anchoas o boquerones en vinagre
  'e0000000-0000-0000-0000-000000000018', -- Atún enlatado
  'e0000000-0000-0000-0000-000000000077', -- Caballa en lata
  'e0000000-0000-0000-0000-000000000021', -- Jamon cocido en tiras
  'e0000000-0000-0000-0000-000000000079', -- Jamon serrano en lonchas
  'e0000000-0000-0000-0000-000000000080', -- Lomo embuchado en lonchas
  'e0000000-0000-0000-0000-000000000050', -- Lonchas de pavo
  'e0000000-0000-0000-0000-000000000049', -- Lonchas de pollo
  'e0000000-0000-0000-0000-000000000078', -- Mejillones en lata
  'e0000000-0000-0000-0000-000000000022', -- Pavo en tiras
  'e0000000-0000-0000-0000-000000000017', -- Salmon en lata
  'e0000000-0000-0000-0000-000000000031', -- Sardinas en lata
  'e0000000-0000-0000-0000-000000000030', -- Surimi
  'e0000000-0000-0000-0000-000000000019'  -- Tiras de pollo (cocidas)
);

-- Derivados de animal (huevo, lácteos, miel): no implican sacrificio, pero
-- excluyen "vegano" y son compatibles con "vegetariano".
update ingredient set animal_origin = 'animal_derived' where id in (
  'e0000000-0000-0000-0000-000000000020', -- Huevo cocido
  'e0000000-0000-0000-0000-000000000054', -- Leche
  'e0000000-0000-0000-0000-000000000051', -- Lonchas de queso
  'e0000000-0000-0000-0000-000000000046', -- Mayonesa (contiene huevo)
  'e0000000-0000-0000-0000-000000000044', -- Pesto (contiene parmesano)
  'e0000000-0000-0000-0000-000000000056', -- Queso crema
  'e0000000-0000-0000-0000-000000000040', -- Queso en piezas (feta, mozzarella, parmesano)
  'e0000000-0000-0000-0000-000000000023', -- Queso fresco (tipo Burgos)
  'e0000000-0000-0000-0000-000000000059', -- Proteina en polvo (whey, asumido por defecto)
  'e0000000-0000-0000-0000-000000000043', -- Vinagreta preparada (mostaza y miel, balsamica...)
  '0c0db3c3-4ec2-4e38-84e1-4756f3c51880'  -- Yogur griego
);

-- El resto (default ya aplicado por el ALTER TABLE) queda como 'plant': todas
-- las frutas/verduras/legumbres/cereales/frutos secos y suplementos sin
-- indicio de origen animal (Poción Ricardo, Probiótico, Pastillas para el
-- pelo, Bebida isotónica) — estos últimos no entran hoy en ResolvedDish
-- .components, así que su clasificación no afecta a ningún plato.

alter table ingredient alter column animal_origin drop default;
