import bcrypt from "bcrypt";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";

export type RegisterUserInput = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  mobileNumber: string;
};

export async function registerUser(input: RegisterUserInput) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const normalizedFirstName = input.firstName.trim();
  const normalizedLastName = input.lastName.trim();
  const normalizedMobile = input.mobileNumber.replace(/\D/g, "");
  const id = input.id ?? crypto.randomUUID();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser && existingUser.id !== id) {
    throw new Error("An account with this email already exists.");
  }

  const hashedPassword = input.password
    ? await bcrypt.hash(input.password, 10)
    : "";

  return prisma.$transaction(async (tx) => {
    const existingDbUser = await tx.user.findUnique({
      where: { id },
    });

    const userCode = existingDbUser?.userCode ?? nanoid(8);

    const user = await tx.user.upsert({
      where: { id },
      create: {
        id,
        email: normalizedEmail,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        mobileNumber: normalizedMobile,
        password: hashedPassword,
        userCode,
        role: "CUSTOMER",
        emailVerified: false,
      },
      update: {
        email: normalizedEmail,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        mobileNumber: normalizedMobile,
        password: hashedPassword || existingDbUser?.password || "",
      },
    });

    const existingCustomer = await tx.customer.findUnique({
      where: { userId: id },
    });

    const customerCode = existingCustomer?.customerCode ?? nanoid(8);

    const customer = existingCustomer
      ? await tx.customer.update({
          where: { id: existingCustomer.id },
          data: {
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
            email: normalizedEmail,
            mobileNumber: normalizedMobile,
            isActive: true,
          },
        })
      : await tx.customer.create({
          data: {
            userId: id,
            firstName: normalizedFirstName,
            lastName: normalizedLastName,
            email: normalizedEmail,
            customerCode,
            mobileNumber: normalizedMobile,
            customerType: "CASUAL",
            loyaltyCards: {
              create: {
                stars: 0,
                status: "ACTIVE",
              },
            },
          },
        });

    return { user, customer };
  });
}
