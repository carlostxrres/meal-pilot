const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: sin esto, Turbopack infiere apps/web como raíz y no consigue
  // resolver el paquete `next` (hoisted en node_modules de la raíz) cuando un
  // componente cliente importa código en runtime de @meal-pilot/core — panic
  // "Next.js package not found" al compilar /dishes en dev.
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

module.exports = nextConfig;
