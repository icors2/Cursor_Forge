/**
 * Auth request DTOs. Validated at the HTTP boundary.
 */

import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

/** POST /auth/login body. */
export class LoginDto {
  /** Account email. */
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /** Plain password; never logged. */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
