// src/components/ui/ImageSlideshow.tsx (VERSÃO COMPLETA)

import React from 'react';
import Slider from 'react-slick';

interface Image {
  id: string;
  url: string;
  displayName: string;
}

interface ImageSlideshowProps {
  images: Image[];
}

export const ImageSlideshow: React.FC<ImageSlideshowProps> = ({ images }) => {
  // Configurações para o slideshow
  const settings = {
    dots: true, // Mostra os pontos de navegação
    infinite: true, // Loop infinito
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    arrows: true, // Mostra as setas de navegação
  };
  
  if (!images || images.length === 0) {
    return null; // Não renderiza nada se não houver imagens
  }

  return (
    <div className="w-full">
      <Slider {...settings}>
        {images.map((image) => (
          <div key={image.id} className="relative aspect-video bg-gray-100">
            <img 
              src={image.url} 
              alt={image.displayName} 
              className="w-full h-full object-cover" 
            />
            {/* Opcional: Título da imagem sobreposto */}
            <div className="absolute bottom-0 left-0 p-4 bg-gradient-to-t from-black/60 to-transparent w-full">
              <p className="text-white font-semibold">{image.displayName}</p>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
};