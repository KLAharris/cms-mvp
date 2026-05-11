import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodType, ZodTypeDef } from 'zod';

type MetadataWithZodSchema = ArgumentMetadata & {
  metatype?: {
    zodSchema?: ZodType<unknown, ZodTypeDef, unknown>;
  };
};

@Injectable()
export class ValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: MetadataWithZodSchema): unknown {
    const schema = metadata.metatype?.zodSchema;

    if (!schema) {
      return value;
    }

    const result = schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues,
      });
    }

    return result.data;
  }
}
