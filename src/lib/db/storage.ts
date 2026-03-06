export const STORAGE_DRIVER = "sqlite" as const;
export const ORM_DRIVER = "drizzle" as const;

export type StorageSelection = {
  database: typeof STORAGE_DRIVER;
  orm: typeof ORM_DRIVER;
  filePath: string;
  rationale: string;
};

export const storageSelection: StorageSelection = {
  database: STORAGE_DRIVER,
  orm: ORM_DRIVER,
  filePath: "./data/shams-e.sqlite",
  rationale:
    "sqlite + drizzle offers fast local setup, deterministic demos, and lightweight deployment for MVP.",
};
