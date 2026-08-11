// src/components/WhatsAppButton.jsx
import React from 'react';

const WhatsAppButton = () => {
  // Reemplazar TUNUMERO con el número real de WhatsApp (código de país sin +, sin espacios)
  const whatsappNumber = '5491100000000';
  const message = encodeURIComponent('Hola, necesito soporte con AutoCheck 360');

  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      id="whatsapp-btn"
      aria-label="Chat por WhatsApp"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 animate-bounce-subtle"
      style={{ animationDuration: '3s' }}
    >
      {/* WhatsApp SVG Icon */}
      <svg viewBox="0 0 32 32" className="w-7 h-7 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.004 0C7.176 0 0 7.176 0 16.004c0 2.823.737 5.58 2.137 8.008L.073 32l8.19-2.147A15.94 15.94 0 0016.004 32C24.828 32 32 24.828 32 16.004S24.828 0 16.004 0zm0 29.326a13.28 13.28 0 01-7.14-2.073l-.512-.305-5.306 1.392 1.416-5.17-.334-.532a13.22 13.22 0 01-2.03-7.06c0-7.348 5.98-13.328 13.328-13.328 3.56 0 6.908 1.387 9.424 3.904a13.24 13.24 0 013.904 9.424c0 7.348-5.98 13.748-13.75 13.748zm7.308-9.986c-.4-.2-2.368-1.168-2.736-1.302-.368-.133-.636-.2-.904.2-.268.4-1.036 1.302-1.27 1.57-.234.268-.468.3-.868.1-.4-.2-1.688-.622-3.216-1.984-1.188-1.06-1.99-2.37-2.224-2.77-.234-.4-.025-.616.176-.816.18-.18.4-.468.6-.702.2-.234.268-.4.4-.668.134-.268.068-.502-.032-.702-.1-.2-.904-2.18-1.238-2.986-.326-.784-.658-.678-.904-.69-.234-.012-.502-.014-.77-.014s-.702.1-1.07.502c-.368.4-1.404 1.37-1.404 3.342 0 1.972 1.436 3.878 1.636 4.146.2.268 2.826 4.316 6.852 6.052.958.414 1.706.66 2.288.846.962.306 1.836.262 2.528.16.772-.116 2.368-.968 2.702-1.904.334-.936.334-1.738.234-1.904-.1-.168-.368-.268-.77-.468z"/>
      </svg>
    </a>
  );
};

export default WhatsAppButton;
