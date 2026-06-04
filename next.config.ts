import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  // La versión de la app sale de `package.json` (que semantic-release bumpea y
  // commitea en cada release). Se expone como `NEXT_PUBLIC_APP_VERSION` para
  // que la UI muestre `vX.Y.Z` tanto en dev como en el deploy. `amplify.yml`
  // la exporta también de forma redundante; aquí garantizamos que dev también
  // vea la versión correcta sin configurar nada.
  env: {
    NEXT_PUBLIC_APP_VERSION:
      process.env.NEXT_PUBLIC_APP_VERSION ?? pkg.version,
  },
};

export default nextConfig;
