export class AdminRequestOtpDto {
  /**
   * Admin email address
   * @example "admin@example.com"
   * @format email
   * @maxLength 320
   */
  email!: string;
}

export class AdminVerifyOtpDto {
  /**
   * Admin email address
   * @example "admin@example.com"
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

export class AdminOtpResponseDto {
  message!: string;
}

export class AdminVerifyOtpSuccessDto {
  message!: string;
  success!: boolean;
  sessionToken!: string;
  adminUser!: {
    id: string;
    email: string;
    name: string | null;
  };
}

export class AdminSessionResponseDto {
  authenticated!: boolean;
  adminUser!: {
    id: string;
    email: string;
    name: string | null;
  };
  session!: {
    expiresAt: Date;
  };
}
