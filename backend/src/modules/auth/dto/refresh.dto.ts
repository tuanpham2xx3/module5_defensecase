import { IsString, Length } from 'class-validator';

export class RefreshDto {
  @IsString()
  @Length(32, 200)
  refreshToken!: string;
}
