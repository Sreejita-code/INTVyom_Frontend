import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  callListAssistantsEndpoint,
  condenseListAssistantsResponse,
} from "@/services/assistant/assistantService";
import { AssistantItem } from "@/types/assistant";
import { useToast } from "@/hooks/use-toast";

const LIMIT = 15;

/**
 * Paginated assistant list with infinite scroll and client-side name filtering.
 *
 * Attach `lastElementRef` to the final rendered row — it observes that row and
 * pulls the next page when it scrolls into view. `refresh` resets to page 1,
 * which is what create/delete should call after a successful mutation.
 */
export function useAssistantList(userId: string | undefined) {
  const { toast } = useToast();

  const [assistants, setAssistants] = useState<AssistantItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (listLoading || isLoadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [listLoading, isLoadingMore, hasMore],
  );

  const fetchList = useCallback(
    async (pageNum: number) => {
      if (!userId) {
        setListLoading(false);
        return;
      }

      if (pageNum === 1) setListLoading(true);
      else setIsLoadingMore(true);

      try {
        const { ok, json } = await callListAssistantsEndpoint({ userId, page: pageNum, limit: LIMIT });

        if (!ok) {
          const errMsg =
            (json as { error?: string; message?: string })?.error ||
            (json as { error?: string; message?: string })?.message ||
            "Failed to load assistants";
          toast({ variant: "destructive", title: "Error", description: errMsg });
          if (pageNum === 1) setAssistants([]);
          return;
        }

        const normalised: AssistantItem[] = condenseListAssistantsResponse(json);

        if (pageNum === 1) {
          setAssistants(normalised);
        } else {
          setAssistants((prev) => [...prev, ...normalised]);
        }

        setHasMore(normalised.length >= LIMIT);
      } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Failed to load assistants" });
      } finally {
        setListLoading(false);
        setIsLoadingMore(false);
      }
    },
    [userId, toast],
  );

  useEffect(() => {
    fetchList(page);
  }, [fetchList, page]);

  const refresh = useCallback(async () => {
    setPage(1);
    await fetchList(1);
  }, [fetchList]);

  const filteredAssistants = useMemo(
    () =>
      assistants.filter((assistant) =>
        assistant.assistant_name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [assistants, searchQuery],
  );

  return {
    filteredAssistants,
    listLoading,
    isLoadingMore,
    page,
    searchQuery,
    setSearchQuery,
    lastElementRef,
    refresh,
  };
}
