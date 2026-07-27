const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: raíz explícita para que Turbopack no tenga que inferirla.
  // Nota: esto NO fue lo que arregló el panic "Next.js package not found" de
  // 2026-07-27 en /dishes — aquello era un node_modules dañado (un `npm i`
  // accidental fuera de sitio) más la caché incremental de dev envenenada.
  // El remedio real fue `npm ci` en la raíz + borrar apps/web/.next. Se
  // mantiene el root explícito porque es lo recomendado en monorepos.
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

module.exports = nextConfig;
