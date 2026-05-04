import { Prisma } from "@prisma/client";
export const decimalToNumber = (value) => Number(new Prisma.Decimal(value).toString());
export const numberToDecimal = (value) => new Prisma.Decimal(value);
