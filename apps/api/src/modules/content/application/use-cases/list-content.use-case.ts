import { TransactionRunner } from '@shared/ports/transaction-runner.port';

import {
  ListContentCommand,
  ListContentResult,
  ListContentUseCase as ListContentPort,
} from '../ports/in/list-content.port';
import {
  ContentRepository,
  ContentSearchCriteria,
} from '../ports/out/content-repository.port';
import { toContentListItem } from './content-mappers';

export class ListContentUseCase implements ListContentPort {
  constructor(
    private readonly contents: ContentRepository,
    private readonly tx: TransactionRunner,
  ) {}

  async execute(command: ListContentCommand): Promise<ListContentResult> {
    return this.tx.run(async () => {
      const criteria: ContentSearchCriteria = {
        status: command.status,
        type: command.type,
        authorId: command.actorRole === 'author' ? command.actorId : command.authorId,
        tag: command.tag,
        titleSearch: command.titleSearch,
        dateFrom: command.dateFrom,
        dateTo: command.dateTo,
        page: command.page === undefined || command.page < 1 ? 1 : command.page,
        pageSize:
          command.pageSize === undefined ? 25 : Math.min(command.pageSize, 100),
      };

      const result = await this.contents.findMany(criteria);

      return {
        items: result.items.map(toContentListItem),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    });
  }
}
