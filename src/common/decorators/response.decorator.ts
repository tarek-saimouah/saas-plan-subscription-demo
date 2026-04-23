import { Type, applyDecorators } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  DataArrayResponse,
  DataResponse,
  PagingDataResponse,
  PagingMeta,
} from '../dto';

export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(model, PagingMeta, PagingDataResponse),
    ApiOkResponse({
      schema: {
        title: `PaginatedResponseOf${model.name}`,
        allOf: [
          { $ref: getSchemaPath(PagingDataResponse) },
          {
            properties: {
              status: {
                type: 'string',
              },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                $ref: getSchemaPath(PagingMeta),
              },
            },
          },
        ],
      },
    }),
  );
};

export const ApiDataResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(model, DataResponse),
    ApiOkResponse({
      schema: {
        title: `ResponseOf${model.name}`,
        allOf: [
          { $ref: getSchemaPath(DataResponse) },
          {
            properties: {
              status: {
                type: 'string',
              },
              data: {
                type: 'object',
                $ref: getSchemaPath(model),
              },
            },
          },
        ],
      },
    }),
  );
};

export const ApiCreatedDataResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(model, DataResponse),
    ApiCreatedResponse({
      schema: {
        title: `ResponseOf${model.name}`,
        allOf: [
          { $ref: getSchemaPath(DataResponse) },
          {
            properties: {
              status: {
                type: 'string',
              },
              data: {
                type: 'object',
                $ref: getSchemaPath(model),
              },
            },
          },
        ],
      },
    }),
  );
};

export const ApiDataArrayResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(model, DataArrayResponse),
    ApiOkResponse({
      schema: {
        title: `ResponseOf${model.name}`,
        allOf: [
          { $ref: getSchemaPath(DataArrayResponse) },
          {
            properties: {
              status: {
                type: 'string',
              },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              totalResults: {
                type: 'number',
              },
            },
          },
        ],
      },
    }),
  );
};

export const ApiCreatedDataArrayResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(model, DataArrayResponse),
    ApiCreatedResponse({
      schema: {
        title: `ResponseOf${model.name}`,
        allOf: [
          { $ref: getSchemaPath(DataArrayResponse) },
          {
            properties: {
              status: {
                type: 'string',
              },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              totalResults: {
                type: 'number',
              },
            },
          },
        ],
      },
    }),
  );
};
