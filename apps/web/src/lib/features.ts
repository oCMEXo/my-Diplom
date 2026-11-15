import { useQuery } from "@tanstack/react-query";
import type { Features, RunMode } from "@collab/shared";
import { api } from "./api";

export function useFeatures(): Features | undefined {
  const { data } = useQuery({
    queryKey: ["features"],
    queryFn: () => api.get<Features>("/features"),
    staleTime: 5 * 60_000,
  });
  return data;
}

/** Whether this server runs code (and the terminal): for everyone, after an access code, or not at all. */
export function useRunMode(): RunMode | undefined {
  return useFeatures()?.run;
}
