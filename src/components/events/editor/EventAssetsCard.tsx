import * as React from 'react';
import { StandardCard } from '../../ui/StandardCard';
import { SingleFileUpload } from '../../ui/SingleFileUpload';
import { MultiFileUploadManager } from '../../ui/MultiFileUploadManager';
import { FilePurpose } from '../../../types/file';

export function EventAssetsCard({
  eventId,
  currentBannerUrl,
  onUpdateBanner, // chama updatePartial({ bannerFileId })
  existingDocs,
}: {
  eventId: string;
  currentBannerUrl?: string;
  onUpdateBanner: (bannerFileId: string | null) => void;
  existingDocs: any[];
}) {
  return (
    <div className="space-y-6">
      <StandardCard title="Banner do Evento">
        <SingleFileUpload
          ownerType="Event"
          ownerId={eventId}
          purpose={FilePurpose.EVENT_BANNER}
          currentFileUrl={currentBannerUrl}
          onUploadSuccess={(f) => onUpdateBanner(f.id)}
          onFileClear={() => onUpdateBanner(null)}
        />
      </StandardCard>

      <StandardCard title="Documentos do Evento">
        <MultiFileUploadManager
          ownerType="Event"
          ownerId={eventId}
          purpose={FilePurpose.EVENT_DOCUMENT}
          existingFiles={existingDocs || []}
          queryKeyToInvalidate={['event', eventId]}
        />
      </StandardCard>
    </div>
  );
}