// src/components/ui/ShareButtons.tsx
import React from 'react';
import { Button } from './Button';
import { Share2 } from 'lucide-react';

interface ShareButtonsProps {
  url: string;
  title?: string;
  description?: string;
  hashtags?: string[];       // ex.: ['eventos', 'geslogic']
  twitterHandle?: string;    // sem @
  ctaText?: string;          // texto do botão, ex.: 'Partilhar'
  className?: string;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({
  url,
  title = '',
  description = '',
  hashtags = [],
  twitterHandle = '',
  ctaText = 'Partilhar',
  className,
}) => {
  const shareText = description || title || '';
  const tags = hashtags.join(',');

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url });
      } catch {
        // ignorar cancel
      }
    }
  };

  const openPopup = (shareUrl: string) => {
    const w = 640;
    const h = 480;
    const y = window.top?.outerHeight ? Math.max(0, (window.top.outerHeight - h) / 2) : 0;
    const x = window.top?.outerWidth ? Math.max(0, (window.top.outerWidth - w) / 2) : 0;
    window.open(shareUrl, '_blank', `toolbar=0,status=0,width=${w},height=${h},top=${y},left=${x}`);
  };

  const shareFacebook = () => openPopup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
  const shareLinkedIn = () => openPopup(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
  const shareTwitter = () => {
    const t = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title || '')}`
      + (twitterHandle ? `&via=${encodeURIComponent(twitterHandle)}` : '')
      + (tags ? `&hashtags=${encodeURIComponent(tags)}` : '');
    openPopup(t);
  };
  const shareWhatsApp = () => openPopup(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${title ? title + ' ' : ''}${url}`)}`);
  const shareTelegram = () => openPopup(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title || '')}`);

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {canNativeShare ? (
          <Button onClick={handleNativeShare}>
            <Share2 className="h-4 w-4 mr-2" /> {ctaText}
          </Button>
        ) : (
          <>
            <Button onClick={shareFacebook} variant="outline">Facebook</Button>
            <Button onClick={shareLinkedIn} variant="outline">LinkedIn</Button>
            <Button onClick={shareTwitter} variant="outline">X / Twitter</Button>
            <Button onClick={shareWhatsApp} variant="outline">WhatsApp</Button>
            <Button onClick={shareTelegram} variant="outline">Telegram</Button>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Dica: para melhor aparência nos cartões sociais, use imagem 1200×630 em <strong>Configurações &gt; SEO / Social</strong>.
      </p>
    </div>
  );
};

export default ShareButtons;