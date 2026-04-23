import { PaginationParams, PagingMeta } from '../dto';

export const getPaginationMeta = (
  total: number,
  defaultOptions?: PaginationParams,
): PagingMeta => {
  const page = Number(defaultOptions?.page) || 1;
  const perPage = Number(defaultOptions?.perPage) || 10;
  const lastPage = Math.ceil(total / perPage);

  return {
    total,
    lastPage,
    currentPage: page,
    perPage,
    prev: page > 1 ? page - 1 : null,
    next: page < lastPage ? page + 1 : null,
  };
};

export const getPaginationArgs = (
  args?: PaginationParams,
): { take: number; skip: number } => {
  const { page, perPage } = args || {};

  const currentPage = page || 1;
  const limit = perPage || perPage === 0 ? perPage : 10;

  return {
    take: limit,
    skip: (currentPage - 1) * limit,
  };
};
