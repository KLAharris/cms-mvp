import { PagedResult } from '../../../../../shared/kernel/paged-result';

import { MediaItemDto } from '../../dto';

export interface ListMediaQuery {
  search?: string;
  uploadedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
  requestedBy: string;
}

export interface ListMediaUseCase {
  execute(query: ListMediaQuery): Promise<PagedResult<MediaItemDto>>;
}
