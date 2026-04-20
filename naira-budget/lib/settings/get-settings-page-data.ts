import { prisma } from "@/lib/prisma";

export interface SettingsPageData {
  email: string;
  userId: string;
  isOnboarded: boolean;
  settingsCreatedAt: Date | null;
}

export async function getSettingsPageData(userId: string, email: string): Promise<SettingsPageData> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { isOnboarded: true, createdAt: true },
  });

  return {
    email,
    userId,
    isOnboarded: settings?.isOnboarded ?? false,
    settingsCreatedAt: settings?.createdAt ?? null,
  };
}
