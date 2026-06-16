// frontend/src/features/correspondence/hooks/useInboxFiles.ts


import { useQuery } from '@tanstack/react-query';
import { fetchFilesByOwnerPurpose } from '../../../services/api';
import { FilePurpose } from '../../../types/file';

export function useInboxFiles(registryId: string) {
  return useQuery({
    queryKey: [
      'files',
      'CorrespondenceRegistry',
      registryId,
      FilePurpose.CORRESPONDENCE_INBOX,
    ],
    queryFn: () =>
      fetchFilesByOwnerPurpose(
        'CorrespondenceRegistry',
        registryId,
        FilePurpose.CORRESPONDENCE_INBOX,
      ),
    enabled: !!registryId,
  });
}
