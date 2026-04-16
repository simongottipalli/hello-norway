export class RequestOtpDto {
  /**
   * User email address
   * @example "user@example.com"
   * @format email
   * @maxLength 320
   */
  email!: string;
}

export class VerifyOtpDto {
  /**
   * User email address
   * @example "user@example.com"
   * @format email
   * @maxLength 320
   */
  email!: string;

  /**
   * 6-digit OTP code
   * @example 123456
   * @isInt
   * @minimum 100000
   * @maximum 999999
   */
  code!: number;
}

export class OtpResponseDto {
  message!: string;
}

export class VerifyOtpSuccessDto {
  message!: string;
  success!: boolean;
  sessionToken!: string;
  user!: {
    id: string;
    email: string;
    name: string | null;
  };
}
