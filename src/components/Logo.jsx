// src/components/Logo.jsx
import React, { useEffect, useState } from 'react';
import defaultLogoImg from '../assets/img/logocompleto.jpeg';

const Logo = ({ className = "h-10 w-auto", alt = "AutoCheck 360" }) => {
  const [transparentLogoUrl, setTransparentLogoUrl] = useState(null);

  useEffect(() => {
    // Procesar la imagen en canvas para eliminar todo fondo negro o muy oscuro (RGB < 45)
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = defaultLogoImg;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Iterar los píxeles y hacer transparentes los oscuros/negros
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Si el píxel es negro o casi negro (R, G, B muy bajos)
          if (r < 50 && g < 50 && b < 50) {
            data[i + 3] = 0; // Transparente
          }
        }

        ctx.putImageData(imgData, 0, 0);
        setTransparentLogoUrl(canvas.toDataURL('image/png'));
      } catch (e) {
        console.warn("No se pudo remover fondo por canvas, usando imagen original:", e);
      }
    };
  }, []);

  if (transparentLogoUrl) {
    return (
      <img
        src={transparentLogoUrl}
        alt={alt}
        className={`${className} object-contain transition-all duration-300`}
      />
    );
  }

  // Fallback con SVG vectorial si no se ha cargado el canvas aún
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg className="h-8 w-8 text-brand-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    </div>
  );
};

export default Logo;
