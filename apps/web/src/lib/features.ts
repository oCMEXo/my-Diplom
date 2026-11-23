import { useQuery } from "@tanstack/react-query";
import type { Features, RunMode } from "@collab/shared";
import { runsService } from "../services/collaboration.service";

export function useFeatures(): Features | undefined {
  const { data } = useQuery({
    queryKey: ["features"],
    queryFn: () => runsService.features(),
    staleTime: 5 * 60_000,
  });
  return data;
}

export function useRunMode(): RunMode | undefined {
  return useFeatures()?.run;
}
