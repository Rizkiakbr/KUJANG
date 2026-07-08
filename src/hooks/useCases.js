import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCases, getCaseById, createCase, updateCase, deleteCase } from '../services/caseService';
import { useAuthStore } from '../store/authStore';

/** Query keys */
export const QUERY_KEYS = {
  cases:  (filters) => ['cases', filters],
  case:   (id)      => ['case', id],
};

/**
 * Ambil daftar kasus
 * @param {object} filters  - e.g. { penyuluhId: 'eka' }
 */
export function useGetCases(filters = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.cases(filters),
    queryFn:  () => getCases(filters),
    staleTime: 1000 * 60 * 2,  // 2 menit
  });
}

/**
 * Ambil satu kasus by ID
 */
export function useGetCaseById(id) {
  return useQuery({
    queryKey: QUERY_KEYS.case(id),
    queryFn:  () => getCaseById(id),
    enabled:  !!id,
  });
}

/**
 * Mutation: buat kasus baru
 */
export function useCreateCase() {
  const qc = useQueryClient();
  const { userData } = useAuthStore();

  return useMutation({
    mutationFn: (data) => createCase(data, userData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

/**
 * Mutation: update kasus
 */
export function useUpdateCase() {
  const qc = useQueryClient();
  const { userData } = useAuthStore();

  return useMutation({
    mutationFn: ({ id, data }) => updateCase(id, data, userData),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.case(id) });
    },
  });
}

/**
 * Mutation: hapus kasus
 */
export function useDeleteCase() {
  const qc = useQueryClient();
  const { userData } = useAuthStore();

  return useMutation({
    mutationFn: ({ id, caseData }) => deleteCase(id, caseData, userData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
