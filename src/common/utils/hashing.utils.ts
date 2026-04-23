import * as argon2 from 'argon2';

export async function hashPassword(str: string): Promise<string> {
  return await argon2.hash(str, {
    secret: Buffer.from(process.env.HASH_SECRET!),
  });
}

export async function compareHash(
  hash: string,
  plain: string,
): Promise<boolean> {
  return await argon2.verify(hash, plain, {
    secret: Buffer.from(process.env.HASH_SECRET!),
  });
}
