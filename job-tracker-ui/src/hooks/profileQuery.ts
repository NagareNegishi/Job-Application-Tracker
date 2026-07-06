import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, createProfile, patchProfile } from "@/services/profileService";
import type { UserProfile, ProfilePatch } from "@/types/profile";

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: getProfile });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: UserProfile) => createProfile(profile),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function usePatchProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => patchProfile(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}
