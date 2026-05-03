import { Prisma } from "@prisma/client";

export const decimalToNumber = (value: Prisma.Decimal | number | string): number =>
  Number(new Prisma.Decimal(value).toString());

export const numberToDecimal = (value: number): Prisma.Decimal => new Prisma.Decimal(value);