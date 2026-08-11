/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1E40AF',   // Dominante (Navegación/Cabeceras)
          gray: '#F3F4F6',   // Fondos y tarjetas
          grayDark: '#374151', // Texto principal
          green: '#84CC16',  // Verde manzana (Éxito/Checkmarks)
          orange: '#F97316', // Naranja (Alertas/Observaciones)
        }
      }
    },
  },
  plugins: [],
}