import { describe, it, expect } from 'vitest';
import {
  buildContentParams,
  type FilterState,
} from '../src/features/content/utils/content-filters';
import type { ContentType } from '../src/features/content/types/content.types';

const defaultFilters: FilterState = {
  status: null,
  mine: false,
  lastDays: null,
  title: '',
  page: 1,
};

describe('buildContentParams', () => {
  const type: ContentType = 'article';

  it('returns base params with type and page when all filters are default', () => {
    const params = buildContentParams(type, defaultFilters);
    expect(params).toEqual({ type: 'article', page: 1, pageSize: 20 });
  });

  it('maps status filter correctly to params', () => {
    const filters: FilterState = { ...defaultFilters, status: 'draft' };
    const params = buildContentParams(type, filters);
    expect(params.status).toBe('draft');
  });

  it('maps in_review status filter to params', () => {
    const filters: FilterState = { ...defaultFilters, status: 'in_review' };
    const params = buildContentParams(type, filters);
    expect(params.status).toBe('in_review');
  });

  it('maps published status filter to params', () => {
    const filters: FilterState = { ...defaultFilters, status: 'published' };
    const params = buildContentParams(type, filters);
    expect(params.status).toBe('published');
  });

  it('omits status from params when status is null (All filter)', () => {
    const filters: FilterState = { ...defaultFilters, status: null };
    const params = buildContentParams(type, filters);
    expect(params).not.toHaveProperty('status');
  });

  it('adds mine: true when mine filter is active', () => {
    const filters: FilterState = { ...defaultFilters, mine: true };
    const params = buildContentParams(type, filters);
    expect(params.mine).toBe(true);
  });

  it('omits mine from params when mine is false', () => {
    const filters: FilterState = { ...defaultFilters, mine: false };
    const params = buildContentParams(type, filters);
    expect(params).not.toHaveProperty('mine');
  });

  it('adds lastDays: 30 when Last 30 days filter is active', () => {
    const filters: FilterState = { ...defaultFilters, lastDays: 30 };
    const params = buildContentParams(type, filters);
    expect(params.lastDays).toBe(30);
  });

  it('omits lastDays from params when lastDays is null', () => {
    const filters: FilterState = { ...defaultFilters, lastDays: null };
    const params = buildContentParams(type, filters);
    expect(params).not.toHaveProperty('lastDays');
  });

  it('adds title search to params when title is non-empty', () => {
    const filters: FilterState = { ...defaultFilters, title: 'React hooks' };
    const params = buildContentParams(type, filters);
    expect(params.title).toBe('React hooks');
  });

  it('omits title from params when title is empty string', () => {
    const filters: FilterState = { ...defaultFilters, title: '' };
    const params = buildContentParams(type, filters);
    expect(params).not.toHaveProperty('title');
  });

  it('includes page number in params', () => {
    const filters: FilterState = { ...defaultFilters, page: 3 };
    const params = buildContentParams(type, filters);
    expect(params.page).toBe(3);
  });

  it('works for page type', () => {
    const params = buildContentParams('page', defaultFilters);
    expect(params.type).toBe('page');
  });

  it('combines multiple active filters', () => {
    const filters: FilterState = {
      status: 'draft',
      mine: true,
      lastDays: 30,
      title: 'test',
      page: 2,
    };
    const params = buildContentParams(type, filters);
    expect(params).toMatchObject({
      type: 'article',
      status: 'draft',
      mine: true,
      lastDays: 30,
      title: 'test',
      page: 2,
    });
  });
});
