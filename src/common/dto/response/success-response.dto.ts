import { ResponseStatus } from '../../enums';
import { MessageResponseDto } from './message-response.dto';

export class SuccessResponseDto extends MessageResponseDto {
  constructor(message: string) {
    super(ResponseStatus.SUCCESS, message);
  }
}
