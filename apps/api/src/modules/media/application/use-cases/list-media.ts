import { PagedResult } from '../../../../shared/kernel/paged-result';

import { MediaItemDto, toMediaItemDto } from '../dto';
import {
  ListMediaQuery,
  ListMediaUseCase as ListMediaPort,
} from '../ports/in';
import { FindMediaQuery, MediaRepository } from '../ports/out';

export class ListMediaUseCase implements ListMediaPort {
  constructor(private readonly media: MediaRepository) {}

  async execute(query: ListMediaQuery): Promise<PagedResult<MediaItemDto>> {
    const criteria: FindMediaQuery = {
      search: query.search,
      uploadedBy: query.uploadedBy,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page === undefined || query.page < 1 ? 1 : query.page,
      pageSize: query.pageSize === undefined ? 20 : query.pageSize,
    };

    const result = await this.media.findAll(criteria);

    return {
      items: result.items.map(toMediaItemDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }
}
