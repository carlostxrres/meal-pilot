-- Nota opcional de un plato: preparación, momento ideal para tomarlo, etc.
-- Visible y editable en el creador/editor de platos (ver ADR-0018 para el
-- resto del modelo de dish).
alter table dish add column description text;
