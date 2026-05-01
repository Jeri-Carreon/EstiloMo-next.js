// TEMP mock DB (replace with Prisma later)

type User = {
  id: string;
  email: string;
  password: string;
  role: string;
};

const users: User[] = [];

export const db = {
  user: {
    async findUnique({ where }: any) {
      return users.find(u => u.email === where.email);
    },
    async create({ data }: any) {
      const newUser = { id: crypto.randomUUID(), ...data };
      users.push(newUser);
      return newUser;
    }
  }
};