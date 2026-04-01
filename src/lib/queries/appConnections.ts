import prisma from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export interface AppConnectionData {
  id: number;
  userId: number;
  pluginType: string;
  name: string;
  icon: string | null;
  customIconSvg: string | null;
  color: string;
  url: string | null;
  config: string | null; // decrypted JSON
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all AppConnections for a user, with config decrypted.
 */
export async function getAppConnections(userId: number): Promise<AppConnectionData[]> {
  const connections = await prisma.appConnection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });

  return connections.map((c) => ({
    ...c,
    config: c.config ? decrypt(c.config) : null,
  }));
}

/**
 * Get a single AppConnection with ownership check, config decrypted.
 */
export async function getAppConnection(id: number, userId: number): Promise<AppConnectionData | null> {
  const connection = await prisma.appConnection.findUnique({
    where: { id },
  });

  if (!connection || connection.userId !== userId) return null;

  return {
    ...connection,
    config: connection.config ? decrypt(connection.config) : null,
  };
}

/**
 * Find an existing connection for a specific plugin type for a user, config decrypted.
 */
export async function getAppConnectionByType(pluginType: string, userId: number): Promise<AppConnectionData | null> {
  const connection = await prisma.appConnection.findFirst({
    where: { pluginType, userId },
  });

  if (!connection) return null;

  return {
    ...connection,
    config: connection.config ? decrypt(connection.config) : null,
  };
}
